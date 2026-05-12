import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================
// Best Strategies - stored in-memory with localStorage sync
// In a production app this would be a DB table, but per the spec
// we use a simple approach for now.
// ============================================================

// In-memory store (persists per server session)
let bestStrategies: Array<{
  id: string;
  strategyName: string;
  category: string;
  timeframe: string;
  tokenAgeCategory: string;
  riskTolerance: string;
  capitalAllocation: number;
  pnlPct: number;
  pnlUsd: number;
  sharpeRatio: number;
  winRate: number;
  maxDrawdownPct: number;
  profitFactor: number;
  totalTrades: number;
  avgHoldTimeMin: number;
  score: number;
  backtestId: string;
  savedAt: string;
}> = [];

/**
 * GET /api/strategy-optimizer/best
 * Returns saved best strategies
 */
export async function GET() {
  try {
    return NextResponse.json({
      data: bestStrategies.sort((a, b) => b.score - a.score),
    });
  } catch (error) {
    console.error('Error fetching best strategies:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to fetch best strategies' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/strategy-optimizer/best
 * Save a strategy as "best"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const strategy = body.strategy as Record<string, unknown>;

    if (!strategy || !strategy.strategyName) {
      return NextResponse.json(
        { data: null, error: 'Strategy data is required' },
        { status: 400 },
      );
    }

    // Check if already saved
    const existingIndex = bestStrategies.findIndex(
      s => s.backtestId === strategy.backtestId
    );

    const entry = {
      id: (strategy.id as string) || `best-${Date.now()}`,
      strategyName: strategy.strategyName as string,
      category: (strategy.category as string) || 'UNKNOWN',
      timeframe: (strategy.timeframe as string) || '1h',
      tokenAgeCategory: (strategy.tokenAgeCategory as string) || 'UNKNOWN',
      riskTolerance: (strategy.riskTolerance as string) || 'MODERATE',
      capitalAllocation: Number(strategy.capitalAllocation) || 0,
      pnlPct: Number(strategy.pnlPct) || 0,
      pnlUsd: Number(strategy.pnlUsd) || 0,
      sharpeRatio: Number(strategy.sharpeRatio) || 0,
      winRate: Number(strategy.winRate) || 0,
      maxDrawdownPct: Number(strategy.maxDrawdownPct) || 0,
      profitFactor: Number(strategy.profitFactor) || 0,
      totalTrades: Number(strategy.totalTrades) || 0,
      avgHoldTimeMin: Number(strategy.avgHoldTimeMin) || 0,
      score: Number(strategy.score) || 0,
      backtestId: (strategy.backtestId as string) || '',
      savedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      bestStrategies[existingIndex] = entry;
    } else {
      bestStrategies.push(entry);
    }

    return NextResponse.json({
      data: entry,
      message: existingIndex >= 0 ? 'Strategy updated' : 'Strategy saved to Hall of Fame',
    });
  } catch (error) {
    console.error('Error saving best strategy:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to save best strategy' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/strategy-optimizer/best
 * Remove a strategy from the best list
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body as { id?: string };
    const { backtestId } = body as { backtestId?: string };

    if (!id && !backtestId) {
      return NextResponse.json(
        { data: null, error: 'Strategy id or backtestId is required' },
        { status: 400 },
      );
    }

    const initialLength = bestStrategies.length;
    bestStrategies = bestStrategies.filter(
      s => (id && s.id !== id) && (backtestId && s.backtestId !== backtestId)
    );

    const removed = initialLength - bestStrategies.length;

    return NextResponse.json({
      data: { removed },
      message: removed > 0 ? 'Strategy removed from Hall of Fame' : 'Strategy not found',
    });
  } catch (error) {
    console.error('Error deleting best strategy:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to delete best strategy' },
      { status: 500 },
    );
  }
}
