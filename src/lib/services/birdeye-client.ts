/**
 * Birdeye API Client - CryptoQuant Terminal
 *
 * Real client for Birdeye's FREE tier API.
 * Provides: top traders, token prices, wallet transactions, new listings, smart money discovery.
 *
 * Free tier requires an API key from https://birdeye.so
 * Set via NEXT_PUBLIC_BIRDEYE_API_KEY env var.
 * All methods gracefully return empty data when no key is configured.
 *
 * Rate limiting: 150ms minimum between calls, exponential backoff on 429.
 * Caching: via unifiedCache with source-specific TTLs.
 */

import { unifiedCache, cacheKeyWithChain } from '../unified-cache';

// ============================================================
// TYPES
// ============================================================

/** Backward-compatible price data type */
export interface BirdeyePriceData {
  address: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
}

/** Backward-compatible transaction type */
export interface ParsedTransaction {
  txHash: string;
  blockTime: Date;
  action: 'BUY' | 'SELL' | 'TRANSFER' | 'ADD_LIQUIDITY' | 'REMOVE_LIQUIDITY' | 'SWAP' | 'UNKNOWN';
  tokenAddress: string;
  tokenSymbol?: string;
  quoteToken?: string;
  amountIn: number;
  amountOut: number;
  valueUsd: number;
  dex?: string;
  slippageBps?: number;
  isFrontrun: boolean;
  isSandwich: boolean;
  priorityFee?: number;
  gasUsed?: number;
}

/** Backward-compatible wallet history type */
export interface WalletTransactionHistory {
  address: string;
  chain: string;
  transactions: ParsedTransaction[];
  totalCount: number;
  hasMore: boolean;
}

// --- New types for the real client ---

/** Top trader data for a token */
export interface BirdeyeTopTrader {
  address: string;
  buys: number;
  sells: number;
  volumeUsd: number;
  pnlUsd: number;
  avgHoldTime: number;
  firstBuyTime: number;
  winRate: number;
  isBot: boolean;
}

/** Token price data from Birdeye */
export interface BirdeyeTokenPrice {
  value: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
}

/** Wallet token holding with PnL */
export interface BirdeyeWalletToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: number;
  valueUsd: number;
  pnlUsd?: number;
  pnlPercent?: number;
  priceUsd?: number;
}

/** Wallet transaction from Birdeye */
export interface BirdeyeWalletTx {
  txHash: string;
  blockTime: number;
  action: string;
  tokenAddress: string;
  tokenSymbol?: string;
  fromAddress?: string;
  toAddress?: string;
  amountIn: number;
  amountOut: number;
  valueUsd: number;
  dex?: string;
  source?: string;
}

/** Newly listed token */
export interface BirdeyeNewListing {
  address: string;
  symbol: string;
  name: string;
  chain: string;
  priceUsd: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  priceChange24h: number;
  createdAt: number;
}

/** Comprehensive token overview */
export interface BirdeyeTokenOverview {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  priceUsd: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  holderCount: number;
  totalSupply: number;
  circulatingSupply: number;
  logoURI?: string;
  extensions?: Record<string, string>;
}

/** Smart money trader classification */
export interface SmartMoneyTrader {
  address: string;
  winRate: number;
  pnlUsd: number;
  volumeUsd: number;
  isBot: boolean;
  avgHoldTime: number;
  smartScore: number;
  classification: 'WHALE' | 'SNIPER' | 'SMART_MONEY' | 'BOT' | 'RETAIL';
  walletTokens: BirdeyeWalletToken[];
}

// ============================================================
// CONSTANTS
// ============================================================

const BASE_URL = 'https://public-api.birdeye.so';
const SOURCE = 'birdeye';

const CACHE_TTLS = {
  price: 30_000,          // 30s
  topTraders: 60_000,     // 60s
  walletData: 120_000,    // 120s
  newListings: 300_000,   // 300s (5 min)
  tokenOverview: 120_000, // 120s
  smartMoney: 120_000,    // 120s
} as const;

