'use client';

import { useCryptoStore, type MarketSummary, type ActiveTab } from '@/store/crypto-store';
import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Radio, Dna, CandlestickChart,
  GitBranch, Grid3x3, Users, Zap, FlaskConical,
  Database, Settings2, ChevronRight
} from 'lucide-react';

// ============================================================
// TAB CONFIGURATION (Bloomberg Function Keys)
// ============================================================

const TAB_CONFIG: { id: ActiveTab; label: string; fKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', fKey: 'F1', icon: LayoutDashboard },
  { id: 'signals', label: 'Signals', fKey: 'F2', icon: Radio },
  { id: 'dna-scanner', label: 'DNA', fKey: 'F3', icon: Dna },
  { id: 'charts', label: 'Charts', fKey: 'F4', icon: CandlestickChart },
  { id: 'pattern-builder', label: 'Pattern', fKey: 'F5', icon: GitBranch },
  { id: 'heatmap', label: 'Heatmap', fKey: 'F6', icon: Grid3x3 },
  { id: 'trader-intel', label: 'Traders', fKey: 'F7', icon: Users },
  { id: 'trading-systems', label: 'Systems', fKey: 'F8', icon: Zap },
  { id: 'backtesting', label: 'Backtest', fKey: 'F9', icon: FlaskConical },
  { id: 'big-data', label: 'BigData', fKey: 'F10', icon: Database },
  { id: 'brain', label: 'Brain', fKey: 'F11', icon: Settings2 },
];

// ============================================================
// CHAIN FILTER CONFIG
// ============================================================

const CHAIN_FILTERS = ['ALL', 'SOL', 'ETH', 'BASE', 'ARB', 'BSC'] as const;

// ============================================================
// HELPERS
// ============================================================

