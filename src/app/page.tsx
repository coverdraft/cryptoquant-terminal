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
import AIStrategyOptimizer from '@/components/dashboard/ai-strategy-optimizer';
import BacktestingLab from '@/components/dashboard/backtesting-lab';
import BigDataPredictive from '@/components/dashboard/big-data-predictive';
import BrainControl from '@/components/dashboard/brain-control';
import { OHLCVChart } from '@/components/dashboard/ohlcv-chart';
import { WebSocketProvider } from '@/components/dashboard/websocket-provider';
import { SimulationProvider } from '@/components/dashboard/simulation-provider';
import { DataStatusBar } from '@/components/dashboard/data-status-bar';
import { DeepAnalysisPanel } from '@/components/dashboard/deep-analysis-panel';
import { useCryptoStore, type ActiveTab } from '@/store/crypto-store';
import { useEffect, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Brain,
  BarChart3,
  Dna,
  Radio,
  FlaskConical,
  Wallet,
  Eye,
  TrendingUp,
  Zap,
  ChevronLeft,
  ChevronRight,
  Activity,
  DollarSign,
  Layers,
  Clock,
  Sparkles,
} from 'lucide-react';

// ============================================================
// SIDEBAR NAVIGATION CONFIG
// ============================================================

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Token Flow', icon: BarChart3, shortcut: 'F1', description: 'Live token feed & prices' },
  { id: 'signals', label: 'Signals', icon: Radio, shortcut: 'F2', description: 'Live signal feed' },
  { id: 'dna-scanner', label: 'DNA Scanner', icon: Dna, shortcut: 'F3', description: 'Token DNA analysis' },
  { id: 'brain', label: 'Brain', icon: Brain, shortcut: 'F4', description: 'Control center' },
  { id: 'trading-systems', label: 'Strategy Lab', icon: Wallet, shortcut: 'F5', description: 'Trading system lab & AI optimizer' },
  { id: 'backtesting', label: 'Backtesting Lab', icon: FlaskConical, shortcut: 'F6', description: 'Strategy backtesting' },
  { id: 'trader-intel', label: 'Smart Money', icon: Eye, shortcut: 'F7', description: 'Trader intelligence' },
  { id: 'deep-analysis', label: 'Deep Analysis', icon: Layers, shortcut: 'F8', description: 'Deep token analysis' },
  { id: 'big-data', label: 'Predictive Engine', icon: Zap, shortcut: 'F9', description: 'AI predictions' },
];

// ============================================================
// STRATEGY LAB CONTENT (Classic + AI Optimizer tabs)
// ============================================================

