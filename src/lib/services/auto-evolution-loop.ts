/**
 * Auto Evolution Loop - CryptoQuant Terminal
 *
 * Continuous evolution loop that:
 *   - Runs the evolution engine automatically on a schedule
 *   - After each backtest completes, if the strategy is good enough
 *     (sharpe > 0.5, winRate > 0.4), automatically starts paper trading
 *   - Monitors open positions and applies exit rules (TP, SL, trailing stop, time-based exit)
 *   - Records all state transitions via the strategy-state-manager
 *   - Runs on a configurable interval (default 5 minutes)
 *   - Can be started/stopped via the API
 */

import { strategyEvolutionEngine, DEFAULT_EVOLUTION_CONFIG, type EvolutionConfig } from './strategy-evolution-engine';
import { strategyStateManager } from './strategy-state-manager';
import { db } from '../db';

// ============================================================
// TYPES
// ============================================================

export interface AutoEvolutionConfig {
  /** Interval in milliseconds between evolution cycles (default: 5 minutes) */
  intervalMs: number;
  /** Evolution config for the strategy-evolution-engine */
  evolutionConfig: EvolutionConfig;
  /** Minimum Sharpe ratio to auto-activate a strategy for paper trading */
  minSharpeRatio: number;
  /** Minimum win rate to auto-activate a strategy for paper trading */
  minWinRate: number;
  /** Maximum number of concurrent paper trading positions */
  maxConcurrentPositions: number;
  /** Position size in USD for auto-trades */
  positionSizeUsd: number;
  /** Enable trailing stop monitoring */
  enableTrailingStop: boolean;
  /** Enable time-based exit monitoring */
  enableTimeBasedExit: boolean;
  /** Maximum hold time in minutes before time-based exit */
  maxHoldTimeMin: number;
}

export const DEFAULT_AUTO_EVOLUTION_CONFIG: AutoEvolutionConfig = {
  intervalMs: 5 * 60 * 1000, // 5 minutes
  evolutionConfig: DEFAULT_EVOLUTION_CONFIG,
  minSharpeRatio: 0.5,
  minWinRate: 0.4,
  maxConcurrentPositions: 5,
  positionSizeUsd: 100,
  enableTrailingStop: true,
  enableTimeBasedExit: true,
  maxHoldTimeMin: 1440, // 24 hours
};

export interface AutoEvolutionStatus {
  isRunning: boolean;
  cycleCount: number;
  lastCycleAt: Date | null;
  lastError: string | null;
  startedAt: Date | null;
  config: AutoEvolutionConfig;
  lastCycleResult: AutoEvolutionCycleResult | null;
  activeStrategies: string[];
  totalPaperTrades: number;
  totalExitsProcessed: number;
  totalEvolutions: number;
}

export interface AutoEvolutionCycleResult {
  cycleNumber: number;
  timestamp: Date;
  evolutionResult: {
    improved: number;
    degraded: number;
    totalMutations: number;
    bestScore: number;
  } | null;
  strategiesActivated: string[];
  entriesExecuted: string[];
  exitsProcessed: Array<{
    backtestId: string;
    exitReason: string;
    pnlUsd: number;
  }>;
  errors: string[];
}

// ============================================================
// AUTO EVOLUTION LOOP CLASS
// ============================================================

class AutoEvolutionLoop {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private cycleCount = 0;
  private lastCycleAt: Date | null = null;
  private lastError: string | null = null;
  private startedAt: Date | null = null;
  private config: AutoEvolutionConfig = { ...DEFAULT_AUTO_EVOLUTION_CONFIG };
  private lastCycleResult: AutoEvolutionCycleResult | null = null;
  private totalPaperTrades = 0;
  private totalExitsProcessed = 0;
  private totalEvolutions = 0;
  private activeStrategies: Set<string> = new Set();