function formatPrice(price: number) {
  if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.001) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(8)}`;
}

function formatMarketCap(val: number) {
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  return `$${(val / 1e6).toFixed(2)}M`;
}

function formatVolume(vol: number) {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toFixed(0);
}

// ============================================================
// MINI SPARKLINE SVG (for ticker strip)
// ============================================================

function TickerSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 32;
  const h = 12;
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`
  ).join(' ');

  return (
    <svg width={w} height={h} className="inline-block shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ============================================================
// TICKER STRIP COMPONENT
// ============================================================

function TickerStrip() {
  const { tokens } = useCryptoStore();

  // Get top movers for ticker
  const tickerItems = useMemo(() => {
    if (tokens.length === 0) return [];
    // Sort by absolute price change, take top 30
    return [...tokens]
      .sort((a, b) => Math.abs(b.priceChange24h) - Math.abs(a.priceChange24h))
      .slice(0, 30)
      .map(t => ({
        symbol: t.symbol,
        price: t.priceUsd,
        change: t.priceChange24h,
        history: t.priceHistory || [],
      }));
  }, [tokens]);

  if (tickerItems.length === 0) return null;

  // Duplicate items for seamless scroll
  const doubled = [...tickerItems, ...tickerItems];

  return (
    <div className="h-5 bg-[#080b12] border-b border-[#1a1f2e] overflow-hidden flex items-center">
      <div className="flex items-center px-1.5 shrink-0 border-r border-[#1a1f2e]">
        <span className="text-[8px] font-mono text-[#d4af37] font-bold">TICKER</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="ticker-scroll flex items-center gap-4 whitespace-nowrap w-max">
          {doubled.map((item, i) => (
            <span key={`${item.symbol}-${i}`} className="inline-flex items-center gap-1.5">
              <span className="text-[9px] font-mono text-[#94a3b8] font-semibold">{item.symbol}</span>
              <span className="mono-data text-[9px] text-[#e2e8f0]">${formatPrice(item.price)}</span>
              <span className={`mono-data text-[9px] font-bold ${item.change >= 0 ? 'text-emerald-400 green-glow-text' : 'text-red-400 red-glow-text'}`}>
                {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
              </span>
              {item.history.length >= 2 && (
                <TickerSparkline
                  data={item.history}
                  color={item.change >= 0 ? '#10b981' : '#ef4444'}
                />
              )}
              <ChevronRight className="h-2 w-2 text-[#2d3748] shrink-0" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN HEADER BAR COMPONENT
// ============================================================

export function HeaderBar() {
  const { isConnected, marketSummary, activeTab, setActiveTab, chainFilter, setChainFilter, tokens } = useCryptoStore();
  const [utcTime, setUtcTime] = useState('');

  // Fetch data status for the indicator
  const { data: dataLoaderStatus } = useQuery({
    queryKey: ['data-loader-status'],
    queryFn: async () => {
      const res = await fetch('/api/data-loader');
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as {
        tokens: number;
        candles: number;
        dnaRecords: number;
        activeJobs: number;
        status: string;
      } | null;
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const { data: brainStatus } = useQuery({
    queryKey: ['brain-status-header'],
    queryFn: async () => {
      const res = await fetch('/api/brain/status');
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as {
        totalSignals: number;
        brainHealth: string;
        ohlcvCandles: number;
      } | null;
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(
        new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const tokenCount = dataLoaderStatus?.tokens ?? tokens.length;
  const candleCount = dataLoaderStatus?.candles ?? brainStatus?.ohlcvCandles ?? 0;
  const signalCount = brainStatus?.totalSignals ?? 0;
  const brainHealth = brainStatus?.brainHealth ?? 'UNKNOWN';

  return (
    <header className="shrink-0">
      {/* Ticker Strip */}
      <TickerStrip />

      {/* Main Header Bar - 40px */}
      <div className="flex items-center justify-between px-2 bg-[#0d1117] border-b border-[#1e293b] h-10">
        {/* Left: Logo + Status */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[#d4af37] font-mono text-sm font-bold tracking-wider gold-glow">
              CryptoQuant
            </span>
            <span className="text-[#475569] font-mono text-[9px]">TERMINAL</span>
          </div>
          <div className="h-3.5 w-px bg-[#1e293b]" />
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 live-pulse' : 'bg-red-500'}`} />
            <span className={`font-mono text-[9px] ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Center: Market Summary */}
        <div className="flex items-center gap-4">
          {marketSummary && (
            <>
              <div className="flex items-center gap-1">
                <span className="text-[#f59e0b] font-mono text-[9px] font-bold">BTC</span>
                <span className="mono-data text-[10px] text-[#e2e8f0]">{formatPrice(marketSummary.btcPrice)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#627eea] font-mono text-[9px] font-bold">ETH</span>
                <span className="mono-data text-[10px] text-[#e2e8f0]">{formatPrice(marketSummary.ethPrice)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#64748b] font-mono text-[9px]">MKT</span>
                <span className="mono-data text-[10px] text-[#e2e8f0]">{formatMarketCap(marketSummary.totalMarketCap)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#64748b] font-mono text-[9px]">F&G</span>
                <span className={`mono-data text-[10px] font-bold ${
                  marketSummary.fearGreedIndex > 60 ? 'text-emerald-400' :
                  marketSummary.fearGreedIndex > 40 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {marketSummary.fearGreedIndex}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right: Clock + Data Status */}
        <div className="flex items-center gap-2.5">
          {/* Data Status Indicator */}
          <div className="flex items-center gap-1.5 bg-[#080b12] px-1.5 py-0.5 rounded">
            <span className="text-[8px] font-mono text-[#64748b]">{tokenCount.toLocaleString()} Tokens</span>
            <span className="text-[8px] text-[#2d3748]">|</span>
            <span className="text-[8px] font-mono text-[#64748b]">{candleCount.toLocaleString()} Candles</span>
            <span className="text-[8px] text-[#2d3748]">|</span>
            <span className="text-[8px] font-mono text-[#64748b]">{signalCount} Signals</span>
            <span className="text-[8px] text-[#2d3748]">|</span>
            <span className="text-[8px] font-mono text-[#64748b]">Brain:</span>
            <span className={`text-[8px] font-mono font-bold ${
              brainHealth === 'HEALTHY' ? 'text-emerald-400' :
              brainHealth === 'NEEDS_VALIDATION' ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {brainHealth === 'HEALTHY' ? 'ACTIVE' : brainHealth === 'NEEDS_VALIDATION' ? 'VALIDATE' : brainHealth}
            </span>
          </div>
          <div className="h-3.5 w-px bg-[#1e293b]" />
          <span className="mono-data text-[9px] text-[#475569]">{utcTime}</span>
        </div>
      </div>

      {/* Tab Bar + Chain Filters - 28px */}
      <div className="flex items-center justify-between px-1 bg-[#0a0e17] border-b border-[#1e293b] h-7">
        {/* Tabs - Bloomberg F-Key Style */}
        <div className="flex items-center gap-0">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-fn-key flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono transition-all ${
                  isActive
                    ? 'active bg-[#d4af37]/12 text-[#d4af37]'
                    : 'text-[#64748b] hover:text-[#94a3b8]'
                }`}
                title={`${tab.fKey}: ${tab.label}`}
              >
                <span className={`text-[7px] ${isActive ? 'text-[#d4af37]/60' : 'text-[#475569]'}`}>{tab.fKey}</span>
                <Icon className={`h-2.5 w-2.5 ${isActive ? 'text-[#d4af37]' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Chain Filter Buttons */}
        <div className="flex items-center gap-0">
          <span className="text-[7px] font-mono text-[#475569] mr-0.5">CHAIN:</span>
          {CHAIN_FILTERS.map((chain) => {
            const isActive = chainFilter === chain;
            const chainColor = chain === 'SOL' ? '#9945FF' : chain === 'ETH' ? '#627eea' : chain === 'BASE' ? '#0052FF' : chain === 'ARB' ? '#28A0F0' : chain === 'BSC' ? '#F3BA2F' : '#d4af37';
            return (
              <button
                key={chain}
                onClick={() => setChainFilter(chain)}
                className={`flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-mono transition-all ${
                  isActive
                    ? 'text-[#e2e8f0] bg-[#1a1f2e]'
                    : 'text-[#64748b] hover:text-[#94a3b8]'
                }`}
              >
                {chain !== 'ALL' && (
                  <span
                    className="w-1 h-1 rounded-full inline-block"
                    style={{ backgroundColor: chainColor }}
                  />
                )}
                {chain}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
