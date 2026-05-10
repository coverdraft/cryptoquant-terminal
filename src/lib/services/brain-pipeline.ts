/**
 * Brain Pipeline - The 6-Step Operational Engine
 * 
 * SCAN → FILTER → MATCH → STORE → FEEDBACK → GROWTH TRACK
 * 
 * This is the core "brain" that runs continuously, analyzing tokens,
 * filtering for operability, matching trading systems, storing results,
 * validating signals, and tracking compound growth with fees deducted.
 */

import { db } from '@/lib/db';
import { calculateOperability, batchCalculateOperability, persistOperabilityScores, type OperabilityInput, type OperabilityResult } from './operability-filter';
import { matchSystem, batchMatchSystems, type TokenProfile, type SystemMatch } from './project-system-matcher';

export interface PipelineConfig {
  capitalUsd: number;
  chain: string;
  scanLimit: number;
  minOperabilityScore: number;
  cycleIntervalMs: number;
  maxAllocationPctPerToken: number;
}

export interface PipelineResult {
  cycleId: string;
  status: 'COMPLETED' | 'FAILED';
  tokensScanned: number;
  tokensOperable: number;
  tokensMatched: number;
  signalsGenerated: number;
  capitalBeforeUsd: number;
  capitalAfterUsd: number;
  feesPaidUsd: number;
  netGainUsd: number;
  netGainPct: number;
  durationMs: number;
  matches: SystemMatch[];
  operabilityResults: OperabilityResult[];
  error?: string;
}

const DEFAULT_CONFIG: PipelineConfig = {
  capitalUsd: 100,
  chain: 'solana',
  scanLimit: 50,
  minOperabilityScore: 40,
  cycleIntervalMs: 60000, // 1 minute
  maxAllocationPctPerToken: 10,
};

/**
 * STEP 1: SCAN - Load tokens from the database.
 * Fetches tokens ordered by volume, limited by config.
 */
async function scanTokens(config: PipelineConfig): Promise<TokenProfile[]> {
  // Handle case-insensitive chain matching (DB stores SOL, ETH, SOLANA etc.)
  const chainVariants = [config.chain, config.chain.toUpperCase(), config.chain.toLowerCase()];
  const chainUpper = config.chain.toUpperCase(); const normalizedChain = (chainUpper === 'SOL' || chainUpper === 'SOLANA') ? ['SOL', 'SOLANA', 'sol', 'solana'] : [config.chain, chainUpper, config.chain.toLowerCase()];

  const tokens = await db.token.findMany({
    where: {
      chain: { in: normalizedChain },
      volume24h: { gt: 0 },
    },
    orderBy: { volume24h: 'desc' },
    take: config.scanLimit,
  });

  return tokens.map(t => ({
    tokenAddress: t.address,
    chain: t.chain,
    symbol: t.symbol,
    priceUsd: t.priceUsd,
    volume24h: t.volume24h,
    liquidityUsd: t.liquidity,
    marketCap: t.marketCap,
    priceChange1h: t.priceChange1h,
    priceChange24h: t.priceChange24h,
    botActivityPct: t.botActivityPct,
    smartMoneyPct: t.smartMoneyPct,
    operabilityScore: 0, // will be computed in FILTER
  }));
}

/**
 * STEP 2: FILTER - Calculate operability for each token.
 * Only tokens that survive fees + slippage + liquidity checks pass.
 */
function filterOperable(
  tokens: TokenProfile[],
  capitalUsd: number,
  config: PipelineConfig,
): OperabilityResult[] {
  const inputs: OperabilityInput[] = tokens.map(t => {
    // Calculate position size based on token's characteristics
    // More liquid tokens get larger positions
    const basePosition = capitalUsd * (config.maxAllocationPctPerToken / 100);
    
    return {
      tokenAddress: t.tokenAddress,
      chain: t.chain,
      liquidityUsd: t.liquidityUsd,
      volume24h: t.volume24h,
      priceUsd: t.priceUsd,
      marketCap: t.marketCap,
      positionSizeUsd: Math.min(basePosition, t.liquidityUsd * 0.05), // max 5% of pool
    };
  });

  return batchCalculateOperability(inputs);
}

/**
 * STEP 3: MATCH - Assign the best trading system to each operable token.
 */
function matchSystems(
  tokens: TokenProfile[],
  operabilityResults: OperabilityResult[],
  capitalUsd: number,
): SystemMatch[] {
  // Enrich tokens with operability scores
  const enrichedTokens: TokenProfile[] = tokens
    .filter(t => operabilityResults.some(o => o.tokenAddress === t.tokenAddress))
    .map(t => {
      const opResult = operabilityResults.find(o => o.tokenAddress === t.tokenAddress)!;
      return { ...t, operabilityScore: opResult.score };
    });

  return batchMatchSystems(enrichedTokens, capitalUsd);
}

/**
 * STEP 4: STORE - Persist cycle data, operability scores, and matches.
 */
