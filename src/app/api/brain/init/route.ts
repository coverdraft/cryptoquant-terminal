import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET /api/brain/init
 *
 * Initializes the brain pipeline.
 * Returns immediately, does all heavy work in background.
 * Uses lightweight CoinGecko client directly (not DataIngestionPipeline).
 */

// Track if init has been triggered
let initTriggered = false;

async function backgroundInit() {
  let coinGeckoCount = 0;

  // Step 1: Seed CoinGecko tokens (lightweight)
  try {
    const { coinGeckoClient } = await import('@/lib/services/coingecko-client');
    const { db } = await import('@/lib/db');

    console.log('[BrainInit] Fetching CoinGecko top tokens...');
    const topTokens = await coinGeckoClient.getTopTokens(30);

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

  // Step 2: Start periodic market sync (only once)
  try {
    if (!(globalThis as any).__marketSyncRunning) {
      (globalThis as any).__marketSyncRunning = true;

      setInterval(async () => {
        try {
          const { coinGeckoClient } = await import('@/lib/services/coingecko-client');
          const { db } = await import('@/lib/db');

          const tokens = await coinGeckoClient.getTopTokens(20);
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
      }, 2 * 60 * 1000); // Every 2 minutes

      console.log('[BrainInit] Market sync scheduler started (2 min intervals)');
    }
  } catch (err) {
    console.warn('[BrainInit] Scheduler start failed:', err);
  }
}

export async function GET() {
  // Return immediately - heavy work in background
  if (!initTriggered) {
    initTriggered = true;
    // Fire-and-forget background init
    backgroundInit().catch(err => console.error('[BrainInit] Background init error:', err));
  }

  return NextResponse.json({
    success: true,
    action: 'initializing',
    message: 'Brain init started in background',
  });
}
