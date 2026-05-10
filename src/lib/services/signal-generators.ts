/**
 * Signal Generators - Smart Money, Rug Pull, V-Shape, Liquidity Trap
 * Generates real signals from actual market data (DexScreener + CoinGecko)
 */

import { db } from '@/lib/db';
import type { TokenLiquidityData } from './dexscreener-client';

// ============================================================
// TYPES
// ============================================================

interface TokenMarketData {
  symbol: string;
  name: string;
  chain: string;
  priceUsd: number;
  volume24h: number;
  liquidityUsd: number;
  marketCap: number;
  fdv: number;
  priceChange1h: number;
  priceChange6h: number;
  priceChange24h: number;
  txns24h: { buys: number; sells: number; };
  pairCreatedAt: number;
  dexId: string;
}

export interface GeneratedSignal {
  tokenId: string;
  type: string;
  subtype: string;
  strength: number;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  title: string;
  description: string;
  metadata: Record<string, any>;
}

// ============================================================
// SMART MONEY DETECTION
// ============================================================

export function detectSmartMoney(data: TokenMarketData): GeneratedSignal | null {
  let score = 0;
  const reasons: string[] = [];

  if (data.marketCap > 0) {
    const volMcapRatio = data.volume24h / data.marketCap;
    if (volMcapRatio > 0.5) { score += 30; reasons.push(`Extreme volume/MCap: ${(volMcapRatio * 100).toFixed(1)}%`); }
    else if (volMcapRatio > 0.2) { score += 20; reasons.push(`High volume/MCap: ${(volMcapRatio * 100).toFixed(1)}%`); }
    else if (volMcapRatio > 0.1) { score += 10; reasons.push(`Moderate volume/MCap: ${(volMcapRatio * 100).toFixed(1)}%`); }
  }

  const totalTxns = data.txns24h.buys + data.txns24h.sells;
  if (totalTxns > 10) {
    const buyRatio = data.txns24h.buys / totalTxns;
    if (buyRatio > 0.7) { score += 25; reasons.push(`Heavy buying: ${(buyRatio * 100).toFixed(1)}% buys`); }
    else if (buyRatio < 0.3) { score += 20; reasons.push(`Heavy selling: ${((1 - buyRatio) * 100).toFixed(1)}% sells`); }
  }

  if (data.liquidityUsd > 0 && data.volume24h > 0) {
    const volLiqRatio = data.volume24h / data.liquidityUsd;
    if (volLiqRatio > 2) { score += 25; reasons.push(`Volume >> Liquidity: ${volLiqRatio.toFixed(1)}x (whale activity)`); }
    else if (volLiqRatio > 1) { score += 15; reasons.push(`Volume > Liquidity: ${volLiqRatio.toFixed(1)}x`); }
  }

  if (Math.abs(data.priceChange24h) > 10 && data.volume24h > data.liquidityUsd * 0.3) {
    score += 20; reasons.push(`Significant move (${data.priceChange24h.toFixed(1)}%) with volume`);
  }

  if (score < 15) return null;

  const direction = data.txns24h.buys > data.txns24h.sells ? 'BULLISH' :
    data.txns24h.sells > data.txns24h.buys ? 'BEARISH' : 'NEUTRAL';

  return {
    tokenId: '',
    type: 'SMART_MONEY',
    subtype: direction === 'BULLISH' ? 'ACCUMULATION' : direction === 'BEARISH' ? 'DISTRIBUTION' : 'MIXED',
    strength: Math.min(score, 100),
    direction,
    title: `Smart Money ${direction === 'BULLISH' ? 'Accumulation' : direction === 'BEARISH' ? 'Distribution' : 'Activity'}`,
    description: reasons.join('. '),
    metadata: {
      volumeMcapRatio: data.marketCap > 0 ? data.volume24h / data.marketCap : 0,
      buySellRatio: totalTxns > 0 ? data.txns24h.buys / totalTxns : 0.5,
      volumeLiquidityRatio: data.liquidityUsd > 0 ? data.volume24h / data.liquidityUsd : 0,
      priceChange24h: data.priceChange24h,
    },
  };
}

