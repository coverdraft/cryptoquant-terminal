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
export type RiskLevel = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type ActionRecommendation = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'REDUCE' | 'SELL' | 'AVOID';

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

  // === FACTOR COLLECTION ===
  const bullishFactors: string[] = [];
  const bearishFactors: string[] = [];
  const neutralFactors: string[] = [];
  const justification: string[] = [];
  const keyMonitorPoints: string[] = [];

  // Phase factors
  const phaseRisk = PHASE_RISK[brain.lifecyclePhase] ?? 50;
  if (['GROWTH', 'LEGACY'].includes(brain.lifecyclePhase)) {
    bullishFactors.push(`${brain.lifecyclePhase} lifecycle phase (favorable for upside)`);
  } else if (['GENESIS', 'DECLINE'].includes(brain.lifecyclePhase)) {
    bearishFactors.push(`${brain.lifecyclePhase} lifecycle phase (higher risk/uncertainty)`);
  } else {
    neutralFactors.push(`${brain.lifecyclePhase} phase - neutral positioning`);
  }

  // Regime factors
  const regimeRisk = REGIME_RISK[brain.regime] ?? 50;
  if (brain.regime === 'BULL') {
    bullishFactors.push(`Bull market regime with ${(brain.regimeConfidence * 100).toFixed(0)}% confidence`);
  } else if (brain.regime === 'BEAR') {
    bearishFactors.push(`Bear market regime with ${(brain.regimeConfidence * 100).toFixed(0)}% confidence`);
  }

  // Pattern factors
  if (patternScan) {
    if (patternScan.overallSignal === 'BULLISH') {
      bullishFactors.push(`Candlestick patterns: ${patternScan.bullishPatterns.length} bullish signals (score: ${patternScan.overallScore.toFixed(2)})`);
      if (patternScan.confluences.length > 0) {
        bullishFactors.push(`Pattern confluences: ${patternScan.confluences.map(c => c.pattern).join(', ')}`);
      }
    } else if (patternScan.overallSignal === 'BEARISH') {
      bearishFactors.push(`Candlestick patterns: ${patternScan.bearishPatterns.length} bearish signals (score: ${patternScan.overallScore.toFixed(2)})`);
    } else {
      neutralFactors.push(`Candlestick patterns: mixed/neutral (${patternScan.patterns.length} total)`);
    }
    if (patternScan.dominantPattern) {
      keyMonitorPoints.push(`Watch for ${patternScan.dominantPattern} pattern continuation or invalidation on ${patternScan.dominantTimeframe}`);
    }
  }

  // Behavioral factors
  if (behavior) {
    if (behavior.netFlowDirection === 'BULLISH') {
      bullishFactors.push(`Trader behavior: net bullish flow (score: ${behavior.netFlowScore.toFixed(2)})`);
    } else if (behavior.netFlowDirection === 'BEARISH') {
      bearishFactors.push(`Trader behavior: net bearish flow (score: ${behavior.netFlowScore.toFixed(2)})`);
    }
    if (behavior.archetypeBreakdown.length > 0) {
      const topArch = behavior.archetypeBreakdown[0];
      keyMonitorPoints.push(`Top trader archetype: ${topArch.archetype} (${topArch.dominantAction}, ${topArch.volumeShare.toFixed(0)}% volume)`);
    }
    if (behavior.confidence > 0.7) {
      justification.push(`High behavioral prediction confidence (${(behavior.confidence * 100).toFixed(0)}%)`);
    }
  }

  // Whale & smart money
  if (brain.whaleDirection === 'ACCUMULATING') {
    bullishFactors.push(`Whales accumulating (${(brain.whaleConfidence * 100).toFixed(0)}% confidence)`);
  } else if (brain.whaleDirection === 'DISTRIBUTING') {
    bearishFactors.push(`Whales distributing (${(brain.whaleConfidence * 100).toFixed(0)}% confidence)`);
  }
  if (brain.smartMoneyFlow === 'INFLOW') {
    bullishFactors.push('Smart money inflow detected');
  } else if (brain.smartMoneyFlow === 'OUTFLOW') {
    bearishFactors.push('Smart money outflow detected');
  }

  // Bot swarm
  const botRisk = BOT_SWARM_RISK[brain.botSwarmLevel] ?? 0;
  if (brain.botSwarmLevel === 'CRITICAL' || brain.botSwarmLevel === 'HIGH') {
    bearishFactors.push(`${brain.botSwarmLevel} bot swarm activity - retail front-running risk`);
    keyMonitorPoints.push('Monitor bot activity for changes - high bot presence increases slippage risk');
  }

  // Operability
  if (brain.operabilityLevel === 'PREMIUM' || brain.operabilityLevel === 'GOOD') {
    bullishFactors.push(`Operability: ${brain.operabilityLevel} (score: ${brain.operabilityScore}/100)`);
  } else if (brain.operabilityLevel === 'RISKY' || brain.operabilityLevel === 'UNOPERABLE') {
    bearishFactors.push(`Low operability: ${brain.operabilityLevel} (fees/slippage erode gains)`);
  }

  // Anomaly
  if (brain.anomalyDetected) {
    neutralFactors.push(`Volume anomaly detected (score: ${brain.anomalyScore.toFixed(2)})`);
    keyMonitorPoints.push('Volume anomaly - could indicate catalyst event or manipulation');
  }

  // Transition
  if (brain.isTransitioning) {
    neutralFactors.push('Token is transitioning between lifecycle phases');
    keyMonitorPoints.push('Phase transition in progress - direction uncertainty elevated');
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
  const summary = `${symbol || tokenAddress.slice(0,8)} is in ${brain.lifecyclePhase} phase within a ${brain.regime} regime. `
    + `${bullCount} bullish factors vs ${bearCount} bearish factors. `
    + `Overall risk: ${riskLevel}. Recommendation: ${recommendation}.`
    + (patternScan ? ` Candlestick patterns suggest ${patternScan.overallSignal} bias.` : '')
    + (behavior ? ` Trader behavior: ${behavior.netFlowDirection}.` : '');

  const riskAssessment = `Risk level: ${riskLevel} (${riskScore.toFixed(0)}/100). `
    + `Phase risk: ${phaseRisk.toFixed(0)}/100, Regime risk: ${regimeRisk.toFixed(0)}/100, Bot risk: ${botRisk.toFixed(0)}/100. `
    + `Operability: ${brain.operabilityLevel} (${brain.operabilityScore}/100). `
    + `Maximum recommended position: ${maxPosition}% of capital.`;

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
    justification,
    bullishFactors,
    bearishFactors,
    neutralFactors,
    keyMonitorPoints,
    scenarios: {
      bull: { probability: bullProb, targetPct: bullTarget, description: `Strong momentum continues, ${bullTarget}%+ upside` },
      base: { probability: baseProb, targetPct: baseTarget, description: `Sideways consolidation, ${baseTarget > 0 ? '+' : ''}${baseTarget}% move` },
      bear: { probability: bearProb, targetPct: bearTarget, description: `Deterioration, ${bearTarget}% decline` },
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

    const prompt = `You are a professional crypto analyst. Analyze the following token data and provide a structured assessment.

${context}

Respond in this EXACT JSON format (no markdown, no code blocks):
{
  "summary": "2-3 sentence narrative summary",
  "riskAssessment": "1-2 sentence risk assessment",
  "recommendation": "STRONG_BUY|BUY|HOLD|REDUCE|SELL|AVOID",
  "confidence": 0.0-1.0,
  "bullishFactors": ["factor1", "factor2"],
  "bearishFactors": ["factor1", "factor2"],
  "keyMonitorPoints": ["point1", "point2"],
  "bullScenario": {"probability": 0.0-1.0, "targetPct": number, "description": "text"},
  "baseScenario": {"probability": 0.0-1.0, "targetPct": number, "description": "text"},
  "bearScenario": {"probability": 0.0-1.0, "targetPct": number, "description": "text"},
  "riskLevel": "VERY_LOW|LOW|MEDIUM|HIGH|VERY_HIGH",
  "riskScore": 0-100,
  "maxPositionPct": 1-10,
  "timeHorizon": "text",
  "urgency": "IMMEDIATE|HIGH|MEDIUM|LOW"
}`;

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
  async analyze(input: DeepAnalysisInput): Promise<DeepAnalysisResult> {
    // Always compute rule-based as baseline
    const ruleResult = ruleBasedAnalysis(input);

    // Try LLM for depth >= STANDARD
    if ((input.depth ?? 'STANDARD') !== 'QUICK') {
      const llmResult = await llmAnalysis(input);
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
