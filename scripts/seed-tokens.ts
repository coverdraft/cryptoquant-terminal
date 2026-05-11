/**
 * Seed Tokens Script - Fetches real token data from CoinGecko
 * and seeds it directly into the database.
 * Also computes TokenDNA for all tokens.
 * 
 * Usage: bun run scripts/seed-tokens.ts
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const PER_PAGE = 250;
const DELAY_MS = 3000; // 3 seconds between pages (CoinGecko free = ~30 req/min)

// ============================================================
// CHAIN DETECTION
// ============================================================

const PLATFORM_MAP: Record<string, string> = {
  'ethereum': 'ETH',
  'solana': 'SOL',
  'binance-smart-chain': 'BSC',
  'arbitrum': 'ARB',
  'optimistic-ethereum': 'OP',
  'base': 'BASE',
  'avalanche': 'AVAX',
  'polygon-pos': 'MATIC',
  'fantom': 'FTM',
};

function detectChain(platforms: Record<string, string> | undefined): string {
  if (!platforms || Object.keys(platforms).length === 0) return 'SOL';
  const active = Object.keys(platforms).filter(p => platforms[p] && platforms[p] !== '');
  if (active.includes('solana')) return 'SOL';
  if (active.includes('ethereum')) return 'ETH';
  if (active.includes('binance-smart-chain')) return 'BSC';
  for (const p of active) {
    if (PLATFORM_MAP[p]) return PLATFORM_MAP[p];
  }
  return 'SOL';
}

// ============================================================
// FETCH FROM COINGECKO
// ============================================================

async function fetchCoinGeckoPage(page: number, order: string): Promise<any[]> {
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=${order}&per_page=${PER_PAGE}&page=${page}&sparkline=false&price_change_percentage=1h,24h,7d`;
  
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'CryptoQuant-Terminal/1.0',
    },
  });

  if (res.status === 429) {
    console.log(`  [CoinGecko] Rate limited on page ${page}, waiting 65s...`);
    await new Promise(r => setTimeout(r, 65000));
    return fetchCoinGeckoPage(page, order);
  }

  if (!res.ok) {
    console.warn(`  [CoinGecko] Error ${res.status} on page ${page}`);
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// ============================================================
// TOKEN DNA COMPUTATION
// ============================================================

function computeTokenDNA(token: {
  priceChange24h: number;
  liquidity: number;
  marketCap: number;
  volume24h: number;
}) {
  const pc24 = token.priceChange24h ?? 0;
  const liq = token.liquidity ?? 0;
  const mcap = token.marketCap ?? 0;
  const vol = token.volume24h ?? 0;

  // 1. Volatility component
  let volatilityRisk = 0;
  if (Math.abs(pc24) > 50) volatilityRisk = 40;
  else if (Math.abs(pc24) > 20) volatilityRisk = 30;
  else if (Math.abs(pc24) > 10) volatilityRisk = 20;
  else if (Math.abs(pc24) > 5) volatilityRisk = 10;

  // 2. Liquidity component
  let liquidityRisk = 0;
  if (liq > 0 && liq < 50000) liquidityRisk = 30;
  else if (liq > 0 && liq < 200000) liquidityRisk = 20;
  else if (liq > 0 && liq < 1000000) liquidityRisk = 10;
  else if (liq === 0 && vol > 0) liquidityRisk = 35;

  // 3. Market cap component
  let mcapRisk = 0;
  if (mcap > 0 && mcap < 1000000) mcapRisk = 25;
  else if (mcap > 0 && mcap < 10000000) mcapRisk = 15;
  else if (mcap > 0 && mcap < 50000000) mcapRisk = 5;

  // 4. Volume/liquidity ratio
  let washRisk = 0;
  if (liq > 0 && vol > 0) {
    const volLiqRatio = vol / liq;
    if (volLiqRatio > 10) washRisk = 20;
    else if (volLiqRatio > 5) washRisk = 15;
    else if (volLiqRatio > 2) washRisk = 5;
  }

  // 5. Momentum component
  let momentumRisk = 0;
  if (pc24 < -30) momentumRisk = 25;
  else if (pc24 < -15) momentumRisk = 20;
  else if (pc24 < -5) momentumRisk = 10;

  // Composite score
  let riskScore = 20 + volatilityRisk + liquidityRisk + mcapRisk + washRisk + momentumRisk;
  riskScore = Math.min(98, Math.max(5, riskScore));

  const isHighRisk = riskScore > 60;
  const isLowRisk = riskScore < 30;

  const botActivityScore = isHighRisk ? 30 + Math.random() * 50 : isLowRisk ? Math.random() * 15 : 5 + Math.random() * 30;
  const smartMoneyScore = isLowRisk ? 20 + Math.random() * 40 : isHighRisk ? Math.random() * 20 : 5 + Math.random() * 25;
  const retailScore = isHighRisk ? 20 + Math.random() * 30 : 40 + Math.random() * 40;
  const whaleScore = isLowRisk ? 15 + Math.random() * 35 : Math.random() * 25;
  const washTradeProb = isHighRisk ? 0.2 + Math.random() * 0.5 : Math.random() * 0.15;
  const sniperPct = isHighRisk ? 10 + Math.random() * 30 : Math.random() * 5;
  const mevPct = isHighRisk ? 5 + Math.random() * 20 : Math.random() * 8;
  const copyBotPct = isHighRisk ? 5 + Math.random() * 15 : Math.random() * 5;

  return {
    riskScore,
    botActivityScore: Math.round(botActivityScore * 100) / 100,
    smartMoneyScore: Math.round(smartMoneyScore * 100) / 100,
    retailScore: Math.round(retailScore * 100) / 100,
    whaleScore: Math.round(whaleScore * 100) / 100,
    washTradeProb: Math.round(washTradeProb * 1000) / 1000,
    sniperPct: Math.round(sniperPct * 100) / 100,
    mevPct: Math.round(mevPct * 100) / 100,
    copyBotPct: Math.round(copyBotPct * 100) / 100,
  };
}

// ============================================================
// MAIN
// ============================================================

async function seedTokens() {
  console.log('=== Starting Token Seeding ===');
  
  const existingCount = await db.token.count();
  console.log(`Existing tokens: ${existingCount}`);

  let totalSeeded = 0;
  let dnaCreated = 0;

  // ============================================================
  // PHASE 1: Fetch top 5000 tokens by market cap
  // ============================================================
  console.log('\n--- Phase 1: Fetching top tokens by market cap ---');
  
  const targetMcap = 5000;
  const maxPagesMcap = Math.ceil(targetMcap / PER_PAGE);
  const seenAddresses = new Set<string>();

  for (let page = 1; page <= maxPagesMcap; page++) {
    console.log(`  Fetching market cap page ${page}/${maxPagesMcap}...`);
    
    const coins = await fetchCoinGeckoPage(page, 'market_cap_desc');
    
    if (coins.length === 0) {
      console.log(`  Page ${page} returned 0 coins, stopping.`);
      break;
    }

    for (const coin of coins) {
      const address = coin.id; // Use CoinGecko ID as address for native coins
      if (!address || seenAddresses.has(address)) continue;
      seenAddresses.add(address);

      const chain = detectChain(undefined); // We don't have platform data from markets endpoint

      try {
        await db.token.upsert({
          where: { address },
          update: {
            symbol: coin.symbol?.toUpperCase() || '',
            name: coin.name || '',
            priceUsd: coin.current_price ?? 0,
            volume24h: coin.total_volume ?? 0,
            marketCap: coin.market_cap ?? 0,
            priceChange1h: coin.price_change_percentage_1h_in_currency ?? 0,
            priceChange24h: coin.price_change_percentage_24h ?? 0,
          },
          create: {
            address,
            symbol: coin.symbol?.toUpperCase() || '',
            name: coin.name || '',
            chain: chain || 'SOL',
            priceUsd: coin.current_price ?? 0,
            volume24h: coin.total_volume ?? 0,
            marketCap: coin.market_cap ?? 0,
            priceChange1h: coin.price_change_percentage_1h_in_currency ?? 0,
            priceChange24h: coin.price_change_percentage_24h ?? 0,
            liquidity: 0,
            priceChange5m: 0,
            priceChange15m: 0,
          },
        });
        totalSeeded++;
      } catch (err) {
        // Skip duplicates
      }
    }

    console.log(`  Page ${page}: ${coins.length} coins processed, total seeded: ${totalSeeded}`);

    if (coins.length < PER_PAGE) break;

    // Rate limit delay
    if (page < maxPagesMcap) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  // ============================================================
  // PHASE 2: Fetch top 1000 tokens by volume
  // ============================================================
  console.log('\n--- Phase 2: Fetching top tokens by volume ---');
  
  const targetVol = 1000;
  const maxPagesVol = Math.ceil(targetVol / PER_PAGE);

  for (let page = 1; page <= maxPagesVol; page++) {
    console.log(`  Fetching volume page ${page}/${maxPagesVol}...`);
    
    const coins = await fetchCoinGeckoPage(page, 'volume_desc');
    
    if (coins.length === 0) break;

    for (const coin of coins) {
      const address = coin.id;
      if (!address || seenAddresses.has(address)) continue;
      seenAddresses.add(address);

      try {
        await db.token.upsert({
          where: { address },
          update: {
            priceUsd: coin.current_price ?? 0,
            volume24h: coin.total_volume ?? 0,
            marketCap: coin.market_cap ?? 0,
            priceChange1h: coin.price_change_percentage_1h_in_currency ?? 0,
            priceChange24h: coin.price_change_percentage_24h ?? 0,
          },
          create: {
            address,
            symbol: coin.symbol?.toUpperCase() || '',
            name: coin.name || '',
            chain: 'SOL',
            priceUsd: coin.current_price ?? 0,
            volume24h: coin.total_volume ?? 0,
            marketCap: coin.market_cap ?? 0,
            priceChange1h: coin.price_change_percentage_1h_in_currency ?? 0,
            priceChange24h: coin.price_change_percentage_24h ?? 0,
            liquidity: 0,
            priceChange5m: 0,
            priceChange15m: 0,
          },
        });
        totalSeeded++;
      } catch { /* skip */ }
    }

    console.log(`  Volume page ${page}: ${coins.length} coins, total unique seeded: ${totalSeeded}`);

    if (coins.length < PER_PAGE) break;

    if (page < maxPagesVol) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  // ============================================================
  // PHASE 3: Enrich with DexScreener (top tokens by volume)
  // ============================================================
  console.log('\n--- Phase 3: DexScreener enrichment (top 100 by volume) ---');
  
  try {
    const topForLiq = await db.token.findMany({
      where: { volume24h: { gt: 0 } },
      orderBy: { volume24h: 'desc' },
      take: 100,
    });

    let enriched = 0;
    for (const token of topForLiq) {
      try {
        const searchUrl = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(token.symbol)}`;
        const res = await fetch(searchUrl, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10000),
        });
        
        if (!res.ok) continue;
        const data = await res.json();
        const pairs = data.pairs || [];
        if (pairs.length === 0) continue;

        // Find best pair by liquidity
        const best = pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];

        if (best?.liquidity?.usd > 0) {
          await db.token.update({
            where: { id: token.id },
            data: {
              liquidity: best.liquidity.usd,
              dexId: best.dexId || token.dexId,
              pairAddress: best.pairAddress || token.pairAddress,
            },
          });
          enriched++;
        }

        // Rate limit: DexScreener ~300 req/min
        await new Promise(r => setTimeout(r, 250));
      } catch { /* skip individual failures */ }
    }

    console.log(`  DexScreener: ${enriched}/${topForLiq.length} tokens enriched with liquidity data`);
  } catch (err) {
    console.warn('  DexScreener enrichment failed:', err);
  }

  // ============================================================
  // PHASE 4: Compute TokenDNA for ALL tokens
  // ============================================================
  console.log('\n--- Phase 4: Computing TokenDNA for all tokens ---');

  const BATCH_SIZE = 500;
  let offset = 0;

  while (true) {
    const tokensWithoutDna = await db.token.findMany({
      where: { dna: { is: null } },
      take: BATCH_SIZE,
      skip: offset,
    });

    if (tokensWithoutDna.length === 0) break;

    for (const token of tokensWithoutDna) {
      try {
        const dnaData = computeTokenDNA(token);

        await db.tokenDNA.create({
          data: {
            tokenId: token.id,
            ...dnaData,
            traderComposition: JSON.stringify({
              smartMoney: Math.round(dnaData.smartMoneyScore / 10),
              whale: Math.round(dnaData.whaleScore / 10),
              bot_mev: Math.round(dnaData.mevPct / 2),
              bot_sniper: Math.round(dnaData.sniperPct / 2),
              bot_copy: Math.round(dnaData.copyBotPct),
              retail: Math.round(dnaData.retailScore / 5),
              creator: Math.random() > 0.9 ? 1 : 0,
              fund: dnaData.riskScore < 30 ? Math.round(Math.random() * 3) : 0,
              influencer: Math.random() > 0.8 ? 1 : 0,
            }),
            topWallets: JSON.stringify([]),
          },
        });
        dnaCreated++;
      } catch { /* skip */ }
    }

    offset += tokensWithoutDna.length;
    console.log(`  DNA batch processed: ${dnaCreated} total created so far`);

    if (tokensWithoutDna.length < BATCH_SIZE) break;
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  const finalTokens = await db.token.count();
  const tokensWithLiq = await db.token.count({ where: { liquidity: { gt: 0 } } });
  const dangerCount = await db.tokenDNA.count({ where: { riskScore: { gt: 60 } } });
  const warningCount = await db.tokenDNA.count({ where: { riskScore: { gte: 30, lte: 60 } } });
  const safeCount = await db.tokenDNA.count({ where: { riskScore: { lt: 30 } } });

  console.log('\n=== Token Seeding Complete ===');
  console.log(`Total tokens in DB: ${finalTokens}`);
  console.log(`Tokens seeded this run: ${totalSeeded}`);
  console.log(`Tokens with liquidity: ${tokensWithLiq}`);
  console.log(`TokenDNA created: ${dnaCreated}`);
  console.log(`DNA Classification: DANGER=${dangerCount}, WARNING=${warningCount}, SAFE=${safeCount}`);
}

seedTokens()
  .catch(console.error)
  .finally(() => db.$disconnect());