  /**
   * Start the auto-evolution loop.
   */
  start(config?: Partial<AutoEvolutionConfig>): void {
    if (this.isRunning) {
      console.warn('[AutoEvolution] Already running, ignoring start request');
      return;
    }

    this.config = { ...DEFAULT_AUTO_EVOLUTION_CONFIG, ...config };
    this.isRunning = true;
    this.startedAt = new Date();
    this.cycleCount = 0;
    this.lastError = null;

    console.log(
      `[AutoEvolution] Starting loop with interval ${this.config.intervalMs / 1000}s, ` +
      `minSharpe=${this.config.minSharpeRatio}, minWinRate=${this.config.minWinRate}`
    );

    // Run the first cycle immediately
    this.runCycle().catch((err) => {
      console.error('[AutoEvolution] Error in initial cycle:', err);
      this.lastError = err instanceof Error ? err.message : String(err);
    });

    // Schedule subsequent cycles
    this.intervalHandle = setInterval(() => {
      this.runCycle().catch((err) => {
        console.error('[AutoEvolution] Error in scheduled cycle:', err);
        this.lastError = err instanceof Error ? err.message : String(err);
      });
    }, this.config.intervalMs);
  }

  /**
   * Stop the auto-evolution loop.
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('[AutoEvolution] Not running, ignoring stop request');
      return;
    }

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    this.isRunning = false;
    console.log(
      `[AutoEvolution] Stopped after ${this.cycleCount} cycles. ` +
      `Total: ${this.totalEvolutions} evolutions, ${this.totalPaperTrades} trades, ${this.totalExitsProcessed} exits`
    );
  }

  /**
   * Get the current status of the auto-evolution loop.
   */
  getStatus(): AutoEvolutionStatus {
    return {
      isRunning: this.isRunning,
      cycleCount: this.cycleCount,
      lastCycleAt: this.lastCycleAt,
      lastError: this.lastError,
      startedAt: this.startedAt,
      config: { ...this.config },
      lastCycleResult: this.lastCycleResult,
      activeStrategies: Array.from(this.activeStrategies),
      totalPaperTrades: this.totalPaperTrades,
      totalExitsProcessed: this.totalExitsProcessed,
      totalEvolutions: this.totalEvolutions,
    };
  }