const MIN_INTER_REQUEST_MS = 150;     // 150ms between calls (free tier ~10/s)
const MAX_BACKOFF_MS = 30_000;        // 30s max backoff
const MAX_RETRIES = 4;
const REQUEST_TIMEOUT_MS = 15_000;    // 15s timeout

// ============================================================
// DEFAULT CONFIG (backward compatible)
// ============================================================

export const DEFAULT_BIRDEYE_CONFIG = {
  birdeyeApiUrl: BASE_URL,
  birdeyeApiKey: (typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || process.env.BIRDEYE_API_KEY
    : undefined) as string | undefined,
};

// ============================================================
// BIRDEYE CLIENT
// ============================================================

export class BirdeyeClient {
  private apiKey: string | undefined;
  private lastRequestTime = 0;
  private backoffUntil = 0;

  constructor(_baseUrl?: string, apiKey?: string) {
    this.apiKey = apiKey ?? DEFAULT_BIRDEYE_CONFIG.birdeyeApiKey;
  }

  // ----------------------------------------------------------
  // Rate-limited fetch with exponential backoff
  // ----------------------------------------------------------

  private async rateLimitedFetch<T>(
    endpoint: string,
    chain: string = 'solana',
  ): Promise<T | null> {
    // No API key → graceful no-op
    if (!this.apiKey) {
      console.warn('[Birdeye] No API key configured. Set NEXT_PUBLIC_BIRDEYE_API_KEY to enable Birdeye data.');
      return null;
    }

    // Respect global backoff (from 429 responses)
    if (Date.now() < this.backoffUntil) {
      const wait = this.backoffUntil - Date.now();
      console.warn(`[Birdeye] In backoff, waiting ${wait}ms before retry...`);
      await this.sleep(wait);
    }

    // Enforce minimum interval between requests
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < MIN_INTER_REQUEST_MS) {
      await this.sleep(MIN_INTER_REQUEST_MS - elapsed);
    }

    // Retry loop with exponential backoff
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        this.lastRequestTime = Date.now();

