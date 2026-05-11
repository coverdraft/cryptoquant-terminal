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
 * Data sources: CoinGecko + DexScreener (NO Birdeye)
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
    const timeframe = searchParams.get('timeframe') || '4h';
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 1000);
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!tokenAddress) {
      return NextResponse.json(
        { candles: [], timeframe, source: 'none', error: 'tokenAddress is required' },
        { status: 400 },
      );
    }

    // Query candles from DB directly
    let candles = await db.priceCandle.findMany({
      where: { tokenAddress, timeframe },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    // If no candles found (or force refresh), try on-demand fetch from CoinGecko
    if (candles.length === 0 || forceRefresh) {
      console.log(`[/api/market/ohlcv] No ${timeframe} candles for ${tokenAddress}, fetching on-demand...`);

      const fetchedCandles = await fetchOHLCVOnDemand(tokenAddress, timeframe, db);

      if (fetchedCandles > 0) {
        // Re-query after fetching
        candles = await db.priceCandle.findMany({
          where: { tokenAddress, timeframe },
          orderBy: { timestamp: 'desc' },
          take: limit,
        });
      }

      // If still no candles, try other timeframes
      if (candles.length === 0) {
        // Try to find ANY candles for this token
        const anyCandles = await db.priceCandle.findMany({
          where: { tokenAddress },
          orderBy: { timestamp: 'desc' },
          take: limit,
        });

        if (anyCandles.length > 0) {
          // Return candles from whatever timeframe is available
          const availableTF = anyCandles[0].timeframe;
          candles = await db.priceCandle.findMany({
            where: { tokenAddress, timeframe: availableTF },
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

    // Try CoinGecko OHLCV (tokenAddress is often the CoinGecko coinId)
    let ohlcv: Array<{ timestamp: number; open: number; high: number; low: number; close: number }> = [];

    try {
      ohlcv = await coinGeckoClient.getOHLCV(tokenAddress, days);
    } catch {
      // If direct coinId fails, try searching for the token
      if (token?.symbol) {
        try {
          const searchResults = await coinGeckoClient.searchTokens(token.symbol);
          const match = searchResults?.find(c =>
            c.symbol?.toUpperCase() === token.symbol.toUpperCase()
          );
          if (match?.id) {
            ohlcv = await coinGeckoClient.getOHLCV(match.id, days);
          }
        } catch { /* search failed */ }
      }
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