  /**
   * Execute a single evolution cycle.
   * This is the main orchestration method that:
   *   1. Runs evolution on top strategies
   *   2. Auto-activates improved strategies in paper mode
   *   3. Monitors and closes positions that hit exit conditions
   *   4. Records all transitions
   */
  private async runCycle(): Promise<void> {
    const cycleResult: AutoEvolutionCycleResult = {
      cycleNumber: this.cycleCount + 1,
      timestamp: new Date(),
      evolutionResult: null,
      strategiesActivated: [],
      entriesExecuted: [],
      exitsProcessed: [],
      errors: [],
    };

    console.log(`[AutoEvolution] Starting cycle ${cycleResult.cycleNumber}`);

    try {
      // ============================================================
      // PHASE 1: Run Evolution on top strategies
      // ============================================================
      try {
        const evolutionResult = await strategyEvolutionEngine.runEvolution(
          this.config.evolutionConfig,
        );

        cycleResult.evolutionResult = {
          improved: evolutionResult.improved,
          degraded: evolutionResult.degraded,
          totalMutations: evolutionResult.totalMutations,
          bestScore: evolutionResult.bestScore,
        };

        this.totalEvolutions++;

        console.log(
          `[AutoEvolution] Evolution complete: ${evolutionResult.improved} improved, ` +
          `${evolutionResult.degraded} degraded out of ${evolutionResult.totalMutations} mutations`
        );

        // ============================================================
        // PHASE 2: Auto-activate improved strategies for paper trading
        // ============================================================
        if (evolutionResult.bestStrategy) {
          const best = evolutionResult.bestStrategy;

          // Check quality thresholds
          if (best.sharpeRatio >= this.config.minSharpeRatio && best.winRate >= this.config.minWinRate) {
            console.log(
              `[AutoEvolution] Best strategy qualifies for paper trading: ` +
              `sharpe=${best.sharpeRatio.toFixed(2)}, winRate=${best.winRate.toFixed(2)}, score=${best.score.toFixed(1)}`
            );

            try {
              const activated = await this.activateStrategyForPaperTrading(best.systemId, best);
              if (activated) {
                cycleResult.strategiesActivated.push(best.systemId);
                this.activeStrategies.add(best.systemId);

                // Record state transition
                await strategyStateManager.recordStateTransition({
                  systemId: best.systemId,
                  newStatus: 'PAPER_TRADING',
                  triggerReason: 'AUTO_EVOLVE',
                  metrics: {
                    sharpeRatio: best.sharpeRatio,
                    winRate: best.winRate,
                    totalPnlPct: best.pnlPct,
                    totalTrades: best.totalTrades,
                  },
                  evolution: {
                    generation: best.generation,
                    parentId: best.parentId,
                    improvementPct: best.improvement,
                  },
                  metadata: {
                    event: 'auto_evolution_activation',
                    cycleNumber: cycleResult.cycleNumber,
                    score: best.score,
                    mutations: best.mutations,
                  },
                });
              }

              // Auto-execute an entry trade if strategy was activated
              if (activated && this.activeStrategies.size <= this.config.maxConcurrentPositions) {
                const entryResult = await this.autoExecuteEntry(best.systemId, best.backtestId);
                if (entryResult) {
                  cycleResult.entriesExecuted.push(entryResult);
                  this.totalPaperTrades++;
                }
              }
            } catch (err) {
              const errMsg = `Failed to activate strategy ${best.systemId}: ${err instanceof Error ? err.message : String(err)}`;
              cycleResult.errors.push(errMsg);
              console.error(`[AutoEvolution] ${errMsg}`);
            }
          } else {
            console.log(
              `[AutoEvolution] Best strategy does not meet thresholds: ` +
              `sharpe=${best.sharpeRatio.toFixed(2)} (need ${this.config.minSharpeRatio}), ` +
              `winRate=${best.winRate.toFixed(2)} (need ${this.config.minWinRate})`
            );
          }
        }

        // Also activate any other improved strategies that meet thresholds
        const otherImproved = evolutionResult.allStrategies.filter(
          (s) =>
            s.status === 'improved' &&
            s.sharpeRatio >= this.config.minSharpeRatio &&
            s.winRate >= this.config.minWinRate &&
            s.systemId !== evolutionResult.bestStrategy?.systemId,
        );

        for (const strategy of otherImproved) {
          if (this.activeStrategies.size >= this.config.maxConcurrentPositions) break;

          try {
            const activated = await this.activateStrategyForPaperTrading(strategy.systemId, strategy);
            if (activated) {
              cycleResult.strategiesActivated.push(strategy.systemId);
              this.activeStrategies.add(strategy.systemId);

              await strategyStateManager.recordStateTransition({
                systemId: strategy.systemId,
                newStatus: 'PAPER_TRADING',
                triggerReason: 'AUTO_EVOLVE',
                metrics: {
                  sharpeRatio: strategy.sharpeRatio,
                  winRate: strategy.winRate,
                  totalPnlPct: strategy.pnlPct,
                  totalTrades: strategy.totalTrades,
                },
                evolution: {
                  generation: strategy.generation,
                  parentId: strategy.parentId,
                  improvementPct: strategy.improvement,
                },
                metadata: {
                  event: 'auto_evolution_activation',
                  cycleNumber: cycleResult.cycleNumber,
                  score: strategy.score,
                },
              });

              const entryResult = await this.autoExecuteEntry(strategy.systemId, strategy.backtestId);
              if (entryResult) {
                cycleResult.entriesExecuted.push(entryResult);
                this.totalPaperTrades++;
              }
            }
          } catch (err) {
            const errMsg = `Failed to activate strategy ${strategy.systemId}: ${err instanceof Error ? err.message : String(err)}`;
            cycleResult.errors.push(errMsg);
            console.error(`[AutoEvolution] ${errMsg}`);
          }
        }
      } catch (err) {
        const errMsg = `Evolution engine error: ${err instanceof Error ? err.message : String(err)}`;
        cycleResult.errors.push(errMsg);
        console.error(`[AutoEvolution] ${errMsg}`);
      }

      // ============================================================
      // PHASE 3: Monitor and close positions that hit exit conditions
      // ============================================================
      try {
        const exitResults = await this.monitorAndExitPositions();
        cycleResult.exitsProcessed = exitResults;
        this.totalExitsProcessed += exitResults.length;

        // Remove strategies with closed positions from active set
        for (const exit of exitResults) {
          // The strategy might still be active with other positions
          // Check if there are any remaining open positions for this strategy
          const remainingPositions = await this.getOpenPositionCountForStrategy(exit.backtestId);
          if (remainingPositions === 0) {
            // No more open positions - don't remove from active yet,
            // the strategy can still open new positions in future cycles
          }
        }
      } catch (err) {
        const errMsg = `Position monitoring error: ${err instanceof Error ? err.message : String(err)}`;
        cycleResult.errors.push(errMsg);
        console.error(`[AutoEvolution] ${errMsg}`);
      }

      // ============================================================
      // PHASE 4: Clean up stale active strategies
      // ============================================================
      await this.cleanupStaleActiveStrategies();
    } catch (err) {
      const errMsg = `Cycle error: ${err instanceof Error ? err.message : String(err)}`;
      cycleResult.errors.push(errMsg);
      this.lastError = errMsg;
      console.error(`[AutoEvolution] ${errMsg}`);
    }

    // Update cycle tracking
    this.cycleCount++;
    this.lastCycleAt = new Date();
    this.lastCycleResult = cycleResult;

    console.log(
      `[AutoEvolution] Cycle ${cycleResult.cycleNumber} complete: ` +
      `${cycleResult.strategiesActivated.length} activated, ` +
      `${cycleResult.entriesExecuted.length} entries, ` +
      `${cycleResult.exitsProcessed.length} exits, ` +
      `${cycleResult.errors.length} errors`
    );
  }

