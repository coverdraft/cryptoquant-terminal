import { NextRequest, NextResponse } from 'next/server';
import {
  autoEvolutionLoop,
  DEFAULT_AUTO_EVOLUTION_CONFIG,
  type AutoEvolutionConfig,
} from '@/lib/services/auto-evolution-loop';
import { DEFAULT_EVOLUTION_CONFIG, type EvolutionConfig } from '@/lib/services/strategy-evolution-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/auto-evolution
// Control the auto-evolution loop.
//
// Actions:
//   - "start": Begin the auto-evolution loop
//   - "stop": Stop the auto-evolution loop
//
// Body params (for "start"):
//   intervalMs?: number           - Interval between cycles (default: 300000 = 5 min)
//   minSharpeRatio?: number       - Minimum Sharpe ratio to auto-activate (default: 0.5)
//   minWinRate?: number           - Minimum win rate to auto-activate (default: 0.4)
//   maxConcurrentPositions?: number - Max concurrent paper positions (default: 5)
//   positionSizeUsd?: number      - Position size for auto-trades (default: 100)
//   enableTrailingStop?: boolean  - Enable trailing stop monitoring (default: true)
//   enableTimeBasedExit?: boolean - Enable time-based exit (default: true)
//   maxHoldTimeMin?: number       - Max hold time in minutes (default: 1440)
//   evolutionConfig?: object      - Override evolution engine config
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === 'start') {
      // Build the auto-evolution config from the request
      const evolutionConfig: EvolutionConfig = {
        maxIterations: body.evolutionConfig?.maxIterations ?? DEFAULT_EVOLUTION_CONFIG.maxIterations,
        improvementThreshold: body.evolutionConfig?.improvementThreshold ?? DEFAULT_EVOLUTION_CONFIG.improvementThreshold,
        mutationRate: body.evolutionConfig?.mutationRate ?? DEFAULT_EVOLUTION_CONFIG.mutationRate,
        topN: body.evolutionConfig?.topN ?? DEFAULT_EVOLUTION_CONFIG.topN,
        capital: body.evolutionConfig?.capital ?? DEFAULT_EVOLUTION_CONFIG.capital,
      };

      const config: Partial<AutoEvolutionConfig> = {
        intervalMs: Number(body.intervalMs) || DEFAULT_AUTO_EVOLUTION_CONFIG.intervalMs,
        evolutionConfig,
        minSharpeRatio: Number(body.minSharpeRatio) || DEFAULT_AUTO_EVOLUTION_CONFIG.minSharpeRatio,
        minWinRate: Number(body.minWinRate) || DEFAULT_AUTO_EVOLUTION_CONFIG.minWinRate,
        maxConcurrentPositions: Number(body.maxConcurrentPositions) || DEFAULT_AUTO_EVOLUTION_CONFIG.maxConcurrentPositions,
        positionSizeUsd: Number(body.positionSizeUsd) || DEFAULT_AUTO_EVOLUTION_CONFIG.positionSizeUsd,
        enableTrailingStop: body.enableTrailingStop !== false,
        enableTimeBasedExit: body.enableTimeBasedExit !== false,
        maxHoldTimeMin: Number(body.maxHoldTimeMin) || DEFAULT_AUTO_EVOLUTION_CONFIG.maxHoldTimeMin,
      };

      autoEvolutionLoop.start(config);

      return NextResponse.json({
        data: {
          status: 'started',
          message: `Auto-evolution loop started with interval ${config.intervalMs! / 1000}s`,
          config,
        },
      });
    }

    if (action === 'stop') {
      autoEvolutionLoop.stop();

      return NextResponse.json({
        data: {
          status: 'stopped',
          message: 'Auto-evolution loop stopped',
        },
      });
    }

    return NextResponse.json(
      { data: null, error: `Unknown action: ${action}. Valid actions: start, stop` },
      { status: 400 },
    );
  } catch (error) {
    console.error('[AutoEvolution API] Error:', error);
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Auto-evolution API failed' },
      { status: 500 },
    );
  }
}

// ============================================================
// GET /api/auto-evolution
// Get the current status of the auto-evolution loop.
// ============================================================

export async function GET() {
  try {
    const status = autoEvolutionLoop.getStatus();

    return NextResponse.json({
      data: {
        isRunning: status.isRunning,
        cycleCount: status.cycleCount,
        lastCycleAt: status.lastCycleAt,
        lastError: status.lastError,
        startedAt: status.startedAt,
        config: {
          intervalMs: status.config.intervalMs,
          minSharpeRatio: status.config.minSharpeRatio,
          minWinRate: status.config.minWinRate,
          maxConcurrentPositions: status.config.maxConcurrentPositions,
          positionSizeUsd: status.config.positionSizeUsd,
          enableTrailingStop: status.config.enableTrailingStop,
          enableTimeBasedExit: status.config.enableTimeBasedExit,
          maxHoldTimeMin: status.config.maxHoldTimeMin,
        },
        activeStrategies: status.activeStrategies,
        totalPaperTrades: status.totalPaperTrades,
        totalExitsProcessed: status.totalExitsProcessed,
        totalEvolutions: status.totalEvolutions,
        lastCycleResult: status.lastCycleResult
          ? {
              cycleNumber: status.lastCycleResult.cycleNumber,
              timestamp: status.lastCycleResult.timestamp,
              evolutionResult: status.lastCycleResult.evolutionResult,
              strategiesActivated: status.lastCycleResult.strategiesActivated,
              entriesExecuted: status.lastCycleResult.entriesExecuted,
              exitsProcessed: status.lastCycleResult.exitsProcessed,
              errors: status.lastCycleResult.errors,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('[AutoEvolution API] GET error:', error);
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to get auto-evolution status' },
      { status: 500 },
    );
  }
}
