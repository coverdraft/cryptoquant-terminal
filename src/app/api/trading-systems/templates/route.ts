import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/trading-systems/templates
 * Get all system templates from the TradingSystemEngine.
 * Returns templates grouped by category with icons and descriptions.
 * Optional ?category=ALPHA_HUNTER filter.
 */
export async function GET(request: NextRequest) {
  try {
    const tsModule = await import('@/lib/services/trading-system-engine');
    const tradingSystemEngine = tsModule.tradingSystemEngine;
    type SystemCategory = import('@/lib/services/trading-system-engine').SystemCategory;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as SystemCategory | null;

    if (category) {
      // Validate category
      const validCategories: SystemCategory[] = [
        'ALPHA_HUNTER', 'SMART_MONEY', 'TECHNICAL', 'DEFENSIVE',
        'BOT_AWARE', 'DEEP_ANALYSIS', 'MICRO_STRUCTURE', 'ADAPTIVE',
      ];

      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { data: null, error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
          { status: 400 },
        );
      }

      const templates = tradingSystemEngine.getTemplates(category);
      const categories = tradingSystemEngine.getCategories();

      return NextResponse.json({
        data: {
          category: categories.find((c) => c.id === category) || null,
          templates,
        },
      });
    }

    // Return all templates grouped by category
    const grouped = tradingSystemEngine.getTemplatesGroupedByCategory();
    const categories = tradingSystemEngine.getCategories();

    return NextResponse.json({
      data: {
        categories,
        grouped,
        totalTemplates: tradingSystemEngine.getTemplateCount(),
      },
    });
  } catch (error) {
    console.error('Error getting system templates:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to get system templates' },
      { status: 500 },
    );
  }
}