  /**
   * Activate a strategy for paper trading by updating the TradingSystem record.
   */
  private async activateStrategyForPaperTrading(
    systemId: string,
    strategy: { name: string; score: number },
  ): Promise<boolean> {
    try {
      const system = await db.tradingSystem.findUnique({ where: { id: systemId } });
      if (!system) {
        console.warn(`[AutoEvolution] System ${systemId} not found, skipping activation`);
        return false;
      }

      // Already active in paper trading
      if (system.isActive && system.isPaperTrading) {
        console.log(`[AutoEvolution] System ${system.name} already active in paper trading`);
        return true;
      }

      await db.tradingSystem.update({
        where: { id: systemId },
        data: { isActive: true, isPaperTrading: true },
      });

      console.log(`[AutoEvolution] Activated ${strategy.name} (score: ${strategy.score.toFixed(1)}) for paper trading`);
      return true;
    } catch (err) {
      console.error(`[AutoEvolution] Failed to activate ${systemId}:`, err);
      return false;
    }
  }

  /**
   * Auto-execute a paper trade entry for a strategy.
   * Uses the best token from the backtest operations.
   */
  private async autoExecuteEntry(
    systemId: string,
    backtestId: string,
  ): Promise<string | null> {
    try {
      // Check current open positions count
      const openPositions = await strategyEvolutionEngine.getOpenPositions();
      if (openPositions.length >= this.config.maxConcurrentPositions) {
        console.log(`[AutoEvolution] Max concurrent positions reached (${openPositions.length}/${this.config.maxConcurrentPositions})`);
        return null;
      }

      // Find a token from the backtest operations to trade
      const backtestOp = await db.backtestOperation.findFirst({
        where: { backtestId, pnlUsd: { not: null } },
        orderBy: { pnlUsd: 'desc' },
      });

      if (!backtestOp) {
        console.log(`[AutoEvolution] No backtest operations found for ${backtestId}, trying any recent op`);
        // Try any token from the system
        const anyOp = await db.backtestOperation.findFirst({
          where: { systemId, exitPrice: { not: null } },
          orderBy: { entryTime: 'desc' },
        });

        if (!anyOp) {
          console.log(`[AutoEvolution] No suitable tokens found for entry`);
          return null;
        }

        // Get current price from the token table
        const token = await db.token.findFirst({
          where: { address: anyOp.tokenAddress },
          select: { priceUsd: true, symbol: true },
        });

        const entryPrice = token?.priceUsd || anyOp.entryPrice || 0.001;
        const tokenSymbol = token?.symbol || anyOp.tokenSymbol || '';

        const result = await strategyEvolutionEngine.executeEntry({
          systemId,
          tokenAddress: anyOp.tokenAddress,
          tokenSymbol,
          direction: 'LONG',
          entryPrice,
          positionSizeUsd: this.config.positionSizeUsd,
        });

        console.log(`[AutoEvolution] Auto-executed entry: tradeId=${result.tradeId}`);
        return result.tradeId;
      }

      // Use the best performing token from the backtest
      const token = await db.token.findFirst({
        where: { address: backtestOp.tokenAddress },
        select: { priceUsd: true, symbol: true },
      });

      const entryPrice = token?.priceUsd || backtestOp.entryPrice || 0.001;
      const tokenSymbol = token?.symbol || backtestOp.tokenSymbol || '';

      const result = await strategyEvolutionEngine.executeEntry({
        systemId,
        tokenAddress: backtestOp.tokenAddress,
        tokenSymbol,
        direction: 'LONG',
        entryPrice,
        positionSizeUsd: this.config.positionSizeUsd,
      });

      // Record state transition
      await strategyStateManager.recordStateTransition({
        systemId,
        newStatus: 'PAPER_TRADING',
        triggerReason: 'SCHEDULER',
        metadata: {
          event: 'auto_entry_executed',
          tradeId: result.tradeId,
          tokenAddress: backtestOp.tokenAddress,
          tokenSymbol,
          entryPrice,
          positionSizeUsd: this.config.positionSizeUsd,
        },
      });

      console.log(`[AutoEvolution] Auto-executed entry: tradeId=${result.tradeId}`);
      return result.tradeId;
    } catch (err) {
      console.error(`[AutoEvolution] Auto-execute entry failed:`, err);
      return null;
    }
  }

