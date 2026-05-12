#!/usr/bin/env node
/**
 * Seed Continuation - Runs remaining phases after token load.
 * Skips Phase 1 (already loaded 500 tokens).
 * Handles errors gracefully and continues.
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient({ log: ['error', 'warn'] });
const DEXSCREENER_BASE = 'https://api.dexscreener.com';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(url, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'CryptoQuant-Terminal/1.0' },
      });
      if (res.status === 429) { await delay(60000); continue; }
      if (res.status >= 500) { await delay(5000); continue; }
      if (!res.ok) return null;
      return await res.json();
    } catch { await delay(3000); }
  }
  return null;
}

// PHASE A: Enrich with DexScreener (batch by symbol search)
async function enrichWithDexScreener() {
  console.log('\n🔄 PHASE A: Enriching with DexScreener...');
  let enriched = 0;

  const tokens = await db.token.findMany({
    where: { pairAddress: null, volume24h: { gt: 0 } },
    orderBy: { volume24h: 'desc' },
    take: 300,
  });

  console.log(`  Found ${tokens.length} tokens to enrich`);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    try {
      const data = await fetchWithRetry(
        `${DEXSCREENER_BASE}/latest/dex/search?q=${encodeURIComponent(token.symbol)}`
      );

      if (data?.pairs?.length > 0) {
        const bestPair = data.pairs.find(p => 
          p.baseToken?.symbol?.toUpperCase() === token.symbol
        ) || data.pairs[0];

        if (bestPair) {
          const chainMap = {
            'solana': 'SOL', 'ethereum': 'ETH', 'bsc': 'BSC',
            'arbitrum': 'ARB', 'optimism': 'OP', 'base': 'BASE',
            'avalanche': 'AVAX', 'polygon': 'MATIC',
          };

          await db.token.update({
            where: { id: token.id },
            data: {
              liquidity: bestPair.liquidity?.usd || 0,
              pairAddress: bestPair.pairAddress || null,
              dexId: bestPair.dexId || null,
              dex: bestPair.dexId || 'unknown',
              chain: chainMap[bestPair.chainId?.toLowerCase()] || token.chain,
              pairUrl: bestPair.url || null,
              priceUsd: bestPair.priceUsd ? parseFloat(bestPair.priceUsd) : token.priceUsd,
              priceChange1h: bestPair.priceChange?.h1 || token.priceChange1h,
              priceChange6h: bestPair.priceChange?.h6 || token.priceChange6h,
              priceChange24h: bestPair.priceChange?.h24 || token.priceChange24h,
            },
          });
          enriched++;
        }
      }

      await delay(400);
    } catch { /* skip */ }

    if ((i + 1) % 20 === 0) {
      console.log(`  Enriched ${enriched}/${i + 1} tokens`);
    }
  }

  console.log(`✅ PHASE A COMPLETE: ${enriched} tokens enriched`);
  return enriched;
}

// PHASE B: Fetch OHLCV for top tokens
async function fetchOHLCV() {
  console.log('\n🔄 PHASE B: Fetching OHLCV candles...');
  let totalCandles = 0;

  const tokens = await db.token.findMany({
    where: { volume24h: { gt: 0 } },
    orderBy: { volume24h: 'desc' },
    take: 50,
  });

  console.log(`  Fetching OHLCV for ${tokens.length} top tokens`);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    const existing = await db.priceCandle.count({ where: { tokenAddress: token.address } });
    if (existing > 5) { console.log(`  Skip ${token.symbol} (already has candles)`); continue; }

    try {
      // 7-day OHLCV
      const ohlcv7 = await fetchWithRetry(
        `${COINGECKO_BASE}/coins/${token.address}/ohlc?vs_currency=usd&days=7`
      );

      if (ohlcv7 && Array.isArray(ohlcv7)) {
        for (const [ts, o, h, l, c] of ohlcv7) {
          try {
            await db.priceCandle.upsert({
              where: { tokenAddress_chain_timeframe_timestamp: { tokenAddress: token.address, chain: token.chain, timeframe: '4h', timestamp: new Date(ts) } },
              create: { tokenAddress: token.address, chain: token.chain, timeframe: '4h', timestamp: new Date(ts), open: o, high: h, low: l, close: c, volume: 0, source: 'coingecko' },
              update: { open: o, high: h, low: l, close: c },
            });
            totalCandles++;
          } catch { /* skip dup */ }
        }
      }

      // 90-day daily candles for every 3rd token
      if (i % 3 === 0) {
        const ohlcv90 = await fetchWithRetry(
          `${COINGECKO_BASE}/coins/${token.address}/ohlc?vs_currency=usd&days=90`
        );
        if (ohlcv90 && Array.isArray(ohlcv90)) {
          for (const [ts, o, h, l, c] of ohlcv90) {
            try {
              await db.priceCandle.upsert({
                where: { tokenAddress_chain_timeframe_timestamp: { tokenAddress: token.address, chain: token.chain, timeframe: '1d', timestamp: new Date(ts) } },
                create: { tokenAddress: token.address, chain: token.chain, timeframe: '1d', timestamp: new Date(ts), open: o, high: h, low: l, close: c, volume: 0, source: 'coingecko' },
                update: { open: o, high: h, low: l, close: c },
              });
              totalCandles++;
            } catch { /* skip */ }
          }
        }
        await delay(1700);
      }

      console.log(`  ${token.symbol}: ${totalCandles} total candles`);
      await delay(1700);
    } catch { await delay(2000); }
  }

  console.log(`✅ PHASE B COMPLETE: ${totalCandles} candles stored`);
  return totalCandles;
}

