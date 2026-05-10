/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  Unified Cache — Single source of truth for ALL in-memory caching      ║
 * ║  TTL-based in-memory cache with per-entry TTL support                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Unified cache used across the entire application — data source clients,
 * extractors, and any service that needs TTL-based in-memory caching.
 * Supports per-entry custom TTL for flexible cache durations.
 *
 * Replaces the former ExtractorCache and SourceCache with a single
 * superior implementation that supports per-entry TTL.
 *
 * Usage:
 *   const cache = new UnifiedCache(30); // 30 min default TTL
 *   cache.set('key', data);              // Uses default TTL
 *   cache.set('key', data, 5);           // 5 minute custom TTL
 *   const result = cache.get<Type>('key');
 */

export class UnifiedCache {
  private cache = new Map<string, { data: unknown; timestamp: number; ttlMs: number }>();
  private defaultTtlMs: number;

  constructor(defaultTtlMinutes = 30) {
    this.defaultTtlMs = defaultTtlMinutes * 60 * 1000;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /**
   * Set a cache entry with an optional custom TTL.
   * If no custom TTL is provided, uses the default.
   */
  set(key: string, data: unknown, ttlMinutes?: number): void {
    const ttlMs = ttlMinutes !== undefined ? ttlMinutes * 60 * 1000 : this.defaultTtlMs;
    this.cache.set(key, { data, timestamp: Date.now(), ttlMs });
  }

  /** Invalidate all entries matching a key prefix */
  invalidate(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
  }

  /** Clear all cache entries */
  clear(): void {
    this.cache.clear();
  }

  /** Get the number of entries currently in cache */
  size(): number {
    return this.cache.size;
  }
}

/** @deprecated Use UnifiedCache instead. Kept for backward compatibility. */
export const SourceCache = UnifiedCache;
