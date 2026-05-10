import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/paper-trading/positions
 */
export async function GET() {
  try {
    const ptModule = await import('@/lib/services/paper-trading-engine');
    const paperTradingEngine = ptModule.paperTradingEngine;
    const positions = paperTradingEngine.getOpenPositions();
    return NextResponse.json({
      data: positions.map(p => ({
        id: p.id,
        tokenAddress: p.tokenAddress,
        symbol: p.symbol,
        chain: p.chain,
        direction: p.direction,
        entryTime: p.entryTime,
        entryPrice: p.entryPrice,
        currentPrice: p.currentPrice,
        positionSizeUsd: p.positionSizeUsd,
        unrealizedPnl: p.unrealizedPnl,
        unrealizedPnlPct: p.unrealizedPnlPct,
        highWaterMark: p.highWaterMark,
        systemName: p.systemName,
        exitConditions: p.exitConditions,
      })),
    });
  } catch (error) {
    console.error('Error getting paper positions:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to get positions' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/paper-trading/positions
 * Force close a paper trading position.
 *
 * Body params:
 * - positionId: string (required)
 * - reason: string (optional, default: 'manual_close')
 */
export async function DELETE(request: NextRequest) {
  try {
    const ptModule = await import('@/lib/services/paper-trading-engine');
    const paperTradingEngine = ptModule.paperTradingEngine;
    const body = await request.json();
    const { positionId, reason } = body as { positionId?: string; reason?: string };

    if (!positionId) {
      return NextResponse.json(
        { data: null, error: 'positionId is required' },
        { status: 400 },
      );
    }

    const closedTrade = await paperTradingEngine.forceClosePosition(
      positionId,
      reason || 'manual_close',
    );

    if (!closedTrade) {
      return NextResponse.json(
        { data: null, error: 'Position not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: {
        id: closedTrade.id,
        tokenAddress: closedTrade.position.tokenAddress,
        symbol: closedTrade.position.symbol,
        exitPrice: closedTrade.exitPrice,
        exitReason: closedTrade.exitReason,
        pnl: closedTrade.pnl,
        pnlPct: closedTrade.pnlPct,
        holdTimeMin: closedTrade.holdTimeMin,
      },
    });
  } catch (error) {
    console.error('Error closing paper position:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to close position' },
      { status: 500 },
    );
  }
}
