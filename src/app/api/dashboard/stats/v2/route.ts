import { NextResponse } from 'next/server';

/**
 * GET /api/dashboard/stats/v2
 * Lightweight dashboard stats - only DB queries, no heavy service imports.
 */
export async function GET() {
  try {
    const { db } = await import('@/lib/db');
    const oneHourAgo = new Date(Date.now() - 3600000);
    const oneDayAgo = new Date(Date.now() - 86400000);

    const [
      totalTokens, activeSignals, smartMoneyWallets, totalPatterns,
      recentEvents, predictiveSignals, dangerTokens, safeTokens,
      rugPullSignals, smartMoneySignals, vShapeSignals, liquidityTrapSignals,
    ] = await Promise.all([
      db.token.count(),
      db.signal.count({ where: { createdAt: { gte: oneHourAgo } } }),
      db.trader.count({ where: { isSmartMoney: true } }),
      db.patternRule.count({ where: { isActive: true } }),
      db.userEvent.count({ where: { createdAt: { gte: oneDayAgo } } }),
      db.predictiveSignal.count({
        where: { OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] },
      }),
      db.tokenDNA.count({ where: { riskScore: { gt: 60 } } }),
      db.tokenDNA.count({ where: { riskScore: { lte: 30 } } }),
      db.signal.count({ where: { type: 'RUG_PULL', createdAt: { gte: oneHourAgo } } }),
      db.signal.count({ where: { type: 'SMART_MONEY_ENTRY', createdAt: { gte: oneHourAgo } } }),
      db.signal.count({ where: { type: 'V_SHAPE', createdAt: { gte: oneHourAgo } } }),
      db.signal.count({ where: { type: 'LIQUIDITY_TRAP', createdAt: { gte: oneHourAgo } } }),
    ]);

    const eventScore = Math.min(30, Math.floor((recentEvents / Math.max(totalTokens, 1)) * 100));
    const signalScore = Math.min(25, Math.floor((activeSignals / Math.max(totalTokens, 1)) * 80));
    const predictiveScore = Math.min(20, Math.floor((predictiveSignals / Math.max(totalTokens, 1)) * 60));
    const smartMoneyScore = Math.min(15, Math.floor((smartMoneyWallets / Math.max(totalTokens, 1)) * 50));
    const dangerScore = Math.min(10, Math.floor((dangerTokens / Math.max(totalTokens, 1)) * 30));

    const fomoIndex = Math.min(100, eventScore + signalScore + predictiveScore + smartMoneyScore + dangerScore);

    return NextResponse.json({
      totalTokens, activeSignals, smartMoneyWallets, totalPatterns, recentEvents,
      dangerTokens, safeTokens, rugPullSignals, smartMoneySignals, vShapeSignals,
      liquidityTrapSignals, predictiveSignals, fomoIndex,
      threatLevel: rugPullSignals > 5 ? 'HIGH' : rugPullSignals > 2 ? 'MEDIUM' : 'LOW',
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
