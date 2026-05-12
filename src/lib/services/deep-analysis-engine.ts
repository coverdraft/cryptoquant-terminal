/**
 * Deep Analysis Engine - CryptoQuant Terminal
 * Motor de Análisis Profundo con LLM (z-ai-sdk) + Fallback Rule-Based
 *
 * Este motor proporciona análisis profundo de tokens usando:
 *   - LLM (z-ai-web-dev-sdk) para análisis cualitativo cuando está disponible
 *   - Fallback rule-based cuando el LLM no está disponible o falla
 *
 * El análisis profundo se ejecuta DESPUÉS del Candlestick Pattern Scan
 * y del Behavioral Prediction, combinando sus resultados con contexto
 * de mercado para producir un análisis accionable.
 *
 * Salida:
 *   - Resumen narrativo del estado del token
 *   - Evaluación de riesgo personalizada
 *   - Recomendación de acción con justificación
 *   - Factores clave a monitorear
 *   - Escenarios probables (bull/base/bear)
 */

import { db } from '../db';
import { type PatternScanResult } from './candlestick-pattern-engine';
import { type BehavioralPrediction } from './behavioral-model-engine';
import { type TokenAnalysis } from './brain-orchestrator';
import { TokenPhase } from './token-lifecycle-engine';

// ============================================================
// TYPES
// ============================================================

export type AnalysisDepth = 'QUICK' | 'STANDARD' | 'DEEP';
export type ThinkingDepth = AnalysisDepth; // Alias used by pipeline and UI
export type RiskLevel = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | 'EXTREME';
export type ActionRecommendation = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'REDUCE' | 'SELL' | 'AVOID' | 'STRONG_SELL' | 'WAIT';

/** Extended input type used by the brain-analysis-pipeline */
export interface AnalysisInput {
  tokenAddress: string;
  symbol: string;
  chain: string;
  currentPrice: number;
  priceChange24h: number;
  regime: string;
  regimeConfidence: number;
  lifecyclePhase: string;
  lifecycleConfidence: number;
  netBehaviorFlow: string;
  botSwarmLevel: string;
  whaleDirection: string;
  operabilityScore: number;
  patternScan?: PatternScanResult;
  crossCorrelation?: Record<string, unknown>;
  dataReliability: {
    sampleSufficiency: string;
    totalCorrelationSamples: number;
    reliableCombinations: number;
  };
  candles1h: number;
  candles5m: number;
  tradersAnalyzed: number;
  signalsGenerated: number;
}

/** Rich deep analysis type used by the UI (deep-analysis-panel) */
export interface DeepAnalysis {
  tokenAddress: string;
  symbol: string;
  chain: string;
  depth: ThinkingDepth;
  analyzedAt: Date;

  // Phase assessment
  phaseAssessment: {
    phase: string;
    confidence: number;
    timeInPhase: string;
    narrative: string;
  };

  // Pattern assessment
  patternAssessment: {
    dominantPattern: string | null;
    patternSentiment: string;
    multiTfConfirmed: boolean;
    narrative: string;
  };

  // Trader assessment
  traderAssessment: {
    dominantArchetype: string;
    behaviorFlow: string;
    riskFromBots: string;
    riskFromWhales: string;
    narrative: string;
  };

  // Verdict
  verdict: {
    action: string;
    confidence: number;
    reasoning: string;
    summary?: string;
    criticalNote?: string;
  };

  // Risk assessment
  riskAssessment: {
    overallRisk: string;
    keyRisks: string[];
    mitigatingFactors: string[];
    blackSwanRisk: string;
  };

  // Strategy recommendation
  strategyRecommendation: {
    strategy: string;
    direction: string;
    confidenceLevel: number;
    positionSizeRecommendation: string;
    stopLossRecommendation: string;
    takeProfitRecommendation: string;
    entryConditions: string[];
    exitConditions: string[];
  };

  // Evidence matrix
  pros: Array<{ factor: string; weight: number; explanation: string }>;
  cons: Array<{ factor: string; weight: number; explanation: string }>;
  neutrals: Array<{ factor: string; weight: number; explanation: string }>;

  // Reasoning
  reasoningChain: string[];

  // Timestamp (from DeepAnalysisResult)
  timestamp?: Date;
}

export interface DeepAnalysisResult {
  tokenAddress: string;
  symbol: string;
  chain: string;
  analyzedAt: Date;
  depth: AnalysisDepth;
  source: 'LLM' | 'RULE_BASED' | 'HYBRID';

  // Narrative
  summary: string;
  riskAssessment: string;
  recommendation: ActionRecommendation;
  recommendationConfidence: number; // 0-1
  justification: string[];

  // Key factors
  bullishFactors: string[];
  bearishFactors: string[];
  neutralFactors: string[];
  keyMonitorPoints: string[];

  // Scenarios
  scenarios: {
    bull: { probability: number; targetPct: number; description: string };
    base: { probability: number; targetPct: number; description: string };
    bear: { probability: number; targetPct: number; description: string };
  };

  // Risk
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  maxRecommendedPositionPct: number;

  // Timing
  suggestedTimeHorizon: string;
  urgencyLevel: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';

  // LLM raw output (if available)
  llmRawAnalysis?: string;
}

export interface DeepAnalysisInput {
  tokenAddress: string;
  symbol: string;
  chain: string;
  brainAnalysis: TokenAnalysis;
  patternScan?: PatternScanResult;
  behavioralPrediction?: BehavioralPrediction;
  depth?: AnalysisDepth;
}

// ============================================================
// RISK SCORING
// ============================================================

