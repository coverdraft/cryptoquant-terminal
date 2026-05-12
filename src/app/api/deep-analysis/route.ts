import { NextRequest, NextResponse } from 'next/server';
import type { ThinkingDepth, DeepAnalysisResult, DeepAnalysis } from '@/lib/services/deep-analysis-engine';
import { db } from '@/lib/db';

/**
 * Transform DeepAnalysisResult (flat API format) into DeepAnalysis (nested UI format).
 * The frontend expects the DeepAnalysis shape with verdict, phaseAssessment, etc.
 * The engine's analyze() returns DeepAnalysisResult with different field names.
 */
function transformToDeepAnalysis(result: DeepAnalysisResult): DeepAnalysis {
  // Map recommendation to verdict action
  const actionMap: Record<string, string> = {
    STRONG_BUY: 'STRONG_BUY', BUY: 'BUY', HOLD: 'HOLD',
    SELL: 'SELL', STRONG_SELL: 'STRONG_SELL', WAIT: 'WAIT',
  };

  const verdictAction = actionMap[result.recommendation] || 'HOLD';

  // Build verdict
  const verdict: DeepAnalysis['verdict'] = {
    action: verdictAction,
    confidence: result.recommendationConfidence,
    reasoning: result.summary || result.justification?.join('. ') || 'Analysis complete',
    summary: result.summary,
    criticalNote: result.urgencyLevel === 'IMMEDIATE' ? 'Immediate action recommended' : undefined,
  };

  // Build phase assessment from scenarios
  const phaseAssessment: DeepAnalysis['phaseAssessment'] = {
    phase: result.scenarios?.base?.description?.includes('bull') ? 'GROWTH'
      : result.scenarios?.base?.description?.includes('bear') ? 'DECLINE'
      : 'GROWTH',
    confidence: result.recommendationConfidence,
    timeInPhase: result.suggestedTimeHorizon || 'Unknown',
    narrative: result.scenarios?.base?.description || 'Market phase assessment',
  };

  // Build pattern assessment
  const patternAssessment: DeepAnalysis['patternAssessment'] = {
    dominantPattern: result.bullishFactors?.length > result.bearishFactors?.length ? 'Bullish Momentum' : 'Bearish Pressure',
    patternSentiment: verdictAction === 'HOLD' ? 'NEUTRAL' : verdictAction.includes('BUY') ? 'BULLISH' : 'BEARISH',
    multiTfConfirmed: result.justification?.length >= 3,
    narrative: result.justification?.slice(0, 3).join('. ') || 'Pattern assessment',
  };

  // Build trader assessment
  const traderAssessment: DeepAnalysis['traderAssessment'] = {
    dominantArchetype: result.riskLevel === 'VERY_LOW' || result.riskLevel === 'LOW' ? 'HOLDER' : 'SPECULATOR',
    behaviorFlow: verdictAction.includes('BUY') ? 'ACCUMULATING' : verdictAction.includes('SELL') ? 'DISTRIBUTING' : 'NEUTRAL',
    riskFromBots: result.riskLevel === 'EXTREME' ? 'HIGH' : result.riskLevel === 'HIGH' ? 'MEDIUM' : 'LOW',
    riskFromWhales: result.riskLevel === 'EXTREME' || result.riskLevel === 'HIGH' ? 'ELEVATED' : 'MODERATE',
    narrative: result.riskAssessment || 'Trader behavior assessment',
  };

  // Build risk assessment
  const riskAssessment: DeepAnalysis['riskAssessment'] = {
    overallRisk: result.riskLevel || 'MEDIUM',
    keyRisks: result.bearishFactors?.slice(0, 5) || [],
    mitigatingFactors: result.bullishFactors?.slice(0, 5) || [],
    blackSwanRisk: result.riskLevel === 'EXTREME' ? 'ELEVATED' : 'LOW',
  };

  // Build strategy recommendation
  const strategyRecommendation: DeepAnalysis['strategyRecommendation'] = {
    strategy: verdictAction.includes('BUY') ? 'LONG_ENTRY' : verdictAction.includes('SELL') ? 'SHORT_OR_EXIT' : 'WAIT_AND_MONITOR',
    direction: verdictAction.includes('BUY') ? 'LONG' : verdictAction.includes('SELL') ? 'SHORT' : 'NEUTRAL',
    confidenceLevel: result.recommendationConfidence,
    positionSizeRecommendation: `${result.maxRecommendedPositionPct || 5}% of portfolio`,
    stopLossRecommendation: `${((result.scenarios?.bear?.targetPct || -10)).toFixed(1)}% from entry`,
    takeProfitRecommendation: `${((result.scenarios?.bull?.targetPct || 15)).toFixed(1)}% from entry`,
    entryConditions: verdictAction.includes('BUY') ? ['Wait for confirmation candle', 'Check volume increase'] : ['N/A'],
    exitConditions: verdictAction.includes('SELL') ? ['Exit on next resistance test', 'Trail stop loss'] : ['Hold until trend reversal'],
  };

  // Build evidence matrix
  const pros = (result.bullishFactors || []).map(f => ({ factor: f, weight: 0.7, explanation: f }));
  const cons = (result.bearishFactors || []).map(f => ({ factor: f, weight: 0.6, explanation: f }));
  const neutrals = (result.neutralFactors || []).map(f => ({ factor: f, weight: 0.5, explanation: f }));

  // Build reasoning chain
  const reasoningChain = [
    `Risk Level: ${result.riskLevel || 'MEDIUM'} (Score: ${result.riskScore || 50}/100)`,
    `Source: ${result.source || 'RULE_BASED'}`,
    `Confidence: ${((result.recommendationConfidence || 0.5) * 100).toFixed(0)}%`,
    ...result.justification?.slice(0, 5) || [],
  ];

  return {
    tokenAddress: result.tokenAddress,
    symbol: result.symbol,
    chain: result.chain,
    depth: (result.depth as ThinkingDepth) || 'STANDARD',
    analyzedAt: result.analyzedAt,
    phaseAssessment,
    patternAssessment,
    traderAssessment,
    verdict,
    riskAssessment,
    strategyRecommendation,
    pros,
    cons,
    neutrals,
    reasoningChain,
    // Include raw result fields for additional data
    summary: result.summary,
    riskAssessmentText: result.riskAssessment,
    recommendation: result.recommendation,
    recommendationConfidence: result.recommendationConfidence,
    justification: result.justification,
    bullishFactors: result.bullishFactors,
    bearishFactors: result.bearishFactors,
    neutralFactors: result.neutralFactors,
    scenarios: result.scenarios,
    riskLevel: result.riskLevel,
    riskScore: result.riskScore,
    maxRecommendedPositionPct: result.maxRecommendedPositionPct,
    suggestedTimeHorizon: result.suggestedTimeHorizon,
    urgencyLevel: result.urgencyLevel,
    source: result.source,
  } as unknown as DeepAnalysis;
}