// PHASE C: Compute DNA
async function computeDNA() {
  console.log('\n🔄 PHASE C: Computing TokenDNA...');
  let dnaCreated = 0;

  const tokens = await db.token.findMany({ where: { dna: { is: null } }, take: 10000 });
  console.log(`  Found ${tokens.length} tokens without DNA`);

  for (const token of tokens) {
    try {
      const pc24 = token.priceChange24h ?? 0;
      const liq = token.liquidity ?? 0;
      const mcap = token.marketCap ?? 0;
      const vol = token.volume24h ?? 0;

      let riskScore = 20;
      riskScore += Math.abs(pc24) > 50 ? 40 : Math.abs(pc24) > 20 ? 30 : Math.abs(pc24) > 10 ? 20 : Math.abs(pc24) > 5 ? 10 : 0;
      riskScore += liq > 0 && liq < 50000 ? 30 : liq > 0 && liq < 200000 ? 20 : liq === 0 && vol > 0 ? 35 : 0;
      riskScore += mcap > 0 && mcap < 1e6 ? 25 : mcap > 0 && mcap < 1e7 ? 15 : 0;
      riskScore = Math.min(98, Math.max(5, riskScore));

      const isHigh = riskScore > 60;
      const isLow = riskScore < 30;
      const vlr = liq > 0 ? vol / liq : 0;

      const botActivityScore = Math.min(95, Math.max(2, vlr > 8 ? 55 + Math.min(vlr * 2, 35) : vlr > 3 ? 25 + vlr * 5 : 2 + vlr * 3));
      const smartMoneyScore = Math.min(80, Math.max(5, isLow ? 30 + (mcap > 1e9 ? 20 : mcap > 1e8 ? 10 : 0) : 10 + Math.min(mcap / 1e8, 30)));
      const whaleScore = Math.min(70, Math.max(3, mcap > 1e9 ? 40 : mcap > 1e8 ? 20 : 3 + Math.min(mcap / 1e7, 15)));
      const retailScore = Math.min(85, Math.max(10, 100 - smartMoneyScore - whaleScore - botActivityScore / 3));
      const washTradeProb = Math.min(0.8, Math.max(0.01, isHigh ? 0.15 + vlr * 0.05 : 0.01 + vlr * 0.02));
      const sniperPct = Math.min(40, Math.max(0, isHigh ? 5 + vlr * 3 : vlr * 1.5));
      const mevPct = Math.min(25, Math.max(0, isHigh ? 3 + vlr * 2 : vlr));
      const copyBotPct = Math.min(20, Math.max(0, isHigh ? 2 + vlr : vlr * 0.5));

      await db.tokenDNA.create({
        data: {
          tokenId: token.id, riskScore,
          botActivityScore: Math.round(botActivityScore * 100) / 100,
          smartMoneyScore: Math.round(smartMoneyScore * 100) / 100,
          retailScore: Math.round(retailScore * 100) / 100,
          whaleScore: Math.round(whaleScore * 100) / 100,
          washTradeProb: Math.round(washTradeProb * 1000) / 1000,
          sniperPct: Math.round(sniperPct * 100) / 100,
          mevPct: Math.round(mevPct * 100) / 100,
          copyBotPct: Math.round(copyBotPct * 100) / 100,
          traderComposition: JSON.stringify({
            smartMoney: Math.round(smartMoneyScore / 10), whale: Math.round(whaleScore / 10),
            bot_mev: Math.round(mevPct / 2), bot_sniper: Math.round(sniperPct / 2),
            bot_copy: Math.round(copyBotPct), retail: Math.round(retailScore / 5),
            creator: mcap < 1e6 ? 1 : 0, fund: isLow ? (mcap > 1e9 ? 3 : 0) : 0,
          }),
          topWallets: JSON.stringify([]),
        },
      });
      dnaCreated++;
    } catch { /* skip */ }
  }

  console.log(`✅ PHASE C COMPLETE: ${dnaCreated} DNA profiles`);
  return dnaCreated;
}

