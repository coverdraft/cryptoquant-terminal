import { create } from 'zustand';
import type { DeepAnalysis as DeepAnalysisType, ThinkingDepth } from '@/lib/services/deep-analysis-engine';
import type { DeepAnalysisResult } from '@/lib/services/deep-analysis-engine';

// The store works with either DeepAnalysis (rich UI format) or DeepAnalysisResult (API format)
export type DeepAnalysis = DeepAnalysisType & Partial<DeepAnalysisResult>;

// ============================================================
// TYPES
// ============================================================

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

export interface DeepAnalysisState {
  // Analysis result
  analysis: DeepAnalysis | null;
  status: AnalysisStatus;
  error: string | null;

  // Form inputs
  tokenAddress: string;
  chain: string;
  depth: ThinkingDepth;

  // UI state
  showReasoningChain: boolean;

  // History
  analysisHistory: DeepAnalysis[];

  // Actions
  setAnalysis: (analysis: DeepAnalysis) => void;
  setStatus: (status: AnalysisStatus) => void;
  setError: (error: string | null) => void;
  setTokenAddress: (address: string) => void;
  setChain: (chain: string) => void;
  setDepth: (depth: ThinkingDepth) => void;
  toggleReasoningChain: () => void;
  reset: () => void;
  runAnalysis: () => Promise<void>;
}

// ============================================================
// STORE
// ============================================================

export const useDeepAnalysisStore = create<DeepAnalysisState>((set, get) => ({
  // Analysis result
  analysis: null,
  status: 'idle',
  error: null,

  // Form inputs
  tokenAddress: '',
  chain: 'SOL',
  depth: 'STANDARD',

  // UI state
  showReasoningChain: false,

  // History
  analysisHistory: [],

  // Actions
  setAnalysis: (analysis) =>
    set((state) => ({
      analysis,
      status: 'success',
      error: null,
      analysisHistory: [analysis, ...state.analysisHistory].slice(0, 10),
    })),

  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: error ? 'error' : 'idle' }),
  setTokenAddress: (tokenAddress) => set({ tokenAddress }),
  setChain: (chain) => set({ chain }),
  setDepth: (depth) => set({ depth }),
  toggleReasoningChain: () =>
    set((state) => ({ showReasoningChain: !state.showReasoningChain })),

  reset: () =>
    set({
      analysis: null,
      status: 'idle',
      error: null,
      tokenAddress: '',
      showReasoningChain: false,
    }),

  runAnalysis: async () => {
    const { tokenAddress, chain, depth } = get();
    if (!tokenAddress.trim()) {
      set({ error: 'Token address is required', status: 'error' });
      return;
    }

    set({ status: 'loading', error: null });

    try {
      const res = await fetch('/api/deep-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: tokenAddress.trim(),
          chain,
          depth,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Analysis failed (${res.status})`);
      }

      const data = await res.json();
      if (data.success && data.analysis) {
        get().setAnalysis(data.analysis);
      } else {
        throw new Error(data.error || 'Invalid response from analysis engine');
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
      });
    }
  },
}));
