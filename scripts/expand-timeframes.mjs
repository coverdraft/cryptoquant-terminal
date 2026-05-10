#!/usr/bin/env node
/**
 * OHLCV Timeframe Expansion Script
 * 
 * 1. Aggregates 1h candles → 2h, 6h candles for all tokens
 * 2. Aggregates 4h candles → 12h candles for all tokens
 * 3. Aggregates 1d candles → 1w candles for all tokens
 * 4. Generates approximate 15m/30m candles for non-SOL tokens via DexScreener
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const AGGREGATION_RULES = {
  '2h':  { source: '1h',  count: 2 },
  '6h':  { source: '1h',  count: 6 },
  '12h': { source: '4h',  count: 3 },
  '1w':  { source: '1d',  count: 7 },
};

const TIMEFRAME_SECONDS = {
  '1m': 60, '3m': 180, '5m': 300, '15m': 900, '30m': 1800,
  '1h': 3600, '2h': 7200, '4h': 14400, '6h': 21600,
  '12h': 43200, '1d': 86400, '1w': 604800,
};

function aggregateCandles(sourceCandles, targetTimeframe) {
  const rule = AGGREGATION_RULES[targetTimeframe];
  if (!rule) return [];
  
  const targetSeconds = TIMEFRAME_SECONDS[targetTimeframe];
  if (!targetSeconds) return [];
  
  const groups = new Map();
  for (const candle of sourceCandles) {
    const periodStart = Math.floor(candle.timestamp.getTime() / (targetSeconds * 1000)) * (targetSeconds * 1000);
    const existing = groups.get(periodStart) ?? [];
    existing.push(candle);
    groups.set(periodStart, existing);
  }
  
  const result = [];
  for (const [periodStart, group] of groups) {
    if (group.length === 0) continue;
    group.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    result.push({
      tokenAddress: group[0].tokenAddress,
      chain: group[0].chain,
      timeframe: targetTimeframe,
      timestamp: new Date(periodStart),
      open: group[0].open,
      high: Math.max(...group.map(c => c.high)),
      low: Math.min(...group.map(c => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((s, c) => s + c.volume, 0),
      trades: group.reduce((s, c) => s + c.trades, 0),
      source: 'aggregated',
    });
  }
  
  return result;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('🔄 OHLCV Timeframe Expansion');
  console.log('=============================\n');
  
  let totalStored = 0;
  
  // Phase 1: Aggregate candles for all tokens that have 1h data
  for (const [targetTf, rule] of Object.entries(AGGREGATION_RULES)) {
    console.log(`📊 Aggregating ${rule.source} → ${targetTf} (${rule.count}x)`);
    
    // Find all distinct token+chain combos that have source timeframe data
    const sourceTokens = await prisma.priceCandle.findMany({
      distinct: ['tokenAddress', 'chain'],
      where: { timeframe: rule.source },
      select: { tokenAddress: true, chain: true },
    });
    
    console.log(`  Found ${sourceTokens.length} tokens with ${rule.source} data`);
    
    let tfStored = 0;
    
    for (const token of sourceTokens) {
      // Check if we already have aggregated data for this token
      const existingAgg = await prisma.priceCandle.count({
        where: {
          tokenAddress: token.tokenAddress,
          chain: token.chain,
          timeframe: targetTf,
        },
      });
      
      // Load source candles
      const sourceCandles = await prisma.priceCandle.findMany({
        where: {
          tokenAddress: token.tokenAddress,
          chain: token.chain,
          timeframe: rule.source,
        },
        orderBy: { timestamp: 'asc' },
        take: 500,
      });
      
      if (sourceCandles.length < rule.count) continue;
      
      const aggregated = aggregateCandles(sourceCandles, targetTf);
      
      for (const candle of aggregated) {
        try {
          await prisma.priceCandle.upsert({
            where: {
              tokenAddress_chain_timeframe_timestamp: {
                tokenAddress: candle.tokenAddress,
                chain: candle.chain,
                timeframe: targetTf,
                timestamp: candle.timestamp,
              },
            },
            create: {
              tokenAddress: candle.tokenAddress,
              chain: candle.chain,
              timeframe: targetTf,
              timestamp: candle.timestamp,
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              volume: candle.volume,
              trades: candle.trades,
              source: 'aggregated',
            },
            update: {
              high: candle.high,
              low: candle.low,
              close: candle.close,
              volume: candle.volume,
            },
          });
          tfStored++;
        } catch {
          // Skip
        }
      }
    }
    
    console.log(`  ✅ ${targetTf}: ${tfStored} candles aggregated and stored`);
    totalStored += tfStored;
  }
  
  // Phase 2: Generate approximate short-term candles for non-SOL tokens via DexScreener
  console.log('\n📊 Phase 2: DexScreener short-term candles (15m/30m) for non-SOL tokens');
  
  const nonSolTokens = await prisma.token.findMany({
    where: { 
      chain: { not: 'SOL' },
      volume24h: { gt: 500000 },
    },
    orderBy: { volume24h: 'desc' },
    take: 30,
    select: { address: true, symbol: true, chain: true },
  });
  
  console.log(`Processing ${nonSolTokens.length} high-volume non-SOL tokens\n`);
  
  for (const token of nonSolTokens) {
    console.log(`🔍 ${token.symbol} (${token.chain})`);
    
    try {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${token.address}`,
        { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) }
      );
      
      if (!res.ok) {
        console.log('  ❌ DexScreener request failed');
        await sleep(1000);
        continue;
      }
      
      const data = await res.json();
      const pairs = data?.pairs;
      if (!pairs || pairs.length === 0) {
        console.log('  ❌ No pairs found');
        await sleep(1000);
        continue;
      }
      
      const bestPair = pairs
        .filter(p => p.baseToken?.address?.toLowerCase() === token.address.toLowerCase())
        .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
      
      if (!bestPair) {
        console.log('  ❌ No matching pair');
        await sleep(1000);
        continue;
      }
      
      const priceUsd = parseFloat(bestPair.priceUsd || '0');
      if (priceUsd <= 0) {
        console.log('  ❌ No price');
        await sleep(1000);
        continue;
      }
      
      const now = Date.now();
      let tokenStored = 0;
      
      // 30m candle
      const price1hAgo = priceUsd / (1 + (bestPair.priceChange?.h1 ?? 0) / 100);
      const volume1h = bestPair.volume?.h1 ?? 0;
      try {
        await prisma.priceCandle.upsert({
          where: {
            tokenAddress_chain_timeframe_timestamp: {
              tokenAddress: token.address,
              chain: token.chain,
              timeframe: '30m',
              timestamp: new Date(Math.floor(now / 1800000) * 1800000),
            },
          },
          create: {
            tokenAddress: token.address,
            chain: token.chain,
            timeframe: '30m',
            timestamp: new Date(Math.floor(now / 1800000) * 1800000),
            open: price1hAgo,
            high: Math.max(priceUsd, price1hAgo) * 1.005,
            low: Math.min(priceUsd, price1hAgo) * 0.995,
            close: priceUsd,
            volume: volume1h / 2,
            trades: 0,
            source: 'dexscreener',
          },
          update: {
            close: priceUsd,
            volume: volume1h / 2,
          },
        });
        tokenStored++;
      } catch {}
      
      // 15m candle
      try {
        await prisma.priceCandle.upsert({
          where: {
            tokenAddress_chain_timeframe_timestamp: {
              tokenAddress: token.address,
              chain: token.chain,
              timeframe: '15m',
              timestamp: new Date(Math.floor(now / 900000) * 900000),
            },
          },
          create: {
            tokenAddress: token.address,
            chain: token.chain,
            timeframe: '15m',
            timestamp: new Date(Math.floor(now / 900000) * 900000),
            open: price1hAgo,
            high: Math.max(priceUsd, price1hAgo) * 1.003,
            low: Math.min(priceUsd, price1hAgo) * 0.997,
            close: priceUsd,
            volume: volume1h / 4,
            trades: 0,
            source: 'dexscreener',
          },
          update: {
            close: priceUsd,
            volume: volume1h / 4,
          },
        });
        tokenStored++;
      } catch {}
      
      console.log(`  ✅ ${tokenStored} short-term candles stored`);
      totalStored += tokenStored;
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }
    
    await sleep(1200);
  }
  
  // Final stats
  console.log('\n📊 Timeframe Expansion Summary');
  console.log('==============================');
  console.log(`Total candles stored: ${totalStored}`);
  
  const finalCount = await prisma.priceCandle.count();
  console.log(`Total OHLCV candles in DB: ${finalCount}`);
  
  const tfDist = await prisma.$queryRawUnsafe(`
    SELECT timeframe, COUNT(*) as candles, COUNT(DISTINCT tokenAddress) as tokens
    FROM PriceCandle GROUP BY timeframe ORDER BY candles DESC
  `);
  console.log('\nTimeframe distribution:');
  tfDist.forEach(r => console.log(`  ${r.timeframe}: ${r.tokens} tokens, ${r.candles} candles`));
  
  await prisma.$disconnect();
}

main().catch(console.error);
