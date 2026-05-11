/**
 * Seed Traders Script - Generates 500+ realistic traders with:
 * - 8 archetypes: whale, degen, sniper, early_investor, mev_bot, nft_whale, airdrop_farmer, bridging_whale
 * - Realistic performance metrics
 * - Different chains (SOL, ETH, BSC, ARB, BASE, OP, MATIC, AVAX)
 * - Bot detection signals
 * - Behavioral metrics
 * - TraderTransaction entries (10-50 per trader)
 * - WalletTokenHolding entries (3-8 per trader)
 * 
 * Usage: bun run scripts/seed-traders.ts
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// ============================================================
// ARCHETYPE DEFINITIONS
// ============================================================

interface ArchetypeConfig {
  primaryLabel: string;
  subLabels: string[];
  isBot: boolean;
  botType: string | null;
  isSmartMoney: boolean;
  isWhale: boolean;
  isSniper: boolean;
  // Performance ranges
  winRateRange: [number, number];
  totalPnlRange: [number, number];
  sharpeRatioRange: [number, number];
  profitFactorRange: [number, number];
  avgHoldTimeMinRange: [number, number];
  avgTradeSizeUsdRange: [number, number];
  totalTradesRange: [number, number];
  // Behavioral
  washTradeScoreRange: [number, number];
  copyTradeScoreRange: [number, number];
  frontrunCountRange: [number, number];
  sandwichCountRange: [number, number];
  isActive247: boolean;
  isActiveAtNight: boolean;
  consistencyScoreRange: [number, number];
  // Smart money specific
  smartMoneyScoreRange: [number, number];
  earlyEntryCountRange: [number, number];
  avgEntryRankRange: [number, number];
  // Whale specific
  whaleScoreRange: [number, number];
  totalHoldingsUsdRange: [number, number];
  // Sniper specific
  sniperScoreRange: [number, number];
  block0EntryCountRange: [number, number];
  // Bot confidence
  botConfidenceRange: [number, number];
  // Preferred token types
  preferredTokenTypes: string[];
  // Preferred DEXes
  preferredDexes: string[];
  // Avg positions at once
  avgPositionsRange: [number, number];
}

const ARCHETYPES: Record<string, ArchetypeConfig> = {
  whale: {
    primaryLabel: 'WHALE',
    subLabels: ['SMART_MONEY', 'FUND'],
    isBot: false,
    botType: null,
    isSmartMoney: true,
    isWhale: true,
    isSniper: false,
    winRateRange: [0.55, 0.75],
    totalPnlRange: [500000, 50000000],
    sharpeRatioRange: [1.5, 3.5],
    profitFactorRange: [2.0, 5.0],
    avgHoldTimeMinRange: [1440, 43200], // 1-30 days
    avgTradeSizeUsdRange: [100000, 5000000],
    totalTradesRange: [200, 2000],
    washTradeScoreRange: [0, 0.05],
    copyTradeScoreRange: [0, 0.1],
    frontrunCountRange: [0, 2],
    sandwichCountRange: [0, 0],
    isActive247: false,
    isActiveAtNight: false,
    consistencyScoreRange: [0.6, 0.9],
    smartMoneyScoreRange: [60, 95],
    earlyEntryCountRange: [5, 30],
    avgEntryRankRange: [5, 50],
    whaleScoreRange: [70, 99],
    totalHoldingsUsdRange: [5000000, 100000000],
    sniperScoreRange: [0, 5],
    block0EntryCountRange: [0, 0],
    botConfidenceRange: [0, 0.05],
    preferredTokenTypes: ['DEFI', 'L1', 'L2', 'STABLE'],
    preferredDexes: ['uniswap', 'curve', 'aave', 'raydium'],
    avgPositionsRange: [5, 15],
  },
  degen: {
    primaryLabel: 'RETAIL',
    subLabels: ['DEGEN', 'MOMENTUM_RIDER'],
    isBot: false,
    botType: null,
    isSmartMoney: false,
    isWhale: false,
    isSniper: false,
    winRateRange: [0.3, 0.5],
    totalPnlRange: [-50000, 200000],
    sharpeRatioRange: [-1, 1],
    profitFactorRange: [0.5, 1.5],
    avgHoldTimeMinRange: [10, 480], // 10min-8hrs
    avgTradeSizeUsdRange: [500, 10000],
    totalTradesRange: [500, 5000],
    washTradeScoreRange: [0, 0.1],
    copyTradeScoreRange: [0.2, 0.7],
    frontrunCountRange: [0, 0],
    sandwichCountRange: [0, 0],
    isActive247: false,
    isActiveAtNight: true,
    consistencyScoreRange: [0.1, 0.4],
    smartMoneyScoreRange: [0, 20],
    earlyEntryCountRange: [0, 2],
    avgEntryRankRange: [50, 500],
    whaleScoreRange: [0, 10],
    totalHoldingsUsdRange: [1000, 100000],
    sniperScoreRange: [0, 10],
    block0EntryCountRange: [0, 1],
    botConfidenceRange: [0, 0.1],
    preferredTokenTypes: ['MEME', 'NFT', 'BRIDGE'],
    preferredDexes: ['raydium', 'jupiter', 'orca', 'meteora'],
    avgPositionsRange: [3, 12],
  },
  sniper: {
    primaryLabel: 'SNIPER',
    subLabels: ['BOT_SNIPER', 'FRONT_RUNNER'],
    isBot: true,
    botType: 'SNIPER_BOT',
    isSmartMoney: false,
    isWhale: false,
    isSniper: true,
    winRateRange: [0.4, 0.65],
    totalPnlRange: [50000, 5000000],
    sharpeRatioRange: [0.5, 2.5],
    profitFactorRange: [1.2, 3.0],
    avgHoldTimeMinRange: [1, 60], // 1min-1hr
    avgTradeSizeUsdRange: [1000, 50000],
    totalTradesRange: [1000, 10000],
    washTradeScoreRange: [0, 0.15],
    copyTradeScoreRange: [0, 0.3],
    frontrunCountRange: [50, 500],
    sandwichCountRange: [10, 100],
    isActive247: true,
    isActiveAtNight: true,
    consistencyScoreRange: [0.7, 0.95],
    smartMoneyScoreRange: [0, 15],
    earlyEntryCountRange: [0, 5],
    avgEntryRankRange: [1, 10],
    whaleScoreRange: [0, 20],
    totalHoldingsUsdRange: [10000, 500000],
    sniperScoreRange: [70, 99],
    block0EntryCountRange: [20, 200],
    botConfidenceRange: [0.7, 0.98],
    preferredTokenTypes: ['MEME', 'DEFI'],
    preferredDexes: ['raydium', 'uniswap', 'meteora', 'orca'],
    avgPositionsRange: [1, 5],
  },
  early_investor: {
    primaryLabel: 'SMART_MONEY',
    subLabels: ['EARLY_INVESTOR', 'DIAMOND_HANDS'],
    isBot: false,
    botType: null,
    isSmartMoney: true,
    isWhale: false,
    isSniper: false,
    winRateRange: [0.65, 0.85],
    totalPnlRange: [1000000, 100000000],
    sharpeRatioRange: [2.0, 5.0],
    profitFactorRange: [3.0, 8.0],
    avgHoldTimeMinRange: [10080, 129600], // 7-90 days
    avgTradeSizeUsdRange: [5000, 200000],
    totalTradesRange: [50, 500],
    washTradeScoreRange: [0, 0.02],
    copyTradeScoreRange: [0, 0.05],
    frontrunCountRange: [0, 1],
    sandwichCountRange: [0, 0],
    isActive247: false,
    isActiveAtNight: false,
    consistencyScoreRange: [0.5, 0.8],
    smartMoneyScoreRange: [80, 99],
    earlyEntryCountRange: [30, 100],
    avgEntryRankRange: [1, 20],
    whaleScoreRange: [20, 60],
    totalHoldingsUsdRange: [500000, 20000000],
    sniperScoreRange: [0, 5],
    block0EntryCountRange: [0, 5],
    botConfidenceRange: [0, 0.05],
    preferredTokenTypes: ['DEFI', 'L1', 'L2', 'NFT'],
    preferredDexes: ['uniswap', 'raydium', 'curve', 'aave'],
    avgPositionsRange: [3, 8],
  },
  mev_bot: {
    primaryLabel: 'BOT_MEV',
    subLabels: ['MEV_EXTRACTOR', 'SANDWICH_ATTACKER'],
    isBot: true,
    botType: 'MEV_EXTRACTOR',
    isSmartMoney: false,
    isWhale: false,
    isSniper: false,
    winRateRange: [0.7, 0.95],
    totalPnlRange: [100000, 10000000],
    sharpeRatioRange: [2.0, 5.0],
    profitFactorRange: [3.0, 10.0],
    avgHoldTimeMinRange: [0.1, 5], // sub-second to 5 min
    avgTradeSizeUsdRange: [10000, 500000],
    totalTradesRange: [5000, 50000],
    washTradeScoreRange: [0.1, 0.4],
    copyTradeScoreRange: [0, 0.1],
    frontrunCountRange: [100, 5000],
    sandwichCountRange: [100, 2000],
    isActive247: true,
    isActiveAtNight: true,
    consistencyScoreRange: [0.85, 0.99],
    smartMoneyScoreRange: [0, 10],
    earlyEntryCountRange: [0, 0],
    avgEntryRankRange: [0, 0],
    whaleScoreRange: [0, 15],
    totalHoldingsUsdRange: [50000, 2000000],
    sniperScoreRange: [0, 15],
    block0EntryCountRange: [0, 10],
    botConfidenceRange: [0.9, 1.0],
    preferredTokenTypes: ['DEFI', 'STABLE', 'BRIDGE'],
    preferredDexes: ['uniswap', 'curve', 'raydium', 'orca'],
    avgPositionsRange: [1, 3],
  },
  nft_whale: {
    primaryLabel: 'WHALE',
    subLabels: ['NFT_FLIPPER', 'FUND'],
    isBot: false,
    botType: null,
    isSmartMoney: true,
    isWhale: true,
    isSniper: false,
    winRateRange: [0.5, 0.7],
    totalPnlRange: [200000, 20000000],
    sharpeRatioRange: [1.0, 3.0],
    profitFactorRange: [1.5, 4.0],
    avgHoldTimeMinRange: [2880, 43200], // 2-30 days
    avgTradeSizeUsdRange: [10000, 500000],
    totalTradesRange: [100, 1000],
    washTradeScoreRange: [0.05, 0.2],
    copyTradeScoreRange: [0, 0.2],
    frontrunCountRange: [0, 5],
    sandwichCountRange: [0, 2],
    isActive247: false,
    isActiveAtNight: true,
    consistencyScoreRange: [0.4, 0.7],
    smartMoneyScoreRange: [50, 80],
    earlyEntryCountRange: [5, 20],
    avgEntryRankRange: [5, 30],
    whaleScoreRange: [60, 90],
    totalHoldingsUsdRange: [1000000, 50000000],
    sniperScoreRange: [5, 20],
    block0EntryCountRange: [0, 5],
    botConfidenceRange: [0.05, 0.3],
    preferredTokenTypes: ['NFT', 'MEME', 'DEFI'],
    preferredDexes: ['uniswap', 'raydium', 'blur', 'opensea'],
    avgPositionsRange: [5, 20],
  },
  airdrop_farmer: {
    primaryLabel: 'AIRDROP_HUNTER',
    subLabels: ['BRIDGE_HOPPER', 'YIELD_FARMER'],
    isBot: true,
    botType: 'MULTI_SIG_BOT',
    isSmartMoney: false,
    isWhale: false,
    isSniper: false,
    winRateRange: [0.5, 0.8],
    totalPnlRange: [10000, 500000],
    sharpeRatioRange: [1.0, 3.0],
    profitFactorRange: [1.5, 4.0],
    avgHoldTimeMinRange: [1440, 20160], // 1-14 days
    avgTradeSizeUsdRange: [100, 5000],
    totalTradesRange: [500, 3000],
    washTradeScoreRange: [0.1, 0.4],
    copyTradeScoreRange: [0, 0.1],
    frontrunCountRange: [0, 0],
    sandwichCountRange: [0, 0],
    isActive247: true,
    isActiveAtNight: true,
    consistencyScoreRange: [0.7, 0.9],
    smartMoneyScoreRange: [10, 30],
    earlyEntryCountRange: [0, 5],
    avgEntryRankRange: [20, 200],
    whaleScoreRange: [0, 10],
    totalHoldingsUsdRange: [1000, 50000],
    sniperScoreRange: [0, 5],
    block0EntryCountRange: [0, 0],
    botConfidenceRange: [0.3, 0.6],
    preferredTokenTypes: ['BRIDGE', 'DEFI', 'L2', 'STABLE'],
    preferredDexes: ['uniswap', 'curve', 'hop', 'across', 'stargate'],
    avgPositionsRange: [5, 15],
  },
  bridging_whale: {
    primaryLabel: 'WHALE',
    subLabels: ['BRIDGE_HOPPER', 'FUND'],
    isBot: false,
    botType: null,
    isSmartMoney: true,
    isWhale: true,
    isSniper: false,
    winRateRange: [0.6, 0.8],
    totalPnlRange: [500000, 30000000],
    sharpeRatioRange: [1.5, 3.5],
    profitFactorRange: [2.0, 5.0],
    avgHoldTimeMinRange: [2880, 20160], // 2-14 days
    avgTradeSizeUsdRange: [50000, 2000000],
    totalTradesRange: [100, 1000],
    washTradeScoreRange: [0, 0.1],
    copyTradeScoreRange: [0, 0.05],
    frontrunCountRange: [0, 3],
    sandwichCountRange: [0, 0],
    isActive247: false,
    isActiveAtNight: true,
    consistencyScoreRange: [0.5, 0.8],
    smartMoneyScoreRange: [60, 85],
    earlyEntryCountRange: [5, 15],
    avgEntryRankRange: [5, 30],
    whaleScoreRange: [70, 95],
    totalHoldingsUsdRange: [2000000, 50000000],
    sniperScoreRange: [0, 5],
    block0EntryCountRange: [0, 0],
    botConfidenceRange: [0, 0.1],
    preferredTokenTypes: ['BRIDGE', 'L1', 'L2', 'STABLE', 'DEFI'],
    preferredDexes: ['uniswap', 'curve', 'raydium', 'hop'],
    avgPositionsRange: [3, 10],
  },
};

const CHAINS = ['SOL', 'ETH', 'BSC', 'ARB', 'BASE', 'OP', 'MATIC', 'AVAX'];

const DEX_MAP: Record<string, string[]> = {
  SOL: ['raydium', 'orca', 'jupiter', 'meteora', 'phoenix'],
  ETH: ['uniswap', 'curve', 'sushiswap', '1inch', 'balancer'],
  BSC: ['pancakeswap', 'biswap', 'apeswap'],
  ARB: ['uniswap', 'camelot', 'traderjoe', 'gmx'],
  BASE: ['uniswap', 'aerodrome', 'baseswap'],
  OP: ['uniswap', 'velodrome', 'rubicon'],
  MATIC: ['quickswap', 'sushiswap', 'balancer'],
  AVAX: ['traderjoe', 'pangolin', 'lydia'],
};

const TOKEN_SYMBOLS: Record<string, string[]> = {
  SOL: ['SOL', 'USDC', 'BONK', 'WIF', 'JUP', 'RAY', 'ORCA', 'JTO', 'PYTH', 'MEME', 'POPCAT', 'FLOKI', 'RENDER', 'TENSOR', 'KAMINO'],
  ETH: ['ETH', 'USDT', 'USDC', 'UNI', 'LINK', 'AAVE', 'PEPE', 'SHIB', 'MKR', 'COMP', 'CRV', 'LDO', 'ARB', 'OP', 'DYDX'],
  BSC: ['BNB', 'CAKE', 'BUSD', 'BTCB', 'ETH', 'DOGE', 'BABYDOGE', 'SAFEMOON', 'FLOKI'],
  ARB: ['ARB', 'GMX', 'RDNT', 'PENDLE', 'MAGIC', 'GLP', 'WETH', 'USDC'],
  BASE: ['ETH', 'USDC', 'AERO', 'VELO', 'BRETT', 'DAI', 'CBETH'],
  OP: ['OP', 'VELOROMA', 'USDC', 'ETH', 'SNX'],
  MATIC: ['MATIC', 'QUICK', 'SUSHI', 'AAVE', 'USDC', 'WETH'],
  AVAX: ['AVAX', 'JOE', 'PNG', 'LYD', 'USDC', 'WETH'],
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(randRange(min, max + 1));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function generateSolAddress(): string {
  const base58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let addr = '';
  for (let i = 0; i < 44; i++) {
    addr += base58[Math.floor(Math.random() * base58.length)];
  }
  return addr;
}

function generateEvmAddress(): string {
  const chars = '0123456789abcdef';
  let addr = '0x';
  for (let i = 0; i < 40; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr;
}

function generateAddress(chain: string): string {
  return chain === 'SOL' ? generateSolAddress() : generateEvmAddress();
}

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function seedTraders() {
  console.log('=== Starting Trader Seeding ===');

  // Check existing traders
  const existingCount = await db.trader.count();
  console.log(`Existing traders: ${existingCount}`);

  if (existingCount >= 500) {
    console.log('Already have 500+ traders, skipping seed.');
    return;
  }

  const archetypeNames = Object.keys(ARCHETYPES);
  const TOTAL_TRADERS = 550;
  let tradersCreated = 0;
  let transactionsCreated = 0;
  let holdingsCreated = 0;
  let patternsCreated = 0;

  // Generate traders for each archetype
  for (let i = 0; i < TOTAL_TRADERS; i++) {
    const archetypeName = archetypeNames[i % archetypeNames.length];
    const config = ARCHETYPES[archetypeName];

    // Determine chain(s)
    const primaryChain = pickRandom(CHAINS);
    const secondaryChains = pickRandomN(CHAINS.filter(c => c !== primaryChain), randInt(0, 2));
    const preferredChains = [primaryChain, ...secondaryChains];

    // Generate unique address
    const address = generateAddress(primaryChain);

    // Check for duplicate
    const existing = await db.trader.findUnique({ where: { address } });
    if (existing) {
      i--; // retry
      continue;
    }

    // Generate performance metrics based on archetype
    const winRate = randRange(config.winRateRange[0], config.winRateRange[1]);
    const totalPnl = randRange(config.totalPnlRange[0], config.totalPnlRange[1]);
    const totalTrades = randInt(config.totalTradesRange[0], config.totalTradesRange[1]);
    const avgHoldTime = randRange(config.avgHoldTimeMinRange[0], config.avgHoldTimeMinRange[1]);
    const avgTradeSize = randRange(config.avgTradeSizeUsdRange[0], config.avgTradeSizeUsdRange[1]);
    const sharpeRatio = randRange(config.sharpeRatioRange[0], config.sharpeRatioRange[1]);
    const profitFactor = randRange(config.profitFactorRange[0], config.profitFactorRange[1]);
    const totalVolume = totalTrades * avgTradeSize;
    const largestTrade = avgTradeSize * randRange(2, 10);
    const maxDrawdown = Math.abs(totalPnl) * randRange(0.1, 0.5);

    // Generate behavioral metrics
    const washTradeScore = randRange(config.washTradeScoreRange[0], config.washTradeScoreRange[1]);
    const copyTradeScore = randRange(config.copyTradeScoreRange[0], config.copyTradeScoreRange[1]);
    const frontrunCount = randInt(config.frontrunCountRange[0], config.frontrunCountRange[1]);
    const frontrunByCount = randInt(0, Math.floor(frontrunCount * 0.3));
    const sandwichCount = randInt(config.sandwichCountRange[0], config.sandwichCountRange[1]);
    const sandwichVictimCount = randInt(0, Math.floor(sandwichCount * 0.1));
    const mevExtractionUsd = config.isBot && config.botType === 'MEV_EXTRACTOR'
      ? randRange(50000, 5000000)
      : randRange(0, 1000);
    const avgSlippageBps = config.isBot ? randInt(1, 20) : randInt(10, 200);

    // Timing patterns
    const avgTimeBetweenTrades = config.isBot ? randRange(0.5, 30) : randRange(30, 1440);
    const tradingHourPattern = generateHourPattern(config.isActive247, config.isActiveAtNight);
    const tradingDayPattern = generateDayPattern(config.isActive247);
    const consistencyScore = randRange(config.consistencyScoreRange[0], config.consistencyScoreRange[1]);

    // Bot detection signals
    const botDetectionSignals: string[] = [];
    if (config.isBot) {
      if (config.isActive247) botDetectionSignals.push('247_ACTIVITY');
      if (consistencyScore > 0.8) botDetectionSignals.push('HIGH_CONSISTENCY');
      if (avgTimeBetweenTrades < 5) botDetectionSignals.push('RAPID_TRADING');
      if (frontrunCount > 10) botDetectionSignals.push('FRONTRUN_PATTERN');
      if (sandwichCount > 5) botDetectionSignals.push('SANDWICH_PATTERN');
    }

    // Generate trader
    try {
      const trader = await db.trader.create({
        data: {
          address,
          chain: primaryChain,

          // Classification
          primaryLabel: config.primaryLabel,
          subLabels: JSON.stringify(config.subLabels),
          labelConfidence: randRange(0.6, 0.95),

          // Bot detection
          isBot: config.isBot,
          botType: config.botType,
          botConfidence: randRange(config.botConfidenceRange[0], config.botConfidenceRange[1]),
          botDetectionSignals: JSON.stringify(botDetectionSignals),
          botDetectionVersion: '2.0',
          botFirstDetectedAt: config.isBot ? randomPastDate(90) : null,

          // Performance metrics
          totalTrades,
          winRate,
          avgPnl: totalPnl / totalTrades,
          totalPnl,
          avgHoldTimeMin: avgHoldTime,
          avgTradeSizeUsd: avgTradeSize,
          largestTradeUsd: largestTrade,
          totalVolumeUsd: totalVolume,
          maxDrawdown,
          sharpeRatio,
          profitFactor,

          // Behavioral metrics
          avgSlippageBps,
          frontrunCount,
          frontrunByCount,
          sandwichCount,
          sandwichVictimCount,
          washTradeScore,
          copyTradeScore,
          mevExtractionUsd,

          // Timing
          avgTimeBetweenTrades,
          tradingHourPattern: JSON.stringify(tradingHourPattern),
          tradingDayPattern: JSON.stringify(tradingDayPattern),
          isActiveAtNight: config.isActiveAtNight,
          isActive247: config.isActive247,
          consistencyScore,

          // Portfolio
          uniqueTokensTraded: randInt(10, 200),
          avgPositionsAtOnce: randInt(config.avgPositionsRange[0], config.avgPositionsRange[1]),
          maxPositionsAtOnce: randInt(config.avgPositionsRange[1], config.avgPositionsRange[1] + 10),
          preferredChains: JSON.stringify(preferredChains),
          preferredDexes: JSON.stringify(pickRandomN(
            [...new Set([...(DEX_MAP[primaryChain] || []), ...config.preferredDexes])],
            randInt(2, 4)
          )),
          preferredTokenTypes: JSON.stringify(pickRandomN(config.preferredTokenTypes, randInt(2, 4))),

          // Smart money
          isSmartMoney: config.isSmartMoney,
          smartMoneyScore: randRange(config.smartMoneyScoreRange[0], config.smartMoneyScoreRange[1]),
          earlyEntryCount: randInt(config.earlyEntryCountRange[0], config.earlyEntryCountRange[1]),
          avgEntryRank: randRange(config.avgEntryRankRange[0], config.avgEntryRankRange[1]),
          avgExitMultiplier: config.isSmartMoney ? randRange(2, 15) : randRange(0.5, 3),
          topCallCount: config.isSmartMoney ? randInt(10, 50) : randInt(0, 10),
          worstCallCount: config.isSmartMoney ? randInt(2, 10) : randInt(5, 30),

          // Whale
          isWhale: config.isWhale,
          whaleScore: randRange(config.whaleScoreRange[0], config.whaleScoreRange[1]),
          totalHoldingsUsd: randRange(config.totalHoldingsUsdRange[0], config.totalHoldingsUsdRange[1]),
          avgPositionUsd: randRange(config.totalHoldingsUsdRange[0] / 5, config.totalHoldingsUsdRange[1] / 5),
          priceImpactAvg: config.isWhale ? randRange(0.1, 2.0) : randRange(0, 0.1),

          // Sniper
          isSniper: config.isSniper,
          sniperScore: randRange(config.sniperScoreRange[0], config.sniperScoreRange[1]),
          avgBlockToTrade: config.isSniper ? randRange(0, 3) : randRange(5, 100),
          block0EntryCount: randInt(config.block0EntryCountRange[0], config.block0EntryCountRange[1]),

          // Meta
          firstSeen: randomPastDate(365),
          lastActive: randomPastDate(7),
          lastAnalyzed: randomPastDate(1),
          analysisVersion: 2,
          dataQuality: randRange(0.4, 0.95),
        },
      });

      tradersCreated++;

      // === Create TraderTransactions (10-50 per trader) ===
      const txCount = randInt(10, 50);
      const tokenSymbols = TOKEN_SYMBOLS[primaryChain] || TOKEN_SYMBOLS.SOL;
      const dexes = DEX_MAP[primaryChain] || DEX_MAP.SOL;
      const actions = ['BUY', 'SELL', 'SWAP', 'TRANSFER', 'ADD_LIQUIDITY', 'REMOVE_LIQUIDITY'];

      for (let t = 0; t < txCount; t++) {
        const action = pickRandom(actions);
        const tokenSymbol = pickRandom(tokenSymbols);
        const dex = pickRandom(dexes);
        const quoteToken = pickRandom(['SOL', 'USDC', 'ETH', 'USDT', 'WETH']);
        const amountIn = randRange(0.1, avgTradeSize * 2);
        const price = randRange(0.0001, 500);
        const amountOut = amountIn / price * randRange(0.95, 1.05);
        const valueUsd = amountIn * (quoteToken === 'USDC' || quoteToken === 'USDT' ? 1 : randRange(50, 5000));

        try {
          await db.traderTransaction.create({
            data: {
              traderId: trader.id,
              txHash: generateTxHash(primaryChain),
              blockNumber: randInt(18000000, 21000000),
              blockTime: randomPastDate(30),
              chain: primaryChain,
              dex,
              action,
              tokenAddress: generateAddress(primaryChain),
              tokenSymbol,
              quoteToken,
              amountIn,
              amountOut,
              priceUsd: price,
              valueUsd,
              slippageBps: avgSlippageBps + randInt(-5, 10),
              pnlUsd: action === 'SELL' ? (Math.random() > 0.5 ? valueUsd * winRate * randRange(0.05, 0.5) : -valueUsd * (1 - winRate) * randRange(0.05, 0.3)) : null,
              isFrontrun: frontrunCount > 10 && Math.random() > 0.8,
              isSandwich: sandwichCount > 5 && Math.random() > 0.9,
              isWashTrade: washTradeScore > 0.2 && Math.random() > 0.85,
              isJustInTime: config.isBot && Math.random() > 0.9,
              gasUsed: primaryChain === 'SOL' ? randRange(0.000005, 0.00005) : randRange(21000, 500000),
              gasPrice: primaryChain === 'SOL' ? 0 : randRange(10, 100),
              priorityFee: primaryChain === 'SOL' ? randRange(0.000001, 0.001) : randRange(1, 50),
              totalFeeUsd: randRange(0.01, 50),
              tokenAgeAtTrade: action === 'BUY' && config.isSniper ? randRange(0, 60) : randRange(60, 500000),
              holderCountAtTrade: randInt(10, 10000),
              liquidityAtTrade: randRange(1000, 10000000),
              metadata: JSON.stringify({ archetype: archetypeName, batch: 'seed_v2' }),
            },
          });
          transactionsCreated++;
        } catch { /* skip duplicate txHash */ }
      }

      // === Create WalletTokenHoldings (3-8 per trader) ===
      const holdingCount = randInt(3, 8);
      const holdingSymbols = pickRandomN(tokenSymbols, Math.min(holdingCount, tokenSymbols.length));

      for (const symbol of holdingSymbols) {
        const balance = randRange(0.001, 100000);
        const entryPrice = randRange(0.0001, 500);
        const currentPrice = entryPrice * randRange(0.3, 5.0);
        const valueUsd = balance * currentPrice;
        const unrealizedPnl = (currentPrice - entryPrice) * balance;
        const unrealizedPnlPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;

        try {
          await db.walletTokenHolding.create({
            data: {
              traderId: trader.id,
              tokenAddress: generateAddress(primaryChain),
              tokenSymbol: symbol,
              chain: primaryChain,
              balance,
              valueUsd,
              avgEntryPrice: entryPrice,
              unrealizedPnl,
              unrealizedPnlPct,
              firstBuyAt: randomPastDate(90),
              lastTradeAt: randomPastDate(3),
              buyCount: randInt(1, 20),
              sellCount: randInt(0, 15),
              totalBoughtUsd: valueUsd * randRange(0.5, 2),
              totalSoldUsd: valueUsd * randRange(0, 1.5),
            },
          });
          holdingsCreated++;
        } catch { /* skip */ }
      }

      // === Create TraderBehaviorPattern (1-3 per trader) ===
      const patternCount = randInt(1, 3);
      const allPatterns = [
        'ACCUMULATOR', 'DUMPER', 'SCALPER', 'SWING_TRADER', 'DIAMOND_HANDS',
        'MOMENTUM_RIDER', 'CONTRARIAN', 'SNIPER_ENTRY', 'WASH_TRADER',
        'COPY_CAT', 'YIELD_FARMER', 'BRIDGE_HOPPER', 'LIQUIDITY_PROVIDER',
        'MEV_EXTRACTOR', 'SANDWICH_ATTACKER', 'JUST_IN_TIME_LP',
      ];
      const selectedPatterns = pickRandomN(allPatterns, patternCount);

      for (const pattern of selectedPatterns) {
        try {
          await db.traderBehaviorPattern.create({
            data: {
              traderId: trader.id,
              pattern,
              confidence: randRange(0.3, 0.95),
              dataPoints: randInt(10, totalTrades),
              firstObserved: randomPastDate(180),
              lastObserved: randomPastDate(7),
              metadata: JSON.stringify({ archetype: archetypeName }),
            },
          });
          patternsCreated++;
        } catch { /* skip */ }
      }

      // Progress logging
      if (tradersCreated % 50 === 0) {
        console.log(`[SeedTraders] Progress: ${tradersCreated}/${TOTAL_TRADERS} traders, ${transactionsCreated} txs, ${holdingsCreated} holdings, ${patternsCreated} patterns`);
      }

    } catch (err) {
      console.warn(`[SeedTraders] Failed to create trader ${i}:`, err);
    }
  }

  // Summary
  console.log('\n=== Trader Seeding Complete ===');
  console.log(`Traders created: ${tradersCreated}`);
  console.log(`Transactions created: ${transactionsCreated}`);
  console.log(`Token holdings created: ${holdingsCreated}`);
  console.log(`Behavior patterns created: ${patternsCreated}`);

  // Verify archetype distribution
  const labelCounts = await db.trader.groupBy({
    by: ['primaryLabel'],
    _count: { primaryLabel: true },
    orderBy: { _count: { primaryLabel: 'desc' } },
  });
  console.log('\nLabel distribution:');
  for (const lc of labelCounts) {
    console.log(`  ${lc.primaryLabel}: ${lc._count.primaryLabel}`);
  }

  // Verify smart money / whale / sniper counts
  const smartMoney = await db.trader.count({ where: { isSmartMoney: true } });
  const whales = await db.trader.count({ where: { isWhale: true } });
  const snipers = await db.trader.count({ where: { isSniper: true } });
  const bots = await db.trader.count({ where: { isBot: true } });
  console.log(`\nSmart money: ${smartMoney}`);
  console.log(`Whales: ${whales}`);
  console.log(`Snipers: ${snipers}`);
  console.log(`Bots: ${bots}`);
}

