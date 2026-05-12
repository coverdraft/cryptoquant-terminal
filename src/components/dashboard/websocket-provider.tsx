'use client';

import { useCryptoStore, type TokenData, type SignalData, type SmartMoneyAlert, type BotAlert, type TraderStats, type MarketSummary } from '@/store/crypto-store';
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { queuedFetch } from '@/lib/request-queue';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3003';
const SOCKET_CONNECTION_TIMEOUT = 10000; // 10s fallback threshold
const REST_POLL_INTERVAL = 30000; // Fallback polling every 30s
const REST_TOKEN_LIMIT = 500; // Load up to 500 tokens via REST (vs 50 before)
let autoSeedTriggered = false;

/**
 * Map a WS-server token object to the store's TokenData shape.
 * The WS server uses `price` while the store expects `priceUsd`.
 */
function mapWsToken(t: any): TokenData {
  return {
    id: t.id || t.address || t.symbol,
    address: t.address || t.id,
    symbol: t.symbol,
    name: t.name,
    chain: t.chain,
    priceUsd: t.price ?? t.priceUsd ?? 0,
    volume24h: t.volume24h ?? 0,
    liquidity: t.liquidity ?? 0,
    marketCap: t.marketCap ?? 0,
    priceChange5m: t.priceChange5m ?? 0,
    priceChange15m: t.priceChange15m ?? 0,
    priceChange1h: t.priceChange1h ?? 0,
    priceChange24h: t.priceChange24h ?? 0,
    riskScore: t.riskScore ?? 50,
    priceHistory: t.priceHistory,
  } as TokenData;
}

