'use client';

import { useQuery } from '@tanstack/react-query';
import { useCryptoStore } from '@/store/crypto-store';
import { Badge } from '@/components/ui/badge';
import { Shield, Eye, ArrowDownUp, TrendingUp, AlertTriangle, Users, Activity, BarChart3 } from 'lucide-react';

function GaugeMini({ value, maxVal = 100, color, size = 60 }: { value: number; maxVal?: number; color: string; size?: number }) {
  const percentage = (value / maxVal) * 100;
  const rotation = (percentage / 100) * 180;

  return (
    <svg viewBox="0 0 100 60" width={size} height={size * 0.6}>
      <path
        d="M 10 55 A 40 40 0 0 1 90 55"
        fill="none"
        stroke="#1a1f2e"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M 10 55 A 40 40 0 0 1 90 55"
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${(percentage / 100) * 126} 126`}
        filter={`drop-shadow(0 0 4px ${color}40)`}
      />
      <text x="50" y="48" textAnchor="middle" fill={color} fontSize="14" fontFamily="monospace" fontWeight="bold">
        {Math.round(value)}
      </text>
    </svg>
  );
}

export function IntelligenceModules() {
  const { signals, smartMoneyAlerts } = useCryptoStore();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      return res.json();
    },
    refetchInterval: 10000,
  });

  const rugPullCount = signals.filter(s => s.type === 'RUG_PULL').length;
  const smartMoneyCount = signals.filter(s => s.type === 'SMART_MONEY_ENTRY').length;
  const vShapeCount = signals.filter(s => s.type === 'V_SHAPE').length;
  const liquidityTrapCount = signals.filter(s => s.type === 'LIQUIDITY_TRAP').length;

  const fomoIndex = stats?.fomoIndex ?? 45;
  const threatLevel = stats?.threatLevel ?? 'MEDIUM';

  const modules = [
    {
      title: 'Rug-Pull Predictor',
      icon: Shield,
      iconColor: '#ef4444',
      value: rugPullCount,
      label: 'Threats Detected',
      gauge: { value: threatLevel === 'HIGH' ? 85 : threatLevel === 'MEDIUM' ? 55 : 25, color: '#ef4444' },
      badge: { text: threatLevel, color: threatLevel === 'HIGH' ? 'bg-red-500/20 text-red-400 border-red-500/30' : threatLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    },
    {
      title: 'Smart Money Tracker',
      icon: Eye,
      iconColor: '#10b981',
      value: smartMoneyCount,
      label: 'Active Entries',
      gauge: { value: Math.min(smartMoneyCount * 12, 100), color: '#10b981' },
      badge: { text: `${smartMoneyAlerts.length} wallets`, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    },
    {
      title: 'Contrarian Mirror',
      icon: ArrowDownUp,
      iconColor: '#f59e0b',
      value: fomoIndex,
      label: 'FOMO Index',
      gauge: { value: fomoIndex, color: fomoIndex > 70 ? '#ef4444' : fomoIndex > 40 ? '#f59e0b' : '#10b981' },
      badge: { text: fomoIndex > 70 ? 'TRAP ACTIVE' : 'NORMAL', color: fomoIndex > 70 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    },
    {
      title: 'V-Shape Scanner',
      icon: TrendingUp,
      iconColor: '#22d3ee',
      value: vShapeCount,
      label: 'Opportunities',
      gauge: { value: Math.min(vShapeCount * 20, 100), color: '#22d3ee' },
      badge: { text: `${vShapeCount} active`, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 shrink-0">
      {modules.map((module) => {
        const Icon = module.icon;
        return (
          <div
            key={module.title}
            className="bg-[#0d1117] border border-[#1e293b] rounded-lg p-3 flex items-center gap-3 hover:border-[#2d3748] transition-colors"
          >
            <div className="flex flex-col items-center">
              <Icon className="h-4 w-4 mb-1" style={{ color: module.iconColor }} />
              <GaugeMini
                value={module.gauge.value}
                color={module.gauge.color}
                size={50}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono text-[#64748b] uppercase tracking-wider">{module.title}</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="mono-data text-lg font-bold text-[#e2e8f0]">{module.value}</span>
                <span className="text-[9px] font-mono text-[#94a3b8]">{module.label}</span>
              </div>
              <Badge className={`text-[9px] h-4 px-1.5 font-mono ${module.badge.color}`}>
                {module.badge.text}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
