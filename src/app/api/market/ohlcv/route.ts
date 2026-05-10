import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/market/ohlcv
 * Returns OHLCV candle data from the database.
 * Lightweight - only queries DB, no heavy pipeline imports.
 */
export async function GET(request: NextRequest) {
  try {
    const { db } = await import('@/lib/db');
    
    const searchParams = request.nextUrl.searchParams;
    const tokenAddress = searchParams.get('tokenAddress') || '';
    const timeframe = searchParams.get('timeframe') || '1h';
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 1000);

    if (!tokenAddress) {
      return NextResponse.json(
        { candles: [], timeframe, source: 'none', error: 'tokenAddress is required' },
        { status: 400 },
      );
    }

    // Query candles from DB directly
    const candles = await db.priceCandle.findMany({
      where: { tokenAddress, timeframe },
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