// ============================================================
// RUG PULL DETECTION
// ============================================================

export function detectRugPull(data: TokenMarketData): GeneratedSignal | null {
  let score = 0;
  const reasons: string[] = [];

  const ageMs = Date.now() - data.pairCreatedAt;
  const ageDays = data.pairCreatedAt > 0 ? ageMs / 86400000 : 999;
  if (ageDays < 1) { score += 30; reasons.push(`Token < 24h old`); }
  else if (ageDays < 3) { score += 20; reasons.push(`Token only ${ageDays.toFixed(1)} days old`); }
  else if (ageDays < 7) { score += 10; reasons.push(`Token < 1 week old`); }

  if (data.priceChange24h < -50) { score += 35; reasons.push(`Extreme crash: ${data.priceChange24h.toFixed(1)}% in 24h`); }
  else if (data.priceChange24h < -30) { score += 25; reasons.push(`Severe drop: ${data.priceChange24h.toFixed(1)}% in 24h`); }
  else if (data.priceChange24h < -15) { score += 10; reasons.push(`Significant decline: ${data.priceChange24h.toFixed(1)}%`); }

  if (data.marketCap > 0 && data.liquidityUsd > 0) {
    const liqMcapRatio = data.liquidityUsd / data.marketCap;
    if (liqMcapRatio < 0.01) { score += 25; reasons.push(`Extremely low liq/MCap: ${(liqMcapRatio * 100).toFixed(2)}%`); }
    else if (liqMcapRatio < 0.05) { score += 15; reasons.push(`Low liq/MCap: ${(liqMcapRatio * 100).toFixed(2)}%`); }
  }

  if (data.fdv > 1000000 && data.liquidityUsd < 10000) {
    score += 20; reasons.push(`FDV $${(data.fdv / 1e6).toFixed(1)}M but only $${(data.liquidityUsd / 1e3).toFixed(0)}K liquidity`);
  }

  const totalTxns = data.txns24h.buys + data.txns24h.sells;
  if (totalTxns > 5 && data.txns24h.sells / totalTxns > 0.8) {
    score += 20; reasons.push(`Panic selling: ${(data.txns24h.sells / totalTxns * 100).toFixed(1)}% sells`);
  }

  if (data.priceChange6h < -20 && data.priceChange24h > 0) {
    score += 15; reasons.push(`Pump & dump: +${data.priceChange24h.toFixed(1)}% 24h but ${data.priceChange6h.toFixed(1)}% 6h`);
  }

  if (score < 20) return null;

  return {
    tokenId: '',
    type: 'RUG_PULL',
    subtype: score >= 60 ? 'HIGH_RISK' : score >= 40 ? 'MEDIUM_RISK' : 'LOW_RISK',
    strength: Math.min(score, 100),
    direction: 'BEARISH',
    title: `Rug Pull Risk (${score >= 60 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW'})`,
    description: reasons.join('. '),
    metadata: { ageDays, priceChange24h: data.priceChange24h, fdv: data.fdv, liquidityUsd: data.liquidityUsd },
  };
}

// ============================================================
// V-SHAPE RECOVERY DETECTION
// ============================================================

