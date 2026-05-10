/**
 * Paper Trading Engine - CryptoQuant Terminal
 * 
 * Real-time simulation using the Brain's actual signals.
 * No real money at risk — validates the brain's live decision-making.
 * 
 * Paper Trading Cycle:
 * 1. SCAN: Brain analyzes tokens in real-time
 * 2. FILTER: Only operable tokens pass
 * 3. SIGNAL: Brain generates entry/exit signals
 * 4. EXECUTE: Simulate order at current market price + slippage
 * 5. TRACK: Monitor open positions, apply SL/TP/trailing
 * 6. EXIT: Close positions when exit conditions met
 * 7. RECORD: Store all trades for analysis
 * 
 * Paper trades feed back into the Feedback Loop Engine,
 * validating whether the brain's signals actually work in real-time.
 */

import { analyzeToken, type TokenAnalysis } from './brain-orchestrator';
import { tradingSystemEngine, type SystemTemplate } from './trading-system-engine';
import { capitalStrategyManager } from './capital-strategy-manager';
import { calculateOperabilityScore, type OperabilityInput } from './operability-score';
import { feedbackLoopEngine } from './feedback-loop-engine';

// ============================================================
// TYPES
// ============================================================

export type PaperTradingStatus = 'STOPPED' | 'RUNNING' | 'PAUSED';

export interface PaperTradingConfig {
  /** Initial virtual capital in USD */
  initialCapital: number;
  /** Chain to scan */
  chain: string;
  /** Trading system template to use */
  systemName: string;
  /** Scan interval in ms (default: 60000 = 1 min) */
  scanIntervalMs: number;
  /** Maximum open positions */
  maxOpenPositions: number;
  /** Simulated fee pct (default: 0.003) */
  feesPct: number;
  /** Simulated slippage pct (default: 0.5) */
  slippagePct: number;
  /** Minimum operability score to trade (default: 50) */
  minOperabilityScore: number;
  /** Auto-validate signals against feedback loop (default: true) */
  autoFeedback: boolean;
}

export interface PaperPosition {
  id: string;
  tokenAddress: string;
  symbol: string;
  chain: string;
  direction: 'LONG' | 'SHORT';
  entryTime: Date;
  entryPrice: number;
  quantity: number;
  positionSizeUsd: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  highWaterMark: number; // for trailing stop
  exitConditions: string[]; // conditions that will trigger exit
  systemName: string;
  brainAnalysis: TokenAnalysis; // snapshot of brain analysis at entry
}

export interface PaperTradeRecord {
  id: string;
  position: PaperPosition;
  exitTime: Date;
  exitPrice: number;
  exitReason: string;
  pnl: number;
  pnlPct: number;
  holdTimeMin: number;
  mfe: number; // max favorable excursion
  mae: number; // max adverse excursion
}

export interface PaperTradingStats {
  status: PaperTradingStatus;
  startedAt: Date | null;
  uptimeMs: number;
  currentCapital: number;
  initialCapital: number;
  totalReturnPct: number;
  openPositions: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgPnlPct: number;
  unrealizedPnl: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  lastScanAt: Date | null;
  tokensScanned: number;
  signalsGenerated: number;
}

// ============================================================
// DEFAULT CONFIG
// ============================================================

const DEFAULT_PAPER_CONFIG: PaperTradingConfig = {
  initialCapital: 10,
  chain: 'SOL',
  systemName: 'Smart Entry Mirror',
  scanIntervalMs: 60000,
  maxOpenPositions: 3,
  feesPct: 0.003,
  slippagePct: 0.5,
  minOperabilityScore: 50,
  autoFeedback: true,
};

// ============================================================
// PAPER TRADING ENGINE
// ============================================================

class PaperTradingEngine {
  private config: PaperTradingConfig = { ...DEFAULT_PAPER_CONFIG };
  private status: PaperTradingStatus = 'STOPPED';
  private startedAt: Date | null = null;
  private pausedAt: Date | null = null;
  private lastScanAt: Date | null = null;

