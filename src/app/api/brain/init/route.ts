import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET /api/brain/init
 *
 * Initializes the brain pipeline with ALL data sources.
 * MASSIVE EXPANSION: 1250+ tokens from CoinGecko (paginated),
 * trending tokens, high-volume tokens, DexScreener enrichment,
 * multi-chain support, and pattern/predictive signals.
 */

let initTriggered = false;

async function backgroundInit() {
  const { coinGeckoClient } = await import('@/lib/services/coingecko-client');
  const { dexScreenerClient } = await import('@/lib/services/dexscreener-client');
  const { db } = await import('@/lib/db');

  let totalSeeded = 0;
  let totalEnriched = 0;

  // ============================================================
  // STEP 1: CoinGecko PAGINATED - Top tokens by market cap (1250+)
  // ============================================================
  try {
    console.log('[BrainInit] === STEP 1: Fetching CoinGecko top 1250 tokens (paginated) ===');
    const topTokens = await coinGeckoClient.getTopTokensPaginated(1250);

    for (const token of topTokens) {
      try {
        const address = token.address || token.coinId;
        if (!address) continue;

        // Determine chain from platforms
        const chain = detectChain(token);

        await db.token.upsert({
          where: { address },
          update: {
            symbol: token.symbol,
            name: token.name,
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
            liquidity: 0,
            priceChange5m: 0,
            priceChange15m: 0,
          },
        });
        totalSeeded++;
      } catch { /* skip duplicates */ }
    }
    console.log(`[BrainInit] CoinGecko Market Cap: ${totalSeeded}/${topTokens.length} tokens seeded`);
  } catch (err) {
    console.warn('[BrainInit] CoinGecko market cap pagination failed:', err);
  }

  // ============================================================
  // STEP 2: CoinGecko HIGH VOLUME tokens (500 additional)
  // ============================================================
  try {
    console.log('[BrainInit] === STEP 2: Fetching high-volume tokens ===');
    const volumeTokens = await coinGeckoClient.getTopTokensByVolumePaginated(500);
    let volumeSeeded = 0;

    for (const token of volumeTokens) {
      try {
        const address = token.address || token.coinId;
        if (!address) continue;

        const chain = detectChain(token);

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
            liquidity: 0,
            priceChange5m: 0,
            priceChange15m: 0,
          },
        });
        volumeSeeded++;
      } catch { /* skip */ }
    }
    console.log(`[BrainInit] CoinGecko Volume: ${volumeSeeded}/${volumeTokens.length} tokens seeded`);
  } catch (err) {
    console.warn('[BrainInit] CoinGecko volume pagination failed:', err);
  }

  // ============================================================
  // STEP 3: CoinGecko TRENDING tokens
  // ============================================================
  try {
    console.log('[BrainInit] === STEP 3: Fetching trending tokens ===');
    const trending = await coinGeckoClient.getTrending();
    let trendingSeeded = 0;

    for (const item of trending) {
      try {
        const coin = item.item;
        const address = coin.id;
        if (!address) continue;

        const price = coin.data?.price ?? 0;
        const priceChange = coin.data?.price_change_percentage_24h?.usd ?? 0;

        await db.token.upsert({
          where: { address },
          update: {
            priceUsd: price,
            priceChange24h: priceChange,
          },
          create: {
            address,
            symbol: coin.symbol?.toUpperCase() || '',
            name: coin.name || '',
            chain: 'SOL',
            priceUsd: price,
            volume24h: 0,
            marketCap: 0,
            priceChange24h: priceChange,
            liquidity: 0,
            priceChange5m: 0,
            priceChange15m: 0,
          },
        });
        trendingSeeded++;
      } catch { /* skip */ }
    }
    console.log(`[BrainInit] Trending: ${trendingSeeded}/${trending.length} tokens seeded`);
  } catch (err) {
    console.warn('[BrainInit] Trending tokens failed:', err);
  }

  // ============================================================
  // STEP 4: DexScreener ENRICHMENT (top 100 tokens)
  // ============================================================
  try {
    console.log('[BrainInit] === STEP 4: DexScreener enrichment (top 100) ===');

    const topDbTokens = await db.token.findMany({
      where: { volume24h: { gt: 0 } },
      orderBy: { volume24h: 'desc' },
      take: 100,
    });

    if (topDbTokens.length > 0) {
      const liquidityMap = await dexScreenerClient.getTokensLiquidityData(
        topDbTokens.map(t => ({
          symbol: t.symbol,
          name: t.name,
          chain: t.chain,
          address: t.address !== t.symbol.toLowerCase() ? t.address : undefined,
        }))
      );

      for (const [symbol, liqData] of liquidityMap) {
        try {
          await db.token.updateMany({
            where: { symbol },
            data: {
              liquidity: liqData.liquidityUsd,
              priceUsd: liqData.priceUsd,
              volume24h: liqData.volume24h,
              marketCap: liqData.marketCap,
              priceChange1h: liqData.priceChange1h,
              priceChange6h: liqData.priceChange6h,
              priceChange24h: liqData.priceChange24h,
            },
          });
          totalEnriched++;
        } catch { /* skip */ }
      }
      console.log(`[BrainInit] DexScreener: ${totalEnriched}/${topDbTokens.length} tokens enriched`);
    }
  } catch (err) {
    console.warn('[BrainInit] DexScreener enrichment failed:', err);
  }

  // ============================================================
  // STEP 5: Generate ALL signal types
  // ============================================================
  try {
    console.log('[BrainInit] === STEP 5: Generating signals ===');
    const { generateAllSignals, saveSignalsToDb, generatePatternSignals } = await import('@/lib/services/signal-generators');

    const allTokens = await db.token.findMany({
      where: { volume24h: { gt: 0 } },
      orderBy: { volume24h: 'desc' },
      take: 200,
    });

    if (allTokens.length > 0) {
      // Get DexScreener market data for signal generation
      const liquidityMap = await dexScreenerClient.getTokensLiquidityData(
        allTokens.slice(0, 50).map(t => ({ symbol: t.symbol, chain: t.chain }))
      );

      const tokensWithMarketData = allTokens.map(token => {
        const liqData = liquidityMap.get(token.symbol.toUpperCase());
        return {
          tokenId: token.id,
          marketData: liqData ? {
            symbol: token.symbol,
            name: token.name,
            chain: token.chain,
            priceUsd: liqData.priceUsd || token.priceUsd,
            volume24h: liqData.volume24h || token.volume24h,
            liquidityUsd: liqData.liquidityUsd || token.liquidity,
            marketCap: liqData.marketCap || token.marketCap,
            fdv: liqData.fdv || token.marketCap,
            priceChange1h: liqData.priceChange1h || token.priceChange1h,
            priceChange6h: liqData.priceChange6h || 0,
            priceChange24h: liqData.priceChange24h || token.priceChange24h,
            txns24h: liqData.txns24h || { buys: 0, sells: 0 },
            pairCreatedAt: liqData.pairCreatedAt || 0,
            dexId: liqData.dexId || '',
          } : {
            symbol: token.symbol,
            name: token.name,
            chain: token.chain,
            priceUsd: token.priceUsd,
            volume24h: token.volume24h,
            liquidityUsd: token.liquidity,
            marketCap: token.marketCap,
            fdv: token.marketCap,
            priceChange1h: token.priceChange1h,
            priceChange6h: 0,
            priceChange24h: token.priceChange24h,
            txns24h: { buys: 0, sells: 0 },
            pairCreatedAt: 0,
            dexId: '',
          },
        };
      });

      const signals = await generateAllSignals(tokensWithMarketData);
      const saved = await saveSignalsToDb(signals);
      console.log(`[BrainInit] Market signals: ${signals.length} generated, ${saved} saved`);

      // Pattern signals
      const patternResult = await generatePatternSignals(allTokens);
      console.log(`[BrainInit] Pattern signals: ${patternResult.count} created`);
    }
  } catch (err) {
    console.warn('[BrainInit] Signal generation failed:', err);
  }

  // ============================================================
  // STEP 6: Seed Token DNA for new tokens
  // ============================================================
  try {
    console.log('[BrainInit] === STEP 6: Seeding Token DNA ===');
    const tokensWithoutDna = await db.token.findMany({
      where: { dna: { is: null } },
      take: 100,
    });

    let dnaCreated = 0;
    for (const token of tokensWithoutDna) {
      try {
        const pc24 = token.priceChange24h ?? 0;
        const liq = token.liquidity ?? 0;
        const mcap = token.marketCap ?? 0;

        let riskScore = 30;
        if (Math.abs(pc24) > 20) riskScore += 30;
        else if (Math.abs(pc24) > 10) riskScore += 20;
        else if (Math.abs(pc24) > 5) riskScore += 10;
        if (liq > 0 && liq < 50000) riskScore += 25;
        else if (liq > 0 && liq < 200000) riskScore += 15;
        if (mcap > 0 && mcap < 1000000) riskScore += 20;
        else if (mcap > 0 && mcap < 10000000) riskScore += 10;
        if (pc24 < -15) riskScore += 20;
        else if (pc24 < -5) riskScore += 10;

        riskScore = Math.min(95, Math.max(5, riskScore));

        await db.tokenDNA.create({
          data: {
            tokenId: token.id,
            riskScore,
            botActivityScore: Math.random() * 40,
            smartMoneyScore: Math.random() * 30,
            retailScore: 40 + Math.random() * 40,
            whaleScore: Math.random() * 50,
            washTradeProb: Math.random() * 0.3,
            sniperPct: Math.random() * 20,
            mevPct: Math.random() * 15,
            copyBotPct: Math.random() * 10,
          },
        });
        dnaCreated++;
      } catch { /* skip */ }
    }
    console.log(`[BrainInit] Token DNA: ${dnaCreated} created`);
  } catch (err) {
    console.warn('[BrainInit] Token DNA seeding failed:', err);
  }

  // ============================================================
  // STEP 7: Start PERIODIC SYNC SCHEDULERS
  // ============================================================

  // Market sync every 2 min (250 tokens)
  if (!(globalThis as any).__marketSyncRunning) {
    (globalThis as any).__marketSyncRunning = true;
    setInterval(async () => {
      try {
        const { coinGeckoClient } = await import('@/lib/services/coingecko-client');
        const { db } = await import('@/lib/db');

        const tokens = await coinGeckoClient.getTopTokens(250);
        let updated = 0;
        for (const token of tokens) {
          try {
            const address = token.address || token.coinId;
            if (!address) continue;
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
                address, symbol: token.symbol, name: token.name,
                chain: detectChain(token), priceUsd: token.priceUsd,
                volume24h: token.volume24h, marketCap: token.marketCap,
                priceChange1h: token.priceChange1h, priceChange24h: token.priceChange24h,
                liquidity: 0, priceChange5m: 0, priceChange15m: 0,
              },
            });
            updated++;
          } catch { /* skip */ }
        }
        console.log(`[MarketSync] Updated ${updated}/${tokens.length} tokens`);
      } catch (err) {
        console.warn('[MarketSync] Failed:', err);
      }
    }, 2 * 60 * 1000);
    console.log('[BrainInit] Market sync started (2 min, 250 tokens)');
  }

  // DexScreener sync every 5 min (top 60)
  if (!(globalThis as any).__dexScreenerSyncRunning) {
    (globalThis as any).__dexScreenerSyncRunning = true;
    setInterval(async () => {
      try {
        const { dexScreenerClient } = await import('@/lib/services/dexscreener-client');
        const { db } = await import('@/lib/db');

        const topTokens = await db.token.findMany({
          where: { volume24h: { gt: 0 } },
          orderBy: { volume24h: 'desc' },
          take: 60,
        });

        if (topTokens.length === 0) return;

        const liquidityMap = await dexScreenerClient.getTokensLiquidityData(
          topTokens.map(t => ({ symbol: t.symbol, chain: t.chain }))
        );

        let updated = 0;
        for (const [symbol, liqData] of liquidityMap) {
          try {
            await db.token.updateMany({
              where: { symbol },
              data: {
                liquidity: liqData.liquidityUsd,
                priceUsd: liqData.priceUsd,
                volume24h: liqData.volume24h,
                marketCap: liqData.marketCap,
                priceChange1h: liqData.priceChange1h,
                priceChange6h: liqData.priceChange6h,
                priceChange24h: liqData.priceChange24h,
              },
            });
            updated++;
          } catch { /* skip */ }
        }
        console.log(`[DexScreenerSync] Updated ${updated}/${topTokens.length} tokens`);
      } catch (err) {
        console.warn('[DexScreenerSync] Failed:', err);
      }
    }, 5 * 60 * 1000);
    console.log('[BrainInit] DexScreener sync started (5 min, 60 tokens)');
  }

  // Trending sync every 10 min
  if (!(globalThis as any).__trendingSyncRunning) {
    (globalThis as any).__trendingSyncRunning = true;
    setInterval(async () => {
      try {
        const { coinGeckoClient } = await import('@/lib/services/coingecko-client');
        const { db } = await import('@/lib/db');

        const trending = await coinGeckoClient.getTrending();
        let upserted = 0;

        for (const item of trending) {
          try {
            const coin = item.item;
            const address = coin.id;
            if (!address) continue;

            await db.token.upsert({
              where: { address },
              update: {
                priceUsd: coin.data?.price ?? 0,
                priceChange24h: coin.data?.price_change_percentage_24h?.usd ?? 0,
              },
              create: {
                address,
                symbol: coin.symbol?.toUpperCase() || '',
                name: coin.name || '',
                chain: 'SOL',
                priceUsd: coin.data?.price ?? 0,
                volume24h: 0,
                marketCap: 0,
                priceChange24h: coin.data?.price_change_percentage_24h?.usd ?? 0,
                liquidity: 0,
                priceChange5m: 0,
                priceChange15m: 0,
              },
            });
            upserted++;
          } catch { /* skip */ }
        }
        console.log(`[TrendingSync] Upserted ${upserted}/${trending.length} trending tokens`);
      } catch (err) {
        console.warn('[TrendingSync] Failed:', err);
      }
    }, 10 * 60 * 1000);
    console.log('[BrainInit] Trending sync started (10 min)');
  }

  // Full pagination refresh every 30 min (discover new tokens)
  if (!(globalThis as any).__fullDiscoveryRunning) {
    (globalThis as any).__fullDiscoveryRunning = true;
    setInterval(async () => {
      try {
        const { coinGeckoClient } = await import('@/lib/services/coingecko-client');
        const { db } = await import('@/lib/db');

        console.log('[FullDiscovery] Running full token discovery...');
        const topTokens = await coinGeckoClient.getTopTokensPaginated(1250);
        let newTokens = 0;

        for (const token of topTokens) {
          try {
            const address = token.address || token.coinId;
            if (!address) continue;

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
                chain: detectChain(token),
                priceUsd: token.priceUsd,
                volume24h: token.volume24h,
                marketCap: token.marketCap,
                priceChange1h: token.priceChange1h,
                priceChange24h: token.priceChange24h,
                liquidity: 0,
                priceChange5m: 0,
                priceChange15m: 0,
              },
            });
            newTokens++;
          } catch { /* skip */ }
        }
        console.log(`[FullDiscovery] Processed ${newTokens} tokens from full discovery`);
      } catch (err) {
        console.warn('[FullDiscovery] Failed:', err);
      }
    }, 30 * 60 * 1000);
    console.log('[BrainInit] Full discovery started (30 min, 1250 tokens)');
  }

  console.log(`[BrainInit] === INIT COMPLETE: ${totalSeeded} seeded, ${totalEnriched} enriched ===`);
}

