#!/usr/bin/env node
/**
 * CryptoQuant Terminal - Populate OHLCV Candles, TokenDNA & Initial Signals
 * Fetches real OHLCV data from CoinGecko for top tokens.
 * Computes TokenDNA for enriched tokens.
 * Generates initial signals.
 * 
 * Uses only free APIs.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// STEP 1: FETCH OHLCV CANDLES FOR TOP TOKENS
// ============================================================

async function fetchOHLCVBatch(limit = 50) {
  console.log('\n━━━ Step 1: OHLCV Candles ━━━');
  
  // Get top tokens by market cap (prefer coingecko: addresses for easy resolution)
  const tokens = await prisma.token.findMany({
    where: { 
      marketCap: { gt: 0 },
    },
    orderBy: { marketCap: 'desc' },
    take: limit,
    select: { id: true, symbol: true, address: true, chain: true, marketCap: true },
  });
  
  console.log(`📊 Fetching OHLCV for top ${tokens.length} tokens...`);
  let totalCandles = 0;
  let failed = 0;
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Resolve CoinGecko coin ID
    let coinId = null;
    if (token.address.startsWith('coingecko:')) {
      coinId = token.address.replace('coingecko:', '');
    } else {
      // For real blockchain addresses, try symbol search later
      coinId = null;
    }
    
    // Fetch 7-day OHLCV (returns ~42 4h candles) and 90-day (daily candles)
    for (const [days, tf] of [[7, '4h'], [90, '1d']]) {
      const fetchId = coinId || token.symbol.toLowerCase();
      
      try {
        const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(fetchId)}/ohlc?vs_currency=usd&days=${days}`;
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json', 'User-Agent': 'CryptoQuant-Terminal/2.0' },
        });
        
        if (res.status === 429) {
          console.log(`  ⏳ Rate limited at token ${i+1}, waiting 65s...`);
          await sleep(65000);
          continue;
        }
        
        if (!res.ok) {
          if (!coinId && res.status === 404) {
            // Expected for non-CoinGecko IDs
          }
          continue;
        }
        
        const ohlcv = await res.json();
        
        if (!Array.isArray(ohlcv) || ohlcv.length === 0) continue;
        
        let stored = 0;
        for (const candle of ohlcv) {
          if (!Array.isArray(candle) || candle.length < 5) continue;
          
          try {
            await prisma.priceCandle.upsert({
              where: {
                tokenAddress_chain_timeframe_timestamp: {
                  tokenAddress: token.address,
                  chain: token.chain,
                  timeframe: tf,
                  timestamp: new Date(candle[0]),
                },
              },
              create: {
                tokenAddress: token.address,
                chain: token.chain,
                timeframe: tf,
                timestamp: new Date(candle[0]),
                open: candle[1],
                high: candle[2],
                low: candle[3],
                close: candle[4],
                volume: 0,
                trades: 0,
                source: 'coingecko',
              },
              update: {
                open: candle[1],
                high: candle[2],
                low: candle[3],
                close: candle[4],
              },
            });
            stored++;
          } catch (e) { /* skip duplicates */ }
        }
        
        totalCandles += stored;
        
        if (stored > 0 && (i + 1) % 10 === 0) {
          console.log(`  📊 Progress: ${i+1}/${tokens.length} tokens, ${totalCandles} candles stored`);
        }
        
      } catch (err) {
        failed++;
      }
    }
    
    // Rate limit: 1.5s between requests
    await sleep(1500);
  }
  
  console.log(`  ✅ Total candles stored: ${totalCandles} (${failed} tokens failed)`);
  return totalCandles;
}

// ============================================================
// STEP 2: COMPUTE TOKEN DNA
// ============================================================

