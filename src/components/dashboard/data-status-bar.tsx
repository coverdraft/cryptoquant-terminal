'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

interface DataLoaderStatus {
  tokens: number;
  tokensWithVolume: number;
  tokensWithLiquidity: number;
  tokensEnriched: number;
  candles: number;
  dnaRecords: number;
  activeJobs: number;
  enrichmentPct: number;
  status: string;
}

interface BrainStatus {
  ohlcvCandles: number;
  tokensTracked: number;
  tradersProfiled: number;
  dnaProfiles: number;
  totalSignals: number;
  unvalidatedSignals: number;
  validatedSignals: number;
  brainHealth: string;
  tradingSystems: number;
  activePatterns: number;
  backtestRuns: number;
  brainCycles: number;
  winRate: string;
}

export function DataStatusBar() {
  // Fetch data loader status
  const { data: loaderData } = useQuery({
    queryKey: ['data-loader-status-bar'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/data-loader');
        if (!res.ok) return null;
        const json = await res.json();
        return json.data as DataLoaderStatus | null;
      } catch {
        return null;
      }
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // Fetch brain status
  const { data: brainData } = useQuery({
    queryKey: ['brain-status-bar'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/brain/status');
        if (!res.ok) return null;
        const json = await res.json();
        return json.data as BrainStatus | null;
      } catch {
        return null;
      }
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // Derive computed values from query data (no setState in effect)
  const { lastSync, dbSizeKB } = useMemo(() => {
    if (!loaderData) return { lastSync: '--:--:--', dbSizeKB: 0 };
    const sync = new Date().toISOString().substring(11, 19);
    const estimatedKB = (loaderData.tokens * 2) + (loaderData.candles * 0.5) + (loaderData.dnaRecords * 1);
    return { lastSync: sync, dbSizeKB: Math.round(estimatedKB) };
  }, [loaderData]);

  const tokenCount = loaderData?.tokens ?? 0;
  const candleCount = loaderData?.candles ?? brainData?.ohlcvCandles ?? 0;
  const dnaCount = loaderData?.dnaRecords ?? brainData?.dnaProfiles ?? 0;
  const signalCount = brainData?.totalSignals ?? 0;
  const traderCount = brainData?.tradersProfiled ?? 0;
  const patternCount = brainData?.activePatterns ?? 0;
  const brainHealth = brainData?.brainHealth ?? 'UNKNOWN';
  const loaderStatus = loaderData?.status ?? 'UNKNOWN';
  const enrichmentPct = loaderData?.enrichmentPct ?? 0;

  const formatDbSize = (kb: number) => {
    if (kb >= 1e6) return `${(kb / 1e6).toFixed(1)}GB`;
    if (kb >= 1e3) return `${(kb / 1e3).toFixed(1)}MB`;
    return `${kb}KB`;
  };

  return (
    <div className="status-bar flex items-center justify-between px-2 h-5 text-[#64748b] shrink-0">
      {/* Left: Data counts */}
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-0.5">
          <span className="text-[#d4af37]">◆</span>
          <span>{tokenCount.toLocaleString()} tokens</span>
        </span>
        <span className="text-[#2d3748]">│</span>
        <span>{candleCount.toLocaleString()} candles</span>
        <span className="text-[#2d3748]">│</span>
        <span>{signalCount} signals</span>
        <span className="text-[#2d3748]">│</span>
        <span>{dnaCount} DNA</span>
        <span className="text-[#2d3748]">│</span>
        <span>{traderCount} traders</span>
        <span className="text-[#2d3748]">│</span>
        <span>{patternCount} patterns</span>
      </div>

      {/* Center: Brain + Loader Status */}
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-0.5">
          Brain:
          <span className={`font-bold ${
            brainHealth === 'HEALTHY' ? 'text-emerald-400' :
            brainHealth === 'NEEDS_VALIDATION' ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {brainHealth === 'HEALTHY' ? 'ACTIVE' : brainHealth}
          </span>
        </span>
        <span className="text-[#2d3748]">│</span>
        <span className="flex items-center gap-0.5">
          Loader:
          <span className={`font-bold ${loaderStatus === 'IDLE' ? 'text-emerald-400' : 'text-yellow-400'}`}>
            {loaderStatus}
          </span>
        </span>
        <span className="text-[#2d3748]">│</span>
        <span>Enrich: {enrichmentPct}%</span>
      </div>

      {/* Right: DB + Sync + Sources */}
      <div className="flex items-center gap-2">
        <span>DB: {formatDbSize(dbSizeKB)}</span>
        <span className="text-[#2d3748]">│</span>
        <span>Sync: {lastSync || '--:--:--'}</span>
        <span className="text-[#2d3748]">│</span>
        <span className="flex items-center gap-1">
          API:
          <span className="data-dot data-dot-live" />
          <span className="text-emerald-400">DexScreener</span>
          <span className="data-dot data-dot-live" />
          <span className="text-emerald-400">CoinGecko</span>
          <span className="data-dot data-dot-db" />
          <span className="text-yellow-400">DexPaprika</span>
        </span>
      </div>
    </div>
  );
}
