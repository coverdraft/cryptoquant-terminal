#!/usr/bin/env node
/**
 * OHLCV Backfill Script - CryptoQuant Terminal
 * 
 * Backfills OHLCV data for tokens missing candles and improves
 * timeframe coverage across all chains.
 * 
 * Sources: CoinGecko (primary), DexScreener (fallback)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CHAIN_MAP = {
  SOL: 'solana',
  ETH: 'ethereum',
  BSC: 'bsc',
  MATIC: 'polygon-pos',
  ARB: 'arbitrum-one',
  OP: 'optimistic-ethereum',
  AVAX: 'avalanche',
  BASE: 'base',
};

const TIMEFRAMES_TO_FILL = ['1h', '4h', '1d'];

// CoinGecko OHLCV endpoint returns data based on days parameter:
// 1 day = 30min candles, 7-90 days = hourly candles, 90+ = daily candles
const COINGECKO_DAYS_MAP = {
  '1h': 1,   // Last 24h of hourly data
  '4h': 7,   // Last 7 days of hourly data
  '1d': 90,  // Last 90 days of daily data
};

const DELAY_MS = 1500; // 1.5s between requests to respect rate limits
const MAX_RETRIES = 2;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Search CoinGecko for coin ID by symbol or address
 */
async function searchCoinGeckoId(query) {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.coins && data.coins.length > 0) {
      return data.coins[0].id;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch OHLCV from CoinGecko
 */
async function fetchCoinGeckoOHLCV(coinId, days) {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 429) {
      console.log('  ⏳ Rate limited, waiting 60s...');
      await sleep(60000);
      return null;
    }
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch approximate OHLCV from DexScreener
 */
async function fetchDexScreenerOHLCV(tokenAddress, chain) {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pairs = data?.pairs;
    if (!pairs || pairs.length === 0) return null;

    const bestPair = pairs
      .filter(p => p.baseToken?.address?.toLowerCase() === tokenAddress.toLowerCase())
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];

    if (!bestPair) return null;

    const priceUsd = parseFloat(bestPair.priceUsd || '0');
    if (priceUsd <= 0) return null;

    const now = Date.now();
    const candles = [];

    // Build approximate candles from price change data
    const priceChange24h = bestPair.priceChange?.h24 ?? 0;
    const priceChange6h = bestPair.priceChange?.h6 ?? 0;
    const priceChange1h = bestPair.priceChange?.h1 ?? 0;
    const volume24h = bestPair.volume?.h24 ?? 0;
    const volume6h = bestPair.volume?.h6 ?? 0;
    const volume1h = bestPair.volume?.h1 ?? 0;

    // 1d candle
    const price24hAgo = priceUsd / (1 + priceChange24h / 100);
    candles.push({
      timeframe: '1d',
      timestamp: new Date(Math.floor(now / 86400000) * 86400000),
      open: price24hAgo,
      high: Math.max(priceUsd, price24hAgo) * 1.01,
      low: Math.min(priceUsd, price24hAgo) * 0.99,
      close: priceUsd,
      volume: volume24h,
      source: 'dexscreener',
    });

    // 4h candle
    const price6hAgo = priceUsd / (1 + priceChange6h / 100);
    candles.push({
      timeframe: '4h',
      timestamp: new Date(Math.floor(now / 14400000) * 14400000),
      open: price6hAgo,
      high: Math.max(priceUsd, price6hAgo) * 1.005,
      low: Math.min(priceUsd, price6hAgo) * 0.995,
      close: priceUsd,
      volume: volume6h,
      source: 'dexscreener',
    });

    // 1h candle
    const price1hAgo = priceUsd / (1 + priceChange1h / 100);
    candles.push({
      timeframe: '1h',
      timestamp: new Date(Math.floor(now / 3600000) * 3600000),
      open: price1hAgo,
      high: Math.max(priceUsd, price1hAgo) * 1.003,
      low: Math.min(priceUsd, price1hAgo) * 0.997,
      close: priceUsd,
      volume: volume1h,
      source: 'dexscreener',
    });

    return candles;
  } catch {
    return null;
  }
}

/**
 * Store a candle in the database
 */
