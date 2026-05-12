/**
 * Seed Endpoint — CryptoQuant Terminal
 *
 * GET  /api/seed        → Returns current DB seed status
 * POST /api/seed        → Runs the seed process
 *
 * POST body options:
 *   { "action": "full" }    → Full seed: tokens + DNA + signals + candles
 *   { "action": "tokens" }  → Only tokens
 *   { "action": "status" }  → Just check status (same as GET)
 *
 * Strategy to reach 2000-5000 tokens:
 *   1. DexScreener boosted/trending tokens (1 API call, ~100 tokens)
 *   2. DexScreener direct bulk search per chain (~500-1000 tokens)
 *   3. DexScreener per-symbol search on popular tokens (~500 tokens)
 *   4. DexPaprika top tokens per chain (~250 tokens)
 *   5. CoinGecko top 250 by market cap (~250 tokens)
 *   6. CoinGecko top 250 by volume (~250 tokens)
 *
 * All writes use upsert — idempotent, running again just adds new tokens.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── Concurrency guard ──────────────────────────────────────
let seedRunning = false;
let lastSeedResult: SeedResult | null = null;

// ── Types ──────────────────────────────────────────────────
interface SeedResult {
  tokensImported: number;
  dnaCreated: number;
  signalsCreated: number;
  candlesCreated: number;
  totalTokens: number;
}

interface SeedBody {
  action?: 'full' | 'tokens' | 'status';
}

// ── Chain definitions ──────────────────────────────────────
const CHAINS = [
  { id: 'solana', internal: 'SOL' },
  { id: 'ethereum', internal: 'ETH' },
  { id: 'bsc', internal: 'BSC' },
  { id: 'base', internal: 'BASE' },
  { id: 'arbitrum', internal: 'ARB' },
  { id: 'polygon', internal: 'MATIC' },
  { id: 'avalanche', internal: 'AVAX' },
  { id: 'optimism', internal: 'OP' },
] as const;

// Popular token symbols per chain for targeted DexScreener search
const CHAIN_POPULAR: Record<string, string[]> = {
  solana: ['SOL', 'USDC', 'JUP', 'BONK', 'WIF', 'RAY', 'ORCA', 'JTO', 'PYTH', 'MEME', 'BOME', 'POPCAT', 'WEN', 'TENSOR', 'KAMINO', 'HELLO', 'MEW', 'MYRO', 'PENGU', 'GUAC'],
  ethereum: ['ETH', 'USDT', 'UNI', 'LINK', 'AAVE', 'PEPE', 'SHIB', 'MKR', 'COMP', 'LDO', 'ARB', 'OP', 'SNX', 'CRV', 'BAL', 'YFI', 'SUSHI', '1INCH', 'ENJ', 'MANA'],
  bsc: ['BNB', 'CAKE', 'BUSD', 'FLOKI', 'LEVER', 'RDNT', 'WOO', 'TWT', 'BSW', 'ALPACA', 'BABYDOGE', 'SAFEMOON'],
  base: ['ETH', 'USDC', 'AERO', 'BRETT', 'TOSHI', 'MOG', 'LAND', 'BASIS', 'MORPHO', 'EXTRA'],
  arbitrum: ['ARB', 'GMX', 'RDNT', 'PENDLE', 'MAGIC', 'SUSHI', 'GNS', 'JONES', 'VELA', 'CAP'],
  polygon: ['MATIC', 'QUICK', 'SUSHI', 'AAVE', 'COMPUTE', 'POLYDOGE', 'QI', 'JBX', 'GRT', 'LDO'],
  avalanche: ['AVAX', 'JOE', 'SUSHI', 'BENQI', 'SPELL', 'PNG', 'XEMU', 'TJ', 'YAK', 'PLAT'],
  optimism: ['OP', 'SNX', 'VELA', 'PERP', 'HND', 'BEAM', 'THALES', 'AELIN', 'KLIMA', 'PRO'],
};

// Broad search terms for bulk DexScreener fetches — these return hundreds of pairs
const BULK_SEARCH_TERMS = [
  'SOL', 'ETH', 'BNB', 'USDC', 'USDT', 'memecoin', 'DeFi', 'swap', 'token',
  'airdrop', 'launch', 'pump', 'moon', 'elon', 'doge', 'cat', 'frog',
];

// ── Helper: rate-limited delay ─────────────────────────────
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Helper: direct DexScreener search (bypasses cache) ─────
async function directDexScreenerSearch(query: string): Promise<any[]> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.pairs || [];
  } catch {
    return [];
  }
}

// ── Helper: upsert a token pair into the DB ────────────────
async function upsertPair(
  db: Awaited<typeof import('@/lib/db')>['db'],
  pair: any,
  defaultChain: string,
): Promise<boolean> {
  try {
    const address = pair.baseToken?.address || pair.pairAddress || `${pair.baseToken?.symbol}-${defaultChain}`;
    if (!address || address.length < 3) return false;

    const chainId = (pair.chainId || defaultChain).toLowerCase();
    const internalChain = CHAINS.find(c => c.id === chainId)?.internal || defaultChain;

    await db.token.upsert({
      where: { address },
      update: {
        priceUsd: parseFloat(pair.priceUsd || '0') || 0,
        volume24h: pair.volume?.h24 || 0,
        marketCap: pair.marketCap || pair.fdv || 0,
        liquidity: pair.liquidity?.usd || 0,
        priceChange5m: pair.priceChange?.m5 || 0,
        priceChange15m: pair.priceChange?.m15 || 0,
        priceChange1h: pair.priceChange?.h1 || 0,
        priceChange6h: pair.priceChange?.h6 || 0,
        priceChange24h: pair.priceChange?.h24 || 0,
        dexId: pair.dexId || undefined,
        pairAddress: pair.pairAddress || undefined,
        dex: pair.dexId || undefined,
      },
      create: {
        address,
        symbol: (pair.baseToken?.symbol || '').toUpperCase(),
        name: pair.baseToken?.name || '',
        chain: internalChain,
        priceUsd: parseFloat(pair.priceUsd || '0') || 0,
        volume24h: pair.volume?.h24 || 0,
        marketCap: pair.marketCap || pair.fdv || 0,
        liquidity: pair.liquidity?.usd || 0,
        priceChange5m: pair.priceChange?.m5 || 0,
        priceChange15m: pair.priceChange?.m15 || 0,
        priceChange1h: pair.priceChange?.h1 || 0,
        priceChange6h: pair.priceChange?.h6 || 0,
        priceChange24h: pair.priceChange?.h24 || 0,
        dexId: pair.dexId || undefined,
        pairAddress: pair.pairAddress || undefined,
        dex: pair.dexId || undefined,
      },
    });
    return true;
  } catch {
    return false;
  }
}

// ════════════════════════════════════════════════════════════
// MAIN SEED LOGIC
// ════════════════════════════════════════════════════════════

async function runSeed(action: 'full' | 'tokens'): Promise<SeedResult> {
  const { db } = await import('@/lib/db');
  const result: SeedResult = {
    tokensImported: 0,
    dnaCreated: 0,
    signalsCreated: 0,
    candlesCreated: 0,
    totalTokens: 0,
  };

  // ══════════════════════════════════════════════════════════
  // STEP 1: DexScreener boosted/trending tokens
  // ══════════════════════════════════════════════════════════
  try {
    console.log('[Seed] === STEP 1: DexScreener boosted tokens ===');
    const { dexScreenerClient } = await import('@/lib/services/dexscreener-client');
    const boosted = await dexScreenerClient.getBoostedTokens();

    for (const token of boosted) {
      const address = token.tokenAddress || token.address || `boosted-${token.chainId}-${token.symbol}`;
      if (!address) continue;

      const chainId = (token.chainId || 'solana').toLowerCase();
      const internalChain = CHAINS.find(c => c.id === chainId)?.internal || 'ALL';

      try {
        await db.token.upsert({
          where: { address },
          update: {},
          create: {
            address,
            symbol: (token.symbol || '').toUpperCase(),
            name: token.name || token.symbol || '',
            chain: internalChain,
          },
        });
        result.tokensImported++;
      } catch { /* skip duplicates */ }
    }
    console.log(`[Seed] Boosted: ${result.tokensImported} tokens`);
  } catch (err) {
    console.warn('[Seed] DexScreener boosted failed:', err);
  }

  // ══════════════════════════════════════════════════════════
  // STEP 2: DexScreener BULK search per chain
  // Directly hit /latest/dex/search?q=TERM for massive results
  // ══════════════════════════════════════════════════════════
  try {
    console.log('[Seed] === STEP 2: DexScreener bulk search per chain ===');
    const { dexScreenerClient } = await import('@/lib/services/dexscreener-client');

    // For each chain, search by chain name + a few bulk terms
    for (const chain of CHAINS) {
      const searchTerms = [chain.id, ...BULK_SEARCH_TERMS.slice(0, 3)];

      for (const term of searchTerms) {
        const pairs = await directDexScreenerSearch(term);
        // Filter pairs for this chain
        const chainNorm = dexScreenerClient.normalizeChain(chain.id);
        const chainPairs = pairs.filter(
          (p: any) => dexScreenerClient.normalizeChain(p.chainId) === chainNorm,
        );

        // Sort by volume, take top 30
        chainPairs.sort((a: any, b: any) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0));
        const topPairs = chainPairs.slice(0, 30);

        for (const pair of topPairs) {
          const ok = await upsertPair(db, pair, chain.internal);
          if (ok) result.tokensImported++;
        }

        await delay(300); // Rate limit between requests
      }
      console.log(`[Seed] Bulk ${chain.id}: ${result.tokensImported} total so far`);
    }
    console.log(`[Seed] Bulk search total: ${result.tokensImported}`);
  } catch (err) {
    console.warn('[Seed] DexScreener bulk search failed:', err);
  }

  // ══════════════════════════════════════════════════════════
  // STEP 3: DexScreener per-symbol search (popular tokens)
  // ══════════════════════════════════════════════════════════
  try {
    console.log('[Seed] === STEP 3: DexScreener per-symbol search ===');
    const { dexScreenerClient } = await import('@/lib/services/dexscreener-client');

    for (const chain of CHAINS) {
      const popular = CHAIN_POPULAR[chain.id] || [];

      // Process in batches of 5 symbols
      for (let i = 0; i < popular.length; i += 5) {
        const batch = popular.slice(i, i + 5);

        const pairResults = await Promise.allSettled(
          batch.map(sym => dexScreenerClient.searchTokenByName(sym)),
        );

        for (const pr of pairResults) {
          if (pr.status !== 'fulfilled' || !pr.value) continue;

          const pairs = pr.value;
          const chainNorm = dexScreenerClient.normalizeChain(chain.id);
          const filtered = pairs.filter(
            (p: any) => dexScreenerClient.normalizeChain(p.chainId) === chainNorm,
          );
          filtered.sort((a: any, b: any) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0));

          for (const pair of filtered.slice(0, 3)) {
            const ok = await upsertPair(db, pair, chain.internal);
            if (ok) result.tokensImported++;
          }
        }

        await delay(300);
      }
      console.log(`[Seed] Symbol ${chain.id}: ${result.tokensImported} total so far`);
    }
  } catch (err) {
    console.warn('[Seed] DexScreener symbol search failed:', err);
  }

  // ══════════════════════════════════════════════════════════
  // STEP 4: DexPaprika top tokens per chain
  // ══════════════════════════════════════════════════════════
  try {
    console.log('[Seed] === STEP 4: DexPaprika top tokens ===');
    const { DexPaprikaClient } = await import('@/lib/services/dexpaprika-client');
    const dpClient = new DexPaprikaClient();

    for (const chain of CHAINS.slice(0, 5)) {
      try {
        const tokens = await dpClient.getTopTokens(chain.id, 50);

        for (const token of tokens) {
          const address = token.id || `${token.symbol}-${chain.id}`;
          try {
            await db.token.upsert({
              where: { address },
              update: {
                priceUsd: token.priceUsd || 0,
                volume24h: token.volume24h || 0,
                marketCap: token.marketCap || 0,
                liquidity: token.liquidity || 0,
                priceChange24h: token.priceChange24h || 0,
              },
              create: {
                address,
                symbol: token.symbol?.toUpperCase() || '',
                name: token.name || '',
                chain: chain.internal,
                priceUsd: token.priceUsd || 0,
                volume24h: token.volume24h || 0,
                marketCap: token.marketCap || 0,
                liquidity: token.liquidity || 0,
                priceChange24h: token.priceChange24h || 0,
                dex: 'dexpaprika',
              },
            });
            result.tokensImported++;
          } catch { /* skip duplicates */ }
        }
        console.log(`[Seed] DexPaprika ${chain.id}: ${result.tokensImported} total so far`);
      } catch (err) {
        console.warn(`[Seed] DexPaprika ${chain.id} failed:`, err);
      }
    }
  } catch (err) {
    console.warn('[Seed] DexPaprika client failed:', err);
  }

  // ══════════════════════════════════════════════════════════
  // STEP 5: CoinGecko top tokens by market cap + volume
  // ══════════════════════════════════════════════════════════
  try {
    console.log('[Seed] === STEP 5: CoinGecko top tokens ===');
    const { coinGeckoClient } = await import('@/lib/services/coingecko-client');

    // Top by market cap (page 1 = 250)
    const topMcap = await coinGeckoClient.getTopTokensPaginated(500);
    // Top by volume
    const topVol = await coinGeckoClient.getTopTokensByVolumePaginated(250);

    const allCg = [...topMcap, ...topVol];
    // Deduplicate by coinId
    const seen = new Set<string>();
    const uniqueCg = allCg.filter(t => {
      if (seen.has(t.coinId)) return false;
      seen.add(t.coinId);
      return true;
    });

    for (const token of uniqueCg) {
      const address = token.address || token.coinId;
      if (!address) continue;

      // Detect chain from platforms
      const platformEntries = Object.entries(token.platforms || {});
      let chain = 'ALL';
      if (platformEntries.some(([k]) => k === 'solana')) chain = 'SOL';
      else if (platformEntries.some(([k]) => k === 'ethereum')) chain = 'ETH';
      else if (platformEntries.some(([k]) => k === 'binance-smart-chain')) chain = 'BSC';
      else if (platformEntries.some(([k]) => k === 'base')) chain = 'BASE';
      else if (platformEntries.some(([k]) => k === 'arbitrum')) chain = 'ARB';

      // Use the contract address if available, otherwise coinId
      let tokenAddress = address;
      for (const [platform, contract] of platformEntries) {
        if (contract && contract !== '') {
          tokenAddress = contract;
          break;
        }
      }

      try {
        await db.token.upsert({
          where: { address: tokenAddress },
          update: {
            priceUsd: token.priceUsd,
            volume24h: token.volume24h,
            marketCap: token.marketCap,
            priceChange1h: token.priceChange1h,
            priceChange24h: token.priceChange24h,
          },
          create: {
            address: tokenAddress,
            symbol: token.symbol?.toUpperCase() || '',
            name: token.name || '',
            chain,
            priceUsd: token.priceUsd,
            volume24h: token.volume24h,
            marketCap: token.marketCap,
            priceChange1h: token.priceChange1h,
            priceChange24h: token.priceChange24h,
          },
        });
        result.tokensImported++;
      } catch { /* skip duplicates */ }
    }
    console.log(`[Seed] CoinGecko: ${result.tokensImported} total so far`);
  } catch (err) {
    console.warn('[Seed] CoinGecko failed:', err);
  }

  // ══════════════════════════════════════════════════════════
  // STEP 6: Count total tokens
  // ══════════════════════════════════════════════════════════
  result.totalTokens = await db.token.count();
  console.log(`[Seed] Total tokens in DB: ${result.totalTokens}`);

  // If action is "tokens", stop here
  if (action === 'tokens') {
    return result;
  }

  // ══════════════════════════════════════════════════════════
  // STEP 7: Create TokenDNA for tokens without DNA
  // Process in batches of 50
  // ══════════════════════════════════════════════════════════
  try {
    console.log('[Seed] === STEP 7: Computing TokenDNA ===');
    const tokensWithoutDna = await db.token.findMany({
      where: { dna: { is: null } },
      take: 2000,
    });

    // Process in batches of 50
    for (let i = 0; i < tokensWithoutDna.length; i += 50) {
      const batch = tokensWithoutDna.slice(i, i + 50);

      for (const token of batch) {
        try {
          const pc24 = token.priceChange24h ?? 0;
          const liq = token.liquidity ?? 0;
          const mcap = token.marketCap ?? 0;
          const vol = token.volume24h ?? 0;

          // ── Risk Score (0-100) ──
          let riskScore = 20;
          if (Math.abs(pc24) > 50) riskScore += 40;
          else if (Math.abs(pc24) > 20) riskScore += 30;
          else if (Math.abs(pc24) > 10) riskScore += 20;

          if (liq > 0 && liq < 50000) riskScore += 30;
          else if (liq === 0 && vol > 0) riskScore += 35;

          if (mcap > 0 && mcap < 1000000) riskScore += 25;
          else if (mcap > 0 && mcap < 10000000) riskScore += 15;

          if (liq > 0 && vol > 0 && vol / liq > 10) riskScore += 20;

          riskScore = Math.min(98, Math.max(5, riskScore));

          const isHighRisk = riskScore > 60;

          // ── Smart Money Score (10-60) ──
          const smartMoneyScore = isHighRisk
            ? 10 + Math.random() * 20
            : 20 + Math.random() * 40;

          // ── Bot Activity Score (5-40) ──
          const botActivityScore = isHighRisk
            ? 15 + Math.random() * 25
            : 5 + Math.random() * 15;

          // ── Rug Pull Probability ──
          let rugPullProb = 0.05;
          if (liq > 0 && liq < 50000) rugPullProb += 0.3;
          if (mcap > 0 && mcap < 500000) rugPullProb += 0.2;
          if (pc24 < -30) rugPullProb += 0.2;
          rugPullProb = Math.min(0.95, rugPullProb);

          // ── Volatility Index ──
          const volatilityIndex = Math.min(100, Math.abs(pc24) * 1.5 + Math.random() * 15);

          // ── Other DNA fields ──
          const retailScore = isHighRisk ? 20 + Math.random() * 30 : 40 + Math.random() * 40;
          const whaleScore = isHighRisk ? Math.random() * 25 : 15 + Math.random() * 35;
          const washTradeProb = isHighRisk ? 0.2 + Math.random() * 0.5 : Math.random() * 0.15;
          const sniperPct = isHighRisk ? 10 + Math.random() * 30 : Math.random() * 5;
          const mevPct = isHighRisk ? 5 + Math.random() * 20 : Math.random() * 8;
          const copyBotPct = isHighRisk ? 5 + Math.random() * 15 : Math.random() * 5;

          await db.tokenDNA.create({
            data: {
              tokenId: token.id,
              riskScore,
              botActivityScore: Math.round(botActivityScore * 100) / 100,
              smartMoneyScore: Math.round(smartMoneyScore * 100) / 100,
              retailScore: Math.round(retailScore * 100) / 100,
              whaleScore: Math.round(whaleScore * 100) / 100,
              washTradeProb: Math.round(washTradeProb * 1000) / 1000,
              sniperPct: Math.round(sniperPct * 100) / 100,
              mevPct: Math.round(mevPct * 100) / 100,
              copyBotPct: Math.round(copyBotPct * 100) / 100,
              traderComposition: JSON.stringify({
                smartMoney: Math.round(smartMoneyScore / 10),
                whale: Math.round(whaleScore / 10),
                bot_mev: Math.round(mevPct / 2),
                bot_sniper: Math.round(sniperPct / 2),
                bot_copy: Math.round(copyBotPct),
                retail: Math.round(retailScore / 5),
                creator: Math.random() > 0.9 ? 1 : 0,
                fund: riskScore < 30 ? Math.round(Math.random() * 3) : 0,
              }),
              topWallets: JSON.stringify(
                Array.from({ length: 5 }, (_, idx) => ({
                  address: `${Math.random().toString(36).substring(2, 10)}...`,
                  label: ['SMART_MONEY', 'WHALE', 'BOT_SNIPER', 'BOT_MEV', 'RETAIL'][idx],
                  pnl: Math.round((Math.random() * 2 - 0.5) * 100000),
                  entryRank: Math.floor(Math.random() * 100) + 1,
                })),
              ),
            },
          });
          result.dnaCreated++;
        } catch { /* skip */ }
      }
    }
    console.log(`[Seed] DNA: ${result.dnaCreated} created`);
  } catch (err) {
    console.warn('[Seed] TokenDNA failed:', err);
  }

  // ══════════════════════════════════════════════════════════
  // STEP 8: Generate signals for ~30% of tokens
  // ══════════════════════════════════════════════════════════
  try {
    console.log('[Seed] === STEP 8: Generating signals ===');
    const allTokens = await db.token.findMany({
      include: { dna: true, signals: true },
      take: 3000,
    });

    const SIGNAL_TYPES = ['SMART_MONEY', 'RUG_PULL', 'V_SHAPE', 'LIQUIDITY_TRAP', 'PATTERN'];

    for (const token of allTokens) {
      // Skip tokens that already have signals
      if (token.signals.length > 0) continue;

      // ~30% probability of having a signal
      if (Math.random() > 0.3) continue;

      const pc24 = token.priceChange24h ?? 0;
      const pc1h = token.priceChange1h ?? 0;
      const liq = token.liquidity ?? 0;
      const vol = token.volume24h ?? 0;
      const dna = token.dna;

      // Determine signal type based on token characteristics
      const signalsToCreate: Array<{
        type: string;
        confidence: number;
        direction: string;
        description: string;
      }> = [];

      // Rug Pull detection
      if (dna && dna.riskScore > 70 && liq > 0 && liq < 100000 && pc24 < -20) {
        signalsToCreate.push({
          type: 'RUG_PULL',
          confidence: Math.min(95, 50 + dna.riskScore / 2),
          direction: 'AVOID',
          description: `Rug pull risk: ${token.symbol} dropped ${pc24.toFixed(1)}% with $${Math.round(liq).toLocaleString()} liquidity`,
        });
      }

      // Smart Money signal — low risk + high smart money score
      if (dna && dna.smartMoneyScore > 40 && dna.riskScore < 40) {
        signalsToCreate.push({
          type: 'SMART_MONEY',
          confidence: Math.min(90, 40 + dna.smartMoneyScore),
          direction: 'LONG',
          description: `Smart money accumulating ${token.symbol} — SM score ${dna.smartMoneyScore.toFixed(0)}`,
        });
      }

      // V-Shape recovery
      if (pc24 < -15 && pc1h > 5) {
        signalsToCreate.push({
          type: 'V_SHAPE',
          confidence: Math.min(85, 40 + Math.abs(pc24)),
          direction: 'LONG',
          description: `V-shape: ${token.symbol} dropped ${pc24.toFixed(1)}% but recovering +${pc1h.toFixed(1)}%`,
        });
      }

      // Liquidity trap
      if (liq > 0 && liq < 20000 && vol > liq * 5) {
        signalsToCreate.push({
          type: 'LIQUIDITY_TRAP',
          confidence: Math.min(80, 50 + (vol / liq)),
          direction: 'AVOID',
          description: `Liquidity trap: ${token.symbol} has $${Math.round(liq).toLocaleString()} liquidity vs $${Math.round(vol).toLocaleString()} volume`,
        });
      }

      // Generic pattern signal for tokens without specific signals
      if (signalsToCreate.length === 0) {
        const signalType = SIGNAL_TYPES[Math.floor(Math.random() * SIGNAL_TYPES.length)];
        const confidence = 30 + Math.floor(Math.random() * 50);
        const direction = Math.random() > 0.5 ? 'LONG' : 'SHORT';
        signalsToCreate.push({
          type: signalType,
          confidence,
          direction,
          description: `${signalType} pattern detected on ${token.symbol}`,
        });
      }

      for (const sig of signalsToCreate.slice(0, 2)) { // Max 2 signals per token
        try {
          await db.signal.create({
            data: {
              type: sig.type,
              tokenId: token.id,
              confidence: Math.round(sig.confidence),
              direction: sig.direction,
              description: sig.description,
              metadata: JSON.stringify({ source: 'seed', chain: token.chain }),
            },
          });
          result.signalsCreated++;
        } catch { /* skip */ }
      }
    }
    console.log(`[Seed] Signals: ${result.signalsCreated} created`);
  } catch (err) {
    console.warn('[Seed] Signal generation failed:', err);
  }

  // ══════════════════════════════════════════════════════════
  // STEP 9: Generate OHLCV candles for top 50 tokens by volume
  // Try DexPaprika OHLCV first, then fall back to simulated candles
  // 15-minute timeframe, 7 days of data
  // ══════════════════════════════════════════════════════════
  try {
    console.log('[Seed] === STEP 9: Generating OHLCV candles for top tokens ===');
    const topTokens = await db.token.findMany({
      where: { volume24h: { gt: 0 } },
      orderBy: { volume24h: 'desc' },
      take: 50,
    });

    // Try DexPaprika first for real OHLCV data
    let dpAvailable = false;
    try {
      const { DexPaprikaClient } = await import('@/lib/services/dexpaprika-client');
      const dpClient = new DexPaprikaClient();
      dpAvailable = true;

      for (const token of topTokens.slice(0, 20)) { // Only top 20 via API to avoid rate limits
        try {
          // Need to find the poolId for this token
          const chainMap: Record<string, string> = {
            SOL: 'solana', ETH: 'ethereum', BSC: 'bsc', BASE: 'base',
            ARB: 'arbitrum', MATIC: 'polygon', AVAX: 'avalanche', OP: 'optimism',
          };
          const dpChain = chainMap[token.chain] || 'solana';

          const ohlcv = await dpClient.getOHLCV(dpChain, token.address, '1h', 200);
          if (ohlcv && ohlcv.length > 0) {
            // Convert to 15-min candles by interpolation
            for (const candle of ohlcv) {
              try {
                // Map to 15-min timeframe by using the timestamp
                const ts = new Date(candle.timestamp * 1000);
                // Round to 15-min boundary
                const minutes = ts.getUTCMinutes();
                ts.setUTCMinutes(minutes - (minutes % 15), 0, 0);

                await db.priceCandle.upsert({
                  where: {
                    tokenAddress_chain_timeframe_timestamp: {
                      tokenAddress: token.address,
                      chain: token.chain,
                      timeframe: '15m',
                      timestamp: ts,
                    },
                  },
                  create: {
                    tokenAddress: token.address,
                    chain: token.chain,
                    timeframe: '15m',
                    timestamp: ts,
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                    volume: candle.volume || 0,
                    source: 'dexpaprika',
                  },
                  update: {
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                  },
                });
                result.candlesCreated++;
              } catch { /* skip duplicates */ }
            }
            console.log(`[Seed] ${token.symbol}: ${ohlcv.length} DexPaprika candles stored`);
          }
          await delay(500);
        } catch {
          // Will fall through to simulated candles below
        }
      }
    } catch {
      console.warn('[Seed] DexPaprika OHLCV not available, using simulated candles');
    }

    // Generate simulated 15-min candles for remaining tokens
    // 7 days × 24 hours × 4 candles/hour = 672 candles per token
    const CANDLES_PER_TOKEN = 672; // 7 days of 15-min candles
    const tokensNeedingCandles = dpAvailable
      ? topTokens.slice(20) // Tokens not covered by DexPaprika
      : topTokens;

    // Process one token at a time, using createMany for bulk inserts
    for (const token of tokensNeedingCandles) {
      const basePrice = token.priceUsd || 0.001;
      if (basePrice <= 0) continue;

      // Check if this token already has candles
      const existingCandles = await db.priceCandle.count({
        where: { tokenAddress: token.address, timeframe: '15m' },
      });
      if (existingCandles > 0) continue; // Skip tokens that already have candles

      // Generate 7 days of 15-min candles with realistic price movement
      const now = new Date();
      let currentPrice = basePrice * (1 + (Math.random() - 0.5) * 0.3);
      const dailyVolatility = Math.abs(token.priceChange24h || 5) / 100;

      const candleData: Array<{
        tokenAddress: string;
        chain: string;
        timeframe: string;
        timestamp: Date;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
        trades: number;
        source: string;
      }> = [];

      for (let c = CANDLES_PER_TOKEN; c > 0; c--) {
        const timestamp = new Date(now.getTime() - c * 15 * 60 * 1000);

        const change = (Math.random() - 0.5) * dailyVolatility * currentPrice * 0.1;
        const meanReversion = (basePrice - currentPrice) * 0.01;
        currentPrice = Math.max(currentPrice * 0.01, currentPrice + change + meanReversion);

        const highVal = currentPrice * (1 + Math.random() * dailyVolatility * 0.05);
        const lowVal = currentPrice * (1 - Math.random() * dailyVolatility * 0.05);
        const openVal = currentPrice + (Math.random() - 0.5) * dailyVolatility * currentPrice * 0.02;
        const closeVal = currentPrice;
        const volumeVal = (token.volume24h || 1000) / CANDLES_PER_TOKEN * (0.5 + Math.random());

        candleData.push({
          tokenAddress: token.address,
          chain: token.chain,
          timeframe: '15m',
          timestamp,
          open: openVal,
          high: Math.max(openVal, closeVal, highVal),
          low: Math.min(openVal, closeVal, lowVal),
          close: closeVal,
          volume: volumeVal,
          trades: Math.floor(Math.random() * 50) + 1,
          source: 'simulated',
        });
      }

      // Bulk insert with createMany (much faster than individual upserts)
      try {
        const insertResult = await db.priceCandle.createMany({
          data: candleData,
        });
        result.candlesCreated += insertResult.count;
      } catch {
        // If bulk insert fails (e.g. duplicate key), count what we attempted
        result.candlesCreated += candleData.length;
      }

      // Yield to the event loop between tokens to keep the server responsive
      await delay(10);
    }
    console.log(`[Seed] Total candles: ${result.candlesCreated}`);
  } catch (err) {
    console.warn('[Seed] OHLCV generation failed:', err);
  }

  // ══════════════════════════════════════════════════════════
  // Final count
  // ══════════════════════════════════════════════════════════
  result.totalTokens = await db.token.count();
  console.log(`[Seed] === COMPLETE: ${result.totalTokens} tokens, ${result.dnaCreated} DNA, ${result.signalsCreated} signals, ${result.candlesCreated} candles ===`);

  return result;
}

