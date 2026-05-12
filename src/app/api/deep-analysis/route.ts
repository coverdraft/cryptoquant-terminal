import { NextRequest, NextResponse } from 'next/server';
import type { ThinkingDepth } from '@/lib/services/deep-analysis-engine';
import { db } from '@/lib/db';

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
      return NextResponse.json({ success: true, analysis: result });
    }

    // Token NOT in DB — try DexScreener
    try {
      const { dexscreenerClient } = await import('@/lib/services/dexscreener-client');
      const searchResult = await dexscreenerClient.searchTokens(tokenAddress);
      const pairData = searchResult?.pairs?.[0];

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
            priceChange15m: pairData.priceChange?.m15 || 0,
            priceChange1h: pairData.priceChange?.h1 || 0,
            priceChange6h: pairData.priceChange?.h6 || 0,
            priceChange24h: pairData.priceChange?.h24 || 0,
            pairAddress: pairData.pairAddress || null,
            dexId: pairData.dexId || null,
          },
          include: { dna: true },
        });

        const result = await runAnalysis(upserted, chain, depth);
        return NextResponse.json({ success: true, analysis: result, source: 'dexscreener' });
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
    return NextResponse.json({ success: true, analysis: result, synthetic: true });
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
