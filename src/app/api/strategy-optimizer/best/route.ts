import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================
// Best Strategies - persisted to JSON file
// ============================================================

interface BestStrategyEntry {
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
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'best-strategies.json');

// In-memory cache, loaded from file on first access
let bestStrategies: BestStrategyEntry[] | null = null;

async function loadStrategies(): Promise<BestStrategyEntry[]> {
  if (bestStrategies !== null) return bestStrategies;

  try {
    if (existsSync(DATA_FILE)) {
      const raw = await readFile(DATA_FILE, 'utf-8');
      bestStrategies = JSON.parse(raw) as BestStrategyEntry[];
    } else {
      bestStrategies = [];
    }
  } catch {
    bestStrategies = [];
  }

  return bestStrategies;
}

async function saveStrategies(strategies: BestStrategyEntry[]): Promise<void> {
  bestStrategies = strategies;
  try {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
    await writeFile(DATA_FILE, JSON.stringify(strategies, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error persisting best strategies to file:', error);
  }
}

/**
 * GET /api/strategy-optimizer/best
 * Returns saved best strategies
 */
export async function GET() {
  try {
    const strategies = await loadStrategies();
    return NextResponse.json({
      data: strategies.sort((a, b) => b.score - a.score),
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

    const strategies = await loadStrategies();

    // Check if already saved
    const existingIndex = strategies.findIndex(
      s => s.backtestId === strategy.backtestId
    );

    const entry: BestStrategyEntry = {
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
      strategies[existingIndex] = entry;
    } else {
      strategies.push(entry);
    }

    await saveStrategies(strategies);

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

    const strategies = await loadStrategies();
    const initialLength = strategies.length;
    const filtered = strategies.filter(
      s => (id && s.id !== id) && (backtestId && s.backtestId !== backtestId)
    );
    const removed = initialLength - filtered.length;

    await saveStrategies(filtered);

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
