/**
 * Seed Endpoint — CryptoQuant Terminal
 *
 * GET  /api/seed        → Returns current DB seed status
 * POST /api/seed        → Runs the seed process
 *
 * POST body options:
 *   { "action": "full" }     → Full seed: tokens + DNA + signals + candles + traders + patterns + models
 *   { "action": "tokens" }   → Only tokens (Steps 1-6)
 *   { "action": "traders" }  → Only traders + transactions + behavior patterns + holdings + cross-chain wallets + label assignments + behavioral models (Steps 10, 12)
 *   { "action": "patterns" } → Only pattern rules (Step 11)
 *   { "action": "status" }   → Just check status (same as GET)
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
  // Step 10: Trader seeding
  tradersCreated: number;
  traderTransactionsCreated: number;
  traderBehaviorPatternsCreated: number;
  walletTokenHoldingsCreated: number;
  crossChainWalletsCreated: number;
  traderLabelAssignmentsCreated: number;
  // Step 11: Pattern seeding
  patternRulesCreated: number;
  // Step 12: Behavioral model
  behaviorModelsInitialized: number;
}

type SeedAction = 'full' | 'tokens' | 'traders' | 'patterns' | 'status';

interface SeedBody {
  action?: SeedAction;
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

async function runSeed(action: SeedAction): Promise<SeedResult> {
  const { db } = await import('@/lib/db');

  // ── Shared helpers for seeding ──
  function randRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
  function randInt(min: number, max: number): number {
    return Math.floor(randRange(min, max + 1));
  }
  function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  const result: SeedResult = {
    tokensImported: 0,
    dnaCreated: 0,
    signalsCreated: 0,
    candlesCreated: 0,
    totalTokens: 0,
    tradersCreated: 0,
    traderTransactionsCreated: 0,
    traderBehaviorPatternsCreated: 0,
    walletTokenHoldingsCreated: 0,
    crossChainWalletsCreated: 0,
    traderLabelAssignmentsCreated: 0,
    patternRulesCreated: 0,
    behaviorModelsInitialized: 0,
  };

  // ── Action-based step skipping ──
  // 'traders'  → skip to Step 10 (traders + related) then Step 12 (behavioral models)
  // 'patterns' → skip to Step 11 (pattern rules)
  // 'full'     → run everything (Steps 1-12)
  // 'tokens'   → run Steps 1-6 only
  const skipToTraders = action === 'traders';
  const skipToPatterns = action === 'patterns';

  // ══════════════════════════════════════════════════════════
  // STEP 1: DexScreener boosted/trending tokens
  // ══════════════════════════════════════════════════════════
  if (!skipToTraders && !skipToPatterns) {
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
  }

  // ══════════════════════════════════════════════════════════
  // STEP 2: DexScreener BULK search per chain
  // ══════════════════════════════════════════════════════════
  if (!skipToTraders && !skipToPatterns) {
    try {
      console.log('[Seed] === STEP 2: DexScreener bulk search per chain ===');
      const { dexScreenerClient } = await import('@/lib/services/dexscreener-client');

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
  }

  // ══════════════════════════════════════════════════════════
  // STEP 3: DexScreener per-symbol search (popular tokens)
  // ══════════════════════════════════════════════════════════
  if (!skipToTraders && !skipToPatterns) {
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
  }

  // ══════════════════════════════════════════════════════════
  // STEP 4: DexPaprika top tokens per chain
  // ══════════════════════════════════════════════════════════
  if (!skipToTraders && !skipToPatterns) {
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
  }

  // ══════════════════════════════════════════════════════════
  // STEP 5: CoinGecko top tokens by market cap + volume
  // ══════════════════════════════════════════════════════════
  if (!skipToTraders && !skipToPatterns) {
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
  }

  // ══════════════════════════════════════════════════════════
  // STEP 6: Count total tokens
  // ══════════════════════════════════════════════════════════
  if (!skipToTraders && !skipToPatterns) {
    result.totalTokens = await db.token.count();
    console.log(`[Seed] Total tokens in DB: ${result.totalTokens}`);

    // If action is "tokens", stop here
    if (action === 'tokens') {
      return result;
    }
  }

  // ══════════════════════════════════════════════════════════
  // STEP 7: Create TokenDNA for tokens without DNA
  // ══════════════════════════════════════════════════════════
  if (!skipToTraders && !skipToPatterns) {
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
  }

  // ══════════════════════════════════════════════════════════
  // STEP 8: Generate signals for ~30% of tokens
  // ══════════════════════════════════════════════════════════
  if (!skipToTraders && !skipToPatterns) {
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
  }

  // ══════════════════════════════════════════════════════════
  // STEP 9: Generate OHLCV candles for top 50 tokens by volume
  // ══════════════════════════════════════════════════════════
  if (!skipToTraders && !skipToPatterns) {
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
  }

  // ══════════════════════════════════════════════════════════
  // STEP 10: Seed Traders + related records
  // ══════════════════════════════════════════════════════════
  if (!skipToPatterns) {
    try {
      console.log('[Seed] === STEP 10: Seeding Traders ===');

      // Only seed if no traders exist
      const existingTraders = await db.trader.count();
      if (existingTraders > 0) {
        console.log(`[Seed] Traders already exist (${existingTraders}), skipping`);
      } else {
        // Get existing tokens for linking
        const existingTokens = await db.token.findMany({
          select: { address: true, symbol: true, chain: true, priceUsd: true },
          take: 500,
        });
        const tokenAddresses = existingTokens.map(t => t.address);

        if (tokenAddresses.length === 0) {
          console.log('[Seed] No tokens in DB, skipping trader seeding');
        } else {
          // ── Helper generators ──
          const CHAIN_LIST = ['solana', 'ethereum', 'base', 'arbitrum'];
          const CHAIN_INTERNAL = ['SOL', 'ETH', 'BASE', 'ARB'];

          function randomSolAddress(): string {
            // Base58 chars for Solana
            const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
            let addr = '';
            for (let i = 0; i < 44; i++) addr += chars[Math.floor(Math.random() * chars.length)];
            return addr;
          }

          function randomEthAddress(): string {
            return '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
          }

          function randomTxHash(chain: string): string {
            if (chain === 'SOL') {
              const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
              let hash = '';
              for (let i = 0; i < 88; i++) hash += chars[Math.floor(Math.random() * chars.length)];
              return hash;
            }
            return '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
          }

          const PRIMARY_LABELS = [
            'SMART_MONEY', 'WHALE', 'SNIPER', 'BOT_MEV', 'BOT_SNIPER',
            'BOT_COPY', 'BOT_ARBITRAGE', 'RETAIL', 'DEGEN', 'SCALPER',
            'YIELD_FARMER', 'AIRDROP_HUNTER', 'NFT_FLIPPER', 'INFLUENCER',
            'BRIDGE_HOPPER', 'FUND', 'CREATOR',
          ];

          const BEHAVIOR_PATTERNS = [
            'ACCUMULATOR', 'DUMPER', 'SCALPER', 'SWING_TRADER', 'DIAMOND_HANDS',
            'MOMENTUM_RIDER', 'CONTRARIAN', 'SNIPER_ENTRY', 'COPY_CAT',
            'YIELD_FARMER', 'BRIDGE_HOPPER', 'MEV_EXTRACTOR',
          ];

          const TRADER_LABELS = [
            'early_investor', 'dex_whale', 'nft_whale', 'defi_degen',
            'airdrop_farmer', 'mev_operator', 'bridge_user', 'yield_optimizer',
            'token_sniper', 'whale_tracker', 'copy_trader', 'wash_trader_suspect',
            'smart_money_verified', 'influencer_wallet', 'fund_wallet',
          ];

          const DEX_LIST = ['raydium', 'uniswap', 'orca', 'jupiter', 'meteora', 'sushi', 'camelot', 'aerodrome', 'pancake', '1inch'];
          const QUOTE_TOKENS = ['SOL', 'USDC', 'ETH', 'WETH', 'USDT'];

          const TOTAL_TRADERS = 750; // 500-1000 range
          const TRADER_BATCH_SIZE = 25; // Smaller batches to avoid timeout
          const createdTraderIds: string[] = [];
          const createdTraderAddresses: string[] = [];

          // ── Generate Traders in smaller batches with progress tracking ──
          for (let batch = 0; batch < TOTAL_TRADERS; batch += TRADER_BATCH_SIZE) {
            const batchSize = Math.min(TRADER_BATCH_SIZE, TOTAL_TRADERS - batch);

            for (let i = 0; i < batchSize; i++) {
              const isBot = Math.random() < 0.15;
              const isSmartMoney = !isBot && Math.random() < 0.20;
              const isWhale = !isBot && Math.random() < 0.10;
              const isSniper = Math.random() < 0.08;

              // Pick chain
              const chainIdx = randInt(0, CHAIN_LIST.length - 1);
              const chain = CHAIN_LIST[chainIdx];
              const chainInternal = CHAIN_INTERNAL[chainIdx];

              // Generate address based on chain
              const address = (chain === 'solana') ? randomSolAddress() : randomEthAddress();

              // Primary label
              let primaryLabel: string;
              if (isBot) {
                primaryLabel = pickRandom(['BOT_MEV', 'BOT_SNIPER', 'BOT_COPY', 'BOT_ARBITRAGE']);
              } else if (isSmartMoney) {
                primaryLabel = 'SMART_MONEY';
              } else if (isWhale) {
                primaryLabel = 'WHALE';
              } else if (isSniper) {
                primaryLabel = 'SNIPER';
              } else {
                primaryLabel = pickRandom(PRIMARY_LABELS.filter(l => !l.startsWith('BOT_')));
              }

              // Bot-specific fields
              let botType: string | null = null;
              let botConfidence = 0;
              let isActive247 = false;
              const botDetectionSignals: string[] = [];

              if (isBot) {
                botType = pickRandom(['MEV_EXTRACTOR', 'SNIPER_BOT', 'COPY_BOT', 'ARBITRAGE_BOT', 'SANDWICH_BOT', 'SCALPER_BOT', 'FRONT_RUN_BOT', 'JUST_IN_TIME_BOT']);
                botConfidence = Math.round(randRange(0.6, 0.99) * 100) / 100;
                isActive247 = true;
                botDetectionSignals.push(pickRandom(['consistent_timing', 'no_slippage', 'priority_fee_pattern', 'jit_liquidity', 'sandwich_pattern', 'rapid_execution']));
              }

              // Scores
              const smartMoneyScore = isSmartMoney ? Math.round(randRange(60, 95) * 100) / 100 : Math.round(randRange(0, 40) * 100) / 100;
              const whaleScore = isWhale ? Math.round(randRange(70, 99) * 100) / 100 : Math.round(randRange(0, 40) * 100) / 100;
              const sniperScore = isSniper ? Math.round(randRange(60, 95) * 100) / 100 : Math.round(randRange(0, 20) * 100) / 100;

              // Performance metrics
              const winRate = isBot ? Math.round(randRange(0.55, 0.8) * 100) / 100 : Math.round(randRange(0.2, 0.65) * 100) / 100;
              const totalPnl = Math.round(randRange(-50000, 500000) * 100) / 100;
              const totalVolumeUsd = Math.round(randRange(10000, 10000000) * 100) / 100;
              const avgTradeSizeUsd = Math.round((totalVolumeUsd / randInt(50, 2000)) * 100) / 100;
              const largestTradeUsd = Math.round(avgTradeSizeUsd * randRange(3, 20) * 100) / 100;
              const totalTrades = randInt(20, 5000);

              // Behavioral metrics
              const washTradeScore = isBot ? Math.round(randRange(0.2, 0.8) * 100) / 100 : Math.round(randRange(0, 0.15) * 100) / 100;
              const copyTradeScore = Math.round(randRange(0, 0.2) * 100) / 100;
              const mevExtractionUsd = (isBot && botType === 'MEV_EXTRACTOR') ? Math.round(randRange(1000, 50000) * 100) / 100 : 0;

              // Timing patterns
              const peakHours = Array.from({ length: randInt(3, 8) }, () => randInt(0, 23));
              const tradingHourPattern = JSON.stringify({ peakHours: [...new Set(peakHours)], timezone: 'UTC' });
              const tradingDayPattern = JSON.stringify(Array.from({ length: 7 }, () => Math.round(randRange(0.1, 1) * 100) / 100));
              const avgTimeBetweenTrades = isBot ? randRange(0.1, 10) : randRange(30, 1440);

              // Portfolio profile
              const uniqueTokensTraded = randInt(5, 200);
              const preferredChains = JSON.stringify([chainInternal]);
              const preferredDexes = JSON.stringify([pickRandom(DEX_LIST)]);
              const preferredTokenTypes = JSON.stringify([pickRandom(['MEME', 'DEFI', 'NFT', 'L1', 'L2', 'STABLE', 'BRIDGE'])]);

              // Smart money specific
              const earlyEntryCount = isSmartMoney ? randInt(5, 50) : randInt(0, 5);
              const avgEntryRank = isSmartMoney ? randRange(1, 20) : randRange(20, 500);
              const avgExitMultiplier = isSmartMoney ? Math.round(randRange(2, 15) * 100) / 100 : Math.round(randRange(0.5, 3) * 100) / 100;
              const topCallCount = isSmartMoney ? randInt(10, 100) : randInt(0, 20);
              const worstCallCount = isSmartMoney ? randInt(2, 20) : randInt(5, 50);

              // Whale specific
              const totalHoldingsUsd = isWhale ? Math.round(randRange(500000, 50000000) * 100) / 100 : Math.round(randRange(100, 500000) * 100) / 100;
              const avgPositionUsd = Math.round((totalHoldingsUsd / randInt(3, 30)) * 100) / 100;
              const priceImpactAvg = isWhale ? Math.round(randRange(0.5, 5) * 100) / 100 : Math.round(randRange(0, 0.5) * 100) / 100;

              // Sniper specific
              const avgBlockToTrade = isSniper ? randRange(0, 3) : randRange(10, 500);
              const block0EntryCount = isSniper ? randInt(5, 50) : 0;

              // Other metrics
              const avgPnl = Math.round((totalPnl / totalTrades) * 100) / 100;
              const avgHoldTimeMin = isBot ? randRange(0.5, 30) : (isSniper ? randRange(1, 60) : randRange(60, 10080));
              const maxDrawdown = Math.round(randRange(0, totalPnl * 0.3) * 100) / 100;
              const sharpeRatio = Math.round(randRange(-1, 4) * 100) / 100;
              const profitFactor = winRate > 0.5 ? Math.round(randRange(1, 3) * 100) / 100 : Math.round(randRange(0.3, 1) * 100) / 100;
              const avgSlippageBps = isBot ? randInt(0, 5) : randInt(5, 100);
              const frontrunCount = isBot ? randInt(10, 500) : randInt(0, 5);
              const frontrunByCount = randInt(0, 20);
              const sandwichCount = (isBot && botType === 'SANDWICH_BOT') ? randInt(50, 1000) : randInt(0, 5);
              const sandwichVictimCount = randInt(0, 10);
              const isActiveAtNight = Math.random() < 0.3;
              const consistencyScore = isBot ? Math.round(randRange(0.7, 1) * 100) / 100 : Math.round(randRange(0.1, 0.6) * 100) / 100;
              const avgPositionsAtOnce = randInt(1, 20);
              const maxPositionsAtOnce = avgPositionsAtOnce + randInt(0, 10);
              const labelConfidence = Math.round(randRange(0.5, 0.99) * 100) / 100;
              const dataQuality = Math.round(randRange(0.3, 0.95) * 100) / 100;

              // Sub-labels
              const subLabels: string[] = [];
              if (isSmartMoney) subLabels.push('early_buyer');
              if (isWhale) subLabels.push('large_holder');
              if (isSniper) subLabels.push('block0_buyer');
              if (isBot) subLabels.push('automated');
              if (Math.random() < 0.2) subLabels.push('cross_chain');

              const now = new Date();
              const firstSeen = new Date(now.getTime() - randInt(1, 365) * 24 * 60 * 60 * 1000);
              const lastActive = new Date(now.getTime() - randInt(0, 7) * 24 * 60 * 60 * 1000);
              const botFirstDetectedAt = isBot ? new Date(now.getTime() - randInt(1, 180) * 24 * 60 * 60 * 1000) : null;

              try {
                const trader = await db.trader.create({
                  data: {
                    address,
                    chain: chainInternal,
                    primaryLabel,
                    subLabels: JSON.stringify(subLabels),
                    labelConfidence,

                    isBot,
                    botType,
                    botConfidence,
                    botDetectionSignals: JSON.stringify(botDetectionSignals),
                    botFirstDetectedAt,

                    totalTrades,
                    winRate,
                    avgPnl,
                    totalPnl,
                    avgHoldTimeMin,
                    avgTradeSizeUsd,
                    largestTradeUsd,
                    totalVolumeUsd,
                    maxDrawdown,
                    sharpeRatio,
                    profitFactor,

                    avgSlippageBps,
                    frontrunCount,
                    frontrunByCount,
                    sandwichCount,
                    sandwichVictimCount,
                    washTradeScore,
                    copyTradeScore,
                    mevExtractionUsd,

                    avgTimeBetweenTrades,
                    tradingHourPattern,
                    tradingDayPattern,
                    isActiveAtNight,
                    isActive247,
                    consistencyScore,

                    uniqueTokensTraded,
                    avgPositionsAtOnce,
                    maxPositionsAtOnce,
                    preferredChains,
                    preferredDexes,
                    preferredTokenTypes,

                    isSmartMoney,
                    smartMoneyScore,
                    earlyEntryCount,
                    avgEntryRank,
                    avgExitMultiplier,
                    topCallCount,
                    worstCallCount,

                    isWhale,
                    whaleScore,
                    totalHoldingsUsd,
                    avgPositionUsd,
                    priceImpactAvg,

                    isSniper,
                    sniperScore,
                    avgBlockToTrade,
                    block0EntryCount,

                    firstSeen,
                    lastActive,
                    lastAnalyzed: lastActive,
                    dataQuality,
                  },
                });

                result.tradersCreated++;
                createdTraderIds.push(trader.id);
                createdTraderAddresses.push(address);
              } catch (err) {
                // Skip duplicate addresses — log for debugging
                console.warn('[Seed] Skip trader create (likely duplicate):', err instanceof Error ? err.message : String(err));
              }
            }

            // Update progress via lastSeedResult after each batch
            lastSeedResult = { ...result };
            console.log(`[Seed] Traders batch ${batch + batchSize}/${TOTAL_TRADERS}: ${result.tradersCreated} total`);
          }

          console.log(`[Seed] Total traders: ${result.tradersCreated}`);

          // ── TraderTransactions (2-5 per trader) ──
          console.log('[Seed] Generating TraderTransactions...');
          for (let i = 0; i < createdTraderIds.length; i += 50) {
            const batchIds = createdTraderIds.slice(i, i + 50);

            for (const traderId of batchIds) {
              const txCount = randInt(2, 5);

              // Pick a random chain for this trader's transactions
              const txChain = pickRandom(CHAIN_INTERNAL);

              for (let t = 0; t < txCount; t++) {
                const tokenAddr = pickRandom(tokenAddresses);
                const tokenInfo = existingTokens.find(tk => tk.address === tokenAddr);
                const txAction = pickRandom(['BUY', 'SELL']);
                const valueUsd = Math.round(randRange(100, 500000) * 100) / 100;
                const pnlUsd = Math.round(randRange(-10000, 50000) * 100) / 100;
                const blockTime = new Date(Date.now() - randInt(0, 7 * 24 * 60) * 60 * 1000);

                try {
                  await db.traderTransaction.create({
                    data: {
                      traderId,
                      txHash: randomTxHash(txChain),
                      blockNumber: randInt(10000000, 200000000),
                      blockTime,
                      chain: txChain,
                      dex: pickRandom(DEX_LIST),
                      action: txAction,
                      tokenAddress: tokenAddr,
                      tokenSymbol: tokenInfo?.symbol || 'UNKNOWN',
                      quoteToken: pickRandom(QUOTE_TOKENS),
                      amountIn: Math.round(randRange(0.01, 10000) * 1000000) / 1000000,
                      amountOut: Math.round(randRange(0.01, 10000) * 1000000) / 1000000,
                      priceUsd: tokenInfo?.priceUsd || 0,
                      valueUsd,
                      pnlUsd,
                      slippageBps: randInt(0, 100),
                      isFrontrun: Math.random() < 0.05,
                      isSandwich: Math.random() < 0.03,
                      isWashTrade: Math.random() < 0.02,
                      gasUsed: randRange(21000, 500000),
                      gasPrice: randRange(1, 50),
                      totalFeeUsd: Math.round(randRange(0.01, 50) * 100) / 100,
                    },
                  });
                  result.traderTransactionsCreated++;
                } catch {
                  // Skip duplicate txHash
                }
              }
            }
            // Update progress via lastSeedResult after each batch
            lastSeedResult = { ...result };
            console.log(`[Seed] Transactions batch ${Math.min(i + 50, createdTraderIds.length)}/${createdTraderIds.length}: ${result.traderTransactionsCreated} total`);
          }

          // ── TraderBehaviorPatterns (1-3 per smart money/whale trader) ──
          console.log('[Seed] Generating TraderBehaviorPatterns...');
          const smartMoneyTraders = await db.trader.findMany({
            where: {
              OR: [{ isSmartMoney: true }, { isWhale: true }, { isSniper: true }],
            },
            select: { id: true },
          });

          for (let i = 0; i < smartMoneyTraders.length; i += 50) {
            const batch = smartMoneyTraders.slice(i, i + 50);

            for (const trader of batch) {
              const patternCount = randInt(1, 3);

              for (let p = 0; p < patternCount; p++) {
                const pattern = pickRandom(BEHAVIOR_PATTERNS);
                const confidence = Math.round(randRange(0.5, 0.99) * 100) / 100;
                const dataPointCount = randInt(10, 200);

                // Pattern-specific metadata
                const metadata: Record<string, unknown> = { source: 'seed' };
                if (pattern === 'ACCUMULATOR') {
                  metadata.avgBuyIntervalHours = randRange(2, 48);
                  metadata.avgBuySizeUsd = randRange(500, 50000);
                  metadata.totalAccumulated = randRange(1000, 500000);
                } else if (pattern === 'DUMPER') {
                  metadata.avgSellSizeUsd = randRange(10000, 500000);
                  metadata.dumpSpeed = pickRandom(['slow', 'medium', 'fast']);
                } else if (pattern === 'SCALPER') {
                  metadata.avgHoldTimeMin = randRange(1, 60);
                  metadata.targetPnlPct = randRange(1, 10);
                } else if (pattern === 'SWING_TRADER') {
                  metadata.avgHoldTimeHours = randRange(24, 168);
                  metadata.targetPnlPct = randRange(10, 50);
                } else if (pattern === 'SNIPER_ENTRY') {
                  metadata.avgBlockToEntry = randRange(0, 5);
                  metadata.block0Count = randInt(5, 50);
                } else if (pattern === 'MEV_EXTRACTOR') {
                  metadata.avgExtractionUsd = randRange(10, 5000);
                  metadata.totalExtractedUsd = randRange(1000, 100000);
                }

                try {
                  await db.traderBehaviorPattern.create({
                    data: {
                      traderId: trader.id,
                      pattern,
                      confidence,
                      dataPoints: dataPointCount,
                      firstObserved: new Date(Date.now() - randInt(7, 90) * 24 * 60 * 60 * 1000),
                      lastObserved: new Date(Date.now() - randInt(0, 3) * 24 * 60 * 60 * 1000),
                      metadata: JSON.stringify(metadata),
                    },
                  });
                  result.traderBehaviorPatternsCreated++;
                } catch {
                  // Skip
                }
              }
            }
          }
          // Update progress via lastSeedResult
          lastSeedResult = { ...result };
          console.log(`[Seed] Behavior patterns: ${result.traderBehaviorPatternsCreated}`);

          // ── WalletTokenHoldings (1-5 per trader) ──
          console.log('[Seed] Generating WalletTokenHoldings...');
          for (let i = 0; i < createdTraderIds.length; i += 50) {
            const batchIds = createdTraderIds.slice(i, i + 50);

            for (const traderId of batchIds) {
              const holdingCount = randInt(1, 5);

              for (let h = 0; h < holdingCount; h++) {
                const tokenAddr = pickRandom(tokenAddresses);
                const tokenInfo = existingTokens.find(tk => tk.address === tokenAddr);
                const balance = Math.round(randRange(100, 10000000) * 100) / 100;
                const priceUsd = tokenInfo?.priceUsd || randRange(0.001, 100);
                const valueUsd = Math.round(balance * priceUsd * 100) / 100;
                const avgEntryPrice = Math.round(priceUsd * randRange(0.5, 1.2) * 100000) / 100000;
                const unrealizedPnl = Math.round((valueUsd - balance * avgEntryPrice) * 100) / 100;
                const unrealizedPnlPct = avgEntryPrice > 0 ? Math.round(((priceUsd / avgEntryPrice) - 1) * 10000) / 100 : 0;

                try {
                  await db.walletTokenHolding.create({
                    data: {
                      traderId,
                      tokenAddress: tokenAddr,
                      tokenSymbol: tokenInfo?.symbol || 'UNKNOWN',
                      chain: tokenInfo?.chain || 'SOL',
                      balance,
                      valueUsd,
                      avgEntryPrice,
                      unrealizedPnl,
                      unrealizedPnlPct,
                      firstBuyAt: new Date(Date.now() - randInt(1, 60) * 24 * 60 * 60 * 1000),
                      lastTradeAt: new Date(Date.now() - randInt(0, 7) * 24 * 60 * 60 * 1000),
                      buyCount: randInt(1, 20),
                      sellCount: randInt(0, 10),
                      totalBoughtUsd: Math.round(randRange(100, 500000) * 100) / 100,
                      totalSoldUsd: Math.round(randRange(0, 300000) * 100) / 100,
                    },
                  });
                  result.walletTokenHoldingsCreated++;
                } catch {
                  // Skip
                }
              }
            }
            // Update progress via lastSeedResult
            lastSeedResult = { ...result };
            console.log(`[Seed] Holdings batch ${Math.min(i + 50, createdTraderIds.length)}/${createdTraderIds.length}: ${result.walletTokenHoldingsCreated} total`);
          }
          console.log(`[Seed] Total holdings: ${result.walletTokenHoldingsCreated}`);

          // ── CrossChainWallets (~10% of traders) ──
          console.log('[Seed] Generating CrossChainWallets...');
          const crossChainCount = Math.floor(createdTraderIds.length * 0.10);
          const shuffledTraderIds = [...createdTraderIds].sort(() => Math.random() - 0.5);

          for (let i = 0; i < crossChainCount; i += 2) {
            if (i + 1 >= shuffledTraderIds.length) break;

            const primaryId = shuffledTraderIds[i];
            const linkedId = shuffledTraderIds[i + 1];

            const primaryChain = pickRandom(CHAIN_INTERNAL);
            let linkedChain = pickRandom(CHAIN_INTERNAL);
            while (linkedChain === primaryChain) linkedChain = pickRandom(CHAIN_INTERNAL);

            const linkedAddress = linkedChain === 'SOL' ? randomSolAddress() : randomEthAddress();

            try {
              await db.crossChainWallet.create({
                data: {
                  primaryWalletId: primaryId,
                  linkedWalletId: linkedId,
                  primaryChain,
                  linkedChain,
                  linkedAddress,
                  linkType: pickRandom(['SAME_ENTITY', 'LIKELY_LINKED', 'BRIDGE_USER', 'DEPOSIT_WALLET']),
                  linkConfidence: Math.round(randRange(0.5, 0.95) * 100) / 100,
                  evidence: JSON.stringify([pickRandom(['bridge_tx', 'same_eoa', 'funding_source', 'timing_correlation'])]),
                  bridgeTxCount: randInt(1, 50),
                  totalBridgedUsd: Math.round(randRange(1000, 500000) * 100) / 100,
                },
              });
              result.crossChainWalletsCreated++;
            } catch {
              // Skip
            }
          }
          // Update progress via lastSeedResult
          lastSeedResult = { ...result };
          console.log(`[Seed] Cross-chain wallets: ${result.crossChainWalletsCreated}`);

          // ── TraderLabelAssignments (1-3 per trader) ──
          console.log('[Seed] Generating TraderLabelAssignments...');
          const LABEL_SOURCES = ['ALGORITHM', 'ON_CHAIN_ANALYSIS', 'PATTERN_MATCHING', 'COMMUNITY', 'THIRD_PARTY_API'];

          for (let i = 0; i < createdTraderIds.length; i += 50) {
            const batchIds = createdTraderIds.slice(i, i + 50);

            for (const traderId of batchIds) {
              const labelCount = randInt(1, 3);

              for (let l = 0; l < labelCount; l++) {
                const label = pickRandom(TRADER_LABELS);

                try {
                  await db.traderLabelAssignment.create({
                    data: {
                      traderId,
                      label,
                      source: pickRandom(LABEL_SOURCES),
                      confidence: Math.round(randRange(0.4, 0.99) * 100) / 100,
                      evidence: JSON.stringify([pickRandom(['transaction_pattern', 'timing_analysis', 'wallet_correlation', 'social_proof', 'on_chain_evidence'])]),
                      assignedAt: new Date(Date.now() - randInt(0, 30) * 24 * 60 * 60 * 1000),
                      expiresAt: Math.random() < 0.3 ? new Date(Date.now() + randInt(7, 90) * 24 * 60 * 60 * 1000) : null,
                    },
                  });
                  result.traderLabelAssignmentsCreated++;
                } catch {
                  // Skip
                }
              }
            }
            // Update progress via lastSeedResult
            lastSeedResult = { ...result };
            console.log(`[Seed] Labels batch ${Math.min(i + 50, createdTraderIds.length)}/${createdTraderIds.length}: ${result.traderLabelAssignmentsCreated} total`);
          }
          console.log(`[Seed] Total label assignments: ${result.traderLabelAssignmentsCreated}`);
        }
      }
    } catch (err) {
      console.error('[Seed] Trader seeding failed with full error:', err instanceof Error ? err.stack : err);
    }
  }

  // ══════════════════════════════════════════════════════════
  // STEP 11: Seed Pattern Rules
  // ══════════════════════════════════════════════════════════
  if (!skipToTraders) {
    try {
      console.log('[Seed] === STEP 11: Seeding PatternRules ===');

      const existingPatterns = await db.patternRule.count();
      if (existingPatterns > 0) {
        console.log(`[Seed] PatternRules already exist (${existingPatterns}), skipping`);
      } else {
        const patternRules = [
          {
            name: 'Volume Spike',
            description: 'Sudden volume increase detected — volume exceeds 3x the 24h average within a short timeframe',
            category: 'VOLUME',
            conditions: JSON.stringify({ metric: 'volume24h', operator: '>', multiplier: 3, timeframe: '1h', minAbsoluteVolume: 50000 }),
            winRate: 0.58,
            occurrences: randInt(150, 400),
            backtestResults: JSON.stringify({ totalSignals: 312, wins: 181, losses: 131, avgReturnPct: 8.5, maxDrawdownPct: 12, period: '30d' }),
          },
          {
            name: 'Smart Money Accumulation',
            description: 'Whale or smart money addresses steadily buying over multiple transactions without significant selling',
            category: 'SMART_MONEY',
            conditions: JSON.stringify({ smartMoneyBuyRatio: 0.7, minTransactions: 3, timeframe: '6h', minVolumeUsd: 10000 }),
            winRate: 0.65,
            occurrences: randInt(100, 300),
            backtestResults: JSON.stringify({ totalSignals: 203, wins: 132, losses: 71, avgReturnPct: 15.2, maxDrawdownPct: 8, period: '30d' }),
          },
          {
            name: 'V-Shape Recovery',
            description: 'Sharp price dip followed by rapid recovery, indicating strong buying support at lower levels',
            category: 'PRICE_ACTION',
            conditions: JSON.stringify({ dipPct: -15, recoveryPct: 5, dipTimeframe: '1h', recoveryTimeframe: '2h' }),
            winRate: 0.55,
            occurrences: randInt(200, 500),
            backtestResults: JSON.stringify({ totalSignals: 389, wins: 214, losses: 175, avgReturnPct: 6.8, maxDrawdownPct: 15, period: '30d' }),
          },
          {
            name: 'Liquidity Drain',
            description: 'Decreasing liquidity pool with sustained volume, indicating potential exit by large holders',
            category: 'LIQUIDITY',
            conditions: JSON.stringify({ liquidityChangePct: -20, timeframe: '24h', volumeToLiquidityRatio: 5 }),
            winRate: 0.62,
            occurrences: randInt(80, 200),
            backtestResults: JSON.stringify({ totalSignals: 145, wins: 90, losses: 55, avgReturnPct: -5.2, maxDrawdownPct: 25, period: '30d', note: 'bearish signal' }),
          },
          {
            name: 'Bot Swarm',
            description: 'Multiple identified bot addresses trading the same token in rapid succession, often preceding a pump or dump',
            category: 'BOT_ACTIVITY',
            conditions: JSON.stringify({ minBotCount: 5, timeframe: '30m', minBotVolumePct: 40 }),
            winRate: 0.48,
            occurrences: randInt(150, 350),
            backtestResults: JSON.stringify({ totalSignals: 267, wins: 128, losses: 139, avgReturnPct: 3.1, maxDrawdownPct: 20, period: '30d' }),
          },
          {
            name: 'Rug Pull Warning',
            description: 'Sudden liquidity removal combined with large holder selling — high probability of rug pull',
            category: 'RISK',
            conditions: JSON.stringify({ liquidityRemovedPct: 50, timeframe: '1h', whaleSellCount: 3, priceDropPct: 30 }),
            winRate: 0.72,
            occurrences: randInt(50, 150),
            backtestResults: JSON.stringify({ totalSignals: 98, wins: 71, losses: 27, avgReturnPct: -22.5, maxDrawdownPct: 45, period: '30d', note: 'avoid signal' }),
          },
          {
            name: 'Breakout',
            description: 'Price breaking above established resistance level with increasing volume confirmation',
            category: 'PRICE_ACTION',
            conditions: JSON.stringify({ resistanceBreakPct: 2, volumeMultiplier: 2, timeframe: '4h', minConsolidationHours: 12 }),
            winRate: 0.57,
            occurrences: randInt(200, 400),
            backtestResults: JSON.stringify({ totalSignals: 312, wins: 178, losses: 134, avgReturnPct: 9.3, maxDrawdownPct: 11, period: '30d' }),
          },
          {
            name: 'Support Bounce',
            description: 'Price bouncing off a well-established support level with buying volume increase',
            category: 'PRICE_ACTION',
            conditions: JSON.stringify({ supportTouchCount: 3, bouncePct: 3, volumeIncreasePct: 20, timeframe: '1d' }),
            winRate: 0.59,
            occurrences: randInt(180, 350),
            backtestResults: JSON.stringify({ totalSignals: 256, wins: 151, losses: 105, avgReturnPct: 7.1, maxDrawdownPct: 9, period: '30d' }),
          },
          {
            name: 'Momentum Reversal',
            description: 'RSI divergence detected — price making new highs/lows while momentum indicator diverges',
            category: 'MOMENTUM',
            conditions: JSON.stringify({ rsiPeriod: 14, divergenceType: 'bearish_or_bullish', minDivergenceBars: 5, timeframe: '4h' }),
            winRate: 0.54,
            occurrences: randInt(120, 280),
            backtestResults: JSON.stringify({ totalSignals: 198, wins: 107, losses: 91, avgReturnPct: 5.8, maxDrawdownPct: 14, period: '30d' }),
          },
          {
            name: 'Whale Exit',
            description: 'Large holder (whale) selling significant position — often precedes extended price decline',
            category: 'SMART_MONEY',
            conditions: JSON.stringify({ minWhaleHoldingsUsd: 100000, sellPctOfHoldings: 30, timeframe: '12h', minSellValueUsd: 50000 }),
            winRate: 0.63,
            occurrences: randInt(90, 200),
            backtestResults: JSON.stringify({ totalSignals: 156, wins: 98, losses: 58, avgReturnPct: -7.8, maxDrawdownPct: 18, period: '30d', note: 'bearish signal' }),
          },
          {
            name: 'Accumulation Zone',
            description: 'Sustained buying pressure over an extended period with tight price range — smart money building position',
            category: 'SMART_MONEY',
            conditions: JSON.stringify({ priceRangePct: 10, minDurationHours: 48, buyVolumePct: 60, smartMoneyPresent: true }),
            winRate: 0.67,
            occurrences: randInt(70, 180),
            backtestResults: JSON.stringify({ totalSignals: 124, wins: 83, losses: 41, avgReturnPct: 18.5, maxDrawdownPct: 7, period: '30d' }),
          },
          {
            name: 'Distribution Pattern',
            description: 'Topping formation with decreasing volume on price increases and increasing volume on declines',
            category: 'PRICE_ACTION',
            conditions: JSON.stringify({ minDurationHours: 24, volumeDivergence: true, lowerHighsCount: 2, timeframe: '4h' }),
            winRate: 0.56,
            occurrences: randInt(100, 250),
            backtestResults: JSON.stringify({ totalSignals: 178, wins: 100, losses: 78, avgReturnPct: -4.2, maxDrawdownPct: 16, period: '30d' }),
          },
          {
            name: 'Cup and Handle',
            description: 'Bullish continuation pattern with U-shaped recovery followed by a small downward drift before breakout',
            category: 'PRICE_ACTION',
            conditions: JSON.stringify({ minDurationDays: 7, cupDepthPct: 15, handleDepthPct: 5, breakoutVolume: 1.5 }),
            winRate: 0.62,
            occurrences: randInt(60, 150),
            backtestResults: JSON.stringify({ totalSignals: 98, wins: 61, losses: 37, avgReturnPct: 14.3, maxDrawdownPct: 10, period: '30d' }),
          },
          {
            name: 'Double Bottom',
            description: 'Reversal signal with two approximately equal lows, indicating strong support and potential trend reversal',
            category: 'PRICE_ACTION',
            conditions: JSON.stringify({ bottomSeparationHours: 48, priceDifferencePct: 3, volumeIncreaseOnSecondBottom: true, timeframe: '1d' }),
            winRate: 0.61,
            occurrences: randInt(80, 180),
            backtestResults: JSON.stringify({ totalSignals: 134, wins: 82, losses: 52, avgReturnPct: 11.7, maxDrawdownPct: 9, period: '30d' }),
          },
          {
            name: 'Ascending Triangle',
            description: 'Bullish breakout setup with flat resistance and rising trendline of higher lows',
            category: 'PRICE_ACTION',
            conditions: JSON.stringify({ resistanceTouches: 3, higherLowsCount: 3, minDurationHours: 24, timeframe: '4h' }),
            winRate: 0.64,
            occurrences: randInt(70, 160),
            backtestResults: JSON.stringify({ totalSignals: 112, wins: 72, losses: 40, avgReturnPct: 12.8, maxDrawdownPct: 8, period: '30d' }),
          },
          {
            name: 'Flash Crash',
            description: 'Sudden extreme price drop (>20% in minutes) often triggered by liquidation cascades or exploit',
            category: 'RISK',
            conditions: JSON.stringify({ priceDropPct: 20, maxTimeframeMin: 30, volumeSpike: 5, liquidationCascade: true }),
            winRate: 0.45,
            occurrences: randInt(50, 120),
            backtestResults: JSON.stringify({ totalSignals: 87, wins: 39, losses: 48, avgReturnPct: -8.5, maxDrawdownPct: 35, period: '30d', note: 'high risk' }),
          },
          {
            name: 'Momentum Surge',
            description: 'Increasing momentum indicators (RSI, MACD) with expanding volume and price movement',
            category: 'MOMENTUM',
            conditions: JSON.stringify({ rsiThreshold: 65, macdCrossover: true, volumeIncreasePct: 50, timeframe: '1h' }),
            winRate: 0.55,
            occurrences: randInt(150, 350),
            backtestResults: JSON.stringify({ totalSignals: 234, wins: 129, losses: 105, avgReturnPct: 7.9, maxDrawdownPct: 12, period: '30d' }),
          },
          {
            name: 'Smart Money Divergence',
            description: 'Price trending opposite to smart money flow — smart money buying while price drops or vice versa',
            category: 'SMART_MONEY',
            conditions: JSON.stringify({ priceDirection: 'down', smartMoneyFlowDirection: 'up', minDivergenceHours: 6, smartMoneyVolumePct: 25 }),
            winRate: 0.68,
            occurrences: randInt(60, 150),
            backtestResults: JSON.stringify({ totalSignals: 102, wins: 69, losses: 33, avgReturnPct: 16.8, maxDrawdownPct: 9, period: '30d' }),
          },
          {
            name: 'High Frequency Trading',
            description: 'Rapid consecutive trades from bot addresses with sub-minute intervals, often indicating algorithmic activity',
            category: 'BOT_ACTIVITY',
            conditions: JSON.stringify({ minTrades: 10, maxIntervalSec: 60, minBotPct: 80, timeframe: '15m' }),
            winRate: 0.47,
            occurrences: randInt(100, 250),
            backtestResults: JSON.stringify({ totalSignals: 189, wins: 89, losses: 100, avgReturnPct: 2.1, maxDrawdownPct: 18, period: '30d' }),
          },
          {
            name: 'Liquidity Trap',
            description: 'False breakout above resistance with insufficient liquidity to sustain the move, leading to reversal',
            category: 'LIQUIDITY',
            conditions: JSON.stringify({ breakoutPct: 2, reversalPct: -3, maxBreakoutDurationHours: 4, minLiquidityUsd: 5000, volumeDeclinePct: 30 }),
            winRate: 0.58,
            occurrences: randInt(80, 200),
            backtestResults: JSON.stringify({ totalSignals: 145, wins: 84, losses: 61, avgReturnPct: -6.3, maxDrawdownPct: 14, period: '30d', note: 'bearish signal' }),
          },
        ];

        for (const rule of patternRules) {
          try {
            await db.patternRule.create({
              data: {
                name: rule.name,
                description: rule.description,
                category: rule.category,
                conditions: rule.conditions,
                isActive: true,
                winRate: rule.winRate,
                occurrences: rule.occurrences,
                backtestResults: rule.backtestResults,
              },
            });
            result.patternRulesCreated++;
          } catch {
            // Skip
          }
        }
        console.log(`[Seed] PatternRules: ${result.patternRulesCreated} created`);
      }
    } catch (err) {
      console.error('[Seed] PatternRule seeding failed with full error:', err instanceof Error ? err.stack : err);
    }
  }

  // ══════════════════════════════════════════════════════════
  // STEP 12: Initialize Behavioral Models
  // ══════════════════════════════════════════════════════════
  if (!skipToPatterns) {
    try {
      console.log('[Seed] === STEP 12: Initializing Behavioral Models ===');
      const { behavioralModelEngine } = await import('@/lib/services/behavioral-model-engine');
      await behavioralModelEngine.initializeDefaultMatrices();
      result.behaviorModelsInitialized = await db.traderBehaviorModel.count();
      console.log(`[Seed] Behavioral models: ${result.behaviorModelsInitialized} initialized`);
    } catch (err) {
      console.error('[Seed] Behavioral model initialization failed with full error:', err instanceof Error ? err.stack : err);
    }
  }

  // ══════════════════════════════════════════════════════════
  // Final count
  // ══════════════════════════════════════════════════════════
  result.totalTokens = await db.token.count();
  console.log(`[Seed] === COMPLETE: ${result.totalTokens} tokens, ${result.dnaCreated} DNA, ${result.signalsCreated} signals, ${result.candlesCreated} candles, ${result.tradersCreated} traders, ${result.patternRulesCreated} patterns, ${result.behaviorModelsInitialized} behaviorModels ===`);

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
      totalTraders,
      totalTraderTransactions,
      totalTraderBehaviorPatterns,
      totalWalletTokenHoldings,
      totalCrossChainWallets,
      totalTraderLabelAssignments,
      totalPatternRules,
      totalBehaviorModels,
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
      db.trader.count(),
      db.traderTransaction.count(),
      db.traderBehaviorPattern.count(),
      db.walletTokenHolding.count(),
      db.crossChainWallet.count(),
      db.traderLabelAssignment.count(),
      db.patternRule.count(),
      db.traderBehaviorModel.count(),
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
        totalTraders,
        totalTraderTransactions,
        totalTraderBehaviorPatterns,
        totalWalletTokenHoldings,
        totalCrossChainWallets,
        totalTraderLabelAssignments,
        totalPatternRules,
        totalBehaviorModels,
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
  runSeed(action)
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
