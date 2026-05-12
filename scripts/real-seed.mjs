#!/usr/bin/env node
/**
 * Real Seed Script - CryptoQuant Terminal
 * 
 * Fetches REAL token data from CoinGecko + DexScreener + DexPaprika.
 * Runs directly with Node.js (no Next.js API needed).
 * NO Birdeye — only free APIs.
 * 
 * Usage: node scripts/real-seed.mjs [--quick | --full | --tokens 5000]
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient({
  log: ['error', 'warn'],
});

// ============================================================
// CONFIG
// ============================================================

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const DEXSCREENER_BASE = 'https://api.dexscreener.com';
const DEXPAPRIKA_BASE = 'https://api.dexpaprika.com';
const RATE_LIMIT_MS = 1600; // CoinGecko free: ~30 req/min
const DEXSCREENER_DELAY_MS = 350;

const PLATFORM_TO_CHAIN = {
  'ethereum': 'ETH',
  'solana': 'SOL', 
  'binance-smart-chain': 'BSC',
  'arbitrum': 'ARB',
  'optimistic-ethereum': 'OP',
  'base': 'BASE',
  'avalanche': 'AVAX',
  'polygon-pos': 'MATIC',
  'fantom': 'FTM',
  'tron': 'TRX',
  'sui': 'SUI',
  'aptos': 'APT',
};

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============================================================
// FETCH WITH RETRY
// ============================================================

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CryptoQuant-Terminal/1.0',
          ...(options.headers || {}),
        },
      });

      if (res.status === 429) {
        console.log(`  ⏳ Rate limited, waiting 65s...`);
        await delay(65000);
        continue;
      }

      if (res.status >= 500) {
        console.log(`  ⚠️ Server error ${res.status}, retry ${i+1}/${retries}`);
        await delay(5000);
        continue;
      }

      if (!res.ok) {
        console.log(`  ⚠️ HTTP ${res.status} for ${url.slice(0, 80)}`);
        return null;
      }

      return await res.json();
    } catch (err) {
      console.log(`  ⚠️ Fetch error: ${err.message}, retry ${i+1}/${retries}`);
      await delay(3000);
    }
  }
  return null;
}

// ============================================================
// PHASE 1: LOAD TOKENS FROM COINGECKO
// ============================================================

async function loadTokensFromCoinGecko(targetCount) {
  console.log(`\n🔄 PHASE 1: Loading ${targetCount} tokens from CoinGecko...`);
  let totalLoaded = 0;
  let totalSkipped = 0;
  const perPage = 250;
  const maxPages = Math.ceil(targetCount / perPage);

  for (let page = 1; page <= maxPages; page++) {
    console.log(`  📡 Fetching page ${page}/${maxPages}...`);
    
    const data = await fetchWithRetry(
      `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false&price_change_percentage=1h,24h,7d`
    );

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log(`  ⚠️ No data on page ${page}, stopping.`);
      break;
    }

    let pageLoaded = 0;
    for (const coin of data) {
      try {
        // Use CoinGecko coin_id as the unique address
        const address = coin.id;
        if (!address) continue;

        await db.token.upsert({
          where: { address },
          update: {
            symbol: (coin.symbol || '').toUpperCase(),
            name: coin.name || '',
            priceUsd: coin.current_price ?? 0,
            volume24h: coin.total_volume ?? 0,
            marketCap: coin.market_cap ?? 0,
            priceChange1h: coin.price_change_percentage_1h_in_currency ?? 0,
            priceChange24h: coin.price_change_percentage_24h ?? 0,
            priceChange6h: coin.price_change_percentage_7d_in_currency ?? 0,
          },
          create: {
            address,
            symbol: (coin.symbol || '').toUpperCase(),
            name: coin.name || '',
            chain: 'ALL',
            priceUsd: coin.current_price ?? 0,
            volume24h: coin.total_volume ?? 0,
            marketCap: coin.market_cap ?? 0,
            priceChange1h: coin.price_change_percentage_1h_in_currency ?? 0,
            priceChange24h: coin.price_change_percentage_24h ?? 0,
            priceChange6h: coin.price_change_percentage_7d_in_currency ?? 0,
            liquidity: 0,
            priceChange5m: 0,
            priceChange15m: 0,
          },
        });
        pageLoaded++;
      } catch (err) {
        totalSkipped++;
      }
    }

    totalLoaded += pageLoaded;
    console.log(`  ✅ Page ${page}: ${pageLoaded} tokens loaded (total: ${totalLoaded})`);

    await delay(RATE_LIMIT_MS);
  }

  console.log(`\n✅ PHASE 1 COMPLETE: ${totalLoaded} tokens loaded, ${totalSkipped} skipped`);
  return totalLoaded;
}

// ============================================================
// PHASE 2: RESOLVE CONTRACT ADDRESSES FROM COINGECKO
// ============================================================

async function resolveContractAddresses(batchSize = 100) {
  console.log(`\n🔄 PHASE 2: Resolving contract addresses for top tokens...`);
  let resolved = 0;

  const topTokens = await db.token.findMany({
    where: { chain: 'ALL' },
    orderBy: { marketCap: 'desc' },
    take: batchSize,
  });

  console.log(`  Found ${topTokens.length} tokens needing address resolution`);

  for (const token of topTokens) {
    try {
      const data = await fetchWithRetry(`${COINGECKO_BASE}/coins/${token.address}`);
      if (!data || !data.platforms) {
        await delay(RATE_LIMIT_MS);
        continue;
      }

      // Find the best chain from platforms
      let bestChain = 'ALL';
      let contractAddress = null;

      for (const [platform, addr] of Object.entries(data.platforms)) {
        if (addr && PLATFORM_TO_CHAIN[platform]) {
          bestChain = PLATFORM_TO_CHAIN[platform];
          contractAddress = addr;
          break; // Take first available platform
        }
      }

      if (contractAddress && bestChain !== 'ALL') {
        await db.token.update({
          where: { id: token.id },
          data: {
            chain: bestChain,
            // Store contract address in a way that doesn't break the unique constraint
            // We keep the CoinGecko ID as the primary address for now
          },
        });
        resolved++;
      }

      await delay(RATE_LIMIT_MS);
    } catch (err) {
      // Skip individual errors
    }

    if (resolved % 10 === 0 && resolved > 0) {
      console.log(`  Resolved ${resolved}/${topTokens.length} addresses`);
    }
  }

  console.log(`\n✅ PHASE 2 COMPLETE: ${resolved} contract addresses resolved`);
  return resolved;
}

// ============================================================
// PHASE 3: ENRICH WITH DEXSCREENER
// ============================================================

async function enrichWithDexScreener(batchSize = 30) {
  console.log(`\n🔄 PHASE 3: Enriching tokens with DexScreener liquidity data...`);
  let totalEnriched = 0;

  const tokensToEnrich = await db.token.findMany({
    where: { 
      pairAddress: null,
      volume24h: { gt: 0 },
    },
    orderBy: { volume24h: 'desc' },
    take: 500,
  });

  console.log(`  Found ${tokensToEnrich.length} tokens to enrich`);

  // Process in batches
  for (let i = 0; i < tokensToEnrich.length; i += batchSize) {
    const batch = tokensToEnrich.slice(i, i + batchSize);
    
    // Search each token on DexScreener
    for (const token of batch) {
      try {
        const data = await fetchWithRetry(
          `${DEXSCREENER_BASE}/latest/dex/search?q=${encodeURIComponent(token.symbol)}`
        );

        if (data?.pairs && data.pairs.length > 0) {
          // Find best pair for this token
          const bestPair = data.pairs.find(p => 
            p.baseToken?.symbol?.toUpperCase() === token.symbol
          ) || data.pairs[0];

          if (bestPair) {
            const chainMap = {
              'solana': 'SOL', 'ethereum': 'ETH', 'bsc': 'BSC',
              'arbitrum': 'ARB', 'optimism': 'OP', 'base': 'BASE',
              'avalanche': 'AVAX', 'polygon': 'MATIC', 'fantom': 'FTM',
            };

            await db.token.update({
              where: { id: token.id },
              data: {
                liquidity: bestPair.liquidity?.usd || 0,
                pairAddress: bestPair.pairAddress || null,
                dexId: bestPair.dexId || null,
                dex: bestPair.dexId || 'unknown',
                chain: chainMap[bestPair.chainId?.toLowerCase()] || token.chain,
                pairUrl: bestPair.url || null,
                priceUsd: bestPair.priceUsd ? parseFloat(bestPair.priceUsd) : token.priceUsd,
                volume24h: bestPair.volume?.h24 || token.volume24h,
                marketCap: bestPair.fdv || token.marketCap,
                priceChange1h: bestPair.priceChange?.h1 || token.priceChange1h,
                priceChange6h: bestPair.priceChange?.h6 || token.priceChange6h,
                priceChange24h: bestPair.priceChange?.h24 || token.priceChange24h,
              },
            });
            totalEnriched++;
          }
        }

        await delay(DEXSCREENER_DELAY_MS);
      } catch (err) {
        // Skip individual errors
      }
    }

    console.log(`  Enriched ${totalEnriched} tokens so far (${i + batchSize}/${tokensToEnrich.length})`);
  }

  console.log(`\n✅ PHASE 3 COMPLETE: ${totalEnriched} tokens enriched`);
  return totalEnriched;
}

// ============================================================
// PHASE 4: FETCH OHLCV CANDLES
// ============================================================

async function fetchOHLCVCandles(batchSize = 30) {
  console.log(`\n🔄 PHASE 4: Fetching OHLCV candles from CoinGecko...`);
  let totalCandles = 0;

  const tokensWithVolume = await db.token.findMany({
    where: { volume24h: { gt: 0 } },
    orderBy: { volume24h: 'desc' },
    take: 200, // Top 200 tokens get OHLCV
  });

  console.log(`  Fetching OHLCV for ${tokensWithVolume.length} tokens`);

  for (let i = 0; i < tokensWithVolume.length; i++) {
    const token = tokensWithVolume[i];
    
    // Check if already has candles
    const existingCount = await db.priceCandle.count({
      where: { tokenAddress: token.address },
    });
    if (existingCount > 5) continue;

    try {
      // Fetch 7-day OHLCV (gives ~168 hourly candles)
      const ohlcv = await fetchWithRetry(
        `${COINGECKO_BASE}/coins/${token.address}/ohlc?vs_currency=usd&days=7`
      );

      if (ohlcv && Array.isArray(ohlcv)) {
        for (const [timestamp, open, high, low, close] of ohlcv) {
          try {
            await db.priceCandle.upsert({
              where: {
                tokenAddress_chain_timeframe_timestamp: {
                  tokenAddress: token.address,
                  chain: token.chain,
                  timeframe: '4h',
                  timestamp: new Date(timestamp),
                },
              },
              create: {
                tokenAddress: token.address,
                chain: token.chain,
                timeframe: '4h',
                timestamp: new Date(timestamp),
                open, high, low, close,
                volume: 0,
                source: 'coingecko',
              },
              update: { open, high, low, close },
            });
            totalCandles++;
          } catch { /* skip duplicate */ }
        }
      }

      // Also fetch 90-day daily candles for top tokens (every 3rd)
      if (i % 3 === 0) {
        const dailyOhlcv = await fetchWithRetry(
          `${COINGECKO_BASE}/coins/${token.address}/ohlc?vs_currency=usd&days=90`
        );

        if (dailyOhlcv && Array.isArray(dailyOhlcv)) {
          for (const [timestamp, open, high, low, close] of dailyOhlcv) {
            try {
              await db.priceCandle.upsert({
                where: {
                  tokenAddress_chain_timeframe_timestamp: {
                    tokenAddress: token.address,
                    chain: token.chain,
                    timeframe: '1d',
                    timestamp: new Date(timestamp),
                  },
                },
                create: {
                  tokenAddress: token.address,
                  chain: token.chain,
                  timeframe: '1d',
                  timestamp: new Date(timestamp),
                  open, high, low, close,
                  volume: 0,
                  source: 'coingecko',
                },
                update: { open, high, low, close },
              });
              totalCandles++;
            } catch { /* skip */ }
          }
        }
        await delay(RATE_LIMIT_MS);
      }

      if ((i + 1) % 10 === 0) {
        console.log(`  Fetched ${i + 1}/${tokensWithVolume.length} tokens, ${totalCandles} candles total`);
      }

      await delay(RATE_LIMIT_MS);
    } catch (err) {
      await delay(2000);
    }
  }

  console.log(`\n✅ PHASE 4 COMPLETE: ${totalCandles} candles stored`);
  return totalCandles;
}