  // In-memory state
  private positions: Map<string, PaperPosition> = new Map();
  private tradeHistory: PaperTradeRecord[] = [];
  private currentCapital: number = 0;
  private peakCapital: number = 0;

  // Cumulative counters
  private totalTokensScanned: number = 0;
  private totalSignalsGenerated: number = 0;

  // Timer reference
  private scanTimer: ReturnType<typeof setInterval> | null = null;

  // Unique ID counter
  private idCounter: number = 0;

  // ============================================================
  // 1. START
  // ============================================================

  async start(config: Partial<PaperTradingConfig>): Promise<{ started: boolean; message: string }> {
    if (this.status === 'RUNNING') {
      return { started: false, message: 'Paper trading is already running' };
    }

    // Merge config with defaults
    this.config = { ...DEFAULT_PAPER_CONFIG, ...config };

    // Validate system template exists
    const system = tradingSystemEngine.getTemplate(this.config.systemName);
    if (!system) {
      return {
        started: false,
        message: `System template "${this.config.systemName}" not found. Available: ${tradingSystemEngine.getTemplates().map(t => t.name).join(', ')}`,
      };
    }

    // Reset state
    this.positions.clear();
    this.tradeHistory = [];
    this.currentCapital = this.config.initialCapital;
    this.peakCapital = this.config.initialCapital;
    this.totalTokensScanned = 0;
    this.totalSignalsGenerated = 0;
    this.idCounter = 0;
    this.startedAt = new Date();
    this.lastScanAt = null;
    this.pausedAt = null;

    // Set status
    this.status = 'RUNNING';

    // Start the scan loop
    this.startScanLoop();

    return {
      started: true,
      message: `Paper trading started with $${this.config.initialCapital} on ${this.config.chain} using "${this.config.systemName}". Scan interval: ${this.config.scanIntervalMs / 1000}s`,
    };
  }

  // ============================================================
  // 2. STOP
  // ============================================================

  async stop(): Promise<{ stopped: boolean; message: string }> {
    if (this.status === 'STOPPED') {
      return { stopped: false, message: 'Paper trading is already stopped' };
    }

    // Stop the timer
    this.stopScanLoop();

    // Close all open positions at current prices
    const openPositionIds = Array.from(this.positions.keys());
    let closedCount = 0;
    for (const id of openPositionIds) {
      const record = await this.forceClosePosition(id, 'ENGINE_STOPPED');
      if (record) closedCount++;
    }

    const stats = this.getStatus();
    this.status = 'STOPPED';

    return {
      stopped: true,
      message: `Paper trading stopped. Closed ${closedCount} open positions. Final capital: $${stats.currentCapital.toFixed(2)} (${stats.totalReturnPct >= 0 ? '+' : ''}${stats.totalReturnPct.toFixed(2)}%). Total trades: ${stats.totalTrades}, Win rate: ${(stats.winRate * 100).toFixed(1)}%`,
    };
  }

  // ============================================================
  // 3. PAUSE / RESUME
  // ============================================================

  pause(): void {
    if (this.status !== 'RUNNING') return;
    this.status = 'PAUSED';
    this.pausedAt = new Date();
    this.stopScanLoop();
  }

  resume(): void {
    if (this.status !== 'PAUSED') return;
    this.status = 'RUNNING';
    this.pausedAt = null;
    this.startScanLoop();
  }

  // ============================================================
  // 4. GET STATUS
  // ============================================================