        const url = `${BASE_URL}${endpoint}`;
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'X-API-KEY': this.apiKey,
            'x-chain': chain,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (res.status === 429) {
          // Exponential backoff: 1s, 2s, 4s, 8s...
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), MAX_BACKOFF_MS);
          console.warn(`[Birdeye] Rate limited (429) on ${endpoint}, backing off ${backoffMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);

          // Set global backoff so other concurrent calls also wait
          this.backoffUntil = Date.now() + backoffMs;

          if (attempt < MAX_RETRIES) {
            await this.sleep(backoffMs);
            continue;
          }
          return null;
        }

        if (!res.ok) {
          console.warn(`[Birdeye] API error ${res.status} on ${endpoint}`);
          return null;
        }

        const json = await res.json();

        // Birdeye wraps responses in { success: boolean, data: T }
        if (json && typeof json === 'object') {
          if (json.success === false) {
            console.warn(`[Birdeye] API returned success=false on ${endpoint}:`, json.message || json.errors);
            return null;
          }
          return (json.data ?? json) as T;
        }

        return json as T;
      } catch (err) {
        if (attempt < MAX_RETRIES && err instanceof Error && err.name !== 'AbortError') {
          const backoffMs = Math.min(500 * Math.pow(2, attempt), MAX_BACKOFF_MS);
          console.warn(`[Birdeye] Request error on ${endpoint}, retrying in ${backoffMs}ms:`, err.message);
          await this.sleep(backoffMs);
          continue;
        }
        console.error(`[Birdeye] Request failed for ${endpoint}:`, err);
        return null;
      }
    }

    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ----------------------------------------------------------
  // 1. getTokenTopTraders — THE MOST IMPORTANT METHOD
  // ----------------------------------------------------------

  /**
   * Get top traders for a token — real wallet addresses with real PnL.
   * Endpoint: GET /defi/v2/token/top_traders
   */
  async getTokenTopTraders(
    address: string,
    chain: string = 'solana',
    limit: number = 20,
  ): Promise<BirdeyeTopTrader[]> {
    const key = cacheKeyWithChain(SOURCE, 'topTraders', chain, address);
    return unifiedCache.getOrFetch(key, async () => {
      const data = await this.rateLimitedFetch<BirdeyeTopTrader[]>(
        `/defi/v2/token/top_traders?address=${encodeURIComponent(address)}&chain=${chain}&limit=${limit}&time_frame=24h`,
        chain,
      );
      if (!data || !Array.isArray(data)) return [];

      return data.map(t => ({
        address: t.address ?? '',
        buys: t.buys ?? 0,
        sells: t.sells ?? 0,
        volumeUsd: t.volumeUsd ?? 0,
        pnlUsd: t.pnlUsd ?? 0,
        avgHoldTime: t.avgHoldTime ?? 0,
        firstBuyTime: t.firstBuyTime ?? 0,
        winRate: t.winRate ?? 0,
        isBot: t.isBot ?? false,
      }));
    }, SOURCE, CACHE_TTLS.topTraders);
  }

  // ----------------------------------------------------------
  // 2. getTokenPrice
  // ----------------------------------------------------------

  /**
   * Get token price with liquidity check.
   * Endpoint: GET /defi/price
   */
  async getTokenPrice(
    address: string,
    chain: string = 'solana',
  ): Promise<BirdeyeTokenPrice | null> {
    const key = cacheKeyWithChain(SOURCE, 'price', chain, address);
    return unifiedCache.getOrFetch(key, async () => {
      const data = await this.rateLimitedFetch<BirdeyeTokenPrice>(
        `/defi/price?address=${encodeURIComponent(address)}&check_liquidity=true`,
        chain,
      );
      if (!data) return null;

      return {
        value: data.value ?? 0,
        priceChange24h: data.priceChange24h ?? 0,
        volume24h: data.volume24h ?? 0,
        marketCap: data.marketCap ?? 0,
        liquidity: data.liquidity ?? 0,
      };
    }, SOURCE, CACHE_TTLS.price);
  }

  // ----------------------------------------------------------
  // 3. getWalletTransactionHistory
  // ----------------------------------------------------------

  /**
   * Get wallet transaction history.
   * First fetches wallet token list, then transaction list.
   */
  async getWalletTransactionHistory(
    address: string,
    chain: string = 'solana',
    limit: number = 50,
  ): Promise<{ tokens: BirdeyeWalletToken[]; transactions: BirdeyeWalletTx[] }> {
    const key = cacheKeyWithChain(SOURCE, 'walletTx', chain, address);
    return unifiedCache.getOrFetch(key, async () => {
      // Fetch token holdings
      const tokens = await this.getWalletTokenList(address, chain);

      // Fetch transaction history
      const txData = await this.rateLimitedFetch<{ items: BirdeyeWalletTx[]; total: number }>(
        `/v1/wallet/tx_list?wallet=${encodeURIComponent(address)}&limit=${limit}`,
        chain,
      );

      const transactions: BirdeyeWalletTx[] = Array.isArray(txData?.items)
        ? txData.items.map(tx => ({
            txHash: tx.txHash ?? '',
            blockTime: tx.blockTime ?? 0,
            action: tx.action ?? 'UNKNOWN',
            tokenAddress: tx.tokenAddress ?? '',
            tokenSymbol: tx.tokenSymbol,
            fromAddress: tx.fromAddress,
            toAddress: tx.toAddress,
            amountIn: tx.amountIn ?? 0,
            amountOut: tx.amountOut ?? 0,
            valueUsd: tx.valueUsd ?? 0,
            dex: tx.dex,
            source: tx.source,
          }))
        : [];

      return { tokens, transactions };
    }, SOURCE, CACHE_TTLS.walletData);
  }

  // ----------------------------------------------------------
  // 4. getWalletPnL
  // ----------------------------------------------------------

  /**
   * Get wallet PnL data — tokens held with profit/loss.
   * Endpoint: GET /v1/wallet/token_list
   */
  async getWalletPnL(
    address: string,
    chain: string = 'solana',
  ): Promise<BirdeyeWalletToken[]> {
    return this.getWalletTokenList(address, chain);
  }

  // ----------------------------------------------------------
  // 5. getNewListings
  // ----------------------------------------------------------

  /**
   * Get newly listed tokens.
   * Endpoint: GET /defi/v2/token/new_listing
   */
  async getNewListings(
    chain: string = 'solana',
    limit: number = 20,
  ): Promise<BirdeyeNewListing[]> {
    const key = cacheKeyWithChain(SOURCE, 'newListings', chain, `limit:${limit}`);
    return unifiedCache.getOrFetch(key, async () => {
      const data = await this.rateLimitedFetch<BirdeyeNewListing[]>(
        `/defi/v2/token/new_listing?chain=${chain}&limit=${limit}`,
        chain,
      );
      if (!data || !Array.isArray(data)) return [];

      return data.map(t => ({
        address: t.address ?? '',
        symbol: t.symbol ?? '',
        name: t.name ?? '',
        chain: t.chain ?? chain,
        priceUsd: t.priceUsd ?? 0,
        volume24h: t.volume24h ?? 0,
        marketCap: t.marketCap ?? 0,
        liquidity: t.liquidity ?? 0,
        priceChange24h: t.priceChange24h ?? 0,
        createdAt: t.createdAt ?? 0,
      }));
    }, SOURCE, CACHE_TTLS.newListings);
  }

  // ----------------------------------------------------------
  // 6. getTokenOverview
  // ----------------------------------------------------------

  /**
   * Get comprehensive token overview.
   * Endpoint: GET /defi/token_overview
   */
  async getTokenOverview(
    address: string,
    chain: string = 'solana',
  ): Promise<BirdeyeTokenOverview | null> {
    const key = cacheKeyWithChain(SOURCE, 'tokenOverview', chain, address);
    return unifiedCache.getOrFetch(key, async () => {
      const data = await this.rateLimitedFetch<BirdeyeTokenOverview>(
        `/defi/token_overview?address=${encodeURIComponent(address)}&chain=${chain}`,
        chain,
      );
      if (!data) return null;

      return {
        address: data.address ?? address,
        symbol: data.symbol ?? '',
        name: data.name ?? '',
        decimals: data.decimals ?? 0,
        priceUsd: data.priceUsd ?? 0,
        priceChange24h: data.priceChange24h ?? 0,
        volume24h: data.volume24h ?? 0,
        marketCap: data.marketCap ?? 0,
        liquidity: data.liquidity ?? 0,
        holderCount: data.holderCount ?? 0,
        totalSupply: data.totalSupply ?? 0,
        circulatingSupply: data.circulatingSupply ?? 0,
        logoURI: data.logoURI,
        extensions: data.extensions,
      };
    }, SOURCE, CACHE_TTLS.tokenOverview);
  }

  // ----------------------------------------------------------
  // 7. discoverSmartMoneyTraders
  // ----------------------------------------------------------

  /**
   * Discover smart money traders for a token.
   * Uses getTokenTopTraders → filters for smart criteria → gets wallet PnL.
   * Returns classified wallets with smart scores.
   */
  async discoverSmartMoneyTraders(
    tokenAddress: string,
    chain: string = 'solana',
  ): Promise<SmartMoneyTrader[]> {
    const key = cacheKeyWithChain(SOURCE, 'smartMoney', chain, tokenAddress);
    return unifiedCache.getOrFetch(key, async () => {
      const topTraders = await this.getTokenTopTraders(tokenAddress, chain, 50);
      if (!topTraders.length) return [];

      // Filter for smart money candidates: profitable, experienced, non-trivial volume
      const candidates = topTraders.filter(t =>
        t.winRate > 0.5 && t.pnlUsd > 0 && t.volumeUsd > 1000,
      );

      // Fetch wallet PnL for each candidate (sequentially to respect rate limits)
      const results: SmartMoneyTrader[] = [];

      for (const trader of candidates) {
        try {
          const walletTokens = await this.getWalletPnL(trader.address, chain);
          const smartScore = this.calculateSmartScore(trader, walletTokens);

          results.push({
            address: trader.address,
            winRate: trader.winRate,
            pnlUsd: trader.pnlUsd,
            volumeUsd: trader.volumeUsd,
            isBot: trader.isBot,
            avgHoldTime: trader.avgHoldTime,
            smartScore,
            classification: this.classifyTrader(trader, smartScore),
            walletTokens,
          });
        } catch {
          // Skip this trader on error — don't break the whole loop
          results.push({
            address: trader.address,
            winRate: trader.winRate,
            pnlUsd: trader.pnlUsd,
            volumeUsd: trader.volumeUsd,
            isBot: trader.isBot,
            avgHoldTime: trader.avgHoldTime,
            smartScore: this.calculateSmartScore(trader, []),
            classification: this.classifyTrader(trader, this.calculateSmartScore(trader, [])),
            walletTokens: [],
          });
        }
      }

      // Sort by smart score descending
      results.sort((a, b) => b.smartScore - a.smartScore);

      return results;
    }, SOURCE, CACHE_TTLS.smartMoney);
  }

  // ----------------------------------------------------------
  // Backward-compatible methods (existing interface)
  // ----------------------------------------------------------

  /**
   * Get price data for a token (backward-compatible interface).
   * Returns BirdeyePriceData format used by historical-data-extractor and data-ingestion.
   */
  async getPrice(address: string, chain: string = 'solana'): Promise<BirdeyePriceData | null> {
    const price = await this.getTokenPrice(address, chain);
    if (!price) return null;

    // Also try to get overview for symbol/name
    const overview = await this.getTokenOverview(address, chain);

    return {
      address,
      symbol: overview?.symbol ?? '',
      name: overview?.name ?? '',
      price: price.value,
      priceChange24h: price.priceChange24h,
      volume24h: price.volume24h,
      marketCap: price.marketCap,
      liquidity: price.liquidity,
    };
  }

  /**
   * Get wallet transactions (backward-compatible interface).
   * Returns ParsedTransaction[] format.
   */
  async getWalletTransactions(
    address: string,
    limit: number = 50,
    chain: string = 'solana',
  ): Promise<ParsedTransaction[]> {
    const { transactions } = await this.getWalletTransactionHistory(address, chain, limit);

    return transactions.map(tx => ({
      txHash: tx.txHash,
      blockTime: new Date(tx.blockTime * 1000),
      action: this.normalizeAction(tx.action),
      tokenAddress: tx.tokenAddress,
      tokenSymbol: tx.tokenSymbol,
      quoteToken: tx.fromAddress,
      amountIn: tx.amountIn,
      amountOut: tx.amountOut,
      valueUsd: tx.valueUsd,
      dex: tx.dex,
      isFrontrun: false,
      isSandwich: false,
    }));
  }

  /**
   * Get new listings (backward-compatible interface).
   * Returns BirdeyePriceData[] format.
   */
  async getTokenList(
    _sort?: string,
    _sortType?: string,
    _limit?: number,
    chain: string = 'solana',
  ): Promise<BirdeyePriceData[]> {
    const listings = await this.getNewListings(chain, _limit ?? 20);
    return listings.map(t => ({
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      price: t.priceUsd,
      priceChange24h: t.priceChange24h,
      volume24h: t.volume24h,
      marketCap: t.marketCap,
      liquidity: t.liquidity,
    }));
  }

  // ----------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------

  /**
   * Get wallet token list with PnL.
   * Endpoint: GET /v1/wallet/token_list
   */
  private async getWalletTokenList(
    address: string,
    chain: string = 'solana',
  ): Promise<BirdeyeWalletToken[]> {
    const key = cacheKeyWithChain(SOURCE, 'walletTokens', chain, address);
    return unifiedCache.getOrFetch(key, async () => {
      const data = await this.rateLimitedFetch<BirdeyeWalletToken[]>(
        `/v1/wallet/token_list?wallet=${encodeURIComponent(address)}`,
        chain,
      );
      if (!data || !Array.isArray(data)) return [];

      return data.map(t => ({
        address: t.address ?? '',
        symbol: t.symbol ?? '',
        name: t.name ?? '',
        decimals: t.decimals ?? 0,
        balance: t.balance ?? 0,
        valueUsd: t.valueUsd ?? 0,
        pnlUsd: t.pnlUsd,
        pnlPercent: t.pnlPercent,
        priceUsd: t.priceUsd,
      }));
    }, SOURCE, CACHE_TTLS.walletData);
  }

  /**
   * Calculate a smart score (0-100) for a trader.
   * Based on win rate, PnL, volume, and hold time.
   */
  private calculateSmartScore(trader: BirdeyeTopTrader, walletTokens: BirdeyeWalletToken[]): number {
    let score = 0;

    // Win rate component (0-30 points)
    score += Math.min(trader.winRate, 1) * 30;

    // PnL component (0-25 points) — log scale for wide ranges
    if (trader.pnlUsd > 0) {
      score += Math.min(25, Math.log10(trader.pnlUsd + 1) * 5);
    }

    // Volume component (0-20 points) — indicates significance
    if (trader.volumeUsd > 0) {
      score += Math.min(20, Math.log10(trader.volumeUsd + 1) * 4);
    }

    // Hold time component (0-15 points) — longer = more conviction
    if (trader.avgHoldTime > 0) {
      // avgHoldTime in seconds; reward holding > 1 hour
      const holdHours = trader.avgHoldTime / 3600;
      score += Math.min(15, holdHours * 0.5);
    }

    // Bot penalty (-10 points)
    if (trader.isBot) {
      score -= 10;
    }

    // Portfolio diversity bonus (0-10 points) — more tokens = more diversified
    const profitableTokens = walletTokens.filter(t => (t.pnlUsd ?? 0) > 0).length;
    score += Math.min(10, profitableTokens * 2);

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Classify a trader into a category based on behavior and score.
   */
  private classifyTrader(
    trader: BirdeyeTopTrader,
    smartScore: number,
  ): SmartMoneyTrader['classification'] {
    if (trader.isBot) return 'BOT';

    // Whale: very high volume
    if (trader.volumeUsd > 100_000) return 'WHALE';

    // Sniper: very short hold time, high win rate
    if (trader.avgHoldTime < 300 && trader.winRate > 0.7) return 'SNIPER';

    // Smart money: high score and profitable
    if (smartScore >= 60 && trader.winRate > 0.6) return 'SMART_MONEY';

    return 'RETAIL';
  }

  /**
   * Normalize Birdeye action strings to our ParsedTransaction action types.
   */
  private normalizeAction(action: string): ParsedTransaction['action'] {
    const lower = action.toLowerCase();
    if (lower.includes('buy') || lower.includes('swap_in')) return 'BUY';
    if (lower.includes('sell') || lower.includes('swap_out')) return 'SELL';
    if (lower.includes('transfer')) return 'TRANSFER';
    if (lower.includes('add_liquidity') || lower.includes('addliquidity')) return 'ADD_LIQUIDITY';
    if (lower.includes('remove_liquidity') || lower.includes('removeliquidity')) return 'REMOVE_LIQUIDITY';
    if (lower.includes('swap')) return 'SWAP';
    return 'UNKNOWN';
  }

  // ----------------------------------------------------------
  // Utility
  // ----------------------------------------------------------

  /**
   * Check if the Birdeye client is properly configured with an API key.
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Update the API key at runtime (e.g., after user configures it).
   */
  setApiKey(key: string): void {
    this.apiKey = key;
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

export const birdeyeClient = new BirdeyeClient();