/**
 * Detect chain from CoinGecko token platforms data.
 * Falls back to 'SOL' for unknown chains.
 */
function detectChain(token: { platforms?: Record<string, string>; symbol?: string }): string {
  if (!token.platforms || Object.keys(token.platforms).length === 0) return 'SOL';

  const platformMap: Record<string, string> = {
    'ethereum': 'ETH',
    'solana': 'SOL',
    'binance-smart-chain': 'BSC',
    'arbitrum': 'ARB',
    'optimistic-ethereum': 'OP',
    'base': 'BASE',
    'avalanche': 'AVAX',
    'polygon-pos': 'MATIC',
    'fantom': 'FTM',
  };

  // Check which platforms this token exists on, prefer SOL then ETH
  const platforms = Object.keys(token.platforms).filter(p => token.platforms![p] && token.platforms![p] !== '');
  if (platforms.includes('solana')) return 'SOL';
  if (platforms.includes('ethereum')) return 'ETH';
  if (platforms.includes('binance-smart-chain')) return 'BSC';

  // Return first known platform
  for (const p of platforms) {
    if (platformMap[p]) return platformMap[p];
  }

  return 'SOL';
}

export async function GET() {
  if (!initTriggered) {
    initTriggered = true;
    backgroundInit().catch(err => console.error('[BrainInit] Background init error:', err));
  }

  return NextResponse.json({
    success: true,
    action: 'initializing',
    message: 'Brain init started - fetching 1250+ tokens (paginated) + trending + volume + DexScreener enrichment + signals + DNA',
  });
}
