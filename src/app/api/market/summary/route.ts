import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// In-memory cache for market summary (survives between requests)
let cachedSummary: any = null;
let cachedAt = 0;
const CACHE_TTL = 60_000; // 60 seconds

/**
 * GET /api/market/summary
 *
 * Returns market summary with robust fallback chain:
 *   1. Cached in-memory (if < 60s old)
 *   2. CoinGecko API (with 10s timeout)
 *   3. Database aggregation fallback (from seed data)
 */
export async function GET() {
  // Return in-memory cache if fresh
  if (cachedSummary && Date.now() - cachedAt < CACHE_TTL) {
    return NextResponse.json({
      data: cachedSummary,
      error: null,
      source: 'cache',
    });
  }

  try {
    // Try CoinGecko with a timeout
    const summary = await fetchFromCoinGecko();

    if (summary && summary.btcPrice > 0) {
      cachedSummary = summary;
      cachedAt = Date.now();
      return NextResponse.json({
        data: summary,
        error: null,
        source: 'live',
      });
    }
  } catch (err) {
    console.warn('[/api/market/summary] CoinGecko failed, using DB fallback:', err);
  }

  // Fallback: aggregate from our database
  try {
    const dbSummary = await fetchFromDatabase();

    if (dbSummary) {
      // Cache even fallback data for 30s
      if (!cachedSummary) {
        cachedSummary = dbSummary;
        cachedAt = Date.now() - CACHE_TTL + 30_000; // Cache for 30s only
      }
      return NextResponse.json({
        data: dbSummary,
        error: null,
        source: 'database',
      });
    }
  } catch (err) {
    console.warn('[/api/market/summary] DB fallback failed:', err);
  }

  // Last resort: return stale cache or empty
  if (cachedSummary) {
    return NextResponse.json({
      data: cachedSummary,
      error: 'Using stale cache (API unavailable)',
      source: 'stale_cache',
    });
  }

  return NextResponse.json(
    { data: null, error: 'Market data unavailable', source: 'fallback' },
    { status: 503 }
  );
}

// ============================================================
// CoinGecko with 10s timeout
// ============================================================

async function fetchFromCoinGecko() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch('https://api.coingecko.com/api/v3/global', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CryptoQuant-Terminal/2.0',
      },
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = await res.json();
    const g = data?.data;
    if (!g) return null;

    // Also fetch top 3 prices
    const pricesRes = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana&order=market_cap_desc&per_page=3&page=1&sparkline=false',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CryptoQuant-Terminal/2.0',
        },
        signal: controller.signal,
      }
    );

    let btcPrice = 0, ethPrice = 0, solPrice = 0;
    if (pricesRes.ok) {
      const prices = await pricesRes.json();
      for (const coin of prices) {
        if (coin.id === 'bitcoin') btcPrice = coin.current_price ?? 0;
        if (coin.id === 'ethereum') ethPrice = coin.current_price ?? 0;
        if (coin.id === 'solana') solPrice = coin.current_price ?? 0;
      }
    }

    return {
      btcPrice,
      ethPrice,
      solPrice,
      totalMarketCap: g.total_market_cap?.usd ?? 0,
      totalVolume24h: g.total_volume?.usd ?? 0,
      btcDominance: g.market_cap_percentage?.btc ?? 0,
      ethDominance: g.market_cap_percentage?.eth ?? 0,
      fearGreedIndex: 50,
      lastUpdated: Date.now(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// Database fallback
// ============================================================

async function fetchFromDatabase() {
  // Get BTC, ETH, SOL from our database
  const btc = await db.token.findFirst({
    where: { symbol: { equals: 'BTC', mode: 'insensitive' } },
    select: { priceUsd: true, marketCap: true },
  });
  const eth = await db.token.findFirst({
    where: { symbol: { equals: 'ETH', mode: 'insensitive' } },
    select: { priceUsd: true, marketCap: true },
  });
  const sol = await db.token.findFirst({
    where: { symbol: { equals: 'SOL', mode: 'insensitive' } },
    select: { priceUsd: true, marketCap: true },
  });

  const totalMarketCap = await db.token.aggregate({
    _sum: { marketCap: true },
  });

  const totalVolume = await db.token.aggregate({
    _sum: { volume24h: true },
  });

  const hasAnyData = (btc?.priceUsd ?? 0) > 0;

  if (!hasAnyData) return null;

  return {
    btcPrice: btc?.priceUsd ?? 0,
    ethPrice: eth?.priceUsd ?? 0,
    solPrice: sol?.priceUsd ?? 0,
    totalMarketCap: totalMarketCap._sum.marketCap ?? 0,
    totalVolume24h: totalVolume._sum.volume24h ?? 0,
    btcDominance: btc?.marketCap && totalMarketCap._sum.marketCap
      ? (btc.marketCap / totalMarketCap._sum.marketCap) * 100
      : 0,
    ethDominance: eth?.marketCap && totalMarketCap._sum.marketCap
      ? (eth.marketCap / totalMarketCap._sum.marketCap) * 100
      : 0,
    fearGreedIndex: 50,
    lastUpdated: Date.now(),
  };
}
