/**
 * Birdeye API Client - Price feeds and OHLCV data
 *
 * Extracted from the legacy data-ingestion module for use by ohlcv-pipeline.ts
 * and other consumers that need Birdeye-specific functionality.
 *
 * Data sources:
 * - Price data (current + 24h change)
 * - OHLCV candles (multi-timeframe)
 * - Token lists (by volume, market cap)
 * - Wallet transactions
 * - New token listings
 */

// ============================================================
// TYPES
// ============================================================

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

export interface WalletTransactionHistory {
  address: string;
  chain: string;
  transactions: ParsedTransaction[];
  totalCount: number;
  hasMore: boolean;
}

// ============================================================
// DEFAULT CONFIG (Birdeye-specific)
// ============================================================

export const DEFAULT_BIRDEYE_CONFIG = {
  birdeyeApiUrl: process.env.BIRDEYE_API_URL || 'https://public-api.birdeye.so',
  birdeyeApiKey: process.env.BIRDEYE_API_KEY,
};

// ============================================================
// BIRDEYE CLIENT
// ============================================================

export class BirdeyeClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl = DEFAULT_BIRDEYE_CONFIG.birdeyeApiUrl, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/json',
    };
    if (this.apiKey) {
      headers['X-API-KEY'] = this.apiKey;
      headers['x-chain'] = 'solana';
    }
    return headers;
  }

  /**
   * Get current price for a token
   */
  async getPrice(address: string, chain = 'solana'): Promise<BirdeyePriceData | null> {
    try {
      const res = await fetch(
        `${this.baseUrl}/defi/price?address=${address}&check_liquidity=true`,
        { headers: { ...this.getHeaders(), 'x-chain': chain } }
      );
      if (!res.ok) throw new Error(`Birdeye price failed: ${res.status}`);
      const data = await res.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Birdeye price error:', error);
      return null;
    }
  }

  /**
   * Get OHLCV data for a token
   */
  async getOHLCV(
    address: string,
    timeframe: '1m' | '3m' | '5m' | '15m' | '30m' | '1H' | '4H' | '1D' = '1H',
    limit = 100,
    chain = 'solana'
  ): Promise<Array<{ unixTime: number; open: number; high: number; low: number; close: number; volume: number }>> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const timeframeSeconds: Record<string, number> = {
        '1m': 60, '3m': 180, '5m': 300, '15m': 900,
        '30m': 1800, '1H': 3600, '4H': 14400, '1D': 86400,
      };
      const timeFrom = now - (limit * (timeframeSeconds[timeframe] || 3600));

      const res = await fetch(
        `${this.baseUrl}/defi/ohlcv?address=${address}&type=${timeframe}&time_from=${timeFrom}&time_to=${now}`,
        { headers: { ...this.getHeaders(), 'x-chain': chain } }
      );
      if (!res.ok) throw new Error(`Birdeye OHLCV failed: ${res.status}`);
      const data = await res.json();
      return data.success ? data.data?.items || [] : [];
    } catch (error) {
      console.error('Birdeye OHLCV error:', error);
      return [];
    }
  }

  /**
   * Get token list by market cap
   */
  async getTokenList(
    sort = 'v24hUSD',
    sortType = 'desc',
    limit = 50,
    chain = 'solana'
  ): Promise<BirdeyePriceData[]> {
    try {
      const res = await fetch(
        `${this.baseUrl}/defi/tokenlist?sort_by=${sort}&sort_type=${sortType}&limit=${limit}&offset=0`,
        { headers: { ...this.getHeaders(), 'x-chain': chain } }
      );
      if (!res.ok) throw new Error(`Birdeye tokenlist failed: ${res.status}`);
      const data = await res.json();
      return data.success ? data.data?.tokens || [] : [];
    } catch (error) {
      console.error('Birdeye tokenlist error:', error);
      return [];
    }
  }

  /**
   * Get transaction history for a wallet
   */
  async getWalletTransactions(
    address: string,
    limit = 50,
    chain = 'solana'
  ): Promise<ParsedTransaction[]> {
    try {
      const res = await fetch(
        `${this.baseUrl}/defi/wallet/token_list?wallet=${address}`,
        { headers: { ...this.getHeaders(), 'x-chain': chain } }
      );
      if (!res.ok) throw new Error(`Birdeye wallet failed: ${res.status}`);
      const data = await res.json();
      // Parse Birdeye response into our format
      if (!data.success || !data.data) return [];

      return (data.data.items || []).map((item: Record<string, unknown>) => ({
        txHash: (item.signature as string) || '',
        blockTime: new Date((item.blockTime as number) || Date.now()),
        action: 'SWAP' as const,
        tokenAddress: (item.address as string) || '',
        amountIn: Number(item.amountIn || 0),
        amountOut: Number(item.amountOut || 0),
        valueUsd: Number(item.valueUsd || 0),
        isFrontrun: false,
        isSandwich: false,
      }));
    } catch (error) {
      console.error('Birdeye wallet transactions error:', error);
      return [];
    }
  }

  /**
   * Get new token listings
   */
  async getNewListings(
    limit = 20,
    chain = 'solana'
  ): Promise<BirdeyePriceData[]> {
    try {
      const res = await fetch(
        `${this.baseUrl}/defi/token_new_listing?limit=${limit}`,
        { headers: { ...this.getHeaders(), 'x-chain': chain } }
      );
      if (!res.ok) throw new Error(`Birdeye new listings failed: ${res.status}`);
      const data = await res.json();
      return data.success ? data.data || [] : [];
    } catch (error) {
      console.error('Birdeye new listings error:', error);
      return [];
    }
  }
}