  getStatus(): PaperTradingStats {
    const now = new Date();
    const uptimeMs = this.startedAt ? now.getTime() - this.startedAt.getTime() : 0;

    // Calculate unrealized PnL from open positions
    let unrealizedPnl = 0;
    for (const pos of Array.from(this.positions.values())) {
      unrealizedPnl += pos.unrealizedPnl;
    }

    // Trade statistics
    const totalTrades = this.tradeHistory.length;
    const winningTrades = this.tradeHistory.filter(t => t.pnl > 0).length;
    const losingTrades = this.tradeHistory.filter(t => t.pnl <= 0).length;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    const avgPnlPct = totalTrades > 0
      ? this.tradeHistory.reduce((s, t) => s + t.pnlPct, 0) / totalTrades
      : 0;

    // Max drawdown calculation
    const currentTotalValue = this.currentCapital + unrealizedPnl;
    const maxDrawdownPct = this.peakCapital > 0
      ? Math.max(0, ((this.peakCapital - currentTotalValue) / this.peakCapital) * 100)
      : 0;

    // Sharpe ratio approximation from trade PnLs
    const sharpeRatio = this.calculateSharpeRatio();

    // Total return
    const totalReturnPct = this.config.initialCapital > 0
      ? ((currentTotalValue - this.config.initialCapital) / this.config.initialCapital) * 100
      : 0;

    return {
      status: this.status,
      startedAt: this.startedAt,
      uptimeMs,
      currentCapital: Math.round(currentTotalValue * 100) / 100,
      initialCapital: this.config.initialCapital,
      totalReturnPct: Math.round(totalReturnPct * 100) / 100,
      openPositions: this.positions.size,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: Math.round(winRate * 10000) / 10000,
      avgPnlPct: Math.round(avgPnlPct * 100) / 100,
      unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
      maxDrawdownPct: Math.round(maxDrawdownPct * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      lastScanAt: this.lastScanAt,
      tokensScanned: this.totalTokensScanned,
      signalsGenerated: this.totalSignalsGenerated,
    };
  }

  // ============================================================
  // 5. GET OPEN POSITIONS
  // ============================================================

  getOpenPositions(): PaperPosition[] {
    return Array.from(this.positions.values());
  }

  // ============================================================
  // 6. GET TRADE HISTORY
  // ============================================================

  getTradeHistory(): PaperTradeRecord[] {
    return [...this.tradeHistory];
  }

  // ============================================================
  // 7. FORCE CLOSE POSITION
  // ============================================================

  async forceClosePosition(positionId: string, reason: string): Promise<PaperTradeRecord | null> {
    const position = this.positions.get(positionId);
    if (!position) return null;

    const record = this.closePosition(position, position.currentPrice, reason);
    return record;
  }

  // ============================================================
  // 8. RUN SINGLE SCAN
  // ============================================================

  async runSingleScan(): Promise<{ tokensScanned: number; signalsGenerated: number; tradesOpened: number }> {
    if (this.status !== 'RUNNING') {
      return { tokensScanned: 0, signalsGenerated: 0, tradesOpened: 0 };
    }

    const scanStart = new Date();
    let tokensScanned = 0;
    let signalsGenerated = 0;
    let tradesOpened = 0;

    try {
      // STEP 1: Monitor existing positions (exit checks first)
      await this.monitorOpenPositions();

      // STEP 2: Get tokens from DB ordered by volume24h desc
      const tokens = await this.fetchTopTokens();

      for (const token of tokens) {
        tokensScanned++;

        // Skip if we already have a position in this token
        const existingPosition = Array.from(this.positions.values()).find(
          p => p.tokenAddress === token.address
        );
        if (existingPosition) continue;

        // Skip if we've hit max open positions
        if (this.positions.size >= this.config.maxOpenPositions) break;

        try {
          // STEP 3: Run brain analysis on this token
          const analysis = await analyzeToken(
            token.address,
            this.config.chain,
            this.calculatePositionSize(),
            5 // expected gain pct
          );

          // Fill symbol from DB data
          analysis.symbol = token.symbol || analysis.symbol;

          // STEP 4: Check if brain says TRADE
          if (analysis.action !== 'TRADE') continue;

          // STEP 5: Check operability score threshold
          if (analysis.operabilityScore < this.config.minOperabilityScore) continue;

          // STEP 6: Verify with operability engine directly
          const operInput: OperabilityInput = {
            tokenAddress: token.address,
            symbol: token.symbol,
            chain: this.config.chain as 'SOL' | 'ETH' | 'BASE' | 'ARB' | string,
            priceUsd: token.priceUsd,
            liquidityUsd: token.liquidity,
            volume24h: token.volume24h,
            marketCap: token.marketCap,
            positionSizeUsd: this.calculatePositionSize(),
            expectedGainPct: 5,
            botActivityPct: token.botActivityPct,
            holderCount: token.holderCount,
            priceChange24h: token.priceChange24h,
            dexId: token.dexId || undefined,
            pairCreatedAt: token.createdAt ? new Date(token.createdAt).getTime() : undefined,
          };

          const operResult = calculateOperabilityScore(operInput);
          if (!operResult.isOperable || operResult.overallScore < this.config.minOperabilityScore) {
            continue;
          }

          // STEP 7: Signal generated!
          signalsGenerated++;

          // STEP 8: Open paper position
          const position = this.openPosition(token, analysis, operResult.recommendedPositionUsd);
          if (position) {
            tradesOpened++;
          }

        } catch (error) {
          // Individual token analysis failures should not stop the scan
          console.warn(
            `[PaperTrading] Failed to analyze ${token.address}:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    } catch (error) {
      console.error(
        '[PaperTrading] Scan error:',
        error instanceof Error ? error.message : String(error)
      );
    }

    // Update counters
    this.totalTokensScanned += tokensScanned;
    this.totalSignalsGenerated += signalsGenerated;
    this.lastScanAt = scanStart;

    return { tokensScanned, signalsGenerated, tradesOpened };
  }

  // ============================================================
  // PRIVATE: SCAN LOOP
  // ============================================================

  private startScanLoop(): void {
    this.stopScanLoop(); // Clear any existing timer
    this.scanTimer = setInterval(async () => {
      try {
        await this.runSingleScan();
      } catch (error) {
        console.error(
          '[PaperTrading] Unhandled scan loop error:',
          error instanceof Error ? error.message : String(error)
        );
      }
    }, this.config.scanIntervalMs);
  }

  private stopScanLoop(): void {
    if (this.scanTimer !== null) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
  }

  // ============================================================
  // PRIVATE: FETCH TOP TOKENS FROM DB
  // ============================================================

  private async fetchTopTokens(): Promise<Array<{
    address: string;
    symbol: string;
    priceUsd: number;
    liquidity: number;
    volume24h: number;
    marketCap: number;
    botActivityPct: number;
    holderCount: number;
    priceChange24h: number;
    dexId: string | null;
    createdAt: Date | string | null;
  }>> {
    try {
      const { db } = await import('@/lib/db');

      const tokens = await db.token.findMany({
        where: {
          chain: this.config.chain,
          volume24h: { gt: 0 },
          priceUsd: { gt: 0 },
        },
        orderBy: { volume24h: 'desc' },
        take: 20, // Scan top 20 by volume
        select: {
          address: true,
          symbol: true,
          priceUsd: true,
          liquidity: true,
          volume24h: true,
          marketCap: true,
          botActivityPct: true,
          holderCount: true,
          priceChange24h: true,
          dexId: true,
          createdAt: true,
        },
      });

      return tokens.map(t => ({
        address: t.address,
        symbol: t.symbol,
        priceUsd: t.priceUsd,
        liquidity: t.liquidity,
        volume24h: t.volume24h,
        marketCap: t.marketCap,
        botActivityPct: t.botActivityPct,
        holderCount: t.holderCount,
        priceChange24h: t.priceChange24h,
        dexId: t.dexId,
        createdAt: t.createdAt,
      }));
    } catch (error) {
      console.warn(
        '[PaperTrading] Failed to fetch tokens from DB:',
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  // ============================================================
  // PRIVATE: CALCULATE POSITION SIZE
  // ============================================================

  private calculatePositionSize(): number {
    // Use capital strategy manager's logic for position sizing
    // For paper trading, we simplify: divide available capital by max positions
    const openPositionValue = Array.from(this.positions.values()).reduce(
      (sum, p) => sum + p.positionSizeUsd,
      0
    );
    const availableCapital = this.currentCapital - openPositionValue;

    if (availableCapital <= 0) return 0;

    const remainingSlots = Math.max(1, this.config.maxOpenPositions - this.positions.size);
    const positionSize = availableCapital / remainingSlots;

    return Math.max(0, Math.round(positionSize * 100) / 100);
  }

  // ============================================================
  // PRIVATE: OPEN POSITION
  // ============================================================

  private openPosition(
    token: {
      address: string;
      symbol: string;
      priceUsd: number;
    },
    analysis: TokenAnalysis,
    recommendedPositionUsd: number
  ): PaperPosition | null {
    const positionSizeUsd = Math.min(
      this.calculatePositionSize(),
      recommendedPositionUsd
    );

    if (positionSizeUsd <= 0) return null;

    // Get system template for exit conditions
    const system = tradingSystemEngine.getTemplate(this.config.systemName);
    if (!system) return null;

    // Simulate slippage on entry
    const slippageMultiplier = 1 + (this.config.slippagePct / 100);
    const entryPrice = token.priceUsd * slippageMultiplier;

    // Deduct simulated fees on entry
    const entryFee = positionSizeUsd * this.config.feesPct;

    const quantity = positionSizeUsd / entryPrice;
    const netPositionSize = positionSizeUsd - entryFee;

    // Build exit conditions list from system template
    const exitConditions: string[] = [];
    if (system.exitSignal.stopLossPct !== 0) exitConditions.push('stop_loss');
    if (system.exitSignal.takeProfitPct !== 0) exitConditions.push('take_profit');
    if (system.exitSignal.trailingStopPct) exitConditions.push('trailing_stop');
    if (system.exitSignal.timeBasedExitMin) exitConditions.push('time_exit');
    exitConditions.push('brain_signal_change');

    const id = `paper-${++this.idCounter}-${Date.now()}`;

    const position: PaperPosition = {
      id,
      tokenAddress: token.address,
      symbol: token.symbol,
      chain: this.config.chain,
      direction: 'LONG',
      entryTime: new Date(),
      entryPrice: Math.round(entryPrice * 100000000) / 100000000,
      quantity: Math.round(quantity * 100000000) / 100000000,
      positionSizeUsd: Math.round(netPositionSize * 100) / 100,
      currentPrice: entryPrice,
      unrealizedPnl: 0,
      unrealizedPnlPct: 0,
      highWaterMark: entryPrice,
      exitConditions,
      systemName: this.config.systemName,
      brainAnalysis: { ...analysis }, // Snapshot
    };

    this.positions.set(id, position);

    console.log(
      `[PaperTrading] OPENED ${position.direction} ${position.symbol} @ $${entryPrice.toFixed(6)} | Size: $${position.positionSizeUsd.toFixed(2)} | Operability: ${analysis.operabilityScore}/100 | Phase: ${analysis.lifecyclePhase} | Action: ${analysis.actionReason}`
    );

    return position;
  }

  // ============================================================
  // PRIVATE: CLOSE POSITION
  // ============================================================

  private closePosition(
    position: PaperPosition,
    exitPrice: number,
    reason: string
  ): PaperTradeRecord {
    // Apply slippage on exit
    const slippageMultiplier = reason === 'ENGINE_STOPPED' ? 1 : (1 - (this.config.slippagePct / 100));
    const adjustedExitPrice = exitPrice * slippageMultiplier;

    // Calculate PnL
    const entryValue = position.quantity * position.entryPrice;
    const exitValue = position.quantity * adjustedExitPrice;

    // Deduct exit fees
    const exitFee = exitValue * this.config.feesPct;

    const pnl = exitValue - entryValue - exitFee;
    const pnlPct = entryValue > 0 ? (pnl / entryValue) * 100 : 0;

    // Calculate hold time
    const exitTime = new Date();
    const holdTimeMin = (exitTime.getTime() - position.entryTime.getTime()) / 60000;

    // Calculate MFE/MAE
    const mfe = this.calculateMFE(position);
    const mae = this.calculateMAE(position);

    const record: PaperTradeRecord = {
      id: `trade-${position.id}`,
      position: { ...position, currentPrice: adjustedExitPrice },
      exitTime,
      exitPrice: Math.round(adjustedExitPrice * 100000000) / 100000000,
      exitReason: reason,
      pnl: Math.round(pnl * 100) / 100,
      pnlPct: Math.round(pnlPct * 100) / 100,
      holdTimeMin: Math.round(holdTimeMin * 100) / 100,
      mfe: Math.round(mfe * 100) / 100,
      mae: Math.round(mae * 100) / 100,
    };

    // Update capital
    this.currentCapital += pnl;

    // Track peak capital for drawdown calculation
    if (this.currentCapital > this.peakCapital) {
      this.peakCapital = this.currentCapital;
    }

    // Remove from open positions
    this.positions.delete(position.id);

    // Add to trade history
    this.tradeHistory.push(record);

    console.log(
      `[PaperTrading] CLOSED ${position.direction} ${position.symbol} | Reason: ${reason} | PnL: $${pnl.toFixed(2)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%) | Hold: ${holdTimeMin.toFixed(0)}min | Capital: $${this.currentCapital.toFixed(2)}`
    );

    // Auto-feedback to the feedback loop engine
    if (this.config.autoFeedback) {
      this.submitFeedback(record).catch(err => {
        console.warn(
          '[PaperTrading] Failed to submit feedback:',
          err instanceof Error ? err.message : String(err)
        );
      });
    }

    return record;
  }

  // ============================================================
  // PRIVATE: MONITOR OPEN POSITIONS
  // ============================================================

  private async monitorOpenPositions(): Promise<void> {
    const positionIds = Array.from(this.positions.keys());

    for (const id of positionIds) {
      const position = this.positions.get(id);
      if (!position) continue;

      try {
        // Fetch current price from DB
        const currentPrice = await this.fetchCurrentPrice(position.tokenAddress);
        if (currentPrice <= 0) continue;

        // Update position with current price
        position.currentPrice = currentPrice;

        // Update unrealized PnL
        const entryValue = position.quantity * position.entryPrice;
        const currentValue = position.quantity * currentPrice;
        position.unrealizedPnl = Math.round((currentValue - entryValue) * 100) / 100;
        position.unrealizedPnlPct = entryValue > 0
          ? Math.round(((currentValue - entryValue) / entryValue) * 10000) / 100
          : 0;

        // Update high water mark for trailing stop
        if (currentPrice > position.highWaterMark) {
          position.highWaterMark = currentPrice;
        }

        // Check exit conditions
        const exitReason = this.checkExitConditions(position);
        if (exitReason) {
          this.closePosition(position, currentPrice, exitReason);
        }
      } catch (error) {
        console.warn(
          `[PaperTrading] Error monitoring position ${id}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  // ============================================================
  // PRIVATE: CHECK EXIT CONDITIONS
  // ============================================================

  private checkExitConditions(position: PaperPosition): string | null {
    const system = tradingSystemEngine.getTemplate(position.systemName);
    if (!system) return null;

    const currentPrice = position.currentPrice;
    const entryPrice = position.entryPrice;
    const priceChangePct = entryPrice > 0
      ? ((currentPrice - entryPrice) / entryPrice) * 100
      : 0;

    // 1. Stop Loss
    if (system.exitSignal.stopLossPct !== 0) {
      const stopLossPct = system.exitSignal.stopLossPct; // Negative number (e.g., -15)
      if (stopLossPct < 0 && priceChangePct <= stopLossPct) {
        return `stop_loss_hit (${priceChangePct.toFixed(2)}% <= ${stopLossPct}%)`;
      }
    }

    // 2. Take Profit
    if (system.exitSignal.takeProfitPct !== 0 && system.exitSignal.takeProfitPct > 0) {
      if (priceChangePct >= system.exitSignal.takeProfitPct) {
        return `take_profit_hit (${priceChangePct.toFixed(2)}% >= ${system.exitSignal.takeProfitPct}%)`;
      }
    }

    // 3. Trailing Stop
    if (system.exitSignal.trailingStopPct && system.exitSignal.trailingStopPct > 0) {
      const trailingPct = system.exitSignal.trailingStopPct;
      const activationPct = system.exitSignal.trailingActivationPct ?? 0;

      // Trailing only activates after price moves activationPct in our favor
      const highWaterChangePct = entryPrice > 0
        ? ((position.highWaterMark - entryPrice) / entryPrice) * 100
        : 0;

      if (highWaterChangePct >= activationPct) {
        // Trailing is active — check if price has dropped below high water mark
        const dropFromHWM = position.highWaterMark > 0
          ? ((position.highWaterMark - currentPrice) / position.highWaterMark) * 100
          : 0;

        if (dropFromHWM >= trailingPct) {
          return `trailing_stop_hit (dropped ${dropFromHWM.toFixed(2)}% from HWM $${position.highWaterMark.toFixed(6)})`;
        }
      }
    }

    // 4. Time-based exit
    if (system.exitSignal.timeBasedExitMin && system.exitSignal.timeBasedExitMin > 0) {
      const holdTimeMin = (Date.now() - position.entryTime.getTime()) / 60000;
      if (holdTimeMin >= system.exitSignal.timeBasedExitMin) {
        return `time_expired (${holdTimeMin.toFixed(0)}min >= ${system.exitSignal.timeBasedExitMin}min)`;
      }
    }

    // 5. Brain signal change — re-analyze and check if brain now says AVOID/SKIP
    // This is checked on every scan cycle. We do a lightweight check:
    // If the brain analysis at entry had warnings about changing conditions,
    // or if we can quickly re-analyze, we check.
    // For performance, we only do this every 5 minutes per position.
    const minutesSinceEntry = (Date.now() - position.entryTime.getTime()) / 60000;
    if (minutesSinceEntry > 5) {
      // Check if the brain analysis was stale or had critical warnings
      const analysis = position.brainAnalysis;
      if (analysis.botSwarmLevel === 'CRITICAL') {
        return 'brain_signal_change (bot_swarm_CRITICAL)';
      }
      if (analysis.regime === 'BEAR' && analysis.lifecyclePhase === 'DECLINE') {
        return 'brain_signal_change (bear_decline)';
      }
    }

    return null;
  }

  // ============================================================
  // PRIVATE: FETCH CURRENT PRICE
  // ============================================================

  private async fetchCurrentPrice(tokenAddress: string): Promise<number> {
    try {
      const { db } = await import('@/lib/db');
      const token = await db.token.findUnique({
        where: { address: tokenAddress },
        select: { priceUsd: true },
      });
      return token?.priceUsd ?? 0;
    } catch {
      return 0;
    }
  }

  // ============================================================
  // PRIVATE: CALCULATE MFE (Max Favorable Excursion)
  // ============================================================

  private calculateMFE(position: PaperPosition): number {
    if (position.entryPrice <= 0) return 0;
    // MFE = max percentage the position moved in our favor
    return ((position.highWaterMark - position.entryPrice) / position.entryPrice) * 100;
  }

  // ============================================================
  // PRIVATE: CALCULATE MAE (Max Adverse Excursion)
  // ============================================================

  private calculateMAE(position: PaperPosition): number {
    if (position.entryPrice <= 0) return 0;
    // MAE = max percentage the position moved against us
    // Since we track highWaterMark, MAE is the current unrealized loss if negative,
    // or 0 if we're in profit. For a more accurate MAE, we'd need to track
    // lowWaterMark as well. Here we use unrealized PnL as a proxy.
    const pnlPct = position.unrealizedPnlPct;
    return pnlPct < 0 ? Math.abs(pnlPct) : 0;
  }

  // ============================================================
  // PRIVATE: CALCULATE SHARPE RATIO
  // ============================================================

  private calculateSharpeRatio(): number {
    if (this.tradeHistory.length < 2) return 0;

    const returns = this.tradeHistory.map(t => t.pnlPct);
    const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    // Annualized Sharpe (assuming ~5000 trades/year at 1-min intervals)
    return (avgReturn / stdDev) * Math.sqrt(5000);
  }

  // ============================================================
  // PRIVATE: SUBMIT FEEDBACK TO FEEDBACK LOOP ENGINE
  // ============================================================

  private async submitFeedback(record: PaperTradeRecord): Promise<void> {
    try {
      const { db } = await import('@/lib/db');

      // Store the paper trade result as a predictive signal for validation
      // This allows the feedback loop engine to validate the brain's signals
      await db.predictiveSignal.upsert({
        where: { id: record.id },
        create: {
          id: record.id,
          signalType: 'PAPER_TRADE_RESULT',
          chain: record.position.chain,
          prediction: JSON.stringify({
            tokenAddress: record.position.tokenAddress,
            symbol: record.position.symbol,
            direction: record.position.direction,
            entryPrice: record.position.entryPrice,
            exitPrice: record.exitPrice,
            entryTime: record.position.entryTime,
            exitTime: record.exitTime,
            exitReason: record.exitReason,
            pnl: record.pnl,
            pnlPct: record.pnlPct,
            holdTimeMin: record.holdTimeMin,
            mfe: record.mfe,
            mae: record.mae,
            systemName: record.position.systemName,
            brainAction: record.position.brainAnalysis.action,
            brainOperabilityScore: record.position.brainAnalysis.operabilityScore,
            brainPhase: record.position.brainAnalysis.lifecyclePhase,
            brainRegime: record.position.brainAnalysis.regime,
          }),
          confidence: record.position.brainAnalysis.operabilityScore / 100,
          timeframe: 'paper_trade',
          evidence: JSON.stringify({
            wasCorrect: record.pnl > 0,
            exitReason: record.exitReason,
            mfe: record.mfe,
            mae: record.mae,
          }),
          historicalHitRate: record.pnl > 0 ? 1 : 0,
          dataPointsUsed: 1,
        },
        update: {
          prediction: JSON.stringify({
            tokenAddress: record.position.tokenAddress,
            symbol: record.position.symbol,
            direction: record.position.direction,
            entryPrice: record.position.entryPrice,
            exitPrice: record.exitPrice,
            entryTime: record.position.entryTime,
            exitTime: record.exitTime,
            exitReason: record.exitReason,
            pnl: record.pnl,
            pnlPct: record.pnlPct,
            holdTimeMin: record.holdTimeMin,
            mfe: record.mfe,
            mae: record.mae,
            systemName: record.position.systemName,
            brainAction: record.position.brainAnalysis.action,
            brainOperabilityScore: record.position.brainAnalysis.operabilityScore,
            brainPhase: record.position.brainAnalysis.lifecyclePhase,
            brainRegime: record.position.brainAnalysis.regime,
          }),
          evidence: JSON.stringify({
            wasCorrect: record.pnl > 0,
            exitReason: record.exitReason,
            mfe: record.mfe,
            mae: record.mae,
          }),
          historicalHitRate: record.pnl > 0 ? 1 : 0,
          dataPointsUsed: 1,
          updatedAt: new Date(),
        },
      });

      // Also try to trigger feedback loop validation if available
      try {
        await feedbackLoopEngine.validateSignals();
      } catch {
        // Validation may not always succeed, that's OK
      }
    } catch (error) {
      console.warn(
        '[PaperTrading] Failed to store feedback:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // ============================================================
  // PRIVATE: GET CONFIG (for external inspection)
  // ============================================================

  getConfig(): PaperTradingConfig {
    return { ...this.config };
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

export const paperTradingEngine = new PaperTradingEngine();