export function detectVShape(data: TokenMarketData): GeneratedSignal | null {
  let score = 0;
  const reasons: string[] = [];

  if (data.priceChange1h > 5 && data.priceChange6h < -5) {
    score += 30; reasons.push(`V-shape: ${data.priceChange6h.toFixed(1)}% 6h recovering ${data.priceChange1h.toFixed(1)}% 1h`);
  }
  if (data.priceChange24h < -5 && data.priceChange1h > 3) {
    score += 25; reasons.push(`Recovery from dip: ${data.priceChange24h.toFixed(1)}% 24h bouncing ${data.priceChange1h.toFixed(1)}% 1h`);
  }
  if (data.priceChange6h < -10 && data.priceChange1h > 10) {
    score += 35; reasons.push(`Strong V-reversal: crashed ${data.priceChange6h.toFixed(1)}% recovering ${data.priceChange1h.toFixed(1)}%`);
  }
  if (data.liquidityUsd > 0 && data.volume24h > data.liquidityUsd * 0.5) {
    score += 15; reasons.push(`High recovery volume confirms reversal`);
  }
  const totalTxns = data.txns24h.buys + data.txns24h.sells;
  if (totalTxns > 5 && data.txns24h.buys / totalTxns > 0.6 && data.priceChange1h > 0) {
    score += 15; reasons.push(`Strong buy pressure during recovery`);
  }
  if (data.priceChange6h < -3 && data.priceChange1h > 2) {
    score += 10; reasons.push(`Mild V-shape forming`);
  }

  if (score < 15) return null;

  return {
    tokenId: '',
    type: 'V_SHAPE',
    subtype: score >= 50 ? 'STRONG_RECOVERY' : 'RECOVERY',
    strength: Math.min(score, 100),
    direction: 'BULLISH',
    title: `V-Shape Recovery (${score >= 50 ? 'Strong' : 'Forming'})`,
    description: reasons.join('. '),
    metadata: { priceChange1h: data.priceChange1h, priceChange6h: data.priceChange6h, priceChange24h: data.priceChange24h },
  };
}

// ============================================================
// LIQUIDITY TRAP DETECTION
// ============================================================

export function detectLiquidityTrap(data: TokenMarketData): GeneratedSignal | null {
  let score = 0;
  const reasons: string[] = [];

  if (data.fdv > 0 && data.liquidityUsd > 0) {
    const fdvLiqRatio = data.fdv / data.liquidityUsd;
    if (fdvLiqRatio > 1000) { score += 35; reasons.push(`FDV/Liquidity ${fdvLiqRatio.toFixed(0)}x - massive illusion`); }
    else if (fdvLiqRatio > 100) { score += 25; reasons.push(`FDV/Liquidity ${fdvLiqRatio.toFixed(0)}x - illiquid`); }
    else if (fdvLiqRatio > 50) { score += 15; reasons.push(`FDV/Liquidity ${fdvLiqRatio.toFixed(0)}x - low real liquidity`); }
  }

  if (data.liquidityUsd === 0 && data.marketCap > 0) {
    score += 40; reasons.push(`ZERO liquidity with market cap - extreme trap risk`);
  } else if (data.liquidityUsd < 5000 && data.liquidityUsd > 0) {
    score += 30; reasons.push(`Dangerously low liquidity: $${data.liquidityUsd.toFixed(0)}`);
  } else if (data.liquidityUsd < 20000) {
    score += 20; reasons.push(`Low liquidity: $${(data.liquidityUsd / 1e3).toFixed(1)}K`);
  } else if (data.liquidityUsd < 50000) {
    score += 10; reasons.push(`Thin liquidity: $${(data.liquidityUsd / 1e3).toFixed(1)}K`);
  }

  if (data.liquidityUsd > 10000 && data.volume24h > 0 && data.volume24h / data.liquidityUsd < 0.01) {
    score += 20; reasons.push(`Volume dried up`);
  }

  if (data.marketCap > 1000000 && data.liquidityUsd < 10000) {
    score += 25; reasons.push(`$${(data.marketCap / 1e6).toFixed(1)}M cap but can't sell`);
  }

  if (score < 20) return null;

  return {
    tokenId: '',
    type: 'LIQUIDITY_TRAP',
    subtype: score >= 50 ? 'EXTREME' : score >= 35 ? 'HIGH' : 'MODERATE',
    strength: Math.min(score, 100),
    direction: 'BEARISH',
    title: `Liquidity Trap (${score >= 50 ? 'Extreme' : score >= 35 ? 'High' : 'Moderate'})`,
    description: reasons.join('. '),
    metadata: {
      fdvLiquidityRatio: data.fdv > 0 && data.liquidityUsd > 0 ? data.fdv / data.liquidityUsd : null,
      liquidityUsd: data.liquidityUsd,
      marketCap: data.marketCap,
    },
  };
}

