'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface StrategyState {
  id: string;
  name: string;
  category: string;
  icon: string;
  isActive: boolean;
  isPaperTrading: boolean;
  totalBacktests: number;
  bestSharpe: number;
  bestWinRate: number;
  bestPnlPct: number;
  version: number;
  parentSystemId: string | null;
  createdAt: string;
  updatedAt: string;
  lastBacktest: {
    id: string;
    status: string;
    totalPnlPct: number;
    sharpeRatio: number;
    winRate: number;
    totalTrades: number;
    completedAt: string | null;
  } | null;
}

// ============================================================
// STATUS HELPERS
// ============================================================

function getStrategyStatus(strategy: StrategyState): {
  label: string;
  color: string;
  icon: React.ElementType;
} {
  if (strategy.isActive && strategy.isPaperTrading) {
    return { label: 'PAPER TRADING', color: 'text-emerald-400', icon: Play };
  }
  if (strategy.isActive) {
    return { label: 'LIVE', color: 'text-yellow-400', icon: Activity };
  }
  if (strategy.totalBacktests > 0) {
    return { label: 'TESTED', color: 'text-blue-400', icon: CheckCircle2 };
  }
  return { label: 'IDLE', color: 'text-[#64748b]', icon: Pause };
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    ALPHA_HUNTER: '#f59e0b',
    SMART_MONEY: '#10b981',
    TECHNICAL: '#3b82f6',
    DEFENSIVE: '#06b6d4',
    BOT_AWARE: '#8b5cf6',
    DEEP_ANALYSIS: '#ec4899',
    MICRO_STRUCTURE: '#f97316',
    ADAPTIVE: '#f43f5e',
  };
  return colors[category] || '#64748b';
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function StrategyStateTracker() {
  const { data: strategies, isLoading, refetch } = useQuery({
    queryKey: ['strategy-states'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/trading-systems');
        if (!res.ok) return [];
        const json = await res.json();
        return (json.data || []) as StrategyState[];
      } catch {
        return [];
      }
    },
    staleTime: 10000,
  });

  const allStrategies = strategies || [];

  // Group by status
  const activeStrategies = allStrategies.filter(s => s.isActive);
  const testedStrategies = allStrategies.filter(s => !s.isActive && s.totalBacktests > 0);
  const idleStrategies = allStrategies.filter(s => !s.isActive && s.totalBacktests === 0);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-[#0a0e17] border border-[#1e293b] rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1e293b] bg-[#0d1117]">
          <Activity className="h-4 w-4 text-[#d4af37]" />
          <span className="text-[#d4af37] font-mono text-sm font-bold tracking-wider">STRATEGY STATES</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-[#d4af37] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0e17] border border-[#1e293b] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e293b] bg-[#0d1117] shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#d4af37]" />
          <span className="text-[#d4af37] font-mono text-sm font-bold tracking-wider">STRATEGY STATES</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="text-[7px] h-3.5 px-1 font-mono bg-emerald-500/15 text-emerald-400 border-0">
            {activeStrategies.length} active
          </Badge>
          <Badge className="text-[7px] h-3.5 px-1 font-mono bg-blue-500/15 text-blue-400 border-0">
            {testedStrategies.length} tested
          </Badge>
          <Badge className="text-[7px] h-3.5 px-1 font-mono bg-[#1a1f2e] text-[#64748b] border-0">
            {idleStrategies.length} idle
          </Badge>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {allStrategies.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-[#64748b]">
              <Activity className="h-10 w-10 mb-3 text-[#2d3748]" />
              <span className="font-mono text-sm">No strategies yet</span>
              <span className="font-mono text-[10px] text-[#475569] mt-1">
                Generate strategies in the AI Manager to see them here
              </span>
            </div>
          ) : (
            <>
              {/* Active Strategies */}
              {activeStrategies.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Play className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Active</span>
                  </div>
                  <div className="space-y-1.5">
                    {activeStrategies.map(renderStrategyCard)}
                  </div>
                </div>
              )}

              {/* Tested Strategies */}
              {testedStrategies.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-3 w-3 text-blue-400" />
                    <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">Tested</span>
                  </div>
                  <div className="space-y-1.5">
                    {testedStrategies.slice(0, 10).map(renderStrategyCard)}
                  </div>
                </div>
              )}

              {/* Idle Strategies */}
              {idleStrategies.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Pause className="h-3 w-3 text-[#64748b]" />
                    <span className="text-[10px] font-mono text-[#64748b] uppercase tracking-wider">Idle</span>
                  </div>
                  <div className="space-y-1.5">
                    {idleStrategies.slice(0, 5).map(renderStrategyCard)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function renderStrategyCard(strategy: StrategyState) {
  const status = getStrategyStatus(strategy);
  const StatusIcon = status.icon;
  const catColor = getCategoryColor(strategy.category);

  return (
    <motion.div
      key={strategy.id}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-[#111827] border rounded-lg p-3 transition-all hover:border-[#2d3748] ${
        strategy.isActive ? 'border-emerald-500/30' : 'border-[#1e293b]'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{strategy.icon}</span>
          <span className="font-mono text-[11px] font-bold text-[#e2e8f0] max-w-[180px] truncate">
            {strategy.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusIcon className={`h-3 w-3 ${status.color}`} />
          <span className={`text-[8px] font-mono ${status.color}`}>{status.label}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        <Badge
          className="text-[7px] h-3.5 px-1 font-mono border-0"
          style={{ backgroundColor: `${catColor}20`, color: catColor }}
        >
          {strategy.category.replace(/_/g, ' ')}
        </Badge>
        {strategy.version > 1 && (
          <Badge className="text-[7px] h-3.5 px-1 font-mono bg-[#1a1f2e] text-[#94a3b8] border-0">
            v{strategy.version}
          </Badge>
        )}
        {strategy.parentSystemId && (
          <Badge className="text-[7px] h-3.5 px-1 font-mono bg-[#d4af37]/10 text-[#d4af37] border-0">
            evolved
          </Badge>
        )}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-4 gap-2 text-[9px] font-mono">
        <div>
          <span className="text-[#475569] uppercase block">Backtests</span>
          <span className="text-[#94a3b8]">{strategy.totalBacktests}</span>
        </div>
        <div>
          <span className="text-[#475569] uppercase block">Best Sharpe</span>
          <span className={strategy.bestSharpe > 1 ? 'text-emerald-400' : 'text-[#94a3b8]'}>
            {strategy.bestSharpe.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-[#475569] uppercase block">Best WR</span>
          <span className="text-[#94a3b8]">{(strategy.bestWinRate * 100).toFixed(0)}%</span>
        </div>
        <div>
          <span className="text-[#475569] uppercase block">Best PnL</span>
          <span className={strategy.bestPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {strategy.bestPnlPct >= 0 ? '+' : ''}{strategy.bestPnlPct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Last backtest info */}
      {strategy.lastBacktest && (
        <div className="mt-2 pt-2 border-t border-[#1e293b] flex items-center justify-between text-[8px] font-mono">
          <span className="text-[#475569]">
            Last: {strategy.lastBacktest.totalTrades} trades, {(strategy.lastBacktest.winRate * 100).toFixed(0)}% WR
          </span>
          <span className="text-[#475569]">
            {strategy.lastBacktest.completedAt
              ? new Date(strategy.lastBacktest.completedAt).toLocaleDateString()
              : 'Running...'}
          </span>
        </div>
      )}
    </motion.div>
  );
}
