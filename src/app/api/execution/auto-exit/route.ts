import { NextRequest, NextResponse } from 'next/server';
import { strategyEvolutionEngine } from '@/lib/services/strategy-evolution-engine';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/execution/auto-exit
// Close an open paper trade position.
//
// Body params:
//   backtestId: string   - The backtest run ID (paper trade container)
//   exitPrice?: number   - Exit price (optional, fetches from token DB if missing)
//   exitReason?: string  - Reason for exit (default: 'auto_exit')
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { backtestId, exitPrice, exitReason } = body as {
      backtestId: string;
      exitPrice?: number;
      exitReason?: string;
    };

    if (!backtestId) {
      return NextResponse.json(
        { data: null, error: 'backtestId is required' },
        { status: 400 },
      );
    }

    // Resolve exit price from the open position's token if not provided
    let resolvedExitPrice = exitPrice || 0;

    if (resolvedExitPrice === 0) {
      // Find the open operation to get the token address
      const operation = await db.backtestOperation.findFirst({
        where: { backtestId, exitPrice: null },
        orderBy: { entryTime: 'desc' },
      });

      if (operation) {
        const token = await db.token.findFirst({
          where: { address: operation.tokenAddress },
          select: { priceUsd: true, symbol: true },
        });
        if (token) {
          resolvedExitPrice = token.priceUsd || operation.entryPrice;
        } else {
          resolvedExitPrice = operation.entryPrice; // Fallback to entry price
        }
      }
    }

    if (resolvedExitPrice === 0) {
      return NextResponse.json(
        { data: null, error: 'Cannot determine exit price. Provide exitPrice or ensure the position has a valid token.' },
        { status: 400 },
      );
    }

    const reason = exitReason || 'auto_exit';

    console.log(
      `[AutoExit] Executing exit: backtest=${backtestId} price=$${resolvedExitPrice} reason=${reason}`
    );

    const result = await strategyEvolutionEngine.executeExit({
      backtestId,
      exitPrice: resolvedExitPrice,
      exitReason: reason,
    });

    return NextResponse.json({
      data: {
        backtestId,
        exitPrice: resolvedExitPrice,
        exitReason: reason,
        pnlUsd: result.pnlUsd,
        pnlPct: result.pnlPct,
        status: result.status,
        message: `Exit executed: PnL ${result.pnlUsd >= 0 ? '+' : ''}$${result.pnlUsd.toFixed(2)} (${result.pnlPct >= 0 ? '+' : ''}${result.pnlPct.toFixed(2)}%)`,
      },
    });
  } catch (error) {
    console.error('[AutoExit] Error:', error);
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Auto-exit execution failed' },
      { status: 500 },
    );
  }
}
