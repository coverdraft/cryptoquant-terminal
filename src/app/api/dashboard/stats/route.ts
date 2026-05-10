import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/stats
 *
 * Computes aggregate dashboard statistics from real DB data.
 * No Math.random() — all values are derived from actual data.
 * Each DB query is wrapped in its own try/catch so one failure
 * doesn't crash the whole route.
 */
export async function GET() {
  try {
    const { db } = await import('@/lib/db');

    const oneHourAgo = new Date(Date.now() - 3600000);
    const oneDayAgo = new Date(Date.now() - 86400000);

    let totalTokens = 0;
    let activeSignals = 0;
    let smartMoneyWallets = 0;
    let totalPatterns = 0;
    let recentEvents = 0;
    let predictiveSignals = 0;
    let tokensWithDna: Array<{ dna: { riskScore: number } | null }> = [];

    try {
      totalTokens = await db.token.count();
    } catch (e) {
      console.error('[Dashboard Stats] Failed to count tokens:', e);
    }

    try {
      activeSignals = await db.signal.count({ where: { createdAt: { gte: oneHourAgo } } });
    } catch (e) {
      console.error('[Dashboard Stats] Failed to count active signals:', e);
    }

    try {
      smartMoneyWallets = await db.trader.count({ where: { isSmartMoney: true } });
    } catch (e) {
      console.error('[Dashboard Stats] Failed to count smart money wallets:', e);
    }

    try {
      totalPatterns = await db.patternRule.count({ where: { isActive: true } });
    } catch (e) {
      console.error('[Dashboard Stats] Failed to count patterns:', e);
    }

    try {
      recentEvents = await db.userEvent.count({ where: { createdAt: { gte: oneDayAgo } } });
    } catch (e) {
      console.error('[Dashboard Stats] Failed to count recent events:', e);
    }

    try {
      predictiveSignals = await db.predictiveSignal.count({
        where: {
          OR: [
            { validUntil: null },
            { validUntil: { gte: new Date() } },
          ],
        },
      });
    } catch (e) {
      console.error('[Dashboard Stats] Failed to count predictive signals:', e);
    }

    try {
      tokensWithDna = await db.token.findMany({
        where: { dna: { isNot: null } },
        select: { dna: { select: { riskScore: true } } },
      });
    } catch (e) {
      console.error('[Dashboard Stats] Failed to query tokens with DNA:', e);
    }

    // Count danger/safe tokens from real DNA data
    const dangerTokens = tokensWithDna.filter(t => t.dna && t.dna.riskScore > 60).length;
    const safeTokens = tokensWithDna.filter(t => t.dna && t.dna.riskScore <= 30).length;

    // Signal type breakdown
    let rugPullSignals = 0;
    let smartMoneySignals = 0;
    let vShapeSignals = 0;
    let liquidityTrapSignals = 0;

    try {
      rugPullSignals = await db.signal.count({ where: { type: 'RUG_PULL', createdAt: { gte: oneHourAgo } } });
    } catch (e) {
      console.error('[Dashboard Stats] Failed to count rug pull signals:', e);
    }

    try {
      smartMoneySignals = await db.signal.count({ where: { type: 'SMART_MONEY_ENTRY', createdAt: { gte: oneHourAgo } } });
    } catch (e) {
      console.error('[Dashboard Stats] Failed to count smart money signals:', e);
    }

    try {
      vShapeSignals = await db.signal.count({ where: { type: 'V_SHAPE', createdAt: { gte: oneHourAgo } } });
    } catch (e) {
      console.error('[Dashboard Stats] Failed to count V-shape signals:', e);
    }

    try {
      liquidityTrapSignals = await db.signal.count({ where: { type: 'LIQUIDITY_TRAP', createdAt: { gte: oneHourAgo } } });
    } catch (e) {
      console.error('[Dashboard Stats] Failed to count liquidity trap signals:', e);
    }

    // Compute FOMO Index from real data (no Math.random!)
    const eventScore = Math.min(30, Math.floor((recentEvents / Math.max(totalTokens, 1)) * 100));
    const signalScore = Math.min(25, Math.floor((activeSignals / Math.max(totalTokens, 1)) * 80));
    const predictiveScore = Math.min(20, Math.floor((predictiveSignals / Math.max(totalTokens, 1)) * 60));
    const smartMoneyScore = Math.min(15, Math.floor((smartMoneyWallets / Math.max(totalTokens, 1)) * 50));
    const dangerScore = Math.min(10, Math.floor((dangerTokens / Math.max(tokensWithDna.length, 1)) * 30));

    const fomoIndex = Math.min(100, eventScore + signalScore + predictiveScore + smartMoneyScore + dangerScore);

    return NextResponse.json({
      totalTokens,
      activeSignals,
      smartMoneyWallets,
      totalPatterns,
      recentEvents,
      dangerTokens,
      safeTokens,
      rugPullSignals,
      smartMoneySignals,
      vShapeSignals,
      liquidityTrapSignals,
      predictiveSignals,
      fomoIndex,
      threatLevel: rugPullSignals > 5 ? 'HIGH' : rugPullSignals > 2 ? 'MEDIUM' : 'LOW',
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