async function storeCandle(tokenAddress, chain, timeframe, timestamp, open, high, low, close, volume, source) {
  try {
    await prisma.priceCandle.upsert({
      where: {
        tokenAddress_chain_timeframe_timestamp: {
          tokenAddress,
          chain,
          timeframe,
          timestamp,
        },
      },
      create: {
        tokenAddress,
        chain,
        timeframe,
        timestamp,
        open,
        high,
        low,
        close,
        volume,
        trades: 0,
        source,
      },
      update: {
        high: Math.max(high, low),
        low: Math.min(low, high),
        close,
        volume,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Backfill a single token from CoinGecko
 */
async function backfillTokenFromCoinGecko(token, coinId) {
  let stored = 0;
  
  for (const tf of TIMEFRAMES_TO_FILL) {
    const days = COINGECKO_DAYS_MAP[tf];
    
    // Check if we already have recent data
    const lastCandle = await prisma.priceCandle.findFirst({
      where: { tokenAddress: token.address, chain: token.chain, timeframe: tf },
      orderBy: { timestamp: 'desc' },
    });
    
    if (lastCandle) {
      const ageMs = Date.now() - lastCandle.timestamp.getTime();
      const tfMs = tf === '1h' ? 3600000 : tf === '4h' ? 14400000 : 86400000;
      if (ageMs < tfMs * 2) {
        console.log(`  ⏭️  ${tf}: data is fresh (${Math.round(ageMs / 60000)}min old)`);
        continue;
      }
    }
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const ohlcvData = await fetchCoinGeckoOHLCV(coinId, days);
      
      if (!ohlcvData || !Array.isArray(ohlcvData)) {
        if (attempt < MAX_RETRIES - 1) {
          console.log(`  ⏳ Retry ${tf} (attempt ${attempt + 1})...`);
          await sleep(3000);
          continue;
        }
        console.log(`  ❌ ${tf}: no data from CoinGecko`);
        break;
      }
      
      let tfStored = 0;
      for (const item of ohlcvData) {
        const candleTs = new Date(item[0]);
        if (lastCandle && candleTs <= lastCandle.timestamp) continue;
        
        const ok = await storeCandle(
          token.address, token.chain, tf, candleTs,
          item[1], item[2], item[3], item[4], item[5] || 0, 'coingecko'
        );
        if (ok) tfStored++;
      }
      
      stored += tfStored;
      console.log(`  ✅ ${tf}: ${tfStored} candles stored (${ohlcvData.length} fetched)`);
      break;
    }
    
    await sleep(DELAY_MS);
  }
  
  return stored;
}

/**
 * Backfill a single token from DexScreener (approximate candles)
 */
async function backfillTokenFromDexScreener(token) {
  const candles = await fetchDexScreenerOHLCV(token.address, token.chain);
  if (!candles) return 0;
  
  let stored = 0;
  for (const candle of candles) {
    const ok = await storeCandle(
      token.address, token.chain, candle.timeframe, candle.timestamp,
      candle.open, candle.high, candle.low, candle.close, candle.volume, candle.source
    );
    if (ok) stored++;
  }
  
  return stored;
}

async function main() {
  console.log('🔄 CryptoQuant Terminal - OHLCV Backfill Script');
  console.log('===============================================\n');
  
  // Phase 1: Find and backfill tokens WITHOUT OHLCV
  console.log('📊 Phase 1: Backfilling tokens with NO OHLCV data');
  console.log('---------------------------------------------------');
  
  const allTokens = await prisma.token.findMany({
    select: { address: true, symbol: true, chain: true },
    orderBy: { volume24h: 'desc' },
  });
  
  const tokensWithOHLCV = await prisma.priceCandle.findMany({
    distinct: ['tokenAddress'],
    select: { tokenAddress: true },
  });
  const ohlcvSet = new Set(tokensWithOHLCV.map(t => t.tokenAddress));
  const missingTokens = allTokens.filter(t => !ohlcvSet.has(t.address));
  
  console.log(`Found ${missingTokens.length} tokens without OHLCV data\n`);
  
  let totalStored = 0;
  let totalFailed = 0;
  
  for (const token of missingTokens) {
    console.log(`\n🔍 ${token.symbol} (${token.chain}) - ${token.address}`);
    
    // Try DexScreener first (faster, no coin ID lookup needed)
    console.log('  Trying DexScreener...');
    let stored = await backfillTokenFromDexScreener(token);
    
    if (stored > 0) {
      console.log(`  ✅ DexScreener: ${stored} candles stored`);
      totalStored += stored;
    } else {
      // Fall back to CoinGecko
      console.log('  Trying CoinGecko...');
      const coinId = await searchCoinGeckoId(token.symbol);
      
      if (coinId) {
        console.log(`  Found CoinGecko ID: ${coinId}`);
        stored = await backfillTokenFromCoinGecko(token, coinId);
        totalStored += stored;
      } else {
        console.log(`  ❌ No CoinGecko ID found for ${token.symbol}`);
        totalFailed++;
      }
    }
    
    await sleep(DELAY_MS);
  }
  
  // Phase 2: Improve timeframe coverage for all tokens
  console.log('\n\n📊 Phase 2: Improving timeframe coverage for existing tokens');
  console.log('--------------------------------------------------------------');
  
  // Get tokens that have OHLCV but might be missing some timeframes
  const tokensWithPartialOHLCV = await prisma.$queryRawUnsafe(`
    SELECT t.address, t.symbol, t.chain, 
           GROUP_CONCAT(DISTINCT c.timeframe) as timeframes,
           COUNT(DISTINCT c.timeframe) as tfCount
    FROM Token t
    JOIN PriceCandle c ON c.tokenAddress = t.address
    GROUP BY t.address, t.symbol, t.chain
    HAVING COUNT(DISTINCT c.timeframe) < 3
    ORDER BY t.volume24h DESC
    LIMIT 20
  `);
  
  console.log(`Found ${tokensWithPartialOHLCV.length} tokens with partial coverage\n`);
  
  for (const token of tokensWithPartialOHLCV) {
    console.log(`\n🔍 ${token.symbol} (${token.chain}) - has: ${token.timeframes}`);
    
    // Try DexScreener for quick approximate candles
    const stored = await backfillTokenFromDexScreener(token);
    if (stored > 0) {
      console.log(`  ✅ DexScreener: ${stored} candles stored`);
      totalStored += stored;
    }
    
    await sleep(DELAY_MS);
  }
  
  // Phase 3: Backfill top tokens by volume with CoinGecko for deeper history
  console.log('\n\n📊 Phase 3: Deep backfill for top volume tokens');
  console.log('-------------------------------------------------');
  
  const topTokens = await prisma.token.findMany({
    where: { volume24h: { gt: 1000000 } },
    orderBy: { volume24h: 'desc' },
    take: 15,
    select: { address: true, symbol: true, chain: true, volume24h: true },
  });
  
  console.log(`Top ${topTokens.length} tokens by volume\n`);
  
  // Cache for coin IDs to avoid repeated lookups
  const coinIdCache = new Map();
  
  for (const token of topTokens) {
    console.log(`\n🔍 ${token.symbol} (${token.chain}) - Vol: $${(token.volume24h / 1e6).toFixed(1)}M`);
    
    let coinId = coinIdCache.get(token.symbol.toLowerCase());
    if (!coinId) {
      coinId = await searchCoinGeckoId(token.symbol);
      if (coinId) coinIdCache.set(token.symbol.toLowerCase(), coinId);
    }
    
    if (coinId) {
      const stored = await backfillTokenFromCoinGecko(token, coinId);
      totalStored += stored;
    } else {
      // Fallback to DexScreener
      const stored = await backfillTokenFromDexScreener(token);
      totalStored += stored;
    }
    
    await sleep(DELAY_MS);
  }
  
  // Final stats
  console.log('\n\n📊 Backfill Summary');
  console.log('====================');
  console.log(`Total candles stored: ${totalStored}`);
  console.log(`Tokens failed: ${totalFailed}`);
  
  // Show final DB state
  const finalCount = await prisma.priceCandle.count();
  console.log(`Total OHLCV candles in DB: ${finalCount}`);
  
  const chainDist = await prisma.$queryRawUnsafe(`
    SELECT t.chain, COUNT(DISTINCT c.tokenAddress) as tokenCount, COUNT(*) as candleCount
    FROM PriceCandle c JOIN Token t ON c.tokenAddress = t.address
    GROUP BY t.chain ORDER BY candleCount DESC
  `);
  console.log('\nChain distribution:');
  chainDist.forEach(r => console.log(`  ${r.chain}: ${r.tokenCount} tokens, ${r.candleCount} candles`));
  
  await prisma.$disconnect();
}

main().catch(console.error);
