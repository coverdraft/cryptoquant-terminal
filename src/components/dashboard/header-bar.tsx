'use client';

import { useCryptoStore, type MarketSummary } from '@/store/crypto-store';
import { useEffect, useState } from 'react';

export function HeaderBar() {
  const { isConnected, marketSummary, activeTab, setActiveTab } = useCryptoStore();
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(
        new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'signals', label: 'Signals' },
    { id: 'dna-scanner', label: 'DNA Scanner' },
    { id: 'charts', label: '\U0001f4c8 Charts' },
    { id: 'pattern-builder', label: 'Pattern Builder' },
    { id: 'heatmap', label: 'Heatmap' },
    { id: 'trader-intel', label: 'Trader Intel' },
    { id: 'trading-systems', label: '⚡ Systems' },
    { id: 'backtesting', label: '🧪 Backtest' },
    { id: 'big-data', label: '🧠 Big Data' },
    { id: 'brain', label: '⚙️ Brain' },
  ];

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.001) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(8)}`;
  };

  const formatMarketCap = (val: number) => {
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    return `$${(val / 1e6).toFixed(2)}M`;
  };

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-[#0d1117] border-b border-[#1e293b] h-12 shrink-0">
      {/* Left: Logo + Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[#d4af37] font-mono text-lg font-bold tracking-wider gold-glow">
            CryptoQuant
          </span>
          <span className="text-[#94a3b8] font-mono text-xs">TERMINAL</span>
        </div>
        <div className="h-4 w-px bg-[#1e293b]" />
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 live-pulse' : 'bg-red-500'}`} />
          <span className={`font-mono text-xs ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Center: Market Summary */}
      <div className="flex items-center gap-6">
        {marketSummary && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-[#f59e0b] font-mono text-xs font-bold">BTC</span>
              <span className="mono-data text-xs text-[#e2e8f0]">{formatPrice(marketSummary.btcPrice)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#627eea] font-mono text-xs font-bold">ETH</span>
              <span className="mono-data text-xs text-[#e2e8f0]">{formatPrice(marketSummary.ethPrice)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#94a3b8] font-mono text-xs">MKT CAP</span>
              <span className="mono-data text-xs text-[#e2e8f0]">{formatMarketCap(marketSummary.totalMarketCap)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#94a3b8] font-mono text-xs">F&G</span>
              <span className={`mono-data text-xs font-bold ${
                marketSummary.fearGreedIndex > 60 ? 'text-emerald-400' :
                marketSummary.fearGreedIndex > 40 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {marketSummary.fearGreedIndex}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right: Clock + Tabs */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 text-xs font-mono rounded transition-all ${
                activeTab === tab.id
                  ? 'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40'
                  : 'text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1a1f2e]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-[#1e293b]" />
        <span className="mono-data text-xs text-[#64748b]">{utcTime}</span>
      </div>
    </header>
  );
}
