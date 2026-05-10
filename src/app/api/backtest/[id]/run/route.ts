import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/backtest/[id]/run
 * Execute the backtest simulation with REAL data from the OHLCV pipeline.
 *
 * FLOW:
 * 1. Fetch backtest config from DB
 * 2. Load real TokenData from PriceCandle DB via BacktestDataBridge
 * 3. Build BacktestConfig from system template + DB record
 * 4. Run the BacktestingEngine simulation with REAL data
 * 5. Update the BacktestRun record with results
 * 6. Create BacktestOperation records for each simulated trade
 * 7. Update trading system metrics
 */
export async function POST(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const dbModule = await import('@/lib/db');
    const db = dbModule.db;
    const bteModule = await import('@/lib/services/backtesting-engine');
    const backtestingEngine = bteModule.backtestingEngine;
    const tseModule = await import('@/lib/services/trading-system-engine');
    const tradingSystemEngine = tseModule.tradingSystemEngine;
    const bdbModule = await import('@/lib/services/backtest-data-bridge');
    const backtestDataBridge = bdbModule.backtestDataBridge;
    type BacktestConfig = import('@/lib/services/backtesting-engine').BacktestConfig;

    const { id } = await context.params;

    // Fetch backtest run
    const backtest = await db.backtestRun.findUnique({
      where: { id },
      include: { system: true },
    });

    if (!backtest) {
      return NextResponse.json(
        { data: null, error: 'Backtest not found' },
        { status: 404 },
      );
    }

    // Check if already running or completed
    if (backtest.status === 'RUNNING') {
      return NextResponse.json(
        { data: null, error: 'Backtest is already running' },
        { status: 409 },
      );
    }

    if (backtest.status === 'COMPLETED') {
      return NextResponse.json(
        { data: null, error: 'Backtest already completed. Delete and recreate to run again.' },
        { status: 409 },
      );
    }

    // Mark as running
    await db.backtestRun.update({
      where: { id },
      data: {
        status: 'RUNNING',
        progress: 0.05,
        startedAt: new Date(),
      },
    });

    try {
      // Build system template from DB record or use engine template
      const systemTemplate = tradingSystemEngine.getTemplate(backtest.system.name) ??
        tradingSystemEngine.createSystemFromTemplate(
          tradingSystemEngine.getAllTemplateNames()[0],
          {
            name: backtest.system.name,
            category: backtest.system.category as 'ALPHA_HUNTER',
          },
        );

      // === LOAD REAL DATA FROM PriceCandle DB ===
      // This was the critical fix — previously passed empty []
      const tokenData = await backtestDataBridge.loadTokensForBacktest({
        startDate: backtest.periodStart,
        endDate: backtest.periodEnd,
        timeframe: systemTemplate.primaryTimeframe,
        chain: backtest.system.primaryTimeframe ? undefined : 'SOL',
        minCandles: 20,
        assetFilter: systemTemplate.assetFilter,
        maxTokens: 10,
        includeMetrics: true,
      });

      // Update progress after data load
      await db.backtestRun.update({
        where: { id },
        data: { progress: 0.2 },
      });

      if (tokenData.length === 0) {
        // No data available — still complete but with zero trades
        await db.backtestRun.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            progress: 1,
            completedAt: new Date(),
            finalCapital: backtest.initialCapital,
            totalPnl: 0,
            totalPnlPct: 0,
            errorLog: 'No token data available for backtesting. Run OHLCV backfill first.',
          },
        });

        return NextResponse.json({
          data: {
            id,
            status: 'COMPLETED',
            totalTrades: 0,
            message: 'No token data available. Run OHLCV backfill first via /api/brain/scheduler or the OHLCV pipeline.',
            tokensAvailable: 0,
          },
        });
      }

      // Build BacktestConfig
      const btConfig: BacktestConfig = {
        system: systemTemplate,
        mode: (backtest.mode as 'HISTORICAL' | 'PAPER' | 'FORWARD') || 'HISTORICAL',
        startDate: backtest.periodStart,
        endDate: backtest.periodEnd,
        initialCapital: backtest.initialCapital,
        feesPct: 0.003,
        slippagePct: 0.5,
        applySlippage: true,
        enforcePhaseFilter: true,
      };

      // Update progress
      await db.backtestRun.update({
        where: { id },
        data: { progress: 0.3 },
      });

      // Run the backtest simulation with REAL data
      const result = await backtestingEngine.runBacktest(
        btConfig,
        tokenData,
        async (progress) => {
          // Update progress periodically
          if (progress.barsProcessed % 500 === 0) {
            try {
              await db.backtestRun.update({
                where: { id },
                data: {
                  progress: Math.min(0.9, 0.3 + progress.percentComplete * 0.006),
                },
              });
            } catch {
              // Progress update failures are non-critical
            }
          }
        },
      );

      // Update progress
      await db.backtestRun.update({
        where: { id },
        data: { progress: 0.9 },
      });

      // Create BacktestOperation records for each trade
      const operationCreates = result.trades.map((trade) => ({
        backtestId: id,
        systemId: backtest.systemId,
        tokenAddress: trade.tokenAddress,
        tokenSymbol: trade.symbol,
        chain: 'solana',
        tokenPhase: trade.phase,
        tokenAgeMinutes: 0,
        marketConditions: JSON.stringify({ timeframe: systemTemplate.primaryTimeframe }),
        tokenDnaSnapshot: JSON.stringify({}),
        traderComposition: JSON.stringify({}),
        bigDataContext: JSON.stringify({}),
        operationType: trade.direction,
        timeframe: systemTemplate.primaryTimeframe,
        entryPrice: trade.entryPrice,
        entryTime: trade.entryTime,
        entryReason: JSON.stringify({ reason: 'backtest_simulation', system: systemTemplate.name }),
        exitPrice: trade.exitPrice ?? 0,
        exitTime: trade.exitTime ?? new Date(),
        exitReason: trade.exitReason,
        quantity: trade.quantity,
        positionSizeUsd: trade.size,
        pnlUsd: trade.pnl,
        pnlPct: trade.pnlPct,
        holdTimeMin: trade.holdTimeMin,
        maxFavorableExc: trade.mfe,
        maxAdverseExc: trade.mae,
        capitalAllocPct: trade.size / backtest.initialCapital * 100,
        allocationMethodUsed: systemTemplate.allocationMethod,
      }));

      // Batch create operations
      if (operationCreates.length > 0) {
        await db.backtestOperation.createMany({
          data: operationCreates,
        });
      }

      // Update the backtest run with results
      const updatedBacktest = await db.backtestRun.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          progress: 1,
          completedAt: new Date(),
          finalCapital: result.finalEquity,
          totalPnl: result.finalEquity - result.initialCapital,
          totalPnlPct: result.totalReturnPct,
          annualizedReturn: result.annualizedReturnPct,
          benchmarkReturn: 0,
          alpha: result.annualizedReturnPct,
          totalTrades: result.totalTrades,
          winTrades: result.winningTrades,
          lossTrades: result.losingTrades,
          winRate: result.winRate,
          avgWin: result.avgWinPct,
          avgLoss: result.avgLossPct,
          profitFactor: result.profitFactor,
          expectancy: result.expectancy,
          maxDrawdown: result.maxDrawdown,
          maxDrawdownPct: result.maxDrawdownPct,
          sharpeRatio: result.sharpeRatio,
          sortinoRatio: result.sortinoRatio,
          calmarRatio: result.calmarRatio,
          recoveryFactor: result.recoveryFactor,
          avgHoldTimeMin: result.avgHoldTimeMin,
          marketExposurePct: 0,
          phaseResults: JSON.stringify(result.phaseBreakdown),
          timeframeResults: JSON.stringify({ primaryTimeframe: systemTemplate.primaryTimeframe }),
          operationTypeResults: JSON.stringify({}),
          allocationMethodResults: JSON.stringify({ method: systemTemplate.allocationMethod }),
        },
      });

      // Update trading system metrics with best results
      const system = await db.tradingSystem.findUnique({
        where: { id: backtest.systemId },
      });

      if (system) {
        const metricsUpdate: Record<string, unknown> = {
          totalBacktests: system.totalBacktests + 1,
        };

        if (result.sharpeRatio > system.bestSharpe) {
          metricsUpdate.bestSharpe = result.sharpeRatio;
        }
        if (result.winRate > system.bestWinRate) {
          metricsUpdate.bestWinRate = result.winRate;
        }
        if (result.totalReturnPct > system.bestPnlPct) {
          metricsUpdate.bestPnlPct = result.totalReturnPct;
        }

        // Update average hold time
        if (system.totalBacktests === 0) {
          metricsUpdate.avgHoldTimeMin = result.avgHoldTimeMin;
        } else {
          metricsUpdate.avgHoldTimeMin =
            (system.avgHoldTimeMin * system.totalBacktests + result.avgHoldTimeMin) /
            (system.totalBacktests + 1);
        }

        await db.tradingSystem.update({
          where: { id: backtest.systemId },
          data: metricsUpdate,
        });
      }

      return NextResponse.json({
        data: {
          id: updatedBacktest.id,
          status: updatedBacktest.status,
          totalTrades: result.totalTrades,
          winRate: result.winRate,
          sharpeRatio: result.sharpeRatio,
          totalPnlPct: result.totalReturnPct,
          maxDrawdownPct: result.maxDrawdownPct,
          profitFactor: result.profitFactor,
          finalCapital: result.finalEquity,
          operationCount: operationCreates.length,
          tokensAnalyzed: tokenData.length,
          overfittingScore: result.overfittingScore,
          parameterStability: result.parameterStability,
        },
      });
    } catch (simError) {
      // Mark as failed
      await db.backtestRun.update({
        where: { id },
        data: {
          status: 'FAILED',
          errorLog: simError instanceof Error ? simError.message : 'Unknown simulation error',
          completedAt: new Date(),
        },
      });

      throw simError;
    }
  } catch (error) {
    console.error('Error running backtest:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to run backtest' },
      { status: 500 },
    );
  }
}