// ============================================================
// BATCH SIGNAL GENERATION
// ============================================================

export async function generateAllSignals(
  tokensWithMarketData: { tokenId: string; marketData: TokenMarketData; }[]
): Promise<GeneratedSignal[]> {
  const allSignals: GeneratedSignal[] = [];

  for (const { tokenId, marketData } of tokensWithMarketData) {
    const smSignal = detectSmartMoney(marketData);
    if (smSignal) { smSignal.tokenId = tokenId; allSignals.push(smSignal); }

    const rpSignal = detectRugPull(marketData);
    if (rpSignal) { rpSignal.tokenId = tokenId; allSignals.push(rpSignal); }

    const vsSignal = detectVShape(marketData);
    if (vsSignal) { vsSignal.tokenId = tokenId; allSignals.push(vsSignal); }

    const ltSignal = detectLiquidityTrap(marketData);
    if (ltSignal) { ltSignal.tokenId = tokenId; allSignals.push(ltSignal); }
  }

  const sm = allSignals.filter(s => s.type === 'SMART_MONEY').length;
  const rp = allSignals.filter(s => s.type === 'RUG_PULL').length;
  const vs = allSignals.filter(s => s.type === 'V_SHAPE').length;
  const lt = allSignals.filter(s => s.type === 'LIQUIDITY_TRAP').length;
  console.log(`[Signals] Generated ${allSignals.length} signals: SmartMoney=${sm}, RugPull=${rp}, VShape=${vs}, LiquidityTrap=${lt}`);

  return allSignals;
}

export async function saveSignalsToDb(signals: GeneratedSignal[]): Promise<number> {
  let saved = 0;
  for (const signal of signals) {
    try {
      await db.signal.create({
        data: {
          tokenId: signal.tokenId,
          type: signal.type,
          direction: signal.direction,
          description: signal.title + ': ' + signal.description,
          metadata: JSON.stringify({
            subtype: signal.subtype,
            strength: signal.strength,
            ...signal.metadata,
          }),
          confidence: signal.strength,
        },
      });
      saved++;
    } catch {
      // Skip duplicates
    }
  }
  console.log(`[Signals] Saved ${saved}/${signals.length} signals to DB`);
  return saved;
}

export type { TokenMarketData };

// ============================================================
// PATTERN SIGNAL GENERATOR
// ============================================================

