import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/paper-trading/trades
 */
export async function GET() {
  try {
    const ptModule = await import('@/lib/services/paper-trading-engine');
    const paperTradingEngine = ptModule.paperTradingEngine;
    const trades = paperTradingEngine.getTradeHistory();
    return NextResponse.json({
      data: trades.map(t => ({
        id: t.id,
        tokenAddress: t.position.tokenAddress,
        symbol: t.position.symbol,
        chain: t.position.chain,
        direction: t.position.direction,
        entryTime: t.position.entryTime,
        exitTime: t.exitTime,
        entryPrice: t.position.entryPrice,
        exitPrice: t.exitPrice,
        positionSizeUsd: t.position.positionSizeUsd,
        pnl: t.pnl,
        pnlPct: t.pnlPct,
        holdTimeMin: t.holdTimeMin,
        mfe: t.mfe,
        mae: t.mae,
        exitReason: t.exitReason,
        systemName: t.position.systemName,
      })),
      total: trades.length,
    });
  } catch (error) {
    console.error('Error getting paper trades:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to get trade history' },
      { status: 500 },
    );
  }
}