// PHASE D: Lifecycle
async function detectLifecycle() {
  console.log('\n🔄 PHASE D: Lifecycle detection...');
  let created = 0;

  const tokens = await db.token.findMany({
    where: { lifecycleStates: { none: {} } },
    take: 10000,
    select: { id: true, address: true, chain: true, volume24h: true, liquidity: true, marketCap: true, priceChange24h: true, createdAt: true },
  });

  for (const token of tokens) {
    try {
      const pc24 = token.priceChange24h ?? 0;
      const hasVol = token.volume24h > 0;
      const hasLiq = token.liquidity > 0;
      const hasMcap = token.marketCap > 0;

      let phase = 'GROWTH', prob = 0.5;
      if (hasMcap && token.marketCap > 1e9) { phase = 'LEGACY'; prob = 0.85; }
      else if (pc24 < -20 && hasVol) { phase = 'DECLINE'; prob = 0.7; }
      else if (pc24 > 20 && hasVol && token.liquidity > 100000) { phase = 'FOMO'; prob = 0.65; }
      else if (hasVol && hasLiq && hasMcap) { phase = 'GROWTH'; prob = 0.6; }
      else if (hasVol && !hasLiq) { phase = 'INCIPIENT'; prob = 0.5; }
      else { phase = 'GENESIS'; prob = 0.4; }

      await db.tokenLifecycleState.create({
        data: {
          tokenAddress: token.address, chain: token.chain, phase,
          phaseProbability: prob,
          phaseDistribution: JSON.stringify({ [phase]: prob }),
          signals: JSON.stringify({ hasVol, hasLiq, hasMcap, pc24 }),
        },
      });
      created++;
    } catch { /* skip */ }
  }

  console.log(`✅ PHASE D COMPLETE: ${created} lifecycle phases`);
  return created;
}

// PHASE E: Trading systems
async function createTradingSystems() {
  console.log('\n🔄 PHASE E: Trading system templates...');
  const systems = [
    { name: 'Alpha Hunter', description: 'Detects early-stage tokens with high growth potential', type: 'SCANNER', riskLevel: 'HIGH' },
    { name: 'Smart Money Tracker', description: 'Follows wallets classified as smart money', type: 'FOLLOW', riskLevel: 'MEDIUM' },
    { name: 'Anti-Rug Shield', description: 'Identifies and avoids rug pull patterns', type: 'DEFENSE', riskLevel: 'LOW' },
    { name: 'Momentum Rider', description: 'Rides strong momentum waves with trailing stops', type: 'MOMENTUM', riskLevel: 'HIGH' },
    { name: 'Whale Watcher', description: 'Monitors large wallet movements for alpha', type: 'WHALE', riskLevel: 'MEDIUM' },
    { name: 'Pattern Scanner', description: 'Identifies candlestick patterns (36 types)', type: 'PATTERN', riskLevel: 'MEDIUM' },
    { name: 'Mean Reversion', description: 'Buys oversold and sells overextended tokens', type: 'REVERSION', riskLevel: 'LOW' },
    { name: 'Divergence Detector', description: 'Spots price-volume divergences for reversals', type: 'REVERSAL', riskLevel: 'MEDIUM' },
  ];

  let created = 0;
  for (const sys of systems) {
    try {
      const existing = await db.tradingSystem.findFirst({ where: { name: sys.name } });
      if (!existing) {
        await db.tradingSystem.create({
          data: { ...sys, rules: '{}', isActive: true, winRate: 0, totalTrades: 0, profitableTrades: 0 },
        });
        created++;
      }
    } catch { /* skip */ }
  }
  console.log(`✅ PHASE E COMPLETE: ${created} trading systems`);
}

