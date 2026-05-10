/**
 * Operability Filter - Determines if a token is tradeable after fees & slippage
 * 
 * Core concept: Not every token is operable. A $10 position on a token with 
 * $500 liquidity and 3% fees will lose significant capital to costs alone.
 * The filter calculates: Can we enter AND exit profitably after ALL costs?
 */

import { db } from '@/lib/db';

export interface OperabilityInput {
  tokenAddress: string;
  chain: string;
  liquidityUsd: number;
  volume24h: number;
  priceUsd: number;
  marketCap?: number;
  positionSizeUsd: number; // how much capital we want to allocate
}

export interface OperabilityResult {
  tokenAddress: string;
  chain: string;
  score: number; // 0-100
  feeImpactPct: number;
  slippageImpactPct: number;
  liquidityUsd: number;
  maxPositionUsd: number;
  volume24h: number;
  spreadPct: number;
  isOperable: boolean;
  reason?: string;
}

// Default fee rates by chain (estimate for DEX swap)
const CHAIN_FEES: Record<string, number> = {
  solana: 0.00025, // ~0.025% per swap (2 swaps = round trip)
  ethereum: 0.003, // ~0.3% Uniswap
  base: 0.003,
  arbitrum: 0.001,
  bsc: 0.002,
  polygon: 0.001,
};

const MIN_OPERABILITY_SCORE = 40; // out of 100
const MIN_LIQUIDITY_USD = 1000; // minimum liquidity to consider
const MAX_POSITION_PCT_OF_LIQUIDITY = 0.05; // max 5% of pool liquidity per position

/**
 * Calculate operability score for a token given a position size.
 * The score represents how much of the position survives after all costs.
 */
export function calculateOperability(input: OperabilityInput): OperabilityResult {
  const { tokenAddress, chain, liquidityUsd, volume24h, priceUsd, marketCap, positionSizeUsd } = input;

  // 1. Fee impact calculation
  const feeRate = CHAIN_FEES[chain.toLowerCase()] || 0.003;
  const roundTripFees = feeRate * 2; // entry + exit
  const feeImpactPct = roundTripFees * 100;

  // 2. Slippage estimation based on position size relative to liquidity
  // Using constant product AMM formula: slippage ≈ (positionSize / liquidity) * 100
  let slippageImpactPct = 0;
  let maxPositionUsd = 0;

  if (liquidityUsd > 0) {
    const positionPctOfLiq = positionSizeUsd / liquidityUsd;
    // AMM slippage formula (simplified): slippage = 2 * (x / (1 - x)) where x = positionPctOfLiq
    slippageImpactPct = (2 * positionPctOfLiq / (1 - positionPctOfLiq)) * 100;
    
    // Max position before slippage becomes unacceptable (5% slippage threshold)
    maxPositionUsd = liquidityUsd * MAX_POSITION_PCT_OF_LIQUIDITY;
  } else {
    slippageImpactPct = 100; // 100% slippage = impossible to trade
    maxPositionUsd = 0;
  }

  // 3. Spread estimation (higher for low-liquidity tokens)
  const spreadPct = liquidityUsd > 100000 ? 0.1 
    : liquidityUsd > 10000 ? 0.5 
    : liquidityUsd > 1000 ? 2.0 
    : 10.0;

  // 4. Volume health (tokens with zero volume are suspicious)
  const volumeHealth = volume24h > 0 ? Math.min(1, volume24h / 10000) : 0;

  // 5. Calculate composite operability score
  // Score = 100 - (fee impact + slippage impact + spread) * volume health modifier
  const totalCostPct = feeImpactPct + slippageImpactPct + spreadPct;
  
  // If volume is healthy, costs are more reliable (less manipulation risk)
  const costReliability = 0.5 + (volumeHealth * 0.5);
  const adjustedCostPct = totalCostPct * costReliability;
  
  const score = Math.max(0, Math.min(100, 100 - adjustedCostPct));

  // 6. Determine operability
  let isOperable = score >= MIN_OPERABILITY_SCORE;
  let reason: string | undefined;

  if (liquidityUsd < MIN_LIQUIDITY_USD) {
    isOperable = false;
    reason = `Insufficient liquidity: $${liquidityUsd.toFixed(0)} < $${MIN_LIQUIDITY_USD}`;
  } else if (positionSizeUsd > maxPositionUsd) {
    isOperable = false;
    reason = `Position too large: $${positionSizeUsd.toFixed(0)} > max $${maxPositionUsd.toFixed(0)}`;
  } else if (totalCostPct > 50) {
    isOperable = false;
    reason = `Total costs too high: ${totalCostPct.toFixed(1)}% (fees+slippage+spread)`;
  }

  return {
    tokenAddress,
    chain,
    score: Math.round(score * 100) / 100,
    feeImpactPct: Math.round(feeImpactPct * 100) / 100,
    slippageImpactPct: Math.round(slippageImpactPct * 100) / 100,
    liquidityUsd,
    maxPositionUsd: Math.round(maxPositionUsd * 100) / 100,
    volume24h,
    spreadPct,
    isOperable,
    reason,
  };
}

/**
 * Batch calculate operability for multiple tokens.
 * Returns only the operable tokens, sorted by score descending.
 */
export function batchCalculateOperability(
  tokens: OperabilityInput[],
): OperabilityResult[] {
  return tokens
    .map(t => calculateOperability(t))
    .filter(r => r.isOperable)
    .sort((a, b) => b.score - a.score);
}

/**
 * Persist operability scores to database.
 */
export async function persistOperabilityScores(
  results: OperabilityResult[],
  cycleId?: string,
): Promise<number> {
  let persisted = 0;
  for (const result of results) {
    try {
      await db.operabilityScore.create({
        data: {
          tokenAddress: result.tokenAddress,
          chain: result.chain,
          score: result.score,
          feeImpactPct: result.feeImpactPct,
          slippageImpactPct: result.slippageImpactPct,
          liquidityUsd: result.liquidityUsd,
          maxPositionUsd: result.maxPositionUsd,
          volume24h: result.volume24h,
          spreadPct: result.spreadPct,
          isOperable: result.isOperable,
          reason: result.reason,
          cycleId,
        },
      });
      persisted++;
    } catch {
      // Skip duplicates/errors
    }
  }
  return persisted;
}
