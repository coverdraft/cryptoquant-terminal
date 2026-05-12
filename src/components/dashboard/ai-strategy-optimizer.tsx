'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Zap,
  Scan,
  Brain,
  Trophy,
  Play,
  Loader2,
  Star,
  BookmarkPlus,
  Rocket,
  Target,
  BarChart3,
  Activity,
  DollarSign,
  Trash2,
  RefreshCw,
  Sparkles,
  Filter,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface TokenCandidate {
  id: string;
  symbol: string;
  name: string;
  address: string;
  chain: string;
  priceUsd: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  priceChange24h: number;
  riskScore: number;
  phase: string | null;
  dnaRiskLevel: string;
  smartMoneyPct: number;
  botActivityPct: number;
  signalCount: number;
  tokenAgeCategory: 'NEW' | 'MEDIUM' | 'OLD';
}

interface StrategyConfig {
  id: string;
  name: string;
  category: string;
  icon: string;
  timeframe: string;
  tokenAgeCategory: string;
  riskTolerance: string;
  capitalAllocation: number;
  config: Record<string, unknown>;
}

interface RankResult {
  id: string;
  backtestId: string;
  strategyName: string;
  category: string;
  timeframe: string;
  tokenAgeCategory: string;
  riskTolerance: string;
  capitalAllocation: number;
  pnlPct: number;
  pnlUsd: number;
  sharpeRatio: number;
  winRate: number;
  maxDrawdownPct: number;
  profitFactor: number;
  totalTrades: number;
  avgHoldTimeMin: number;
  score: number;
  status: string;
  rank?: number;
}

interface BestStrategy {
  id: string;
  strategyName: string;
  category: string;
  timeframe: string;
  tokenAgeCategory: string;
  riskTolerance: string;
  capitalAllocation: number;
  pnlPct: number;
  pnlUsd: number;
  sharpeRatio: number;
  winRate: number;
  maxDrawdownPct: number;
  profitFactor: number;
  totalTrades: number;
  avgHoldTimeMin: number;
  score: number;
  backtestId: string;
  savedAt: string;
}



// ============================================================
// CONSTANTS
// ============================================================

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  LOW: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  MEDIUM: { bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  HIGH: { bg: 'bg-orange-500/15', text: 'text-orange-400' },
  EXTREME: { bg: 'bg-red-500/15', text: 'text-red-400' },
};

const TIMEFRAMES = ['1m', '5m', '10m', '15m', '30m', '1h', '4h'];
const TOKEN_AGES = ['NEW', 'MEDIUM', 'OLD'];
const RISK_LEVELS = ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'];

type Step = 'setup' | 'scanning' | 'generating' | 'running' | 'results';

// Pipeline node definitions
const PIPELINE_NODES: { step: Step; emoji: string; label: string }[] = [
  { step: 'setup', emoji: '💰', label: 'Capital' },
  { step: 'scanning', emoji: '🔍', label: 'Scan' },
  { step: 'generating', emoji: '⚡', label: 'Generate' },
  { step: 'running', emoji: '🔄', label: 'Backtest' },
  { step: 'results', emoji: '🏆', label: 'Rank' },
];

const STEP_ORDER: Step[] = ['setup', 'scanning', 'generating', 'running', 'results'];

const CATEGORY_COLORS: Record<string, string> = {
  momentum: '#f59e0b',
  mean_reversion: '#06b6d4',
  breakout: '#8b5cf6',
  scalping: '#ef4444',
  trend_following: '#10b981',
  volatility: '#f97316',
  smart_money: '#d4af37',
  default: '#64748b',
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category.toLowerCase()] || CATEGORY_COLORS.default;
}

// ============================================================
// PIPELINE NODE COMPONENT
// ============================================================