// PHASE F: Generate real signals
async function generateSignals() {
  console.log('\n🔄 PHASE F: Generating real signals...');
  let signals = 0;

  const tokens = await db.token.findMany({
    where: { volume24h: { gt: 100000 } },
    include: { dna: true },
    orderBy: { volume24h: 'desc' },
    take: 200,
  });

  for (const t of tokens) {
    const pc24 = t.priceChange24h ?? 0;
    const pc1h = t.priceChange1h ?? 0;
    const liq = t.liquidity ?? 0;
    const vol = t.volume24h ?? 0;
    const mcap = t.marketCap ?? 0;
    const dna = t.dna;

    const sigDefs = [];
    if (dna && dna.riskScore > 70 && liq > 0 && liq < 100000 && pc24 < -20) {
      sigDefs.push({ type: 'RUG_PULL', conf: Math.min(95, 50 + dna.riskScore / 2), target: t.priceUsd * 0.3, dir: 'AVOID', desc: `Rug pull risk: ${t.symbol} dropped ${pc24.toFixed(1)}% with $${Math.round(liq).toLocaleString()} liquidity` });
    }
    if (pc24 < -15 && pc1h > 5) {
      sigDefs.push({ type: 'V_SHAPE', conf: Math.min(85, 40 + Math.abs(pc24)), target: t.priceUsd * 1.15, dir: 'LONG', desc: `V-shape: ${t.symbol} dropped ${pc24.toFixed(1)}% but +${pc1h.toFixed(1)}% (1h)` });
    }
    if (liq > 0 && vol / liq > 5 && dna && dna.whaleScore > 40) {
      sigDefs.push({ type: 'WHALE_MOVEMENT', conf: Math.min(80, 30 + dna.whaleScore), target: pc24 > 0 ? t.priceUsd * 1.1 : t.priceUsd * 0.9, dir: pc24 > 0 ? 'LONG' : 'SHORT', desc: `Whale activity: ${t.symbol} vol/liq ${(vol/liq).toFixed(1)}x` });
    }
    if (pc24 > 20 && mcap > 0 && vol > mcap * 0.1) {
      sigDefs.push({ type: 'BREAKOUT', conf: Math.min(80, 40 + pc24), target: t.priceUsd * (1 + pc24 / 100), dir: 'LONG', desc: `Breakout: ${t.symbol} +${pc24.toFixed(1)}% with strong volume` });
    }
    if (dna && dna.smartMoneyScore > 50 && Math.abs(pc24) < 5 && vol > 50000) {
      sigDefs.push({ type: 'ACCUMULATION_ZONE', conf: Math.min(75, 30 + dna.smartMoneyScore), target: t.priceUsd * 1.25, dir: 'LONG', desc: `Accumulation: ${t.symbol} stable with smart money ${dna.smartMoneyScore.toFixed(0)}` });
    }

    for (const s of sigDefs) {
      try {
        await db.signal.create({
          data: { type: s.type, tokenId: t.id, confidence: s.conf, priceTarget: s.target, direction: s.dir, description: s.desc, metadata: JSON.stringify({ source: 'real-seed', chain: t.chain }) },
        });
        signals++;
      } catch { /* skip */ }
    }
  }

  console.log(`✅ PHASE F COMPLETE: ${signals} signals`);
  return signals;
}

async function main() {
  console.log('🧠 CryptoQuant Terminal — Seed Continuation');
  const start = Date.now();

  try {
    const tokenCount = await db.token.count();
    console.log(`Starting with ${tokenCount} tokens in DB`);

    const enriched = await enrichWithDexScreener();
    const candles = await fetchOHLCV();
    const dna = await computeDNA();
    const lifecycle = await detectLifecycle();
    await createTradingSystems();
    const signals = await generateSignals();

    const duration = Math.round((Date.now() - start) / 1000);

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     ✅ SEED CONTINUATION COMPLETE                       ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`  Enriched: ${enriched} | Candles: ${candles} | DNA: ${dna} | Lifecycle: ${lifecycle} | Signals: ${signals}`);
    console.log(`  Duration: ${duration}s`);

    // Final DB summary
    const counts = await Promise.all([
      db.token.count(),
      db.token.count({ where: { liquidity: { gt: 0 } } }),
      db.priceCandle.count(),
      db.tokenDNA.count(),
      db.signal.count(),
    ]);
    console.log(`\n📊 DB: ${counts[0]} tokens | ${counts[1]} w/ liquidity | ${counts[2]} candles | ${counts[3]} DNA | ${counts[4]} signals`);

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await db.$disconnect();
  }
}

main();