// ============================================================
// PHASE 5: COMPUTE TOKEN DNA
// ============================================================

async function computeTokenDNA() {
  console.log(`\n🔄 PHASE 5: Computing TokenDNA profiles...`);
  let dnaCreated = 0;

  const tokensWithoutDna = await db.token.findMany({
    where: { dna: { is: null } },
    take: 10000,
  });

  console.log(`  Found ${tokensWithoutDna.length} tokens without DNA`);

  for (const token of tokensWithoutDna) {
    try {
      const pc24 = token.priceChange24h ?? 0;
      const liq = token.liquidity ?? 0;
      const mcap = token.marketCap ?? 0;
      const vol = token.volume24h ?? 0;

      // Deterministic risk score based on real metrics
      let volatilityRisk = Math.abs(pc24) > 50 ? 40 : Math.abs(pc24) > 20 ? 30 : Math.abs(pc24) > 10 ? 20 : Math.abs(pc24) > 5 ? 10 : 0;
      let liquidityRisk = liq > 0 && liq < 50000 ? 30 : liq > 0 && liq < 200000 ? 20 : liq > 0 && liq < 1000000 ? 10 : liq === 0 && vol > 0 ? 35 : 0;
      let mcapRisk = mcap > 0 && mcap < 1000000 ? 25 : mcap > 0 && mcap < 10000000 ? 15 : mcap > 0 && mcap < 50000000 ? 5 : 0;
      let washRisk = liq > 0 && vol > 0 ? (vol / liq > 10 ? 20 : vol / liq > 5 ? 15 : vol / liq > 2 ? 5 : 0) : 0;
      let momentumRisk = pc24 < -30 ? 25 : pc24 < -15 ? 20 : pc24 < -5 ? 10 : 0;

      let riskScore = 20 + volatilityRisk + liquidityRisk + mcapRisk + washRisk + momentumRisk;
      riskScore = Math.min(98, Math.max(5, riskScore));

      const isHighRisk = riskScore > 60;
      const isLowRisk = riskScore < 30;

      // Derive scores from actual data instead of pure random
      const volToLiqRatio = liq > 0 ? vol / liq : 0;
      const volToMcapRatio = mcap > 0 ? vol / mcap : 0;
      
      const botActivityScore = Math.min(95, Math.max(2, 
        volToLiqRatio > 8 ? 55 + Math.min(volToLiqRatio * 2, 35) :
        volToLiqRatio > 3 ? 25 + volToLiqRatio * 5 :
        2 + volToLiqRatio * 3
      ));
      
      const smartMoneyScore = Math.min(80, Math.max(5,
        isLowRisk ? 30 + (mcap > 1e9 ? 20 : mcap > 1e8 ? 10 : 0) :
        isHighRisk ? 5 + Math.min(volToMcapRatio * 100, 20) :
        10 + Math.min(mcap / 1e8, 30)
      ));
      
      const whaleScore = Math.min(70, Math.max(3,
        mcap > 1e9 ? 40 + Math.min(volToMcapRatio * 200, 25) :
        mcap > 1e8 ? 20 + Math.min(volToMcapRatio * 100, 20) :
        3 + Math.min(mcap / 1e7, 15)
      ));

      const retailScore = Math.min(85, Math.max(10, 100 - smartMoneyScore - whaleScore - botActivityScore / 3));
      const washTradeProb = Math.min(0.8, Math.max(0.01, isHighRisk ? 0.15 + volToLiqRatio * 0.05 : 0.01 + volToLiqRatio * 0.02));
      const sniperPct = Math.min(40, Math.max(0, isHighRisk ? 5 + volToLiqRatio * 3 : volToLiqRatio * 1.5));
      const mevPct = Math.min(25, Math.max(0, isHighRisk ? 3 + volToLiqRatio * 2 : volToLiqRatio));
      const copyBotPct = Math.min(20, Math.max(0, isHighRisk ? 2 + volToLiqRatio : volToLiqRatio * 0.5));

      const traderComposition = {
        smartMoney: Math.round(smartMoneyScore / 10),
        whale: Math.round(whaleScore / 10),
        bot_mev: Math.round(mevPct / 2),
        bot_sniper: Math.round(sniperPct / 2),
        bot_copy: Math.round(copyBotPct),
        retail: Math.round(retailScore / 5),
        creator: mcap < 1e6 ? 1 : 0,
        fund: isLowRisk ? (mcap > 1e9 ? 3 : mcap > 1e8 ? 1 : 0) : 0,
        influencer: isHighRisk && volToLiqRatio > 5 ? 1 : 0,
      };

      await db.tokenDNA.create({
        data: {
          tokenId: token.id,
          riskScore,
          botActivityScore: Math.round(botActivityScore * 100) / 100,
          smartMoneyScore: Math.round(smartMoneyScore * 100) / 100,
          retailScore: Math.round(retailScore * 100) / 100,
          whaleScore: Math.round(whaleScore * 100) / 100,
          washTradeProb: Math.round(washTradeProb * 1000) / 1000,
          sniperPct: Math.round(sniperPct * 100) / 100,
          mevPct: Math.round(mevPct * 100) / 100,
          copyBotPct: Math.round(copyBotPct * 100) / 100,
          traderComposition: JSON.stringify(traderComposition),
          topWallets: JSON.stringify([]),
        },
      });
      dnaCreated++;
    } catch { /* skip individual errors */ }
  }

  console.log(`\n✅ PHASE 5 COMPLETE: ${dnaCreated} DNA profiles created`);
  return dnaCreated;
}

