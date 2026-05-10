import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET /api/brain/init
 *
 * Initializes the brain pipeline with ALL data sources.
 * Returns immediately, does all heavy work in background.
 * Sources: CoinGecko (100 tokens) + DexScreener (real liquidity)
 */

let initTriggered = false;

async function backgroundInit() {
  let coinGeckoCount = 0;
  let dexScreenerCount = 0;

  // Step 1: Seed CoinGecko tokens (PRIMARY - prices, volumes, market caps)
  try {
    const { coinGeckoClient } = await import('@/lib/services/coingecko-client');
    const { db } = await import('@/lib/db');

    console.log('[BrainInit] Fetching CoinGecko top 100 tokens...');
    const topTokens = await coinGeckoClient.getTopTokens(100);

    for (const token of topTokens) {
      try {
        const address = token.address || token.coinId;
        if (!address) continue;

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
            chain: 'SOL',
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
        coinGeckoCount++;
      } catch { /* skip */ }
    }
    console.log(`[BrainInit] CoinGecko: ${coinGeckoCount}/${topTokens.length} tokens seeded`);
  } catch (err) {
    console.warn('[BrainInit] CoinGecko seed failed:', err);
  }

  // Step 2: Enrich top tokens with DexScreener (REAL LIQUIDITY DATA)
  try {
    const { dexScreenerClient } = await import('@/lib/services/dexscreener-client');
    const { db } = await import('@/lib/db');

    console.log('[BrainInit] Enriching top tokens with DexScreener liquidity...');

    // Get top 30 tokens by volume from DB
    const topDbTokens = await db.token.findMany({
      where: { volume24h: { gt: 0 } },
      orderBy: { volume24h: 'desc' },
      take: 30,
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
              priceChange24h: liqData.priceChange24h,
            },
          });
          dexScreenerCount++;
        } catch { /* skip */ }
      }
      console.log(`[BrainInit] DexScreener: ${dexScreenerCount}/${topDbTokens.length} tokens enriched with real liquidity`);
    }
  } catch (err) {
    console.warn('[BrainInit] DexScreener enrichment failed:', err);
  }

  // Step 3: Generate signals for all enriched tokens
  try {
    const { db } = await import('@/lib/db');
    const { generateAllSignals, saveSignalsToDb } = await import('@/lib/services/signal-generators');
    const { dexScreenerClient } = await import('@/lib/services/dexscreener-client');

    console.log('[BrainInit] Generating signals for all tokens...');

    const allTokens = await db.token.findMany({
      where: { volume24h: { gt: 0 } },
      orderBy: { volume24h: 'desc' },
      take: 50,
    });

    if (allTokens.length > 0) {
      // Get market data from DexScreener for signal generation
      const liquidityMap = await dexScreenerClient.getTokensLiquidityData(
        allTokens.map(t => ({ symbol: t.symbol, chain: t.chain }))
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
      console.log(`[BrainInit] Generated ${signals.length} signals, saved ${saved}`);
    }
  } catch (err) {
    console.warn('[BrainInit] Signal generation failed:', err);
  }

  // Step 4: Start periodic market sync (every 2 minutes)
  try {
    if (!(globalThis as any).__marketSyncRunning) {
      (globalThis as any).__marketSyncRunning = true;

      setInterval(async () => {
        try {
          const { coinGeckoClient } = await import('@/lib/services/coingecko-client');
          const { db } = await import('@/lib/db');

          const tokens = await coinGeckoClient.getTopTokens(50);
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
                  chain: 'SOL', priceUsd: token.priceUsd,
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

      console.log('[BrainInit] Market sync scheduler started (2 min intervals)');
    }
  } catch (err) {
    console.warn('[BrainInit] Scheduler start failed:', err);
  }

  // Step 5: Start DexScreener periodic sync (every 5 minutes)
  try {
    if (!(globalThis as any).__dexScreenerSyncRunning) {
      (globalThis as any).__dexScreenerSyncRunning = true;

      setInterval(async () => {
        try {
          const { dexScreenerClient } = await import('@/lib/services/dexscreener-client');
          const { db } = await import('@/lib/db');

          const topTokens = await db.token.findMany({
            where: { volume24h: { gt: 0 } },
            orderBy: { volume24h: 'desc' },
            take: 20,
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
                  priceChange24h: liqData.priceChange24h,
                },
              });
              updated++;
            } catch { /* skip */ }
          }
          console.log(`[DexScreenerSync] Updated ${updated}/${topTokens.length} tokens with real liquidity`);
        } catch (err) {
          console.warn('[DexScreenerSync] Failed:', err);
        }
      }, 5 * 60 * 1000);

      console.log('[BrainInit] DexScreener sync scheduler started (5 min intervals)');
    }
  } catch (err) {
    console.warn('[BrainInit] DexScreener scheduler start failed:', err);
  }
}

export async function GET() {
  if (!initTriggered) {
    initTriggered = true;
    backgroundInit().catch(err => console.error('[BrainInit] Background init error:', err));
  }

  return NextResponse.json({
    success: true,
    action: 'initializing',
    message: 'Brain init started in background - fetching 100 tokens + DexScreener liquidity + signals',
  });
}