async function computeTokenDNA() {
  console.log('\n━━━ Step 2: TokenDNA Computation ━━━');
  
  // Get tokens with some data (volume or liquidity)
  const tokens = await prisma.token.findMany({
    where: {
      OR: [
        { volume24h: { gt: 0 } },
        { liquidity: { gt: 0 } },
      ],
    },
    select: {
      id: true,
      address: true,
      symbol: true,
      volume24h: true,
      liquidity: true,
      marketCap: true,
      priceChange24h: true,
      holderCount: true,
      botActivityPct: true,
      smartMoneyPct: true,
    },
  });
  
  console.log(`🧬 Computing DNA for ${tokens.length} tokens...`);
  let computed = 0;
  
  for (const token of tokens) {
    try {
      // Calculate DNA scores based on available data
      const volScore = Math.min(100, Math.log10(Math.max(1, token.volume24h)) * 10);
      const liqScore = Math.min(100, Math.log10(Math.max(1, token.liquidity)) * 12);
      const mcScore = Math.min(100, Math.log10(Math.max(1, token.marketCap)) * 8);
      const changeScore = Math.min(100, Math.abs(token.priceChange24h || 0) * 2);
      
      // Risk score: higher = riskier
      const riskScore = Math.round(
        Math.min(100, 
          (100 - liqScore * 0.3) + 
          (token.botActivityPct * 0.5) + 
          (changeScore > 50 ? 20 : 0) +
          (mcScore < 20 ? 15 : 0)
        )
      );
      
      // Smart money score
      const smScore = Math.min(100, token.smartMoneyPct * 5);
      
      // Bot score
      const botScore = Math.min(100, token.botActivityPct * 3);
      
      // Retail score (inverse of smart + bot)
      const retailScore = Math.max(0, 100 - smScore - botScore);
      
      // Whale score based on market cap and holder concentration
      const whaleScore = token.holderCount > 0 
        ? Math.min(100, (1000 / token.holderCount) * 10) 
        : Math.min(100, mcScore * 0.5);
      
      // Trader composition
      const composition = {
        smartMoney: Math.round(smScore / 10),
        whale: Math.round(whaleScore / 10),
        bot_mev: Math.round(botScore / 5),
        bot_sniper: Math.round(botScore / 8),
        bot_copy: Math.round(botScore / 12),
        retail: Math.round(retailScore / 5),
        creator: 1,
        fund: Math.round(mcScore / 20),
        influencer: 2,
      };
      
      await prisma.tokenDNA.upsert({
        where: { tokenId: token.id },
        create: {
          tokenId: token.id,
          liquidityDNA: JSON.stringify([liqScore, mcScore, volScore]),
          walletDNA: JSON.stringify([smScore, whaleScore, botScore]),
          topologyDNA: JSON.stringify([retailScore, changeScore, riskScore]),
          riskScore,
          botActivityScore: botScore,
          smartMoneyScore: smScore,
          retailScore,
          whaleScore,
          washTradeProb: Math.min(0.5, botScore / 200),
          sniperPct: botScore / 8,
          mevPct: botScore / 5,
          copyBotPct: botScore / 12,
          traderComposition: JSON.stringify(composition),
          topWallets: JSON.stringify([]),
        },
        update: {
          liquidityDNA: JSON.stringify([liqScore, mcScore, volScore]),
          walletDNA: JSON.stringify([smScore, whaleScore, botScore]),
          topologyDNA: JSON.stringify([retailScore, changeScore, riskScore]),
          riskScore,
          botActivityScore: botScore,
          smartMoneyScore: smScore,
          retailScore,
          whaleScore,
          traderComposition: JSON.stringify(composition),
        },
      });
      
      computed++;
    } catch (err) {
      // Skip individual failures
    }
  }
  
  console.log(`  ✅ Computed DNA for ${computed} tokens`);
  return computed;
}

// ============================================================
// STEP 3: GENERATE INITIAL SIGNALS
// ============================================================

