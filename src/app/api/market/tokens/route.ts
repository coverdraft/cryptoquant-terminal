import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/market/tokens
 *
 * SERVES FROM DB ONLY. No external API calls here.
 * The background refresh is handled by /api/brain/init scheduler.
 * This prevents OOM crashes from external API calls.
 */

interface TokenData {
  id: string;
  symbol: string;
  name: string;
  chain: string;
  priceUsd: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  priceChange5m: number;
  priceChange15m: number;
  priceChange1h: number;
  priceChange24h: number;
  priceChange7d: number;
  riskScore?: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chain = searchParams.get('chain') || 'solana';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

  try {
    // Build chain filter - include 'ALL' chain tokens (CoinGecko top tokens) for any chain
    let chainFilter: any = undefined;
    if (chain !== 'all') {
      const chainUpper = chain.toUpperCase();
      if (chainUpper === 'SOLANA') {
        chainFilter = { in: ['SOL', 'SOLANA', 'ALL'] };
      } else {
        chainFilter = { in: [chainUpper, 'ALL'] };
      }
    }

    const dbTokens = await db.token.findMany({
      where: chainFilter ? { chain: chainFilter } : undefined,
      include: { dna: true },
      orderBy: { volume24h: 'desc' },
      take: limit,
    });

    const tokens: TokenData[] = dbTokens.map(t => ({
      id: t.id,
      symbol: t.symbol,
      name: t.name,
      chain: t.chain,
      priceUsd: t.priceUsd,
      volume24h: t.volume24h,
      liquidity: t.liquidity,
      marketCap: t.marketCap,
      priceChange5m: t.priceChange5m,
      priceChange15m: t.priceChange15m,
      priceChange1h: t.priceChange1h,
      priceChange24h: t.priceChange24h,
      priceChange7d: 0,
      riskScore: t.dna?.riskScore ?? undefined,
    }));

    return NextResponse.json({
      data: tokens,
      error: null,
      source: tokens.length > 0 ? 'db' : 'empty',
    });
  } catch (error) {
    console.error('[/api/market/tokens] DB query failed:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to fetch tokens', source: 'error' },
      { status: 500 },
    );
  }
}
