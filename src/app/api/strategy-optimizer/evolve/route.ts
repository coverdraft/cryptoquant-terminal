import { NextRequest, NextResponse } from 'next/server';
import { strategyEvolutionEngine, DEFAULT_EVOLUTION_CONFIG, type EvolutionConfig } from '@/lib/services/strategy-evolution-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/strategy-optimizer/evolve
// Run the synthetic evolution loop on top strategies
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === 'evolve') {
      const config: EvolutionConfig = {
        maxIterations: Number(body.maxIterations) || DEFAULT_EVOLUTION_CONFIG.maxIterations,
        improvementThreshold: Number(body.improvementThreshold) || DEFAULT_EVOLUTION_CONFIG.improvementThreshold,
        mutationRate: Number(body.mutationRate) || DEFAULT_EVOLUTION_CONFIG.mutationRate,
        topN: Number(body.topN) || DEFAULT_EVOLUTION_CONFIG.topN,
        capital: Number(body.capital) || DEFAULT_EVOLUTION_CONFIG.capital,
      };

      console.log(`[Evolve] Starting evolution with config:`, config);

      const result = await strategyEvolutionEngine.runEvolution(config);

      return NextResponse.json({
        data: {
          ...result,
          message: `Evolution complete: ${result.improved} improved, ${result.degraded} degraded out of ${result.totalMutations} mutations across ${result.iterations} iterations`,
        },
      });
    }

    if (action === 'execute_entry') {
      const { systemId, tokenAddress, tokenSymbol, direction, entryPrice, positionSizeUsd, chain } = body;

      if (!systemId || !tokenAddress || !entryPrice || !positionSizeUsd) {
        return NextResponse.json(
          { data: null, error: 'Missing required fields: systemId, tokenAddress, entryPrice, positionSizeUsd' },
          { status: 400 },
        );
      }

      const result = await strategyEvolutionEngine.executeEntry({
        systemId,
        tokenAddress,
        tokenSymbol: tokenSymbol || '',
        direction: direction || 'LONG',
        entryPrice: Number(entryPrice),
        positionSizeUsd: Number(positionSizeUsd),
        chain,
      });

      return NextResponse.json({ data: result });
    }

    if (action === 'execute_exit') {
      const { backtestId, exitPrice, exitReason } = body;

      if (!backtestId || !exitPrice) {
        return NextResponse.json(
          { data: null, error: 'Missing required fields: backtestId, exitPrice' },
          { status: 400 },
        );
      }

      const result = await strategyEvolutionEngine.executeExit({
        backtestId,
        exitPrice: Number(exitPrice),
        exitReason: exitReason || 'manual_exit',
      });

      return NextResponse.json({ data: result });
    }

    if (action === 'open_positions') {
      const positions = await strategyEvolutionEngine.getOpenPositions();
      return NextResponse.json({ data: positions });
    }

    if (action === 'trade_history') {
      const { systemId, limit } = body;
      const history = await strategyEvolutionEngine.getTradeHistory(
        systemId || undefined,
        Number(limit) || 50,
      );
      return NextResponse.json({ data: history });
    }

    return NextResponse.json(
      { data: null, error: `Unknown action: ${action}. Valid actions: evolve, execute_entry, execute_exit, open_positions, trade_history` },
      { status: 400 },
    );
  } catch (error) {
    console.error('Evolution API error:', error);
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Evolution API failed' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'trade_history';
    const systemId = searchParams.get('systemId') || undefined;
    const limit = Number(searchParams.get('limit')) || 50;

    if (type === 'open_positions') {
      const positions = await strategyEvolutionEngine.getOpenPositions();
      return NextResponse.json({ data: positions });
    }

    if (type === 'trade_history') {
      const history = await strategyEvolutionEngine.getTradeHistory(systemId, limit);
      return NextResponse.json({ data: history });
    }

    return NextResponse.json(
      { data: null, error: `Unknown type: ${type}` },
      { status: 400 },
    );
  } catch (error) {
    console.error('Evolution GET error:', error);
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to fetch trade data' },
      { status: 500 },
    );
  }
}