async function generateSignals() {
  console.log('\n━━━ Step 3: Signal Generation ━━━');
  
  // Get tokens with DNA (risk scores)
  const tokensWithDNA = await prisma.token.findMany({
    where: { dna: { isNot: null } },
    include: { dna: true },
    take: 100,
    orderBy: { volume24h: 'desc' },
  });
  
  console.log(`📡 Generating signals for ${tokensWithDNA.length} tokens...`);
  let generated = 0;
  
  for (const token of tokensWithDNA) {
    const dna = token.dna;
    if (!dna) continue;
    
    const signals = [];
    
    // Signal 1: Low Risk + High Liquidity = LONG opportunity
    if (dna.riskScore < 40 && token.liquidity > 50000 && token.volume24h > 100000) {
      signals.push({
        type: 'LOW_RISK_OPPORTUNITY',
        confidence: Math.round(90 - dna.riskScore),
        direction: 'LONG',
        description: `Low risk token (${token.symbol}) with strong liquidity ($${(token.liquidity/1000).toFixed(0)}K) and volume ($${(token.volume24h/1000).toFixed(0)}K)`,
      });
    }
    
    // Signal 2: High momentum (price change > 5%)
    if (Math.abs(token.priceChange24h || 0) > 5) {
      const direction = token.priceChange24h > 0 ? 'LONG' : 'SHORT';
      signals.push({
        type: 'MOMENTUM',
        confidence: Math.round(Math.min(90, Math.abs(token.priceChange24h) * 5)),
        direction,
        description: `High momentum: ${token.symbol} ${token.priceChange24h > 0 ? '+' : ''}${(token.priceChange24h || 0).toFixed(1)}% in 24h`,
      });
    }
    
    // Signal 3: Smart money presence
    if (dna.smartMoneyScore > 50) {
      signals.push({
        type: 'SMART_MONEY',
        confidence: Math.round(dna.smartMoneyScore),
        direction: 'LONG',
        description: `Smart money detected in ${token.symbol} (score: ${dna.smartMoneyScore.toFixed(0)})`,
      });
    }
    
    // Signal 4: High bot activity warning
    if (dna.botActivityScore > 60) {
      signals.push({
        type: 'BOT_WARNING',
        confidence: Math.round(dna.botActivityScore),
        direction: 'SHORT',
        description: `⚠️ High bot activity in ${token.symbol} (${dna.botActivityScore.toFixed(0)}% bot score)`,
      });
    }
    
    // Signal 5: Whale concentration
    if (dna.whaleScore > 60) {
      signals.push({
        type: 'WHALE_WATCH',
        confidence: Math.round(dna.whaleScore),
        direction: 'NEUTRAL',
        description: `Whale concentration detected in ${token.symbol} (score: ${dna.whaleScore.toFixed(0)})`,
      });
    }
    
    // Store signals
    for (const signal of signals) {
      try {
        await prisma.signal.create({
          data: {
            type: signal.type,
            tokenId: token.id,
            confidence: signal.confidence,
            direction: signal.direction,
            description: signal.description,
            metadata: JSON.stringify({
              tokenSymbol: token.symbol,
              tokenAddress: token.address,
              priceUsd: token.priceUsd,
              volume24h: token.volume24h,
              liquidity: token.liquidity,
              riskScore: dna.riskScore,
            }),
          },
        });
        generated++;
      } catch (err) {
        // Skip
      }
    }
  }
  
  console.log(`  ✅ Generated ${generated} signals`);
  return generated;
}

// ============================================================
// STEP 4: CREATE TRADING CYCLE RECORD
// ============================================================

async function createInitialCycle() {
  console.log('\n━━━ Step 4: Initial Trading Cycle ━━━');
  
  try {
    const existing = await prisma.tradingCycle.findFirst();
    if (existing) {
      console.log('  ✅ Trading cycle already exists');
      return;
    }
    
    const tokenCount = await prisma.token.count();
    const operableCount = await prisma.token.count({
      where: { liquidity: { gt: 10000 }, volume24h: { gt: 50000 } },
    });
    
    await prisma.tradingCycle.create({
      data: {
        cycleNumber: 1,
        status: 'COMPLETED',
        tokensScanned: tokenCount,
        tokensOperable: operableCount,
        tokensMatched: 0,
        signalsGenerated: await prisma.signal.count(),
        capitalBeforeUsd: 10,
        capitalAfterUsd: 10,
        feesPaidUsd: 0,
        netGainUsd: 0,
        netGainPct: 0,
        completedAt: new Date(),
      },
    });
    
    console.log(`  ✅ Initial cycle created (${tokenCount} scanned, ${operableCount} operable)`);
  } catch (err) {
    console.log(`  ⚠️ Failed: ${err.message}`);
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('🚀 CryptoQuant Terminal - Populate Data');
  console.log('========================================\n');
  
  const startTime = Date.now();
  
  try {
    // Current state
    const before = {
      tokens: await prisma.token.count(),
      candles: await prisma.priceCandle.count(),
      dna: await prisma.tokenDNA.count(),
      signals: await prisma.signal.count(),
    };
    console.log('📊 Current state:', JSON.stringify(before));
    
    // Step 1: OHLCV candles (top 50 tokens)
    await fetchOHLCVBatch(50);
    
    // Step 2: TokenDNA
    await computeTokenDNA();
    
    // Step 3: Signals
    await generateSignals();
    
    // Step 4: Trading cycle
    await createInitialCycle();
    
    // Final summary
    const after = {
      tokens: await prisma.token.count(),
      candles: await prisma.priceCandle.count(),
      dna: await prisma.tokenDNA.count(),
      signals: await prisma.signal.count(),
    };
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n========================================');
    console.log('🎉 POPULATE COMPLETE!');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📊 Tokens: ${after.tokens}`);
    console.log(`🕯️  Candles: ${before.candles} → ${after.candles} (+${after.candles - before.candles})`);
    console.log(`🧬 DNA: ${before.dna} → ${after.dna} (+${after.dna - before.dna})`);
    console.log(`📡 Signals: ${before.signals} → ${after.signals} (+${after.signals - before.signals})`);
    console.log('========================================\n');
    
  } catch (err) {
    console.error('❌ Populate failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