const PHASE_RISK: Record<string, number> = {
  GENESIS: 85, INCIPIENT: 70, GROWTH: 40, FOMO: 60, DECLINE: 75, LEGACY: 50,
};

const REGIME_RISK: Record<string, number> = {
  BULL: 25, SIDEWAYS: 45, TRANSITION: 60, BEAR: 80,
};

const BOT_SWARM_RISK: Record<string, number> = {
  NONE: 0, LOW: 15, MEDIUM: 35, HIGH: 55, CRITICAL: 80,
};

// ============================================================
// RULE-BASED ANALYSIS ENGINE
// ============================================================

function ruleBasedAnalysis(input: DeepAnalysisInput): DeepAnalysisResult {
  const { brainAnalysis: brain, patternScan, behavioralPrediction: behavior, symbol, chain, tokenAddress } = input;
  const depth = input.depth ?? 'STANDARD';
  const isQuick = depth === 'QUICK';
  const isDeep = depth === 'DEEP';

  // === FACTOR COLLECTION ===
  const bullishFactors: string[] = [];
  const bearishFactors: string[] = [];
  const neutralFactors: string[] = [];
  const justification: string[] = [];
  const keyMonitorPoints: string[] = [];

  // Depth-dependent factor limits
  const maxBullFactors = isQuick ? 3 : isDeep ? 12 : 6;
  const maxBearFactors = isQuick ? 3 : isDeep ? 12 : 6;
  const maxNeutralFactors = isQuick ? 1 : isDeep ? 6 : 3;
  const maxJustification = isQuick ? 2 : isDeep ? 10 : 5;
  const maxMonitorPoints = isQuick ? 2 : isDeep ? 8 : 4;

  // Phase factors
  const phaseRisk = PHASE_RISK[brain.lifecyclePhase] ?? 50;
  if (['GROWTH', 'LEGACY'].includes(brain.lifecyclePhase)) {
    bullishFactors.push(`${brain.lifecyclePhase} lifecycle phase (favorable for upside)`);
    if (isDeep) bullishFactors.push(`Phase momentum: ${brain.lifecyclePhase} tokens historically show ${brain.lifecyclePhase === 'GROWTH' ? 'sustained uptrend' : 'stability'}`);
  } else if (['GENESIS', 'DECLINE'].includes(brain.lifecyclePhase)) {
    bearishFactors.push(`${brain.lifecyclePhase} lifecycle phase (higher risk/uncertainty)`);
    if (isDeep) bearishFactors.push(`${brain.lifecyclePhase} phase tokens typically experience ${brain.lifecyclePhase === 'GENESIS' ? 'extreme volatility in first hours' : 'prolonged downtrend pressure'}`);
  } else {
    neutralFactors.push(`${brain.lifecyclePhase} phase - neutral positioning`);
    if (isDeep) neutralFactors.push(`INCIPIENT/FOMO phases often precede significant moves; direction depends on volume confirmation`);
  }

  // Regime factors
  const regimeRisk = REGIME_RISK[brain.regime] ?? 50;
  if (brain.regime === 'BULL') {
    bullishFactors.push(`Bull market regime with ${(brain.regimeConfidence * 100).toFixed(0)}% confidence`);
    if (isDeep) bullishFactors.push(`Bull regime tailwind: historical data shows ${brain.regimeConfidence > 0.7 ? 'strong' : 'moderate'} upside bias in this regime`);
  } else if (brain.regime === 'BEAR') {
    bearishFactors.push(`Bear market regime with ${(brain.regimeConfidence * 100).toFixed(0)}% confidence`);
    if (isDeep) bearishFactors.push(`Bear regime headwind: defensive positioning recommended; ${brain.regimeConfidence > 0.7 ? 'high' : 'moderate'} conviction of continued downside`);
  } else if (brain.regime === 'TRANSITION' && isDeep) {
    neutralFactors.push('Transition regime detected - market direction uncertain, reduced position sizing advisable');
  }

  // Pattern factors
  if (patternScan) {
    if (patternScan.overallSignal === 'BULLISH') {
      bullishFactors.push(`Candlestick patterns: ${patternScan.bullishPatterns.length} bullish signals (score: ${patternScan.overallScore.toFixed(2)})`);
      if (patternScan.confluences.length > 0) {
        bullishFactors.push(`Pattern confluences: ${patternScan.confluences.map(c => c.pattern).join(', ')}`);
      }
      if (isDeep) {
        for (const bp of patternScan.bullishPatterns.slice(0, 3)) {
          bullishFactors.push(`Bullish pattern: ${bp.pattern} on ${bp.timeframe} (confidence: ${(bp.confidence * 100).toFixed(0)}%)`);
        }
      }
    } else if (patternScan.overallSignal === 'BEARISH') {
      bearishFactors.push(`Candlestick patterns: ${patternScan.bearishPatterns.length} bearish signals (score: ${patternScan.overallScore.toFixed(2)})`);
      if (isDeep) {
        for (const bp of patternScan.bearishPatterns.slice(0, 3)) {
          bearishFactors.push(`Bearish pattern: ${bp.pattern} on ${bp.timeframe} (confidence: ${(bp.confidence * 100).toFixed(0)}%)`);
        }
      }
    } else {
      neutralFactors.push(`Candlestick patterns: mixed/neutral (${patternScan.patterns.length} total)`);
    }
    if (patternScan.dominantPattern) {
      keyMonitorPoints.push(`Watch for ${patternScan.dominantPattern} pattern continuation or invalidation on ${patternScan.dominantTimeframe}`);
      if (isDeep) keyMonitorPoints.push(`Pattern invalidation level: if price breaks ${patternScan.overallSignal === 'BULLISH' ? 'below support' : 'above resistance'}, pattern fails`);
    }
  }

  // Behavioral factors
  if (behavior) {
    if (behavior.netFlowDirection === 'BULLISH') {
      bullishFactors.push(`Trader behavior: net bullish flow (score: ${behavior.netFlowScore.toFixed(2)})`);
      if (isDeep) bullishFactors.push(`Flow momentum: ${behavior.netFlowScore > 0.7 ? 'strong' : 'moderate'} bullish conviction with ${(behavior.confidence * 100).toFixed(0)}% prediction reliability`);
    } else if (behavior.netFlowDirection === 'BEARISH') {
      bearishFactors.push(`Trader behavior: net bearish flow (score: ${behavior.netFlowScore.toFixed(2)})`);
      if (isDeep) bearishFactors.push(`Flow momentum: ${behavior.netFlowScore < -0.7 ? 'strong' : 'moderate'} bearish conviction with ${(behavior.confidence * 100).toFixed(0)}% prediction reliability`);
    }
    if (behavior.archetypeBreakdown.length > 0) {
      const topArch = behavior.archetypeBreakdown[0];
      keyMonitorPoints.push(`Top trader archetype: ${topArch.archetype} (${topArch.dominantAction}, ${topArch.volumeShare.toFixed(0)}% volume)`);
      if (isDeep && behavior.archetypeBreakdown.length > 1) {
        const secondArch = behavior.archetypeBreakdown[1];
        keyMonitorPoints.push(`Secondary archetype: ${secondArch.archetype} (${secondArch.dominantAction}, ${secondArch.volumeShare.toFixed(0)}% volume)`);
      }
    }
    if (behavior.confidence > 0.7) {
      justification.push(`High behavioral prediction confidence (${(behavior.confidence * 100).toFixed(0)}%)`);
    }
    if (isDeep && behavior.archetypeBreakdown.length > 0) {
      for (const arch of behavior.archetypeBreakdown.slice(0, 3)) {
        justification.push(`[${arch.archetype}] ${arch.dominantAction} - ${(arch.volumeShare * 100).toFixed(1)}% volume share`);
      }
    }
  }

  // Whale & smart money
  if (brain.whaleDirection === 'ACCUMULATING') {
    bullishFactors.push(`Whales accumulating (${(brain.whaleConfidence * 100).toFixed(0)}% confidence)`);
    if (isDeep) bullishFactors.push(`Whale accumulation pattern: ${brain.whaleConfidence > 0.7 ? 'Large wallets consistently adding positions' : 'Moderate whale buying activity observed'}`);
  } else if (brain.whaleDirection === 'DISTRIBUTING') {
    bearishFactors.push(`Whales distributing (${(brain.whaleConfidence * 100).toFixed(0)}% confidence)`);
    if (isDeep) bearishFactors.push(`Whale distribution alert: ${brain.whaleConfidence > 0.7 ? 'Large wallets actively selling into strength' : 'Some large wallet reduction observed'}`);
  }
  if (brain.smartMoneyFlow === 'INFLOW') {
    bullishFactors.push('Smart money inflow detected');
    if (isDeep) bullishFactors.push('Smart money entry typically precedes significant price moves - monitor for acceleration');
  } else if (brain.smartMoneyFlow === 'OUTFLOW') {
    bearishFactors.push('Smart money outflow detected');
    if (isDeep) bearishFactors.push('Smart money exit often signals impending correction - consider reducing exposure');
  }

  // Bot swarm
  const botRisk = BOT_SWARM_RISK[brain.botSwarmLevel] ?? 0;
  if (brain.botSwarmLevel === 'CRITICAL' || brain.botSwarmLevel === 'HIGH') {
    bearishFactors.push(`${brain.botSwarmLevel} bot swarm activity - retail front-running risk`);
    keyMonitorPoints.push('Monitor bot activity for changes - high bot presence increases slippage risk');
    if (isDeep) {
      bearishFactors.push(`Bot swarm impact: ${brain.botSwarmLevel === 'CRITICAL' ? 'Extreme MEV extraction risk, avoid market orders' : 'Elevated sandwich attack probability, use limit orders'}`);
      keyMonitorPoints.push('Bot behavior can shift rapidly - set alerts for bot activity level changes');
    }
  } else if (isDeep && brain.botSwarmLevel === 'MEDIUM') {
    neutralFactors.push('Moderate bot activity - exercise caution with order execution');
  }

  // Operability
  if (brain.operabilityLevel === 'PREMIUM' || brain.operabilityLevel === 'GOOD') {
    bullishFactors.push(`Operability: ${brain.operabilityLevel} (score: ${brain.operabilityScore}/100)`);
    if (isDeep) bullishFactors.push(`High operability means lower slippage and better fill quality - favorable for both entry and exit execution`);
  } else if (brain.operabilityLevel === 'RISKY' || brain.operabilityLevel === 'UNOPERABLE') {
    bearishFactors.push(`Low operability: ${brain.operabilityLevel} (fees/slippage erode gains)`);
    if (isDeep) bearishFactors.push(`Operability score ${brain.operabilityScore}/100 indicates ${brain.operabilityLevel === 'UNOPERABLE' ? 'severe' : 'significant'} execution risk - avoid large positions`);
  }

  // Anomaly
  if (brain.anomalyDetected) {
    neutralFactors.push(`Volume anomaly detected (score: ${brain.anomalyScore.toFixed(2)})`);
    keyMonitorPoints.push('Volume anomaly - could indicate catalyst event or manipulation');
    if (isDeep) {
      neutralFactors.push(`Anomaly score ${brain.anomalyScore.toFixed(2)} suggests ${brain.anomalyScore > 0.8 ? 'high probability of significant event' : 'moderate unusual activity'}`);
      keyMonitorPoints.push('Anomalous volume patterns often precede major moves - prepare for increased volatility');
    }
  }

  // Transition
  if (brain.isTransitioning) {
    neutralFactors.push('Token is transitioning between lifecycle phases');
    keyMonitorPoints.push('Phase transition in progress - direction uncertainty elevated');
    if (isDeep) {
      neutralFactors.push('Phase transitions are high-uncertainty periods - trend direction may reverse or accelerate sharply');
      keyMonitorPoints.push('Monitor on-chain metrics closely during transition for early direction signals');
    }
  }

  // === RISK SCORING ===
  const baseRisk = (phaseRisk + regimeRisk + botRisk) / 3;
  const bullCount = bullishFactors.length;
  const bearCount = bearishFactors.length;
  const factorAdjustment = (bearCount - bullCount) * 5;
  let riskScore = Math.max(0, Math.min(100, baseRisk + factorAdjustment));

  // Adjust for operability
  if (brain.isOperable) riskScore = Math.max(0, riskScore - 10);
  else riskScore = Math.min(100, riskScore + 15);

  let riskLevel: RiskLevel;
  if (riskScore <= 20) riskLevel = 'VERY_LOW';
  else if (riskScore <= 40) riskLevel = 'LOW';
  else if (riskScore <= 60) riskLevel = 'MEDIUM';
  else if (riskScore <= 80) riskLevel = 'HIGH';
  else riskLevel = 'VERY_HIGH';

  // === RECOMMENDATION ===
  let recommendation: ActionRecommendation;
  let recommendationConfidence: number;
  const netFactors = bullCount - bearCount;

  if (riskScore <= 30 && netFactors >= 3) {
    recommendation = 'STRONG_BUY';
    recommendationConfidence = 0.8;
  } else if (riskScore <= 45 && netFactors >= 1) {
    recommendation = 'BUY';
    recommendationConfidence = 0.65;
  } else if (riskScore <= 60 && Math.abs(netFactors) <= 1) {
    recommendation = 'HOLD';
    recommendationConfidence = 0.5;
  } else if (riskScore <= 70 && netFactors <= -1) {
    recommendation = 'REDUCE';
    recommendationConfidence = 0.6;
  } else if (riskScore <= 85 && netFactors <= -2) {
    recommendation = 'SELL';
    recommendationConfidence = 0.7;
  } else if (riskScore > 85) {
    recommendation = 'AVOID';
    recommendationConfidence = 0.85;
  } else {
    recommendation = 'HOLD';
    recommendationConfidence = 0.45;
  }

  // Adjust confidence based on data availability
  if (patternScan) recommendationConfidence = Math.min(1, recommendationConfidence + 0.1);
  if (behavior) recommendationConfidence = Math.min(1, recommendationConfidence + 0.1);

  justification.push(
    `Risk: ${riskLevel} (${riskScore.toFixed(0)}/100) | Bull factors: ${bullCount} | Bear factors: ${bearCount}`,
  );

  // Depth-specific justification
  if (isDeep) {
    justification.push(`[DEEP] Phase: ${brain.lifecyclePhase} (risk contribution: ${phaseRisk.toFixed(0)}/100)`);
    justification.push(`[DEEP] Regime: ${brain.regime} (risk contribution: ${regimeRisk.toFixed(0)}/100)`);
    justification.push(`[DEEP] Bot risk: ${brain.botSwarmLevel} (risk contribution: ${botRisk.toFixed(0)}/100)`);
    justification.push(`[DEEP] Operability: ${brain.operabilityLevel} (${brain.operabilityScore}/100)`);
    if (patternScan) justification.push(`[DEEP] Pattern signal: ${patternScan.overallSignal} (${patternScan.patterns.length} patterns, score: ${patternScan.overallScore.toFixed(2)})`);
    if (behavior) justification.push(`[DEEP] Trader flow: ${behavior.netFlowDirection} (score: ${behavior.netFlowScore.toFixed(2)}, confidence: ${(behavior.confidence * 100).toFixed(0)}%)`);
  } else if (!isQuick) {
    justification.push(`Phase: ${brain.lifecyclePhase} | Regime: ${brain.regime} | Bots: ${brain.botSwarmLevel}`);
  }

  // === SCENARIOS ===
  const bullProb = Math.max(0.05, Math.min(0.8, 0.3 + netFactors * 0.08 - riskScore * 0.003));
  const bearProb = Math.max(0.05, Math.min(0.8, 0.3 - netFactors * 0.08 + riskScore * 0.003));
  const baseProb = Math.max(0.1, 1 - bullProb - bearProb);

  const bullTarget = brain.lifecyclePhase === 'GROWTH' ? 25 : brain.lifecyclePhase === 'FOMO' ? 40 : 15;
  const bearTarget = brain.regime === 'BEAR' ? -30 : brain.lifecyclePhase === 'DECLINE' ? -25 : -15;
  const baseTarget = bullTarget * 0.2 + bearTarget * 0.2;

  // === MAX POSITION ===
  const maxPosition = riskScore <= 20 ? 10 : riskScore <= 40 ? 7 : riskScore <= 60 ? 5 : riskScore <= 80 ? 3 : 1;

  // === TIMING ===
  let urgency: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';
  if (patternScan?.confluences.length ?? 0 > 0) urgency = 'IMMEDIATE';
  else if (brain.isTransitioning) urgency = 'HIGH';
  else if (brain.anomalyDetected) urgency = 'HIGH';
  else if (netFactors >= 2 || netFactors <= -2) urgency = 'MEDIUM';
  else urgency = 'LOW';

  const timeHorizon = brain.lifecyclePhase === 'GENESIS' ? '1-4 hours'
    : brain.lifecyclePhase === 'INCIPIENT' ? '4-12 hours'
    : brain.lifecyclePhase === 'GROWTH' ? '1-3 days'
    : brain.lifecyclePhase === 'FOMO' ? '2-8 hours'
    : brain.lifecyclePhase === 'DECLINE' ? '1-7 days'
    : '1-14 days';

  // === SUMMARY ===
  let summary: string;
  if (isQuick) {
    summary = `${symbol || tokenAddress.slice(0,8)}: ${recommendation} (risk: ${riskLevel}, confidence: ${(recommendationConfidence * 100).toFixed(0)}%). `
      + `${bullCount} bull / ${bearCount} bear factors.`;
  } else if (isDeep) {
    summary = `${symbol || tokenAddress.slice(0,8)} is in ${brain.lifecyclePhase} phase within a ${brain.regime} regime (${(brain.regimeConfidence * 100).toFixed(0)}% confidence). `
      + `Comprehensive analysis identifies ${bullCount} bullish factors vs ${bearCount} bearish factors (${neutralFactors.length} neutral). `
      + `Overall risk: ${riskLevel} (${riskScore.toFixed(0)}/100). Recommendation: ${recommendation} with ${(recommendationConfidence * 100).toFixed(0)}% confidence.`
      + (patternScan ? ` Candlestick analysis: ${patternScan.overallSignal} bias with ${patternScan.patterns.length} patterns detected (score: ${patternScan.overallScore.toFixed(2)}). ${patternScan.confluences.length > 0 ? `${patternScan.confluences.length} confluences confirmed across timeframes.` : 'No multi-timeframe confluences.'}` : '')
      + (behavior ? ` Trader behavior: ${behavior.netFlowDirection} flow (${behavior.netFlowScore.toFixed(2)} score, ${behavior.archetypeBreakdown.length} archetypes identified).` : '')
      + ` Maximum recommended position: ${maxPosition}% of capital. Suggested horizon: ${timeHorizon}.`;
  } else {
    summary = `${symbol || tokenAddress.slice(0,8)} is in ${brain.lifecyclePhase} phase within a ${brain.regime} regime. `
      + `${bullCount} bullish factors vs ${bearCount} bearish factors. `
      + `Overall risk: ${riskLevel}. Recommendation: ${recommendation}.`
      + (patternScan ? ` Candlestick patterns suggest ${patternScan.overallSignal} bias.` : '')
      + (behavior ? ` Trader behavior: ${behavior.netFlowDirection}.` : '');
  }

  let riskAssessment: string;
  if (isQuick) {
    riskAssessment = `Risk: ${riskLevel} (${riskScore.toFixed(0)}/100). Max position: ${maxPosition}%.`;
  } else if (isDeep) {
    riskAssessment = `Risk level: ${riskLevel} (${riskScore.toFixed(0)}/100). `
      + `Phase risk: ${phaseRisk.toFixed(0)}/100, Regime risk: ${regimeRisk.toFixed(0)}/100, Bot risk: ${botRisk.toFixed(0)}/100. `
      + `Operability: ${brain.operabilityLevel} (${brain.operabilityScore}/100). `
      + `Maximum recommended position: ${maxPosition}% of capital. `
      + `Whale risk: ${brain.whaleDirection} (${(brain.whaleConfidence * 100).toFixed(0)}%). `
      + `Smart money: ${brain.smartMoneyFlow}. `
      + `Volatility regime: ${brain.volatilityRegime || 'NORMAL'}. `
      + `Anomaly: ${brain.anomalyDetected ? `Detected (${brain.anomalyScore.toFixed(2)})` : 'None'}. `
      + `Transition: ${brain.isTransitioning ? 'Yes - elevated uncertainty' : 'No'}.`;
  } else {
    riskAssessment = `Risk level: ${riskLevel} (${riskScore.toFixed(0)}/100). `
      + `Phase risk: ${phaseRisk.toFixed(0)}/100, Regime risk: ${regimeRisk.toFixed(0)}/100, Bot risk: ${botRisk.toFixed(0)}/100. `
      + `Operability: ${brain.operabilityLevel} (${brain.operabilityScore}/100). `
      + `Maximum recommended position: ${maxPosition}% of capital.`;
  }

  // Apply depth-based factor limits
  const limitedBull = bullishFactors.slice(0, maxBullFactors);
  const limitedBear = bearishFactors.slice(0, maxBearFactors);
  const limitedNeutral = neutralFactors.slice(0, maxNeutralFactors);
  const limitedJustification = justification.slice(0, maxJustification);
  const limitedMonitor = keyMonitorPoints.slice(0, maxMonitorPoints);

  // Depth-specific scenario descriptions
  const bullDesc = isDeep
    ? `Bull case: Strong momentum continues with ${brain.regime === 'BULL' ? 'regime tailwind' : 'improving conditions'}. ${bullTarget}%+ upside over ${timeHorizon}. Key catalyst: ${limitedBull[0] || 'market dynamics'}.`
    : `Strong momentum continues, ${bullTarget}%+ upside`;
  const baseDesc = isDeep
    ? `Base case: Sideways consolidation within ${baseTarget > 0 ? '+' : ''}${baseTarget}% range. ${limitedNeutral.length > 0 ? `Neutral factors: ${limitedNeutral[0]}.` : ''} Market awaiting direction catalyst.`
    : `Sideways consolidation, ${baseTarget > 0 ? '+' : ''}${baseTarget}% move`;
  const bearDesc = isDeep
    ? `Bear case: Deterioration likely if ${limitedBear[0] || 'risk factors materialize'}. ${bearTarget}% decline over ${timeHorizon}. ${brain.botSwarmLevel === 'HIGH' || brain.botSwarmLevel === 'CRITICAL' ? 'Bot activity amplifies downside risk.' : ''}`
    : `Deterioration, ${bearTarget}% decline`;

  return {
    tokenAddress,
    symbol: symbol || '',
    chain,
    analyzedAt: new Date(),
    depth,
    source: 'RULE_BASED',
    summary,
    riskAssessment,
    recommendation,
    recommendationConfidence,
    justification: limitedJustification,
    bullishFactors: limitedBull,
    bearishFactors: limitedBear,
    neutralFactors: limitedNeutral,
    keyMonitorPoints: limitedMonitor,
    scenarios: {
      bull: { probability: bullProb, targetPct: bullTarget, description: bullDesc },
      base: { probability: baseProb, targetPct: baseTarget, description: baseDesc },
      bear: { probability: bearProb, targetPct: bearTarget, description: bearDesc },
    },
    riskLevel,
    riskScore,
    maxRecommendedPositionPct: maxPosition,
    suggestedTimeHorizon: timeHorizon,
    urgencyLevel: urgency,
  };
}

