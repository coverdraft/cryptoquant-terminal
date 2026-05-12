/**
 * Safe formatting utilities for CryptoQuant Terminal.
 * All functions handle null/undefined/NaN gracefully — no crashes.
 */

/** Safe toFixed — never crashes on null/undefined/NaN */
export function safeToFixed(val: number | undefined | null | string, digits: number = 2): string {
  const num = Number(val);
  if (val == null || isNaN(num)) return '0';
  return num.toFixed(digits);
}

/** Safe price formatting */
export function formatPrice(price: number | undefined | null): string {
  const p = Number(price);
  if (price == null || isNaN(p) || p === 0) return '$0.00';
  if (p >= 1000) return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.001) return `$${p.toFixed(4)}`;
  if (p >= 0.00001) return `$${p.toFixed(6)}`;
  return `$${p.toFixed(8)}`;
}

/** Safe price formatting without $ */
export function formatPriceRaw(price: number | undefined | null): string {
  const p = Number(price);
  if (price == null || isNaN(p) || p === 0) return '0.00';
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  if (p >= 0.001) return p.toFixed(4);
  if (p >= 0.00001) return p.toFixed(6);
  return p.toFixed(8);
}

/** Safe volume/market cap formatting */
export function formatVolume(vol: number | undefined | null): string {
  const v = Number(vol);
  if (vol == null || isNaN(v) || v === 0) return '$0';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

/** Safe volume formatting without $ */
export function formatVolumeRaw(vol: number | undefined | null): string {
  const v = Number(vol);
  if (vol == null || isNaN(v) || v === 0) return '0';
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(0);
}

/** Safe currency formatting (for capital, PnL, etc.) */
export function formatCurrency(val: number | undefined | null): string {
  const v = Number(val);
  if (val == null || isNaN(v)) return '$0.00';
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(2)}K`;
  return `$${v.toFixed(2)}`;
}

/** Safe percentage formatting with sign */
export function formatPct(val: number | undefined | null, digits: number = 1): string {
  const v = Number(val);
  if (val == null || isNaN(v)) return '0.0%';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(digits)}%`;
}

/** Safe percentage formatting without sign */
export function formatPctNoSign(val: number | undefined | null, digits: number = 1): string {
  const v = Number(val);
  if (val == null || isNaN(v)) return `0.${'0'.repeat(digits)}%`;
  return `${v.toFixed(digits)}%`;
}

/** Safe market cap formatting */
export function formatMarketCap(val: number | undefined | null): string {
  const v = Number(val);
  if (val == null || isNaN(v) || v === 0) return '$0';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

/** Safe duration formatting */
export function formatDuration(ms: number | undefined | null): string {
  const v = Number(ms);
  if (ms == null || isNaN(v) || v <= 0) return '—';
  if (v < 1000) return `${v}ms`;
  if (v < 60000) return `${(v / 1000).toFixed(1)}s`;
  return `${(v / 60000).toFixed(1)}m`;
}

/** Safe time ago formatting */
export function formatTimeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'just now';
  if (diff < 5000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

/** Safe interval formatting */
export function formatInterval(ms: number | undefined | null): string {
  const v = Number(ms);
  if (ms == null || isNaN(v) || v < 1000) return `${v ?? 0}ms`;
  if (v < 60000) return `${Math.round(v / 1000)}s`;
  if (v < 3600000) {
    const mins = Math.floor(v / 60000);
    const secs = Math.round((v % 60000) / 1000);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
  }
  const hrs = Math.floor(v / 3600000);
  const mins = Math.round((v % 3600000) / 60000);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

/** Safe countdown formatting */
export function formatCountdown(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'now';
  if (diff < 60000) return `${Math.ceil(diff / 1000)}s`;
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    const secs = Math.ceil((diff % 60000) / 1000);
    return secs >= 60 ? `${mins + 1}m` : `${mins}m ${secs}s`;
  }
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.ceil((diff % 3600000) / 60000);
  return mins >= 60 ? `${hrs + 1}h` : `${hrs}h ${mins}m`;
}
