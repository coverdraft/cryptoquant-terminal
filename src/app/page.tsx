'use client';

import { HeaderBar } from '@/components/dashboard/header-bar';
import { TokenFlow } from '@/components/dashboard/token-flow';
import { SignalCenter } from '@/components/dashboard/signal-center';
import { DNAScanner } from '@/components/dashboard/dna-scanner';
import { PatternBuilder } from '@/components/dashboard/pattern-builder';
import { UserHeatmap } from '@/components/dashboard/user-heatmap';
import { IntelligenceModules } from '@/components/dashboard/intelligence-modules';
import { TraderIntelligencePanel } from '@/components/dashboard/trader-intelligence';
import TradingSystemsLab from '@/components/dashboard/trading-systems-lab';
import BacktestingLab from '@/components/dashboard/backtesting-lab';
import BigDataPredictive from '@/components/dashboard/big-data-predictive';
import BrainControl from '@/components/dashboard/brain-control';
import { OHLCVChart } from '@/components/dashboard/ohlcv-chart';
import { WebSocketProvider } from '@/components/dashboard/websocket-provider';
import { SimulationProvider } from '@/components/dashboard/simulation-provider';
import { DataStatusBar } from '@/components/dashboard/data-status-bar';
import { useCryptoStore, type ActiveTab } from '@/store/crypto-store';
import { useEffect, useCallback } from 'react';

// ============================================================
// KEYBOARD SHORTCUTS: F1-F11 for tabs, Escape to go back
// ============================================================

const FKEY_TAB_MAP: Record<string, ActiveTab> = {
  'F1': 'dashboard',
  'F2': 'signals',
  'F3': 'dna-scanner',
  'F4': 'charts',
  'F5': 'pattern-builder',
  'F6': 'heatmap',
  'F7': 'trader-intel',
  'F8': 'trading-systems',
  'F9': 'backtesting',
  'F10': 'big-data',
  'F11': 'brain',
};

const TAB_HISTORY: ActiveTab[] = [];

function useKeyboardShortcuts() {
  const { setActiveTab, activeTab } = useCryptoStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // F-key shortcuts
    if (FKEY_TAB_MAP[e.key]) {
      e.preventDefault();
      TAB_HISTORY.push(activeTab);
      setActiveTab(FKEY_TAB_MAP[e.key]);
      return;
    }

    // Escape: go back to previous tab, or dashboard
    if (e.key === 'Escape') {
      const prevTab = TAB_HISTORY.pop() || 'dashboard';
      setActiveTab(prevTab);
      return;
    }
  }, [setActiveTab, activeTab]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// ============================================================
// DASHBOARD CONTENT
// ============================================================

function DashboardContent() {
  const { activeTab, selectedToken } = useCryptoStore();

  // Register keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="flex flex-col h-screen bg-[#0a0e17] overflow-hidden terminal-scanlines">
      {/* Header Bar */}
      <HeaderBar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 p-1.5 gap-1.5">
        {activeTab === 'dashboard' && (
          <div className="flex-1 flex gap-1.5 min-h-0">
            {/* Left: Token Flow (40%) */}
            <div className="w-[40%] shrink-0">
              <TokenFlow />
            </div>
            {/* Right: Signal Center + Intelligence Modules */}
            <div className="flex-1 flex flex-col gap-1.5 min-h-0">
              <div className="flex-1 min-h-0">
                <SignalCenter />
              </div>
              {/* Intelligence Modules - Compact single row */}
              <div className="shrink-0">
                <IntelligenceModules />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'signals' && (
          <div className="flex-1 min-h-0">
            <SignalCenter />
          </div>
        )}

        {activeTab === 'dna-scanner' && (
          <div className="flex-1 flex gap-1.5 min-h-0">
            <div className="w-[35%] shrink-0">
              <TokenFlow />
            </div>
            <div className="flex-1">
              <DNAScanner />
            </div>
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="flex-1 flex gap-1.5 min-h-0">
            <div className="w-[35%] shrink-0">
              <TokenFlow />
            </div>
            <div className="flex-1">
              {selectedToken ? (
                <OHLCVChart
                  tokenAddress={selectedToken.id}
                  chain={selectedToken.chain}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-[#0d1117] border border-[#1e293b] rounded-lg">
                  <span className="text-[#64748b] font-mono text-sm">Select a token to view charts</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pattern-builder' && (
          <div className="flex-1 min-h-0">
            <PatternBuilder />
          </div>
        )}

        {activeTab === 'heatmap' && (
          <div className="flex-1 flex gap-1.5 min-h-0">
            <div className="w-[35%] shrink-0">
              <TokenFlow />
            </div>
            <div className="flex-1">
              <UserHeatmap />
            </div>
          </div>
        )}

        {activeTab === 'trader-intel' && (
          <div className="flex-1 min-h-0">
            <TraderIntelligencePanel />
          </div>
        )}

        {activeTab === 'trading-systems' && (
          <div className="flex-1 min-h-0">
            <TradingSystemsLab />
          </div>
        )}

        {activeTab === 'backtesting' && (
          <div className="flex-1 min-h-0">
            <BacktestingLab />
          </div>
        )}

        {activeTab === 'big-data' && (
          <div className="flex-1 min-h-0">
            <BigDataPredictive />
          </div>
        )}

        {activeTab === 'brain' && (
          <div className="flex-1 min-h-0">
            <BrainControl />
          </div>
        )}
      </div>

      {/* Bottom Status Bar (Bloomberg style) */}
      <DataStatusBar />
    </div>
  );
}

export default function HomePage() {
  return (
    <WebSocketProvider>
      <SimulationProvider>
        <DashboardContent />
      </SimulationProvider>
    </WebSocketProvider>
  );
}
