import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'ALL';
    const minConfidence = parseInt(searchParams.get('minConfidence') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');

    let where: any = {};

    if (type !== 'ALL') {
      where.type = type;
    }

    if (minConfidence > 0) {
      where.confidence = { gte: minConfidence };
    }

    const signals = await db.signal.findMany({
      where,
      include: { token: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Flatten token data so frontend gets tokenSymbol + chain directly
    // Extract symbol from description as fallback when token relation is missing
    const mapped = signals.map(s => {
      let symbol = s.token?.symbol ?? null;
      if (!symbol && s.description) {
        // Try to extract token symbol from the signal description
        // Common patterns: "Rug pull risk: SYMBOL dropped...", "Breakout: SYMBOL up..."
        const match = s.description.match(/:\s*([A-Z][A-Z0-9]{1,10})\s/);
        if (match) symbol = match[1];
      }
      return {
        id: s.id,
        type: s.type,
        tokenId: s.tokenId,
        tokenSymbol: symbol,
        tokenName: s.token?.name ?? null,
        chain: s.token?.chain ?? null,
        confidence: s.confidence,
        direction: s.direction,
        description: s.description,
        priceTarget: s.priceTarget,
        metadata: s.metadata,
        createdAt: s.createdAt,
      };
    });

    return NextResponse.json({ signals: mapped });
  } catch (error) {
    console.error('Error fetching signals:', error);
    return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
  }
}