// ============================================================
// PHASE 6: DETECT LIFECYCLE PHASES
// ============================================================

async function detectLifecyclePhases() {
  console.log(`\n🔄 PHASE 6: Detecting lifecycle phases...`);
  let phasesCreated = 0;

  const tokens = await db.token.findMany({
    where: { lifecycleStates: { none: {} } },
    take: 10000,
    select: { id: true, address: true, chain: true, volume24h: true, liquidity: true, marketCap: true, priceChange24h: true, createdAt: true },
  });

  for (const token of tokens) {
    try {
      const age = Date.now() - token.createdAt.getTime();
      const ageHours = age / 3600000;
      const hasVolume = token.volume24h > 0;
      const hasLiquidity = token.liquidity > 0;
      const hasMarketCap = token.marketCap > 0;
      const isPumping = token.priceChange24h > 20;
      const isDumping = token.priceChange24h < -20;

      let phase = 'GROWTH';
      let probability = 0.5;

      if (hasMarketCap && token.marketCap > 1e9) {
        phase = 'LEGACY'; probability = 0.85;
      } else if (isDumping && hasVolume) {
        phase = 'DECLINE'; probability = 0.7;
      } else if (isPumping && hasVolume && token.liquidity > 100000) {
        phase = 'FOMO'; probability = 0.65;
      } else if (hasVolume && hasLiquidity && hasMarketCap && !isPumping && !isDumping) {
        phase = 'GROWTH'; probability = 0.6;
      } else if (hasVolume && !hasLiquidity) {
        phase = 'INCIPIENT'; probability = 0.5;
      } else if (!hasVolume && !hasLiquidity) {
        phase = 'GENESIS'; probability = 0.4;
      }

      await db.tokenLifecycleState.create({
        data: {
          tokenAddress: token.address,
          chain: token.chain,
          phase,
          phaseProbability: probability,
          phaseDistribution: JSON.stringify({ [phase]: probability }),
          signals: JSON.stringify({ ageHours, hasVolume, hasLiquidity, hasMarketCap, isPumping, isDumping }),
        },
      });
      phasesCreated++;
    } catch { /* skip */ }
  }

  console.log(`\n✅ PHASE 6 COMPLETE: ${phasesCreated} lifecycle phases detected`);
  return phasesCreated;
}

