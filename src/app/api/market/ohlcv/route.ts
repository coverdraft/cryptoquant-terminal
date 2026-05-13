import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/market/ohlcv
 *
 * Returns OHLCV candle data from the database.
 * If no candles exist for the requested token, fetches ON-DEMAND
 * from CoinGecko (free API) and stores them for future requests.
 *
 * Data sources: CoinGecko + DexScreener
 */

// Timeframe to CoinGecko days parameter mapping
const TIMEFRAME_TO_DAYS: Record<string, number> = {
  '30m': 1,
  '4h': 7,
  '1d': 90,
};

// Default days per timeframe if not in map
const DEFAULT_DAYS: Record<string, number> = {
  '1m': 1, '3m': 1, '5m': 1, '15m': 1, '30m': 1,
  '1h': 7, '2h': 7, '4h': 7, '6h': 14, '12h': 30,
  '1d': 90, '1w': 365,
};

export async function GET(request: NextRequest) {
  try {
    const { db } = await import('@/lib/db');

    const searchParams = request.nextUrl.searchParams;
    const tokenAddress = searchParams.get('tokenAddress') || '';
    const timeframe = searchParams.get('timeframe') || '1h';
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 1000);
    const forceRefresh = searchParams.get('refresh') === 'true';
    const chain = searchParams.get('chain') || '';

    if (!tokenAddress) {
      return NextResponse.json(
        { candles: [], timeframe, source: 'none', error: 'tokenAddress is required' },
        { status: 400 },
      );
    }

    // Resolve tokenAddress: if it looks like a CUID (DB id), look up the actual address
    let resolvedAddress = tokenAddress;
    let resolvedChain = chain || '';
    if (tokenAddress.startsWith('cl') || tokenAddress.startsWith('cm')) {
      const token = await db.token.findUnique({ where: { id: tokenAddress } });
      if (token) {
        resolvedAddress = token.address;
        resolvedChain = token.chain || resolvedChain;
      }
    }

    // Query candles from DB directly using resolved address
    let candles = await db.priceCandle.findMany({
      where: { tokenAddress: resolvedAddress, timeframe },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    // If no candles found (or force refresh), try on-demand fetch from CoinGecko
    if (candles.length === 0 || forceRefresh) {
      console.log(`[/api/market/ohlcv] No ${timeframe} candles for ${resolvedAddress}, fetching on-demand...`);

      const fetchedCandles = await fetchOHLCVOnDemand(resolvedAddress, timeframe, db);

      if (fetchedCandles > 0) {
        // Re-query after fetching
        candles = await db.priceCandle.findMany({
          where: { tokenAddress: resolvedAddress, timeframe },
          orderBy: { timestamp: 'desc' },
          take: limit,
        });
      }

      // If still no candles, try other timeframes
      if (candles.length === 0) {
        // Try to find ANY candles for this token
        const anyCandles = await db.priceCandle.findMany({
          where: { tokenAddress: resolvedAddress },
          orderBy: { timestamp: 'desc' },
          take: limit,
        });

        if (anyCandles.length > 0) {
          // Return candles from whatever timeframe is available
          const availableTF = anyCandles[0].timeframe;
          candles = await db.priceCandle.findMany({
            where: { tokenAddress: resolvedAddress, timeframe: availableTF },
            orderBy: { timestamp: 'desc' },
            take: limit,
          });

          const responseCandles = candles.map(c => ({
            timestamp: c.timestamp.getTime(),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
          }));
          responseCandles.reverse();

          return NextResponse.json({
            candles: responseCandles,
            timeframe: availableTF,
            source: 'database_fallback',
            count: responseCandles.length,
            requestedTimeframe: timeframe,
          });
        }
      }
    }

    const responseCandles = candles.map(c => ({
      timestamp: c.timestamp.getTime(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    // Reverse to chronological order
    responseCandles.reverse();

    return NextResponse.json({
      candles: responseCandles,
      timeframe,
      source: responseCandles.length > 0 ? 'database' : 'none',
      count: responseCandles.length,
    });
  } catch (error) {
    console.error('[/api/market/ohlcv] Failed:', error);
    return NextResponse.json(
      { candles: [], timeframe: '1h', source: 'none', error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    );
  }
}

/**
 * Fetch OHLCV data on-demand from CoinGecko and store in DB.
 * Returns the number of candles stored.
 */
async function fetchOHLCVOnDemand(
  tokenAddress: string,
  timeframe: string,
  db: any,
): Promise<number> {
  let totalStored = 0;

  try {
    const { coinGeckoClient } = await import('@/lib/services/coingecko-client');

    // Determine CoinGecko days parameter
    const days = TIMEFRAME_TO_DAYS[timeframe] || DEFAULT_DAYS[timeframe] || 7;

    // Look up the token to find its chain
    const token = await db.token.findFirst({
      where: { address: tokenAddress },
    });

    const chain = token?.chain || 'SOL';

    // Resolve CoinGecko coin ID from token address
    // Priority: coingecko: prefix > direct address > symbol search
    let coinId: string | null = null;

    // Case 1: Address is a CoinGecko synthetic ID (coingecko:xxx)
    if (tokenAddress.startsWith('coingecko:')) {
      coinId = tokenAddress.replace('coingecko:', '');
    }

    // Case 2: Try using the address directly as a CoinGecko ID
    if (!coinId) {
      try {
        const testOhlcv = await coinGeckoClient.getOHLCV(tokenAddress, 1);
        if (testOhlcv && testOhlcv.length > 0) {
          coinId = tokenAddress;
        }
      } catch { /* not a valid CoinGecko ID */ }
    }

    // Case 3: Try contract address lookup
    if (!coinId && token?.chain) {
      try {
        coinId = await coinGeckoClient.getCoinIdFromContract(chain, tokenAddress);
      } catch { /* contract lookup failed */ }
    }

    // Case 4: Search by symbol
    if (!coinId && token?.symbol) {
      try {
        const searchResults = await coinGeckoClient.searchTokens(token.symbol);
        const match = searchResults?.find(c =>
          c.symbol?.toUpperCase() === token.symbol.toUpperCase()
        );
        if (match?.id) {
          coinId = match.id;
        }
      } catch { /* search failed */ }
    }

    if (!coinId) {
      console.log(`[/api/market/ohlcv] Could not resolve CoinGecko ID for ${tokenAddress} (${token?.symbol})`);
      return 0;
    }

    let ohlcv: Array<{ timestamp: number; open: number; high: number; low: number; close: number }> = [];

    try {
      ohlcv = await coinGeckoClient.getOHLCV(coinId, days);
    } catch {
      // CoinGecko OHLCV fetch failed
    }

    if (ohlcv.length > 0) {
      // Determine the actual timeframe from CoinGecko response
      const cgTimeframe = coinGeckoClient.getOHLCVTimeframe(days);

      for (const candle of ohlcv) {
        try {
          await db.priceCandle.upsert({
            where: {
              tokenAddress_chain_timeframe_timestamp: {
                tokenAddress,
                chain,
                timeframe: cgTimeframe,
                timestamp: new Date(candle.timestamp),
              },
            },
            create: {
              tokenAddress,
              chain,
              timeframe: cgTimeframe,
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
          totalStored++;
        } catch { /* skip duplicates */ }
      }

      console.log(`[/api/market/ohlcv] Stored ${totalStored} ${cgTimeframe} candles for ${tokenAddress} from CoinGecko`);

      // If we got 4h candles but user wants 1d, also fetch daily
      if (cgTimeframe !== timeframe && timeframe === '1d') {
        try {
          const dailyOhlcv = await coinGeckoClient.getOHLCV(tokenAddress, 90);
          for (const candle of dailyOhlcv) {
            try {
              await db.priceCandle.upsert({
                where: {
                  tokenAddress_chain_timeframe_timestamp: {
                    tokenAddress,
                    chain,
                    timeframe: '1d',
                    timestamp: new Date(candle.timestamp),
                  },
                },
                create: {
                  tokenAddress,
                  chain,
                  timeframe: '1d',
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
              totalStored++;
            } catch { /* skip */ }
          }
        } catch { /* daily fetch failed */ }
      }
    }

    // If CoinGecko didn't work, try DexPaprika (for DEX tokens)
    if (totalStored === 0 && token?.pairAddress) {
      try {
        const { dexPaprikaClient } = await import('@/lib/services/dexpaprika-client');
        const chainNorm = token.chain === 'SOL' ? 'solana' :
          token.chain === 'ETH' ? 'ethereum' :
            token.chain === 'BASE' ? 'base' : token.chain.toLowerCase();

        const dpOhlcv = await dexPaprikaClient.getOHLCV(
          chainNorm,
          token.pairAddress,
          timeframe,
          200,
        );

        if (dpOhlcv.length > 0) {
          for (const candle of dpOhlcv) {
            try {
              await db.priceCandle.upsert({
                where: {
                  tokenAddress_chain_timeframe_timestamp: {
                    tokenAddress,
                    chain,
                    timeframe,
                    timestamp: new Date(candle.timestamp * 1000),
                  },
                },
                create: {
                  tokenAddress,
                  chain,
                  timeframe,
                  timestamp: new Date(candle.timestamp * 1000),
                  open: candle.open,
                  high: candle.high,
                  low: candle.low,
                  close: candle.close,
                  volume: candle.volume,
                  source: 'dexpaprika',
                },
                update: {
                  open: candle.open,
                  high: candle.high,
                  low: candle.low,
                  close: candle.close,
                  volume: candle.volume,
                },
              });
              totalStored++;
            } catch { /* skip */ }
          }
          console.log(`[/api/market/ohlcv] Stored ${totalStored} ${timeframe} candles from DexPaprika`);
        }
      } catch { /* DexPaprika OHLCV not available for this token */ }
    }

  } catch (err) {
    console.warn(`[/api/market/ohlcv] On-demand fetch failed for ${tokenAddress}:`, err);
  }

  return totalStored;
}
