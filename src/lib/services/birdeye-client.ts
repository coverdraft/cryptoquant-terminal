/**
 * Birdeye API Client - STUB (DEPRECATED)
 *
 * Birdeye has been removed from the CryptoQuant Terminal.
 * All OHLCV and price data is now sourced from CoinGecko (free, no API key).
 *
 * This file exists only as a stub to prevent import errors.
 * All methods throw errors indicating Birdeye is no longer available.
 */

// ============================================================
// TYPES (kept for backward compatibility with any remaining imports)
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
// DEFAULT CONFIG (kept for backward compatibility)
// ============================================================

export const DEFAULT_BIRDEYE_CONFIG = {
  birdeyeApiUrl: '',
  birdeyeApiKey: undefined as string | undefined,
};

// ============================================================
// BIRDEYE CLIENT STUB - ALL METHODS THROW
// ============================================================

export class BirdeyeClient {
  constructor(_baseUrl?: string, _apiKey?: string) {
    // Birdeye is no longer available
  }

  async getPrice(_address: string, _chain?: string): Promise<BirdeyePriceData | null> {
    console.warn('[Birdeye] DEPRECATED: Birdeye is no longer available. Use CoinGecko instead.');
    return null;
  }

  async getOHLCV(
    _address: string,
    _timeframe?: string,
    _limit?: number,
    _chain?: string,
  ): Promise<Array<{ unixTime: number; open: number; high: number; low: number; close: number; volume: number }>> {
    console.warn('[Birdeye] DEPRECATED: Birdeye is no longer available. Use CoinGecko instead.');
    return [];
  }

  async getTokenList(
    _sort?: string,
    _sortType?: string,
    _limit?: number,
    _chain?: string,
  ): Promise<BirdeyePriceData[]> {
    console.warn('[Birdeye] DEPRECATED: Birdeye is no longer available. Use CoinGecko instead.');
    return [];
  }

  async getWalletTransactions(
    _address: string,
    _limit?: number,
    _chain?: string,
  ): Promise<ParsedTransaction[]> {
    console.warn('[Birdeye] DEPRECATED: Birdeye is no longer available. Use Solana RPC instead.');
    return [];
  }

  async getNewListings(
    _limit?: number,
    _chain?: string,
  ): Promise<BirdeyePriceData[]> {
    console.warn('[Birdeye] DEPRECATED: Birdeye is no longer available. Use CoinGecko trending instead.');
    return [];
  }
}