async function storeCycleData(
  cycleId: string,
  config: PipelineConfig,
  tokensScanned: number,
  operabilityResults: OperabilityResult[],
  matches: SystemMatch[],
  signalsGenerated: number,
): Promise<void> {
  // Store operability scores
  await persistOperabilityScores(operabilityResults, cycleId);

  // Store matches as signals for the frontend
  for (const match of matches) {
    try {
      // Find the token to get its ID for the foreign key
      const token = await db.token.findFirst({
        where: { address: match.tokenAddress },
      });

      if (token) {
        await db.signal.create({
          data: {
            type: `SYSTEM_MATCH_${match.primarySystem}`,
            tokenId: token.id,
            confidence: Math.round(match.confidence * 100),
            direction: match.multiStrategy ? 'HOLD_MULTI' : 'HOLD',
            description: `${match.primarySystem} → ${match.tokenAddress.slice(0, 8)}... (alloc: ${match.allocationPct}%) ${match.reasoning.join('; ')}`,
            metadata: JSON.stringify({
              cycleId,
              primarySystem: match.primarySystem,
              secondarySystem: match.secondarySystem,
              multiStrategy: match.multiStrategy,
              allocationPct: match.allocationPct,
              reasoning: match.reasoning,
            }),
          },
        });
      }
    } catch {
      // Skip if fails
    }
  }
}

/**
 * STEP 5: FEEDBACK - Validate signals and learn from results.
 * Compares previous cycle predictions with actual outcomes.
 */
async function runFeedbackLoop(cycleId: string): Promise<{
  validated: number;
  correct: number;
  accuracy: number;
}> {
  // Get signals from previous cycles that should have resolved by now
  const recentSignals = await db.signal.findMany({
    where: {
      createdAt: { lt: new Date(Date.now() - 3600000) }, // older than 1h
      type: { startsWith: 'SYSTEM_MATCH_' },
    },
    take: 50,
    orderBy: { createdAt: 'desc' },
  });

  let validated = 0;
  let correct = 0;

  for (const signal of recentSignals) {
    try {
      const meta = JSON.parse(signal.metadata || '{}');
      const tokenAddr = signal.description?.match(/→ ([a-zA-Z0-9]+)/)?.[1];
      
      if (!tokenAddr) continue;

      // Check if the token actually moved in the predicted direction
      const currentToken = await db.token.findFirst({
        where: { address: { startsWith: tokenAddr } },
      });

      if (currentToken) {
        validated++;
        // Simple validation: if direction was HOLD and price didn't crash, it's correct
        if (signal.direction === 'HOLD' || signal.direction === 'HOLD_MULTI') {
          if (currentToken.priceChange24h >= -5) correct++;
        }
      }
    } catch {
      // Skip malformed signals
    }
  }

  const accuracy = validated > 0 ? correct / validated : 0;
  return { validated, correct, accuracy };
}

/**
 * STEP 6: GROWTH TRACK - Update compound growth with fees deducted.
 */
async function updateGrowthTracking(
  cycleId: string,
  capitalBeforeUsd: number,
  config: PipelineConfig,
  feedbackAccuracy: number,
): Promise<{
  capitalAfterUsd: number;
  feesPaidUsd: number;
  netGainUsd: number;
  netGainPct: number;
}> {
  // Estimate fees from operability scores (average fee impact * allocated capital)
  const opScores = await db.operabilityScore.findMany({
    where: { cycleId },
    orderBy: { computedAt: 'desc' },
  });

  const avgFeePct = opScores.length > 0
    ? opScores.reduce((sum, o) => sum + o.feeImpactPct, 0) / opScores.length
    : 0.3;

  // Estimate allocated capital (sum of all allocation percentages)
  const totalAllocatedPct = opScores.length * 5; // rough estimate: 5% per position
  const allocatedCapital = capitalBeforeUsd * (totalAllocatedPct / 100);

  // Fees = allocated * (avg fee / 100) * 2 (round trip)
  const feesPaidUsd = allocatedCapital * (avgFeePct / 100) * 2;

  // Estimated gain based on feedback accuracy
  // If accuracy > 50%, we're profitable; otherwise losing
  const gainMultiplier = feedbackAccuracy > 0.5
    ? 1 + (feedbackAccuracy - 0.5) * 0.02 // modest gains
    : 1 - (0.5 - feedbackAccuracy) * 0.01; // modest losses
  
  const grossGain = allocatedCapital * (gainMultiplier - 1);
  const netGainUsd = grossGain - feesPaidUsd;
  const netGainPct = capitalBeforeUsd > 0 ? (netGainUsd / capitalBeforeUsd) * 100 : 0;
  const capitalAfterUsd = capitalBeforeUsd + netGainUsd;

  // Persist capital state
  await db.capitalState.create({
    data: {
      totalCapitalUsd: capitalAfterUsd,
      allocatedUsd: allocatedCapital,
      availableUsd: capitalAfterUsd - allocatedCapital,
      feesPaidTotalUsd: feesPaidUsd,
      realizedPnlUsd: netGainUsd,
      compoundGrowthPct: capitalBeforeUsd > 0 ? ((capitalAfterUsd - capitalBeforeUsd) / capitalBeforeUsd) * 100 : 0,
    },
  });

  return {
    capitalAfterUsd: Math.round(capitalAfterUsd * 100) / 100,
    feesPaidUsd: Math.round(feesPaidUsd * 100) / 100,
    netGainUsd: Math.round(netGainUsd * 100) / 100,
    netGainPct: Math.round(netGainPct * 100) / 100,
  };
}