  /**
   * Monitor open positions and apply exit rules.
   * Checks for:
   *   - Take Profit (TP)
   *   - Stop Loss (SL)
   *   - Trailing Stop
   *   - Time-based Exit
   */
  private async monitorAndExitPositions(): Promise<
    Array<{ backtestId: string; exitReason: string; pnlUsd: number }>
  > {
    const results: Array<{ backtestId: string; exitReason: string; pnlUsd: number }> = [];

    try {
      const openPositions = await strategyEvolutionEngine.getOpenPositions();

      if (openPositions.length === 0) {
        return results;
      }

      for (const position of openPositions) {
        try {
          // Get the current token price
          const token = await db.token.findFirst({
            where: { address: position.tokenAddress },
            select: { priceUsd: true },
          });

          const currentPrice = token?.priceUsd;
          if (!currentPrice || currentPrice <= 0) {
            // No price data available, skip this position
            continue;
          }

          // Get the strategy's exit configuration
          const system = await db.tradingSystem.findUnique({
            where: { id: position.systemId },
          });

          if (!system) continue;

          // Parse exit config
          let exitConfig: Record<string, unknown> = {};
          try {
            exitConfig = JSON.parse(system.exitSignal || '{}');
          } catch {
            /* ignore */
          }

          const takeProfitPct = (exitConfig.takeProfit as number) || system.takeProfitPct || 40;
          const stopLossPct = (exitConfig.stopLoss as number) || system.stopLossPct || 15;
          const trailingStopPct = (exitConfig.trailingStopPercent as number) || system.trailingStopPct || 25;
          const timeBasedExitMin = (exitConfig.timeBasedExit as number) || 1440;

          const entryPrice = position.entryPrice;
          const holdTimeMin = (Date.now() - position.entryTime.getTime()) / 60000;
          const priceChangePct = ((currentPrice - entryPrice) / entryPrice) * 100;

          let shouldExit = false;
          let exitReason = '';

          // Check Take Profit
          if (priceChangePct >= takeProfitPct) {
            shouldExit = true;
            exitReason = 'TAKE_PROFIT';
          }

          // Check Stop Loss
          if (priceChangePct <= -stopLossPct) {
            shouldExit = true;
            exitReason = 'STOP_LOSS';
          }

          // Check Trailing Stop
          if (this.config.enableTrailingStop && !shouldExit) {
            // Get the max favorable excursion (highest price since entry)
            const operations = await db.backtestOperation.findMany({
              where: {
                backtestId: position.backtestId,
                exitPrice: null,
              },
            });

            // Calculate MFE from the operation's maxFavorableExc if available
            for (const op of operations) {
              const mfe = op.maxFavorableExc || 0;
              if (mfe > 0) {
                // If price has retraced from peak by more than trailingStopPct
                const retracementFromPeak = mfe - priceChangePct;
                if (retracementFromPeak >= trailingStopPct && priceChangePct > 0) {
                  shouldExit = true;
                  exitReason = 'TRAILING_STOP';
                  break;
                }
              }
            }
          }

          // Check Time-based Exit
          if (this.config.enableTimeBasedExit && !shouldExit) {
            if (holdTimeMin >= timeBasedExitMin) {
              shouldExit = true;
              exitReason = 'TIME_BASED_EXIT';
            }
          }

          // Execute exit if triggered
          if (shouldExit) {
            console.log(
              `[AutoEvolution] Exit triggered for ${position.tokenSymbol}: ` +
              `${exitReason} (price change: ${priceChangePct.toFixed(2)}%, hold: ${holdTimeMin.toFixed(0)}min)`
            );

            try {
              const exitResult = await strategyEvolutionEngine.executeExit({
                backtestId: position.backtestId,
                exitPrice: currentPrice,
                exitReason,
              });

              results.push({
                backtestId: position.backtestId,
                exitReason,
                pnlUsd: exitResult.pnlUsd,
              });

              // Record state transition
              await strategyStateManager.recordStateTransition({
                systemId: position.systemId,
                newStatus: 'IDLE',
                triggerReason: 'SCHEDULER',
                metrics: {
                  totalPnlUsd: exitResult.pnlUsd,
                  totalPnlPct: exitResult.pnlPct,
                  openPositions: 0,
                },
                metadata: {
                  event: 'auto_exit_executed',
                  exitReason,
                  tokenSymbol: position.tokenSymbol,
                  pnlUsd: exitResult.pnlUsd,
                  pnlPct: exitResult.pnlPct,
                  holdTimeMin,
                  priceChangePct,
                },
              });
            } catch (err) {
              console.error(
                `[AutoEvolution] Failed to execute exit for ${position.backtestId}:`,
                err,
              );
            }
          }
        } catch (err) {
          console.error(
            `[AutoEvolution] Error monitoring position ${position.backtestId}:`,
            err,
          );
        }
      }
    } catch (err) {
      console.error('[AutoEvolution] Error in position monitoring:', err);
    }

    return results;
  }

  /**
   * Get the count of open positions for a specific backtest ID's system.
   */
  private async getOpenPositionCountForStrategy(backtestId: string): Promise<number> {
    try {
      const operation = await db.backtestOperation.findFirst({
        where: { backtestId },
        select: { systemId: true },
      });

      if (!operation) return 0;

      const openCount = await db.backtestOperation.count({
        where: {
          systemId: operation.systemId,
          exitPrice: null,
          backtest: { mode: 'PAPER' },
        },
      });

      return openCount;
    } catch {
      return 0;
    }
  }

  /**
   * Clean up strategies that are no longer active from the active set.
   */
  private async cleanupStaleActiveStrategies(): Promise<void> {
    const toRemove: string[] = [];

    for (const systemId of this.activeStrategies) {
      try {
        const system = await db.tradingSystem.findUnique({
          where: { id: systemId },
          select: { isActive: true, isPaperTrading: true },
        });

        if (!system || (!system.isActive && !system.isPaperTrading)) {
          toRemove.push(systemId);
        }
      } catch {
        toRemove.push(systemId);
      }
    }

    for (const systemId of toRemove) {
      this.activeStrategies.delete(systemId);
    }
  }
}

// Singleton
export const autoEvolutionLoop = new AutoEvolutionLoop();