export async function generatePatternSignals(
  tokens: Array<{
    id: string;
    symbol: string;
    chain: string;
    address: string;
    priceChange24h?: number;
    priceChange1h?: number;
    volume24h?: number;
    liquidity?: number;
    marketCap?: number;
  }>,
): Promise<{ signals: Array<any>; count: number }> {
  const { db } = await import('@/lib/db');
  
  // Get active pattern rules
  const patternRules = await db.patternRule.findMany({
    where: { isActive: true },
  });
  
  console.log(`[PatternSignals] Evaluating ${patternRules.length} rules against ${tokens.length} tokens`);
  
  const signals: Array<any> = [];
  
  for (const rule of patternRules) {
    try {
      const conditions = typeof rule.conditions === 'string' 
        ? JSON.parse(rule.conditions) 
        : rule.conditions;
      
      if (!conditions) continue;
      
      for (const token of tokens) {
        try {
          let matched = false;
          let confidence = 0.5;
          let description = rule.description || rule.name;
          
          // Evaluate conditions against token data
          const priceChange24h = token.priceChange24h ?? 0;
          const priceChange1h = token.priceChange1h ?? 0;
          const volume24h = token.volume24h ?? 0;
          const liquidity = token.liquidity ?? 0;
          const marketCap = token.marketCap ?? 0;
          
          // Check various condition types
          if (conditions.priceChange24hMin !== undefined && priceChange24h >= conditions.priceChange24hMin) {
            matched = true;
            confidence += 0.1;
          }
          if (conditions.priceChange24hMax !== undefined && priceChange24h <= conditions.priceChange24hMax) {
            matched = true;
            confidence += 0.1;
          }
          if (conditions.priceChange1hMin !== undefined && priceChange1h >= conditions.priceChange1hMin) {
            matched = true;
            confidence += 0.1;
          }
          if (conditions.volumeMin !== undefined && volume24h >= conditions.volumeMin) {
            matched = true;
            confidence += 0.05;
          }
          if (conditions.liquidityMin !== undefined && liquidity >= conditions.liquidityMin) {
            matched = true;
            confidence += 0.05;
          }
          if (conditions.marketCapMax !== undefined && marketCap > 0 && marketCap <= conditions.marketCapMax) {
            matched = true;
            confidence += 0.05;
          }
          
          // If conditions have a "type" field, use it for matching logic
          if (conditions.type === 'VOLATILITY_SPIKE' && Math.abs(priceChange24h) > 10) {
            matched = true;
            confidence += 0.15;
            description = `${rule.name}: Volatility spike detected (${priceChange24h.toFixed(1)}% 24h)`;
          }
          if (conditions.type === 'VOLUME_SURGE' && volume24h > 100000) {
            matched = true;
            confidence += 0.15;
            description = `${rule.name}: Volume surge detected ($${(volume24h/1000).toFixed(0)}K 24h)`;
          }
          if (conditions.type === 'MOMENTUM_UP' && priceChange24h > 5 && priceChange1h > 2) {
            matched = true;
            confidence += 0.15;
            description = `${rule.name}: Bullish momentum (${priceChange24h.toFixed(1)}% 24h, ${priceChange1h.toFixed(1)}% 1h)`;
          }
          if (conditions.type === 'MOMENTUM_DOWN' && priceChange24h < -5 && priceChange1h < -2) {
            matched = true;
            confidence += 0.15;
            description = `${rule.name}: Bearish momentum (${priceChange24h.toFixed(1)}% 24h, ${priceChange1h.toFixed(1)}% 1h)`;
          }
          if (conditions.type === 'LOW_LIQUIDITY_RISK' && liquidity > 0 && liquidity < 50000) {
            matched = true;
            confidence += 0.15;
            description = `${rule.name}: Low liquidity risk ($${liquidity.toFixed(0)})`;
          }
          
          // Generic match: if no specific conditions matched but rule has no conditions object
          if (!matched && Object.keys(conditions).length === 0) {
            // Skip rules with empty conditions
            continue;
          }
          
          if (!matched) continue;
          
          // Cap confidence at 0.95
          confidence = Math.min(confidence, 0.95);
          
          // Determine direction
          const direction = priceChange24h > 0 ? 'BULLISH' : priceChange24h < 0 ? 'BEARISH' : 'NEUTRAL';
          
          // Create the signal
          const signal = await db.signal.create({
            data: {
              type: 'PATTERN',
              tokenId: token.id,
              confidence: Math.round(confidence * 100),
              direction,
              description: description.slice(0, 500),
              metadata: JSON.stringify({
                patternRuleId: rule.id,
                patternRuleName: rule.name,
                category: rule.category || 'GENERAL',
                conditions,
                tokenSymbol: token.symbol,
                tokenChain: token.chain,
              }),
            },
          });
          
          signals.push(signal);
        } catch (tokenError) {
          // Skip individual token errors
        }
      }
    } catch (ruleError) {
      console.error(`[PatternSignals] Error processing rule ${rule.id}:`, ruleError);
    }
  }
  
  console.log(`[PatternSignals] Created ${signals.length} pattern signals`);
  return { signals, count: signals.length };
}
