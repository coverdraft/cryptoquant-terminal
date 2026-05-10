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
import { useCryptoStore } from '@/store/crypto-store';

function DashboardContent() {
  const { activeTab, selectedToken } = useCryptoStore();

  return (
    <div className="flex flex-col h-screen bg-[#0a0e17] overflow-hidden">
      {/* Header Bar */}
      <HeaderBar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 p-2 gap-2">
        {activeTab === 'dashboard' && (
          <div className="flex-1 flex gap-2 min-h-0">
            {/* Left: Token Flow (40%) */}
            <div className="w-[40%] shrink-0">
              <TokenFlow />
            </div>
            {/* Right: Signal Center (60%) */}
            <div className="flex-1">
              <SignalCenter />
            </div>
          </div>
        )}

        {activeTab === 'signals' && (
          <div className="flex-1 min-h-0">
            <SignalCenter />
          </div>
        )}

        {activeTab === 'dna-scanner' && (
          <div className="flex-1 flex gap-2 min-h-0">
            <div className="w-[35%] shrink-0">
              <TokenFlow />
            </div>
            <div className="flex-1">
              <DNAScanner />
            </div>
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="flex-1 flex gap-2 min-h-0">
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
          <div className="flex-1 flex gap-2 min-h-0">
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

      {/* Intelligence Module Cards */}
      <div className="p-2 pt-0">
        <IntelligenceModules />
      </div>
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
