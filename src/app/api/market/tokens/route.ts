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
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 5000);

  try {
    // Build chain filter - include 'ALL' chain tokens (CoinGecko top tokens) for any chain
    let chainFilter: any = undefined;
    if (chain !== 'all') {
      const chainUpper = chain.toUpperCase();
      if (chainUpper === 'SOLANA') {
        chainFilter = { in: ['SOL', 'SOLANA', 'ALL'] };
      } else if (chainUpper === 'EVM') {
        chainFilter = { in: ['ETH', 'BASE', 'ARB', 'OP', 'BSC', 'MATIC'] };
      } else {
        chainFilter = { in: [chainUpper, 'ALL'] };
      }
    }

    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || '';

    let where: any = chainFilter ? { chain: chainFilter } : {};
    if (search) {
      where.OR = [
        { symbol: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [dbTokens, totalCount] = await Promise.all([
      db.token.findMany({
        where,
        include: { dna: true },
        orderBy: { volume24h: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.token.count({ where }),
    ]);

    const tokens: TokenData[] = dbTokens.map(t => ({
      id: t.id,
      symbol: t.symbol,
      name: t.name,
      chain: t.chain,
      address: t.address,
      priceUsd: t.priceUsd,
      volume24h: t.volume24h,
      liquidity: t.liquidity,
      marketCap: t.marketCap,
      priceChange5m: t.priceChange5m,
      priceChange15m: t.priceChange15m,
      priceChange1h: t.priceChange1h,
      priceChange24h: t.priceChange24h,
      priceChange7d: t.priceChange6h,
      riskScore: t.dna?.riskScore ?? undefined,
    }));

    return NextResponse.json({
      data: tokens,
      error: null,
      source: tokens.length > 0 ? 'db' : 'empty',
      total: totalCount,
      offset,
      limit,
      hasMore: offset + tokens.length < totalCount,
    });
  } catch (error) {
    console.error('[/api/market/tokens] DB query failed:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to fetch tokens', source: 'error' },
      { status: 500 },
    );
  }
}