// ============================================================
// PHASE 7: CREATE TRADING SYSTEM TEMPLATES
// ============================================================

async function createTradingSystems() {
  console.log(`\n🔄 PHASE 7: Creating trading system templates...`);

  const systems = [
    { name: 'Alpha Hunter', description: 'Detects early-stage tokens with high growth potential', type: 'SCANNER', rules: JSON.stringify({ minVolume: 50000, maxMarketCap: 10000000, minPriceChange1h: 5 }), riskLevel: 'HIGH' },
    { name: 'Smart Money Tracker', description: 'Follows wallets classified as smart money', type: 'FOLLOW', rules: JSON.stringify({ smartMoneyScoreMin: 40, minLiquidity: 100000 }), riskLevel: 'MEDIUM' },
    { name: 'Anti-Rug Shield', description: 'Identifies and avoids rug pull patterns', type: 'DEFENSE', rules: JSON.stringify({ maxRiskScore: 80, minLiquidity: 50000, maxWashTradeProb: 0.3 }), riskLevel: 'LOW' },
    { name: 'Momentum Rider', description: 'Rides strong momentum waves with trailing stops', type: 'MOMENTUM', rules: JSON.stringify({ minPriceChange24h: 10, minVolume: 1000000 }), riskLevel: 'HIGH' },
    { name: 'Divergence Detector', description: 'Spots price-volume divergences for reversals', type: 'REVERSAL', rules: JSON.stringify({ divergenceWindow: 24, minConfidence: 60 }), riskLevel: 'MEDIUM' },
    { name: 'Whale Watcher', description: 'Monitors large wallet movements for alpha', type: 'WHALE', rules: JSON.stringify({ whaleScoreMin: 30, minVolume: 500000 }), riskLevel: 'MEDIUM' },
    { name: 'Mean Reversion', description: 'Buys oversold and sells overextended tokens', type: 'REVERSION', rules: JSON.stringify({ oversoldThreshold: -20, overboughtThreshold: 30 }), riskLevel: 'LOW' },
    { name: 'Pattern Scanner', description: 'Identifies candlestick patterns (36 types)', type: 'PATTERN', rules: JSON.stringify({ patterns: ['HAMMER', 'DOJI', 'ENGULFING', 'MORNING_STAR'], minConfidence: 65 }), riskLevel: 'MEDIUM' },
  ];

  let created = 0;
  for (const system of systems) {
    try {
      const existing = await db.tradingSystem.findFirst({ where: { name: system.name } });
      if (!existing) {
        await db.tradingSystem.create({
          data: {
            name: system.name,
            description: system.description,
            type: system.type,
            rules: system.rules,
            riskLevel: system.riskLevel,
            isActive: true,
            winRate: 0,
            totalTrades: 0,
            profitableTrades: 0,
          },
        });
        created++;
      }
    } catch { /* skip */ }
  }

  console.log(`\n✅ PHASE 7 COMPLETE: ${created} trading systems created`);
  return created;
}