/**
 * Run the full deep analysis pipeline for a token.
 * Works with tokens from DB, DexScreener, or synthetic data.
 */
async function runAnalysis(
  token: { id: string; address: string; symbol: string; chain?: string; priceUsd: number; priceChange24h: number; dna?: any | null },
  chain: string,
  depth: string,
) {
  const tokenAddress = token.address;

  // Run the brain orchestrator analysis first
  const { analyzeToken } = await import('@/lib/services/brain-orchestrator');
  let brainResult;
  try {
    brainResult = await analyzeToken(tokenAddress, chain);
  } catch {
    brainResult = {
      regime: 'UNKNOWN', regimeConfidence: 0.3,
      lifecyclePhase: 'UNKNOWN', lifecycleConfidence: 0.3,
      netBehaviorFlow: 'NEUTRAL', botSwarmLevel: 'LOW',
      whaleDirection: 'NEUTRAL', operabilityScore: 30,
      candlesAvailable: 0,
    };
  }

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
  return await deepAnalysisEngine.analyze(analysisInput, depth as ThinkingDepth);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenAddress, chain = 'SOL', depth = 'STANDARD' } = body;

    if (!tokenAddress) {
      return NextResponse.json({ error: 'tokenAddress required' }, { status: 400 });
    }

    // Get token data from DB
    const token = await db.token.findUnique({
      where: { address: tokenAddress },
      include: { dna: true },
    });

    if (token) {
      // Token found in DB — run full analysis
      const result = await runAnalysis(token, chain, depth);
      return NextResponse.json({ success: true, analysis: transformToDeepAnalysis(result) });
    }

    // Token NOT in DB — try DexScreener
    try {
      const { dexScreenerClient } = await import('@/lib/services/dexscreener-client');
      const pairs = await dexScreenerClient.searchTokenPairs(tokenAddress);
      const pairData = pairs?.[0];

      if (pairData) {
        // Upsert token from DexScreener data
        const upserted = await db.token.upsert({
          where: { address: pairData.baseToken?.address || tokenAddress },
          update: {
            priceUsd: parseFloat(pairData.priceUsd || '0'),
            volume24h: pairData.volume?.h24 || 0,
            liquidity: pairData.liquidity?.usd || 0,
            priceChange24h: pairData.priceChange?.h24 || 0,
          },
          create: {
            address: pairData.baseToken?.address || tokenAddress,
            symbol: pairData.baseToken?.symbol || 'UNKNOWN',
            name: pairData.baseToken?.name || 'Unknown Token',
            chain: (pairData.chainId || chain).toUpperCase(),
            priceUsd: parseFloat(pairData.priceUsd || '0'),
            volume24h: pairData.volume?.h24 || 0,
            liquidity: pairData.liquidity?.usd || 0,
            marketCap: pairData.marketCap || 0,
            priceChange5m: pairData.priceChange?.m5 || 0,
            priceChange1h: pairData.priceChange?.h1 || 0,
            priceChange6h: pairData.priceChange?.h6 || 0,
            priceChange24h: pairData.priceChange?.h24 || 0,
            pairAddress: pairData.pairAddress || null,
            dexId: pairData.dexId || null,
          },
          include: { dna: true },
        });

        const result = await runAnalysis(upserted, chain, depth);
        return NextResponse.json({ success: true, analysis: transformToDeepAnalysis(result), source: 'dexscreener' });
      }
    } catch (fetchError) {
      console.warn('[DeepAnalysis] DexScreener lookup failed, using synthetic data:', fetchError);
    }

    // Final fallback: create synthetic token for analysis
    const syntheticToken = {
      id: 'synthetic',
      address: tokenAddress,
      symbol: tokenAddress.slice(0, 8).toUpperCase(),
      name: 'Unknown Token',
      chain: chain.toUpperCase(),
      priceUsd: 0,
      priceChange24h: 0,
      dna: null,
    };

    const result = await runAnalysis(syntheticToken as any, chain, depth);
    return NextResponse.json({ success: true, analysis: transformToDeepAnalysis(result), synthetic: true });
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
