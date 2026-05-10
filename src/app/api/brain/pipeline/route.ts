import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/brain/pipeline
 * Run a brain pipeline cycle with optional config overrides.
 */
export async function POST(request: NextRequest) {
  try {
    const { runBrainCycle } = await import('@/lib/services/brain-pipeline');
    const body = await request.json();
    const config: Partial<import('@/lib/services/brain-pipeline').PipelineConfig> = {
      capitalUsd: body.capitalUsd,
      chain: body.chain || 'solana',
      scanLimit: body.scanLimit || 50,
      minOperabilityScore: body.minOperabilityScore || 40,
      cycleIntervalMs: body.cycleIntervalMs || 60000,
      maxAllocationPctPerToken: body.maxAllocationPctPerToken || 10,
    };

    const result = await runBrainCycle(config);

    return NextResponse.json({
      data: result,
      error: null,
    }, { status: result.status === 'COMPLETED' ? 200 : 500 });
  } catch (error) {
    console.error('[/api/brain/pipeline] Error:', error);
    return NextResponse.json(
      { data: null, error: 'Pipeline execution failed' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/brain/pipeline
 * Get current capital state and recent cycles.
 */
export async function GET() {
  try {
    const { getCapitalState, getRecentCycles } = await import('@/lib/services/brain-pipeline');
    const [capitalState, recentCycles] = await Promise.all([
      getCapitalState(),
      getRecentCycles(10),
    ]);

    return NextResponse.json({
      data: {
        capital: capitalState,
        recentCycles,
      },
      error: null,
    });
  } catch (error) {
    console.error('[/api/brain/pipeline] GET error:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to get pipeline state' },
      { status: 500 },
    );
  }
}
