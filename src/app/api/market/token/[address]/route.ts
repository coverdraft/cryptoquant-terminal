import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/market/token/[address]
 *
 * Fetches individual token data from DexScreener (by token address) and
 * enriches it with Birdeye price / OHLCV data.
 *
 * Route params:
 *   address – token contract address (path parameter)
 *
 * Query params:
 *   chain – chain id (default: "solana")
 *
 * Rate-limit notes (free tiers):
 *   - DexScreener: ~300 req/min (unauthenticated)
 *   - Birdeye:    ~100 req/min on free plan (X-API-KEY required for higher limits)
 *
 * Response envelope:
 *   { data: TokenDetail | null, error: string | null, source: 'live' | 'cache' | 'fallback' }
 */

// Lazy pipeline instance
let _pipeline: import('@/lib/services/data-ingestion').DataIngestionPipeline | null = null;
async function getPipeline() {
  if (!_pipeline) {
    const { DataIngestionPipeline } = await import('@/lib/services/data-ingestion');
    _pipeline = new DataIngestionPipeline();
  }
  return _pipeline;
}

interface TokenDetail {
  id: string;
  symbol: string;
  name: string;
  chain: string;
  address: string;
  priceUsd: number;
  priceNative: string;
  volume24h: number;
  volume6h: number;
  volume1h: number;
  liquidity: number;
  marketCap: number;
  fdv: number;
  priceChange5m: number;
  priceChange15m: number;
  priceChange1h: number;
  priceChange24h: number;
  riskScore: number | null;
  // Trading activity
  txns24h: { buys: number; sells: number };
  txns6h: { buys: number; sells: number };
  txns1h: { buys: number; sells: number };
  // DEX info
  dexId: string;
  pairAddress: string;
  pairUrl: string;
  quoteToken: { address: string; symbol: string; name: string };
  // Metadata
  imageUrl?: string;
  websites?: { url: string }[];
  socials?: { type: string; url: string }[];
  pairCreatedAt: number | null;
  // OHLCV
  ohlcv: Array<{
    unixTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

function formatTokenDetail(
  pair: import('@/lib/services/data-ingestion').DexScreenerToken,
  birdeyePriceChange24h?: number,
  birdeyePrice?: number,
  ohlcv: TokenDetail['ohlcv'] = [],
): TokenDetail {
  return {
    id: pair.pairAddress,
    symbol: pair.baseToken.symbol,
    name: pair.baseToken.name,
    chain: pair.chainId,
    address: pair.baseToken.address,
    priceUsd: birdeyePrice ?? (parseFloat(pair.priceUsd) || 0),
    priceNative: pair.priceNative,
    volume24h: pair.volume.h24 ?? 0,
    volume6h: pair.volume.h6 ?? 0,
    volume1h: pair.volume.h1 ?? 0,
    liquidity: pair.liquidity?.usd ?? 0,
    marketCap: pair.marketCap ?? 0,
    fdv: pair.fdv ?? 0,
    priceChange5m: 0,
    priceChange15m: 0,
    priceChange1h: 0,
    priceChange24h: birdeyePriceChange24h ?? 0,
    riskScore: null,
    txns24h: pair.txns?.h24 ?? { buys: 0, sells: 0 },
    txns6h: pair.txns?.h6 ?? { buys: 0, sells: 0 },
    txns1h: pair.txns?.h1 ?? { buys: 0, sells: 0 },
    dexId: pair.dexId,
    pairAddress: pair.pairAddress,
    pairUrl: `https://dexscreener.com/${pair.chainId}/${pair.pairAddress}`,
    quoteToken: pair.quoteToken,
    imageUrl: pair.info?.imageUrl,
    websites: pair.info?.websites,
    socials: pair.info?.socials,
    pairCreatedAt: pair.pairCreatedAt ?? null,
    ohlcv,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  const searchParams = request.nextUrl.searchParams;
  const chain = searchParams.get('chain') || 'solana';

  if (!address) {
    return NextResponse.json(
      { data: null, error: 'Token address is required', source: 'live' as const },
      { status: 400 },
    );
  }

  try {
    const pipeline = await getPipeline();
    const { db } = await import('@/lib/db');
    const dexClient = pipeline.getDexScreener();
    const birdeyeClient = pipeline.getBirdeye();

    // Fetch from DexScreener (uses token address endpoint)
    const pair = await dexClient.getTokenByAddress(chain, address);

    if (!pair) {
      // No pair found on DexScreener – try Birdeye as secondary source
      try {
        const birdeyePrice = await birdeyeClient.getPrice(address, chain);
        if (birdeyePrice) {
          const detail: TokenDetail = {
            id: address,
            symbol: birdeyePrice.symbol,
            name: birdeyePrice.name,
            chain,
            address,
            priceUsd: birdeyePrice.price ?? 0,
            priceNative: '',
            volume24h: birdeyePrice.volume24h ?? 0,
            volume6h: 0,
            volume1h: 0,
            liquidity: birdeyePrice.liquidity ?? 0,
            marketCap: birdeyePrice.marketCap ?? 0,
            fdv: 0,
            priceChange5m: 0,
            priceChange15m: 0,
            priceChange1h: 0,
            priceChange24h: birdeyePrice.priceChange24h ?? 0,
            riskScore: null,
            txns24h: { buys: 0, sells: 0 },
            txns6h: { buys: 0, sells: 0 },
            txns1h: { buys: 0, sells: 0 },
            dexId: '',
            pairAddress: '',
            pairUrl: '',
            quoteToken: { address: '', symbol: '', name: '' },
            pairCreatedAt: null,
            ohlcv: [],
          };

          // Enrich with OHLCV data (fire-and-forget for speed)
          birdeyeClient
            .getOHLCV(address, '1H', 24, chain)
            .then((ohlcv) => {
              detail.ohlcv = ohlcv;
            })
            .catch(() => {});

          return NextResponse.json({
            data: detail,
            error: null,
            source: 'live' as const,
          });
        }
      } catch {
        // Birdeye also failed – fall through to DB fallback
      }

      // Fall through to DB
    } else {
      // Enrich with Birdeye data in parallel
      const [birdeyePrice, ohlcvData] = await Promise.all([
        birdeyeClient.getPrice(pair.baseToken.address, chain).catch(() => null),
        birdeyeClient.getOHLCV(pair.baseToken.address, '1H', 24, chain).catch(() => []),
      ]);

      const detail = formatTokenDetail(
        pair,
        birdeyePrice?.priceChange24h ?? undefined,
        birdeyePrice?.price ?? undefined,
        ohlcvData,
      );

      // Persist to DB for cache/fallback (fire-and-forget)
      persistToken(detail).catch(() => {});

      return NextResponse.json({
        data: detail,
        error: null,
        source: 'live' as const,
      });
    }
  } catch (error) {
    console.error('[/api/market/token/[address]] Live fetch failed:', error);
  }

  try {
    const { db } = await import('@/lib/db');
    const dbToken = await db.token.findFirst({
      where: {
        OR: [
          { address },
          { id: address },
        ],
      },
      include: {
        dna: true,
        signals: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!dbToken) {
      return NextResponse.json(
        { data: null, error: 'Token not found', source: 'fallback' as const },
        { status: 404 },
      );
    }

    const detail: TokenDetail = {
      id: dbToken.id,
      symbol: dbToken.symbol,
      name: dbToken.name,
      chain: dbToken.chain,
      address: dbToken.address,
      priceUsd: dbToken.priceUsd,
      priceNative: '',
      volume24h: dbToken.volume24h,
      volume6h: 0,
      volume1h: 0,
      liquidity: dbToken.liquidity,
      marketCap: dbToken.marketCap,
      fdv: 0,
      priceChange5m: dbToken.priceChange5m,
      priceChange15m: dbToken.priceChange15m,
      priceChange1h: dbToken.priceChange1h,
      priceChange24h: dbToken.priceChange24h,
      riskScore: dbToken.dna?.riskScore ?? null,
      txns24h: { buys: 0, sells: 0 },
      txns6h: { buys: 0, sells: 0 },
      txns1h: { buys: 0, sells: 0 },
      dexId: dbToken.dexId ?? '',
      pairAddress: dbToken.pairAddress ?? '',
      pairUrl: dbToken.pairUrl ?? '',
      quoteToken: { address: '', symbol: '', name: '' },
      pairCreatedAt: null,
      ohlcv: [],
    };

    return NextResponse.json({
      data: detail,
      error: null,
      source: 'fallback' as const,
    });
  } catch (dbError) {
    console.error('[/api/market/token/[address]] DB fallback also failed:', dbError);
    return NextResponse.json(
      {
        data: null,
        error: 'Token lookup failed from live source and database',
        source: 'fallback' as const,
      },
      { status: 500 },
    );
  }
}

async function persistToken(detail: TokenDetail) {
  try {
    const { db } = await import('@/lib/db');
    await db.token.upsert({
      where: { address: detail.address || detail.id },
      update: {
        symbol: detail.symbol,
        name: detail.name,
        priceUsd: detail.priceUsd,
        volume24h: detail.volume24h,
        liquidity: detail.liquidity,
        marketCap: detail.marketCap,
        priceChange24h: detail.priceChange24h,
        dexId: detail.dexId || null,
        pairAddress: detail.pairAddress || null,
        pairUrl: detail.pairUrl || null,
      },
      create: {
        address: detail.address || detail.id,
        symbol: detail.symbol,
        name: detail.name,
        chain: detail.chain.toUpperCase(),
        priceUsd: detail.priceUsd,
        volume24h: detail.volume24h,
        liquidity: detail.liquidity,
        marketCap: detail.marketCap,
        priceChange24h: detail.priceChange24h,
        dexId: detail.dexId || null,
        pairAddress: detail.pairAddress || null,
        pairUrl: detail.pairUrl || null,
      },
    });
  } catch {
    // Silent – upsert failure is non-critical
  }
}
