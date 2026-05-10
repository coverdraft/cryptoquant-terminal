/**
 * Shared service instances for API routes
 *
 * Provides singleton clients from universal-data-extractor.ts and birdeye-client.ts
 * so that API route handlers don't need to construct their own
 * cache/client instances on every request.
 */

import {
  DexScreenerClient,
  HeliusClient,
  MoralisClient,
} from './universal-data-extractor';
import { UnifiedCache } from './source-cache';
import { BirdeyeClient } from './birdeye-client';
import { DexPaprikaClient } from './dexpaprika-client';

// Shared cache instance (15-minute TTL)
const sharedCache = new UnifiedCache(15);

/** Shared DexScreener client for API routes */
export const dexScreenerClient = new DexScreenerClient(sharedCache);

/** Shared Helius client for Solana wallet intelligence */
export const heliusClient = new HeliusClient(
  process.env.HELIUS_API_KEY || '',
  sharedCache,
);

/** Shared Moralis client for EVM wallet history */
export const moralisClient = new MoralisClient(
  process.env.MORALIS_API_KEY || '',
  sharedCache,
);

/** Shared Birdeye client for price/OHLCV data */
export const birdeyeClient = new BirdeyeClient(
  process.env.BIRDEYE_API_URL || 'https://public-api.birdeye.so',
  process.env.BIRDEYE_API_KEY,
);

/** Shared DexPaprika client for multi-chain DEX data (FREE, no API key) */
export const dexPaprikaClient = new DexPaprikaClient(sharedCache);

/** Shared cache for routes that need it directly */
export { sharedCache };
