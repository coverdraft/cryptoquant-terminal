import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/backtest
 * POST /api/backtest
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get('systemId');
    const mode = searchParams.get('mode');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};

    if (systemId) where.systemId = systemId;
    if (mode) where.mode = mode;
    if (status) where.status = status;

    const backtests = await db.backtestRun.findMany({
      where,
      include: {
        system: {
          select: { id: true, name: true, category: true, icon: true },
        },
        _count: {
          select: { operations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = backtests.map((bt) => ({
      id: bt.id,
      systemId: bt.systemId,
      systemName: bt.system.name,
      systemCategory: bt.system.category,
      systemIcon: bt.system.icon,
      mode: bt.mode,
      periodStart: bt.periodStart,
      periodEnd: bt.periodEnd,
      initialCapital: bt.initialCapital,
      allocationMethod: bt.allocationMethod,
      status: bt.status,
      progress: bt.progress,
      totalPnl: bt.totalPnl,
      totalPnlPct: bt.totalPnlPct,
      sharpeRatio: bt.sharpeRatio,
      winRate: bt.winRate,
      maxDrawdownPct: bt.maxDrawdownPct,
      totalTrades: bt.totalTrades,
      operationCount: bt._count.operations,
      startedAt: bt.startedAt,
      completedAt: bt.completedAt,
      createdAt: bt.createdAt,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error listing backtests:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to list backtests' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { systemId, mode, periodStart, periodEnd, initialCapital, allocationMethod } = body as {
      systemId?: string; mode?: string; periodStart?: string;
      periodEnd?: string; initialCapital?: number; allocationMethod?: string;
    };

    if (!systemId) {
      return NextResponse.json({ data: null, error: 'systemId is required' }, { status: 400 });
    }

    const system = await db.tradingSystem.findUnique({ where: { id: systemId } });
    if (!system) {
      return NextResponse.json({ data: null, error: 'Trading system not found' }, { status: 404 });
    }

    const validModes = ['HISTORICAL', 'PAPER', 'FORWARD'];
    const backtestMode = validModes.includes(mode || '') ? mode! : 'HISTORICAL';
    const start = periodStart ? new Date(periodStart) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = periodEnd ? new Date(periodEnd) : new Date();

    if (start >= end) {
      return NextResponse.json({ data: null, error: 'periodStart must be before periodEnd' }, { status: 400 });
    }

    const capital = initialCapital && initialCapital > 0 ? initialCapital : 10000;
    const allocMethod = allocationMethod || system.allocationMethod || 'KELLY_MODIFIED';

    const backtest = await db.backtestRun.create({
      data: {
        systemId, mode: backtestMode, periodStart: start, periodEnd: end,
        initialCapital: capital, allocationMethod: allocMethod,
        capitalAllocation: JSON.stringify({ method: allocMethod, initialCapital: capital }),
        status: 'PENDING', progress: 0,
      },
    });

    return NextResponse.json({ data: backtest }, { status: 201 });
  } catch (error) {
    console.error('Error creating backtest:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to create backtest' },
      { status: 500 },
    );
  }
}
