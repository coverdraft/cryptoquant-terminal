'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Customized,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CandlestickChart,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface OHLCVCandle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface OHLCVResponse {
  data: OHLCVCandle[];
}

interface OHLCVChartProps {
  tokenAddress: string;
  chain?: string;
  timeframes?: string[];
}

// ============================================================
// CONFIG
// ============================================================

const ALL_TIMEFRAMES = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

const THEME = {
  bg: '#0d1117',
  panelBg: '#0a0e17',
  border: '#1e293b',
  gold: '#d4af37',
  green: '#10b981',
  red: '#ef4444',
  textPrimary: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  volumeUp: 'rgba(16, 185, 129, 0.25)',
  volumeDown: 'rgba(239, 68, 68, 0.25)',
  gridLine: '#1a1f2e',
} as const;

// ============================================================
// HELPERS
// ============================================================

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.001) return `$${price.toFixed(4)}`;
  if (price >= 0.00001) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(8)}`;
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(2)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
  return `$${vol.toFixed(0)}`;
}

function formatChange(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function formatTimeLabel(timestamp: number, timeframe: string): string {
  const d = new Date(timestamp);
  if (['1m', '3m', '5m', '15m', '30m'].includes(timeframe)) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  if (['1h', '4h'].includes(timeframe)) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================
// CUSTOM CANDLESTICK SVG RENDERER
// ============================================================

interface CandlestickRenderProps {
  xAxisMap?: Record<string, { scale: (value: string) => number; bandwidth?: () => number }>;
  yAxisMap?: Record<string, { scale: (value: number) => number; yAxisId?: string }>;
  formattedGraphicalItems?: unknown[];
  offset?: { top: number; right: number; bottom: number; left: number };
  data?: OHLCVCandle[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CandlestickSeries(props: any) {
  const { xAxisMap, yAxisMap, data } = props as CandlestickRenderProps;

  if (!xAxisMap || !yAxisMap || !data || data.length === 0) return null;

  const xAxis = Object.values(xAxisMap)[0];
  const yAxis = Object.values(yAxisMap).find(
    (y) => y.yAxisId === 'price'
  );

  if (!xAxis || !yAxis) return null;

  const xScale = xAxis.scale;
  const yScale = yAxis.scale;

  // Determine bandwidth for bar-like positioning
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bandWidth: number =
    typeof (xScale as any).bandwidth === 'function' ? (xScale as any).bandwidth() : 10;

  return (
    <g className="recharts-candlestick-series">
      {data.map((entry: OHLCVCandle, index: number) => {
        const xCenter = (xScale as (value: string) => number)(entry.time) + bandWidth / 2;
        const yHigh = yScale(entry.high);
        const yLow = yScale(entry.low);
        const yOpen = yScale(entry.open);
        const yClose = yScale(entry.close);

        const isGreen = entry.close >= entry.open;
        const color = isGreen ? THEME.green : THEME.red;
        const bodyTop = Math.min(yOpen, yClose);
        const bodyBottom = Math.max(yOpen, yClose);
        const bodyHeight = Math.max(bodyBottom - bodyTop, 1);
        const candleWidth = Math.max(bandWidth * 0.6, 2);

        return (
          <g key={`candle-${index}`}>
            {/* Wick (high-low line) */}
            <line
              x1={xCenter}
              y1={yHigh}
              x2={xCenter}
              y2={yLow}
              stroke={color}
              strokeWidth={1}
            />
            {/* Body (open-close rectangle) */}
            <rect
              x={xCenter - candleWidth / 2}
              y={bodyTop}
              width={candleWidth}
              height={bodyHeight}
              fill={isGreen ? color : color}
              stroke={color}
              strokeWidth={0.5}
              opacity={isGreen ? 0.9 : 0.95}
            />
          </g>
        );
      })}
    </g>
  );
}

// ============================================================
// CUSTOM TOOLTIP
// ============================================================

function CustomTooltipContent({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ payload: OHLCVCandle }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const candle = payload[0].payload as OHLCVCandle;
  const isGreen = candle.close >= candle.open;

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-md px-3 py-2 shadow-xl">
      <div className="text-[9px] font-mono text-[#64748b] mb-1.5">
        {new Date(candle.timestamp).toLocaleString()}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span className="text-[10px] font-mono text-[#64748b]">Open</span>
        <span className="mono-data text-[10px] text-[#e2e8f0] text-right">{formatPrice(candle.open)}</span>
        <span className="text-[10px] font-mono text-[#64748b]">High</span>
        <span className="mono-data text-[10px] text-right" style={{ color: THEME.green }}>{formatPrice(candle.high)}</span>
        <span className="text-[10px] font-mono text-[#64748b]">Low</span>
        <span className="mono-data text-[10px] text-right" style={{ color: THEME.red }}>{formatPrice(candle.low)}</span>
        <span className="text-[10px] font-mono text-[#64748b]">Close</span>
        <span className="mono-data text-[10px] text-right" style={{ color: isGreen ? THEME.green : THEME.red }}>
          {formatPrice(candle.close)}
        </span>
        <span className="text-[10px] font-mono text-[#64748b]">Volume</span>
        <span className="mono-data text-[10px] text-[#d4af37] text-right">{formatVolume(candle.volume)}</span>
      </div>
      <div className="mt-1 pt-1 border-t border-[#1e293b]">
        <span className={`text-[10px] font-mono font-bold ${isGreen ? 'text-emerald-400' : 'text-red-400'}`}>
          {isGreen ? '▲' : '▼'} {formatChange(((candle.close - candle.open) / candle.open) * 100)}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// LOADING SKELETON
// ============================================================

function ChartSkeleton() {
  return (
    <div className="flex flex-col h-full bg-[#0d1117] border border-[#1e293b] rounded-lg overflow-hidden">
      {/* Header skeleton */}
      <div className="px-3 py-2 border-b border-[#1e293b] bg-[#0a0e17]">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-24 bg-[#1a1f2e]" />
          <Skeleton className="h-4 w-16 bg-[#1a1f2e]" />
          <Skeleton className="h-4 w-20 bg-[#1a1f2e]" />
        </div>
      </div>
      {/* Timeframe skeleton */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#1e293b]">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-8 bg-[#1a1f2e]" />
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="flex-1 p-3 space-y-2">
        <Skeleton className="h-full w-full bg-[#1a1f2e] rounded" />
      </div>
    </div>
  );
}

// ============================================================
// NO DATA STATE
// ============================================================

function NoDataState() {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-[#64748b] font-mono gap-2">
      <CandlestickChart className="h-8 w-8 opacity-40" />
      <span className="text-xs">No OHLCV data available</span>
      <span className="text-[10px] text-[#475569]">Data will appear when the market is active</span>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function OHLCVChart({ tokenAddress, chain, timeframes }: OHLCVChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1h');
  const availableTimeframes = timeframes ?? ['5m', '1h', '1d'];

  // Fetch OHLCV data
  const {
    data: ohlcvResponse,
    isLoading,
    isError,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['ohlcv', tokenAddress, selectedTimeframe, chain],
    queryFn: async (): Promise<OHLCVCandle[]> => {
      try {
        const params = new URLSearchParams({
          tokenAddress,
          timeframe: selectedTimeframe,
          limit: '200',
        });
        if (chain) params.set('chain', chain);

        const res = await fetch(`/api/market/ohlcv?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch OHLCV data');
        const json: OHLCVResponse = await res.json();
        return json.data || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
    enabled: !!tokenAddress,
  });

  const candles = ohlcvResponse ?? [];

  // Transform data for recharts — add formatted time labels
  const chartData = useMemo(() => {
    return candles.map((c) => ({
      ...c,
      time: formatTimeLabel(c.timestamp, selectedTimeframe),
      volumeColor: c.close >= c.open ? THEME.volumeUp : THEME.volumeDown,
    }));
  }, [candles, selectedTimeframe]);

  // Compute stats from the candles
  const stats = useMemo(() => {
    if (candles.length === 0) return null;

    const latest = candles[candles.length - 1];
    const first = candles[0];
    const currentPrice = latest.close;
    const change24h = ((latest.close - first.open) / first.open) * 100;
    const totalVolume = candles.reduce((sum, c) => sum + c.volume, 0);
    const highPrice = Math.max(...candles.map((c) => c.high));
    const lowPrice = Math.min(...candles.map((c) => c.low));

    return { currentPrice, change24h, totalVolume, highPrice, lowPrice };
  }, [candles]);

  // Price domain with padding
  const priceDomain = useMemo(() => {
    if (candles.length === 0) return [0, 1] as [number, number];
    const allLows = candles.map((c) => c.low);
    const allHighs = candles.map((c) => c.high);
    const min = Math.min(...allLows);
    const max = Math.max(...allHighs);
    const padding = (max - min) * 0.08;
    return [min - padding, max + padding] as [number, number];
  }, [candles]);

  // Max volume for domain
  const volumeMax = useMemo(() => {
    if (candles.length === 0) return 1;
    return Math.max(...candles.map((c) => c.volume)) * 1.2;
  }, [candles]);

  const handleTimeframeChange = useCallback((tf: string) => {
    setSelectedTimeframe(tf);
  }, []);

  // Handle refetch with animation
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // -------------------------------------------------------------------
  // LOADING STATE
  // -------------------------------------------------------------------
  if (isLoading) return <ChartSkeleton />;

  // -------------------------------------------------------------------
  // ERROR / NO DATA STATE
  // -------------------------------------------------------------------
  if (isError || candles.length === 0) {
    return (
      <div className="flex flex-col h-full bg-[#0d1117] border border-[#1e293b] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#1e293b] bg-[#0a0e17]">
          <CandlestickChart className="h-3.5 w-3.5 text-[#d4af37]" />
          <span className="text-[10px] font-mono text-[#64748b] uppercase tracking-wider">OHLCV Chart</span>
        </div>
        {/* Timeframe selector still visible */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#1e293b]">
          {ALL_TIMEFRAMES.map((tf) => (
            <Button
              key={tf}
              variant="ghost"
              size="sm"
              onClick={() => handleTimeframeChange(tf)}
              className={`h-5 px-1.5 text-[9px] font-mono ${
                selectedTimeframe === tf
                  ? 'bg-[#d4af37]/20 text-[#d4af37]'
                  : 'text-[#64748b] hover:text-[#e2e8f0]'
              }`}
            >
              {tf}
            </Button>
          ))}
        </div>
        <NoDataState />
      </div>
    );
  }

  // -------------------------------------------------------------------
  // MAIN RENDER
  // -------------------------------------------------------------------
  const isPositiveChange = stats ? stats.change24h >= 0 : true;

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border border-[#1e293b] rounded-lg overflow-hidden">
      {/* ── Header Bar ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#1e293b] bg-[#0a0e17]">
        <CandlestickChart className="h-3.5 w-3.5 text-[#d4af37]" />
        <span className="text-[10px] font-mono text-[#64748b] uppercase tracking-wider">OHLCV</span>

        {stats && (
          <>
            <span className="mono-data text-sm font-bold text-[#e2e8f0] ml-2">
              {formatPrice(stats.currentPrice)}
            </span>
            <span
              className={`mono-data text-[11px] font-bold flex items-center gap-0.5 ${
                isPositiveChange ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {isPositiveChange ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {formatChange(stats.change24h)}
            </span>

            <div className="ml-auto flex items-center gap-3">
              {/* Volume */}
              <div className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3 text-[#d4af37]" />
                <span className="text-[9px] font-mono text-[#64748b]">Vol</span>
                <span className="mono-data text-[10px] text-[#94a3b8]">{formatVolume(stats.totalVolume)}</span>
              </div>
              {/* High / Low */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#64748b]">H</span>
                <span className="mono-data text-[10px] text-emerald-400">{formatPrice(stats.highPrice)}</span>
                <span className="text-[9px] font-mono text-[#64748b]">L</span>
                <span className="mono-data text-[10px] text-red-400">{formatPrice(stats.lowPrice)}</span>
              </div>
              {/* Refresh */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="h-5 w-5 p-0 text-[#64748b] hover:text-[#e2e8f0]"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              {/* Data freshness */}
              <span className="text-[8px] font-mono text-[#475569]">
                {dataUpdatedAt ? `${Math.floor((Date.now() - dataUpdatedAt) / 1000)}s` : '—'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Timeframe Selector ────────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#1e293b]">
        {ALL_TIMEFRAMES.map((tf) => (
          <Button
            key={tf}
            variant="ghost"
            size="sm"
            onClick={() => handleTimeframeChange(tf)}
            className={`h-5 px-1.5 text-[9px] font-mono ${
              selectedTimeframe === tf
                ? 'bg-[#d4af37]/20 text-[#d4af37]'
                : availableTimeframes.includes(tf)
                  ? 'text-[#94a3b8] hover:text-[#e2e8f0]'
                  : 'text-[#475569] hover:text-[#64748b]'
            }`}
          >
            {tf}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <Activity className="h-3 w-3 text-emerald-400 animate-pulse" />
          <span className="text-[8px] font-mono text-[#64748b]">LIVE</span>
        </div>
      </div>

      {/* ── Chart Area ────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 p-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
          >
            <defs>
              <linearGradient id="volumeGradientUp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={THEME.green} stopOpacity={0.4} />
                <stop offset="100%" stopColor={THEME.green} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="volumeGradientDown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={THEME.red} stopOpacity={0.4} />
                <stop offset="100%" stopColor={THEME.red} stopOpacity={0.05} />
              </linearGradient>
            </defs>

            {/* X Axis — time labels */}
            <XAxis
              dataKey="time"
              axisLine={{ stroke: THEME.border }}
              tickLine={false}
              tick={{ fill: THEME.textMuted, fontSize: 9, fontFamily: 'monospace' }}
              interval="preserveStartEnd"
              minTickGap={40}
            />

            {/* Y Axis — price (left) */}
            <YAxis
              yAxisId="price"
              domain={priceDomain}
              axisLine={false}
              tickLine={false}
              tick={{ fill: THEME.textMuted, fontSize: 9, fontFamily: 'monospace' }}
              tickFormatter={(v: number) => formatPrice(v)}
              width={70}
            />

            {/* Y Axis — volume (right) */}
            <YAxis
              yAxisId="volume"
              orientation="right"
              domain={[0, volumeMax]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: THEME.textMuted, fontSize: 8, fontFamily: 'monospace' }}
              tickFormatter={(v: number) => formatVolume(v)}
              width={50}
            />

            {/* Grid */}
            <Tooltip
              content={<CustomTooltipContent />}
              cursor={{ stroke: THEME.gold, strokeOpacity: 0.3, strokeDasharray: '4 4' }}
            />

            {/* Volume bars */}
            <Bar
              yAxisId="volume"
              dataKey="volume"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              shape={(props: any) => {
                const { x, y, width, height, payload } = props;
                const isGreen = payload?.close >= payload?.open;
                return (
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={isGreen ? THEME.volumeUp : THEME.volumeDown}
                    stroke={isGreen ? THEME.green : THEME.red}
                    strokeWidth={0.3}
                    strokeOpacity={0.3}
                  />
                );
              }}
            />

            {/* Candlestick custom renderer */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Customized component={(props: any) => <CandlestickSeries {...props} data={chartData} />} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
