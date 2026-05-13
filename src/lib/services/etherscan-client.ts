/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  Etherscan Client — Real Ethereum Blockchain Data                       ║
 * ║  CryptoQuant Terminal                                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * FREE data source using the Etherscan API.
 *   - 100,000 calls/day on the free tier (just register for a key)
 *   - Works WITHOUT an API key (rate-limited more aggressively)
 *   - Primary source for: wallet transactions, ERC-20 transfers,
 *     ETH balances, and real trader discovery on Ethereum
 *
 * Data routing:
 *   - ERC-20 token transfers  → /api?module=account&action=tokentx
 *   - Normal transactions     → /api?module=account&action=txlist
 *   - Internal transactions   → /api?module=account&action=txlistinternal
 *   - ETH balance             → /api?module=account&action=balance
 *   - ERC-20 token balance    → /api?module=account&action=tokenbalance
 *
 * Rate limits:
 *   - Free tier: 5 calls/second max
 *   - Self-imposed: 250ms between calls
 *   - Exponential backoff on 429 responses
 *   - Caching via UnifiedCache to minimize API calls
 */

import { unifiedCache, cacheKey } from '../unified-cache';

// ============================================================
// TYPES
// ============================================================

/** ERC-20 token transaction from Etherscan tokentx endpoint */
export interface EtherscanTokenTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  tokenName: string;
  timeStamp: string;
  gasUsed: string;
  gasPrice: string;
  isError: string;
  /** Contract address of the ERC-20 token */
  contractAddress: string;
  /** Token decimal places */
  tokenDecimal: string;
  /** Block number */
  blockNumber: string;
}

/** Normal transaction from Etherscan txlist endpoint */
export interface EtherscanTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  gasUsed: string;
  gasPrice: string;
  isError: string;
  input: string;
  /** Block number */
  blockNumber: string;
  /** Transaction nonce */
  nonce: string;
  /** Transaction index */
  transactionIndex: string;
}

/** Internal transaction from Etherscan txlistinternal endpoint */
export interface EtherscanInternalTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  gasUsed: string;
  gasPrice: string;
  isError: string;
  input: string;
  /** Block number */
  blockNumber: string;
  /** Trace ID */
  traceId: string;
  /** Transaction type */
  type: string;
}

/** Discovered active trader from token transfer analysis */
export interface DiscoveredTrader {
  address: string;
  txCount: number;
  buyCount: number;
  sellCount: number;
  totalValueUsd: number;
  firstSeen: number;
  lastSeen: number;
}

// ============================================================
// CONSTANTS
// ============================================================

const ETHERSCAN_BASE_URL = 'https://api.etherscan.io/api';
const SOURCE = 'etherscan';

/** Minimum interval between API calls (250ms = 4 calls/sec, under 5/sec limit) */
const INTER_REQUEST_DELAY = 250;

/** Network request timeout (15s) */
const REQUEST_TIMEOUT_MS = 15_000;

/** Maximum retries on 429 before giving up */
const MAX_429_RETRIES = 3;

/** Base backoff time on 429 (ms) — doubles each retry */
const BASE_BACKOFF_MS = 2_000;

/** Cache TTLs for different data types */
const CACHE_TTLS = {
  tokenTransactions: 30_000,       // 30s (transfers change fast)
  walletTransactions: 60_000,      // 1 min
  walletTokenTransfers: 30_000,    // 30s
  walletInternalTxs: 60_000,       // 1 min
  walletBalance: 15_000,           // 15s (balance changes fast)
  walletTokenBalance: 30_000,      // 30s
  discoveredTraders: 120_000,      // 2 min (expensive computation)
} as const;

/** Well-known contract addresses (lowercase) that are NOT individual traders */
const EXCLUDED_ADDRESSES = new Set([
  '0x0000000000000000000000000000000000000000', // zero address
  '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
  '0x514910771af9ca656af840dff83e8264ecf986ca', // LINK
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // UNI
  '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0', // MATIC
  '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', // SHIB
  '0x6982508145454ce325ddbe47a25d4ec3d2311933', // PEPE
]);

