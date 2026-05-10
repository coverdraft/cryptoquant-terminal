import { NextRequest, NextResponse } from 'next/server';
import type { ThinkingDepth } from '@/lib/services/deep-analysis-engine';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenAddress, chain = 'SOL', depth = 'STANDARD' } = body;

    if (!tokenAddress) {
      return NextResponse.json({ error: 'tokenAddress required' }, { status: 400 });
    }

    // Get token data
    const token = await db.token.findUnique({
      where: { address: tokenAddress },
      include: { dna: true },
    });

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    // Run the brain orchestrator analysis first
    const { analyzeToken } = await import('@/lib/services/brain-orchestrator');
    const brainResult = await analyzeToken(tokenAddress, chain);

    // Run candlestick pattern scan
    const { candlestickPatternEngine } = await import('@/lib/services/candlestick-pattern-engine');
    let patternScan;
    try {
      patternScan = await candlestickPatternEngine.scanMultiTimeframe(tokenAddress, chain);
    } catch {
      patternScan = undefined;
    }

    // Run cross-correlation analysis
    const { crossCorrelationEngine } = await import('@/lib/services/cross-correlation-engine');
    let crossCorrelation;
    try {
      crossCorrelation = await crossCorrelationEngine.analyzeCrossCorrelation(tokenAddress, chain);
    } catch {
      crossCorrelation = undefined;
    }

    // Get correlation stats for data reliability
    let correlationStats;
    try {
      correlationStats = await crossCorrelationEngine.getCorrelationStats();
    } catch {
      correlationStats = { totalCombinations: 0, totalObservations: 0, reliableCombinations: 0 };
    }

    // Build deep analysis input
    const analysisInput = {
      tokenAddress,
      symbol: token.symbol,
      chain,
      currentPrice: token.priceUsd,
      priceChange24h: token.priceChange24h,
      regime: brainResult.regime,
      regimeConfidence: brainResult.regimeConfidence,
      lifecyclePhase: brainResult.lifecyclePhase,
      lifecycleConfidence: brainResult.lifecycleConfidence,
      netBehaviorFlow: brainResult.netBehaviorFlow,
      botSwarmLevel: brainResult.botSwarmLevel,
      whaleDirection: brainResult.whaleDirection,
      operabilityScore: brainResult.operabilityScore,
      patternScan,
      crossCorrelation,
      dataReliability: {
        sampleSufficiency: correlationStats.reliableCombinations >= 10 ? 'ADEQUATE' as const :
          correlationStats.totalObservations >= 30 ? 'MINIMAL' as const : 'INSUFFICIENT' as const,
        totalCorrelationSamples: correlationStats.totalObservations,
        reliableCombinations: correlationStats.reliableCombinations,
      },
      candles1h: brainResult.candlesAvailable,
      candles5m: 0,
      tradersAnalyzed: 0,
      signalsGenerated: 0,
    };

    // Dynamically import heavy service
    const { deepAnalysisEngine } = await import('@/lib/services/deep-analysis-engine');

    // Run deep analysis
    const result = await deepAnalysisEngine.analyze(analysisInput, depth as ThinkingDepth);

    return NextResponse.json({
      success: true,
      analysis: result,
    });
  } catch (error) {
    console.error('[DeepAnalysis API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenAddress = searchParams.get('token');
    const chain = searchParams.get('chain') || 'SOL';
    const depth = (searchParams.get('depth') || 'STANDARD') as ThinkingDepth;

    if (!tokenAddress) {
      return NextResponse.json({ error: 'token parameter required' }, { status: 400 });
    }

    // Reuse POST logic via internal call
    const req = new NextRequest(new URL(request.url), {
      method: 'POST',
      body: JSON.stringify({ tokenAddress, chain, depth }),
    });
    return POST(req);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