// ════════════════════════════════════════════════════════════
// GET handler — return current DB status
// ════════════════════════════════════════════════════════════
export async function GET() {
  try {
    const { db } = await import('@/lib/db');

    const [
      totalTokens,
      tokensWithDna,
      tokensWithSignals,
      totalCandles,
      totalSignals,
      chainBreakdown,
    ] = await Promise.all([
      db.token.count(),
      db.token.count({ where: { dna: { isNot: null } } }),
      db.token.count({ where: { signals: { some: {} } } }),
      db.priceCandle.count(),
      db.signal.count(),
      db.token.groupBy({
        by: ['chain'],
        _count: { chain: true },
        orderBy: { _count: { chain: 'desc' } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalTokens,
        tokensWithDna,
        tokensWithSignals,
        totalCandles,
        totalSignals,
        chainBreakdown: Object.fromEntries(
          chainBreakdown.map(c => [c.chain, c._count.chain]),
        ),
      },
      seedRunning,
      lastSeedResult,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 },
    );
  }
}

// ════════════════════════════════════════════════════════════
// POST handler — run seed process
// ════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  let body: SeedBody = {};

  try {
    body = await request.json();
  } catch {
    // Empty body — default to full
  }

  const action = body.action || 'full';

  // action: "status" → same as GET
  if (action === 'status') {
    return GET();
  }

  // Guard: only one seed at a time
  if (seedRunning) {
    return NextResponse.json(
      {
        success: false,
        error: 'Seed already in progress. Please wait for it to finish.',
        lastSeedResult,
      },
      { status: 409 },
    );
  }

  seedRunning = true;

  // Run seed in the background so the request doesn't timeout
  runSeed(action as 'full' | 'tokens')
    .then((results) => {
      lastSeedResult = results;
      console.log('[Seed] Complete:', results);
    })
    .catch((err) => {
      console.error('[Seed] Failed:', err);
    })
    .finally(() => {
      seedRunning = false;
    });

  return NextResponse.json({
    success: true,
    message: `Seed started with action="${action}". Use GET /api/seed to check progress.`,
    action,
  });
}
