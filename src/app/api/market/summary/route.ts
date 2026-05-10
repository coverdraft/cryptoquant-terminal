import { NextResponse } from 'next/server';
import { getMarketSummary } from '@/lib/services/coingecko-client';

/**
 * GET /api/market/summary
 *
 * Returns real-time market summary from CoinGecko:
 *   - BTC/ETH/SOL prices
 *   - Total market cap & 24h volume
 *   - BTC/ETH dominance
 *   - Fear & Greed Index
 *
 * Cached for 30 seconds on the server side.
 */
export async function GET() {
  try {
    const summary = await getMarketSummary();

    // If we have no data at all, return error
    if (summary.btcPrice === 0 && summary.lastUpdated === 0) {
      return NextResponse.json(
        { data: null, error: 'Market data unavailable', source: 'fallback' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      data: summary,
      error: null,
      source: summary.lastUpdated > 0 ? 'live' : 'cache',
    });
  } catch (error) {
    console.error('[/api/market/summary] Error:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to fetch market summary', source: 'fallback' },
      { status: 500 }
    );
  }
}
