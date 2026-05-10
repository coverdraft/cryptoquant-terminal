// ============================================================
// SHARED FORMATTING & UTILITY FUNCTIONS
// Eliminates duplication across dashboard components
// ============================================================

/** Format a price with appropriate decimal precision */
export function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.001) return `$${price.toFixed(4)}`;
  if (price >= 0.00001) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(8)}`;
}

/** Format a large number as compact volume (1.2M, 345K) */
export function formatVolume(vol: number): string {
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(0)}K`;
  return `$${vol.toFixed(0)}`;
}

/** Format market cap with T/B/M suffix */
export function formatMarketCap(val: number): string {
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val.toFixed(0)}`;
}

/** Format a percentage change with + sign */
export function formatChange(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

/** Format uptime from milliseconds */
export function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

// ============================================================
// CHAIN CONFIGURATION
// ============================================================

export const CHAIN_CONFIG: Record<string, { name: string; color: string; bg: string; border: string }> = {
  SOL:   { name: 'Solana',    color: 'text-purple-400',   bg: 'bg-purple-500/10',   border: 'border-purple-500/30' },
  ETH:   { name: 'Ethereum',  color: 'text-blue-400',     bg: 'bg-blue-500/10',     border: 'border-blue-500/30' },
  BASE:  { name: 'Base',      bg: 'bg-blue-600/10',      color: 'text-blue-300',   border: 'border-blue-600/30' },
  BSC:   { name: 'BNB Chain', color: 'text-yellow-400',   bg: 'bg-yellow-500/10',   border: 'border-yellow-500/30' },
  MATIC: { name: 'Polygon',   color: 'text-violet-400',   bg: 'bg-violet-500/10',   border: 'border-violet-500/30' },
  ARB:   { name: 'Arbitrum',  color: 'text-sky-400',      bg: 'bg-sky-500/10',      border: 'border-sky-500/30' },
  OP:    { name: 'Optimism',  color: 'text-red-400',      bg: 'bg-red-500/10',      border: 'border-red-500/30' },
  AVAX:  { name: 'Avalanche', color: 'text-red-400',      bg: 'bg-red-600/10',      border: 'border-red-600/30' },
};

export const ALL_CHAINS = Object.keys(CHAIN_CONFIG);

export function getChainBadge(chain: string): { color: string; bg: string; border: string } {
  return CHAIN_CONFIG[chain] || { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30' };
}

// ============================================================
// MARKET INDICATORS
// ============================================================

/** Fear & Greed: color + label based on range */
export function getFearGreedStyle(value: number): { color: string; label: string } {
  if (value <= 25) return { color: 'text-red-400',     label: 'Extreme Fear' };
  if (value <= 45) return { color: 'text-orange-400',  label: 'Fear' };
  if (value <= 55) return { color: 'text-yellow-400',  label: 'Neutral' };
  if (value <= 75) return { color: 'text-emerald-400', label: 'Greed' };
  return { color: 'text-emerald-300', label: 'Extreme Greed' };
}

/** Market regime badge style */
export function getRegimeStyle(regime: string): { bg: string; text: string; border: string } {
  switch (regime?.toUpperCase()) {
    case 'BULL':       return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    case 'BEAR':       return { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/30' };
    case 'SIDEWAYS':   return { bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  border: 'border-yellow-500/30' };
    case 'TRANSITION': return { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/30' };
    default:           return { bg: 'bg-gray-500/10',    text: 'text-gray-400',    border: 'border-gray-500/30' };
  }
}

/** Operability level color */
export function getOperabilityColor(level: string): string {
  switch (level) {
    case 'PREMIUM':   return 'text-emerald-400';
    case 'GOOD':      return 'text-blue-400';
    case 'MARGINAL':  return 'text-yellow-400';
    case 'RISKY':     return 'text-orange-400';
    case 'UNOPERABLE': return 'text-red-400';
    default:          return 'text-gray-400';
  }
}

/** Token lifecycle phase color */
export function getPhaseColor(phase: string): string {
  switch (phase) {
    case 'GENESIS':   return 'text-violet-400';
    case 'INCIPIENT': return 'text-blue-400';
    case 'GROWTH':    return 'text-emerald-400';
    case 'FOMO':      return 'text-yellow-400';
    case 'DECLINE':   return 'text-orange-400';
    case 'LEGACY':    return 'text-gray-400';
    default:          return 'text-gray-500';
  }
}

/** Risk score color (0-100) */
export function getRiskColor(score: number): string {
  if (score <= 30) return 'text-emerald-400';
  if (score <= 50) return 'text-yellow-400';
  if (score <= 70) return 'text-orange-400';
  return 'text-red-400';
}

// ============================================================
// DEXSCREENER CHAIN NORMALIZATION
// ============================================================

const DEXSCREENER_CHAIN_MAP: Record<string, string> = {
  solana: 'SOL', ethereum: 'ETH', base: 'BASE', bsc: 'BSC',
  polygon: 'MATIC', arbitrum: 'ARB', optimism: 'OP', avalanche: 'AVAX',
  sol: 'SOL', eth: 'ETH', matic: 'MATIC', arb: 'ARB', op: 'OP', avax: 'AVAX',
};

export function normalizeChain(raw: string): string {
  return DEXSCREENER_CHAIN_MAP[raw.toLowerCase()] || raw.toUpperCase();
}
