import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/brain/scheduler
 * Returns current scheduler status from the brainScheduler singleton.
 * Also loads persisted state from DB if scheduler is not running.
 */
export async function GET() {
  try {
    const { brainScheduler } = await import('@/lib/services/brain-scheduler');
    const { db } = await import('@/lib/db');

    // Get in-memory status from the singleton
    const status = brainScheduler.getStatus();

    // Also fetch persisted state for additional info (e.g., stoppedAt, previous runs)
    const persistedState = await db.schedulerState.findUnique({ where: { id: 'main' } }).catch(() => null);

    // DB stats
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
        // From brainScheduler singleton (in-memory)
        status: status.status,
        uptime: status.uptime,
        config: status.config,
        tasks: status.tasks,
        brainCycle: status.brainCycle,
        capitalStrategy: status.capitalStrategy,
        totalCyclesCompleted: status.totalCyclesCompleted,
        lastError: status.lastError,

        // From persisted state (survives restarts)
        persisted: persistedState ? {
          startedAt: persistedState.startedAt,
          stoppedAt: persistedState.stoppedAt,
          totalCycles: persistedState.totalCycles,
          lastCycleNumber: persistedState.lastCycleNumber,
          capitalUsd: persistedState.capitalUsd,
          initialCapitalUsd: persistedState.initialCapitalUsd,
          chain: persistedState.chain,
          scanLimit: persistedState.scanLimit,
          lastError: persistedState.lastError,
          updatedAt: persistedState.updatedAt,
        } : null,

        // DB stats
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

/**
 * POST /api/brain/scheduler
 * Controls the brain scheduler: start, stop, pause, resume, run_cycle, update_config
 *
 * Body: { action: string, params?: object }
 */
export async function POST(request: NextRequest) {
  try {
    const { brainScheduler } = await import('@/lib/services/brain-scheduler');

    let body: any = {};
    try { body = await request.json(); } catch { /* no body */ }

    const { action, params } = body;

    switch (action) {
      case 'start': {
        const config: any = {};
        if (params?.capitalUsd) config.capitalUsd = Number(params.capitalUsd);
        if (params?.initialCapitalUsd) config.initialCapitalUsd = Number(params.initialCapitalUsd);
        if (params?.chain) config.chain = params.chain;
        if (params?.scanLimit) config.scanLimit = Number(params.scanLimit);

        const result = await brainScheduler.start(
          Object.keys(config).length > 0 ? config : undefined
        );

        return NextResponse.json({
          success: true,
          data: result,
        });
      }
      case 'stop': {
        const result = await brainScheduler.stop();
        return NextResponse.json({ success: true, data: result });
      }
      case 'pause': {
        const result = brainScheduler.pause();
        // Persist the paused state
        return NextResponse.json({ success: true, data: result });
      }
      case 'resume': {
        const result = brainScheduler.resume();
        return NextResponse.json({ success: true, data: result });
      }
      case 'run_cycle': {
        // Manual cycle trigger
        const result = await brainScheduler.runManualCycle();
        return NextResponse.json({ success: true, data: result });
      }
      case 'update_config': {
        const updates: any = {};
        if (params?.capitalUsd) updates.capitalUsd = Number(params.capitalUsd);
        if (params?.chain) updates.chain = params.chain;
        if (params?.scanLimit) updates.scanLimit = Number(params.scanLimit);
        brainScheduler.updateConfig(updates);
        return NextResponse.json({
          success: true,
          data: { message: 'Config updated', config: brainScheduler.getConfig() },
        });
      }
      case 'auto_start': {
        // Check if scheduler was previously running and auto-start it
        const previousState = await brainScheduler.getPreviousState();
        if (previousState.wasRunning && previousState.config) {
          const result = await brainScheduler.start(previousState.config);
          return NextResponse.json({
            success: true,
            data: {
              autoStarted: true,
              ...result,
              previousState: {
                startedAt: previousState.state?.startedAt,
                totalCycles: previousState.state?.totalCycles,
                capitalUsd: previousState.state?.capitalUsd,
              },
            },
          });
        }
        return NextResponse.json({
          success: true,
          data: { autoStarted: false, message: 'Scheduler was not previously running' },
        });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