function StrategyLabContent() {
  return (
    <Tabs defaultValue="classic" className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#1e293b] bg-[#0d1117] shrink-0">
        <TabsList className="bg-[#1a1f2e] h-7">
          <TabsTrigger value="classic" className="text-[10px] font-mono h-6 px-3 data-[state=active]:bg-[#d4af37]/20 data-[state=active]:text-[#d4af37]">
            Classic
          </TabsTrigger>
          <TabsTrigger value="ai-optimizer" className="text-[10px] font-mono h-6 px-3 data-[state=active]:bg-[#d4af37]/20 data-[state=active]:text-[#d4af37]">
            🤖 AI Manager
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="classic" className="flex-1 min-h-0 mt-0">
        <TradingSystemsLab />
      </TabsContent>
      <TabsContent value="ai-optimizer" className="flex-1 min-h-0 mt-0 overflow-y-auto">
        <AIStrategyOptimizer />
      </TabsContent>
    </Tabs>
  );
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

const FKEY_TAB_MAP: Record<string, ActiveTab> = {};
NAV_ITEMS.forEach((item, i) => {
  FKEY_TAB_MAP[`F${i + 1}`] = item.id;
});

const TAB_HISTORY: ActiveTab[] = [];

function useKeyboardShortcuts() {
  const { setActiveTab, activeTab } = useCryptoStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (FKEY_TAB_MAP[e.key]) {
      e.preventDefault();
      TAB_HISTORY.push(activeTab);
      setActiveTab(FKEY_TAB_MAP[e.key]);
      return;
    }

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
// TOP BAR COMPONENT
// ============================================================

function TopBar() {
  const { isConnected, marketSummary } = useCryptoStore();
  const [utcTime, setUtcTime] = useState('');

  const { data: brainStatus } = useQuery({
    queryKey: ['brain-status-topbar'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/brain/status');
        if (!res.ok) return null;
        const json = await res.json();
        return json.data as {
          totalSignals: number;
          brainHealth: string;
          brainStatusMessage?: string;
          tokensTracked: number;
          brainCycles: number;
        } | null;
      } catch {
        return null;
      }
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const { data: schedulerStatus } = useQuery({
    queryKey: ['scheduler-status-topbar'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/brain/scheduler');
        if (!res.ok) return null;
        const json = await res.json();
        return (json.data || json) as {
          status: string;
          totalCyclesCompleted: number;
          capitalStrategy?: { totalCapital: number; growthPct: number };
          persisted?: { totalCycles: number; capitalUsd: number };
        } | null;
      } catch {
        return null;
      }
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const brainHealth = brainStatus?.brainHealth ?? 'UNKNOWN';
  const totalSignals = brainStatus?.totalSignals ?? 0;
  const tokensTracked = brainStatus?.tokensTracked ?? 0;
  const brainCycles = schedulerStatus?.totalCyclesCompleted ?? schedulerStatus?.persisted?.totalCycles ?? 0;
  const capital = schedulerStatus?.capitalStrategy?.totalCapital ?? schedulerStatus?.persisted?.capitalUsd ?? 0;
  const growthPct = schedulerStatus?.capitalStrategy?.growthPct ?? 0;
  const schedulerRunning = schedulerStatus?.status === 'RUNNING';

  const safeGrowthPct = growthPct ?? 0;

  const formatCapital = (v: number) => {
    if (v == null || isNaN(v)) return '$0';
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  };

  return (
    <div className="flex items-center justify-between px-2 sm:px-3 h-9 bg-[#080b12] border-b border-[#1e293b] shrink-0">
      {/* Left: Logo + Status */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[#3b82f6] font-mono text-xs font-bold tracking-wider blue-glow">
            CryptoQuant
          </span>
          <span className="text-[#475569] font-mono text-[8px] hidden sm:inline">TERMINAL</span>
        </div>
        <div className="h-4 w-px bg-[#1e293b]" />
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 live-pulse' : 'bg-red-500'}`} />
          <span className={`font-mono text-[9px] ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
        <div className="h-4 w-px bg-[#1e293b]" />
        {/* Brain Status */}
        <div className="flex items-center gap-1.5">
          <Brain className={`h-3 w-3 ${schedulerRunning ? 'text-emerald-400' : 'text-[#475569]'}`} />
          <span className={`font-mono text-[9px] font-bold ${
            brainHealth === 'HEALTHY' || brainHealth === 'ACTIVE' ? 'text-emerald-400' :
            brainHealth === 'LEARNING' ? 'text-cyan-400' :
            brainHealth === 'IDLE' ? 'text-gray-400' :
            'text-[#64748b]'
          }`}>
            {schedulerRunning ? 'ACTIVE' :
              brainHealth === 'HEALTHY' || brainHealth === 'ACTIVE' ? 'ACTIVE' :
              brainHealth === 'LEARNING' ? 'LEARNING' :
              brainHealth === 'IDLE' ? 'IDLE' :
              brainHealth}
          </span>
        </div>
      </div>

      {/* Center: Key Metrics - responsive */}
      <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 overflow-x-auto">
        {/* Capital */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-[#0a0e17] px-1.5 sm:px-2 py-0.5 rounded border border-[#1e293b] shrink-0">
          <DollarSign className="h-3 w-3 text-[#3b82f6]" />
          <span className="text-[8px] font-mono text-[#64748b] hidden md:inline">CAPITAL</span>
          <span className="mono-data text-[10px] font-bold text-[#e2e8f0]">{formatCapital(capital)}</span>
          <span className={`mono-data text-[9px] font-bold ${safeGrowthPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {safeGrowthPct >= 0 ? '+' : ''}{safeGrowthPct.toFixed(1)}%
          </span>
        </div>

        {/* Cycles */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-[#0a0e17] px-1.5 sm:px-2 py-0.5 rounded border border-[#1e293b] shrink-0">
          <Activity className="h-3 w-3 text-cyan-400" />
          <span className="text-[8px] font-mono text-[#64748b] hidden lg:inline">CYCLES</span>
          <span className="mono-data text-[10px] font-bold text-cyan-400">{brainCycles}</span>
        </div>

        {/* Tokens */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-[#0a0e17] px-1.5 sm:px-2 py-0.5 rounded border border-[#1e293b] shrink-0">
          <BarChart3 className="h-3 w-3 text-[#3b82f6]" />
          <span className="text-[8px] font-mono text-[#64748b] hidden lg:inline">TOKENS</span>
          <span className="mono-data text-[10px] font-bold text-[#e2e8f0]">{tokensTracked.toLocaleString()}</span>
        </div>

        {/* Signals */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-[#0a0e17] px-1.5 sm:px-2 py-0.5 rounded border border-[#1e293b] shrink-0">
          <Radio className="h-3 w-3 text-amber-400" />
          <span className="text-[8px] font-mono text-[#64748b] hidden lg:inline">SIGNALS</span>
          <span className="mono-data text-[10px] font-bold text-amber-400">{totalSignals}</span>
        </div>

        {/* Market - hide on small screens */}
        {marketSummary && (
          <>
            <div className="h-4 w-px bg-[#1e293b] hidden xl:block" />
            <div className="flex items-center gap-1 hidden xl:flex">
              <span className="text-[#f59e0b] font-mono text-[9px] font-bold">BTC</span>
              <span className="mono-data text-[10px] text-[#e2e8f0]">${(marketSummary.btcPrice ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 hidden xl:flex">
              <span className="text-[#627eea] font-mono text-[9px] font-bold">ETH</span>
              <span className="mono-data text-[10px] text-[#e2e8f0]">${(marketSummary.ethPrice ?? 0).toLocaleString()}</span>
            </div>
          </>
        )}
      </div>

      {/* Right: Time - hide on small screens */}
      <div className="flex items-center gap-2 shrink-0 hidden md:flex">
        <span className="mono-data text-[9px] text-[#475569]">{utcTime}</span>
      </div>
    </div>
  );
}

// ============================================================
// SIDEBAR COMPONENT
// ============================================================

function Sidebar() {
  const { activeTab, setActiveTab } = useCryptoStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav
      className={`flex flex-col h-full bg-[#0d1117] border-r border-[#1e293b] shrink-0 transition-all duration-200 ${
        collapsed ? 'w-10 sm:w-12' : 'w-[140px] sm:w-[180px]'
      }`}
    >
      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto py-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`sidebar-nav-item w-full flex items-center gap-2 px-3 py-2 text-left ${
                isActive ? 'active' : ''
              }`}
              title={`${item.label} (${item.shortcut})`}
            >
              <Icon className={`nav-icon h-4 w-4 shrink-0 ${
                isActive ? 'text-[#3b82f6]' : 'text-[#64748b]'
              }`} />
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className={`nav-label text-[11px] font-medium truncate ${
                    isActive ? 'text-[#f1f5f9]' : 'text-[#94a3b8]'
                  }`}>
                    {item.label}
                  </span>
                </div>
              )}
              {!collapsed && (
                <span className={`ml-auto text-[8px] font-mono ${
                  isActive ? 'text-[#3b82f6]/60' : 'text-[#475569]'
                }`}>
                  {item.shortcut}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse Toggle */}
      <div className="border-t border-[#1e293b] p-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-1.5 text-[#475569] hover:text-[#94a3b8] transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </nav>
  );
}

// ============================================================
// QUICK START GUIDE
// ============================================================

function QuickStartGuide() {
  const steps = [
    { icon: Brain, label: 'Start the Brain', desc: 'Go to Brain tab and click Start to begin automated analysis' },
    { icon: BarChart3, label: 'Browse Token Flow', desc: 'Monitor live token prices and market movements' },
    { icon: Radio, label: 'Watch Signals', desc: 'Get real-time trading signals from multiple sources' },
    { icon: Dna, label: 'Scan DNA', desc: 'Select a token and analyze its DNA risk profile' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full"
    >
      {/* Welcome Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-[#3b82f6]" />
          <h1 className="text-xl font-bold text-[#f1f5f9] font-mono">CryptoQuant Terminal</h1>
        </div>
        <p className="text-sm text-[#94a3b8] max-w-xl">
          Professional-grade crypto analytics. Real-time signals, DNA risk scanning, smart money tracking, and AI-powered predictions — all in one terminal.
        </p>
      </div>

      {/* Quick Start Steps */}
      <div className="px-6 pb-4">
        <h2 className="text-[11px] font-mono text-[#64748b] uppercase tracking-wider mb-3">Quick Start</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className="quick-start-step bg-[#111827] border border-[#1e293b] rounded-lg p-4 cursor-pointer hover:border-[#3b82f6]/30 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20">
                    <Icon className="h-4 w-4 text-[#3b82f6]" />
                  </div>
                  <span className="text-[9px] font-mono text-[#3b82f6]/60">STEP {i + 1}</span>
                </div>
                <h3 className="text-sm font-bold text-[#f1f5f9] mb-1">{step.label}</h3>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Dashboard Content - Token Flow + Signals */}
      <div className="flex-1 flex gap-1.5 min-h-0 px-1.5 pb-1.5">
        <div className="w-[45%] shrink-0">
          <TokenFlow />
        </div>
        <div className="flex-1 flex flex-col gap-1.5 min-h-0">
          <div className="flex-1 min-h-0">
            <SignalCenter />
          </div>
          <div className="shrink-0">
            <IntelligenceModules />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// MAIN CONTENT AREA
// ============================================================

function MainContent() {
  const { activeTab, selectedToken } = useCryptoStore();

  const contentMap: Record<ActiveTab, React.ReactNode> = {
    dashboard: <QuickStartGuide />,
    signals: (
      <div className="flex-1 min-h-0 h-full">
        <SignalCenter />
      </div>
    ),
    'dna-scanner': (
      <div className="flex-1 flex gap-1.5 min-h-0 h-full">
        <div className="w-[35%] shrink-0">
          <TokenFlow />
        </div>
        <div className="flex-1">
          <DNAScanner />
        </div>
      </div>
    ),
    charts: (
      <div className="flex-1 flex gap-1.5 min-h-0 h-full">
        <div className="w-[35%] shrink-0">
          <TokenFlow />
        </div>
        <div className="flex-1">
          {selectedToken ? (
            <OHLCVChart tokenAddress={(selectedToken as any).address ?? selectedToken.id} chain={selectedToken.chain} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-[#0d1117] border border-[#1e293b] rounded-lg">
              <BarChart3 className="h-8 w-8 text-[#475569] mb-2" />
              <span className="text-[#64748b] font-mono text-sm">Select a token to view charts</span>
            </div>
          )}
        </div>
      </div>
    ),
    'pattern-builder': (
      <div className="flex-1 min-h-0 h-full">
        <PatternBuilder />
      </div>
    ),
    heatmap: (
      <div className="flex-1 flex gap-1.5 min-h-0 h-full">
        <div className="w-[35%] shrink-0">
          <TokenFlow />
        </div>
        <div className="flex-1">
          <UserHeatmap />
        </div>
      </div>
    ),
    'trader-intel': (
      <div className="flex-1 min-h-0 h-full">
        <TraderIntelligencePanel />
      </div>
    ),
    'trading-systems': (
      <div className="flex-1 min-h-0 h-full flex flex-col">
        <StrategyLabContent />
      </div>
    ),
    backtesting: (
      <div className="flex-1 min-h-0 h-full">
        <BacktestingLab />
      </div>
    ),
    'big-data': (
      <div className="flex-1 min-h-0 h-full">
        <BigDataPredictive />
      </div>
    ),
    brain: (
      <div className="flex-1 min-h-0 h-full">
        <BrainControl />
      </div>
    ),
    'deep-analysis': (
      <div className="flex-1 min-h-0 h-full overflow-y-auto">
        <DeepAnalysisPanel />
      </div>
    ),
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15 }}
        className="flex-1 flex min-h-0 p-1.5"
      >
        {contentMap[activeTab]}
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================
// DASHBOARD CONTENT
// ============================================================

function DashboardContent() {
  useKeyboardShortcuts();

  return (
    <div className="flex flex-col h-screen bg-[#0a0e17] overflow-hidden">
      {/* Top Bar */}
      <TopBar />

      {/* Ticker Strip */}
      <HeaderBar />

      {/* Main Layout: Sidebar + Content */}
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <MainContent />
      </div>

      {/* Bottom Status Bar */}
      <DataStatusBar />
    </div>
  );
}

// ============================================================
// HOME PAGE
// ============================================================

export default function HomePage() {
  return (
    <WebSocketProvider>
      <SimulationProvider>
        <DashboardContent />
      </SimulationProvider>
    </WebSocketProvider>
  );
}
