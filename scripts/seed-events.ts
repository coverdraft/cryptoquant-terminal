/**
 * Seed Events & Predictive Signals Script - Generates:
 * - 1000+ UserEvent entries with 18 event types
 * - 100+ PredictiveSignal entries with 11 signal types
 *
 * Usage: bun run scripts/seed-events.ts
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// ============================================================
// EVENT TYPE DEFINITIONS
// ============================================================

const EVENT_TYPES = [
  'token_listed',
  'price_alert',
  'rug_pull_detected',
  'smart_money_move',
  'volume_spike',
  'liquidity_change',
  'pattern_detected',
  'whale_alert',
  'degen_buy',
  'sniper_detected',
  'mev_attack',
  'wash_trade_detected',
  'liquidity_trap',
  'v_shape_recovery',
  'fomo_warning',
  'threat_alert',
  'regime_change',
  'bot_swarm',
] as const;

const PREDICTIVE_SIGNAL_TYPES = [
  'REGIME_CHANGE',
  'BOT_SWARM',
  'WHALE_MOVEMENT',
  'LIQUIDITY_DRAIN',
  'CORRELATION_BREAK',
  'ANOMALY',
  'CYCLE_POSITION',
  'SECTOR_ROTATION',
  'MEAN_REVERSION_ZONE',
  'SMART_MONEY_POSITIONING',
  'VOLATILITY_REGIME',
] as const;

const CHAINS = ['SOL', 'ETH', 'BSC', 'ARB', 'BASE', 'OP', 'MATIC', 'AVAX'];

const SECTORS = ['MEME', 'DEFI', 'L1', 'L2', 'NFT', 'BRIDGE', 'STABLE'];

const TOKEN_SYMBOLS = [
  'SOL', 'ETH', 'BTC', 'BNB', 'USDC', 'USDT', 'WETH',
  'BONK', 'WIF', 'JUP', 'RAY', 'ORCA', 'JTO', 'PYTH',
  'UNI', 'LINK', 'AAVE', 'PEPE', 'SHIB', 'MKR', 'COMP',
  'ARB', 'OP', 'MATIC', 'AVAX', 'CAKE', 'GMX', 'PENDLE',
  'RENDER', 'TENSOR', 'POPCAT', 'FLOKI', 'DOGE', 'ADA',
  'DOT', 'NEAR', 'ATOM', 'FTM', 'ALGO', 'XTZ', 'FIL',
  'LDO', 'CRV', 'SNX', 'BAL', 'SUSHI', '1INCH', 'YFI',
  'RUNE', 'INJ', 'SEI', 'SUI', 'APT', 'TIA', 'JITO',
  'EIGEN', 'ENA', 'W', 'STARK', 'BLUR', 'LOOKS', 'X2Y2',
];

const WALLET_ADDRESSES = [
  '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy',
  '9WzDX4B8Bd5NHzRZmB8nQL3fKQRtD3HnUjQw5m2s4YqK',
  '5tzFkiKscXHK5fLMqH9Uc6fX4X2v7q2Z3K8mN4pR7wBjC',
  '2aMCeffQwWjJzJiRpZ5G9nL7P6sK3hV8xD1fN4qW9tEgR',
  '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
  '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
  '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359',
  '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
  '0x1Db3439a222C519ab44bb1144fC28167b4Fa6EE6',
];

// ============================================================
// EVENT GENERATORS
// ============================================================

interface EventTemplate {
  eventType: string;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  pnl?: number;
  walletAddress?: string;
}

function generateEvent(tokenId: string | null, tokenSymbol: string | null, chain: string): EventTemplate {
  const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
  const basePrice = Math.random() > 0.5 ? randRange(0.0001, 100) : randRange(100, 50000);

  switch (eventType) {
    case 'token_listed':
      return {
        eventType,
        entryPrice: basePrice,
      };

    case 'price_alert': {
      const direction = Math.random() > 0.5 ? 'up' : 'down';
      const changePct = randRange(1, 50);
      return {
        eventType,
        entryPrice: basePrice,
        stopLoss: basePrice * (direction === 'up' ? 0.95 : 1.05),
        takeProfit: basePrice * (direction === 'up' ? 1.1 : 0.9),
      };
    }

    case 'rug_pull_detected':
      return {
        eventType,
        entryPrice: basePrice,
        pnl: -randRange(1000, 500000),
        walletAddress: pickRandom(WALLET_ADDRESSES),
      };

    case 'smart_money_move': {
      const isBuy = Math.random() > 0.4;
      return {
        eventType,
        entryPrice: basePrice,
        walletAddress: pickRandom(WALLET_ADDRESSES),
        pnl: isBuy ? randRange(5000, 200000) : randRange(-200000, -5000),
      };
    }

    case 'volume_spike':
      return {
        eventType,
        entryPrice: basePrice,
      };

    case 'liquidity_change': {
      const isAddition = Math.random() > 0.4;
      return {
        eventType,
        entryPrice: basePrice,
        stopLoss: isAddition ? undefined : basePrice * 0.9,
      };
    }

    case 'pattern_detected':
      return {
        eventType,
        entryPrice: basePrice,
        stopLoss: basePrice * randRange(0.85, 0.95),
        takeProfit: basePrice * randRange(1.05, 1.3),
      };

    case 'whale_alert':
      return {
        eventType,
        entryPrice: basePrice,
        walletAddress: pickRandom(WALLET_ADDRESSES),
        pnl: randRange(10000, 1000000) * (Math.random() > 0.5 ? 1 : -1),
      };

    case 'degen_buy':
      return {
        eventType,
        entryPrice: basePrice,
        walletAddress: pickRandom(WALLET_ADDRESSES),
        stopLoss: basePrice * randRange(0.5, 0.8),
        takeProfit: basePrice * randRange(2, 10),
      };

    case 'sniper_detected':
      return {
        eventType,
        entryPrice: basePrice,
        walletAddress: pickRandom(WALLET_ADDRESSES),
        pnl: randRange(-50000, 200000),
      };

    case 'mev_attack':
      return {
        eventType,
        entryPrice: basePrice,
        pnl: -randRange(100, 50000),
        walletAddress: pickRandom(WALLET_ADDRESSES),
      };

    case 'wash_trade_detected':
      return {
        eventType,
        entryPrice: basePrice,
        walletAddress: pickRandom(WALLET_ADDRESSES),
      };

    case 'liquidity_trap':
      return {
        eventType,
        entryPrice: basePrice,
        stopLoss: basePrice * 0.5,
        pnl: -randRange(1000, 100000),
      };

    case 'v_shape_recovery':
      return {
        eventType,
        entryPrice: basePrice * 0.7,
        stopLoss: basePrice * 0.6,
        takeProfit: basePrice * 1.2,
      };

    case 'fomo_warning':
      return {
        eventType,
        entryPrice: basePrice,
        stopLoss: basePrice * 0.85,
      };

    case 'threat_alert':
      return {
        eventType,
        entryPrice: basePrice,
        pnl: -randRange(5000, 500000),
      };

    case 'regime_change':
      return {
        eventType,
      };

    case 'bot_swarm':
      return {
        eventType,
        walletAddress: pickRandom(WALLET_ADDRESSES),
      };

    default:
      return { eventType: 'pattern_detected' };
  }
}

// ============================================================
// PREDICTIVE SIGNAL GENERATOR
// ============================================================

interface PredictiveSignalTemplate {
  signalType: string;
  chain: string;
  sector: string | null;
  prediction: Record<string, any>;
  direction: string;
  confidence: number;
  timeframe: string;
  evidence: any[];
  historicalHitRate: number;
  dataPointsUsed: number;
}

function generatePredictiveSignal(chain: string): PredictiveSignalTemplate {
  const signalType = PREDICTIVE_SIGNAL_TYPES[Math.floor(Math.random() * PREDICTIVE_SIGNAL_TYPES.length)];
  const sector = Math.random() > 0.3 ? pickRandom(SECTORS) : null;

  const directions = ['BULLISH', 'BEARISH', 'NEUTRAL'];
  const timeframes = ['5m', '15m', '1h', '4h', '12h', '24h', '7d'];

  switch (signalType) {
    case 'REGIME_CHANGE':
      return {
        signalType,
        chain,
        sector,
        prediction: {
          fromRegime: pickRandom(['BULL', 'BEAR', 'SIDEWAYS', 'VOLATILE']),
          toRegime: pickRandom(['BULL', 'BEAR', 'SIDEWAYS', 'VOLATILE']),
          probability: randRange(0.4, 0.9),
          trigger: pickRandom(['volume_divergence', 'whale_accumulation', 'retail_capitulation', 'macro_event']),
        },
        direction: pickRandom(directions),
        confidence: randRange(0.3, 0.85),
        timeframe: pickRandom(['4h', '12h', '24h', '7d']),
        evidence: [
          { type: 'volume_analysis', value: randRange(0.5, 3.0) },
          { type: 'whale_movement', count: randInt(3, 20) },
        ],
        historicalHitRate: randRange(0.45, 0.75),
        dataPointsUsed: randInt(1000, 50000),
      };

    case 'BOT_SWARM':
      return {
        signalType,
        chain,
        sector,
        prediction: {
          botType: pickRandom(['sniper', 'mev', 'copy', 'wash', 'maker']),
          estimatedBots: randInt(5, 100),
          targetTokens: randInt(1, 20),
          intensity: pickRandom(['LOW', 'MEDIUM', 'HIGH', 'EXTREME']),
        },
        direction: 'BEARISH',
        confidence: randRange(0.4, 0.9),
        timeframe: pickRandom(['5m', '15m', '1h']),
        evidence: [
          { type: 'bot_detection', score: randRange(0.5, 0.98) },
          { type: 'pattern_match', count: randInt(10, 500) },
        ],
        historicalHitRate: randRange(0.5, 0.8),
        dataPointsUsed: randInt(5000, 100000),
      };

    case 'WHALE_MOVEMENT':
      return {
        signalType,
        chain,
        sector,
        prediction: {
          action: pickRandom(['ACCUMULATION', 'DISTRIBUTION', 'TRANSFER', 'BRIDGE']),
          estimatedValueUsd: randRange(100000, 10000000),
          walletCount: randInt(1, 10),
        },
        direction: pickRandom(['BULLISH', 'BEARISH']),
        confidence: randRange(0.35, 0.85),
        timeframe: pickRandom(['1h', '4h', '24h']),
        evidence: [
          { type: 'large_transaction', count: randInt(1, 50) },
          { type: 'wallet_clustering', count: randInt(2, 15) },
        ],
        historicalHitRate: randRange(0.5, 0.78),
        dataPointsUsed: randInt(2000, 30000),
      };

    case 'LIQUIDITY_DRAIN':
      return {
        signalType,
        chain,
        sector,
        prediction: {
          drainPct: randRange(10, 80),
          estimatedLiquidityRemoved: randRange(50000, 5000000),
          riskLevel: pickRandom(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        },
        direction: 'BEARISH',
        confidence: randRange(0.4, 0.88),
        timeframe: pickRandom(['1h', '4h', '24h']),
        evidence: [
          { type: 'liquidity_removal', events: randInt(1, 20) },
          { type: 'price_impact', estimatedBps: randInt(50, 5000) },
        ],
        historicalHitRate: randRange(0.55, 0.82),
        dataPointsUsed: randInt(500, 20000),
      };

    case 'CORRELATION_BREAK':
      return {
        signalType,
        chain,
        sector,
        prediction: {
          asset1: pickRandom(TOKEN_SYMBOLS.slice(0, 10)),
          asset2: pickRandom(TOKEN_SYMBOLS.slice(0, 10)),
          previousCorrelation: randRange(0.6, 0.99),
          currentCorrelation: randRange(-0.3, 0.4),
          significance: pickRandom(['MODERATE', 'STRONG', 'EXTREME']),
        },
        direction: pickRandom(directions),
        confidence: randRange(0.3, 0.75),
        timeframe: pickRandom(['4h', '24h', '7d']),
        evidence: [
          { type: 'rolling_correlation', window: pickRandom(['1h', '4h', '24h']) },
          { type: 'divergence_score', value: randRange(0.5, 0.95) },
        ],
        historicalHitRate: randRange(0.4, 0.7),
        dataPointsUsed: randInt(1000, 50000),
      };

    case 'ANOMALY':
      return {
        signalType,
        chain,
        sector,
        prediction: {
          anomalyType: pickRandom(['price', 'volume', 'holder_count', 'transaction_frequency', 'gas_usage']),
          deviationSigma: randRange(2, 8),
          description: pickRandom([
            'Unusual volume spike detected',
            'Price deviation exceeds 3 sigma',
            'Abnormal holder distribution change',
            'Transaction frequency anomaly',
            'Gas usage pattern deviation',
          ]),
        },
        direction: pickRandom(directions),
        confidence: randRange(0.3, 0.8),
        timeframe: pickRandom(timeframes),
        evidence: [
          { type: 'statistical_test', pValue: randRange(0.001, 0.05) },
          { type: 'zscore', value: randRange(2, 6) },
        ],
        historicalHitRate: randRange(0.45, 0.72),
        dataPointsUsed: randInt(5000, 100000),
      };

    case 'CYCLE_POSITION':
      return {
        signalType,
        chain,
        sector,
        prediction: {
          currentPhase: pickRandom(['GENESIS', 'INCIPIENT', 'GROWTH', 'FOMO', 'DECLINE', 'LEGACY']),
          nextPhase: pickRandom(['INCIPIENT', 'GROWTH', 'FOMO', 'DECLINE', 'LEGACY']),
          cycleProgress: randRange(0.05, 0.95),
          daysInPhase: randInt(1, 30),
        },
        direction: pickRandom(directions),
        confidence: randRange(0.35, 0.8),
        timeframe: pickRandom(['4h', '24h', '7d']),
        evidence: [
          { type: 'phase_classification', confidence: randRange(0.4, 0.9) },
          { type: 'transition_probability', value: randRange(0.3, 0.85) },
        ],
        historicalHitRate: randRange(0.5, 0.75),
        dataPointsUsed: randInt(2000, 40000),
      };

    case 'SECTOR_ROTATION':
      return {
        signalType,
        chain,
        sector,
        prediction: {
          fromSector: pickRandom(SECTORS),
          toSector: pickRandom(SECTORS),
          rotationSpeed: pickRandom(['SLOW', 'MODERATE', 'FAST']),
          capitalFlowUsd: randRange(100000, 50000000),
        },
        direction: pickRandom(directions),
        confidence: randRange(0.3, 0.75),
        timeframe: pickRandom(['24h', '7d']),
        evidence: [
          { type: 'sector_momentum', sectors: SECTORS.slice(0, 3) },
          { type: 'capital_flow', direction: pickRandom(['IN', 'OUT']) },
        ],
        historicalHitRate: randRange(0.45, 0.7),
        dataPointsUsed: randInt(10000, 100000),
      };

    case 'MEAN_REVERSION_ZONE':
      return {
        signalType,
        chain,
        sector,
        prediction: {
          meanPrice: randRange(0.001, 1000),
          currentDeviation: pickRandom(['-2σ', '-1.5σ', '-1σ', '+1σ', '+1.5σ', '+2σ']),
          expectedReversion: pickRandom(['PARTIAL', 'FULL', 'OVERSHOOT']),
          estimatedTimeframe: pickRandom(['1h', '4h', '24h', '7d']),
        },
        direction: pickRandom(['BULLISH', 'BEARISH']),
        confidence: randRange(0.35, 0.8),
        timeframe: pickRandom(['1h', '4h', '24h']),
        evidence: [
          { type: 'bollinger_position', value: pickRandom(['upper_band', 'lower_band', 'mid_band']) },
          { type: 'rsi', value: randRange(15, 85) },
        ],
        historicalHitRate: randRange(0.5, 0.78),
        dataPointsUsed: randInt(5000, 80000),
      };

    case 'SMART_MONEY_POSITIONING':
      return {
        signalType,
        chain,
        sector,
        prediction: {
          smartMoneyAction: pickRandom(['ACCUMULATING', 'DISTRIBUTING', 'HOLDING', 'EXITING']),
          topWalletsMoving: randInt(3, 25),
          avgPositionChange: randRange(-50, 100),
          consensusStrength: pickRandom(['WEAK', 'MODERATE', 'STRONG']),
        },
        direction: pickRandom(['BULLISH', 'BEARISH']),
        confidence: randRange(0.4, 0.85),
        timeframe: pickRandom(['4h', '24h', '7d']),
        evidence: [
          { type: 'wallet_analysis', topWallets: randInt(5, 30) },
          { type: 'flow_analysis', netFlow: randRange(-1000000, 1000000) },
        ],
        historicalHitRate: randRange(0.5, 0.8),
        dataPointsUsed: randInt(3000, 50000),
      };

    case 'VOLATILITY_REGIME':
      return {
        signalType,
        chain,
        sector,
        prediction: {
          currentVolatility: pickRandom(['VERY_LOW', 'LOW', 'NORMAL', 'HIGH', 'EXTREME']),
          expectedChange: pickRandom(['INCREASING', 'DECREASING', 'STABLE']),
          ivRank: randRange(5, 95),
          ivPercentile: randRange(5, 95),
        },
        direction: pickRandom(directions),
        confidence: randRange(0.3, 0.8),
        timeframe: pickRandom(['1h', '4h', '24h']),
        evidence: [
          { type: 'realized_vol', value: randRange(0.1, 2.0) },
          { type: 'implied_vol', value: randRange(0.2, 1.5) },
        ],
        historicalHitRate: randRange(0.45, 0.75),
        dataPointsUsed: randInt(5000, 60000),
      };

    default:
      return {
        signalType: 'ANOMALY',
        chain,
        sector,
        prediction: { type: 'unknown' },
        direction: 'NEUTRAL',
        confidence: 0.5,
        timeframe: '1h',
        evidence: [],
        historicalHitRate: 0.5,
        dataPointsUsed: 1000,
      };
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(randRange(min, max + 1));
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateEvmAddress(): string {
  const chars = '0123456789abcdef';
  let addr = '0x';
  for (let i = 0; i < 40; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr;
}

function generateSolAddress(): string {
  const base58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let addr = '';
  for (let i = 0; i < 44; i++) {
    addr += base58[Math.floor(Math.random() * base58.length)];
  }
  return addr;
}

function generateTokenAddress(chain: string): string {
  return chain === 'SOL' ? generateSolAddress() : generateEvmAddress();
}

function randomPastDate(maxDaysAgo: number): Date {
  const now = Date.now();
  return new Date(now - Math.random() * maxDaysAgo * 86400000);
}

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function seedEventsAndSignals() {
  console.log('=== Starting Events & Predictive Signals Seeding ===');

  // Check existing counts
  const existingEvents = await db.userEvent.count();
  const existingSignals = await db.predictiveSignal.count();
  console.log(`Existing events: ${existingEvents}, existing predictive signals: ${existingSignals}`);

  // Get existing tokens for referencing
  const existingTokens = await db.token.findMany({
    select: { id: true, symbol: true, chain: true, address: true },
    take: 500,
  });

  // Also create synthetic token references for events
  const syntheticTokenSymbols = [...TOKEN_SYMBOLS];

  // ============================================================
  // SEED USER EVENTS (1000+)
  // ============================================================
  console.log('\n--- Seeding User Events ---');
  const TOTAL_EVENTS = 1200;
  let eventsCreated = 0;

  // Distribute event types realistically
  const eventDistribution: Record<string, number> = {
    'price_alert': 200,
    'smart_money_move': 150,
    'whale_alert': 120,
    'volume_spike': 120,
    'degen_buy': 100,
    'token_listed': 80,
    'rug_pull_detected': 60,
    'sniper_detected': 60,
    'liquidity_change': 60,
    'pattern_detected': 50,
    'bot_swarm': 40,
    'threat_alert': 35,
    'liquidity_trap': 30,
    'v_shape_recovery': 30,
    'wash_trade_detected': 25,
    'mev_attack': 25,
    'fomo_warning': 20,
    'regime_change': 15,
  };

  // Verify distribution totals 1200
  const distTotal = Object.values(eventDistribution).reduce((a, b) => a + b, 0);
  if (distTotal !== TOTAL_EVENTS) {
    eventDistribution['price_alert'] += TOTAL_EVENTS - distTotal;
  }

  for (const [eventType, count] of Object.entries(eventDistribution)) {
    for (let i = 0; i < count; i++) {
      try {
        // Pick a token (existing or synthetic)
        const token = existingTokens.length > 0 && Math.random() > 0.2
          ? pickRandom(existingTokens)
          : null;

        const chain = token?.chain || pickRandom(CHAINS);
        const tokenSymbol = token?.symbol || pickRandom(syntheticTokenSymbols);
        const tokenId = token?.id || null;

        // Generate event data based on type
        const eventData = generateEvent(tokenId, tokenSymbol, chain);

        // Generate wallet address for certain event types
        const needsWallet = ['smart_money_move', 'whale_alert', 'degen_buy', 'sniper_detected', 'mev_attack', 'wash_trade_detected', 'bot_swarm'].includes(eventType);

        await db.userEvent.create({
          data: {
            eventType: eventData.eventType,
            tokenId: tokenId,
            walletAddress: needsWallet ? (eventData.walletAddress || pickRandom(WALLET_ADDRESSES)) : undefined,
            entryPrice: eventData.entryPrice,
            stopLoss: eventData.stopLoss,
            takeProfit: eventData.takeProfit,
            pnl: eventData.pnl,
            createdAt: randomPastDate(30), // Events in the last 30 days
          },
        });

        eventsCreated++;
      } catch (err) {
        // Skip individual errors
      }
    }

    // Progress
    if (eventsCreated % 100 === 0) {
      console.log(`[SeedEvents] Progress: ${eventsCreated}/${TOTAL_EVENTS} events`);
    }
  }

  console.log(`[SeedEvents] Created ${eventsCreated} user events`);

  // ============================================================
  // SEED PREDICTIVE SIGNALS (100+)
  // ============================================================
  console.log('\n--- Seeding Predictive Signals ---');
  const TOTAL_SIGNALS = 120;
  let signalsCreated = 0;

  for (let i = 0; i < TOTAL_SIGNALS; i++) {
    try {
      const chain = pickRandom(CHAINS);
      const signalData = generatePredictiveSignal(chain);

      // Get a token address if available
      const token = existingTokens.length > 0 && Math.random() > 0.3
        ? pickRandom(existingTokens)
        : null;

      const validUntil = new Date(Date.now() + randRange(1, 72) * 3600000);

      await db.predictiveSignal.create({
        data: {
          signalType: signalData.signalType,
          chain: signalData.chain,
          tokenAddress: token?.address || generateTokenAddress(chain),
          sector: signalData.sector,
          prediction: JSON.stringify(signalData.prediction),
          direction: signalData.direction,
          confidence: signalData.confidence,
          timeframe: signalData.timeframe,
          validUntil,
          evidence: JSON.stringify(signalData.evidence),
          historicalHitRate: signalData.historicalHitRate,
          dataPointsUsed: signalData.dataPointsUsed,
          wasCorrect: Math.random() > 0.7 ? Math.random() > 0.5 : null,
          actualOutcome: Math.random() > 0.7 ? JSON.stringify({ result: pickRandom(['correct', 'incorrect', 'partial']) }) : null,
        },
      });

      signalsCreated++;
    } catch (err) {
      // Skip individual errors
    }
  }

  console.log(`[SeedSignals] Created ${signalsCreated} predictive signals`);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n=== Events & Signals Seeding Complete ===');
  console.log(`User events created: ${eventsCreated}`);
  console.log(`Predictive signals created: ${signalsCreated}`);

  // Event type distribution
  const eventTypeCounts = await db.userEvent.groupBy({
    by: ['eventType'],
    _count: { eventType: true },
    orderBy: { _count: { eventType: 'desc' } },
  });
  console.log('\nEvent type distribution:');
  for (const ec of eventTypeCounts) {
    console.log(`  ${ec.eventType}: ${ec._count.eventType}`);
  }

  // Signal type distribution
  const signalTypeCounts = await db.predictiveSignal.groupBy({
    by: ['signalType'],
    _count: { signalType: true },
    orderBy: { _count: { signalType: 'desc' } },
  });
  console.log('\nSignal type distribution:');
  for (const sc of signalTypeCounts) {
    console.log(`  ${sc.signalType}: ${sc._count.signalType}`);
  }

  // Chain distribution for signals
  const signalChainCounts = await db.predictiveSignal.groupBy({
    by: ['chain'],
    _count: { chain: true },
    orderBy: { _count: { chain: 'desc' } },
  });
  console.log('\nSignal chain distribution:');
  for (const cc of signalChainCounts) {
    console.log(`  ${cc.chain}: ${cc._count.chain}`);
  }
}

// ============================================================
// EXECUTE
// ============================================================

seedEventsAndSignals()
  .catch(console.error)
  .finally(() => db.$disconnect());
