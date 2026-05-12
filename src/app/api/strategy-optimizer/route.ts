import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================
// TYPES
// ============================================================

interface ScanResult {
  tokens: TokenCandidate[];
  dnaProfiles: number;
  activeSignals: number;
  lifecyclePhases: Record<string, number>;
  behaviorModels: number;
}

interface TokenCandidate {
  id: string;
  symbol: string;
  name: string;
  address: string;
  chain: string;
  priceUsd: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  priceChange24h: number;
  riskScore: number;
  phase: string | null;
  dnaRiskLevel: string;
  smartMoneyPct: number;
  botActivityPct: number;
  signalCount: number;
  tokenAgeCategory: 'NEW' | 'MEDIUM' | 'OLD';
}

interface StrategyConfig {
  id: string;
  name: string;
  category: string;
  icon: string;
  timeframe: string;
  tokenAgeCategory: string;
  riskTolerance: string;
  capitalAllocation: number;
  config: {
    assetFilter: Record<string, unknown>;
    phaseConfig: Record<string, unknown>;
    entrySignal: Record<string, unknown>;
    exitSignal: Record<string, unknown>;
    riskManagement: Record<string, unknown>;
    executionConfig: Record<string, unknown>;
  };
}

interface RankResult {
  id: string;
  backtestId: string;
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
  status: string;
  rank?: number;
}

// ============================================================
// HELPERS
// ============================================================

function getTokenAgeCategory(createdAt: Date): 'NEW' | 'MEDIUM' | 'OLD' {
  const ageMs = Date.now() - createdAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  if (ageHours < 24) return 'NEW';
  const ageDays = ageHours / 24;
  if (ageDays < 30) return 'MEDIUM';
  return 'OLD';
}

function getDnaRiskLevel(riskScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
  if (riskScore < 25) return 'LOW';
  if (riskScore < 50) return 'MEDIUM';
  if (riskScore < 75) return 'HIGH';
  return 'EXTREME';
}

