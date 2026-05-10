/**
 * Backtest Data Bridge - CryptoQuant Terminal
 *
 * Connects the OHLCV Pipeline / PriceCandle DB to the BacktestingEngine.
 * Solves the critical issue: backtest was receiving empty TokenData[].
 *
 * Responsibilities:
 * 1. Load PriceCandle data from DB for tokens matching the system's asset filter
 * 2. Convert PriceCandle rows → OHLCVBar[] for the backtesting engine
 * 3. Detect token phase from DB data (TokenDNA, age, metrics)
 * 4. Provide per-bar metrics (liquidity, volume, bot ratio, etc.) from token snapshots
 * 5. Support multi-timeframe data loading for brain-signal backtesting
 */

import { db } from '../db';
import type { TokenData, OHLCVBar } from './backtesting-engine';
import type { AssetFilterConfig, TokenPhase } from './trading-system-engine';
import { ohlcvPipeline } from './ohlcv-pipeline';

// ============================================================
// CONFIG INTERFACE
// ============================================================

export interface BacktestDataConfig {
  /** Token addresses to backtest (if empty, auto-discover from DB) */
  tokenAddresses?: string[];
  /** Chain filter */
  chain?: string;
  /** Start date */
  startDate: Date;
  /** End date */
  endDate: Date;
  /** Primary timeframe for the backtest */
  timeframe: string;
  /** Minimum number of candles required per token */
  minCandles: number;
  /** Asset filter from system template (min liquidity, max age, etc.) */
  assetFilter?: AssetFilterConfig;
  /** Maximum tokens to load (for performance) */
  maxTokens?: number;
  /** Include per-bar metrics (slower but more realistic) */
  includeMetrics?: boolean;
}

// ============================================================
// PHASE THRESHOLDS (in hours)
// ============================================================

const PHASE_THRESHOLDS: Array<{ maxHours: number; phase: TokenPhase }> = [
  { maxHours: 6, phase: 'GENESIS' },
  { maxHours: 48, phase: 'LAUNCH' },
  { maxHours: 14 * 24, phase: 'EARLY' },        // 336h
  { maxHours: 60 * 24, phase: 'GROWTH' },       // 1440h
  { maxHours: 180 * 24, phase: 'MATURE' },      // 4320h
  { maxHours: 365 * 24, phase: 'ESTABLISHED' }, // 8760h
];

/** Hours beyond ESTABLISHED threshold → LEGACY */
const LEGACY_HOURS = 365 * 24;

// ============================================================
// BACKTEST DATA BRIDGE CLASS
// ============================================================

export class BacktestDataBridge {
  // ----------------------------------------------------------
  // 1. loadTokensForBacktest
  // ----------------------------------------------------------

  /**
   * Main method: find tokens matching criteria, load OHLCV,
   * enrich with per-bar metrics.
   */
  async loadTokensForBacktest(config: BacktestDataConfig): Promise<TokenData[]> {
    const {
      tokenAddresses,
      chain,
      startDate,
      endDate,
      timeframe,
      minCandles,
      assetFilter,
      maxTokens,
      includeMetrics,
    } = config;

    // Step 1: Resolve the list of token addresses to load
    let addresses = tokenAddresses && tokenAddresses.length > 0
      ? [...tokenAddresses]
      : await this.autoDiscoverTokens(chain, startDate, endDate, assetFilter, maxTokens);

    // Enforce maxTokens limit
    if (maxTokens && maxTokens > 0 && addresses.length > maxTokens) {
      addresses = addresses.slice(0, maxTokens);
    }

    if (addresses.length === 0) {
      console.warn('[backtest-data-bridge] No tokens found matching criteria');
      return [];
    }

    // Step 2: Load TokenData for each address (parallel, batched)
    const BATCH_SIZE = 5;
    const results: TokenData[] = [];

    for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
      const batch = addresses.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((addr) => {
          // Derive chain: use config chain or default to SOL
          const tokenChain = chain ?? 'SOL';
          return this.loadSingleToken(addr, tokenChain, timeframe, startDate, endDate);
        }),
      );