// ============================================================
// LLM ANALYSIS ENGINE
// ============================================================

async function llmAnalysis(input: DeepAnalysisInput): Promise<DeepAnalysisResult | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const { brainAnalysis: brain, patternScan, behavioralPrediction: behavior, symbol, chain, tokenAddress } = input;

    // Build context for LLM
    const context = `
TOKEN ANALYSIS DATA:
- Symbol: ${symbol}
- Chain: ${chain}
- Address: ${tokenAddress}
- Lifecycle Phase: ${brain.lifecyclePhase} (confidence: ${(brain.lifecycleConfidence * 100).toFixed(0)}%)
- Market Regime: ${brain.regime} (confidence: ${(brain.regimeConfidence * 100).toFixed(0)}%)
- Volatility: ${brain.volatilityRegime}
- Operability: ${brain.operabilityLevel} (${brain.operabilityScore}/100)
- Bot Swarm: ${brain.botSwarmLevel}
- Whale Direction: ${brain.whaleDirection} (${(brain.whaleConfidence * 100).toFixed(0)}%)
- Smart Money: ${brain.smartMoneyFlow}
- Mean Reversion Zone: ${brain.meanReversionZone ? `$${brain.meanReversionZone.lowerBound.toFixed(4)}-$${brain.meanReversionZone.upperBound.toFixed(4)} (${(brain.meanReversionZone.probabilityOfReversion * 100).toFixed(0)}%)` : 'N/A'}
- Anomaly: ${brain.anomalyDetected ? `Yes (score: ${brain.anomalyScore.toFixed(2)})` : 'No'}
${patternScan ? `- Candlestick Patterns: ${patternScan.overallSignal} (score: ${patternScan.overallScore.toFixed(2)})
  Bullish: ${patternScan.bullishPatterns.map(p => p.pattern).join(', ') || 'none'}
  Bearish: ${patternScan.bearishPatterns.map(p => p.pattern).join(', ') || 'none'}
  Confluences: ${patternScan.confluences.map(c => `${c.pattern} on ${c.timeframes.join('+')}`).join('; ') || 'none'}` : '- Candlestick Patterns: Not scanned'}
${behavior ? `- Trader Behavior: ${behavior.netFlowDirection} (flow: ${behavior.netFlowScore.toFixed(2)}, confidence: ${(behavior.confidence * 100).toFixed(0)}%)
  Top Archetype: ${behavior.archetypeBreakdown[0]?.archetype ?? 'unknown'} (${behavior.archetypeBreakdown[0]?.dominantAction ?? 'N/A'})` : '- Trader Behavior: Not analyzed'}
- Warnings: ${brain.warnings.join('; ') || 'none'}
- Evidence: ${brain.evidence.slice(0, 5).join('; ') || 'none'}
`.trim();

    const depthInstruction = input.depth === 'DEEP'
      ? 'Provide a COMPREHENSIVE deep analysis with detailed reasoning, 5-8 bullish/bearish factors, detailed scenario narratives, specific entry/exit conditions, and risk breakdowns. Include specific price levels where possible.'
      : input.depth === 'QUICK'
      ? 'Provide a BRIEF quick scan summary. Keep it concise: 1-2 bullish/bearish factors, short summary, basic recommendation.'
      : 'Provide a balanced standard analysis with moderate detail.';

    const maxFactors = input.depth === 'DEEP' ? 8 : input.depth === 'QUICK' ? 2 : 4;

    const prompt = `You are a professional crypto analyst. ${depthInstruction}

${context}

Respond in this EXACT JSON format (no markdown, no code blocks):
{
  "summary": "${input.depth === 'DEEP' ? '4-5 sentence comprehensive narrative' : input.depth === 'QUICK' ? '1-2 sentence brief summary' : '2-3 sentence narrative summary'}",
  "riskAssessment": "${input.depth === 'DEEP' ? '2-3 sentence detailed risk assessment with specific risk categories' : '1-2 sentence risk assessment'}",
  "recommendation": "STRONG_BUY|BUY|HOLD|REDUCE|SELL|AVOID",
  "confidence": 0.0-1.0,
  "bullishFactors": ["factor1", "factor2" ${input.depth === 'DEEP' ? ', "factor3", "factor4"' : ''}],
  "bearishFactors": ["factor1", "factor2" ${input.depth === 'DEEP' ? ', "factor3", "factor4"' : ''}],
  "keyMonitorPoints": ["point1", "point2" ${input.depth === 'DEEP' ? ', "point3", "point4"' : ''}],
  "bullScenario": {"probability": 0.0-1.0, "targetPct": number, "description": "${input.depth === 'DEEP' ? 'Detailed bull case with specific catalysts and price targets' : 'Bull case description'}"},
  "baseScenario": {"probability": 0.0-1.0, "targetPct": number, "description": "${input.depth === 'DEEP' ? 'Detailed base case with range expectations' : 'Base case description'}"},
  "bearScenario": {"probability": 0.0-1.0, "targetPct": number, "description": "${input.depth === 'DEEP' ? 'Detailed bear case with specific risks and invalidation levels' : 'Bear case description'}"},
  "riskLevel": "VERY_LOW|LOW|MEDIUM|HIGH|VERY_HIGH",
  "riskScore": 0-100,
  "maxPositionPct": 1-10,
  "timeHorizon": "text",
  "urgency": "IMMEDIATE|HIGH|MEDIUM|LOW"${input.depth === 'DEEP' ? ',\\n  "entryConditions": ["condition1", "condition2", "condition3"],\\n  "exitConditions": ["condition1", "condition2", "condition3"],\\n  "invalidationLevel": "price or condition that invalidates the thesis",\\n  "keyAssumptions": ["assumption1", "assumption2"]' : ''}\n}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a professional cryptocurrency analyst. Always respond with valid JSON only, no markdown.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) return null;

    // Parse LLM response
    let parsed: Record<string, unknown>;
    try {
      const jsonStr = rawContent.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      return null;
    }

    // Map LLM response to our type
    const rec = String(parsed.recommendation || 'HOLD') as ActionRecommendation;
    const rl = String(parsed.riskLevel || 'MEDIUM') as RiskLevel;

    return {
      tokenAddress,
      symbol: symbol || '',
      chain,
      analyzedAt: new Date(),
      depth: input.depth ?? 'STANDARD',
      source: 'LLM',
      summary: String(parsed.summary || ''),
      riskAssessment: String(parsed.riskAssessment || ''),
      recommendation: rec,
      recommendationConfidence: Number(parsed.confidence || 0.5),
      justification: [`LLM analysis: ${rec} with ${(Number(parsed.confidence || 0.5) * 100).toFixed(0)}% confidence`],
      bullishFactors: Array.isArray(parsed.bullishFactors) ? parsed.bullishFactors.map(String) : [],
      bearishFactors: Array.isArray(parsed.bearishFactors) ? parsed.bearishFactors.map(String) : [],
      neutralFactors: [],
      keyMonitorPoints: Array.isArray(parsed.keyMonitorPoints) ? parsed.keyMonitorPoints.map(String) : [],
      scenarios: {
        bull: {
          probability: Number((parsed.bullScenario as Record<string, unknown>)?.probability || 0.35),
          targetPct: Number((parsed.bullScenario as Record<string, unknown>)?.targetPct || 20),
          description: String((parsed.bullScenario as Record<string, unknown>)?.description || ''),
        },
        base: {
          probability: Number((parsed.baseScenario as Record<string, unknown>)?.probability || 0.35),
          targetPct: Number((parsed.baseScenario as Record<string, unknown>)?.targetPct || 5),
          description: String((parsed.baseScenario as Record<string, unknown>)?.description || ''),
        },
        bear: {
          probability: Number((parsed.bearScenario as Record<string, unknown>)?.probability || 0.30),
          targetPct: Number((parsed.bearScenario as Record<string, unknown>)?.targetPct || -15),
          description: String((parsed.bearScenario as Record<string, unknown>)?.description || ''),
        },
      },
      riskLevel: rl,
      riskScore: Number(parsed.riskScore || 50),
      maxRecommendedPositionPct: Number(parsed.maxPositionPct || 5),
      suggestedTimeHorizon: String(parsed.timeHorizon || '1-3 days'),
      urgencyLevel: String(parsed.urgency || 'MEDIUM') as DeepAnalysisResult['urgencyLevel'],
      llmRawAnalysis: rawContent,
    };
  } catch (error) {
    console.warn('[DeepAnalysis] LLM analysis failed, using rule-based fallback:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

// ============================================================
// HYBRID: Merge LLM + Rule-Based
// ============================================================

function mergeAnalyses(llm: DeepAnalysisResult, rule: DeepAnalysisResult): DeepAnalysisResult {
  // Use LLM for narrative, rule-based for risk scoring
  // Weight: LLM narrative 70%, rule risk scoring 30%
  const mergedRisk = rule.riskScore * 0.6 + llm.riskScore * 0.4;
  const mergedConfidence = (llm.recommendationConfidence + rule.recommendationConfidence) / 2;

  return {
    ...llm,
    source: 'HYBRID',
    riskScore: Math.round(mergedRisk),
    riskLevel: mergedRisk <= 20 ? 'VERY_LOW' : mergedRisk <= 40 ? 'LOW' : mergedRisk <= 60 ? 'MEDIUM' : mergedRisk <= 80 ? 'HIGH' : 'VERY_HIGH',
    recommendationConfidence: mergedConfidence,
    bullishFactors: [...new Set([...llm.bullishFactors, ...rule.bullishFactors])],
    bearishFactors: [...new Set([...llm.bearishFactors, ...rule.bearishFactors])],
    neutralFactors: [...new Set([...llm.neutralFactors, ...rule.neutralFactors])],
    keyMonitorPoints: [...new Set([...llm.keyMonitorPoints, ...rule.keyMonitorPoints])].slice(0, 8),
    justification: [...llm.justification, ...rule.justification],
    scenarios: {
      bull: { probability: (llm.scenarios.bull.probability + rule.scenarios.bull.probability) / 2, targetPct: (llm.scenarios.bull.targetPct + rule.scenarios.bull.targetPct) / 2, description: llm.scenarios.bull.description || rule.scenarios.bull.description },
      base: { probability: (llm.scenarios.base.probability + rule.scenarios.base.probability) / 2, targetPct: (llm.scenarios.base.targetPct + rule.scenarios.base.targetPct) / 2, description: llm.scenarios.base.description || rule.scenarios.base.description },
      bear: { probability: (llm.scenarios.bear.probability + rule.scenarios.bear.probability) / 2, targetPct: (llm.scenarios.bear.targetPct + rule.scenarios.bear.targetPct) / 2, description: llm.scenarios.bear.description || rule.scenarios.bear.description },
    },
  };
}

// ============================================================
// ENGINE CLASS
// ============================================================

class DeepAnalysisEngine {
  /**
   * Run deep analysis on a token.
   * Tries LLM first, falls back to rule-based, or merges both.
   */
  async analyze(input: DeepAnalysisInput | AnalysisInput, thinkingDepth?: ThinkingDepth): Promise<DeepAnalysisResult> {
    // Convert AnalysisInput to DeepAnalysisInput if needed
    let analysisInput: DeepAnalysisInput;
    if ('currentPrice' in input) {
      // It's an AnalysisInput - convert to DeepAnalysisInput
      const ai = input as AnalysisInput;
      analysisInput = {
        tokenAddress: ai.tokenAddress,
        symbol: ai.symbol,
        chain: ai.chain,
        brainAnalysis: {
          tokenAddress: ai.tokenAddress,
          chain: ai.chain,
          lifecyclePhase: ai.lifecyclePhase,
          lifecycleConfidence: ai.lifecycleConfidence,
          regime: ai.regime as 'BULL' | 'BEAR' | 'SIDEWAYS' | 'TRANSITION',
          regimeConfidence: ai.regimeConfidence,
          volatilityRegime: 'NORMAL',
          operabilityLevel: ai.operabilityScore >= 60 ? 'PREMIUM' : ai.operabilityScore >= 40 ? 'GOOD' : ai.operabilityScore >= 20 ? 'RISKY' : 'UNOPERABLE',
          operabilityScore: ai.operabilityScore,
          isOperable: ai.operabilityScore >= 20,
          botSwarmLevel: ai.botSwarmLevel as 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
          whaleDirection: ai.whaleDirection as 'ACCUMULATING' | 'DISTRIBUTING' | 'NEUTRAL' | 'ROTATING',
          whaleConfidence: 0.5,
          smartMoneyFlow: ai.netBehaviorFlow as 'INFLOW' | 'OUTFLOW' | 'NEUTRAL',
          meanReversionZone: null,
          anomalyDetected: false,
          anomalyScore: 0,
          isTransitioning: false,
          warnings: [],
          evidence: [],
        } as any,
        patternScan: ai.patternScan,
        depth: thinkingDepth ?? ai.dataReliability?.sampleSufficiency === 'OPTIMAL' ? 'DEEP' : 'STANDARD',
      };
    } else {
      analysisInput = input as DeepAnalysisInput;
      if (thinkingDepth) analysisInput.depth = thinkingDepth;
    }

    // Always compute rule-based as baseline
    const ruleResult = ruleBasedAnalysis(analysisInput);

    // Try LLM for depth >= STANDARD
    if ((analysisInput.depth ?? 'STANDARD') !== 'QUICK') {
      const llmResult = await llmAnalysis(analysisInput);
      if (llmResult) {
        // Hybrid: merge both
        return mergeAnalyses(llmResult, ruleResult);
      }
    }

    return ruleResult;
  }

  /**
   * Run deep analysis in batch.
   */
  async analyzeBatch(inputs: DeepAnalysisInput[]): Promise<DeepAnalysisResult[]> {
    const results: DeepAnalysisResult[] = [];
    for (const input of inputs) {
      try {
        const result = await this.analyze(input);
        results.push(result);
      } catch {
        // Fallback to rule-based
        results.push(ruleBasedAnalysis(input));
      }
      await new Promise(r => setTimeout(r, 200)); // Rate limit for LLM
    }
    return results;
  }

  /**
   * Store deep analysis result in DB.
   */
  async storeResult(result: DeepAnalysisResult): Promise<void> {
    try {
      const token = await db.token.findFirst({
        where: { address: result.tokenAddress },
      });
      if (!token) return;

      await db.signal.create({
        data: {
          type: `DEEP_ANALYSIS_${result.source}`,
          direction: result.recommendation,
          confidence: Math.round(result.recommendationConfidence * 100),
          description: result.summary,
          tokenId: token.id,
          metadata: JSON.stringify({
            tokenAddress: result.tokenAddress,
            symbol: result.symbol,
            riskLevel: result.riskLevel,
            riskScore: result.riskScore,
            recommendation: result.recommendation,
            maxPositionPct: result.maxRecommendedPositionPct,
            scenarios: result.scenarios,
            bullishFactors: result.bullishFactors,
            bearishFactors: result.bearishFactors,
            keyMonitorPoints: result.keyMonitorPoints,
            urgencyLevel: result.urgencyLevel,
            source: result.source,
          }),
        },
      });
    } catch {
      // Storage is best-effort
    }
  }
}

export const deepAnalysisEngine = new DeepAnalysisEngine();