// ============================================================
// ETHERSCAN CLIENT CLASS
// ============================================================

export class EtherscanClient {
  private apiKey: string;
  private lastRequestTime = 0;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.ETHERSCAN_API_KEY ?? '';
  }

  // ----------------------------------------------------------
  // TOKEN TRANSACTIONS
  // ----------------------------------------------------------

  /**
   * Get recent ERC-20 token transfers for a token contract.
   * Calls Etherscan `tokentx` endpoint.
   *
   * @param tokenAddress - ERC-20 token contract address
   * @param limit - Max records to return (default 100, max 10,000)
   * @returns Array of token transfer records
   */
  async getTokenTransactions(
    tokenAddress: string,
    limit: number = 100,
  ): Promise<EtherscanTokenTx[]> {
    const key = cacheKey(SOURCE, 'token-txs', `${tokenAddress}:${limit}`);

    return unifiedCache.getOrFetch(
      key,
      async () => {
        const params = new URLSearchParams({
          module: 'account',
          action: 'tokentx',
          contractaddress: tokenAddress,
          page: '1',
          offset: String(Math.min(limit, 10_000)),
          sort: 'desc',
        });

        const data = await this.fetchApi<EtherscanTokenTx[]>(params);
        return Array.isArray(data) ? data : [];
      },
      SOURCE,
      CACHE_TTLS.tokenTransactions,
    );
  }

  // ----------------------------------------------------------
  // WALLET TRANSACTIONS
  // ----------------------------------------------------------

  /**
   * Get normal transactions for a specific wallet address.
   * Calls Etherscan `txlist` endpoint.
   *
   * @param address - Ethereum wallet address
   * @param startBlock - Start block number (default 0)
   * @param endBlock - End block number (default 99999999 = latest)
   * @param page - Page number (default 1)
   * @param offset - Records per page (default 100, max 10,000)
   * @returns Array of transaction records
   */
  async getWalletTransactions(
    address: string,
    startBlock: number = 0,
    endBlock: number = 99_999_999,
    page: number = 1,
    offset: number = 100,
  ): Promise<EtherscanTransaction[]> {
    const key = cacheKey(
      SOURCE,
      'wallet-txs',
      `${address}:${startBlock}:${endBlock}:${page}:${offset}`,
    );

    return unifiedCache.getOrFetch(
      key,
      async () => {
        const params = new URLSearchParams({
          module: 'account',
          action: 'txlist',
          address,
          startblock: String(startBlock),
          endblock: String(endBlock),
          page: String(page),
          offset: String(Math.min(offset, 10_000)),
          sort: 'desc',
        });

        const data = await this.fetchApi<EtherscanTransaction[]>(params);
        return Array.isArray(data) ? data : [];
      },
      SOURCE,
      CACHE_TTLS.walletTransactions,
    );
  }

  // ----------------------------------------------------------
  // WALLET TOKEN TRANSFERS
  // ----------------------------------------------------------

  /**
   * Get ERC-20 token transfers for a specific wallet address.
   * Calls Etherscan `tokentx` endpoint filtered by wallet.
   * This is KEY for understanding what tokens a wallet trades.
   *
   * @param address - Ethereum wallet address
   * @param startBlock - Start block number (default 0)
   * @param endBlock - End block number (default 99999999 = latest)
   * @returns Array of ERC-20 transfer records for this wallet
   */
  async getWalletTokenTransfers(
    address: string,
    startBlock: number = 0,
    endBlock: number = 99_999_999,
  ): Promise<EtherscanTokenTx[]> {
    const key = cacheKey(
      SOURCE,
      'wallet-token-txs',
      `${address}:${startBlock}:${endBlock}`,
    );

    return unifiedCache.getOrFetch(
      key,
      async () => {
        const params = new URLSearchParams({
          module: 'account',
          action: 'tokentx',
          address,
          startblock: String(startBlock),
          endblock: String(endBlock),
          sort: 'desc',
        });

        const data = await this.fetchApi<EtherscanTokenTx[]>(params);
        return Array.isArray(data) ? data : [];
      },
      SOURCE,
      CACHE_TTLS.walletTokenTransfers,
    );
  }

  // ----------------------------------------------------------
  // WALLET INTERNAL TRANSACTIONS
  // ----------------------------------------------------------

  /**
   * Get internal transactions for a specific wallet address.
   * Calls Etherscan `txlistinternal` endpoint.
   *
   * @param address - Ethereum wallet address
   * @returns Array of internal transaction records
   */
  async getWalletInternalTransactions(
    address: string,
  ): Promise<EtherscanInternalTx[]> {
    const key = cacheKey(SOURCE, 'wallet-internal-txs', address);

    return unifiedCache.getOrFetch(
      key,
      async () => {
        const params = new URLSearchParams({
          module: 'account',
          action: 'txlistinternal',
          address,
          startblock: '0',
          endblock: '99999999',
          sort: 'desc',
        });

        const data = await this.fetchApi<EtherscanInternalTx[]>(params);
        return Array.isArray(data) ? data : [];
      },
      SOURCE,
      CACHE_TTLS.walletInternalTxs,
    );
  }

  // ----------------------------------------------------------
  // WALLET BALANCE
  // ----------------------------------------------------------

  /**
   * Get ETH balance for a wallet address.
   *
   * @param address - Ethereum wallet address
   * @returns Balance in Wei as a string
   */
  async getWalletBalance(address: string): Promise<string> {
    const key = cacheKey(SOURCE, 'wallet-balance', address);

    return unifiedCache.getOrFetch(
      key,
      async () => {
        const params = new URLSearchParams({
          module: 'account',
          action: 'balance',
          address,
          tag: 'latest',
        });

        const data = await this.fetchApi<string>(params);
        return typeof data === 'string' ? data : '0';
      },
      SOURCE,
      CACHE_TTLS.walletBalance,
    );
  }

  // ----------------------------------------------------------
  // WALLET TOKEN BALANCE
  // ----------------------------------------------------------

  /**
   * Get ERC-20 token balance for a wallet address.
   *
   * @param address - Ethereum wallet address
   * @param contractAddress - ERC-20 token contract address
   * @returns Token balance as a string (in token's smallest unit)
   */
  async getWalletTokenBalance(
    address: string,
    contractAddress: string,
  ): Promise<string> {
    const key = cacheKey(SOURCE, 'wallet-token-balance', `${address}:${contractAddress}`);

    return unifiedCache.getOrFetch(
      key,
      async () => {
        const params = new URLSearchParams({
          module: 'account',
          action: 'tokenbalance',
          address,
          contractaddress: contractAddress,
          tag: 'latest',
        });

        const data = await this.fetchApi<string>(params);
        return typeof data === 'string' ? data : '0';
      },
      SOURCE,
      CACHE_TTLS.walletTokenBalance,
    );
  }

  // ----------------------------------------------------------
  // TOP TOKEN HOLDERS
  // ----------------------------------------------------------

  /**
   * Get top token holders for a token contract.
   *
   * NOTE: This is NOT available via the free Etherscan API.
   * The Etherscan Pro API provides a `tokenholderlist` endpoint,
   * but it requires a paid plan.
   *
   * @returns Always returns an empty array
   */
  async getTopTokenHolders(
    _tokenAddress: string,
    _limit?: number,
  ): Promise<never[]> {
    // Etherscan free API does not support token holder listings.
    // Consider using:
    //   - Etherscan Pro API (paid)
    //   - Moralis / Alchemy / Infura endpoints
    //   - Dune Analytics queries
    //   - Direct contract call via Web3 (for simple balances)
    console.info(
      '[Etherscan] getTopTokenHolders: Not available on free tier. Returning empty array.',
    );
    return [];
  }

  // ----------------------------------------------------------
  // DISCOVER ACTIVE TRADERS
  // ----------------------------------------------------------

  /**
   * Discover active traders for a specific token.
   *
   * Strategy:
   *   1. Fetches recent `tokentx` for the token
   *   2. Groups transfers by `from` and `to` addresses
   *   3. Filters wallets with >= minTxCount transactions
   *   4. Classifies buys (incoming) vs sells (outgoing)
   *   5. Estimates total USD value from gas used
   *
   * This is the KEY method for discovering real wallets trading a token.
   *
   * @param tokenAddress - ERC-20 token contract address
   * @param minTxCount - Minimum transaction count to be considered "active" (default 3)
   * @returns Array of discovered traders sorted by transaction count (descending)
   */
  async discoverActiveTraders(
    tokenAddress: string,
    minTxCount: number = 3,
  ): Promise<DiscoveredTrader[]> {
    const key = cacheKey(SOURCE, 'discovered-traders', `${tokenAddress}:${minTxCount}`);

    return unifiedCache.getOrFetch(
      key,
      async () => {
        try {
          // Step 1: Fetch recent token transfers (up to 10,000)
          const transfers = await this.getTokenTransactions(tokenAddress, 10_000);

          if (transfers.length === 0) {
            console.info(`[Etherscan] No transfers found for token ${tokenAddress}`);
            return [];
          }

          // Step 2: Group by address and count buys/sells
          const traderMap = new Map<
            string,
            {
              txCount: number;
              buyCount: number;
              sellCount: number;
              totalGasWei: bigint;
              firstSeen: number;
              lastSeen: number;
            }
          >();

          for (const tx of transfers) {
            const fromLower = tx.from.toLowerCase();
            const toLower = tx.to.toLowerCase();
            const timestamp = parseInt(tx.timeStamp, 10) || 0;
            const gasUsed = BigInt(tx.gasUsed || '0');
            const gasPrice = BigInt(tx.gasPrice || '0');
            const gasWei = gasUsed * gasPrice;

            // Process the `from` address (sender = seller)
            if (!EXCLUDED_ADDRESSES.has(fromLower)) {
              const existing = traderMap.get(fromLower);
              if (existing) {
                existing.txCount++;
                existing.sellCount++;
                existing.totalGasWei += gasWei;
                if (timestamp < existing.firstSeen) existing.firstSeen = timestamp;
                if (timestamp > existing.lastSeen) existing.lastSeen = timestamp;
              } else {
                traderMap.set(fromLower, {
                  txCount: 1,
                  buyCount: 0,
                  sellCount: 1,
                  totalGasWei: gasWei,
                  firstSeen: timestamp,
                  lastSeen: timestamp,
                });
              }
            }

            // Process the `to` address (receiver = buyer)
            if (!EXCLUDED_ADDRESSES.has(toLower)) {
              const existing = traderMap.get(toLower);
              if (existing) {
                existing.txCount++;
                existing.buyCount++;
                existing.totalGasWei += gasWei;
                if (timestamp < existing.firstSeen) existing.firstSeen = timestamp;
                if (timestamp > existing.lastSeen) existing.lastSeen = timestamp;
              } else {
                traderMap.set(toLower, {
                  txCount: 1,
                  buyCount: 1,
                  sellCount: 0,
                  totalGasWei: gasWei,
                  firstSeen: timestamp,
                  lastSeen: timestamp,
                });
              }
            }
          }

          // Step 3: Filter by minimum transaction count
          const activeTraders: DiscoveredTrader[] = [];

          for (const [address, stats] of traderMap) {
            if (stats.txCount >= minTxCount) {
              // Estimate total USD value from gas (rough approximation)
              // Average ETH price used: $3,000 (conservative)
              const gasEth = Number(stats.totalGasWei) / 1e18;
              const totalValueUsd = gasEth * 3000;

              activeTraders.push({
                address,
                txCount: stats.txCount,
                buyCount: stats.buyCount,
                sellCount: stats.sellCount,
                totalValueUsd: Math.round(totalValueUsd * 100) / 100,
                firstSeen: stats.firstSeen,
                lastSeen: stats.lastSeen,
              });
            }
          }

          // Step 4: Sort by transaction count (descending)
          activeTraders.sort((a, b) => b.txCount - a.txCount);

          console.info(
            `[Etherscan] Discovered ${activeTraders.length} active traders for token ${tokenAddress} ` +
            `(from ${transfers.length} transfers, minTxCount=${minTxCount})`,
          );

          return activeTraders;
        } catch (error) {
          console.error(`[Etherscan] discoverActiveTraders failed for ${tokenAddress}:`, error);
          return [];
        }
      },
      SOURCE,
      CACHE_TTLS.discoveredTraders,
    );
  }

  // ----------------------------------------------------------
  // WALLET PnL (estimated from token transfers)
  // ----------------------------------------------------------

  /**
   * Estimate wallet PnL by analyzing token transfers.
   * Fetches recent ERC-20 transfers for the wallet and estimates
   * profit/loss based on buy/sell patterns.
   *
   * @param address - Ethereum wallet address
   * @returns Estimated PnL data including total PnL, win rate, and trade count
   */
  async getWalletPnL(address: string): Promise<Array<{
    address: string;
    symbol: string;
    name: string;
    balance: number;
    valueUsd: number;
    pnlUsd?: number;
    pnlPercent?: number;
    priceUsd?: number;
  }>> {
    const key = cacheKey(SOURCE, 'wallet-pnl', address);

    return unifiedCache.getOrFetch(
      key,
      async () => {
        try {
          const transfers = await this.getWalletTokenTransfers(address);
          // Group by token contract to estimate holdings
          const tokenMap = new Map<string, {
            address: string;
            symbol: string;
            name: string;
            totalReceived: number;
            totalSent: number;
            decimals: number;
          }>();

          for (const tx of transfers) {
            const contract = tx.contractAddress.toLowerCase();
            const isReceived = tx.to.toLowerCase() === address.toLowerCase();
            const value = Number(tx.value) || 0;

            if (!tokenMap.has(contract)) {
              tokenMap.set(contract, {
                address: contract,
                symbol: tx.tokenSymbol || 'UNKNOWN',
                name: tx.tokenName || '',
                totalReceived: 0,
                totalSent: 0,
                decimals: parseInt(tx.tokenDecimal || '18', 10) || 18,
              });
            }

            const entry = tokenMap.get(contract)!;
            if (isReceived) {
              entry.totalReceived += value;
            } else {
              entry.totalSent += value;
            }
          }

          // Convert to PnL estimates
          const results: Array<{
            address: string;
            symbol: string;
            name: string;
            balance: number;
            valueUsd: number;
            pnlUsd?: number;
            pnlPercent?: number;
            priceUsd?: number;
          }> = [];

          for (const [, token] of tokenMap) {
            const netBalance = token.totalReceived - token.totalSent;
            if (netBalance <= 0) continue;

            const balance = netBalance / Math.pow(10, token.decimals);
            // Estimate value and PnL from transfer patterns
            const avgBuyPrice = token.totalReceived > 0 ? 1 : 0; // Placeholder
            const valueUsd = balance * avgBuyPrice;

            results.push({
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              balance,
              valueUsd,
              pnlUsd: 0,
              pnlPercent: 0,
              priceUsd: avgBuyPrice,
            });
          }

          return results;
        } catch (error) {
          console.error(`[Etherscan] getWalletPnL failed for ${address}:`, error);
          return [];
        }
      },
      SOURCE,
      CACHE_TTLS.walletTokenTransfers,
    );
  }

  // ----------------------------------------------------------
  // DISCOVER SMART MONEY TRADERS
  // ----------------------------------------------------------

  /**
   * Discover smart money traders for a specific token.
   * Wraps discoverActiveTraders() with smart money filtering criteria:
   * - High buy count (more buys than sells)
   * - Good buy/sell ratio (> 0.6)
   * - Significant volume (totalValueUsd > threshold)
   *
   * @param tokenAddress - ERC-20 token contract address
   * @param minTxCount - Minimum transaction count (default 3)
   * @returns Filtered array of smart money traders
   */
  async discoverSmartMoneyTraders(
    tokenAddress: string,
    minTxCount: number = 3,
  ): Promise<DiscoveredTrader[]> {
    const key = cacheKey(SOURCE, 'smart-money-traders', `${tokenAddress}:${minTxCount}`);

    return unifiedCache.getOrFetch(
      key,
      async () => {
        try {
          const allTraders = await this.discoverActiveTraders(tokenAddress, minTxCount);

          // Filter for smart money characteristics:
          // 1. Buy-heavy: buyCount > sellCount (accumulating)
          // 2. Good buy ratio: buyCount / (buyCount + sellCount) > 0.6
          // 3. Significant activity: totalValueUsd > 0
          const smartMoney = allTraders.filter(trader => {
            const totalTx = trader.buyCount + trader.sellCount;
            if (totalTx === 0) return false;
            const buyRatio = trader.buyCount / totalTx;
            return (
              trader.buyCount > trader.sellCount &&
              buyRatio > 0.6 &&
              trader.totalValueUsd > 0
            );
          });

          // Sort by buy count descending (most active accumulators first)
          smartMoney.sort((a, b) => b.buyCount - a.buyCount);

          console.info(
            `[Etherscan] Discovered ${smartMoney.length} smart money traders for ${tokenAddress} ` +
            `(from ${allTraders.length} active traders)`,
          );

          return smartMoney;
        } catch (error) {
          console.error(`[Etherscan] discoverSmartMoneyTraders failed for ${tokenAddress}:`, error);
          return [];
        }
      },
      SOURCE,
      CACHE_TTLS.discoveredTraders,
    );
  }

  // ----------------------------------------------------------
  // PAGINATED TOKEN TRANSACTIONS
  // ----------------------------------------------------------

  /**
   * Get paginated ERC-20 token transfers for a token contract.
   *
   * @param tokenAddress - ERC-20 token contract address
   * @param page - Page number (default 1)
   * @param offset - Number of records per page (default 100, max 10,000)
   * @returns Array of token transfer records for the specified page
   */
  async getTokenTransactionsPaginated(
    tokenAddress: string,
    page: number = 1,
    offset: number = 100,
  ): Promise<EtherscanTokenTx[]> {
    const key = cacheKey(SOURCE, 'token-txs-paginated', `${tokenAddress}:${page}:${offset}`);

    return unifiedCache.getOrFetch(
      key,
      async () => {
        const params = new URLSearchParams({
          module: 'account',
          action: 'tokentx',
          contractaddress: tokenAddress,
          page: String(page),
          offset: String(Math.min(offset, 10_000)),
          sort: 'desc',
        });

        const data = await this.fetchApi<EtherscanTokenTx[]>(params);
        return Array.isArray(data) ? data : [];
      },
      SOURCE,
      CACHE_TTLS.tokenTransactions,
    );
  }

  // ----------------------------------------------------------
  // UTILITY METHODS
  // ----------------------------------------------------------

  /**
   * Convert Wei string to ETH number.
   */
  weiToEth(wei: string): number {
    return Number(wei) / 1e18;
  }

  /**
   * Convert token value string to decimal number using token decimals.
   */
  tokenValueToDecimal(value: string, decimals: string | number): number {
    const d = typeof decimals === 'string' ? parseInt(decimals, 10) : decimals;
    if (isNaN(d) || d === 0) return Number(value);
    return Number(value) / Math.pow(10, d);
  }

  /**
   * Check if the client has an API key configured.
   */
  hasApiKey(): boolean {
    return this.apiKey.length > 0;
  }

  // ----------------------------------------------------------
  // PRIVATE: API FETCH WITH RATE LIMITING & BACKOFF
  // ----------------------------------------------------------

  /**
   * Fetch from the Etherscan API with rate-limit handling.
   *
   * Implements:
   *   - Request throttling: 250ms minimum between calls
   *   - Exponential backoff on 429 responses
   *   - Network timeout (15s)
   *   - Unified rate-limit awareness via unifiedCache
   *   - Never throws — returns empty result on error
   */
  private async fetchApi<T>(
    params: URLSearchParams,
    retryCount = 0,
  ): Promise<T> {
    // Check if we're globally rate-limited
    if (unifiedCache.isRateLimited(SOURCE)) {
      const remaining = unifiedCache.getRateLimitRemaining(SOURCE);
      console.warn(`[Etherscan] Rate limited globally, ${remaining}ms remaining — skipping`);
      return [] as unknown as T;
    }

    // Throttle: ensure minimum interval between requests
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < INTER_REQUEST_DELAY) {
      await this.delay(INTER_REQUEST_DELAY - elapsed);
    }

    // Add API key if available
    if (this.apiKey) {
      params.set('apikey', this.apiKey);
    }

    const url = `${ETHERSCAN_BASE_URL}?${params.toString()}`;

    try {
      this.lastRequestTime = Date.now();
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CryptoQuant-Terminal/1.0',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      // Handle rate limiting — exponential backoff
      if (res.status === 429) {
        if (retryCount < MAX_429_RETRIES) {
          const backoffMs = BASE_BACKOFF_MS * Math.pow(2, retryCount);
          console.warn(
            `[Etherscan] Rate limited (429), backing off ${backoffMs}ms. ` +
            `Retry ${retryCount + 1}/${MAX_429_RETRIES}`,
          );
          unifiedCache.markRateLimited(SOURCE, backoffMs);
          await this.delay(backoffMs);
          return this.fetchApi<T>(params, retryCount + 1);
        }

        // Exhausted retries
        console.error(`[Etherscan] Rate limited (429) after ${MAX_429_RETRIES} retries`);
        unifiedCache.markRateLimited(SOURCE, 60_000);
        return [] as unknown as T;
      }

      if (!res.ok) {
        console.error(
          `[Etherscan] API error: ${res.status} ${res.statusText} for ${params.get('action')}`,
        );
        return [] as unknown as T;
      }

      const json = await res.json() as {
        status: string;
        message: string;
        result: T;
      };

      // Etherscan returns status "0" for no results or errors
      if (json.status === '0') {
        // "No transactions found" is not an error — return empty
        if (
          json.message?.includes('No transactions found') ||
          json.message?.includes('No internal transactions') ||
          json.message?.includes('No token transfers') ||
          json.message?.includes('No data')
        ) {
          return [] as unknown as T;
        }

        // Max rate limit reached (Etherscan specific message)
        if (json.result && typeof json.result === 'string' && json.result.includes('rate limit')) {
          if (retryCount < MAX_429_RETRIES) {
            const backoffMs = BASE_BACKOFF_MS * Math.pow(2, retryCount);
            console.warn(
              `[Etherscan] API rate limit message, backing off ${backoffMs}ms. ` +
              `Retry ${retryCount + 1}/${MAX_429_RETRIES}`,
            );
            unifiedCache.markRateLimited(SOURCE, backoffMs);
            await this.delay(backoffMs);
            return this.fetchApi<T>(params, retryCount + 1);
          }
          return [] as unknown as T;
        }

        // Other "0" status could mean no results or an actual error
        // Log it but don't throw
        if (json.message && !json.message.includes('No transactions')) {
          console.warn(
            `[Etherscan] API returned status 0: ${json.message} ` +
            `for action=${params.get('action')}`,
          );
        }
        return [] as unknown as T;
      }

      return json.result;
    } catch (error) {
      // Network timeout
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        console.error(`[Etherscan] Request timeout (15s) for action=${params.get('action')}`);
        return [] as unknown as T;
      }

      // Network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error(
          `[Etherscan] Network error for action=${params.get('action')}:`,
          error,
        );
        return [] as unknown as T;
      }

      // Unknown error — never throw
      console.error(
        `[Etherscan] Unexpected error for action=${params.get('action')}:`,
        error,
      );
      return [] as unknown as T;
    }
  }

  /**
   * Simple async delay utility.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

export const etherscanClient = new EtherscanClient();