// ============================================================
// POST /api/strategy-optimizer
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action as string;

    switch (action) {
      case 'scan':
        return await handleScan(body);
      case 'generate_strategies':
        return await handleGenerateStrategies(body);
      case 'run_loop':
        return await handleRunLoop(body);
      case 'rank_results':
        return await handleRankResults(body);
      default:
        return NextResponse.json(
          { data: null, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Strategy optimizer error:', error);
    return NextResponse.json(
      { data: null, error: 'Strategy optimizer failed' },
      { status: 500 }
    );
  }
}

// ============================================================
// SCAN - Find opportunities using Brain/DNA/Signals
// ============================================================

async function handleScan(_body: Record<string, unknown>) {
  try {
    // Fetch tokens with DNA and signals
    const tokens = await db.token.findMany({
      take: 100,
      orderBy: { volume24h: 'desc' },
      include: {
        dna: true,
        signals: {
          where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        lifecycleStates: {
          take: 1,
          orderBy: { detectedAt: 'desc' },
        },
      },
    });

    // Get active predictive signals count
    const activePredictiveSignals = await db.predictiveSignal.count({
      where: { validUntil: { gte: new Date() } },
    });

    // Get behavior model count
    const behaviorModelCount = await db.traderBehaviorModel.count();

    // Process tokens into candidates
    const candidates: TokenCandidate[] = tokens
      .filter(t => t.volume24h > 0)
      .map(token => {
        const dna = token.dna;
        const lifecycle = token.lifecycleStates[0];
        const signalCount = token.signals.length;
        const phase = lifecycle?.phase || null;

        // Count phase distribution
        const ageCategory = getTokenAgeCategory(token.createdAt);

        return {
          id: token.id,
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          chain: token.chain,
          priceUsd: token.priceUsd,
          volume24h: token.volume24h,
          liquidity: token.liquidity,
          marketCap: token.marketCap,
          priceChange24h: token.priceChange24h,
          riskScore: dna?.riskScore ?? 50,
          phase,
          dnaRiskLevel: getDnaRiskLevel(dna?.riskScore ?? 50),
          smartMoneyPct: dna?.smartMoneyScore ?? 0,
          botActivityPct: dna?.botActivityScore ?? 0,
          signalCount,
          tokenAgeCategory: ageCategory,
        };
      });

    // Phase distribution
    const lifecyclePhases: Record<string, number> = {};
    for (const c of candidates) {
      if (c.phase) {
        lifecyclePhases[c.phase] = (lifecyclePhases[c.phase] || 0) + 1;
      }
    }

    const result: ScanResult = {
      tokens: candidates,
      dnaProfiles: tokens.filter(t => t.dna).length,
      activeSignals: activePredictiveSignals,
      lifecyclePhases,
      behaviorModels: behaviorModelCount,
    };

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Scan error:', error);
    // Return empty results on error for graceful degradation
    return NextResponse.json({
      data: {
        tokens: [],
        dnaProfiles: 0,
        activeSignals: 0,
        lifecyclePhases: {},
        behaviorModels: 0,
      } as ScanResult,
    });
  }
}

// ============================================================
// GENERATE_STRATEGIES - Create strategy configurations
// ============================================================

async function handleGenerateStrategies(body: Record<string, unknown>) {
  const capital = Number(body.capital) || 10000;
  const timeframes = (body.timeframes as string[]) || ['1h'];
  const tokenAges = (body.tokenAges as string[]) || ['NEW', 'MEDIUM', 'OLD'];
  const riskTolerance = (body.riskTolerance as string) || 'MODERATE';
  const allocationMode = (body.allocationMode as string) || 'distribute';
  const strategyCount = Number(body.strategyCount) || 5;

  // Risk-based configuration presets
  const riskPresets: Record<string, {
    maxDrawdown: number; stopLoss: number; takeProfit: number;
    positionSize: number; confidenceThreshold: number;
    maxConcurrent: number;
  }> = {
    CONSERVATIVE: { maxDrawdown: 10, stopLoss: 8, takeProfit: 25, positionSize: 3, confidenceThreshold: 80, maxConcurrent: 3 },
    MODERATE: { maxDrawdown: 20, stopLoss: 15, takeProfit: 40, positionSize: 5, confidenceThreshold: 65, maxConcurrent: 5 },
    AGGRESSIVE: { maxDrawdown: 35, stopLoss: 25, takeProfit: 80, positionSize: 10, confidenceThreshold: 50, maxConcurrent: 8 },
  };

  const preset = riskPresets[riskTolerance] || riskPresets.MODERATE;

  // Category strategies mapped to token age + timeframe combos
  const categoryTemplates = [
    { category: 'ALPHA_HUNTER', icon: '🎯', namePrefix: 'Alpha Hunter' },
    { category: 'SMART_MONEY', icon: '🧠', namePrefix: 'Smart Money' },
    { category: 'TECHNICAL', icon: '📊', namePrefix: 'Technical' },
    { category: 'DEFENSIVE', icon: '🛡️', namePrefix: 'Defensive' },
    { category: 'BOT_AWARE', icon: '🤖', namePrefix: 'Bot-Aware' },
    { category: 'ADAPTIVE', icon: '🔄', namePrefix: 'Adaptive' },
  ];

  const strategies: StrategyConfig[] = [];
  const perStrategyCapital = allocationMode === 'focus' ? capital : capital / strategyCount;

  let strategyId = 0;
  for (const timeframe of timeframes) {
    for (const tokenAge of tokenAges) {
      for (const template of categoryTemplates) {
        if (strategies.length >= strategyCount) break;

        strategyId++;
        const tokenAgeLabel = tokenAge === 'NEW' ? '<24h' : tokenAge === 'MEDIUM' ? '<30d' : '>30d';

        strategies.push({
          id: `strategy-${strategyId}`,
          name: `${template.namePrefix} | ${timeframe} | ${tokenAgeLabel}`,
          category: template.category,
          icon: template.icon,
          timeframe,
          tokenAgeCategory: tokenAge,
          riskTolerance,
          capitalAllocation: perStrategyCapital,
          config: {
            assetFilter: {
              minLiquidity: tokenAge === 'NEW' ? 10000 : tokenAge === 'MEDIUM' ? 50000 : 100000,
              minVolume24h: tokenAge === 'NEW' ? 5000 : 20000,
              maxMarketCap: tokenAge === 'NEW' ? 1000000 : tokenAge === 'MEDIUM' ? 10000000 : 100000000,
              tokenAge: tokenAge === 'NEW' ? '<24H' : tokenAge === 'MEDIUM' ? '<30D' : '>30D',
              chains: ['SOL', 'ETH', 'BASE'],
            },
            phaseConfig: {
              genesis: tokenAge === 'NEW',
              early: tokenAge === 'NEW' || tokenAge === 'MEDIUM',
              growth: true,
              maturity: tokenAge === 'OLD',
              decline: false,
            },
            entrySignal: {
              signalType: template.category === 'SMART_MONEY' ? 'SMART_MONEY_ENTRY' :
                         template.category === 'BOT_AWARE' ? 'BOT_DETECTION' :
                         template.category === 'ALPHA_HUNTER' ? 'MOMENTUM_BREAKOUT' :
                         template.category === 'TECHNICAL' ? 'DIVERGENCE' :
                         template.category === 'DEFENSIVE' ? 'V_SHAPE_RECOVERY' : 'LIQUIDITY_SURGE',
              confidenceThreshold: preset.confidenceThreshold,
              confirmationRequired: riskTolerance !== 'AGGRESSIVE',
              timeWindow: timeframe === '1m' ? 1 : timeframe === '5m' ? 5 : timeframe === '10m' ? 10 : timeframe === '15m' ? 15 : timeframe === '30m' ? 30 : timeframe === '1h' ? 60 : 240,
            },
            exitSignal: {
              takeProfit: preset.takeProfit,
              stopLoss: preset.stopLoss,
              trailingStop: riskTolerance !== 'CONSERVATIVE',
              trailingStopPercent: Math.round(preset.takeProfit * 0.6),
              timeBasedExit: timeframe === '1m' ? 30 : timeframe === '5m' ? 60 : timeframe === '1h' ? 1440 : 2880,
            },
            riskManagement: {
              maxDrawdown: preset.maxDrawdown,
              maxConcurrentTrades: preset.maxConcurrent,
              maxDailyLoss: Math.round(preset.maxDrawdown * 0.5),
              positionSizing: 'RISK_BASED',
            },
            executionConfig: {
              orderType: riskTolerance === 'AGGRESSIVE' ? 'MARKET' : 'LIMIT',
              slippageTolerance: tokenAge === 'NEW' ? 2.0 : 1.0,
              maxPositionSize: preset.positionSize,
              executionDelay: 0,
            },
          },
        });
      }
      if (strategies.length >= strategyCount) break;
    }
    if (strategies.length >= strategyCount) break;
  }

  return NextResponse.json({ data: { strategies, totalGenerated: strategies.length, perStrategyCapital } });
}

// ============================================================
// RUN_LOOP - Execute optimization loop (create + run backtests)
// ============================================================

async function handleRunLoop(body: Record<string, unknown>) {
  const strategies = (body.strategies as StrategyConfig[]) || [];
  const capital = Number(body.capital) || 10000;

  const results: Array<{
    strategyId: string;
    strategyName: string;
    backtestId: string | null;
    status: 'created' | 'running' | 'completed' | 'failed';
    error?: string;
  }> = [];

  // Get or create a default trading system for the optimizer
  let defaultSystem = await db.tradingSystem.findFirst({
    where: { category: 'ADAPTIVE' },
    orderBy: { createdAt: 'desc' },
  });

  if (!defaultSystem) {
    // Create a default adaptive system
    defaultSystem = await db.tradingSystem.create({
      data: {
        name: 'AI Optimizer - Adaptive',
        category: 'ADAPTIVE',
        icon: '🔄',
        assetFilter: JSON.stringify({ tokenAge: 'ANY', chains: ['SOL', 'ETH', 'BASE'] }),
        phaseConfig: JSON.stringify({ genesis: true, early: true, growth: true, maturity: true, decline: false }),
        entrySignal: JSON.stringify({ signalType: 'MOMENTUM_BREAKOUT', confidenceThreshold: 60 }),
        executionConfig: JSON.stringify({ orderType: 'LIMIT', slippageTolerance: 1.5 }),
        exitSignal: JSON.stringify({ takeProfit: 40, stopLoss: 15, trailingStop: true, trailingStopPercent: 25 }),
        bigDataContext: JSON.stringify({}),
        primaryTimeframe: '1h',
        allocationMethod: 'KELLY_MODIFIED',
        maxPositionPct: 5,
        stopLossPct: 15,
        takeProfitPct: 40,
        cashReservePct: 20,
        isActive: false,
        isPaperTrading: false,
      },
    });
  }

  for (const strategy of strategies) {
    try {
      // Create a trading system for this strategy configuration
      const system = await db.tradingSystem.create({
        data: {
          name: strategy.name,
          category: strategy.category as 'ALPHA_HUNTER',
          icon: strategy.icon,
          assetFilter: JSON.stringify(strategy.config.assetFilter),
          phaseConfig: JSON.stringify(strategy.config.phaseConfig),
          entrySignal: JSON.stringify(strategy.config.entrySignal),
          executionConfig: JSON.stringify(strategy.config.executionConfig),
          exitSignal: JSON.stringify(strategy.config.exitSignal),
          bigDataContext: JSON.stringify({}),
          primaryTimeframe: strategy.timeframe,
          allocationMethod: 'KELLY_MODIFIED',
          maxPositionPct: (strategy.config.riskManagement as Record<string, unknown>).maxPositionSize as number || 5,
          stopLossPct: (strategy.config.exitSignal as Record<string, unknown>).stopLoss as number || 15,
          takeProfitPct: (strategy.config.exitSignal as Record<string, unknown>).takeProfit as number || 40,
          cashReservePct: 20,
          isActive: false,
          isPaperTrading: false,
          parentSystemId: defaultSystem.id,
        },
      });

      // Create a backtest run
      const periodStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const periodEnd = new Date();

      const backtest = await db.backtestRun.create({
        data: {
          systemId: system.id,
          mode: 'HISTORICAL',
          periodStart,
          periodEnd,
          initialCapital: strategy.capitalAllocation || capital / strategies.length,
          allocationMethod: 'KELLY_MODIFIED',
          capitalAllocation: JSON.stringify({
            method: 'KELLY_MODIFIED',
            initialCapital: strategy.capitalAllocation || capital / strategies.length,
            strategyId: strategy.id,
            strategyName: strategy.name,
            timeframe: strategy.timeframe,
            tokenAgeCategory: strategy.tokenAgeCategory,
            riskTolerance: strategy.riskTolerance,
          }),
          status: 'PENDING',
          progress: 0,
        },
      });

      results.push({
        strategyId: strategy.id,
        strategyName: strategy.name,
        backtestId: backtest.id,
        status: 'created',
      });
    } catch (error) {
      results.push({
        strategyId: strategy.id,
        strategyName: strategy.name,
        backtestId: null,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Now try to run the created backtests
  for (const result of results) {
    if (result.backtestId && result.status === 'created') {
      try {
        // Trigger the run endpoint internally
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const runRes = await fetch(`${baseUrl}/api/backtest/${result.backtestId}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (runRes.ok) {
          result.status = 'running';
        } else {
          result.status = 'created'; // Created but not yet running
        }
      } catch {
        result.status = 'created'; // Created but not yet running
      }
    }
  }

  return NextResponse.json({
    data: {
      results,
      totalCreated: results.filter(r => r.backtestId).length,
      totalFailed: results.filter(r => r.status === 'failed').length,
      totalRunning: results.filter(r => r.status === 'running').length,
    }
  });
}

// ============================================================
// RANK_RESULTS - Rank all completed backtests
// ============================================================

async function handleRankResults(body: Record<string, unknown>) {
  const sortBy = (body.sortBy as string) || 'sharpe';
  const filterTimeframe = body.filterTimeframe as string | undefined;
  const filterTokenAge = body.filterTokenAge as string | undefined;
  const filterRisk = body.filterRisk as string | undefined;

  // Fetch all completed backtests with system info
  const backtests = await db.backtestRun.findMany({
    where: { status: 'COMPLETED' },
    include: { system: true },
    orderBy: { completedAt: 'desc' },
  });

  // Parse and rank results
  const ranked: RankResult[] = backtests
    .map(bt => {
      // Try to extract strategy metadata from capitalAllocation JSON
      let strategyMeta: Record<string, unknown> = {};
      try {
        strategyMeta = JSON.parse(bt.capitalAllocation || '{}');
      } catch { /* ignore */ }

      const pnlUsd = bt.finalCapital - bt.initialCapital;
      const pnlPct = bt.totalPnlPct;

      // Composite score per spec: 0.3*sharpe + 0.25*winRate + 0.25*pnlPct + 0.1*profitFactor - 0.1*maxDrawdownPct
      // Normalize each to 0-100 range first
      const normalizedSharpe = Math.min(100, Math.max(0, (bt.sharpeRatio + 1) * 25));
      const normalizedWinRate = bt.winRate * 100;
      const normalizedPnl = Math.min(100, Math.max(0, 50 + pnlPct));
      const normalizedPF = Math.min(100, Math.max(0, bt.profitFactor * 20));
      const normalizedDD = Math.min(100, Math.max(0, bt.maxDrawdownPct * 2));

      const score = (
        normalizedSharpe * 0.3 +
        normalizedWinRate * 0.25 +
        normalizedPnl * 0.25 +
        normalizedPF * 0.1 -
        normalizedDD * 0.1
      );

      return {
        id: `${bt.id}-${Date.now()}`,
        backtestId: bt.id,
        strategyName: (strategyMeta.strategyName as string) || bt.system.name,
        category: bt.system.category,
        timeframe: (strategyMeta.timeframe as string) || bt.system.primaryTimeframe,
        tokenAgeCategory: (strategyMeta.tokenAgeCategory as string) || 'UNKNOWN',
        riskTolerance: (strategyMeta.riskTolerance as string) || 'MODERATE',
        capitalAllocation: bt.initialCapital,
        pnlPct,
        pnlUsd,
        sharpeRatio: bt.sharpeRatio,
        winRate: bt.winRate,
        maxDrawdownPct: bt.maxDrawdownPct,
        profitFactor: bt.profitFactor,
        totalTrades: bt.totalTrades,
        avgHoldTimeMin: bt.avgHoldTimeMin,
        score,
        status: bt.status,
      } as RankResult;
    })
    // Apply filters
    .filter(item => {
      if (filterTimeframe && item.timeframe !== filterTimeframe) return false;
      if (filterTokenAge && item.tokenAgeCategory !== filterTokenAge) return false;
      if (filterRisk && item.riskTolerance !== filterRisk) return false;
      return true;
    });

  // Sort
  const sortKey = sortBy as keyof RankResult;
  ranked.sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return bVal - aVal; // Descending
    }
    return String(bVal).localeCompare(String(aVal));
  });

  // Add rank numbers
  ranked.forEach((item, index) => {
    item.rank = index + 1;
  });

  return NextResponse.json({ data: { results: ranked, totalRanked: ranked.length } });
}
