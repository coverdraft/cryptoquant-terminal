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
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // No JSON body provided, use defaults
    }
    const config: Partial<import('@/lib/services/brain-pipeline').PipelineConfig> = {
      ...(body.capitalUsd !== undefined && { capitalUsd: Number(body.capitalUsd) }),
      ...(body.chain !== undefined && { chain: String(body.chain) }),
      ...(body.scanLimit !== undefined && { scanLimit: Number(body.scanLimit) }),
      ...(body.minOperabilityScore !== undefined && { minOperabilityScore: Number(body.minOperabilityScore) }),
      ...(body.cycleIntervalMs !== undefined && { cycleIntervalMs: Number(body.cycleIntervalMs) }),
      ...(body.maxAllocationPctPerToken !== undefined && { maxAllocationPctPerToken: Number(body.maxAllocationPctPerToken) }),
    };

    const result = await runBrainCycle(config);

    return NextResponse.json({
      data: result,
      error: null,
    }, { status: result.status === 'COMPLETED' ? 200 : 500 });
  } catch (error) {
    console.error('[/api/brain/pipeline] Error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { data: null, error: `Pipeline execution failed: ${errorMsg}` },
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