function PipelineNode({
  emoji,
  label,
  status,
  isLast,
}: {
  emoji: string;
  label: string;
  status: 'idle' | 'active' | 'done';
  isLast: boolean;
}) {
  return (
    <div className="flex items-center">
      <motion.div
        className="flex flex-col items-center gap-1"
        initial={false}
        animate={{ scale: status === 'active' ? 1.1 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-base border-2 transition-all duration-300 ${
            status === 'done'
              ? 'bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
              : status === 'active'
              ? 'bg-[#d4af37]/20 border-[#d4af37]/60 shadow-lg shadow-[#d4af37]/10'
              : 'bg-[#111827] border-[#1e293b]'
          }`}
        >
          {status === 'done' ? (
            <Check className="h-4 w-4 text-emerald-400" />
          ) : status === 'active' ? (
            <Loader2 className="h-4 w-4 text-[#d4af37] animate-spin" />
          ) : (
            <span>{emoji}</span>
          )}
        </div>
        <span
          className={`text-[9px] font-mono font-semibold tracking-wider ${
            status === 'done'
              ? 'text-emerald-400'
              : status === 'active'
              ? 'text-[#d4af37]'
              : 'text-[#475569]'
          }`}
        >
          {label.toUpperCase()}
        </span>
      </motion.div>
      {!isLast && (
        <div className="relative w-8 h-px mx-1 flex items-center">
          <div className={`w-full h-px ${status === 'done' ? 'bg-emerald-500/50' : 'bg-[#1e293b]'}`} />
          {status === 'done' && (
            <motion.div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-px bg-emerald-500/50"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.5 }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// STRATEGY CARD COMPONENT (with inline editing)
// ============================================================

function StrategyCard({
  strategy,
  onEdit,
  onRemove,
  isSelected,
  onToggleSelect,
  status,
}: {
  strategy: StrategyConfig;
  onEdit: (id: string, field: string, value: number) => void;
  onRemove: (id: string) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  status: 'pending' | 'testing' | 'done' | 'failed';
}) {
  const [expanded, setExpanded] = useState(false);

  const tp = (strategy.config?.exitSignal as Record<string, unknown>)?.takeProfit as number || 40;
  const sl = (strategy.config?.exitSignal as Record<string, unknown>)?.stopLoss as number || 15;
  const posSize = (strategy.config?.riskManagement as Record<string, unknown>)?.maxPositionSize as number || 5;
  const catColor = getCategoryColor(strategy.category);

  const statusConfig = {
    pending: { icon: <Activity className="h-3 w-3" />, color: 'text-[#64748b]', bg: 'bg-[#1a1f2e]' },
    testing: { icon: <Loader2 className="h-3 w-3 animate-spin" />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    done: { icon: <Check className="h-3 w-3" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    failed: { icon: <X className="h-3 w-3" />, color: 'text-red-400', bg: 'bg-red-500/10' },
  };
  const statusInfo = statusConfig[status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`bg-[#111827] border rounded-lg transition-all ${
        isSelected ? 'border-[#d4af37]/50 shadow-md shadow-[#d4af37]/5' : 'border-[#1e293b] hover:border-[#2d3748]'
      }`}
    >
      <div className="p-3">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-2">
          {/* Selection checkbox */}
          <button
            onClick={() => onToggleSelect(strategy.id)}
            className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
              isSelected
                ? 'bg-[#d4af37] border-[#d4af37] text-[#0a0e17]'
                : 'border-[#2d3748] hover:border-[#d4af37]/50'
            }`}
          >
            {isSelected && <Check className="h-2.5 w-2.5" />}
          </button>
          <span className="text-sm">{strategy.icon}</span>
          <span className="font-mono text-[11px] text-[#e2e8f0] flex-1 truncate font-semibold">
            {strategy.name}
          </span>
          {/* Status indicator */}
          <Badge className={`text-[8px] h-4 px-1.5 font-mono ${statusInfo.bg} ${statusInfo.color} border-0`}>
            {statusInfo.icon}
            <span className="ml-0.5">{status.toUpperCase()}</span>
          </Badge>
          {/* Remove */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onRemove(strategy.id)}
                className="h-5 w-5 flex items-center justify-center text-[#475569] hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Remove Strategy</TooltipContent>
          </Tooltip>
        </div>

        {/* Tags row */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <Badge
            className="text-[8px] h-4 px-1.5 font-mono border-0"
            style={{ backgroundColor: `${catColor}20`, color: catColor }}
          >
            {strategy.category}
          </Badge>
          <Badge className="text-[8px] h-4 px-1.5 font-mono bg-[#1a1f2e] text-[#94a3b8] border-0">
            {strategy.timeframe}
          </Badge>
          <Badge className="text-[8px] h-4 px-1.5 font-mono bg-[#1a1f2e] text-[#94a3b8] border-0">
            {strategy.tokenAgeCategory === 'NEW' ? '<24h' : strategy.tokenAgeCategory === 'MEDIUM' ? '<30d' : '>30d'}
          </Badge>
          <Badge className="text-[8px] h-4 px-1.5 font-mono bg-[#1a1f2e] text-[#94a3b8] border-0">
            ${strategy.capitalAllocation.toFixed(0)}
          </Badge>
        </div>

        {/* Inline Quick-Edit: TP / SL / Position Size */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[8px] font-mono text-[#475569] uppercase block mb-0.5">TP%</label>
            <Input
              type="number"
              value={tp}
              onChange={e => onEdit(strategy.id, 'takeProfit', Number(e.target.value))}
              className="h-6 text-[10px] font-mono bg-[#0a0e17] border-[#1e293b] text-emerald-400 px-1.5 py-0"
            />
          </div>
          <div>
            <label className="text-[8px] font-mono text-[#475569] uppercase block mb-0.5">SL%</label>
            <Input
              type="number"
              value={sl}
              onChange={e => onEdit(strategy.id, 'stopLoss', Number(e.target.value))}
              className="h-6 text-[10px] font-mono bg-[#0a0e17] border-[#1e293b] text-red-400 px-1.5 py-0"
            />
          </div>
          <div>
            <label className="text-[8px] font-mono text-[#475569] uppercase block mb-0.5">Size%</label>
            <Input
              type="number"
              value={posSize}
              onChange={e => onEdit(strategy.id, 'positionSize', Number(e.target.value))}
              className="h-6 text-[10px] font-mono bg-[#0a0e17] border-[#1e293b] text-[#d4af37] px-1.5 py-0"
            />
          </div>
        </div>

        {/* Expand/collapse for more edit options */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center mt-2 text-[#475569] hover:text-[#94a3b8] transition-colors"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2 border-t border-[#1e293b] mt-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] font-mono text-[#475569] uppercase block mb-0.5">Name</label>
                    <Input
                      value={strategy.name}
                      onChange={e => onEdit(strategy.id, 'name', e.target.value as unknown as number)}
                      className="h-6 text-[10px] font-mono bg-[#0a0e17] border-[#1e293b] text-[#e2e8f0] px-1.5 py-0"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-mono text-[#475569] uppercase block mb-0.5">Allocation $</label>
                    <Input
                      type="number"
                      value={strategy.capitalAllocation}
                      onChange={e => onEdit(strategy.id, 'capitalAllocation', Number(e.target.value))}
                      className="h-6 text-[10px] font-mono bg-[#0a0e17] border-[#1e293b] text-[#d4af37] px-1.5 py-0"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ============================================================
// PORTFOLIO SUMMARY COMPONENT
// ============================================================

function PortfolioSummary({
  results,
  capital,
}: {
  results: RankResult[];
  capital: number;
}) {
  if (results.length === 0) return null;

  const totalPnl = results.reduce((sum, r) => sum + r.pnlUsd, 0);
  const avgSharpe = results.reduce((sum, r) => sum + r.sharpeRatio, 0) / results.length;
  const avgWinRate = results.reduce((sum, r) => sum + r.winRate, 0) / results.length;
  const totalAllocated = results.reduce((sum, r) => sum + r.capitalAllocation, 0);
  const avgDrawdown = results.reduce((sum, r) => sum + r.maxDrawdownPct, 0) / results.length;

  // Group by risk tolerance
  const riskGroups = results.reduce((acc, r) => {
    const key = r.riskTolerance;
    if (!acc[key]) acc[key] = { count: 0, allocation: 0 };
    acc[key].count++;
    acc[key].allocation += r.capitalAllocation;
    return acc;
  }, {} as Record<string, { count: number; allocation: number }>);

  const riskColors: Record<string, string> = {
    CONSERVATIVE: '#10b981',
    MODERATE: '#f59e0b',
    AGGRESSIVE: '#ef4444',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0d1117] border border-[#1e293b] rounded-lg p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Layers className="h-3.5 w-3.5 text-[#d4af37]" />
        <span className="text-[11px] font-mono text-[#94a3b8] uppercase tracking-wider">Portfolio Summary</span>
        <Badge className="text-[8px] h-4 px-1.5 font-mono bg-[#1a1f2e] text-[#64748b] border-[#2d3748]">
          {results.length} strategies
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-3 text-center">
          <div className="text-[8px] font-mono text-[#64748b] uppercase mb-1">Total PnL</div>
          <div className={`text-sm font-mono font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(0)}
          </div>
        </div>
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-3 text-center">
          <div className="text-[8px] font-mono text-[#64748b] uppercase mb-1">Avg Sharpe</div>
          <div className="text-sm font-mono font-bold text-[#d4af37]">{avgSharpe.toFixed(2)}</div>
        </div>
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-3 text-center">
          <div className="text-[8px] font-mono text-[#64748b] uppercase mb-1">Avg Win Rate</div>
          <div className="text-sm font-mono font-bold text-cyan-400">{(avgWinRate * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-3 text-center">
          <div className="text-[8px] font-mono text-[#64748b] uppercase mb-1">Avg Drawdown</div>
          <div className="text-sm font-mono font-bold text-red-400">{avgDrawdown.toFixed(1)}%</div>
        </div>
      </div>

      {/* Capital Allocation Breakdown (simulated pie with colored bars) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[9px] font-mono text-[#64748b]">
          <span>Capital Allocation</span>
          <span>${totalAllocated.toFixed(0)} / ${capital.toLocaleString()}</span>
        </div>
        <div className="h-4 bg-[#1a1f2e] rounded-full overflow-hidden flex">
          {results.slice(0, 10).map((r, i) => (
            <div
              key={r.id}
              className="h-full transition-all duration-500 relative group"
              style={{
                width: `${Math.max((r.capitalAllocation / capital) * 100, 1)}%`,
                backgroundColor: getCategoryColor(r.category),
                opacity: 0.7 + (0.3 * (1 - i / results.length)),
              }}
              title={`${r.strategyName}: $${r.capitalAllocation.toFixed(0)}`}
            />
          ))}
        </div>

        {/* Risk Distribution */}
        <div className="mt-3">
          <div className="text-[9px] font-mono text-[#64748b] mb-1.5">Risk Distribution</div>
          <div className="space-y-1.5">
            {Object.entries(riskGroups).map(([risk, data]) => (
              <div key={risk} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: riskColors[risk] || '#64748b' }}
                />
                <span className="text-[9px] font-mono text-[#94a3b8] w-24">{risk}</span>
                <div className="flex-1 h-2 bg-[#1a1f2e] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(data.allocation / capital) * 100}%`,
                      backgroundColor: riskColors[risk] || '#64748b',
                      opacity: 0.6,
                    }}
                  />
                </div>
                <span className="text-[8px] font-mono text-[#64748b] w-8 text-right">
                  {data.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AIStrategyOptimizer() {
  const queryClient = useQueryClient();

  // State
  const [capital, setCapital] = useState(10000);
  const [allocationMode, setAllocationMode] = useState<'distribute' | 'focus'>('distribute');
  const [selectedTimeframes, setSelectedTimeframes] = useState<string[]>(['5m', '15m', '1h']);
  const [selectedTokenAges, setSelectedTokenAges] = useState<string[]>(['NEW', 'MEDIUM']);
  const [riskTolerance, setRiskTolerance] = useState('MODERATE');
  const [strategyCount, setStrategyCount] = useState(6);
  const [currentStep, setCurrentStep] = useState<Step>('setup');
  const [generatedStrategies, setGeneratedStrategies] = useState<StrategyConfig[]>([]);
  const [loopResults, setLoopResults] = useState<Array<{ strategyId: string; strategyName: string; backtestId: string | null; status: string; error?: string }>>([]);

  // Selected strategies for grouping
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<Set<string>>(new Set());
  const [groupFilter, setGroupFilter] = useState<string>('all');


  // Results filter state
  const [filterTimeframe, setFilterTimeframe] = useState<string>('ALL');
  const [filterTokenAge, setFilterTokenAge] = useState<string>('ALL');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');

  // Activate count
  const [activateTopN, setActivateTopN] = useState(3);

  // Auto-running state
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoRunPhase, setAutoRunPhase] = useState<string>('');

  // Queries
  const { data: scanData, isLoading: scanLoading, refetch: refetchScan } = useQuery({
    queryKey: ['strategy-optimizer-scan'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/strategy-optimizer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'scan' }),
        });
        if (!res.ok) throw new Error('Scan failed');
        const json = await res.json();
        return json.data as { tokens: TokenCandidate[]; dnaProfiles: number; activeSignals: number; lifecyclePhases: Record<string, number>; behaviorModels: number } | null;
      } catch {
        return null;
      }
    },
    enabled: false,
  });

  const { data: rankData, isLoading: rankLoading, refetch: refetchRank } = useQuery({
    queryKey: ['strategy-optimizer-rank'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/strategy-optimizer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'rank_results', sortBy: 'score' }),
        });
        if (!res.ok) throw new Error('Rank failed');
        const json = await res.json();
        return json.data as { results: RankResult[]; totalRanked: number } | null;
      } catch {
        return null;
      }
    },
    enabled: false,
  });

  const { data: bestData } = useQuery({
    queryKey: ['strategy-optimizer-best'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/strategy-optimizer/best');
        if (!res.ok) return [];
        const json = await res.json();
        return (json.data || []) as BestStrategy[];
      } catch {
        return [];
      }
    },
    staleTime: 10000,
  });

  // Mutations
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/strategy-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_strategies',
          capital,
          timeframes: selectedTimeframes,
          tokenAges: selectedTokenAges,
          riskTolerance,
          allocationMode,
          strategyCount,
        }),
      });
      if (!res.ok) throw new Error('Generate failed');
      return res.json();
    },
    onSuccess: (data) => {
      const strategies = (data.data?.strategies || []) as StrategyConfig[];
      setGeneratedStrategies(strategies);
      // Auto-select all strategies
      setSelectedStrategyIds(new Set(strategies.map(s => s.id)));
      toast.success(`Generated ${strategies.length} strategies`);
    },
    onError: () => {
      toast.error('Failed to generate strategies');
    },
  });

  const runLoopMutation = useMutation({
    mutationFn: async () => {
      // Only run selected strategies
      const strategiesToRun = generatedStrategies.filter(s => selectedStrategyIds.has(s.id));
      if (strategiesToRun.length === 0) {
        throw new Error('No strategies selected');
      }
      const res = await fetch('/api/strategy-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run_loop',
          strategies: strategiesToRun,
          capital,
        }),
      });
      if (!res.ok) throw new Error('Run loop failed');
      return res.json();
    },
    onSuccess: (data) => {
      const results = data.data?.results || [];
      setLoopResults(results);
      toast.success(`Created ${results.filter((r: { backtestId: string | null }) => r.backtestId).length} backtests`);
      setCurrentStep('results');
      refetchRank();
      setAutoRunning(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to run optimization loop');
      setCurrentStep('results');
      setAutoRunning(false);
    },
  });

  const saveBestMutation = useMutation({
    mutationFn: async (strategy: RankResult) => {
      const res = await fetch('/api/strategy-optimizer/best', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy }),
      });
      if (!res.ok) throw new Error('Save failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Strategy saved to Hall of Fame');
      queryClient.invalidateQueries({ queryKey: ['strategy-optimizer-best'] });
    },
    onError: () => {
      toast.error('Failed to save strategy');
    },
  });

  const deleteBestMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/strategy-optimizer/best', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Delete failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Strategy removed');
      queryClient.invalidateQueries({ queryKey: ['strategy-optimizer-best'] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (strategy: BestStrategy) => {
      const res = await fetch(`/api/trading-systems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `[AI] ${strategy.strategyName}`,
          category: strategy.category,
          config: {
            assetFilter: { minLiquidity: 50000, minVolume24h: 10000, maxMarketCap: 10000000, chains: ['SOL', 'ETH', 'BASE'], tokenAge: strategy.tokenAgeCategory === 'NEW' ? '<24H' : strategy.tokenAgeCategory === 'MEDIUM' ? '<30D' : '>30D' },
            phaseConfig: { genesis: strategy.tokenAgeCategory === 'NEW', early: true, growth: true, maturity: strategy.tokenAgeCategory === 'OLD', decline: false },
            entrySignal: { signalType: 'SMART_MONEY_ENTRY', confidenceThreshold: 70, confirmationRequired: true, timeWindow: 15 },
            execution: { orderType: 'LIMIT', slippageTolerance: 1.5, maxPositionSize: strategy.capitalAllocation > 0 ? Math.round(strategy.capitalAllocation * 100 / 10000) : 5, executionDelay: 0 },
            exitSignal: { takeProfit: strategy.pnlPct > 0 ? Math.round(strategy.pnlPct * 0.6) : 25, stopLoss: strategy.maxDrawdownPct > 0 ? Math.round(strategy.maxDrawdownPct * 0.5) : 10, trailingStop: true, trailingStopPercent: 10, timeBasedExit: 1440 },
            riskManagement: { maxDrawdown: strategy.maxDrawdownPct || 20, maxConcurrentTrades: 3, maxDailyLoss: 5, positionSizing: 'RISK_BASED' },
            capitalAllocation: { method: 'risk_parity', percentage: Math.round(strategy.capitalAllocation / 100), maxAllocation: 2, rebalanceFrequency: 'DAILY' },
            bigDataContext: { whaleTracking: true, smartMoneyMirror: true, botDetection: true, onChainMetrics: true, socialSentiment: false },
          },
          primaryTimeframe: strategy.timeframe || '15m',
          maxPositionPct: strategy.capitalAllocation > 0 ? Math.round(strategy.capitalAllocation * 100 / 10000) : 5,
          stopLossPct: strategy.maxDrawdownPct > 0 ? Math.round(strategy.maxDrawdownPct * 0.5) : 10,
          takeProfitPct: strategy.pnlPct > 0 ? Math.round(strategy.pnlPct * 0.6) : 25,
        }),
      });
      if (!res.ok) throw new Error('Failed to activate');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Strategy activated as trading system!');
      queryClient.invalidateQueries({ queryKey: ['trading-systems'] });
    },
    onError: () => {
      toast.error('Failed to activate strategy');
    },
  });

  // Activate top N strategies at once
  const activateAllMutation = useMutation({
    mutationFn: async ({ strategies, count }: { strategies: BestStrategy[]; count: number }) => {
      const toActivate = strategies.slice(0, count);
      const results = await Promise.allSettled(
        toActivate.map(async (strategy) => {
          const res = await fetch(`/api/trading-systems`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `[AI] ${strategy.strategyName}`,
              category: strategy.category,
              config: {
                assetFilter: { minLiquidity: 50000, minVolume24h: 10000, maxMarketCap: 10000000, chains: ['SOL', 'ETH', 'BASE'], tokenAge: strategy.tokenAgeCategory === 'NEW' ? '<24H' : strategy.tokenAgeCategory === 'MEDIUM' ? '<30D' : '>30D' },
                phaseConfig: { genesis: strategy.tokenAgeCategory === 'NEW', early: true, growth: true, maturity: strategy.tokenAgeCategory === 'OLD', decline: false },
                entrySignal: { signalType: 'SMART_MONEY_ENTRY', confidenceThreshold: 70, confirmationRequired: true, timeWindow: 15 },
                execution: { orderType: 'LIMIT', slippageTolerance: 1.5, maxPositionSize: strategy.capitalAllocation > 0 ? Math.round(strategy.capitalAllocation * 100 / 10000) : 5, executionDelay: 0 },
                exitSignal: { takeProfit: strategy.pnlPct > 0 ? Math.round(strategy.pnlPct * 0.6) : 25, stopLoss: strategy.maxDrawdownPct > 0 ? Math.round(strategy.maxDrawdownPct * 0.5) : 10, trailingStop: true, trailingStopPercent: 10, timeBasedExit: 1440 },
                riskManagement: { maxDrawdown: strategy.maxDrawdownPct || 20, maxConcurrentTrades: 3, maxDailyLoss: 5, positionSizing: 'RISK_BASED' },
                capitalAllocation: { method: 'risk_parity', percentage: Math.round(strategy.capitalAllocation / 100), maxAllocation: 2, rebalanceFrequency: 'DAILY' },
                bigDataContext: { whaleTracking: true, smartMoneyMirror: true, botDetection: true, onChainMetrics: true, socialSentiment: false },
              },
              primaryTimeframe: strategy.timeframe || '15m',
              maxPositionPct: strategy.capitalAllocation > 0 ? Math.round(strategy.capitalAllocation * 100 / 10000) : 5,
              stopLossPct: strategy.maxDrawdownPct > 0 ? Math.round(strategy.maxDrawdownPct * 0.5) : 10,
              takeProfitPct: strategy.pnlPct > 0 ? Math.round(strategy.pnlPct * 0.6) : 25,
            }),
          });
          if (!res.ok) throw new Error(`Failed to activate ${strategy.strategyName}`);
          return res.json();
        })
      );
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      return { succeeded, total: toActivate.length };
    },
    onSuccess: ({ succeeded, total }) => {
      toast.success(`🚀 Activated ${succeeded}/${total} strategies!`);
      queryClient.invalidateQueries({ queryKey: ['trading-systems'] });
    },
    onError: () => {
      toast.error('Failed to activate strategies');
    },
  });

  // Handlers
  const handleScan = useCallback(() => {
    setCurrentStep('scanning');
    refetchScan();
  }, [refetchScan]);

  const handleGenerate = useCallback(() => {
    setCurrentStep('generating');
    generateMutation.mutate();
  }, [generateMutation]);

  const handleRunLoop = useCallback(() => {
    if (selectedStrategyIds.size === 0) {
      toast.error('Select at least one strategy to backtest');
      return;
    }
    setCurrentStep('running');
    runLoopMutation.mutate();
  }, [runLoopMutation, selectedStrategyIds]);

  const handleQuickStart = useCallback(() => {
    setCapital(10000);
    setAllocationMode('distribute');
    setSelectedTimeframes(['5m', '15m', '1h']);
    setSelectedTokenAges(['NEW', 'MEDIUM']);
    setRiskTolerance('MODERATE');
    setStrategyCount(6);
    setCurrentStep('scanning');
    refetchScan();
    generateMutation.mutate();
  }, [refetchScan, generateMutation]);

  // Auto-run full pipeline
  const handleAutoRunPipeline = useCallback(async () => {
    setAutoRunning(true);
    setAutoRunPhase('Scanning market...');

    try {
      // Step 1: Scan
      setCurrentStep('scanning');
      await refetchScan();
      setAutoRunPhase('Generating strategies...');

      // Step 2: Generate
      setCurrentStep('generating');
      const genResult = await generateMutation.mutateAsync();
      const strategies = (genResult.data?.strategies || []) as StrategyConfig[];
      if (strategies.length === 0) {
        toast.error('No strategies generated');
        setAutoRunning(false);
        return;
      }
      setSelectedStrategyIds(new Set(strategies.map(s => s.id)));
      setAutoRunPhase('Running backtests...');

      // Step 3: Backtest
      setCurrentStep('running');
      await runLoopMutation.mutateAsync();
      setAutoRunPhase('Ranking results...');

      // Step 4: Rank
      setCurrentStep('results');
      await refetchRank();
      setAutoRunPhase('');

      toast.success('🚀 Pipeline complete!');
    } catch {
      toast.error('Pipeline failed at some stage');
    } finally {
      setAutoRunning(false);
      setAutoRunPhase('');
    }
  }, [refetchScan, generateMutation, runLoopMutation, refetchRank]);

  const toggleTimeframe = (tf: string) => {
    setSelectedTimeframes(prev =>
      prev.includes(tf) ? prev.filter(t => t !== tf) : [...prev, tf]
    );
  };

  const toggleTokenAge = (age: string) => {
    setSelectedTokenAges(prev =>
      prev.includes(age) ? prev.filter(a => a !== age) : [...prev, age]
    );
  };

  // Strategy card inline edit handler
  const handleStrategyEdit = useCallback((id: string, field: string, value: number) => {
    setGeneratedStrategies(prev =>
      prev.map(s => {
        if (s.id !== id) return s;
        if (field === 'name') {
          return { ...s, name: String(value) };
        }
        if (field === 'capitalAllocation') {
          return { ...s, capitalAllocation: Number(value) };
        }
        return {
          ...s,
          config: {
            ...s.config,
            exitSignal: {
              ...((s.config?.exitSignal as Record<string, unknown>) || {}),
              ...(field === 'takeProfit' ? { takeProfit: value } : {}),
              ...(field === 'stopLoss' ? { stopLoss: value } : {}),
            },
            riskManagement: {
              ...((s.config?.riskManagement as Record<string, unknown>) || {}),
              ...(field === 'positionSize' ? { maxPositionSize: value } : {}),
            },
          },
        };
      })
    );
  }, []);

  const handleStrategyRemove = useCallback((id: string) => {
    setGeneratedStrategies(prev => prev.filter(s => s.id !== id));
    setSelectedStrategyIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleToggleSelectStrategy = useCallback((id: string) => {
    setSelectedStrategyIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Select/deselect by category
  const handleSelectByCategory = useCallback((category: string) => {
    if (category === 'all') {
      setSelectedStrategyIds(new Set(generatedStrategies.map(s => s.id)));
    } else {
      setSelectedStrategyIds(new Set(
        generatedStrategies.filter(s => s.category.toLowerCase() === category.toLowerCase()).map(s => s.id)
      ));
    }
  }, [generatedStrategies]);

  // Select/deselect by timeframe
  const handleSelectByTimeframe = useCallback((tf: string) => {
    if (tf === 'all') {
      setSelectedStrategyIds(new Set(generatedStrategies.map(s => s.id)));
    } else {
      setSelectedStrategyIds(new Set(
        generatedStrategies.filter(s => s.timeframe === tf).map(s => s.id)
      ));
    }
  }, [generatedStrategies]);


  const tokens = scanData?.tokens || [];
  const rankedResults = rankData?.results || [];
  const bestStrategies = Array.isArray(bestData) ? bestData : [];

  // Filter ranked results
  const filteredRankedResults = rankedResults.filter(item => {
    if (filterTimeframe !== 'ALL' && item.timeframe !== filterTimeframe) return false;
    if (filterTokenAge !== 'ALL' && item.tokenAgeCategory !== filterTokenAge) return false;
    if (filterRisk !== 'ALL' && item.riskTolerance !== filterRisk) return false;
    return true;
  });

  // Get unique values for filter pills
  const uniqueTimeframes = [...new Set(rankedResults.map(r => r.timeframe))].filter(Boolean);
  const uniqueTokenAges = [...new Set(rankedResults.map(r => r.tokenAgeCategory))].filter(Boolean);
  const uniqueRisks = [...new Set(rankedResults.map(r => r.riskTolerance))].filter(Boolean);

  // Get unique categories and timeframes from generated strategies for grouping
  const uniqueCategories = useMemo(
    () => [...new Set(generatedStrategies.map(s => s.category))].filter(Boolean),
    [generatedStrategies]
  );
  const uniqueStratTimeframes = useMemo(
    () => [...new Set(generatedStrategies.map(s => s.timeframe))].filter(Boolean),
    [generatedStrategies]
  );

  // Determine strategy status based on loopResults
  const getStrategyStatus = (strategyId: string): 'pending' | 'testing' | 'done' | 'failed' => {
    const result = loopResults.find(r => r.strategyId === strategyId);
    if (!result) return 'pending';
    if (result.status === 'completed' || result.status === 'running') return 'done';
    if (result.status === 'failed') return 'failed';
    return 'testing';
  };

  // Pipeline step status
  const getStepStatus = (step: Step): 'idle' | 'active' | 'done' => {
    const currentIdx = STEP_ORDER.indexOf(currentStep);
    const stepIdx = STEP_ORDER.indexOf(step);
    if (stepIdx < currentIdx) return 'done';
    if (stepIdx === currentIdx) {
      // Active if currently loading
      if (step === 'scanning' && scanLoading) return 'active';
      if (step === 'generating' && generateMutation.isPending) return 'active';
      if (step === 'running' && runLoopMutation.isPending) return 'active';
      if (step === 'results' && rankLoading) return 'active';
      return 'done';
    }
    return 'idle';
  };

  // Filtered generated strategies by group
  const displayedStrategies = useMemo(() => {
    if (groupFilter === 'all') return generatedStrategies;
    if (TIMEFRAMES.includes(groupFilter)) {
      return generatedStrategies.filter(s => s.timeframe === groupFilter);
    }
    return generatedStrategies.filter(s => s.category.toLowerCase() === groupFilter.toLowerCase());
  }, [generatedStrategies, groupFilter]);

  // Selected count
  const selectedCount = selectedStrategyIds.size;

  return (
    <div className="flex flex-col h-full bg-[#0a0e17] border border-[#1e293b] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1e293b] bg-[#0d1117] shrink-0">
        <Brain className="h-4 w-4 text-[#d4af37]" />
        <span className="text-[#d4af37] font-mono text-sm font-bold tracking-wider">AI TRADING MANAGER</span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={handleAutoRunPipeline}
            disabled={autoRunning || generateMutation.isPending || runLoopMutation.isPending}
            className="h-7 px-3 text-[10px] font-mono bg-[#d4af37]/20 text-[#d4af37] hover:bg-[#d4af37]/30 border border-[#d4af37]/30"
          >
            {autoRunning ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" /> {autoRunPhase}
              </>
            ) : (
              <>
                <Rocket className="h-3 w-3 mr-1" /> Run Full Pipeline
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleQuickStart}
            className="h-6 px-2 text-[10px] font-mono text-[#d4af37] hover:text-[#f0d060] hover:bg-[#d4af37]/10"
          >
            <Sparkles className="h-3 w-3 mr-1" /> Quick Start
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setCurrentStep('setup'); refetchScan(); refetchRank(); }}
            className="h-6 px-2 text-[10px] font-mono text-[#64748b] hover:text-[#e2e8f0]"
          >
            <RefreshCw className="h-3 w-3 mr-1" /> Reset
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* ============================================= */}
          {/* VISUAL PIPELINE FLOW */}
          {/* ============================================= */}
          <div className="bg-[#0d1117] border border-[#1e293b] rounded-lg p-4">
            <div className="flex items-center justify-center gap-0 flex-wrap">
              {PIPELINE_NODES.map((node, i) => (
                <PipelineNode
                  key={node.step}
                  emoji={node.emoji}
                  label={node.label}
                  status={getStepStatus(node.step)}
                  isLast={i === PIPELINE_NODES.length - 1}
                />
              ))}
              {/* Activate node */}
              <div className="flex items-center">
                <div className="relative w-8 h-px mx-1 flex items-center">
                  <div className={`w-full h-px ${currentStep === 'results' && bestStrategies.length > 0 ? 'bg-[#d4af37]/50' : 'bg-[#1e293b]'}`} />
                </div>
                <motion.div
                  className="flex flex-col items-center gap-1"
                  animate={{ scale: currentStep === 'results' && bestStrategies.length > 0 ? 1.05 : 1 }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base border-2 transition-all duration-300 ${
                    bestStrategies.length > 0
                      ? 'bg-[#d4af37]/20 border-[#d4af37]/60 shadow-lg shadow-[#d4af37]/20'
                      : 'bg-[#111827] border-[#1e293b]'
                  }`}>
                    <span>🚀</span>
                  </div>
                  <span className={`text-[9px] font-mono font-semibold tracking-wider ${
                    bestStrategies.length > 0 ? 'text-[#d4af37]' : 'text-[#475569]'
                  }`}>
                    ACTIVATE
                  </span>
                </motion.div>
              </div>
            </div>
          </div>

          {/* ============================================= */}
          {/* STEP 1: Capital Setup */}
          {/* ============================================= */}
          <div className="bg-[#0d1117] border border-[#1e293b] rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-3.5 w-3.5 text-[#d4af37]" />
              <span className="text-[11px] font-mono text-[#94a3b8] uppercase tracking-wider">Capital Setup</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Left: Capital & Allocation */}
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-mono text-[#64748b] uppercase tracking-wider mb-1 block">Total Capital ($)</label>
                  <Input
                    type="number"
                    value={capital}
                    onChange={e => setCapital(Number(e.target.value))}
                    className="h-8 text-xs font-mono bg-[#0a0e17] border-[#1e293b] text-[#e2e8f0]"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-[#64748b] uppercase tracking-wider mb-1 block">Allocation Mode</label>
                  <Select value={allocationMode} onValueChange={v => setAllocationMode(v as 'distribute' | 'focus')}>
                    <SelectTrigger className="h-8 text-[10px] font-mono bg-[#0a0e17] border-[#1e293b] text-[#e2e8f0]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1f2e] border-[#2d3748]">
                      <SelectItem value="distribute" className="text-[10px] font-mono text-[#e2e8f0]">Distribute</SelectItem>
                      <SelectItem value="focus" className="text-[10px] font-mono text-[#e2e8f0]">Focus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Capital Visualization Bar */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[9px] font-mono text-[#64748b] mb-1">
                    <span>Capital Distribution</span>
                    <span>${capital.toLocaleString()} total</span>
                  </div>
                  <div className="h-3 bg-[#1a1f2e] rounded-full overflow-hidden flex">
                    {generatedStrategies.length > 0 ? generatedStrategies.map((s, i) => (
                      <div
                        key={s.id}
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${(s.capitalAllocation / capital) * 100}%`,
                          backgroundColor: `hsl(${(i * 360 / generatedStrategies.length) + 40}, 70%, 50%)`,
                        }}
                        title={`${s.name}: $${s.capitalAllocation.toFixed(0)}`}
                      />
                    )) : (
                      <div className="h-full bg-[#2d3748] w-full" />
                    )}
                  </div>
                  {generatedStrategies.length > 0 && (
                    <div className="text-[8px] font-mono text-[#475569] mt-0.5">
                      {allocationMode === 'distribute'
                        ? `${generatedStrategies.length} strategies × $${(capital / Math.max(generatedStrategies.length, 1)).toFixed(0)} each`
                        : `$${capital.toLocaleString()} focused on each strategy`}
                    </div>
                  )}
                </div>
              </div>

              {/* Center: Timeframes & Token Ages */}
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-mono text-[#64748b] uppercase tracking-wider mb-1.5 block">Timeframes</label>
                  <div className="flex flex-wrap gap-1.5">
                    {TIMEFRAMES.map(tf => (
                      <button
                        key={tf}
                        onClick={() => toggleTimeframe(tf)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono border transition-all ${
                          selectedTimeframes.includes(tf)
                            ? 'bg-[#d4af37]/15 text-[#d4af37] border-[#d4af37]/30'
                            : 'bg-[#0a0e17] text-[#64748b] border-[#1e293b] hover:border-[#2d3748]'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-mono text-[#64748b] uppercase tracking-wider mb-1.5 block">Token Age Filter</label>
                  <div className="flex gap-1.5">
                    {TOKEN_AGES.map(age => (
                      <button
                        key={age}
                        onClick={() => toggleTokenAge(age)}
                        className={`px-3 py-1 rounded-full text-[10px] font-mono border transition-all ${
                          selectedTokenAges.includes(age)
                            ? 'bg-[#d4af37]/15 text-[#d4af37] border-[#d4af37]/30'
                            : 'bg-[#0a0e17] text-[#64748b] border-[#1e293b] hover:border-[#2d3748]'
                        }`}
                      >
                        {age === 'NEW' ? '<24h' : age === 'MEDIUM' ? '<30d' : '>30d'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Risk & Strategy Count */}
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-mono text-[#64748b] uppercase tracking-wider mb-1 block">Risk Tolerance</label>
                  <Select value={riskTolerance} onValueChange={setRiskTolerance}>
                    <SelectTrigger className="h-8 text-[10px] font-mono bg-[#0a0e17] border-[#1e293b] text-[#e2e8f0]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1f2e] border-[#2d3748]">
                      {RISK_LEVELS.map(r => (
                        <SelectItem key={r} value={r} className="text-[10px] font-mono text-[#e2e8f0]">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[9px] font-mono text-[#64748b] uppercase tracking-wider mb-1 block">Max Strategies</label>
                  <Input
                    type="number"
                    value={strategyCount}
                    onChange={e => setStrategyCount(Number(e.target.value))}
                    min={1}
                    max={20}
                    className="h-8 text-xs font-mono bg-[#0a0e17] border-[#1e293b] text-[#e2e8f0]"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={handleScan}
                disabled={scanLoading}
                className="h-8 px-4 text-[10px] font-mono bg-[#d4af37]/20 text-[#d4af37] hover:bg-[#d4af37]/30 border border-[#d4af37]/30"
              >
                {scanLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Scan className="h-3 w-3 mr-1" />}
                Scan Opportunities
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || selectedTimeframes.length === 0}
                className="h-8 px-4 text-[10px] font-mono bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/30"
              >
                {generateMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Zap className="h-3 w-3 mr-1" />}
                Generate Strategies
              </Button>
            </div>
          </div>

          {/* ============================================= */}
          {/* STEP 2: AI Scan Results */}
          {/* ============================================= */}
          <AnimatePresence>
            {scanData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#0d1117] border border-[#1e293b] rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Scan className="h-3.5 w-3.5 text-[#d4af37]" />
                  <span className="text-[11px] font-mono text-[#94a3b8] uppercase tracking-wider">Scan Results</span>
                  <Badge className="text-[8px] h-4 px-1.5 font-mono bg-[#1a1f2e] text-[#64748b] border-[#2d3748]">
                    {tokens.length} tokens · {scanData.dnaProfiles} DNA · {scanData.activeSignals} signals
                  </Badge>
                </div>

                {tokens.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-[#64748b]">
                    <Target className="h-8 w-8 mb-2 text-[#2d3748]" />
                    <span className="font-mono text-sm">No opportunities found. Try running the Brain first.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {tokens.slice(0, 12).map((token, idx) => {
                      const risk = RISK_COLORS[token.dnaRiskLevel] || RISK_COLORS.MEDIUM;
                      return (
                        <motion.div
                          key={token.id || `scan-${idx}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.03 }}
                          className="bg-[#111827] border border-[#1e293b] rounded-lg p-3 hover:border-[#2d3748] transition-all"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono text-xs font-bold text-[#e2e8f0]">{token.symbol}</span>
                            <Badge className={`text-[8px] h-3.5 px-1 font-mono border ${risk.bg} ${risk.text}`}>
                              {token.dnaRiskLevel}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] font-mono">
                            <span className="text-[#64748b]">Vol 24h</span>
                            <span className="text-[#94a3b8] text-right">${(token.volume24h || 0).toLocaleString()}</span>
                            <span className="text-[#64748b]">Change</span>
                            <span className={`text-right ${(token.priceChange24h || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {(token.priceChange24h || 0) >= 0 ? '+' : ''}{(token.priceChange24h || 0).toFixed(1)}%
                            </span>
                            <span className="text-[#64748b]">Signals</span>
                            <span className="text-amber-400 text-right">{token.signalCount}</span>
                            <span className="text-[#64748b]">Phase</span>
                            <span className="text-[#94a3b8] text-right">{token.phase || '—'}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ============================================= */}
          {/* STEP 3: Strategy Cards with Grouping */}
          {/* ============================================= */}
          <AnimatePresence>
            {generatedStrategies.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#0d1117] border border-[#1e293b] rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-[#d4af37]" />
                    <span className="text-[11px] font-mono text-[#94a3b8] uppercase tracking-wider">Strategy Cards</span>
                    <Badge className="text-[8px] h-4 px-1.5 font-mono bg-[#1a1f2e] text-[#64748b] border-[#2d3748]">
                      {selectedCount}/{generatedStrategies.length} selected
                    </Badge>
                  </div>
                </div>

                {/* Strategy Grouping Controls */}
                <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-[#1e293b]/50">
                  <Layers className="h-3 w-3 text-[#475569]" />
                  <span className="text-[8px] font-mono text-[#475569] uppercase">Select by:</span>
                  <button
                    onClick={() => handleSelectByCategory('all')}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all ${
                      selectedCount === generatedStrategies.length ? 'bg-[#d4af37]/15 text-[#d4af37] border-[#d4af37]/30' : 'bg-[#0a0e17] text-[#64748b] border-[#1e293b] hover:border-[#2d3748]'
                    }`}
                  >
                    All
                  </button>
                  {uniqueCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => handleSelectByCategory(cat)}
                      className="px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all bg-[#0a0e17] text-[#64748b] border-[#1e293b] hover:border-[#2d3748]"
                      style={{ color: getCategoryColor(cat) }}
                    >
                      {cat}
                    </button>
                  ))}
                  <span className="text-[#2d3748]">|</span>
                  {uniqueStratTimeframes.map(tf => (
                    <button
                      key={tf}
                      onClick={() => handleSelectByTimeframe(tf)}
                      className="px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all bg-[#0a0e17] text-[#64748b] border-[#1e293b] hover:border-[#2d3748]"
                    >
                      {tf}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedStrategyIds(new Set())}
                    className="px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all bg-[#0a0e17] text-red-400/60 border-[#1e293b] hover:border-red-400/30"
                  >
                    None
                  </button>
                </div>

                {/* Filter by category/timeframe (display filter) */}
                <div className="flex items-center gap-2">
                  <Filter className="h-3 w-3 text-[#475569]" />
                  <span className="text-[8px] font-mono text-[#475569] uppercase">View:</span>
                  <button
                    onClick={() => setGroupFilter('all')}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all ${
                      groupFilter === 'all' ? 'bg-cyan-600/15 text-cyan-400 border-cyan-500/30' : 'bg-[#0a0e17] text-[#64748b] border-[#1e293b]'
                    }`}
                  >
                    All
                  </button>
                  {uniqueCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setGroupFilter(cat)}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all ${
                        groupFilter === cat ? 'bg-cyan-600/15 text-cyan-400 border-cyan-500/30' : 'bg-[#0a0e17] text-[#64748b] border-[#1e293b]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  {uniqueStratTimeframes.filter(tf => !uniqueCategories.includes(tf)).map(tf => (
                    <button
                      key={tf}
                      onClick={() => setGroupFilter(tf)}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all ${
                        groupFilter === tf ? 'bg-cyan-600/15 text-cyan-400 border-cyan-500/30' : 'bg-[#0a0e17] text-[#64748b] border-[#1e293b]'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                {/* Strategy Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {displayedStrategies.map((strat) => (
                      <StrategyCard
                        key={strat.id}
                        strategy={strat}
                        onEdit={handleStrategyEdit}
                        onRemove={handleStrategyRemove}
                        isSelected={selectedStrategyIds.has(strat.id)}
                        onToggleSelect={handleToggleSelectStrategy}
                        status={getStrategyStatus(strat.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {/* Run Backtest Button */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={handleRunLoop}
                    disabled={runLoopMutation.isPending || selectedCount === 0}
                    className="h-8 px-4 text-[10px] font-mono bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30"
                  >
                    {runLoopMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                    {runLoopMutation.isPending ? 'Running Backtests...' : `Run Backtest (${selectedCount} strategies)`}
                  </Button>
                  {runLoopMutation.isPending && (
                    <span className="text-[9px] font-mono text-amber-400 flex items-center gap-1">
                      <Activity className="h-3 w-3 animate-pulse" /> Testing {selectedCount} strategies...
                    </span>
                  )}
                </div>

                {/* Loop Progress */}
                {loopResults.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="text-[9px] font-mono text-[#475569] uppercase mb-1">Backtest Progress</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {loopResults.map((res, idx) => (
                        <div key={res.strategyId || `loop-${idx}`} className="flex items-center gap-2 text-[9px] font-mono bg-[#111827] rounded px-2 py-1">
                          {res.status === 'completed' || res.status === 'running' ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : res.status === 'failed' ? (
                            <X className="h-3 w-3 text-red-400" />
                          ) : (
                            <Loader2 className="h-3 w-3 text-amber-400 animate-spin" />
                          )}
                          <span className="text-[#94a3b8] truncate flex-1">{res.strategyName}</span>
                          <span className={`${
                            res.status === 'completed' ? 'text-emerald-400' :
                            res.status === 'running' ? 'text-amber-400' :
                            res.status === 'failed' ? 'text-red-400' : 'text-[#64748b]'
                          }`}>
                            {res.status.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ============================================= */}
          {/* PORTFOLIO SUMMARY DASHBOARD */}
          {/* ============================================= */}
          <AnimatePresence>
            {filteredRankedResults.length > 0 && (
              <PortfolioSummary results={filteredRankedResults} capital={capital} />
            )}
          </AnimatePresence>

          {/* ============================================= */}
          {/* STEP 4: Results Ranking */}
          {/* ============================================= */}
          <div className="bg-[#0d1117] border border-[#1e293b] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5 text-[#d4af37]" />
                <span className="text-[11px] font-mono text-[#94a3b8] uppercase tracking-wider">Results Ranking</span>
                <Badge className="text-[8px] h-4 px-1.5 font-mono bg-[#1a1f2e] text-[#64748b] border-[#2d3748]">
                  {filteredRankedResults.length} results
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchRank()}
                disabled={rankLoading}
                className="h-6 px-2 text-[10px] font-mono text-[#64748b] hover:text-[#e2e8f0]"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${rankLoading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>

            {/* Filter Pills */}
            {rankedResults.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-[#1e293b]/50">
                <Filter className="h-3 w-3 text-[#475569]" />
                {/* Timeframe filter */}
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-mono text-[#475569]">TF:</span>
                  <button
                    onClick={() => setFilterTimeframe('ALL')}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all ${
                      filterTimeframe === 'ALL' ? 'bg-[#d4af37]/15 text-[#d4af37] border-[#d4af37]/30' : 'bg-[#0a0e17] text-[#64748b] border-[#1e293b] hover:border-[#2d3748]'
                    }`}
                  >
                    All
                  </button>
                  {uniqueTimeframes.map(tf => (
                    <button
                      key={tf}
                      onClick={() => setFilterTimeframe(tf)}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all ${
                        filterTimeframe === tf ? 'bg-[#d4af37]/15 text-[#d4af37] border-[#d4af37]/30' : 'bg-[#0a0e17] text-[#64748b] border-[#1e293b] hover:border-[#2d3748]'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
                {/* Token age filter */}
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-mono text-[#475569]">Age:</span>
                  <button
                    onClick={() => setFilterTokenAge('ALL')}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all ${
                      filterTokenAge === 'ALL' ? 'bg-cyan-600/15 text-cyan-400 border-cyan-500/30' : 'bg-[#0a0e17] text-[#64748b] border-[#1e293b] hover:border-[#2d3748]'
                    }`}
                  >
                    All
                  </button>
                  {uniqueTokenAges.map(age => (
                    <button
                      key={age}
                      onClick={() => setFilterTokenAge(age)}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all ${
                        filterTokenAge === age ? 'bg-cyan-600/15 text-cyan-400 border-cyan-500/30' : 'bg-[#0a0e17] text-[#64748b] border-[#1e293b] hover:border-[#2d3748]'
                      }`}
                    >
                      {age === 'NEW' ? '<24h' : age === 'MEDIUM' ? '<30d' : '>30d'}
                    </button>
                  ))}
                </div>
                {/* Risk filter */}
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-mono text-[#475569]">Risk:</span>
                  <button
                    onClick={() => setFilterRisk('ALL')}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all ${
                      filterRisk === 'ALL' ? 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30' : 'bg-[#0a0e17] text-[#64748b] border-[#1e293b] hover:border-[#2d3748]'
                    }`}
                  >
                    All
                  </button>
                  {uniqueRisks.map(risk => (
                    <button
                      key={risk}
                      onClick={() => setFilterRisk(risk)}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all ${
                        filterRisk === risk ? 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30' : 'bg-[#0a0e17] text-[#64748b] border-[#1e293b] hover:border-[#2d3748]'
                      }`}
                    >
                      {risk.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredRankedResults.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-[#64748b]">
                <BarChart3 className="h-8 w-8 mb-2 text-[#2d3748]" />
                <span className="font-mono text-sm">
                  {rankedResults.length === 0
                    ? 'No completed backtests yet. Run the optimization loop first.'
                    : 'No results match your filters.'}
                </span>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-[9px] font-mono">
                  <thead>
                    <tr className="text-[#475569] uppercase border-b border-[#1e293b]">
                      <th className="py-1 px-1.5 text-left">#</th>
                      <th className="py-1 px-1.5 text-left">Strategy</th>
                      <th className="py-1 px-1.5 text-right">Score</th>
                      <th className="py-1 px-1.5 text-right">Sharpe</th>
                      <th className="py-1 px-1.5 text-right">Win%</th>
                      <th className="py-1 px-1.5 text-right">PnL%</th>
                      <th className="py-1 px-1.5 text-right">DD%</th>
                      <th className="py-1 px-1.5 text-right">PF</th>
                      <th className="py-1 px-1.5 text-center">★</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRankedResults.slice(0, 20).map((result, idx) => (
                      <tr key={result.id || `rank-${idx}`} className="border-b border-[#1e293b]/50 hover:bg-[#111827] transition-colors">
                        <td className="py-1.5 px-1.5 text-[#d4af37] font-bold">{idx + 1}</td>
                        <td className="py-1.5 px-1.5 text-[#e2e8f0] max-w-[200px] truncate">{result.strategyName}</td>
                        <td className="py-1.5 px-1.5 text-right font-bold text-[#d4af37]">{result.score.toFixed(1)}</td>
                        <td className="py-1.5 px-1.5 text-right text-[#94a3b8]">{result.sharpeRatio.toFixed(2)}</td>
                        <td className="py-1.5 px-1.5 text-right text-[#94a3b8]">{(result.winRate * 100).toFixed(0)}%</td>
                        <td className={`py-1.5 px-1.5 text-right font-bold ${result.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {result.pnlPct >= 0 ? '+' : ''}{result.pnlPct.toFixed(1)}%
                        </td>
                        <td className="py-1.5 px-1.5 text-right text-red-400">{result.maxDrawdownPct.toFixed(1)}%</td>
                        <td className="py-1.5 px-1.5 text-right text-[#94a3b8]">{result.profitFactor.toFixed(2)}</td>
                        <td className="py-1.5 px-1.5 text-center">
                          <button
                            onClick={() => saveBestMutation.mutate(result)}
                            className="text-[#475569] hover:text-[#d4af37] transition-colors"
                            title="Save to Hall of Fame"
                          >
                            <BookmarkPlus className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ============================================= */}
          {/* STEP 5: Hall of Fame with One-Click Activate */}
          {/* ============================================= */}
          <div className="bg-[#0d1117] border border-[#1e293b] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-[#d4af37]" />
                <span className="text-[11px] font-mono text-[#94a3b8] uppercase tracking-wider">Hall of Fame</span>
                <Badge className="text-[8px] h-4 px-1.5 font-mono bg-[#1a1f2e] text-[#d4af37] border-[#d4af37]/30">
                  {bestStrategies.length} saved
                </Badge>
              </div>
              {/* One-Click Activate All */}
              {bestStrategies.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <label className="text-[8px] font-mono text-[#64748b]">Top</label>
                    <Input
                      type="number"
                      value={activateTopN}
                      onChange={e => setActivateTopN(Math.max(1, Number(e.target.value)))}
                      min={1}
                      max={bestStrategies.length}
                      className="h-5 w-10 text-[9px] font-mono bg-[#0a0e17] border-[#1e293b] text-[#d4af37] px-1"
                    />
                  </div>
                  <Button
                    onClick={() => activateAllMutation.mutate({ strategies: bestStrategies, count: activateTopN })}
                    disabled={activateAllMutation.isPending || bestStrategies.length === 0}
                    className="h-6 px-3 text-[9px] font-mono bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30"
                  >
                    {activateAllMutation.isPending ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Rocket className="h-3 w-3 mr-1" />
                    )}
                    Activate Top {activateTopN}
                  </Button>
                </div>
              )}
            </div>

            {bestStrategies.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-[#64748b]">
                <Star className="h-8 w-8 mb-2 text-[#2d3748]" />
                <span className="font-mono text-sm">No saved strategies yet. Bookmark your best results above.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {bestStrategies.map((strat, idx) => (
                  <motion.div
                    key={strat.id || `best-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-[#111827] border border-[#d4af37]/20 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-[#d4af37]">#{idx + 1}</span>
                        <Trophy className="h-3.5 w-3.5 text-[#d4af37]" />
                        <span className="font-mono text-xs font-bold text-[#e2e8f0]">{strat.strategyName}</span>
                        <Badge className="text-[7px] h-3.5 px-1 font-mono bg-[#1a1f2e] text-[#94a3b8] border-0">
                          {strat.category}
                        </Badge>
                        <Badge className="text-[7px] h-3.5 px-1 font-mono bg-[#1a1f2e] text-[#94a3b8] border-0">
                          {strat.timeframe}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge className="text-[8px] h-3.5 px-1.5 font-mono bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30">
                          Score: {strat.score.toFixed(1)}
                        </Badge>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => activateMutation.mutate(strat)}
                              disabled={activateMutation.isPending}
                              className="h-6 w-6 flex items-center justify-center rounded transition-all bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 border border-emerald-500/20"
                              title="Activate as Trading System"
                            >
                              <Rocket className="h-3 w-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Activate as Live Trading System</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => deleteBestMutation.mutate(strat.id)}
                              className="h-6 w-6 flex items-center justify-center rounded transition-all bg-[#1a1f2e] text-[#64748b] hover:text-red-400 hover:bg-red-500/10 border border-[#1e293b]"
                              title="Remove"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Remove from Hall of Fame</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-x-3 gap-y-0.5 text-[9px] font-mono">
                      <div>
                        <span className="text-[#64748b]">Sharpe</span>
                        <div className="text-[#e2e8f0]">{strat.sharpeRatio.toFixed(2)}</div>
                      </div>
                      <div>
                        <span className="text-[#64748b]">Win Rate</span>
                        <div className="text-[#e2e8f0]">{(strat.winRate * 100).toFixed(0)}%</div>
                      </div>
                      <div>
                        <span className="text-[#64748b]">PnL</span>
                        <div className={strat.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {strat.pnlPct >= 0 ? '+' : ''}{strat.pnlPct.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <span className="text-[#64748b]">Max DD</span>
                        <div className="text-red-400">{strat.maxDrawdownPct.toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="text-[#64748b]">Allocation</span>
                        <div className="text-[#d4af37]">${strat.capitalAllocation.toFixed(0)}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

    </div>
  );
}
