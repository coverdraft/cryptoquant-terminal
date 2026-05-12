#!/usr/bin/env node
/**
 * CryptoQuant Terminal - Ultra-Lightweight API Server
 * Self-healing, minimal memory footprint
 */

const http = require('http');
const { PrismaClient } = require('@prisma/client');

let db;
function getDb() {
  if (!db) db = new PrismaClient();
  return db;
}

const PORT = process.env.PORT || 3001;
let requestCount = 0;

function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Connection': 'keep-alive',
  });
  res.end(JSON.stringify(data));
}

async function handleAPI(path, url) {
  const db = getDb();

  if (path === '/api/health') {
    return { status: 'ok', uptime: Math.round(process.uptime()), mem: Math.round(process.memoryUsage().heapUsed/1024/1024) + 'MB', requests: requestCount };
  }

  if (path === '/api/dashboard/stats') {
    const oneHourAgo = new Date(Date.now() - 3600000);
    const [totalTokens, activeSignals, smartMoneyWallets, totalPatterns,
      recentEvents, predictiveSignals, dangerTokens, safeTokens,
      rugPullSignals, smartMoneySignals, vShapeSignals, liquidityTrapSignals
    ] = await Promise.all([
      db.token.count(),
      db.signal.count({ where: { createdAt: { gte: oneHourAgo } } }),
      db.trader.count({ where: { isSmartMoney: true } }),
      db.patternRule.count({ where: { isActive: true } }),
      db.userEvent.count({ where: { createdAt: { gte: new Date(Date.now() - 86400000) } } }),
      db.predictiveSignal.count({ where: { OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] } }),
      db.tokenDNA.count({ where: { riskScore: { gt: 60 } } }),
      db.tokenDNA.count({ where: { riskScore: { lte: 30 } } }),
      db.signal.count({ where: { type: 'RUG_PULL', createdAt: { gte: oneHourAgo } } }),
      db.signal.count({ where: { type: 'SMART_MONEY_ENTRY', createdAt: { gte: oneHourAgo } } }),
      db.signal.count({ where: { type: 'V_SHAPE', createdAt: { gte: oneHourAgo } } }),
      db.signal.count({ where: { type: 'LIQUIDITY_TRAP', createdAt: { gte: oneHourAgo } } }),
    ]);
    const fomoIndex = Math.min(100,
      Math.min(30, Math.floor((recentEvents / Math.max(totalTokens, 1)) * 100)) +
      Math.min(25, Math.floor((activeSignals / Math.max(totalTokens, 1)) * 80)) +
      Math.min(20, Math.floor((predictiveSignals / Math.max(totalTokens, 1)) * 60)) +
      Math.min(15, Math.floor((smartMoneyWallets / Math.max(totalTokens, 1)) * 50)) +
      Math.min(10, Math.floor((dangerTokens / Math.max(totalTokens, 1)) * 30))
    );
    return {
      totalTokens, activeSignals, smartMoneyWallets, totalPatterns, recentEvents,
      dangerTokens, safeTokens, rugPullSignals, smartMoneySignals, vShapeSignals,
      liquidityTrapSignals, predictiveSignals, fomoIndex,
      threatLevel: rugPullSignals > 5 ? 'HIGH' : rugPullSignals > 2 ? 'MEDIUM' : 'LOW',
    };
  }

  if (path === '/api/brain/status') {
    const counts = await Promise.all([
      db.token.count(), db.tokenDNA.count(), db.trader.count(),
      db.priceCandle.count(), db.signal.count(), db.predictiveSignal.count(),
      db.tokenLifecycleState.count(), db.traderBehaviorModel.count(),
      db.feedbackMetrics.count(), db.backtestRun.count(), db.tradingSystem.count(),
      db.patternRule.count({ where: { isActive: true } }), db.brainCycleRun.count(),
      db.operabilitySnapshot.count(), db.systemEvolution.count(),
      db.comparativeAnalysis.count(),
    ]);
    const [unvalidated, validated, correct] = await Promise.all([
      db.predictiveSignal.count({ where: { wasCorrect: null } }),
      db.predictiveSignal.count({ where: { wasCorrect: { not: null } } }),
      db.predictiveSignal.count({ where: { wasCorrect: true } }),
    ]);
    return { success: true, data: {
      tokensTracked: counts[0], dnaProfiles: counts[1], tradersProfiled: counts[2],
      ohlcvCandles: counts[3], totalSignals: counts[4], predictiveSignals: counts[5],
      lifecycleStates: counts[6], behavioralModels: counts[7],
      feedbackMetrics: counts[8], backtestRuns: counts[9], tradingSystems: counts[10],
      activePatterns: counts[11], brainCycles: counts[12], operabilitySnapshots: counts[13],
      systemEvolutions: counts[14], comparativeAnalyses: counts[15],
      unvalidatedSignals: unvalidated, validatedSignals: validated, correctSignals: correct,
      winRate: validated > 0 ? (correct / validated * 100).toFixed(1) + '%' : 'N/A',
      brainHealth: counts[4] === 0 ? 'IDLE' : validated === 0 ? 'LEARNING' : unvalidated > 0 ? 'ACTIVE' : 'HEALTHY',
    }};
  }

  if (path === '/api/data-monitor/summary') {
    const counts = await Promise.all([
      db.token.count(), db.tokenDNA.count(), db.trader.count(),
      db.traderTransaction.count(), db.signal.count(),
      db.patternRule.count({ where: { isActive: true } }),
      db.predictiveSignal.count(), db.tradingSystem.count(),
      db.backtestRun.count(), db.priceCandle.count(),
      db.tokenLifecycleState.count(), db.brainCycleRun.count(),
      db.operabilitySnapshot.count(), db.feedbackMetrics.count(),
      db.traderBehaviorModel.count(), db.walletTokenHolding.count(),
      db.traderBehaviorPattern.count(), db.traderLabelAssignment.count(),
      db.userEvent.count(),
    ]);
    const [chainGroups, validated, correct, candleByTF] = await Promise.all([
      db.token.groupBy({ by: ['chain'], _count: { chain: true } }),
      db.predictiveSignal.count({ where: { wasCorrect: { not: null } } }),
      db.predictiveSignal.count({ where: { wasCorrect: true } }),
      db.priceCandle.groupBy({ by: ['timeframe'], _count: { timeframe: true } }),
    ]);
    const chainDistribution = {};
    for (const g of chainGroups) chainDistribution[g.chain] = g._count.chain;
    const candleCoverage = {};
    for (const c of candleByTF) candleCoverage[c.timeframe] = c._count.timeframe;
    const totalRecords = counts.reduce((a, b) => a + b, 0);
    return { success: true, data: {
      timestamp: new Date().toISOString(),
      summary: { tokens: counts[0], dna: counts[1], traders: counts[2], transactions: counts[3],
        signals: counts[4], patterns: counts[5], predictive: counts[6], tradingSystems: counts[7],
        backtests: counts[8], candles: counts[9], lifecycle: counts[10], brainCycles: counts[11],
        operabilitySnaps: counts[12], feedback: counts[13], behaviorModels: counts[14],
        holdings: counts[15], behaviorPatterns: counts[16], labels: counts[17], userEvents: counts[18],
        totalRecords },
      chainDistribution, candleCoverage,
      predictionAccuracy: { validated, correct, winRate: validated > 0 ? (correct/validated*100).toFixed(1)+'%' : 'N/A' },
    }};
  }

  if (path === '/api/market/tokens') {
    const chain = url.searchParams.get('chain') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const tokens = await db.token.findMany({
      where: chain ? { chain } : undefined,
      orderBy: { volume24h: 'desc' }, take: limit,
      include: { dna: { select: { riskScore: true } } },
    });
    return { tokens, total: tokens.length };
  }

  if (path === '/api/signals') {
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const signals = await db.signal.findMany({ orderBy: { createdAt: 'desc' }, take: limit,
      include: { token: { select: { symbol: true, chain: true } } } });
    return { signals };
  }

  if (path === '/api/traders') {
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const traders = await db.trader.findMany({ orderBy: { winRate: 'desc' }, take: limit });
    return { traders };
  }

  if (path === '/api/trading-systems') {
    const systems = await db.tradingSystem.findMany({ orderBy: { createdAt: 'desc' } });
    return { systems };
  }

  return { error: 'Not found', endpoints: [
    '/api/health', '/api/dashboard/stats', '/api/brain/status',
    '/api/data-monitor/summary', '/api/market/tokens', '/api/signals',
    '/api/traders', '/api/trading-systems',
  ]};
}

const server = http.createServer(async (req, res) => {
  requestCount++;
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const data = await handleAPI(url.pathname, url);
    const status = data.error ? 404 : 200;
    json(res, data, status);
  } catch (err) {
    console.error(`[Error] ${req.url}:`, err.message);
    json(res, { error: err.message }, 500);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`CryptoQuant API :${PORT} | ${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB`);
});

// Keep alive
setInterval(() => {
  const mem = Math.round(process.memoryUsage().heapUsed/1024/1024);
  if (requestCount > 0 && requestCount % 100 === 0) {
    console.log(`[Heartbeat] ${new Date().toISOString()} | ${requestCount} requests | ${mem}MB`);
  }
}, 30000);

process.on('SIGINT', async () => {
  if (db) await db.$disconnect();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught]', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('[Unhandled]', err);
});