      for (const td of batchResults) {
        if (td === null) continue;

        // Enforce minCandles
        if (td.bars.length < minCandles) continue;

        // Optionally enrich with per-bar metrics
        const enriched = includeMetrics
          ? await this.enrichWithMetrics(td, td.tokenAddress)
          : td;

        results.push(enriched);
      }
    }

    console.info(
      `[backtest-data-bridge] Loaded ${results.length} tokens with ≥${minCandles} candles ` +
      `(${timeframe}, ${startDate.toISOString()} → ${endDate.toISOString()})`,
    );

    return results;
  }

  // ----------------------------------------------------------
  // 2. loadSingleToken
  // ----------------------------------------------------------

  /**
   * Load data for a specific token: OHLCV bars + phase detection.
   */
  async loadSingleToken(
    tokenAddress: string,
    chain: string,
    timeframe: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TokenData | null> {
    // Load token metadata from DB
    const token = await db.token.findUnique({
      where: { address: tokenAddress },
      include: { dna: true },
    });

    if (!token) {
      console.warn(`[backtest-data-bridge] Token not found in DB: ${tokenAddress}`);
      // Still attempt to load candles — the token may have been pruned
      // from the Token table but PriceCandle rows may exist
    }

    // Load OHLCV candles via the pipeline
    const candleRows = await ohlcvPipeline.getCandles(
      tokenAddress,
      timeframe,
      startDate,
      endDate,
    );

    if (candleRows.length === 0) {
      return null;
    }

    // Convert PriceCandleRow[] → OHLCVBar[]
    const bars: OHLCVBar[] = candleRows
      .filter((c) => {
        const ts = c.timestamp.getTime();
        return ts >= startDate.getTime() && ts <= endDate.getTime();
      })
      .map((c) => ({
        timestamp: c.timestamp.getTime(),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }));

    if (bars.length === 0) {
      return null;
    }

    // Sort bars by timestamp ascending
    bars.sort((a, b) => a.timestamp - b.timestamp);

    // Detect phase
    const phase = await this.detectTokenPhase(tokenAddress);

    return {
      tokenAddress,
      symbol: token?.symbol ?? tokenAddress.slice(0, 8),
      createdAt: token?.createdAt ?? new Date(bars[0].timestamp),
      phase,
      bars,
    };
  }

  // ----------------------------------------------------------
  // 3. detectTokenPhase
  // ----------------------------------------------------------

  /**
   * Detect phase from DB data (age, holder count, market cap, DNA).
   *
   * Phase mapping:
   *   < 6h    → GENESIS
   *   6h-48h  → LAUNCH
   *   2d-14d  → EARLY
   *   14d-60d → GROWTH
   *   60d-180d → MATURE
   *   180d-1yr → ESTABLISHED
   *   >1yr    → LEGACY
   */
  async detectTokenPhase(tokenAddress: string): Promise<TokenPhase> {
    const token = await db.token.findUnique({
      where: { address: tokenAddress },
      include: { dna: true },
    });

    if (!token) {
      // No token record — default to EARLY as a safe middle ground
      return 'EARLY';
    }

    const now = Date.now();
    const ageMs = now - token.createdAt.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    // Base phase from age
    let phase: TokenPhase = 'LEGACY';
    for (const threshold of PHASE_THRESHOLDS) {
      if (ageHours <= threshold.maxHours) {
        phase = threshold.phase;
        break;
      }
    }
    if (ageHours > LEGACY_HOURS) {
      phase = 'LEGACY';
    }

    // Refinements using holder count and market cap
    // — Very high holder count at a young age suggests organic growth → bump up
    // — Very low holder count at an old age suggests dead token → keep as is
    if (token.holderCount > 1000 && (phase === 'GENESIS' || phase === 'LAUNCH')) {
      // Has significant adoption already despite being new — might be more established
      // than age alone suggests. Don't bump too aggressively though.
      if (phase === 'GENESIS' && token.holderCount > 500) {
        phase = 'LAUNCH';
      }
    }

    // Market cap refinement
    if (token.marketCap > 1_000_000 && phase === 'GENESIS') {
      // A token with >$1M market cap is unlikely to be in GENESIS
      phase = 'LAUNCH';
    }

    // DNA-based refinement: if DNA exists, use riskScore / botActivityScore
    // to sanity-check the phase
    if (token.dna) {
      const dna = token.dna;

      // High wash trade probability → token might be younger / less established
      // than metrics suggest
      if (dna.washTradeProb > 0.5 && (phase === 'GROWTH' || phase === 'MATURE')) {
        // Downgrade one step — inflated metrics
        const downgradeMap: Partial<Record<TokenPhase, TokenPhase>> = {
          MATURE: 'GROWTH',
          GROWTH: 'EARLY',
        };
        phase = downgradeMap[phase] ?? phase;
      }

      // High smart money score → token is more legitimate, trust the age-based phase
      // No upgrade needed — just don't downgrade
    }

    return phase;
  }

  // ----------------------------------------------------------
  // 4. enrichWithMetrics
  // ----------------------------------------------------------

  /**
   * Add per-bar metrics from Token/TokenDNA snapshots.
   *
   * Strategy:
   * - If TokenDNA exists, use it as the primary source for bot ratio,
   *   smart money count, etc.
   * - Interpolate/propagate the Token-level snapshot values across all bars
   *   since we typically only have current-state metrics, not historical per-bar.
   * - This is an approximation but far better than no metrics at all.
   */
  async enrichWithMetrics(
    tokenData: TokenData,
    tokenAddress: string,
  ): Promise<TokenData> {
    const token = await db.token.findUnique({
      where: { address: tokenAddress },
      include: { dna: true },
    });

    if (!token || tokenData.bars.length === 0) {
      // No token data — return as-is (no metrics)
      return tokenData;
    }

    // Build a base metrics snapshot from current Token + DNA state
    const baseMetrics: TokenData['metricsPerBar'] extends Array<infer M> | undefined ? M : never = {
      holderCount: token.holderCount || undefined,
      liquidityUsd: token.liquidity || undefined,
      volume24h: token.volume24h || undefined,
      botRatio: token.botActivityPct / 100 || undefined,
      smartMoneyCount: undefined,
      rugScore: undefined,
    };

    // Enrich with DNA data if available
    if (token.dna) {
      const dna = token.dna;
      baseMetrics.rugScore = dna.riskScore || undefined;
      baseMetrics.smartMoneyCount = dna.smartMoneyScore || undefined;
      baseMetrics.botRatio = (dna.botActivityScore / 100) || baseMetrics.botRatio;

      // Include additional DNA-derived metrics via the index signature
      (baseMetrics as Record<string, unknown>)['washTradeProb'] = dna.washTradeProb || 0;
      (baseMetrics as Record<string, unknown>)['sniperPct'] = dna.sniperPct || 0;
      (baseMetrics as Record<string, unknown>)['mevPct'] = dna.mevPct || 0;
      (baseMetrics as Record<string, unknown>)['whaleScore'] = dna.whaleScore || 0;
    }

    // Propagate the snapshot across all bars.
    // For a more accurate implementation, one could query historical
    // OperabilitySnapshot or TraderTransaction rows, but the current
    // data model doesn't store per-bar snapshots natively.
    //
    // We apply a simple decay model: older bars get slightly lower
    // holder/liquidity values to simulate growth over time.
    const metricsPerBar: NonNullable<TokenData['metricsPerBar']> = [];
    const barCount = tokenData.bars.length;

    for (let i = 0; i < barCount; i++) {
      const fraction = barCount > 1 ? i / (barCount - 1) : 1; // 0 = oldest bar, 1 = newest

      const barMetrics = { ...baseMetrics };

      // Simple linear interpolation: assume metrics grew from ~20% of current
      // value at the oldest bar to 100% at the newest bar.
      // This is a rough heuristic — real historical data would be better.
      const growthFactor = 0.2 + 0.8 * fraction;

      if (barMetrics.holderCount !== undefined) {
        barMetrics.holderCount = Math.max(1, Math.round(barMetrics.holderCount * growthFactor));
      }
      if (barMetrics.liquidityUsd !== undefined) {
        barMetrics.liquidityUsd = Math.max(0, barMetrics.liquidityUsd * growthFactor);
      }
      if (barMetrics.volume24h !== undefined) {
        // Volume is more variable — use a wider range
        barMetrics.volume24h = Math.max(0, barMetrics.volume24h * growthFactor);
      }

      metricsPerBar.push(barMetrics);
    }

    return {
      ...tokenData,
      metricsPerBar,
    };
  }

  // ----------------------------------------------------------
  // 5. getAvailableTokenCount
  // ----------------------------------------------------------

  /**
   * How many tokens have enough data for backtesting.
   * Useful for UI to show "N tokens available for backtest" before running.
   */
  async getAvailableTokenCount(
    chain?: string,
    minCandles: number = 50,
  ): Promise<number> {
    // Find distinct token addresses that have PriceCandle data
    const candleGroups = await db.priceCandle.groupBy({
      by: ['tokenAddress'],
      where: chain ? { chain } : undefined,
      _count: { id: true },
    });

    // Filter by minimum candle count
    const qualifying = candleGroups.filter(
      (g) => g._count.id >= minCandles,
    );

    return qualifying.length;
  }

  // ----------------------------------------------------------
  // PRIVATE HELPERS
  // ----------------------------------------------------------

  /**
   * Auto-discover tokens from the DB that match the given criteria.
   * Used when tokenAddresses is not explicitly provided.
   */
  private async autoDiscoverTokens(
    chain?: string,
    startDate?: Date,
    endDate?: Date,
    assetFilter?: AssetFilterConfig,
    maxTokens?: number,
  ): Promise<string[]> {
    // Build where clause for Token query
    const tokenWhere: Record<string, unknown> = {};

    if (chain) {
      tokenWhere.chain = chain;
    }

    // Apply asset filter criteria
    if (assetFilter) {
      if (assetFilter.chains && assetFilter.chains.length > 0 && !chain) {
        tokenWhere.chain = { in: assetFilter.chains };
      }

      if (assetFilter.minLiquidityUsd > 0) {
        tokenWhere.liquidity = { gte: assetFilter.minLiquidityUsd };
      }
      if (assetFilter.maxLiquidityUsd !== undefined && assetFilter.maxLiquidityUsd > 0) {
        tokenWhere.liquidity = {
          ...(typeof tokenWhere.liquidity === 'object' ? tokenWhere.liquidity as object : {}),
          lte: assetFilter.maxLiquidityUsd,
        };
      }

      if (assetFilter.minMarketCapUsd !== undefined && assetFilter.minMarketCapUsd > 0) {
        tokenWhere.marketCap = { gte: assetFilter.minMarketCapUsd };
      }
      if (assetFilter.maxMarketCapUsd !== undefined && assetFilter.maxMarketCapUsd > 0) {
        tokenWhere.marketCap = {
          ...(typeof tokenWhere.marketCap === 'object' ? tokenWhere.marketCap as object : {}),
          lte: assetFilter.maxMarketCapUsd,
        };
      }

      if (assetFilter.minHolders !== undefined && assetFilter.minHolders > 0) {
        tokenWhere.holderCount = { gte: assetFilter.minHolders };
      }
      if (assetFilter.maxHolders !== undefined && assetFilter.maxHolders > 0) {
        tokenWhere.holderCount = {
          ...(typeof tokenWhere.holderCount === 'object' ? tokenWhere.holderCount as object : {}),
          lte: assetFilter.maxHolders,
        };
      }

      if (assetFilter.minVolume24h !== undefined && assetFilter.minVolume24h > 0) {
        tokenWhere.volume24h = { gte: assetFilter.minVolume24h };
      }

      // Age filters: maxAgeHours / minAgeHours → filter by createdAt
      if (assetFilter.maxAgeHours !== undefined && assetFilter.maxAgeHours > 0) {
        const minCreatedAt = new Date(Date.now() - assetFilter.maxAgeHours * 60 * 60 * 1000);
        tokenWhere.createdAt = { gte: minCreatedAt };
      }
      if (assetFilter.minAgeHours !== undefined && assetFilter.minAgeHours > 0) {
        const maxCreatedAt = new Date(Date.now() - assetFilter.minAgeHours * 60 * 60 * 1000);
        tokenWhere.createdAt = {
          ...(typeof tokenWhere.createdAt === 'object' ? tokenWhere.createdAt as object : {}),
          lte: maxCreatedAt,
        };
      }

      // Bot ratio filter
      if (assetFilter.maxBotRatio !== undefined && assetFilter.maxBotRatio > 0) {
        tokenWhere.botActivityPct = { lte: assetFilter.maxBotRatio * 100 };
      }

      // Smart money holders
      if (assetFilter.minSmartMoneyHolders !== undefined && assetFilter.minSmartMoneyHolders > 0) {
        tokenWhere.smartMoneyPct = { gte: assetFilter.minSmartMoneyHolders };
      }
    }

    // Find tokens that have PriceCandle data in the date range
    // Strategy: query tokens, then verify they have candle data
    const limit = maxTokens && maxTokens > 0 ? maxTokens * 3 : 500; // Over-fetch to allow filtering

    const tokens = await db.token.findMany({
      where: tokenWhere,
      select: { address: true, chain: true },
      orderBy: { volume24h: 'desc' }, // Prioritize high-volume tokens
      take: limit,
    });

    if (tokens.length === 0) {
      return [];
    }

    // Verify that each token has PriceCandle data in the date range
    const verifiedAddresses: string[] = [];

    // Batch verification: check which tokens have candles in the date range
    if (startDate && endDate) {
      // Use a groupBy query to find token addresses with candles in range
      // Any group that appears inherently has ≥1 candle, so no having clause needed
      const tokensWithCandles = await db.priceCandle.groupBy({
        by: ['tokenAddress'],
        where: {
          tokenAddress: { in: tokens.map((t) => t.address) },
          timestamp: { gte: startDate, lte: endDate },
          ...(chain ? { chain } : {}),
        },
        _count: { id: true },
      });

      const eligibleSet = new Set(tokensWithCandles.map((g) => g.tokenAddress));

      for (const token of tokens) {
        if (eligibleSet.has(token.address)) {
          verifiedAddresses.push(token.address);
          if (maxTokens && verifiedAddresses.length >= maxTokens) break;
        }
      }
    } else {
      // No date range — just return all discovered tokens
      for (const token of tokens) {
        verifiedAddresses.push(token.address);
        if (maxTokens && verifiedAddresses.length >= maxTokens) break;
      }
    }

    // Apply DNA-based filters if specified in assetFilter
    if (assetFilter?.excludeRugScoreAbove !== undefined || assetFilter?.excludeWashTradeAbove !== undefined) {
      const filteredAddresses = await this.applyDnaFilters(
        verifiedAddresses,
        assetFilter,
      );
      return filteredAddresses;
    }

    return verifiedAddresses;
  }

  /**
   * Apply DNA-based asset filters (rug score, wash trade probability).
   * Only checks tokens that have a DNA record — tokens without DNA
   * are kept (not filtered out) since we can't determine their scores.
   */
  private async applyDnaFilters(
    addresses: string[],
    assetFilter: AssetFilterConfig,
  ): Promise<string[]> {
    // Batch load DNA records
    const dnaRecords = await db.tokenDNA.findMany({
      where: {
        token: { address: { in: addresses } },
      },
      include: { token: { select: { address: true } } },
    });

    // Build a map of address → DNA for quick lookup
    const dnaMap = new Map<string, typeof dnaRecords[0]>();
    for (const dna of dnaRecords) {
      if (dna.token) {
        dnaMap.set(dna.token.address, dna);
      }
    }

    // Filter
    const result: string[] = [];
    for (const addr of addresses) {
      const dna = dnaMap.get(addr);

      if (!dna) {
        // No DNA record — keep the token (can't filter)
        result.push(addr);
        continue;
      }

      // Check rug score (riskScore in DNA is 0-100)
      if (assetFilter.excludeRugScoreAbove !== undefined) {
        if (dna.riskScore > assetFilter.excludeRugScoreAbove) {
          continue; // Exclude this token
        }
      }

      // Check wash trade probability
      if (assetFilter.excludeWashTradeAbove !== undefined) {
        if (dna.washTradeProb > assetFilter.excludeWashTradeAbove) {
          continue; // Exclude this token
        }
      }

      result.push(addr);
    }

    return result;
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

export const backtestDataBridge = new BacktestDataBridge();