/**
 * Run a complete brain pipeline cycle.
 * This is the main entry point.
 */
export async function runBrainCycle(
  config: Partial<PipelineConfig> = {},
): Promise<PipelineResult> {
  const startTime = Date.now();
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  let cycleId = '';
  
  try {
    // Create cycle record
    const lastCycle = await db.tradingCycle.findFirst({
      orderBy: { cycleNumber: 'desc' },
    });
    const cycleNumber = (lastCycle?.cycleNumber || 0) + 1;

    const cycle = await db.tradingCycle.create({
      data: {
        cycleNumber,
        status: 'RUNNING',
        capitalBeforeUsd: fullConfig.capitalUsd,
      },
    });
    cycleId = cycle.id;

    // STEP 1: SCAN
    const tokens = await scanTokens(fullConfig);

    // STEP 2: FILTER
    const operabilityResults = filterOperable(tokens, fullConfig.capitalUsd, fullConfig);

    // STEP 3: MATCH
    const matches = matchSystems(tokens, operabilityResults, fullConfig.capitalUsd);

    // STEP 4: STORE
    await storeCycleData(
      cycleId,
      fullConfig,
      tokens.length,
      operabilityResults,
      matches,
      matches.length, // signals generated = number of matches
    );

    // STEP 5: FEEDBACK
    const feedback = await runFeedbackLoop(cycleId);

    // STEP 6: GROWTH TRACK
    const growth = await updateGrowthTracking(cycleId, fullConfig.capitalUsd, fullConfig, feedback.accuracy);

    // Update cycle record
    await db.tradingCycle.update({
      where: { id: cycleId },
      data: {
        status: 'COMPLETED',
        tokensScanned: tokens.length,
        tokensOperable: operabilityResults.length,
        tokensMatched: matches.length,
        signalsGenerated: matches.length,
        capitalAfterUsd: growth.capitalAfterUsd,
        feesPaidUsd: growth.feesPaidUsd,
        netGainUsd: growth.netGainUsd,
        netGainPct: growth.netGainPct,
        completedAt: new Date(),
      },
    });

    return {
      cycleId,
      status: 'COMPLETED',
      tokensScanned: tokens.length,
      tokensOperable: operabilityResults.length,
      tokensMatched: matches.length,
      signalsGenerated: matches.length,
      capitalBeforeUsd: fullConfig.capitalUsd,
      capitalAfterUsd: growth.capitalAfterUsd,
      feesPaidUsd: growth.feesPaidUsd,
      netGainUsd: growth.netGainUsd,
      netGainPct: growth.netGainPct,
      durationMs: Date.now() - startTime,
      matches,
      operabilityResults,
    };
  } catch (error) {
    // Update cycle record as failed
    if (cycleId) {
      try {
        await db.tradingCycle.update({
          where: { id: cycleId },
          data: {
            status: 'FAILED',
            error: String(error),
            completedAt: new Date(),
          },
        });
      } catch {
        // Ignore update errors
      }
    }

    return {
      cycleId,
      status: 'FAILED',
      tokensScanned: 0,
      tokensOperable: 0,
      tokensMatched: 0,
      signalsGenerated: 0,
      capitalBeforeUsd: fullConfig.capitalUsd,
      capitalAfterUsd: fullConfig.capitalUsd,
      feesPaidUsd: 0,
      netGainUsd: 0,
      netGainPct: 0,
      durationMs: Date.now() - startTime,
      matches: [],
      operabilityResults: [],
      error: String(error),
    };
  }
}

/**
 * Get the current capital state.
 */
export async function getCapitalState(): Promise<{
  totalCapitalUsd: number;
  allocatedUsd: number;
  availableUsd: number;
  feesPaidTotalUsd: number;
  realizedPnlUsd: number;
  compoundGrowthPct: number;
  cycleCount: number;
} | null> {
  const state = await db.capitalState.findFirst({
    orderBy: { updatedAt: 'desc' },
  });

  if (!state) return null;

  return {
    totalCapitalUsd: state.totalCapitalUsd,
    allocatedUsd: state.allocatedUsd,
    availableUsd: state.availableUsd,
    feesPaidTotalUsd: state.feesPaidTotalUsd,
    realizedPnlUsd: state.realizedPnlUsd,
    compoundGrowthPct: state.compoundGrowthPct,
    cycleCount: state.cycleCount,
  };
}

/**
 * Get recent trading cycles.
 */
export async function getRecentCycles(limit = 10) {
  return db.tradingCycle.findMany({
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
}
