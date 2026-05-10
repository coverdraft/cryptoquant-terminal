'use client';

import { useCryptoStore, type TokenData, type SignalData, type SmartMoneyAlert, type BotAlert, type TraderStats, type MarketSummary } from '@/store/crypto-store';
import { useEffect, useRef, useCallback } from 'react';
import { queuedFetch } from '@/lib/request-queue';

/**
 * WebSocketProvider - REST API polling with conservative intervals.
 * Uses queuedFetch to prevent concurrent request overload.
 */
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const {
    setTokens,
    addSignal,
    setMarketSummary,
    setConnected,
  } = useCryptoStore();

  const dataLoadedRef = useRef(false);
  const pollCountRef = useRef(0);

  const loadInitialData = useCallback(async () => {
    if (dataLoadedRef.current) return;
    dataLoadedRef.current = true;

    try {
      // Load tokens from DB (fast, no external API calls)
      const tokensRes = await queuedFetch('/api/tokens?limit=50');
      const tokensData = await tokensRes.json();

      if (tokensData.tokens && tokensData.tokens.length > 0) {
        setTokens(
          tokensData.tokens.map((t: any) => ({
            ...t,
            id: t.id || t.address,
            priceChange5m: t.priceChange5m || 0,
            priceChange15m: t.priceChange15m || 0,
            priceHistory: Array.from({ length: 20 }, (_, i) =>
              t.priceUsd * (1 + (Math.random() - 0.5) * 0.1)
            ),
            riskScore: t.dna?.riskScore ?? 50,
          }))
        );
      }

      // Load market summary (CoinGecko - cached, fast)
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

      setConnected(false);
      console.log('[WSProvider] Initial data loaded from REST API');
    } catch (err) {
      console.error('[WSProvider] Initial data load failed:', err);
    }
  }, [setTokens, setMarketSummary, setConnected]);

  useEffect(() => {
    loadInitialData();

    // Periodic polling every 60 seconds
    const pollInterval = setInterval(async () => {
      pollCountRef.current++;
      const shouldRefreshSummary = pollCountRef.current % 3 === 0;

      try {
        const res = await queuedFetch('/api/tokens?limit=50');
        const data = await res.json();
        if (data.tokens && data.tokens.length > 0) {
          setTokens(
            data.tokens.map((t: any) => ({
              ...t,
              id: t.id || t.address,
              priceChange5m: t.priceChange5m || 0,
              priceChange15m: t.priceChange15m || 0,
              priceHistory: Array.from({ length: 20 }, (_, i) =>
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
    }, 60000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [loadInitialData, setTokens, setMarketSummary]);

  return <>{children}</>;
}