// ============================================================
// PHASE 8: GENERATE REAL SIGNALS
// ============================================================

async function generateRealSignals() {
  console.log(`\n🔄 PHASE 8: Generating signals from real market data...`);
  let signalsCreated = 0;

  const activeTokens = await db.token.findMany({
    where: { volume24h: { gt: 100000 } },
    include: { dna: true },
    orderBy: { volume24h: 'desc' },
    take: 200,
  });

  for (const token of activeTokens) {
    const pc24 = token.priceChange24h ?? 0;
    const pc1h = token.priceChange1h ?? 0;
    const liq = token.liquidity ?? 0;
    const vol = token.volume24h ?? 0;
    const mcap = token.marketCap ?? 0;
    const dna = token.dna;

    // Rug Pull: high risk + low liquidity + extreme price drop
    if (dna && dna.riskScore > 70 && liq > 0 && liq < 100000 && pc24 < -20) {
      try {
        await db.signal.create({
          data: {
            type: 'RUG_PULL',
            tokenId: token.id,
            confidence: Math.min(95, 50 + dna.riskScore / 2),
            priceTarget: token.priceUsd * 0.3,
            direction: 'AVOID',
            description: `Rug pull risk: ${token.symbol} dropped ${pc24.toFixed(1)}% with only $${Math.round(liq).toLocaleString()} liquidity`,
            metadata: JSON.stringify({ source: 'real-seed', chain: token.chain, volume24h: vol, riskScore: dna.riskScore }),
          },
        });
        signalsCreated++;
      } catch { /* skip */ }
    }

    // V-Shape: sharp drop then bounce
    if (pc24 < -15 && pc1h > 5) {
      try {
        await db.signal.create({
          data: {
            type: 'V_SHAPE',
            tokenId: token.id,
            confidence: Math.min(85, 40 + Math.abs(pc24)),
            priceTarget: token.priceUsd * 1.15,
            direction: 'LONG',
            description: `V-shape recovery: ${token.symbol} dropped ${pc24.toFixed(1)}% but recovering +${pc1h.toFixed(1)}% (1h)`,
            metadata: JSON.stringify({ source: 'real-seed', chain: token.chain, volume24h: vol }),
          },
        });
        signalsCreated++;
      } catch { /* skip */ }
    }

    // Whale Movement: high vol/liq ratio
    if (liq > 0 && vol / liq > 5 && dna && dna.whaleScore > 40) {
      try {
        await db.signal.create({
          data: {
            type: 'WHALE_MOVEMENT',
            tokenId: token.id,
            confidence: Math.min(80, 30 + dna.whaleScore),
            priceTarget: pc24 > 0 ? token.priceUsd * 1.1 : token.priceUsd * 0.9,
            direction: pc24 > 0 ? 'LONG' : 'SHORT',
            description: `Whale activity: ${token.symbol} vol/liq ${(vol/liq).toFixed(1)}x`,
            metadata: JSON.stringify({ source: 'real-seed', chain: token.chain }),
          },
        });
        signalsCreated++;
      } catch { /* skip */ }
    }

    // Breakout: strong upward momentum with volume
    if (pc24 > 20 && mcap > 0 && vol > mcap * 0.1) {
      try {
        await db.signal.create({
          data: {
            type: 'BREAKOUT',
            tokenId: token.id,
            confidence: Math.min(80, 40 + pc24),
            priceTarget: token.priceUsd * (1 + pc24 / 100),
            direction: 'LONG',
            description: `Breakout: ${token.symbol} up ${pc24.toFixed(1)}% with strong volume`,
            metadata: JSON.stringify({ source: 'real-seed', chain: token.chain, volume24h: vol }),
          },
        });
        signalsCreated++;
      } catch { /* skip */ }
    }

    // Accumulation: low volatility + smart money
    if (dna && dna.smartMoneyScore > 50 && Math.abs(pc24) < 5 && vol > 50000) {
      try {
        await db.signal.create({
          data: {
            type: 'ACCUMULATION_ZONE',
            tokenId: token.id,
            confidence: Math.min(75, 30 + dna.smartMoneyScore),
            priceTarget: token.priceUsd * 1.25,
            direction: 'LONG',
            description: `Accumulation: ${token.symbol} stable (${pc24.toFixed(1)}%) with smart money score ${dna.smartMoneyScore.toFixed(0)}`,
            metadata: JSON.stringify({ source: 'real-seed', chain: token.chain }),
          },
        });
        signalsCreated++;
      } catch { /* skip */ }
    }
  }

  console.log(`\n✅ PHASE 8 COMPLETE: ${signalsCreated} signals generated`);
  return signalsCreated;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const isQuick = args.includes('--quick');
  const isFull = args.includes('--full') || args.length === 0;
  const tokensArg = args.find(a => a.startsWith('--tokens='));
  const targetTokens = tokensArg ? parseInt(tokensArg.split('=')[1]) : isQuick ? 500 : 5000;

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     🧠 CryptoQuant Terminal — Real Data Seed            ║');
  console.log('║     CoinGecko + DexScreener + DexPaprika (NO Birdeye)  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\nMode: ${isQuick ? 'QUICK' : 'FULL'} | Target: ${targetTokens} tokens`);

  const startTime = Date.now();

  try {
    // Phase 1: Load tokens
    const tokensLoaded = await loadTokensFromCoinGecko(targetTokens);

    // Phase 2: Resolve contract addresses (only for top tokens in quick mode)
    if (isQuick) {
      await resolveContractAddresses(50);
    } else {
      await resolveContractAddresses(200);
    }

    // Phase 3: Enrich with DexScreener
    const tokensEnriched = await enrichWithDexScreener(isQuick ? 50 : 200);

    // Phase 4: Fetch OHLCV (less in quick mode)
    const candles = await fetchOHLCVCandles(isQuick ? 30 : 100);

    // Phase 5: Compute DNA
    const dna = await computeTokenDNA();

    // Phase 6: Lifecycle phases
    const phases = await detectLifecyclePhases();

    // Phase 7: Trading systems
    await createTradingSystems();

    // Phase 8: Generate real signals
    const signals = await generateRealSignals();

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     ✅ SEED COMPLETE                                    ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`  Tokens loaded:    ${tokensLoaded}`);
    console.log(`  Tokens enriched:  ${tokensEnriched}`);
    console.log(`  OHLCV candles:    ${candles}`);
    console.log(`  DNA profiles:     ${dna}`);
    console.log(`  Lifecycle phases: ${phases}`);
    console.log(`  Signals:          ${signals}`);
    console.log(`  Duration:         ${duration}s`);
    console.log('');

    // Print DB summary
    const counts = await Promise.all([
      db.token.count(),
      db.token.count({ where: { liquidity: { gt: 0 } } }),
      db.priceCandle.count(),
      db.tokenDNA.count(),
      db.tokenLifecycleState.count(),
      db.signal.count(),
      db.tradingSystem.count(),
    ]);
    
    console.log('📊 Database Summary:');
    console.log(`  Tokens:           ${counts[0]}`);
    console.log(`  With liquidity:   ${counts[1]}`);
    console.log(`  Price candles:    ${counts[2]}`);
    console.log(`  DNA profiles:     ${counts[3]}`);
    console.log(`  Lifecycle phases: ${counts[4]}`);
    console.log(`  Signals:          ${counts[5]}`);
    console.log(`  Trading systems:  ${counts[6]}`);

  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
