'use client';

import { useCryptoStore, type TokenData } from '@/store/crypto-store';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Database, RefreshCw, Loader2, Radio } from 'lucide-react';

// ============================================================
// API RESPONSE TYPES
// ============================================================

interface ApiTokenData {
  id: string;
  symbol: string;
  name: string;
  chain: string;
  address?: string;
  priceUsd: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  priceChange5m: number;
  priceChange15m: number;
  priceChange1h: number;
  priceChange24h: number;
  riskScore?: number;
}

// ============================================================
// HELPERS
// ============================================================

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((value, index) => ({ index, value }));
  return (
    <ResponsiveContainer width={60} height={24}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function formatPrice(price: number) {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.001) return price.toFixed(4);
  if (price >= 0.00001) return price.toFixed(6);
  return price.toFixed(8);
}

function formatVolume(vol: number) {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toFixed(0);
}

function getRiskLabel(riskScore?: number) {
  if (!riskScore) return 'N/A';
  if (riskScore <= 30) return 'SAFE';
  if (riskScore <= 60) return 'CAUTION';
  return 'DANGER';
}

function getRiskBadgeClasses(riskScore?: number) {
  const label = getRiskLabel(riskScore);
  if (label === 'SAFE') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (label === 'CAUTION') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

function getChainBadgeClasses(chain: string) {
  const upper = chain.toUpperCase();
  if (upper === 'SOL' || upper === 'SOLANA') return 'border-purple-500/50 text-purple-400';
  if (upper === 'ETH' || upper === 'ETHEREUM') return 'border-blue-500/50 text-blue-400';
  if (upper === 'BASE') return 'border-sky-500/50 text-sky-400';
  if (upper === 'ARB') return 'border-indigo-500/50 text-indigo-400';
  return 'border-gray-500/50 text-gray-400';
}

function normalizeChain(chain: string): string {
  const upper = chain.toUpperCase();
  if (upper === 'SOLANA') return 'SOL';
  if (upper === 'ETHEREUM') return 'ETH';
  return upper;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function TokenFlow() {
  const { tokens: wsTokens, selectedToken, selectToken, chainFilter, setChainFilter, riskFilter, setRiskFilter, sortBy, setSortBy } = useCryptoStore();
  const [search, setSearch] = useState('');
  const [useLiveData, setUseLiveData] = useState(true);

  // Fetch real token data from DexScreener API
  const { data: apiTokensData, isLoading: apiLoading, data: apiSource } = useQuery({
    queryKey: ['market-tokens', chainFilter],
    queryFn: async () => {
      try {
        const chain = chainFilter === 'ALL' ? 'all' : chainFilter.toLowerCase();
        const res = await fetch(`/api/market/tokens?chain=${chain}&limit=50`);
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        return {
          tokens: (json.data || []) as ApiTokenData[],
          source: json.source as 'live' | 'fallback',
        };
      } catch {
        return { tokens: [] as ApiTokenData[], source: 'fallback' as const };
      }
    },
    refetchInterval: 30000, // Refresh every 30s
    staleTime: 15000,
    enabled: useLiveData,
  });

  // Merge API tokens with WS tokens — API data takes priority for price/volume
  const mergedTokens = useMemo(() => {
    if (!useLiveData || !apiTokensData || apiTokensData.tokens.length === 0) {
      // Use WS tokens only
      return wsTokens.map(t => ({ ...t, _dataSource: 'ws' as const }));
    }

    const apiTokens = apiTokensData.tokens;
    const apiSourceFlag = apiTokensData.source;

    // Build a map of WS tokens by symbol for quick lookup
    const wsBySymbol = new Map<string, TokenData>();
    for (const t of wsTokens) {
      wsBySymbol.set(t.symbol.toUpperCase(), t);
    }

    // Start with API tokens (real DexScreener data)
    const merged: Array<TokenData & { _dataSource: 'api' | 'ws'; _apiSource?: string; _address?: string }> = [];

    const seenSymbols = new Set<string>();

    for (const apiToken of apiTokens) {
      const symbolKey = `${apiToken.symbol.toUpperCase()}-${normalizeChain(apiToken.chain)}`;
      // Skip duplicate symbols on the same chain
      if (seenSymbols.has(symbolKey)) continue;

      const wsToken = wsBySymbol.get(apiToken.symbol.toUpperCase());
      const normalizedChain = normalizeChain(apiToken.chain);

      // API token data with optional WS enrichment (priceHistory)
      merged.push({
        id: apiToken.id,
        symbol: apiToken.symbol,
        name: apiToken.name,
        chain: normalizedChain,
        priceUsd: apiToken.priceUsd,
        volume24h: apiToken.volume24h,
        liquidity: apiToken.liquidity,
        marketCap: apiToken.marketCap,
        priceChange5m: apiToken.priceChange5m,
        priceChange15m: apiToken.priceChange15m,
        priceChange1h: apiToken.priceChange1h,
        priceChange24h: apiToken.priceChange24h,
        riskScore: apiToken.riskScore,
        priceHistory: wsToken?.priceHistory,
        _dataSource: 'api',
        _apiSource: apiSourceFlag,
        _address: apiToken.address || apiToken.id,
      } as TokenData & { _dataSource: 'api'; _apiSource: string; _address?: string });

      seenSymbols.add(symbolKey);
    }

    // Add WS-only tokens not already in API data
    for (const wsToken of wsTokens) {
      const symbolKey = `${wsToken.symbol.toUpperCase()}-${normalizeChain(wsToken.chain)}`;
      if (!seenSymbols.has(symbolKey)) {
        merged.push({
          ...wsToken,
          _dataSource: 'ws' as const,
          _address: (wsToken as any).address || wsToken.id,
        } as TokenData & { _dataSource: 'ws'; _address?: string });
        seenSymbols.add(symbolKey);
      }
    }

    return merged;
  }, [wsTokens, apiTokensData, useLiveData]);

  // Filter + sort
  const filteredTokens = useMemo(() => {
    let filtered = [...mergedTokens];

    if (chainFilter !== 'ALL') {
      filtered = filtered.filter((t) => normalizeChain(t.chain) === chainFilter);
    }

    if (riskFilter !== 'ALL') {
      filtered = filtered.filter((t) => {
        if (riskFilter === 'SAFE') return (t.riskScore ?? 50) <= 30;
        if (riskFilter === 'CAUTION') return (t.riskScore ?? 50) > 30 && (t.riskScore ?? 50) <= 60;
        if (riskFilter === 'DANGER') return (t.riskScore ?? 50) > 60;
        return true;
      });
    }

    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(
        (t) => t.symbol.toLowerCase().includes(lower) || t.name.toLowerCase().includes(lower)
      );
    }

    switch (sortBy) {
      case 'volume':
        filtered.sort((a, b) => b.volume24h - a.volume24h);
        break;
      case 'price_change':
        filtered.sort((a, b) => Math.abs(b.priceChange24h) - Math.abs(a.priceChange24h));
        break;
      case 'newest':
        filtered.sort((a, b) => b.marketCap - a.marketCap);
        break;
      case 'risk':
        filtered.sort((a, b) => (b.riskScore ?? 50) - (a.riskScore ?? 50));
        break;
    }

    return filtered;
  }, [mergedTokens, chainFilter, riskFilter, sortBy, search]);

  // Stats
  const apiTokenCount = mergedTokens.filter(t => (t as TokenData & { _dataSource: string })._dataSource === 'api').length;
  const wsTokenCount = mergedTokens.filter(t => (t as TokenData & { _dataSource: string })._dataSource === 'ws').length;
  const effectiveSource = apiTokensData?.source || 'fallback';

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border border-[#1e293b] rounded-lg overflow-hidden">
      {/* Header with data source info */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#1e293b] bg-[#0a0e17]">
        <Database className="h-3.5 w-3.5 text-[#d4af37]" />
        <span className="text-[10px] font-mono text-[#64748b] uppercase tracking-wider">Token Flow</span>

        <div className="ml-auto flex items-center gap-3">
          {/* Data source stats */}
          {useLiveData && (
            <span className="text-[9px] font-mono text-[#64748b]">
              {apiTokenCount} live{wsTokenCount > 0 ? ` + ${wsTokenCount} WS` : ''}
            </span>
          )}

          {/* Source indicator */}
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${
              useLiveData && effectiveSource === 'live' ? 'bg-emerald-500' :
              useLiveData && effectiveSource === 'fallback' ? 'bg-yellow-500' :
              'bg-gray-500'
            } animate-pulse`} />
            <span className={`text-[9px] font-mono ${
              useLiveData && effectiveSource === 'live' ? 'text-emerald-400' :
              useLiveData && effectiveSource === 'fallback' ? 'text-yellow-400' :
              'text-gray-400'
            }`}>
              {useLiveData ? (effectiveSource === 'live' ? 'LIVE' : 'DB') : 'WS'}
            </span>
          </div>

          {/* Toggle live data */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUseLiveData(!useLiveData)}
            className={`h-5 px-1.5 text-[9px] font-mono ${
              useLiveData ? 'text-emerald-400 hover:text-emerald-300' : 'text-[#64748b] hover:text-[#94a3b8]'
            }`}
          >
            <Radio className="h-2.5 w-2.5 mr-1" />
            {useLiveData ? 'Live' : 'WS'}
          </Button>

          {apiLoading && <Loader2 className="h-3 w-3 text-[#d4af37] animate-spin" />}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 p-2.5 border-b border-[#1e293b] bg-[#0d1117]">
        <input
          type="text"
          placeholder="Search token..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#1a1f2e] border border-[#2d3748] rounded px-2 py-1 text-xs font-mono text-[#e2e8f0] placeholder-[#64748b] w-28 focus:outline-none focus:border-[#d4af37]/50"
        />

        <div className="flex gap-0.5">
          {['ALL', 'SOL', 'ETH', 'BASE', 'ARB'].map((chain) => (
            <Button
              key={chain}
              variant="ghost"
              size="sm"
              onClick={() => setChainFilter(chain)}
              className={`h-5 px-1.5 text-[9px] font-mono ${
                chainFilter === chain
                  ? 'bg-[#d4af37]/20 text-[#d4af37]'
                  : 'text-[#64748b] hover:text-[#e2e8f0]'
              }`}
            >
              {chain}
            </Button>
          ))}
        </div>

        <div className="h-4 w-px bg-[#1e293b]" />

        <div className="flex gap-0.5">
          {['ALL', 'SAFE', 'CAUTION', 'DANGER'].map((risk) => (
            <Button
              key={risk}
              variant="ghost"
              size="sm"
              onClick={() => setRiskFilter(risk)}
              className={`h-5 px-1.5 text-[9px] font-mono ${
                riskFilter === risk
                  ? risk === 'SAFE' ? 'bg-emerald-500/20 text-emerald-400'
                    : risk === 'CAUTION' ? 'bg-yellow-500/20 text-yellow-400'
                    : risk === 'DANGER' ? 'bg-red-500/20 text-red-400'
                    : 'bg-[#d4af37]/20 text-[#d4af37]'
                  : 'text-[#64748b] hover:text-[#e2e8f0]'
              }`}
            >
              {risk}
            </Button>
          ))}
        </div>

        <div className="h-4 w-px bg-[#1e293b]" />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-[#1a1f2e] border border-[#2d3748] rounded px-1.5 py-0.5 text-[10px] font-mono text-[#94a3b8] focus:outline-none focus:border-[#d4af37]/50"
        >
          <option value="volume">Volume</option>
          <option value="price_change">Price Change</option>
          <option value="newest">Mkt Cap</option>
          <option value="risk">Risk</option>
        </select>

        <span className="ml-auto text-[9px] font-mono text-[#475569]">
          {filteredTokens.length} token{filteredTokens.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Token Table */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
        <table className="w-full">
          <thead className="sticky top-0 bg-[#0d1117] z-10">
            <tr className="text-[9px] font-mono text-[#64748b] uppercase tracking-wider">
              <th className="text-left py-1.5 px-3">Token</th>
              <th className="text-right py-1.5 px-2">Price</th>
              <th className="text-right py-1.5 px-2">5m</th>
              <th className="text-right py-1.5 px-2">1h</th>
              <th className="text-right py-1.5 px-2">24h</th>
              <th className="text-right py-1.5 px-2">Vol 24h</th>
              <th className="text-right py-1.5 px-2">Liq</th>
              <th className="text-center py-1.5 px-2">Chart</th>
              <th className="text-center py-1.5 px-2">Risk</th>
              <th className="text-center py-1.5 px-1">Src</th>
            </tr>
          </thead>
          <tbody>
            {filteredTokens.map((token) => {
              const isSelected = selectedToken?.id === token.id;
              const priceHistory = token.priceHistory || [];
              const sparkColor = token.priceChange24h >= 0 ? '#10b981' : '#ef4444';
              const dataSource = (token as TokenData & { _dataSource?: string })._dataSource || 'ws';

              return (
                <tr
                  key={(token as any)._address || (token as any).id || `${token.symbol}-${token.chain}-${(mergedTokens as any[]).indexOf(token)}`}
                  onClick={() => selectToken(token as TokenData)}
                  className={`cursor-pointer transition-colors border-b border-[#1e293b]/50 hover:bg-[#1a1f2e] ${
                    isSelected ? 'bg-[#d4af37]/10 border-l-2 border-l-[#d4af37]' : ''
                  }`}
                >
                  <td className="py-1.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-[#e2e8f0]">{token.symbol}</span>
                      <span className="text-[9px] text-[#64748b] truncate max-w-[70px]">{token.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-[8px] h-3.5 px-1 font-mono ${getChainBadgeClasses(token.chain)}`}
                      >
                        {normalizeChain(token.chain)}
                      </Badge>
                    </div>
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <span className="mono-data text-[11px] text-[#e2e8f0]">${formatPrice(token.priceUsd)}</span>
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <span className={`mono-data text-[11px] ${token.priceChange5m >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {token.priceChange5m >= 0 ? '+' : ''}{token.priceChange5m.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <span className={`mono-data text-[11px] ${token.priceChange1h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {token.priceChange1h >= 0 ? '+' : ''}{token.priceChange1h.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <span className={`mono-data text-[11px] font-bold ${token.priceChange24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <span className="mono-data text-[11px] text-[#94a3b8]">${formatVolume(token.volume24h)}</span>
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <span className="mono-data text-[11px] text-[#94a3b8]">${formatVolume(token.liquidity)}</span>
                  </td>
                  <td className="py-0 px-2">
                    {priceHistory.length > 2 && <MiniSparkline data={priceHistory} color={sparkColor} />}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <Badge
                      className={`text-[8px] h-3.5 px-1 font-mono font-bold ${getRiskBadgeClasses(token.riskScore)}`}
                    >
                      {token.riskScore ?? '?'}
                    </Badge>
                  </td>
                  <td className="py-1.5 px-1 text-center">
                    <span className={`h-1.5 w-1.5 rounded-full inline-block ${
                      dataSource === 'api' ? 'bg-emerald-500' : 'bg-gray-500'
                    }`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredTokens.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-[#64748b] font-mono text-xs gap-2">
            {apiLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#d4af37]" />
                <span>Loading tokens from DexScreener...</span>
              </>
            ) : (
              <span>No tokens matching filters</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
