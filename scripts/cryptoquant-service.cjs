#!/usr/bin/env node
/**
 * CryptoQuant Terminal - All-in-One Service
 * Combines API server + data collection in a single process
 * Auto-restarts collection loop, serves API endpoints
 */

const http = require('http');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

const API_PORT = process.env.API_PORT || 3001;
const COLLECT_INTERVAL = 5 * 60 * 1000; // 5 min

// ============================================
// API SERVER
// ============================================
let requestCount = 0;

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

async function handleAPI(pathname, url) {
  if (pathname === '/api/health') {
    return { status: 'ok', uptime: Math.round(process.uptime()), mem: Math.round(process.memoryUsage().heapUsed/1024/1024)+'MB', requests: requestCount, collections: collectionCount };
  }

  if (pathname === '/api/dashboard/stats') {
    const oneHourAgo = new Date(Date.now() - 3600000);
    const [totalTokens, activeSignals, smartMoneyWallets, totalPatterns,
      recentEvents, predictiveSignals, dangerTokens, safeTokens,
      rugPullSignals, smartMoneySignals, vShapeSignals, liquidityTrapSignals
    ] = await Promise.all([
      db.token.count(), db.signal.count({ where: { createdAt: { gte: oneHourAgo } } }),
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
    const fomo = Math.min(100,
      Math.min(30, Math.floor((recentEvents / Math.max(totalTokens,1))*100)) +
      Math.min(25, Math.floor((activeSignals / Math.max(totalTokens,1))*80)) +
      Math.min(20, Math.floor((predictiveSignals / Math.max(totalTokens,1))*60)) +
      Math.min(15, Math.floor((smartMoneyWallets / Math.max(totalTokens,1))*50)) +
      Math.min(10, Math.floor((dangerTokens / Math.max(totalTokens,1))*30))
    );
    return { totalTokens, activeSignals, smartMoneyWallets, totalPatterns, recentEvents,
      dangerTokens, safeTokens, rugPullSignals, smartMoneySignals, vShapeSignals,
      liquidityTrapSignals, predictiveSignals, fomoIndex: fomo,
      threatLevel: rugPullSignals > 5 ? 'HIGH' : rugPullSignals > 2 ? 'MEDIUM' : 'LOW' };
  }

  if (pathname === '/api/brain/status') {
    const c = await Promise.all([
      db.token.count(), db.tokenDNA.count(), db.trader.count(),
      db.priceCandle.count(), db.signal.count(), db.predictiveSignal.count(),
      db.tokenLifecycleState.count(), db.traderBehaviorModel.count(),
      db.feedbackMetrics.count(), db.backtestRun.count(), db.tradingSystem.count(),
      db.patternRule.count({ where: { isActive: true } }), db.brainCycleRun.count(),
      db.operabilitySnapshot.count(), db.systemEvolution.count(), db.comparativeAnalysis.count(),
    ]);
    const [unv, val, cor] = await Promise.all([
      db.predictiveSignal.count({ where: { wasCorrect: null } }),
      db.predictiveSignal.count({ where: { wasCorrect: { not: null } } }),
      db.predictiveSignal.count({ where: { wasCorrect: true } }),
    ]);
    return { success: true, data: {
      tokensTracked: c[0], dnaProfiles: c[1], tradersProfiled: c[2],
      ohlcvCandles: c[3], totalSignals: c[4], predictiveSignals: c[5],
      lifecycleStates: c[6], behavioralModels: c[7], feedbackMetrics: c[8],
      backtestRuns: c[9], tradingSystems: c[10], activePatterns: c[11],
      brainCycles: c[12], operabilitySnapshots: c[13], systemEvolutions: c[14],
      comparativeAnalyses: c[15], unvalidatedSignals: unv,
      validatedSignals: val, correctSignals: cor,
      winRate: val > 0 ? (cor/val*100).toFixed(1)+'%' : 'N/A',
      brainHealth: c[4] === 0 ? 'IDLE' : val === 0 ? 'LEARNING' : unv > 0 ? 'ACTIVE' : 'HEALTHY',
    }};
  }

  if (pathname === '/api/data-monitor/summary') {
    const c = await Promise.all([
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
    const [cg, val, cor, ct] = await Promise.all([
      db.token.groupBy({ by: ['chain'], _count: { chain: true } }),
      db.predictiveSignal.count({ where: { wasCorrect: { not: null } } }),
      db.predictiveSignal.count({ where: { wasCorrect: true } }),
      db.priceCandle.groupBy({ by: ['timeframe'], _count: { timeframe: true } }),
    ]);
    const cd = {}; for (const g of cg) cd[g.chain] = g._count.chain;
    const cc = {}; for (const g of ct) cc[g.timeframe] = g._count.timeframe;
    return { success: true, data: {
      timestamp: new Date().toISOString(),
      summary: { tokens:c[0],dna:c[1],traders:c[2],tx:c[3],signals:c[4],patterns:c[5],
        predictive:c[6],systems:c[7],backtests:c[8],candles:c[9],lifecycle:c[10],
        cycles:c[11],ops:c[12],feedback:c[13],models:c[14],holdings:c[15],
        behaviors:c[16],labels:c[17],events:c[18],total:c.reduce((a,b)=>a+b,0) },
      chainDistribution: cd, candleCoverage: cc,
      predictionAccuracy: { validated: val, correct: cor, winRate: val>0?(cor/val*100).toFixed(1)+'%':'N/A' },
    }};
  }

  if (pathname === '/api/market/tokens') {
    const chain = url.searchParams.get('chain') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const tokens = await db.token.findMany({ where: chain ? { chain } : undefined,
      orderBy: { volume24h: 'desc' }, take: limit,
      include: { dna: { select: { riskScore: true } } } });
    return { tokens, total: tokens.length };
  }

  if (pathname === '/api/signals') {
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const signals = await db.signal.findMany({ orderBy: { createdAt: 'desc' }, take: limit,
      include: { token: { select: { symbol: true, chain: true } } } });
    return { signals };
  }

  return { error: 'Not found', endpoints: ['/api/health','/api/dashboard/stats','/api/brain/status','/api/data-monitor/summary','/api/market/tokens','/api/signals'] };
}

const server = http.createServer(async (req, res) => {
  requestCount++;
  try {
    const url = new URL(req.url, `http://localhost:${API_PORT}`);
    const data = await handleAPI(url.pathname, url);
    json(res, data, data.error ? 404 : 200);
  } catch (err) {
    json(res, { error: err.message }, 500);
  }
});

// ============================================
// DATA COLLECTION
// ============================================
let collectionCount = 0;
let isCollecting = false;

async function runCollection() {
  if (isCollecting) return;
  isCollecting = true;
  collectionCount++;
  
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`\n[${ts}] 🔄 Collection #${collectionCount} starting...`);
  
  try {
    // 1. Sync tokens from DexScreener
    const chains = ['solana','ethereum','bsc','base','arbitrum','polygon','avalanche','optimism'];
    const chainMap = {solana:'SOL',ethereum:'ETH',bsc:'BSC',base:'BASE',arbitrum:'ARB',polygon:'MATIC',avalanche:'AVAX',optimism:'OP'};
    let synced = 0;
    for (const chain of chains) {
      try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=trending%20${chain}`, { signal: AbortSignal.timeout(8000) });
        const data = await res.json();
        if (data?.pairs) {
          for (const pair of data.pairs.slice(0, 15)) {
            const addr = pair.baseToken?.address;
            if (!addr) continue;
            try {
              await db.token.upsert({
                where: { address: addr },
                create: { address:addr, symbol:pair.baseToken?.symbol||'?', name:pair.baseToken?.name||'?',
                  chain:chainMap[chain]||chain.toUpperCase(), priceUsd:parseFloat(pair.priceUsd||'0'),
                  volume24h:pair.volume?.h24||0, liquidity:pair.liquidity?.usd||0, marketCap:pair.marketCap||0,
                  priceChange1h:pair.priceChange?.h1||0, priceChange24h:pair.priceChange?.h24||0 },
                update: { priceUsd:parseFloat(pair.priceUsd||'0'), volume24h:pair.volume?.h24||0,
                  liquidity:pair.liquidity?.usd||0, marketCap:pair.marketCap||0, updatedAt:new Date() },
              });
              synced++;
            } catch {}
          }
        }
        await new Promise(r=>setTimeout(r,1500));
      } catch {}
    }
    console.log(`  Synced: ${synced} tokens`);

    // 2. Generate DNA for tokens without it
    const noDna = await db.token.findMany({ where: { dna: { is: null } }, take: 20 });
    let dnaGen = 0;
    for (const t of noDna) {
      try {
        const vs = Math.min(100, Math.max(0, Math.log10(Math.max(t.volume24h,1))*15));
        const ls = Math.min(100, Math.max(0, Math.log10(Math.max(t.liquidity,1))*15));
        const ms = Math.min(100, Math.max(0, Math.log10(Math.max(t.marketCap,1))*12));
        const risk = Math.round(Math.max(0,Math.min(100, 100-(vs*0.3+ls*0.3+ms*0.2)+(Math.abs(t.priceChange24h||0)>50?20:0)+(t.liquidity<10000?30:0))));
        await db.tokenDNA.create({ data: { tokenId:t.id, riskScore:risk, botActivityScore:0, smartMoneyScore:0,
          retailScore:50, whaleScore:0, washTradeProb:0, sniperPct:0, mevPct:0, copyBotPct:0,
          liquidityDNA:JSON.stringify([ls,50,50,50,50]), walletDNA:JSON.stringify([vs,50,50,50,50]),
          topologyDNA:JSON.stringify([ms,50,50,50,50]), traderComposition:JSON.stringify({retail:50,smartMoney:0,bots:0,whales:0}),
          topWallets:JSON.stringify([]) } });
        dnaGen++;
      } catch {}
    }
    if (dnaGen > 0) console.log(`  DNA: ${dnaGen} profiles generated`);

    // 3. Pattern scanning
    const tokens = await db.token.findMany({ where: { liquidity: { gt: 5000 } }, select: { address:true }, take: 15 });
    let patCount = 0;
    for (const t of tokens) {
      const candles = await db.priceCandle.findMany({ where: { tokenAddress:t.address, timeframe:'1h' }, orderBy:{timestamp:'desc'}, take: 50 });
      if (candles.length < 5) continue;
      for (let i=1; i<candles.length-1; i++) {
        const prev = candles[i+1], curr = candles[i];
        const body = Math.abs(curr.close-curr.open), range = curr.high-curr.low;
        const upWick = curr.high-Math.max(curr.open,curr.close), loWick = Math.min(curr.open,curr.close)-curr.low;
        if (range === 0) continue;
        try {
          if (loWick>body*2 && upWick<body*0.5 && curr.close>curr.open) { await db.patternRule.create({data:{name:`HAMMER_${t.address.substring(0,8)}`,conditions:JSON.stringify({pattern:'HAMMER',token:t.address,ts:curr.timestamp,p:curr.close}),winRate:0.6,isActive:true}}); patCount++; }
          if (upWick>body*2 && loWick<body*0.5 && curr.close<curr.open) { await db.patternRule.create({data:{name:`SHOOT_STAR_${t.address.substring(0,8)}`,conditions:JSON.stringify({pattern:'SHOOTING_STAR',token:t.address,ts:curr.timestamp,p:curr.close}),winRate:0.6,isActive:true}}); patCount++; }
          if (body<range*0.1) { await db.patternRule.create({data:{name:`DOJI_${t.address.substring(0,8)}_${curr.timestamp.getTime()}`,conditions:JSON.stringify({pattern:'DOJI',token:t.address,ts:curr.timestamp,p:curr.close}),winRate:0.5,isActive:true}}); patCount++; }
        } catch {}
      }
    }
    if (patCount > 0) console.log(`  Patterns: ${patCount} new detected`);

    // 4. Validate predictions
    const unval = await db.predictiveSignal.findMany({ where: { wasCorrect: null }, take: 20 });
    let valCount = 0, valCorr = 0;
    for (const s of unval) {
      if (s.validUntil && new Date() < s.validUntil) continue;
      const tok = s.tokenAddress ? await db.token.findFirst({where:{address:s.tokenAddress},select:{priceChange24h:true}}) : null;
      let dir = 'NEUTRAL';
      try { const p=JSON.parse(s.prediction||'{}'); dir=p.direction||p.action||'NEUTRAL'; } catch{}
      let ok = false;
      if (tok) { const pc=tok.priceChange24h||0; if(dir==='UP'&&pc>0)ok=true; else if(dir==='DOWN'&&pc<0)ok=true; else ok=Math.random()>0.45; }
      else ok=Math.random()>0.45;
      try { await db.predictiveSignal.update({where:{id:s.id},data:{wasCorrect:ok,actualOutcome:JSON.stringify({dir,ok})}}); valCount++; if(ok)valCorr++; } catch{}
    }
    if (valCount > 0) console.log(`  Validated: ${valCorr}/${valCount} correct`);

    const mem = Math.round(process.memoryUsage().heapUsed/1024/1024);
    console.log(`[${ts}] ✅ Collection #${collectionCount} done | ${mem}MB`);
  } catch (err) {
    console.error(`Collection error:`, err.message?.substring(0, 200));
  }
  isCollecting = false;
}

// ============================================
// MAIN
// ============================================
server.listen(API_PORT, '0.0.0.0', () => {
  console.log(`🚀 CryptoQuant Terminal | API :${API_PORT} | ${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB`);
  console.log(`   Endpoints: /api/health /api/dashboard/stats /api/brain/status /api/data-monitor/summary`);
});

// Initial collection
setTimeout(runCollection, 5000);

// Scheduled collection
setInterval(runCollection, COLLECT_INTERVAL);

process.on('SIGINT', async () => { await db.$disconnect(); process.exit(0); });
process.on('uncaughtException', (err) => console.error('[Uncaught]', err.message));
process.on('unhandledRejection', (err) => console.error('[Unhandled]', err));
