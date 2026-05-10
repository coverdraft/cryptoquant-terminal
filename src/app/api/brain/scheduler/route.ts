import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory scheduler state
const schedulerState = {
  status: 'STOPPED' as 'STOPPED' | 'RUNNING' | 'PAUSED',
  startedAt: null as Date | null,
  config: { capitalUsd: 10, initialCapitalUsd: 10, chain: 'SOL', scanLimit: 50 },
  lastSyncAt: null as Date | null,
  tokensSynced: 0,
  cyclesCompleted: 0,
  lastCycleResult: null as any,
  cycleTimer: null as ReturnType<typeof setInterval> | null,
};

/**
 * Run a single brain cycle using the enhanced pipeline
 */
async function runCycle() {
  try {
    const { runBrainCycle } = await import('@/lib/services/brain-pipeline');
    const result = await runBrainCycle({
      capitalUsd: schedulerState.config.capitalUsd,
      chain: schedulerState.config.chain,
      scanLimit: schedulerState.config.scanLimit,
      enableDexScreener: true,
      enableSignals: true,
      enablePatterns: true,
      enableOHLCV: true,
    });

    schedulerState.cyclesCompleted++;
    schedulerState.lastSyncAt = new Date();
    schedulerState.lastCycleResult = result;

    // Update capital based on cycle result
    if (result.status === 'COMPLETED') {
      schedulerState.config.capitalUsd = result.capitalAfterUsd;
    }

    console.log(`[Scheduler] Cycle #${schedulerState.cyclesCompleted} ${result.status}: ${result.tokensScanned} tokens, ${result.signalsGenerated} signals`);
  } catch (err) {
    console.error('[Scheduler] Cycle error:', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try { body = await request.json(); } catch { /* no body */ }

    const { action, params } = body;

    switch (action) {
      case 'start': {
        if (schedulerState.status === 'RUNNING') {
          return NextResponse.json({ success: true, data: { started: false, message: 'Already running' } });
        }

        schedulerState.status = 'RUNNING';
        schedulerState.startedAt = new Date();
        if (params?.capitalUsd) schedulerState.config.capitalUsd = Number(params.capitalUsd);
        if (params?.initialCapitalUsd) schedulerState.config.initialCapitalUsd = Number(params.initialCapitalUsd);
        if (params?.chain) schedulerState.config.chain = params.chain;
        if (params?.scanLimit) schedulerState.config.scanLimit = Number(params.scanLimit);

        // Start periodic cycle (every 5 minutes)
        if (schedulerState.cycleTimer) clearInterval(schedulerState.cycleTimer);

        // Run first cycle immediately
        runCycle().catch(err => console.error('[Scheduler] Initial cycle error:', err));

        // Then every 5 minutes
        schedulerState.cycleTimer = setInterval(() => {
          if (schedulerState.status === 'RUNNING') {
            runCycle().catch(err => console.error('[Scheduler] Cycle error:', err));
          }
        }, 5 * 60 * 1000);

        return NextResponse.json({
          success: true,
          data: {
            started: true,
            message: `Brain started with $${schedulerState.config.capitalUsd}, cycles every 5 min`,
            config: schedulerState.config,
          },
        });
      }
      case 'stop': {
        schedulerState.status = 'STOPPED';
        if (schedulerState.cycleTimer) {
          clearInterval(schedulerState.cycleTimer);
          schedulerState.cycleTimer = null;
        }
        return NextResponse.json({ success: true, data: { stopped: true, cyclesCompleted: schedulerState.cyclesCompleted } });
      }
      case 'pause': {
        schedulerState.status = 'PAUSED';
        return NextResponse.json({ success: true, data: { paused: true } });
      }
      case 'resume': {
        schedulerState.status = 'RUNNING';
        return NextResponse.json({ success: true, data: { resumed: true } });
      }
      case 'run_cycle': {
        // Manual cycle trigger
        await runCycle();
        return NextResponse.json({
          success: true,
          data: {
            cycleCompleted: true,
            lastResult: {
              tokensScanned: schedulerState.lastCycleResult?.tokensScanned ?? 0,
              signalsGenerated: schedulerState.lastCycleResult?.signalsGenerated ?? 0,
              signalBreakdown: schedulerState.lastCycleResult?.signalBreakdown ?? {},
            },
          },
        });
      }
      case 'update_config': {
        if (params?.capitalUsd) schedulerState.config.capitalUsd = Number(params.capitalUsd);
        if (params?.chain) schedulerState.config.chain = params.chain;
        if (params?.scanLimit) schedulerState.config.scanLimit = Number(params.scanLimit);
        return NextResponse.json({ success: true, data: { message: 'Config updated', config: schedulerState.config } });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { db } = await import('@/lib/db');

    const [tokens, candles, signals, predictiveSignals] = await Promise.all([
      db.token.count().catch(() => 0),
      db.priceCandle.count().catch(() => 0),
      db.signal.count().catch(() => 0),
      db.predictiveSignal.count().catch(() => 0),
    ]);

    // Signal type breakdown
    const oneHourAgo = new Date(Date.now() - 3600000);
    const [smartMoneySignals, rugPullSignals, vShapeSignals, liquidityTrapSignals, patternSignals] = await Promise.all([
      db.signal.count({ where: { type: 'SMART_MONEY', createdAt: { gte: oneHourAgo } } }).catch(() => 0),
      db.signal.count({ where: { type: 'RUG_PULL', createdAt: { gte: oneHourAgo } } }).catch(() => 0),
      db.signal.count({ where: { type: 'V_SHAPE', createdAt: { gte: oneHourAgo } } }).catch(() => 0),
      db.signal.count({ where: { type: 'LIQUIDITY_TRAP', createdAt: { gte: oneHourAgo } } }).catch(() => 0),
      db.signal.count({ where: { type: 'PATTERN', createdAt: { gte: oneHourAgo } } }).catch(() => 0),
    ]);

    // Token with real liquidity
    const tokensWithLiquidity = await db.token.count({
      where: { liquidity: { gt: 0 } },
    }).catch(() => 0);

    return NextResponse.json({
      success: true,
      data: {
        status: schedulerState.status,
        uptime: schedulerState.startedAt ? Date.now() - schedulerState.startedAt.getTime() : 0,
        config: schedulerState.config,
        lastSyncAt: schedulerState.lastSyncAt,
        tokensSynced: schedulerState.tokensSynced,
        cyclesCompleted: schedulerState.cyclesCompleted,
        lastCycleResult: schedulerState.lastCycleResult ? {
          tokensScanned: schedulerState.lastCycleResult.tokensScanned,
          tokensEnriched: schedulerState.lastCycleResult.tokensEnriched,
          tokensOperable: schedulerState.lastCycleResult.tokensOperable,
          signalsGenerated: schedulerState.lastCycleResult.signalsGenerated,
          signalBreakdown: schedulerState.lastCycleResult.signalBreakdown,
          candlesStored: schedulerState.lastCycleResult.candlesStored,
          status: schedulerState.lastCycleResult.status,
        } : null,
        dbStats: {
          tokens,
          candles,
          signals,
          predictiveSignals,
          tokensWithLiquidity,
          signalBreakdown: {
            smartMoney: smartMoneySignals,
            rugPull: rugPullSignals,
            vShape: vShapeSignals,
            liquidityTrap: liquidityTrapSignals,
            patterns: patternSignals,
          },
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
