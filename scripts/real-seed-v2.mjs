#!/usr/bin/env node
/**
 * CryptoQuant Terminal - Real Data Seed v2
 * Fetches REAL token data from CoinGecko, DexScreener, DexPaprika
 * Uses only free APIs (CoinGecko, DexScreener, DexPaprika).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// RATE LIMITING
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = 3, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CryptoQuant-Terminal/2.0',
        },
      });
      
      if (res.status === 429) {
        console.log(`  ⏳ Rate limited, waiting 60s... (attempt ${i + 1}/${retries})`);
        await sleep(60000);
        continue;
      }
      
      if (!res.ok) {
        console.log(`  ⚠️ HTTP ${res.status} for ${url}`);
        if (res.status >= 500) {
          await sleep(delayMs * 2);
          continue;
        }
        return null;
      }
      
      return await res.json();
    } catch (err) {
      console.log(`  ⚠️ Fetch error: ${err.message}`);
      await sleep(delayMs);
    }
  }
  return null;
}

// ============================================================
// COINGECKO: Fetch top tokens by market cap
// ============================================================

async function fetchCoinGeckoTokens(pages = 10) {
  const allTokens = [];
  
  for (let page = 1; page <= pages; page++) {
    console.log(`📊 CoinGecko: Fetching page ${page}/${pages}...`);
    
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&sparkline=false&price_change_percentage=5m,15m,1h,6h,24h`;
    
    const data = await fetchWithRetry(url);
    if (!data) {
      console.log(`  ⚠️ Page ${page} failed, skipping`);
      await sleep(1500);
      continue;
    }
    
    for (const coin of data) {
      allTokens.push({
        symbol: (coin.symbol || '').toUpperCase(),
        name: coin.name || '',
        coingeckoId: coin.id || '',
        priceUsd: coin.current_price || 0,
        marketCap: coin.market_cap || 0,
        volume24h: coin.total_volume || 0,
        priceChange24h: coin.price_change_percentage_24h || 0,
        priceChange1h: coin.price_change_percentage_1h_in_currency || 0,
        priceChange6h: coin.price_change_percentage_6h_in_currency || 0,
        image: coin.image || '',
        ath: coin.ath || 0,
        athChangePercentage: coin.ath_change_percentage || 0,
      });
    }
    
    console.log(`  ✅ Got ${data.length} tokens (total: ${allTokens.length})`);
    await sleep(1500); // Rate limit: ~40 req/min on free tier
  }
  
  return allTokens;
}

// ============================================================
// DEXSCREENER: Enrich tokens with DEX data
// ============================================================

async function fetchDexScreenerData(symbols) {
  const results = new Map();
  const batchSize = 5; // Search 5 symbols at a time
  
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    console.log(`🔍 DexScreener: Enriching batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(symbols.length / batchSize)}...`);
    
    // Process each symbol individually for better results
    for (const symbol of batch) {
      try {
        const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(symbol)}`;
        const data = await fetchWithRetry(url, 2, 1000);
        
        if (data?.pairs && data.pairs.length > 0) {
          // Find the best pair (highest liquidity)
          const bestPair = data.pairs
            .filter(p => p.liquidity?.usd > 0)
            .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
          
          if (bestPair) {
            results.set(symbol, {
              address: bestPair.baseToken?.address || '',
              pairAddress: bestPair.pairAddress || '',
              dexId: bestPair.dexId || '',
              dex: bestPair.dexId || '',
              chain: (bestPair.chainId || 'sol').toUpperCase(),
              liquidity: bestPair.liquidity?.usd || 0,
              priceChange5m: bestPair.priceChange?.m5 || 0,
              priceChange15m: bestPair.priceChange?.m15 || 0,
              priceChange1h: bestPair.priceChange?.h1 || 0,
              priceChange6h: bestPair.priceChange?.h6 || 0,
              priceChange24h: bestPair.priceChange?.h24 || 0,
              volume24h: bestPair.volume?.h24 || 0,
              pairUrl: bestPair.url || '',
              fdv: bestPair.fdv || 0,
              baseToken: bestPair.baseToken?.symbol || '',
            });
          }
        }
      } catch (err) {
        // Skip individual failures
      }
      
      await sleep(350); // DexScreener rate limit
    }
  }
  
  return results;
}

// ============================================================
// DEXPAPRIKA: Fetch additional tokens
// ============================================================

async function fetchDexPaprikaTokens(pages = 5) {
  const allTokens = [];
  const queries = ['solana', 'ethereum', 'bitcoin', 'usdc', 'memecoin', 'defi', 'base', 'arbitrum'];
  
  for (let i = 0; i < Math.min(pages, queries.length); i++) {
    console.log(`🌐 DexPaprika: Searching "${queries[i]}"...`);
    
    const url = `https://api.dexpaprika.com/search?query=${encodeURIComponent(queries[i])}&limit=50`;
    const data = await fetchWithRetry(url, 2, 1500);
    
    if (!data?.tokens) {
      console.log(`  ⚠️ Search "${queries[i]}" failed`);
      await sleep(1000);
      continue;
    }
    
    for (const token of data.tokens) {
      allTokens.push({
        symbol: (token.symbol || '').toUpperCase(),
        name: token.name || '',
        address: token.id || '',
        chain: (token.chain || 'sol').toUpperCase(),
        priceUsd: 0,
        volume24h: 0,
      });
    }
    
    console.log(`  ✅ Got ${data.tokens.length} tokens (total: ${allTokens.length})`);
    await sleep(1000);
  }
  
  return allTokens;
}

// ============================================================
// DATABASE SEED
// ============================================================

async function seedTokens(coinGeckoTokens, dexScreenerData, dexPaprikaTokens) {
  console.log('\n💾 Seeding tokens to database...');
  
  // Build address lookup from DexPaprika
  const dexpaprikaBySymbol = new Map();
  for (const t of dexPaprikaTokens) {
    if (t.address && t.address.length > 10) {
      dexpaprikaBySymbol.set(t.symbol, t);
    }
  }
  
  let created = 0;
  let updated = 0;
  let skipped = 0;
  
  // Process CoinGecko tokens (primary source)
  for (const cg of coinGeckoTokens) {
    const ds = dexScreenerData.get(cg.symbol);
    const dp = dexpaprikaBySymbol.get(cg.symbol);
    
    // Determine address: DexScreener > DexPaprika > synthetic
    let address;
    let chain = 'SOL';
    let pairAddress = null;
    let dexId = null;
    let dex = null;
    let pairUrl = null;
    let liquidity = 0;
    let priceChange5m = cg.priceChange1h ? 0 : 0; // CoinGecko doesn't have 5m
    let priceChange15m = 0;
    
    if (ds && ds.address && ds.address.length > 10) {
      address = ds.address;
      chain = ds.chain;
      pairAddress = ds.pairAddress;
      dexId = ds.dexId;
      dex = ds.dex;
      pairUrl = ds.pairUrl;
      liquidity = ds.liquidity;
      priceChange5m = ds.priceChange5m;
      priceChange15m = ds.priceChange15m;
    } else if (dp && dp.address && dp.address.length > 10) {
      address = dp.address;
      chain = dp.chain;
    } else {
      // Synthetic address from CoinGecko ID
      address = `coingecko:${cg.coingeckoId}`;
    }
    
    try {
      const result = await prisma.token.upsert({
        where: { address },
        create: {
          symbol: cg.symbol,
          name: cg.name,
          address,
          chain,
          priceUsd: cg.priceUsd || 0,
          volume24h: ds?.volume24h || cg.volume24h || 0,
          liquidity,
          marketCap: cg.marketCap || 0,
          priceChange5m: priceChange5m || 0,
          priceChange15m: priceChange15m || 0,
          priceChange1h: ds?.priceChange1h || cg.priceChange1h || 0,
          priceChange6h: ds?.priceChange6h || cg.priceChange6h || 0,
          priceChange24h: ds?.priceChange24h || cg.priceChange24h || 0,
          dexId,
          pairAddress,
          dex,
          pairUrl,
        },
        update: {
          priceUsd: cg.priceUsd || 0,
          volume24h: ds?.volume24h || cg.volume24h || 0,
          liquidity,
          marketCap: cg.marketCap || 0,
          priceChange5m: priceChange5m || 0,
          priceChange15m: priceChange15m || 0,
          priceChange1h: ds?.priceChange1h || cg.priceChange1h || 0,
          priceChange6h: ds?.priceChange6h || cg.priceChange6h || 0,
          priceChange24h: ds?.priceChange24h || cg.priceChange24h || 0,
        },
      });
      
      if (result) created++;
    } catch (err) {
      skipped++;
    }
  }
  
  // Process DexPaprika-only tokens (not in CoinGecko)
  for (const dp of dexPaprikaTokens) {
    // Check if already exists by address
    const existing = await prisma.token.findUnique({
      where: { address: dp.address },
    });
    
    if (existing) {
      // Update price
      await prisma.token.update({
        where: { address: dp.address },
        data: {
          priceUsd: dp.priceUsd || existing.priceUsd,
          volume24h: dp.volume24h || existing.volume24h,
        },
      }).catch(() => {});
      updated++;
      continue;
    }
    
    // Also check if symbol already exists
    const bySymbol = await prisma.token.findFirst({
      where: { symbol: dp.symbol },
    });
    
    if (bySymbol) {
      skipped++;
      continue;
    }
    
    try {
      await prisma.token.create({
        data: {
          symbol: dp.symbol,
          name: dp.name,
          address: dp.address || `dexpaprika:${dp.symbol}:${Date.now()}`,
          chain: dp.chain,
          priceUsd: dp.priceUsd || 0,
          volume24h: dp.volume24h || 0,
        },
      });
      created++;
    } catch (err) {
      skipped++;
    }
  }
  
  console.log(`  ✅ Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
  return { created, updated, skipped };
}

// ============================================================
// SEED TRADING SYSTEMS
// ============================================================

async function seedTradingSystems() {
  console.log('\n🎯 Seeding trading systems...');
  
  const systems = [
    {
      name: 'Alpha Hunter',
      description: 'Hunts new tokens with high momentum and strong early signals. Best for GROWTH phase tokens.',
      category: 'ALPHA_HUNTER',
      icon: '🎯',
      assetFilter: JSON.stringify({ minVolume: 50000, minLiquidity: 10000, phase: ['GENESIS', 'INCIPIENT', 'GROWTH'] }),
      phaseConfig: JSON.stringify({ GENESIS: { weight: 0.3 }, INCIPIENT: { weight: 0.4 }, GROWTH: { weight: 0.3 } }),
      entrySignal: JSON.stringify({ momentumScore: { min: 70 }, volumeSpike: { min: 2 }, smartMoneyPct: { min: 5 } }),
      executionConfig: JSON.stringify({ type: 'LIMIT', slippageTolerance: 1.5, timeInForce: 'GTC' }),
      exitSignal: JSON.stringify({ takeProfitPct: 40, stopLossPct: 15, trailingStopPct: 10, maxHoldHours: 72 }),
      bigDataContext: JSON.stringify({ regime: ['BULL', 'SIDEWAYS'], volatility: ['MEDIUM', 'HIGH'] }),
      primaryTimeframe: '15m',
      confirmTimeframes: JSON.stringify(['1h', '4h']),
      maxPositionPct: 5,
      maxOpenPositions: 8,
      stopLossPct: 15,
      takeProfitPct: 40,
      trailingStopPct: 10,
      cashReservePct: 20,
      allocationMethod: 'KELLY_MODIFIED',
    },
    {
      name: 'Smart Money Follower',
      description: 'Follows smart money wallets and whale movements. Enters when identified smart money accumulates.',
      category: 'SMART_MONEY',
      icon: '👁',
      assetFilter: JSON.stringify({ minVolume: 100000, minLiquidity: 50000, smartMoneyPct: { min: 10 } }),
      phaseConfig: JSON.stringify({ INCIPIENT: { weight: 0.2 }, GROWTH: { weight: 0.5 }, FOMO: { weight: 0.3 } }),
      entrySignal: JSON.stringify({ smartMoneyAccumulating: true, whaleBuyCount: { min: 3 }, smartMoneyScore: { min: 60 } }),
      executionConfig: JSON.stringify({ type: 'MARKET', slippageTolerance: 1, timeInForce: 'IOC' }),
      exitSignal: JSON.stringify({ smartMoneySelling: true, stopLossPct: 12, takeProfitPct: 30, trailingStopPct: 8 }),
      bigDataContext: JSON.stringify({ smartMoneyFlow: 'POSITIVE', whaleActivity: 'ACCUMULATING' }),
      primaryTimeframe: '1h',
      confirmTimeframes: JSON.stringify(['4h', '1d']),
      maxPositionPct: 8,
      maxOpenPositions: 5,
      stopLossPct: 12,
      takeProfitPct: 30,
      trailingStopPct: 8,
      cashReservePct: 25,
      allocationMethod: 'KELLY_MODIFIED',
    },
    {
      name: 'Technical Scalper',
      description: 'Scalps based on candlestick patterns and technical indicators. Fast in, fast out.',
      category: 'TECHNICAL',
      icon: '⚡',
      assetFilter: JSON.stringify({ minVolume: 200000, minLiquidity: 100000, operability: ['PREMIUM', 'GOOD'] }),
      phaseConfig: JSON.stringify({ GROWTH: { weight: 0.4 }, FOMO: { weight: 0.3 }, DECLINE: { weight: 0.3 } }),
      entrySignal: JSON.stringify({ patternMatch: true, rsiOversold: true, volumeConfirmation: true }),
      executionConfig: JSON.stringify({ type: 'LIMIT', slippageTolerance: 0.5, timeInForce: 'GTC' }),
      exitSignal: JSON.stringify({ takeProfitPct: 5, stopLossPct: 3, trailingStopPct: 2, maxHoldHours: 4 }),
      bigDataContext: JSON.stringify({ regime: ['SIDEWAYS'], volatility: ['LOW', 'MEDIUM'] }),
      primaryTimeframe: '5m',
      confirmTimeframes: JSON.stringify(['15m', '1h']),
      maxPositionPct: 3,
      maxOpenPositions: 15,
      stopLossPct: 3,
      takeProfitPct: 5,
      trailingStopPct: 2,
      cashReservePct: 30,
      allocationMethod: 'EQUAL_WEIGHT',
    },
    {
      name: 'Defensive Guard',
      description: 'Low-risk system that only operates on highly liquid, bot-free tokens. Capital preservation first.',
      category: 'DEFENSIVE',
      icon: '🛡',
      assetFilter: JSON.stringify({ minVolume: 1000000, minLiquidity: 500000, operability: ['PREMIUM'], maxBotPct: 20 }),
      phaseConfig: JSON.stringify({ GROWTH: { weight: 0.5 }, LEGACY: { weight: 0.5 } }),
      entrySignal: JSON.stringify({ operabilityScore: { min: 80 }, botActivity: { max: 20 }, liquidity: { min: 500000 } }),
      executionConfig: JSON.stringify({ type: 'LIMIT', slippageTolerance: 0.3, timeInForce: 'GTC' }),
      exitSignal: JSON.stringify({ takeProfitPct: 20, stopLossPct: 8, trailingStopPct: 5, maxHoldHours: 168 }),
      bigDataContext: JSON.stringify({ regime: ['BULL', 'SIDEWAYS'], volatility: ['LOW'] }),
      primaryTimeframe: '4h',
      confirmTimeframes: JSON.stringify(['1d']),
      maxPositionPct: 10,
      maxOpenPositions: 3,
      stopLossPct: 8,
      takeProfitPct: 20,
      trailingStopPct: 5,
      cashReservePct: 40,
      allocationMethod: 'EQUAL_WEIGHT',
    },
    {
      name: 'Bot Aware Trader',
      description: 'Avoids bot-heavy tokens and exploits bot patterns. Profits from MEV and sniper bot behavior.',
      category: 'BOT_AWARE',
      icon: '🤖',
      assetFilter: JSON.stringify({ minVolume: 500000, botActivityPct: { min: 30 } }),
      phaseConfig: JSON.stringify({ INCIPIENT: { weight: 0.3 }, GROWTH: { weight: 0.4 }, FOMO: { weight: 0.3 } }),
      entrySignal: JSON.stringify({ botWashTradeDetected: true, sniperEntryPattern: true, botVolumeAnomaly: true }),
      executionConfig: JSON.stringify({ type: 'MARKET', slippageTolerance: 2, timeInForce: 'IOC', priorityFee: 'HIGH' }),
      exitSignal: JSON.stringify({ takeProfitPct: 25, stopLossPct: 10, trailingStopPct: 7, maxHoldHours: 48 }),
      bigDataContext: JSON.stringify({ botActivity: 'HIGH', mevVolume: 'ELEVATED' }),
      primaryTimeframe: '1m',
      confirmTimeframes: JSON.stringify(['5m', '15m']),
      maxPositionPct: 4,
      maxOpenPositions: 10,
      stopLossPct: 10,
      takeProfitPct: 25,
      trailingStopPct: 7,
      cashReservePct: 25,
      allocationMethod: 'KELLY_MODIFIED',
    },
    {
      name: 'Deep Analysis System',
      description: 'Comprehensive token profiling with DNA analysis, behavioral models, and deep metrics. Slower but thorough.',
      category: 'DEEP_ANALYSIS',
      icon: '🔬',
      assetFilter: JSON.stringify({ minVolume: 100000, minLiquidity: 50000 }),
      phaseConfig: JSON.stringify({ GENESIS: { weight: 0.1 }, INCIPIENT: { weight: 0.2 }, GROWTH: { weight: 0.3 }, FOMO: { weight: 0.2 }, DECLINE: { weight: 0.2 } }),
      entrySignal: JSON.stringify({ dnaRiskScore: { max: 40 }, smartMoneyScore: { min: 50 }, washTradeProb: { max: 0.3 } }),
      executionConfig: JSON.stringify({ type: 'LIMIT', slippageTolerance: 0.5, timeInForce: 'GTC' }),
      exitSignal: JSON.stringify({ takeProfitPct: 35, stopLossPct: 12, trailingStopPct: 8, maxHoldHours: 120 }),
      bigDataContext: JSON.stringify({ regime: ['BULL', 'SIDEWAYS'], correlationStable: true }),
      primaryTimeframe: '1h',
      confirmTimeframes: JSON.stringify(['4h', '1d']),
      maxPositionPct: 6,
      maxOpenPositions: 6,
      stopLossPct: 12,
      takeProfitPct: 35,
      trailingStopPct: 8,
      cashReservePct: 20,
      allocationMethod: 'KELLY_MODIFIED',
    },
  ];
  
  let count = 0;
  for (const system of systems) {
    try {
      await prisma.tradingSystem.upsert({
        where: { id: `system-${system.category.toLowerCase()}` },
        create: { id: `system-${system.category.toLowerCase()}`, ...system, version: 1 },
        update: system,
      });
      count++;
    } catch (err) {
      // Try without custom ID
      try {
        const existing = await prisma.tradingSystem.findFirst({ where: { name: system.name } });
        if (existing) {
          await prisma.tradingSystem.update({ where: { id: existing.id }, data: system });
          count++;
        } else {
          await prisma.tradingSystem.create({ data: system });
          count++;
        }
      } catch (err2) {
        console.log(`  ⚠️ Failed to seed system: ${system.name}`);
      }
    }
  }
  
  console.log(`  ✅ Seeded ${count} trading systems`);
  return count;
}

// ============================================================
// SEED SCHEDULER STATE
// ============================================================

async function seedSchedulerState() {
  console.log('\n🧠 Seeding scheduler state...');
  
  try {
    const existing = await prisma.schedulerState.findFirst();
    if (existing) {
      console.log('  ✅ Scheduler state already exists, skipping');
      return;
    }
    
    await prisma.schedulerState.create({
      data: {
        status: 'STOPPED',
        config: JSON.stringify({
          cycleIntervalMs: 120000,
          capitalUsd: 10,
          chain: 'SOL',
          scanLimit: 250,
          tasks: {
            TOKEN_DISCOVERY: { intervalMs: 300000, enabled: true },
            OHLCV_FETCH: { intervalMs: 600000, enabled: true },
            OPERABILITY_SCORE: { intervalMs: 600000, enabled: true },
            DNA_COMPUTE: { intervalMs: 900000, enabled: true },
            SIGNAL_GENERATE: { intervalMs: 180000, enabled: true },
            SMART_MONEY_TRACK: { intervalMs: 600000, enabled: true },
            CAPITAL_UPDATE: { intervalMs: 300000, enabled: true },
          },
        }),
        capitalUsd: 10,
        initialCapitalUsd: 10,
        chain: 'SOL',
        scanLimit: 250,
        taskStates: JSON.stringify({}),
      },
    });
    console.log('  ✅ Scheduler state created');
  } catch (err) {
    console.log(`  ⚠️ Failed: ${err.message}`);
  }
}

// ============================================================
// SEED CAPITAL STATE
// ============================================================

async function seedCapitalState() {
  console.log('\n💰 Seeding capital state...');
  
  try {
    const existing = await prisma.capitalState.findFirst();
    if (existing) {
      console.log('  ✅ Capital state already exists, skipping');
      return;
    }
    
    await prisma.capitalState.create({
      data: {
        totalCapitalUsd: 10,
        allocatedUsd: 0,
        availableUsd: 10,
        feesPaidTotalUsd: 0,
        realizedPnlUsd: 0,
        unrealizedPnlUsd: 0,
        compoundGrowthPct: 0,
        cycleCount: 0,
        updatedAtCycle: 0,
      },
    });
    console.log('  ✅ Capital state created');
  } catch (err) {
    console.log(`  ⚠️ Failed: ${err.message}`);
  }
}

// ============================================================
// SEED DATA RETENTION POLICIES
// ============================================================

async function seedDataRetentionPolicies() {
  console.log('\n📋 Seeding data retention policies...');
  
  const policies = [
    { dataType: 'SIGNALS', tableName: 'Signal', retentionDays: 90, hotDays: 7, warmDays: 30, coldDays: 90, archiveMethod: 'AGGREGATE', aggregationInterval: '1d' },
    { dataType: 'CANDLES', tableName: 'PriceCandle', retentionDays: 365, hotDays: 14, warmDays: 60, coldDays: 365, archiveMethod: 'COMPRESS', aggregationInterval: '4h' },
    { dataType: 'TRANSACTIONS', tableName: 'TraderTransaction', retentionDays: 180, hotDays: 7, warmDays: 30, coldDays: 180, archiveMethod: 'AGGREGATE', aggregationInterval: '1d' },
    { dataType: 'EXTRACTIONS', tableName: 'ExtractionJob', retentionDays: 60, hotDays: 3, warmDays: 14, coldDays: 60, archiveMethod: 'DELETE' },
    { dataType: 'OPERABILITY', tableName: 'OperabilityScore', retentionDays: 30, hotDays: 3, warmDays: 14, coldDays: 30, archiveMethod: 'AGGREGATE', aggregationInterval: '1h' },
    { dataType: 'PREDICTIVE', tableName: 'PredictiveSignal', retentionDays: 60, hotDays: 7, warmDays: 30, coldDays: 60, archiveMethod: 'DELETE' },
  ];
  
  let count = 0;
  for (const policy of policies) {
    try {
      await prisma.dataRetentionPolicy.upsert({
        where: { dataType: policy.dataType },
        create: policy,
        update: policy,
      });
      count++;
    } catch (err) {
      console.log(`  ⚠️ Failed: ${policy.dataType}`);
    }
  }
  
  console.log(`  ✅ Seeded ${count} retention policies`);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('🚀 CryptoQuant Terminal - Real Data Seed v2');
  console.log('============================================\n');
  
  const startTime = Date.now();
  
  try {
    // Step 1: Fetch CoinGecko tokens
    console.log('━━━ Step 1: CoinGecko Tokens ━━━');
    const coinGeckoTokens = await fetchCoinGeckoTokens(10);
    console.log(`📊 Total CoinGecko tokens: ${coinGeckoTokens.length}\n`);
    
    // Step 2: Enrich top tokens with DexScreener (top 500 only to respect rate limits)
    console.log('━━━ Step 2: DexScreener Enrichment ━━━');
    const topSymbols = coinGeckoTokens
      .slice(0, 500)
      .map(t => t.symbol);
    const dexScreenerData = await fetchDexScreenerData(topSymbols);
    console.log(`🔍 DexScreener enriched: ${dexScreenerData.size} tokens\n`);
    
    // Step 3: Fetch DexPaprika tokens
    console.log('━━━ Step 3: DexPaprika Tokens ━━━');
    const dexPaprikaTokens = await fetchDexPaprikaTokens(5);
    console.log(`🌐 Total DexPaprika tokens: ${dexPaprikaTokens.length}\n`);
    
    // Step 4: Seed tokens to DB
    console.log('━━━ Step 4: Database Seed ━━━');
    const result = await seedTokens(coinGeckoTokens, dexScreenerData, dexPaprikaTokens);
    
    // Step 5: Seed trading systems
    await seedTradingSystems();
    
    // Step 6: Seed scheduler state
    await seedSchedulerState();
    
    // Step 7: Seed capital state
    await seedCapitalState();
    
    // Step 8: Seed data retention policies
    await seedDataRetentionPolicies();
    
    // Final summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalTokens = await prisma.token.count();
    
    console.log('\n============================================');
    console.log('🎉 SEED COMPLETE!');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📊 CoinGecko fetched: ${coinGeckoTokens.length}`);
    console.log(`🔍 DexScreener enriched: ${dexScreenerData.size}`);
    console.log(`🌐 DexPaprika fetched: ${dexPaprikaTokens.length}`);
    console.log(`💾 Total tokens in DB: ${totalTokens}`);
    console.log(`✅ Created: ${result.created}`);
    console.log(`🔄 Updated: ${result.updated}`);
    console.log(`⏭️  Skipped: ${result.skipped}`);
    console.log('============================================\n');
    
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