function generateHourPattern(is247: boolean, isActiveAtNight: boolean): number[] {
  const pattern: number[] = [];
  for (let h = 0; h < 24; h++) {
    if (is247) {
      pattern.push(randRange(0.5, 1.0));
    } else if (isActiveAtNight && (h >= 22 || h <= 6)) {
      pattern.push(randRange(0.3, 0.8));
    } else if (h >= 8 && h <= 20) {
      pattern.push(randRange(0.5, 1.0));
    } else {
      pattern.push(randRange(0.05, 0.3));
    }
  }
  return pattern;
}

function generateDayPattern(is247: boolean): number[] {
  const pattern: number[] = [];
  for (let d = 0; d < 7; d++) {
    if (is247) {
      pattern.push(randRange(0.7, 1.0));
    } else if (d >= 1 && d <= 5) {
      pattern.push(randRange(0.6, 1.0));
    } else {
      pattern.push(randRange(0.2, 0.6));
    }
  }
  return pattern;
}

function randomPastDate(maxDaysAgo: number): Date {
  const now = Date.now();
  const past = now - Math.random() * maxDaysAgo * 86400000;
  return new Date(past);
}

function generateTxHash(chain: string): string {
  if (chain === 'SOL') {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let hash = '';
    for (let i = 0; i < 88; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }
  // EVM tx hash
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

// ============================================================
// EXECUTE
// ============================================================

seedTraders()
  .catch(console.error)
  .finally(() => db.$disconnect());
