import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/paper-trading
 * Get paper trading status and stats.
 */
export async function GET() {
  try {
    const { paperTradingEngine } = await import('@/lib/services/paper-trading-engine');
    const stats = paperTradingEngine.getStatus();
    const openPositions = paperTradingEngine.getOpenPositions();
    const recentTrades = paperTradingEngine.getTradeHistory().slice(-10);

    return NextResponse.json({
      data: {
        stats,
        openPositions,
        recentTrades,
      },
    });
  } catch (error) {
    console.error('Error getting paper trading status:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to get paper trading status' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/paper-trading
 * Start, stop, pause, resume, or run a single scan.
 */
export async function POST(request: NextRequest) {
  try {
    const { paperTradingEngine } = await import('@/lib/services/paper-trading-engine');
    const body = await request.json();
    const { action, config } = body as {
      action?: string;
      config?: Record<string, unknown>;
    };

    switch (action) {
      case 'start': {
        const result = await paperTradingEngine.start(config || {});
        return NextResponse.json({ data: result });
      }

      case 'stop': {
        const result = await paperTradingEngine.stop();
        return NextResponse.json({ data: result });
      }

      case 'pause': {
        paperTradingEngine.pause();
        return NextResponse.json({ data: { paused: true } });
      }

      case 'resume': {
        paperTradingEngine.resume();
        return NextResponse.json({ data: { resumed: true } });
      }

      case 'scan': {
        const result = await paperTradingEngine.runSingleScan();
        return NextResponse.json({ data: result });
      }

      default:
        return NextResponse.json(
          { data: null, error: 'Invalid action. Use: start, stop, pause, resume, scan' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Error with paper trading action:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to execute paper trading action' },
      { status: 500 },
    );
  }
}
