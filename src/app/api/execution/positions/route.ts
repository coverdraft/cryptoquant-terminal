import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/execution/positions
 *
 * Dedicated endpoint for fetching open (active) positions.
 */
export async function GET() {
  try {
    const { strategyEvolutionEngine } = await import('@/lib/services/strategy-evolution-engine');
    const positions = await strategyEvolutionEngine.getOpenPositions();

    return NextResponse.json({
      data: positions.map(pos => ({
        backtestId: pos.backtestId,
        systemId: pos.systemId,
        systemName: pos.systemName,
        tokenAddress: pos.tokenAddress,
        tokenSymbol: pos.tokenSymbol,
        direction: pos.direction,
        entryPrice: pos.entryPrice,
        entryTime: pos.entryTime,
        positionSizeUsd: pos.positionSizeUsd,
        quantity: pos.quantity,
        unrealizedPnl: pos.unrealizedPnl,
      })),
      total: positions.length,
    });
  } catch (error) {
    console.error('[Execution Positions API] Error:', error);
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to fetch open positions' },
      { status: 500 },
    );
  }
}
