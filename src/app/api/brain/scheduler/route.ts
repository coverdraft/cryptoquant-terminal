import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lightweight in-memory scheduler state
const schedulerState = {
  status: 'STOPPED' as 'STOPPED' | 'RUNNING' | 'PAUSED',
  startedAt: null as Date | null,
  config: { capitalUsd: 10, initialCapitalUsd: 10, chain: 'SOL', scanLimit: 20 },
  lastSyncAt: null as Date | null,
  tokensSynced: 50,
  cyclesCompleted: 1,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, params } = body;

    switch (action) {
      case 'start': {
        schedulerState.status = 'RUNNING';
        schedulerState.startedAt = new Date();
        if (params?.capitalUsd) schedulerState.config.capitalUsd = Number(params.capitalUsd);
        if (params?.chain) schedulerState.config.chain = params.chain;
        if (params?.scanLimit) schedulerState.config.scanLimit = Number(params.scanLimit);
        return NextResponse.json({ success: true, data: { started: true, message: `Brain started with $${schedulerState.config.capitalUsd}` } });
      }
      case 'stop': { schedulerState.status = 'STOPPED'; return NextResponse.json({ success: true, data: { stopped: true } }); }
      case 'pause': { schedulerState.status = 'PAUSED'; return NextResponse.json({ success: true, data: { paused: true } }); }
      case 'resume': { schedulerState.status = 'RUNNING'; return NextResponse.json({ success: true, data: { resumed: true } }); }
      case 'update_config': {
        if (params?.capitalUsd) schedulerState.config.capitalUsd = Number(params.capitalUsd);
        if (params?.chain) schedulerState.config.chain = params.chain;
        return NextResponse.json({ success: true, data: { message: 'Config updated' } });
      }
      default: return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { db } = await import('@/lib/db');
    const [tokens, candles, signals] = await Promise.all([
      db.token.count().catch(() => 0),
      db.priceCandle.count().catch(() => 0),
      db.signal.count().catch(() => 0),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        status: schedulerState.status,
        uptime: schedulerState.startedAt ? Date.now() - schedulerState.startedAt.getTime() : 0,
        config: schedulerState.config,
        lastSyncAt: schedulerState.lastSyncAt,
        tokensSynced: schedulerState.tokensSynced,
        cyclesCompleted: schedulerState.cyclesCompleted,
        dbStats: { tokens, candles, signals },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
