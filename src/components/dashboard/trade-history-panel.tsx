'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  DollarSign,
  BarChart3,
  Activity,
  RefreshCw,
  Zap,
  Target,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface TradeRecord {
  id: string;
  systemId: string;
  systemName: string;
  tokenAddress: string;
  tokenSymbol: string;
  direction: string;
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
  pnlUsd: number | null;
  pnlPct: number | null;
  holdTimeMin: number | null;
  exitReason: string | null;
  mode: string;
}

interface OpenPosition {
  backtestId: string;
  systemId: string;
  systemName: string;
  tokenAddress: string;
  tokenSymbol: string;
  direction: string;
  entryPrice: number;
  entryTime: string;
  positionSizeUsd: number;
  quantity: number;
  unrealizedPnl: number;
}

// ============================================================
// HELPERS
// ============================================================

function formatPnl(value: number): string {
  return value >= 0 ? `+$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
}

function formatPct(value: number): string {
  return value >= 0 ? `+${value.toFixed(1)}%` : `${value.toFixed(1)}%`;
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes.toFixed(0)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
}

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function getExitReasonLabel(reason: string | null): { label: string; color: string } {
  if (!reason) return { label: 'Unknown', color: 'text-[#64748b]' };
  const r = reason.toLowerCase();
  if (r.includes('take_profit') || r.includes('tp')) return { label: 'Take Profit', color: 'text-emerald-400' };
  if (r.includes('stop_loss') || r.includes('sl')) return { label: 'Stop Loss', color: 'text-red-400' };
  if (r.includes('trailing')) return { label: 'Trailing Stop', color: 'text-yellow-400' };
  if (r.includes('time')) return { label: 'Time Exit', color: 'text-blue-400' };
  if (r.includes('signal')) return { label: 'Signal Exit', color: 'text-purple-400' };
  if (r.includes('manual')) return { label: 'Manual', color: 'text-cyan-400' };
  return { label: reason, color: 'text-[#94a3b8]' };
}

// ============================================================
// MINI CHART COMPONENT (Entry/Exit visualization)
// ============================================================

function TradeChart({ trades }: { trades: TradeRecord[] }) {
  if (trades.length === 0) return null;

  // Group PnL by time to create a cumulative equity curve
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime(),
  );

  let cumulativePnl = 0;
  const points = sortedTrades.map((trade, i) => {
    cumulativePnl += (trade.pnlUsd || 0);
    return {
      x: i,
      y: cumulativePnl,
      trade,
      isWin: (trade.pnlPct || 0) > 0,
    };
  });

  const minY = Math.min(0, ...points.map(p => p.y));
  const maxY = Math.max(0, ...points.map(p => p.y));
  const rangeY = maxY - minY || 1;

  const chartWidth = 100;
  const chartHeight = 40;

  // Build SVG path
  const pathD = points.map((p, i) => {
    const x = (i / Math.max(points.length - 1, 1)) * chartWidth;
    const y = chartHeight - ((p.y - minY) / rangeY) * chartHeight;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Zero line Y position
  const zeroY = chartHeight - ((0 - minY) / rangeY) * chartHeight;

  return (
    <div className="bg-[#0a0e17] border border-[#1e293b] rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-3.5 w-3.5 text-[#d4af37]" />
        <span className="text-[10px] font-mono text-[#94a3b8] uppercase tracking-wider">Equity Curve</span>
        <Badge className="text-[7px] h-3.5 px-1 font-mono bg-[#1a1f2e] text-[#64748b] border-[#2d3748]">
          {trades.length} trades
        </Badge>
      </div>

      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-24" preserveAspectRatio="none">
        {/* Zero line */}
        <line x1="0" y1={zeroY} x2={chartWidth} y2={zeroY} stroke="#2d3748" strokeWidth="0.3" strokeDasharray="1,1" />

        {/* Area fill under curve */}
        {points.length > 1 && (
          <path
            d={`${pathD} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`}
            fill="url(#equityGradient)"
            opacity="0.3"
          />
        )}

        {/* Line */}
        {points.length > 1 && (
          <path d={pathD} fill="none" stroke={cumulativePnl >= 0 ? '#10b981' : '#ef4444'} strokeWidth="0.8" />
        )}

        {/* Entry/Exit dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={(i / Math.max(points.length - 1, 1)) * chartWidth}
            cy={chartHeight - ((p.y - minY) / rangeY) * chartHeight}
            r="0.8"
            fill={p.isWin ? '#10b981' : '#ef4444'}
            opacity="0.8"
          />
        ))}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="equityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={cumulativePnl >= 0 ? '#10b981' : '#ef4444'} stopOpacity="0.4" />
            <stop offset="100%" stopColor={cumulativePnl >= 0 ? '#10b981' : '#ef4444'} stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2 mt-2">
        <div>
          <span className="text-[8px] font-mono text-[#64748b] uppercase block">Total PnL</span>
          <span className={`text-[10px] font-mono font-bold ${cumulativePnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatPnl(cumulativePnl)}
          </span>
        </div>
        <div>
          <span className="text-[8px] font-mono text-[#64748b] uppercase block">Win Rate</span>
          <span className="text-[10px] font-mono font-bold text-[#e2e8f0]">
            {trades.length > 0 ? ((trades.filter(t => (t.pnlPct || 0) > 0).length / trades.length) * 100).toFixed(0) : 0}%
          </span>
        </div>
        <div>
          <span className="text-[8px] font-mono text-[#64748b] uppercase block">Best Trade</span>
          <span className="text-[10px] font-mono font-bold text-emerald-400">
            {formatPct(Math.max(...trades.map(t => t.pnlPct || 0)))}
          </span>
        </div>
        <div>
          <span className="text-[8px] font-mono text-[#64748b] uppercase block">Worst Trade</span>
          <span className="text-[10px] font-mono font-bold text-red-400">
            {formatPct(Math.min(...trades.map(t => t.pnlPct || 0)))}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function TradeHistoryPanel() {
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [filterDirection, setFilterDirection] = useState<string>('ALL');
  const [tab, setTab] = useState<'history' | 'positions'>('history');

  const { data: tradeHistory, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['trade-history'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/strategy-optimizer/evolve?type=trade_history&limit=100');
        if (!res.ok) return [];
        const json = await res.json();
        return (json.data || []) as TradeRecord[];
      } catch {
        return [];
      }
    },
    staleTime: 10000,
  });

  const { data: openPositions, isLoading: positionsLoading, refetch: refetchPositions } = useQuery({
    queryKey: ['open-positions'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/strategy-optimizer/evolve?type=open_positions');
        if (!res.ok) return [];
        const json = await res.json();
        return (json.data || []) as OpenPosition[];
      } catch {
        return [];
      }
    },
    staleTime: 10000,
  });

  const trades = tradeHistory || [];
  const positions = openPositions || [];

  // Filter trades
  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      if (filterMode !== 'ALL' && t.mode !== filterMode) return false;
      if (filterDirection !== 'ALL' && t.direction !== filterDirection) return false;
      return true;
    });
  }, [trades, filterMode, filterDirection]);

  const handleRefresh = () => {
    refetchHistory();
    refetchPositions();
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0e17] border border-[#1e293b] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e293b] bg-[#0d1117] shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#d4af37]" />
          <span className="text-[#d4af37] font-mono text-sm font-bold tracking-wider">TRADE HISTORY</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex bg-[#111827] border border-[#1e293b] rounded-md overflow-hidden">
            <button
              onClick={() => setTab('history')}
              className={`px-2.5 py-1 text-[9px] font-mono transition-all ${
                tab === 'history' ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'text-[#64748b] hover:text-[#94a3b8]'
              }`}
            >
              History ({trades.length})
            </button>
            <button
              onClick={() => setTab('positions')}
              className={`px-2.5 py-1 text-[9px] font-mono transition-all ${
                tab === 'positions' ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'text-[#64748b] hover:text-[#94a3b8]'
              }`}
            >
              Open ({positions.length})
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-6 px-2 text-[10px] font-mono text-[#64748b] hover:text-[#e2e8f0]"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <AnimatePresence mode="wait">
            {tab === 'history' ? (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {/* Equity Chart */}
                {filteredTrades.length > 0 && (
                  <TradeChart trades={filteredTrades} />
                )}

                {/* Filters */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-mono text-[#475569]">Mode:</span>
                    <Select value={filterMode} onValueChange={setFilterMode}>
                      <SelectTrigger className="h-5 w-20 text-[9px] font-mono bg-[#0a0e17] border-[#1e293b] text-[#94a3b8]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1f2e] border-[#2d3748]">
                        <SelectItem value="ALL" className="text-[9px] font-mono">All</SelectItem>
                        <SelectItem value="HISTORICAL" className="text-[9px] font-mono">Backtest</SelectItem>
                        <SelectItem value="PAPER" className="text-[9px] font-mono">Paper</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-mono text-[#475569]">Dir:</span>
                    <Select value={filterDirection} onValueChange={setFilterDirection}>
                      <SelectTrigger className="h-5 w-16 text-[9px] font-mono bg-[#0a0e17] border-[#1e293b] text-[#94a3b8]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1f2e] border-[#2d3748]">
                        <SelectItem value="ALL" className="text-[9px] font-mono">All</SelectItem>
                        <SelectItem value="LONG" className="text-[9px] font-mono">Long</SelectItem>
                        <SelectItem value="SHORT" className="text-[9px] font-mono">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Trade List */}
                {filteredTrades.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-[#64748b]">
                    <BarChart3 className="h-10 w-10 mb-3 text-[#2d3748]" />
                    <span className="font-mono text-sm">No trade history yet</span>
                    <span className="font-mono text-[10px] text-[#475569] mt-1">Run backtests or activate paper trading to see results</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredTrades.map((trade) => {
                      const isWin = (trade.pnlPct || 0) > 0;
                      const exitInfo = getExitReasonLabel(trade.exitReason);

                      return (
                        <motion.div
                          key={trade.id}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`bg-[#111827] border rounded-lg p-3 transition-all hover:border-[#2d3748] ${
                            isWin ? 'border-emerald-500/20' : 'border-red-500/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {isWin ? (
                                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                              )}
                              <span className="font-mono text-xs font-bold text-[#e2e8f0] max-w-[180px] truncate">
                                {trade.tokenSymbol || trade.tokenAddress.slice(0, 8)}
                              </span>
                              <Badge className={`text-[7px] h-3.5 px-1 font-mono border-0 ${
                                trade.direction === 'LONG' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                              }`}>
                                {trade.direction}
                              </Badge>
                              <Badge className="text-[7px] h-3.5 px-1 font-mono bg-[#1a1f2e] text-[#64748b] border-0">
                                {trade.mode}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`font-mono text-xs font-bold ${isWin ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatPct(trade.pnlPct || 0)}
                              </span>
                              <span className={`font-mono text-[10px] ${isWin ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                                {formatPnl(trade.pnlUsd || 0)}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-5 gap-2 text-[9px] font-mono">
                            <div>
                              <span className="text-[#475569] uppercase block">Entry</span>
                              <span className="text-[#94a3b8]">${trade.entryPrice.toFixed(4)}</span>
                            </div>
                            <div>
                              <span className="text-[#475569] uppercase block">Exit</span>
                              <span className="text-[#94a3b8]">${trade.exitPrice.toFixed(4)}</span>
                            </div>
                            <div>
                              <span className="text-[#475569] uppercase block">Hold</span>
                              <span className="text-[#94a3b8]">{formatDuration(trade.holdTimeMin)}</span>
                            </div>
                            <div>
                              <span className="text-[#475569] uppercase block">Exit</span>
                              <span className={exitInfo.color}>{exitInfo.label}</span>
                            </div>
                            <div>
                              <span className="text-[#475569] uppercase block">Time</span>
                              <span className="text-[#94a3b8]">{formatTime(trade.exitTime)}</span>
                            </div>
                          </div>

                          <div className="mt-1.5 text-[8px] font-mono text-[#475569]">
                            {trade.systemName}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="positions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {positions.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-[#64748b]">
                    <Target className="h-10 w-10 mb-3 text-[#2d3748]" />
                    <span className="font-mono text-sm">No open positions</span>
                    <span className="font-mono text-[10px] text-[#475569] mt-1">Activate strategies to start paper trading</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {positions.map((pos) => (
                      <div key={pos.backtestId} className="bg-[#111827] border border-[#d4af37]/20 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-3.5 w-3.5 text-[#d4af37]" />
                            <span className="font-mono text-xs font-bold text-[#e2e8f0]">
                              {pos.tokenSymbol || pos.tokenAddress.slice(0, 8)}
                            </span>
                            <Badge className={`text-[7px] h-3.5 px-1 font-mono border-0 ${
                              pos.direction === 'LONG' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                            }`}>
                              {pos.direction}
                            </Badge>
                          </div>
                          <Badge className="text-[8px] h-4 px-1.5 font-mono bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30">
                            OPEN
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-[9px] font-mono">
                          <div>
                            <span className="text-[#475569] uppercase block">Entry</span>
                            <span className="text-[#94a3b8]">${pos.entryPrice.toFixed(4)}</span>
                          </div>
                          <div>
                            <span className="text-[#475569] uppercase block">Size</span>
                            <span className="text-[#94a3b8]">${pos.positionSizeUsd.toFixed(0)}</span>
                          </div>
                          <div>
                            <span className="text-[#475569] uppercase block">Qty</span>
                            <span className="text-[#94a3b8]">{pos.quantity.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-[#475569] uppercase block">Since</span>
                            <span className="text-[#94a3b8]">{formatTime(pos.entryTime)}</span>
                          </div>
                        </div>
                        <div className="mt-1.5 text-[8px] font-mono text-[#475569]">
                          {pos.systemName}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
