'use client';

import { useState, useCallback } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
  Pencil,
  Sparkles,
  Filter,
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

interface EditStrategyForm {
  name: string;
  timeframe: string;
  tokenAgeCategory: string;
  riskTolerance: string;
  takeProfit: number;
  stopLoss: number;
  positionSize: number;
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

// ============================================================
// COMPONENT
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

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<StrategyConfig | null>(null);
  const [editForm, setEditForm] = useState<EditStrategyForm>({
    name: '',
    timeframe: '15m',
    tokenAgeCategory: 'NEW',
    riskTolerance: 'MODERATE',
    takeProfit: 40,
    stopLoss: 15,
    positionSize: 5,
  });

  // Results filter state
  const [filterTimeframe, setFilterTimeframe] = useState<string>('ALL');
  const [filterTokenAge, setFilterTokenAge] = useState<string>('ALL');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');

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
      toast.success(`Generated ${strategies.length} strategies`);
    },
    onError: () => {
      toast.error('Failed to generate strategies');
    },
  });

  const runLoopMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/strategy-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run_loop',
          strategies: generatedStrategies,
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
    },
    onError: () => {
      toast.error('Failed to run optimization loop');
      setCurrentStep('results');
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
    setCurrentStep('running');
    runLoopMutation.mutate();
  }, [runLoopMutation]);

  const handleQuickStart = useCallback(() => {
    setCapital(10000);
    setAllocationMode('distribute');
    setSelectedTimeframes(['5m', '15m', '1h']);
    setSelectedTokenAges(['NEW', 'MEDIUM']);
    setRiskTolerance('MODERATE');
    setStrategyCount(6);
    // Auto-trigger scan + generate
    setCurrentStep('scanning');
    refetchScan();
    generateMutation.mutate();
  }, [refetchScan, generateMutation]);

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

  // Edit strategy handlers
  const openEditDialog = (strategy: StrategyConfig) => {
    setEditingStrategy(strategy);
    setEditForm({
      name: strategy.name,
      timeframe: strategy.timeframe,
      tokenAgeCategory: strategy.tokenAgeCategory,
      riskTolerance: strategy.riskTolerance,
      takeProfit: (strategy.config?.exitSignal as Record<string, unknown>)?.takeProfit as number || 40,
      stopLoss: (strategy.config?.exitSignal as Record<string, unknown>)?.stopLoss as number || 15,
      positionSize: (strategy.config?.riskManagement as Record<string, unknown>)?.maxPositionSize as number || 5,
    });
    setEditDialogOpen(true);
  };

  const saveEditStrategy = () => {
    if (!editingStrategy) return;
    setGeneratedStrategies(prev =>
      prev.map(s => {
        if (s.id !== editingStrategy.id) return s;
        return {
          ...s,
          name: editForm.name,
          timeframe: editForm.timeframe,
          tokenAgeCategory: editForm.tokenAgeCategory,
          riskTolerance: editForm.riskTolerance,
          config: {
            ...s.config,
            exitSignal: {
              ...((s.config?.exitSignal as Record<string, unknown>) || {}),
              takeProfit: editForm.takeProfit,
              stopLoss: editForm.stopLoss,
            },
            riskManagement: {
              ...((s.config?.riskManagement as Record<string, unknown>) || {}),
              maxPositionSize: editForm.positionSize,
            },
          },
        };
      })
    );
    setEditDialogOpen(false);
    toast.success('Strategy updated');
  };

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

  return (
    <div className="flex flex-col h-full bg-[#0a0e17] border border-[#1e293b] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1e293b] bg-[#0d1117] shrink-0">
        <Brain className="h-4 w-4 text-[#d4af37]" />
        <span className="text-[#d4af37] font-mono text-sm font-bold tracking-wider">AI TRADING MANAGER</span>
        <Badge className="text-[9px] h-5 px-1.5 font-mono bg-[#1a1f2e] text-[#94a3b8] border-[#2d3748] ml-2">
          Step: {currentStep.toUpperCase()}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
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
          {/* Step Indicator */}
          <div className="flex items-center gap-1">
            {(['setup', 'scanning', 'generating', 'running', 'results'] as Step[]).map((step, i) => (
              <div key={step} className="flex items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-mono font-bold ${
                  currentStep === step ? 'bg-[#d4af37] text-[#0a0e17]' :
                  ['setup', 'scanning', 'generating', 'running', 'results'].indexOf(currentStep) > i ? 'bg-emerald-500/30 text-emerald-400' :
                  'bg-[#1a1f2e] text-[#475569]'
                }`}>
                  {['setup', 'scanning', 'generating', 'running', 'results'].indexOf(currentStep) > i ? '✓' : i + 1}
                </div>
                <span className={`text-[8px] font-mono ${
                  currentStep === step ? 'text-[#d4af37]' : 'text-[#475569]'
                }`}>
                  {step.toUpperCase()}
                </span>
                {i < 4 && <div className="w-4 h-px bg-[#1e293b]" />}
              </div>
            ))}
          </div>

          {/* ============================================= */}
          {/* STEP 1: Capital Setup - 3 Column Layout */}
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

              {/* Center: Timeframes & Token Ages (as toggle pill buttons) */}
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
          {/* STEP 3: Optimization Loop (Generated Strategies) */}
          {/* ============================================= */}
          <AnimatePresence>
            {generatedStrategies.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#0d1117] border border-[#1e293b] rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-3.5 w-3.5 text-[#d4af37]" />
                  <span className="text-[11px] font-mono text-[#94a3b8] uppercase tracking-wider">Generated Strategies</span>
                  <Badge className="text-[8px] h-4 px-1.5 font-mono bg-[#1a1f2e] text-[#64748b] border-[#2d3748]">
                    {generatedStrategies.length} strategies
                  </Badge>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5">
                  {generatedStrategies.map((strat, idx) => (
                    <div key={strat.id || `strat-${idx}`} className="flex items-center gap-2 bg-[#111827] border border-[#1e293b] rounded-md p-2">
                      <span className="text-sm">{strat.icon}</span>
                      <span className="font-mono text-[10px] text-[#e2e8f0] flex-1 truncate">{strat.name}</span>
                      <Badge variant="outline" className="text-[8px] h-3.5 px-1 font-mono border-[#2d3748] text-[#64748b]">
                        {strat.category}
                      </Badge>
                      <Badge variant="outline" className="text-[8px] h-3.5 px-1 font-mono border-[#2d3748] text-[#64748b]">
                        {strat.timeframe}
                      </Badge>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(strat)}
                            className="h-5 w-5 p-0 text-[#64748b] hover:text-[#d4af37]"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit Strategy</TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    onClick={handleRunLoop}
                    disabled={runLoopMutation.isPending}
                    className="h-8 px-4 text-[10px] font-mono bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30"
                  >
                    {runLoopMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                    {runLoopMutation.isPending ? 'Running Backtests...' : 'Run Optimization Loop'}
                  </Button>
                  {runLoopMutation.isPending && (
                    <span className="text-[9px] font-mono text-amber-400 flex items-center gap-1">
                      <Activity className="h-3 w-3 animate-pulse" /> Testing {generatedStrategies.length} strategies...
                    </span>
                  )}
                </div>

                {/* Loop Progress */}
                {loopResults.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {loopResults.map((res, idx) => (
                      <div key={res.strategyId || `loop-${idx}`} className="flex items-center gap-2 text-[9px] font-mono">
                        {res.status === 'completed' || res.status === 'running' ? (
                          <span className="text-emerald-400">✓</span>
                        ) : res.status === 'failed' ? (
                          <span className="text-red-400">✗</span>
                        ) : (
                          <Loader2 className="h-2.5 w-2.5 text-amber-400 animate-spin" />
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
                )}
              </motion.div>
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
          {/* STEP 5: Best Strategies (Hall of Fame) */}
          {/* ============================================= */}
          <div className="bg-[#0d1117] border border-[#1e293b] rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-3.5 w-3.5 text-[#d4af37]" />
              <span className="text-[11px] font-mono text-[#94a3b8] uppercase tracking-wider">Hall of Fame</span>
              <Badge className="text-[8px] h-4 px-1.5 font-mono bg-[#1a1f2e] text-[#d4af37] border-[#d4af37]/30">
                {bestStrategies.length} saved
              </Badge>
            </div>

            {bestStrategies.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-[#64748b]">
                <Star className="h-8 w-8 mb-2 text-[#2d3748]" />
                <span className="font-mono text-sm">No saved strategies yet. Bookmark your best results above.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
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
                        <Trophy className="h-3.5 w-3.5 text-[#d4af37]" />
                        <span className="font-mono text-xs font-bold text-[#e2e8f0]">{strat.strategyName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge className="text-[8px] h-3.5 px-1.5 font-mono bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30">
                          Score: {strat.score.toFixed(1)}
                        </Badge>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => activateMutation.mutate(strat)}
                              disabled={activateMutation.isPending}
                              className="h-5 w-5 p-0 text-[#64748b] hover:text-emerald-400"
                              title="Activate as Trading System"
                            >
                              <Rocket className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Activate as Live Trading System</TooltipContent>
                        </Tooltip>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteBestMutation.mutate(strat.id)}
                          className="h-5 w-5 p-0 text-[#64748b] hover:text-red-400"
                          title="Remove"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-x-3 gap-y-0.5 text-[9px] font-mono">
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
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* ============================================= */}
      {/* Edit Strategy Dialog */}
      {/* ============================================= */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-[#0d1117] border-[#1e293b] text-[#e2e8f0] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono text-[#d4af37]">Edit Strategy</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Strategy Name */}
            <div>
              <label className="text-[9px] font-mono text-[#64748b] uppercase tracking-wider mb-1 block">Strategy Name</label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="h-8 text-xs font-mono bg-[#0a0e17] border-[#1e293b] text-[#e2e8f0]"
              />
            </div>
            {/* Timeframe */}
            <div>
              <label className="text-[9px] font-mono text-[#64748b] uppercase tracking-wider mb-1 block">Timeframe</label>
              <Select value={editForm.timeframe} onValueChange={v => setEditForm(prev => ({ ...prev, timeframe: v }))}>
                <SelectTrigger className="h-8 text-[10px] font-mono bg-[#0a0e17] border-[#1e293b] text-[#e2e8f0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-[#2d3748]">
                  {TIMEFRAMES.map(tf => (
                    <SelectItem key={tf} value={tf} className="text-[10px] font-mono text-[#e2e8f0]">{tf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Token Age */}
            <div>
              <label className="text-[9px] font-mono text-[#64748b] uppercase tracking-wider mb-1 block">Token Age</label>
              <Select value={editForm.tokenAgeCategory} onValueChange={v => setEditForm(prev => ({ ...prev, tokenAgeCategory: v }))}>
                <SelectTrigger className="h-8 text-[10px] font-mono bg-[#0a0e17] border-[#1e293b] text-[#e2e8f0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-[#2d3748]">
                  {TOKEN_AGES.map(age => (
                    <SelectItem key={age} value={age} className="text-[10px] font-mono text-[#e2e8f0]">
                      {age === 'NEW' ? '<24h' : age === 'MEDIUM' ? '<30d' : '>30d'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Risk Tolerance */}
            <div>
              <label className="text-[9px] font-mono text-[#64748b] uppercase tracking-wider mb-1 block">Risk Tolerance</label>
              <Select value={editForm.riskTolerance} onValueChange={v => setEditForm(prev => ({ ...prev, riskTolerance: v }))}>
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
            {/* Take Profit / Stop Loss / Position Size */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] font-mono text-[#64748b] uppercase tracking-wider mb-1 block">Take Profit %</label>
                <Input
                  type="number"
                  value={editForm.takeProfit}
                  onChange={e => setEditForm(prev => ({ ...prev, takeProfit: Number(e.target.value) }))}
                  className="h-8 text-xs font-mono bg-[#0a0e17] border-[#1e293b] text-[#e2e8f0]"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-[#64748b] uppercase tracking-wider mb-1 block">Stop Loss %</label>
                <Input
                  type="number"
                  value={editForm.stopLoss}
                  onChange={e => setEditForm(prev => ({ ...prev, stopLoss: Number(e.target.value) }))}
                  className="h-8 text-xs font-mono bg-[#0a0e17] border-[#1e293b] text-[#e2e8f0]"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-[#64748b] uppercase tracking-wider mb-1 block">Position Size %</label>
                <Input
                  type="number"
                  value={editForm.positionSize}
                  onChange={e => setEditForm(prev => ({ ...prev, positionSize: Number(e.target.value) }))}
                  className="h-8 text-xs font-mono bg-[#0a0e17] border-[#1e293b] text-[#e2e8f0]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" className="h-7 px-3 text-[10px] font-mono text-[#64748b]">Cancel</Button>
            </DialogClose>
            <Button
              onClick={saveEditStrategy}
              className="h-7 px-4 text-[10px] font-mono bg-[#d4af37]/20 text-[#d4af37] hover:bg-[#d4af37]/30 border border-[#d4af37]/30"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
