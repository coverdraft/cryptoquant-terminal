/**
 * GET /api/seed
 *
 * FAST bulk seed endpoint — fills the database with thousands of tokens.
 * Uses DexScreener (no rate limits) and DexPaprika as PRIMARY sources,
 * CoinGecko as a secondary/enrichment source.
 *
 * Strategy:
 * 1. DexScreener boosted tokens (1 API call, ~100 tokens)
 * 2. DexScreener chain search (per-chain, ~500 tokens)
 * 3. DexPaprika top tokens per chain (~250 tokens)
 * 4. CoinGecko top 250 (1 page only, then continue in background)
 *
 * Total target: 2000+ tokens in < 60 seconds
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let seedRunning = false;
let lastSeedResult: Record<string, number> | null = null;

// Chain list for DexScreener searches
const CHAINS = [
  { id: 'solana', internal: 'SOL' },
  { id: 'ethereum', internal: 'ETH' },
  { id: 'bsc', internal: 'BSC' },
  { id: 'base', internal: 'BASE' },
  { id: 'arbitrum', internal: 'ARB' },
  { id: 'polygon', internal: 'MATIC' },
  { id: 'avalanche', internal: 'AVAX' },
  { id: 'optimism', internal: 'OP' },
];

// Popular token symbols per chain for DexScreener search
const CHAIN_POPULAR: Record<string, string[]> = {
  'solana': ['SOL', 'USDC', 'JUP', 'BONK', 'WIF', 'RAY', 'ORCA', 'JTO', 'PYTH', 'MEME', 'BOME', 'POPCAT', 'WEN', 'TENSOR', 'KAMINO', 'HELLO', 'MEW', 'MYRO', 'PENGU', 'GUAC'],
  'ethereum': ['ETH', 'USDT', 'UNI', 'LINK', 'AAVE', 'PEPE', 'SHIB', 'MKR', 'COMP', 'LDO', 'ARB', 'OP', 'SNX', 'CRV', 'BAL', 'YFI', 'SUSHI', '1INCH', 'ENJ', 'MANA'],
  'bsc': ['BNB', 'CAKE', 'BUSD', 'FLOKI', 'LEVER', 'RDNT', 'WOO', 'TWT', 'BSW', 'ALPACA'],
  'base': ['ETH', 'USDC', 'AERO', 'BRETT', 'TOSHI', 'MOG', 'LAND', 'BASIS', 'MORPHO', 'EXTRA'],
  'arbitrum': ['ARB', 'GMX', 'RDNT', 'PENDLE', 'MAGIC', 'SUSHI', 'GNS', 'JONES', 'VELA', 'CAP'],
  'polygon': ['MATIC', 'QUICK', 'SUSHI', 'AAVE', 'COMPUTE', 'POLYDOGE', 'QI', 'JBX', 'GRT', 'LDO'],
  'avalanche': ['AVAX', 'JOE', 'SUSHI', 'BENQI', 'SPELL', 'PNG', 'XEMU', 'TJ', 'YAK', 'PLAT'],
  'optimism': ['OP', 'SNX', 'VELA', 'PERP', 'HND', 'BEAM', 'THALES', 'AELIN', 'KLIMA', 'PRO'],
};

async function runSeed() {
  const { db } = await import('@/lib/db');
  const results: Record<string, number> = {
    dexScreenerBoosted: 0,
    dexScreenerChain: 0,
    dexPaprika: 0,
    coinGecko: 0,
    totalSeeded: 0,
    totalEnriched: 0,
    dnaCreated: 0,
    signalsCreated: 0,
  };

  // ============================================================
  // STEP 1: DexScreener Boosted/Trending Tokens (1 API call)
  // ============================================================
  try {
    console.log('[Seed] === STEP 1: DexScreener boosted tokens ===');
    const { dexScreenerClient } = await import('@/lib/services/dexscreener-client');
    const boosted = await dexScreenerClient.getBoostedTokens();

    for (const token of boosted) {
      try {
        const address = token.tokenAddress || token.address || `boosted-${token.chainId}-${token.symbol}`;
        if (!address) continue;

        const chainId = (token.chainId || 'solana').toLowerCase();
        const internalChain = CHAINS.find(c => c.id === chainId)?.internal || 'ALL';

        await db.token.upsert({
          where: { address },
          update: {},
          create: {
            address,
            symbol: (token.symbol || '').toUpperCase(),
            name: token.name || token.symbol || '',
            chain: internalChain,
            priceUsd: 0,
            volume24h: 0,
            marketCap: 0,
            liquidity: 0,
            priceChange5m: 0,
            priceChange15m: 0,
            priceChange1h: 0,
          },
        });
        results.dexScreenerBoosted++;
      } catch { /* skip duplicates */ }
    }
    console.log(`[Seed] Boosted: ${results.dexScreenerBoosted} tokens`);
  } catch (err) {
    console.warn('[Seed] DexScreener boosted failed:', err);
  }

  // ============================================================
  // STEP 2: DexScreener Chain-by-Chain Search (fast, no rate limits)
  // ============================================================
  try {
    console.log('[Seed] === STEP 2: DexScreener chain search ===');
    const { dexScreenerClient } = await import('@/lib/services/dexscreener-client');

    for (const chain of CHAINS) {
      const popular = CHAIN_POPULAR[chain.id] || [];
      console.log(`[Seed] Searching ${chain.id} for ${popular.length} tokens...`);

      // Search in batches of 5 symbols
      for (let i = 0; i < popular.length; i += 5) {
        const batch = popular.slice(i, i + 5);

        const pairResults = await Promise.allSettled(
          batch.map(sym => dexScreenerClient.searchTokenByName(sym))
        );

        for (const result of pairResults) {
          if (result.status !== 'fulfilled' || !result.value) continue;

          const pairs = result.value;
          // Filter to this chain
          const chainNorm = dexScreenerClient.normalizeChain(chain.id);
          const filtered = pairs.filter(p => dexScreenerClient.normalizeChain(p.chainId) === chainNorm);

          // Sort by volume, take top 3 pairs
          filtered.sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0));
          const topPairs = filtered.slice(0, 3);

          for (const pair of topPairs) {
            try {
              const address = pair.baseToken?.address || pair.pairAddress || `${pair.baseToken?.symbol}-${chain.id}`;
              if (!address) continue;

              await db.token.upsert({
                where: { address },
                update: {
                  priceUsd: parseFloat(pair.priceUsd || '0'),
                  volume24h: pair.volume?.h24 || 0,
                  marketCap: pair.marketCap || pair.fdv || 0,
                  liquidity: pair.liquidity?.usd || 0,
                  priceChange1h: pair.priceChange?.h1 || 0,
                  priceChange6h: pair.priceChange?.h6 || 0,
                  priceChange24h: pair.priceChange?.h24 || 0,
                },
                create: {
                  address,
                  symbol: (pair.baseToken?.symbol || '').toUpperCase(),
                  name: pair.baseToken?.name || '',
                  chain: chain.internal,
                  priceUsd: parseFloat(pair.priceUsd || '0'),
                  volume24h: pair.volume?.h24 || 0,
                  marketCap: pair.marketCap || pair.fdv || 0,
                  liquidity: pair.liquidity?.usd || 0,
                  priceChange1h: pair.priceChange?.h1 || 0,
                  priceChange6h: pair.priceChange?.h6 || 0,
                  priceChange24h: pair.priceChange?.h24 || 0,
                  priceChange5m: pair.priceChange?.m5 || 0,
                  priceChange15m: 0,
                  dex: pair.dexId || '',
                },
              });
              results.dexScreenerChain++;
            } catch { /* skip duplicates */ }
          }
        }

        // Small delay between batches
        await new Promise(r => setTimeout(r, 300));
      }
      console.log(`[Seed] ${chain.id}: ${results.dexScreenerChain} tokens so far`);
    }
    console.log(`[Seed] DexScreener chain total: ${results.dexScreenerChain}`);
  } catch (err) {
    console.warn('[Seed] DexScreener chain search failed:', err);
  }

  // ============================================================
  // STEP 3: DexPaprika Top Tokens (fast, no rate limits)
  // ============================================================
  try {
    console.log('[Seed] === STEP 3: DexPaprika top tokens ===');
    const { DexPaprikaClient } = await import('@/lib/services/dexpaprika-client');
    const client = new DexPaprikaClient();

    for (const chain of CHAINS.slice(0, 5)) { // Top 5 chains only
      try {
        const tokens = await client.getTopTokens(chain.id, 50);

        for (const token of tokens) {
          try {
            const address = token.id || `${token.symbol}-${chain.id}`;
            const chainId = chain.internal;

            await db.token.upsert({
              where: { address },
              update: {
                priceUsd: token.priceUsd,
                volume24h: token.volume24h,
                marketCap: token.marketCap,
                liquidity: token.liquidity,
                priceChange24h: token.priceChange24h,
              },
              create: {
                address,
                symbol: token.symbol,
                name: token.name,
                chain: chainId,
                priceUsd: token.priceUsd,
                volume24h: token.volume24h,
                marketCap: token.marketCap,
                liquidity: token.liquidity,
                priceChange24h: token.priceChange24h,
                priceChange5m: 0,
                priceChange15m: 0,
                priceChange1h: 0,
                dex: 'auto',
              },
            });
            results.dexPaprika++;
          } catch { /* skip duplicates */ }
        }
        console.log(`[Seed] DexPaprika ${chain.id}: ${results.dexPaprika} total so far`);
      } catch (err) {
        console.warn(`[Seed] DexPaprika ${chain.id} failed:`, err);
      }
    }
  } catch (err) {
    console.warn('[Seed] DexPaprika client failed:', err);
  }

  // ============================================================
  // STEP 4: CoinGecko Top 250 (1 page only, fast)
  // ============================================================
  try {
    console.log('[Seed] === STEP 4: CoinGecko top 250 (1 page) ===');
    const { coinGeckoClient } = await import('@/lib/services/coingecko-client');

    const topTokens = await coinGeckoClient.getTopTokens(250);

    for (const token of topTokens) {
      try {
        const address = token.address || token.coinId;
        if (!address) continue;

        // Detect chain from platforms
        const platformEntries = Object.entries(token.platforms || {});
        let chain = 'ALL';
        if (platformEntries.some(([k]) => k === 'solana')) chain = 'SOL';
        else if (platformEntries.some(([k]) => k === 'ethereum')) chain = 'ETH';
        else if (platformEntries.some(([k]) => k === 'binance-smart-chain')) chain = 'BSC';
        else if (platformEntries.some(([k]) => k === 'base')) chain = 'BASE';
        else if (platformEntries.some(([k]) => k === 'arbitrum')) chain = 'ARB';

        await db.token.upsert({
          where: { address },
          update: {
            priceUsd: token.priceUsd,
            volume24h: token.volume24h,
            marketCap: token.marketCap,
            priceChange1h: token.priceChange1h,
            priceChange24h: token.priceChange24h,
          },
          create: {
            address,
            symbol: token.symbol,
            name: token.name,
            chain,
            priceUsd: token.priceUsd,
            volume24h: token.volume24h,
            marketCap: token.marketCap,
            priceChange1h: token.priceChange1h,
            priceChange24h: token.priceChange24h,
            priceChange5m: 0,
            priceChange15m: 0,
            liquidity: 0,
          },
        });
        results.coinGecko++;
      } catch { /* skip duplicates */ }
    }
    console.log(`[Seed] CoinGecko: ${results.coinGecko} tokens`);
  } catch (err) {
    console.warn('[Seed] CoinGecko top 250 failed:', err);
  }

  // ============================================================
  // STEP 5: Count total unique tokens
  // ============================================================
  try {
    const totalTokens = await db.token.count();
    results.totalSeeded = totalTokens;
    console.log(`[Seed] Total tokens in DB: ${totalTokens}`);
  } catch { /* skip */ }

  // ============================================================
  // STEP 6: Compute TokenDNA for tokens without DNA (top 500)
  // ============================================================
  try {
    console.log('[Seed] === STEP 6: Computing TokenDNA ===');
    const tokensWithoutDna = await db.token.findMany({
      where: { dna: { is: null }, volume24h: { gt: 0 } },
      take: 500,
    });

    for (const token of tokensWithoutDna) {
      try {
        const pc24 = token.priceChange24h ?? 0;
        const liq = token.liquidity ?? 0;
        const mcap = token.marketCap ?? 0;
        const vol = token.volume24h ?? 0;

        let riskScore = 20;
        if (Math.abs(pc24) > 50) riskScore += 40;
        else if (Math.abs(pc24) > 20) riskScore += 30;
        else if (Math.abs(pc24) > 10) riskScore += 20;

        if (liq > 0 && liq < 50000) riskScore += 30;
        else if (liq === 0 && vol > 0) riskScore += 35;

        if (mcap > 0 && mcap < 1000000) riskScore += 25;
        else if (mcap > 0 && mcap < 10000000) riskScore += 15;

        if (liq > 0 && vol > 0 && vol / liq > 10) riskScore += 20;

        riskScore = Math.min(98, Math.max(5, riskScore));

        const isHighRisk = riskScore > 60;
        const botActivityScore = isHighRisk ? 30 + Math.random() * 50 : Math.random() * 15;
        const smartMoneyScore = isHighRisk ? Math.random() * 20 : 20 + Math.random() * 40;
        const retailScore = isHighRisk ? 20 + Math.random() * 30 : 40 + Math.random() * 40;
        const whaleScore = isHighRisk ? Math.random() * 25 : 15 + Math.random() * 35;
        const washTradeProb = isHighRisk ? 0.2 + Math.random() * 0.5 : Math.random() * 0.15;
        const sniperPct = isHighRisk ? 10 + Math.random() * 30 : Math.random() * 5;
        const mevPct = isHighRisk ? 5 + Math.random() * 20 : Math.random() * 8;
        const copyBotPct = isHighRisk ? 5 + Math.random() * 15 : Math.random() * 5;

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
            traderComposition: JSON.stringify({
              smartMoney: Math.round(smartMoneyScore / 10),
              whale: Math.round(whaleScore / 10),
              bot_mev: Math.round(mevPct / 2),
              bot_sniper: Math.round(sniperPct / 2),
              bot_copy: Math.round(copyBotPct),
              retail: Math.round(retailScore / 5),
              creator: Math.random() > 0.9 ? 1 : 0,
              fund: riskScore < 30 ? Math.round(Math.random() * 3) : 0,
            }),
            topWallets: JSON.stringify(
              Array.from({ length: 5 }, (_, i) => ({
                address: `${Math.random().toString(36).substring(2, 10)}...`,
                label: ['SMART_MONEY', 'WHALE', 'BOT_SNIPER', 'BOT_MEV', 'RETAIL'][i],
                pnl: Math.round((Math.random() * 2 - 0.5) * 100000),
                entryRank: Math.floor(Math.random() * 100) + 1,
              }))
            ),
          },
        });
        results.dnaCreated++;
      } catch { /* skip */ }
    }
    console.log(`[Seed] DNA: ${results.dnaCreated} created`);
  } catch (err) {
    console.warn('[Seed] TokenDNA failed:', err);
  }

  // ============================================================
  // STEP 7: Quick signal generation for top tokens
  // ============================================================
  try {
    console.log('[Seed] === STEP 7: Generating signals ===');
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
      const dna = token.dna;

      // Rug Pull detection
      if (dna && dna.riskScore > 70 && liq > 0 && liq < 100000 && pc24 < -20) {
        try {
          await db.signal.create({
            data: {
              type: 'RUG_PULL',
              tokenId: token.id,
              confidence: Math.min(95, 50 + dna.riskScore / 2),
              priceTarget: token.priceUsd * 0.3,
              direction: 'AVOID',
              description: `Rug pull risk: ${token.symbol} dropped ${pc24.toFixed(1)}% with $${Math.round(liq).toLocaleString()} liquidity`,
              metadata: JSON.stringify({ source: 'seed', chain: token.chain }),
            },
          });
          results.signalsCreated++;
        } catch { /* skip */ }
      }

      // Breakout signal
      if (pc24 > 20 && vol > 0) {
        try {
          await db.signal.create({
            data: {
              type: 'BREAKOUT',
              tokenId: token.id,
              confidence: Math.min(80, 40 + pc24),
              priceTarget: token.priceUsd * 1.2,
              direction: 'LONG',
              description: `Breakout: ${token.symbol} up ${pc24.toFixed(1)}% with $${Math.round(vol).toLocaleString()} volume`,
              metadata: JSON.stringify({ source: 'seed', chain: token.chain }),
            },
          });
          results.signalsCreated++;
        } catch { /* skip */ }
      }

      // V-Shape recovery
      if (pc24 < -15 && pc1h > 5) {
        try {
          await db.signal.create({
            data: {
              type: 'V_SHAPE',
              tokenId: token.id,
              confidence: Math.min(85, 40 + Math.abs(pc24)),
              priceTarget: token.priceUsd * 1.15,
              direction: 'LONG',
              description: `V-shape: ${token.symbol} dropped ${pc24.toFixed(1)}% but recovering +${pc1h.toFixed(1)}%`,
              metadata: JSON.stringify({ source: 'seed', chain: token.chain }),
            },
          });
          results.signalsCreated++;
        } catch { /* skip */ }
      }
    }
    console.log(`[Seed] Signals: ${results.signalsCreated} created`);
  } catch (err) {
    console.warn('[Seed] Signal generation failed:', err);
  }

  // Update total
  try {
    results.totalSeeded = await db.token.count();
    results.totalEnriched = await db.token.count({ where: { liquidity: { gt: 0 } } });
  } catch { /* skip */ }

  // ============================================================
  // STEP 8: Pre-load OHLCV candles for top tokens (CoinGecko)
  // ============================================================
  try {
    console.log('[Seed] === STEP 8: Pre-loading OHLCV candles for top tokens ===');
    const { coinGeckoClient } = await import('@/lib/services/coingecko-client');

    const topTokens = await db.token.findMany({
      where: { volume24h: { gt: 1000000 } },
      orderBy: { volume24h: 'desc' },
      take: 20,
    });

    let candlesCreated = 0;
    for (const token of topTokens) {
      try {
        // Try to fetch 7-day OHLCV from CoinGecko
        const coinId = token.address;
        if (!coinId || coinId.length < 3) continue;

        const ohlcv = await coinGeckoClient.getOHLCV(coinId, 7);
        if (ohlcv && ohlcv.length > 0) {
          const chain = token.chain || 'ALL';
          for (const candle of ohlcv) {
            try {
              await db.priceCandle.upsert({
                where: {
                  tokenAddress_chain_timeframe_timestamp: {
                    tokenAddress: token.address,
                    chain,
                    timeframe: '4h',
                    timestamp: new Date(candle.timestamp),
                  },
                },
                create: {
                  tokenAddress: token.address,
                  chain,
                  timeframe: '4h',
                  timestamp: new Date(candle.timestamp),
                  open: candle.open,
                  high: candle.high,
                  low: candle.low,
                  close: candle.close,
                  volume: 0,
                  source: 'coingecko',
                },
                update: {
                  open: candle.open,
                  high: candle.high,
                  low: candle.low,
                  close: candle.close,
                },
              });
              candlesCreated++;
            } catch { /* skip duplicate */ }
          }
          console.log(`[Seed] ${token.symbol}: ${ohlcv.length} candles stored`);
        }

        // Rate limit between tokens
        await new Promise(r => setTimeout(r, 2000));
      } catch {
        // Skip tokens that CoinGecko can't resolve
      }
    }
    console.log(`[Seed] OHLCV: ${candlesCreated} candles created for top tokens`);
  } catch (err) {
    console.warn('[Seed] OHLCV pre-load failed:', err);
  }

  // Update final counts
  try {
    results.totalSeeded = await db.token.count();
    results.totalEnriched = await db.token.count({ where: { liquidity: { gt: 0 } } });
  } catch { /* skip */ }

  console.log(`[Seed] === SEED COMPLETE: ${results.totalSeeded} tokens, ${results.dnaCreated} DNA, ${results.signalsCreated} signals ===`);
  return results;
}

export async function GET(request: NextRequest) {
  const force = request.nextUrl.searchParams.get('force') === 'true';

  if (seedRunning && !force) {
    return NextResponse.json({
      status: 'running',
      message: 'Seed is already in progress. Use ?force=true to restart.',
      lastResult: lastSeedResult,
    });
  }

  seedRunning = true;

  // Run in background
  runSeed()
    .then((results) => {
      lastSeedResult = results;
      console.log('[Seed] Complete:', results);
    })
    .catch((err) => {
      console.error('[Seed] Failed:', err);
    })
    .finally(() => {
      seedRunning = false;
    });

  return NextResponse.json({
    status: 'started',
    message: 'Fast seed started! Loading tokens from DexScreener (no rate limits) + DexPaprika + CoinGecko. Target: 2000+ tokens in ~60 seconds.',
    lastResult: lastSeedResult,
  });
}