/**
 * WebSocketProvider - Connects to the Socket.IO WS server for real-time data.
 * Falls back to REST polling if the connection fails after 10 seconds.
 */
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const {
    setTokens,
    updateToken,
    addSignal,
    addSmartMoneyAlert,
    addBotAlert,
    setTraderStats,
    setMarketSummary,
    setConnected,
  } = useCryptoStore();

  const socketRef = useRef<Socket | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUsingWsRef = useRef(false);
  const dataLoadedRef = useRef(false);

  // ─── REST fallback loader ────────────────────────────────────────
  const loadViaRest = useCallback(async () => {
    try {
      const tokensRes = await queuedFetch(`/api/tokens?limit=${REST_TOKEN_LIMIT}`);
      const tokensData = await tokensRes.json();

      if (tokensData.tokens && tokensData.tokens.length > 0) {
        setTokens(
          tokensData.tokens.map((t: any) => ({
            ...t,
            id: t.id || t.address,
            address: t.address || t.id,
            priceChange5m: t.priceChange5m || 0,
            priceChange15m: t.priceChange15m || 0,
            priceHistory: Array.from({ length: 20 }, () =>
              t.priceUsd * (1 + (Math.random() - 0.5) * 0.1)
            ),
            riskScore: t.dna?.riskScore ?? 50,
          }))
        );
        console.log(`[WSProvider] Loaded ${tokensData.tokens.length} tokens from REST API`);
      } else {
        console.warn('[WSProvider] No tokens found in database - triggering brain init to seed data');
        // Auto-seed: trigger the brain init endpoint once to populate the DB
        if (!autoSeedTriggered) {
          autoSeedTriggered = true;
          fetch('/api/brain/init').catch(() => {});
        }
      }

      try {
        const summaryRes = await queuedFetch('/api/market/summary');
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          if (summaryData.data && summaryData.data.btcPrice > 0) {
            setMarketSummary({
              btcPrice: summaryData.data.btcPrice,
              ethPrice: summaryData.data.ethPrice,
              totalMarketCap: summaryData.data.totalMarketCap,
              fearGreedIndex: summaryData.data.fearGreedIndex || 50,
            });
          }
        }
      } catch {
        // Market summary is optional
      }

      console.log('[WSProvider] Data loaded from REST API (fallback)');
    } catch (err) {
      console.error('[WSProvider] REST fallback data load failed:', err);
    }
  }, [setTokens, setMarketSummary]);

  const startRestPolling = useCallback(() => {
    if (restPollIntervalRef.current) return; // already polling

    // Load immediately
    loadViaRest();

    // Then poll every 60s
    let pollCount = 0;
    restPollIntervalRef.current = setInterval(async () => {
      pollCount++;
      const shouldRefreshSummary = pollCount % 3 === 0;

      try {
        const res = await queuedFetch(`/api/tokens?limit=${REST_TOKEN_LIMIT}`);
        const data = await res.json();
        if (data.tokens && data.tokens.length > 0) {
          setTokens(
            data.tokens.map((t: any) => ({
              ...t,
              id: t.id || t.address,
              address: t.address || t.id,
              priceChange5m: t.priceChange5m || 0,
              priceChange15m: t.priceChange15m || 0,
              priceHistory: Array.from({ length: 20 }, () =>
                t.priceUsd * (1 + (Math.random() - 0.5) * 0.1)
              ),
              riskScore: t.dna?.riskScore ?? 50,
            }))
          );
        }

        if (shouldRefreshSummary) {
          try {
            const summaryRes = await queuedFetch('/api/market/summary');
            if (summaryRes.ok) {
              const summaryData = await summaryRes.json();
              if (summaryData.data && summaryData.data.btcPrice > 0) {
                setMarketSummary({
                  btcPrice: summaryData.data.btcPrice,
                  ethPrice: summaryData.data.ethPrice,
                  totalMarketCap: summaryData.data.totalMarketCap,
                  fearGreedIndex: summaryData.data.fearGreedIndex || 50,
                });
              }
            }
          } catch {
            // Summary refresh failed silently
          }
        }
      } catch {
        // Silently fail on polling errors
      }
    }, REST_POLL_INTERVAL);
  }, [loadViaRest, setTokens, setMarketSummary]);

  const stopRestPolling = useCallback(() => {
    if (restPollIntervalRef.current) {
      clearInterval(restPollIntervalRef.current);
      restPollIntervalRef.current = null;
    }
  }, []);

  // ─── Main effect: Socket.IO connection ───────────────────────────
  useEffect(() => {
    console.log('[WSProvider] Connecting to Socket.IO at', WS_URL);

    const socket = io(WS_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: SOCKET_CONNECTION_TIMEOUT,
    });
    socketRef.current = socket;

    // ─── Fallback timer: if no connection within 10s, start REST polling ──
    fallbackTimerRef.current = setTimeout(() => {
      if (!socket.connected && !isUsingWsRef.current) {
        console.warn('[WSProvider] Socket.IO connection timed out after 10s — falling back to REST polling');
        setConnected(false);
        startRestPolling();
      }
    }, SOCKET_CONNECTION_TIMEOUT);

    // ─── Connection lifecycle ─────────────────────────────────────
    socket.on('connect', () => {
      console.log('[WSProvider] Socket.IO connected:', socket.id);
      isUsingWsRef.current = true;
      setConnected(true);

      // Clear fallback timer & stop any REST polling
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      stopRestPolling();
    });

    socket.on('disconnect', (reason) => {
      console.warn('[WSProvider] Socket.IO disconnected:', reason);
      isUsingWsRef.current = false;
      setConnected(false);

      // Start REST polling while disconnected (Socket.IO will auto-reconnect)
      startRestPolling();
    });

    socket.on('connect_error', () => {
      // This is expected when WS server is not running — REST fallback handles it
      // Only log once to reduce console noise
      if (!isUsingWsRef.current && !fallbackTimerRef.current) {
        console.warn('[WSProvider] Socket.IO unavailable (WS server not running?) — using REST fallback');
      }
    });

    // ─── Initial data (sent once on connection) ───────────────────
    socket.on('initial-data', (data: any) => {
      if (data.tokens && data.tokens.length > 0) {
        setTokens(data.tokens.map(mapWsToken));
        dataLoadedRef.current = true;
      }
      if (data.traderStats) {
        setTraderStats(data.traderStats as TraderStats);
      }
      console.log(`[WSProvider] Initial data received (${data.tokens?.length ?? 0} tokens, dataMode: ${data.dataMode})`);
    });

    // ─── Token updates (every ~1.5s) ──────────────────────────────
    socket.on('token-update', (data: any) => {
      updateToken({
        symbol: data.symbol,
        priceUsd: data.price ?? data.priceUsd,
        priceChange5m: data.priceChange5m,
        priceChange1h: data.priceChange1h,
        priceChange24h: data.priceChange24h,
        volume24h: data.volume24h,
        liquidity: data.liquidity,
        riskScore: data.riskScore,
        priceHistory: data.priceHistory,
      });
    });

    // ─── New signals (every ~8s) ──────────────────────────────────
    socket.on('new-signal', (data: any) => {
      addSignal({
        id: data.id,
        type: data.type,
        tokenId: data.tokenId,
        tokenSymbol: data.tokenSymbol,
        tokenPrice: data.tokenPrice,
        chain: data.chain,
        confidence: data.confidence,
        direction: data.direction,
        description: data.description,
        priceTarget: data.priceTarget,
        timestamp: data.timestamp,
        metadata: data.metadata ?? { dataMode: data.dataMode, botInvolvement: data.botInvolvement },
      } as SignalData);
    });

    // ─── Smart money alerts (every ~12s) ──────────────────────────
    socket.on('smart-money-alert', (data: any) => {
      addSmartMoneyAlert({
        id: data.id,
        walletLabel: data.walletLabel,
        walletAddress: data.walletAddress,
        tokenSymbol: data.tokenSymbol,
        chain: data.chain,
        action: data.action,
        amount: data.amount,
        price: data.price,
        timestamp: data.timestamp,
        smartMoneyScore: data.smartMoneyScore,
        walletType: data.walletType,
      } as SmartMoneyAlert);
    });

    // ─── Bot alerts (every ~10s) ──────────────────────────────────
    socket.on('bot-alert', (data: any) => {
      addBotAlert({
        id: data.id,
        botLabel: data.botLabel,
        botAddress: data.botAddress,
        botType: data.botType,
        confidence: data.confidence,
        tokenSymbol: data.tokenSymbol,
        chain: data.chain,
        action: data.action,
        amount: data.amount,
        price: data.price,
        timestamp: data.timestamp,
        mevExtracted: data.mevExtracted,
        isFrontrun: data.isFrontrun,
        isSandwich: data.isSandwich,
        isWashTrade: data.isWashTrade,
        slippageBps: data.slippageBps,
      } as BotAlert);
    });

    // ─── Market summary (every ~5s) ───────────────────────────────
    socket.on('market-summary', (data: any) => {
      setMarketSummary({
        btcPrice: data.btcPrice,
        ethPrice: data.ethPrice,
        totalMarketCap: data.totalMarketCap,
        fearGreedIndex: data.fearGreedIndex,
      } as MarketSummary);
    });

    // ─── Trader stats (every ~15s) ────────────────────────────────
    socket.on('trader-stats', (data: any) => {
      setTraderStats(data as TraderStats);
    });

    // ─── Brain events (forwarded from Brain Scheduler) ────────────
    socket.on('brain-cycle', (data: any) => {
      console.log(`[WSProvider] Brain cycle #${data.cyclesCompleted}: ${data.signalsGenerated} signals`);
    });

    socket.on('scheduler-status', (data: any) => {
      console.log(`[WSProvider] Scheduler status: ${data.status}`);
    });

    // ─── Cleanup ──────────────────────────────────────────────────
    return () => {
      console.log('[WSProvider] Cleaning up Socket.IO connection');
      socket.disconnect();
      socketRef.current = null;

      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }

      stopRestPolling();
    };
  }, [
    setTokens,
    updateToken,
    addSignal,
    addSmartMoneyAlert,
    addBotAlert,
    setTraderStats,
    setMarketSummary,
    setConnected,
    startRestPolling,
    stopRestPolling,
  ]);

  return <>{children}</>;
}
