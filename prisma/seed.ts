import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function genSolAddress(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let addr = '';
  for (let i = 0; i < 44; i++) addr += chars[Math.floor(Math.random() * chars.length)];
  return addr;
}

function genEthAddress(): string {
  let addr = '0x';
  for (let i = 0; i < 40; i++) addr += Math.floor(Math.random() * 16).toString(16);
  return addr;
}

function genTxHash(chain: string): string {
  if (chain === 'SOL') {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let h = '';
    for (let i = 0; i < 88; i++) h += chars[Math.floor(Math.random() * chars.length)];
    return h;
  }
  let h = '0x';
  for (let i = 0; i < 64; i++) h += Math.floor(Math.random() * 16).toString(16);
  return h;
}

// ============================================================
// MASSIVE TOKEN DATA - 5000+ TOKENS
// ============================================================

const SOL_MEME_NAMES = [
  'Bonk','dogwifhat','Popcat','Book of Meme','Slerf','Cat in a Dogs World','Turbo','Pepe Sol','Fwog','Michi',
  'Maneki','Neiro','Rizz','GigaChad','Landwolf','Andy','Brett Sol','Mog Sol','Toshi Sol','Doge Sol',
  'Shib Sol','Floki Sol','Inu Sol','Akita Sol','Kishu Sol','Elon Doge','Mars Doge','Moon Doge','Star Doge','Rocket Doge',
  'Pew Pew','Blaze','Inferno','Phoenix Rise','Dragon Fire','Thunder Bolt','Lightning Strike','Storm Surge','Tsunami Wave','Earthquake',
  'Diamond Hands','Paper Hands','Moon Shot','Lambo','Rocket Fuel','To The Moon','HODL','WAGMI','NGMI','LFG',
  'Ape Strong','Degen Ape','Yuga Sol','Bored Ape Sol','MUTANT Sol','Lazy Ape','Crazy Ape','Mega Ape','Ultra Ape','Super Ape',
  'Cat Token','Dog Token','Frog Token','Owl Token','Bear Token','Bull Token','Whale Token','Shark Token','Eagle Token','Lion Token',
  'Pizza Sol','Taco Sol','Sushi Sol','Ramen Sol','Dumpling Sol','Noodle Sol','Burger Sol','Fries Sol','Hotdog Sol','Donut Sol',
  'Matrix Sol','Neo Sol','Morpheus Sol','Trinity Sol','Oracle Sol','Cypher Sol','Zion Sol','Nebuchadnezzar Sol','Niobe Sol','Tank Sol',
  'Samurai Sol','Ninja Sol','Shogun Sol','Ronin Sol','Sensei Sol','Kami Sol','Oni Sol','Yokai Sol','Tengu Sol','Kitsune Sol',
];

const SOL_DEFI_NAMES = [
  'Jupiter','Orca','Raydium','Jito','Tensor','Kamino','Drift Protocol','Pyth Network','Marinade','Sanctum',
  'Helius','Mango Markets','Zeta Markets','Parcl','Kinto','MarginFi','Solend','Tulip Protocol','Francium','Katana',
  'Hubble','PsyOptions','Friktion','01 Protocol','Cobalt','Saber','Lifinity','Step Finance','Synthetify','Aldrin',
];

const ETH_DEFI_NAMES = [
  'Uniswap','Aave','Maker','Chainlink','GMX','Pendle','Curve DAO','Lido DAO','Compound','Synthetix',
  'SushiSwap','1inch','Balancer','Yearn Finance','Convex Finance','Rocket Pool','Frax Share','Ethena','EigenLayer','Morpho',
  'Aavegotchi','Instadapp','Idle Finance','Set Protocol','dydx','Loopring','RenVM','Bancor','Kyber Network','0x Protocol',
];

const ETH_MEME_NAMES = [
  'Pepe','Shiba Inu','Floki Inu','Dogelon Mars','Baby Doge','Doge Killer','Mog Coin','Brett','Toshi','Lenny',
  'Andy','Landwolf','Mumu','SPX6900','GigaChad','Based Doge','Trump Doge','Biden Doge','Maga Doge','Patriot Doge',
  'Rocket Inu','Space Doge','Mars Inu','Moon Inu','Star Inu','Galaxy Inu','Cosmic Inu','Nebula Inu','Pluto Inu','Saturn Inu',
  'Cat Meme','Dog Meme','Frog Meme','Owl Meme','Bear Meme','Bull Meme','Whale Meme','Shark Meme','Eagle Meme','Lion Meme',
];

const BASE_MEME_NAMES = [
  'BRETT','TOSHI','MORPHO','AERO','BASE GOD','BASED','MOCHI','PAUL','BASE DOGE','BASE PEPE',
  'BASE SHIB','BASE INU','BASE FLOKI','BASE BONK','BASE WIF','BASE POPCAT','BASE BOME','BASE SLERF','BASE TURBO','BASE MEW',
  'BASE APE','BASE CAT','BASE DOG','BASE FROG','BASE OWL','BASE BEAR','BASE BULL','BASE WHALE','BASE SHARK','BASE EAGLE',
  'MIMBASE','BASED AI','BASED DEGEN','BASED CHAD','BASED LAD','BASED LASS','BASED LAD','BASED COIN','BASED TOKEN','BASED CASH',
];

const ARB_NAMES = [
  'GMX','Pendle','Camelot','Radiant','GNS','Magic','Treasure','Xai','Silo','Retro',
  'Arbidex','Sushi ARB','Curve ARB','Balancer ARB','Uniswap ARB','Aave ARB','Compound ARB','Lido ARB','Chainlink ARB','Maker ARB',
];

const OP_NAMES = [
  'Velodrome','Aerodrome','SNX','Perp','Lyra','Rubicon','Uniswap OP','Curve OP','Aave OP','Compound OP',
  'Worldcoin','OP Token','Lido OP','Chainlink OP','Maker OP','Balancer OP','Sushi OP','GMX OP','Pendle OP','Radiant OP',
];

const CHAINS = ['SOL', 'ETH', 'BASE', 'ARB', 'OP'];
const DEX_BY_CHAIN: Record<string, string[]> = {
  SOL: ['raydium', 'orca', 'jupiter', 'meteora', 'pump.fun'],
  ETH: ['uniswap', 'curve', '1inch', 'sushiswap', 'balancer'],
  BASE: ['aerodrome', 'baseswap', 'uniswap', 'sushiswap'],
  ARB: ['camelot', 'uniswap', 'curve', 'sushi', 'gmx'],
  OP: ['velodrome', 'aerodrome', 'uniswap', 'curve'],
};

const TOKEN_TYPES = ['MEME', 'DEFI', 'L1', 'L2', 'NFT', 'BRIDGE', 'STABLE'];

const TRADER_LABELS = [
  'SMART_MONEY', 'WHALE', 'SNIPER', 'BOT_MEV', 'BOT_SNIPER', 'BOT_COPY',
  'BOT_ARBITRAGE', 'BOT_WASH', 'BOT_MAKER', 'BOT_SCALPER', 'FRONT_RUN_BOT',
  'RETAIL', 'CREATOR', 'FUND', 'INFLUENCER', 'BRIDGE_HOPPER',
  'YIELD_FARMER', 'AIRDROP_HUNTER', 'NFT_FLIPPER', 'UNKNOWN',
];

const BEHAVIOR_PATTERNS = [
  'ACCUMULATOR', 'DUMPER', 'SCALPER', 'SWING_TRADER', 'DIAMOND_HANDS',
  'MOMENTUM_RIDER', 'CONTRARIAN', 'SNIPER_ENTRY', 'EXIT_SCAMMER',
  'WASH_TRADER', 'COPY_CAT', 'YIELD_FARMER', 'BRIDGE_HOPPER',
  'LIQUIDITY_PROVIDER', 'MEV_EXTRACTOR', 'SANDWICH_ATTACKER',
  'JUST_IN_TIME_LP', 'FLASH_LOAN_USER', 'AIRDROP_FARMER',
  'DEX_AGGREGATOR_USER', 'JITO_TIP_USER', 'MULTI_HOP_SWAPPER',
];

const SIGNAL_TYPES = [
  'RUG_PULL', 'SMART_MONEY_ENTRY', 'LIQUIDITY_TRAP', 'V_SHAPE', 'DIVERGENCE',
  'BOT_ACTIVITY_SPIKE', 'WASH_TRADING_ALERT', 'WHALE_MOVEMENT', 'BREAKOUT',
  'BREAKDOWN', 'PUMP_IMMINENT', 'DUMP_IMMINENT', 'ACCUMULATION_ZONE',
  'DISTRIBUTION_ZONE', 'FAKEOUT', 'STOP_HUNT', 'SQUEEZE', 'MEAN_REVERSION',
];

const PREDICTION_TYPES = [
  'REGIME_CHANGE', 'BOT_SWARM', 'WHALE_MOVEMENT', 'LIQUIDITY_DRAIN',
  'CORRELATION_BREAK', 'ANOMALY', 'CYCLE_POSITION', 'SECTOR_ROTATION',
  'MEAN_REVERSION_ZONE', 'SMART_MONEY_POSITIONING', 'VOLATILITY_REGIME',
];

const PHASES = ['GENESIS', 'INCIPIENT', 'GROWTH', 'FOMO', 'DECLINE', 'LEGACY'];
const REGIMES = ['BULL', 'BEAR', 'SIDEWAYS', 'VOLATILE', 'RECOVERY', 'CRASH'];

const SYSTEM_CATEGORIES = [
  'ALPHA_HUNTER', 'SMART_MONEY', 'TECHNICAL', 'DEFENSIVE',
  'BOT_AWARE', 'DEEP_ANALYSIS', 'MICRO_STRUCTURE', 'ADAPTIVE',
];

const ARCHETYPES = [
  'SMART_MONEY', 'WHALE', 'SNIPER', 'RETAIL_FOMO',
  'RETAIL_HOLDER', 'SCALPER', 'DEGEN', 'CONTRARIAN',
];

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function seed() {
  console.log('🚀 CryptoQuant Terminal - MASSIVE SEED starting...');
  console.log('📊 Target: 5000+ tokens, 500+ traders, 50000+ candles, FULL data pipeline');
  const startTime = Date.now();

  // Clean ALL data in correct dependency order
  console.log('🧹 Cleaning existing data...');
  const models = [
    'backtestOperation', 'backtestRun', 'tradingSystem',
    'predictiveSignal', 'traderLabelAssignment', 'crossChainWallet',
    'traderBehaviorPattern', 'walletTokenHolding', 'traderTransaction',
    'trader', 'userEvent', 'signal', 'tokenDNA', 'patternRule', 'token',
    'tokenLifecycleState', 'traderBehaviorModel', 'feedbackMetrics',
    'systemEvolution', 'comparativeAnalysis', 'brainCycleRun',
    'operabilitySnapshot', 'compoundGrowthTracker', 'extractionJob',
    'dataRetentionPolicy', 'apiRateLimit', 'decisionLog', 'protocolData',
    'operabilityScore', 'tradingCycle', 'capitalState',
  ];

  for (const model of models) {
    try {
      // @ts-ignore
      await prisma[model].deleteMany();
    } catch {}
  }
  console.log('✅ Cleaned all tables');

  // ============================================================
  // 1. CREATE 5000+ TOKENS
  // ============================================================
  console.log('🎫 Creating 5000+ tokens...');
  const tokenBatchSize = 500;
  const allTokenData: Array<{
    symbol: string; name: string; chain: string; priceUsd: number;
    tokenType: string; dex: string;
  }> = [];

  // SOL tokens: ~2000
  for (let i = 0; i < 2000; i++) {
    const isMeme = Math.random() > 0.15;
    const name = isMeme
      ? SOL_MEME_NAMES[i % SOL_MEME_NAMES.length] + (i >= SOL_MEME_NAMES.length ? ` V${Math.floor(i / SOL_MEME_NAMES.length) + 1}` : '')
      : SOL_DEFI_NAMES[i % SOL_DEFI_NAMES.length] + (i >= SOL_DEFI_NAMES.length ? ` ${Math.floor(i / SOL_DEFI_NAMES.length) + 1}` : '');
    const symbol = name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8) + (i > 100 ? i.toString().substring(0, 3) : '');
    const priceMultiplier = isMeme ? rand(0.0000001, 0.1) : rand(0.5, 500);
    allTokenData.push({
      symbol, name, chain: 'SOL',
      priceUsd: priceMultiplier,
      tokenType: isMeme ? 'MEME' : 'DEFI',
      dex: pick(DEX_BY_CHAIN['SOL']),
    });
  }

  // ETH tokens: ~1500
  for (let i = 0; i < 1500; i++) {
    const isMeme = Math.random() > 0.25;
    const name = isMeme
      ? ETH_MEME_NAMES[i % ETH_MEME_NAMES.length] + (i >= ETH_MEME_NAMES.length ? ` V${Math.floor(i / ETH_MEME_NAMES.length) + 1}` : '')
      : ETH_DEFI_NAMES[i % ETH_DEFI_NAMES.length] + (i >= ETH_DEFI_NAMES.length ? ` ${Math.floor(i / ETH_DEFI_NAMES.length) + 1}` : '');
    const symbol = name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8) + (i > 100 ? i.toString().substring(0, 3) : '');
    const priceMultiplier = isMeme ? rand(0.00000001, 0.01) : rand(1, 5000);
    allTokenData.push({
      symbol, name, chain: 'ETH',
      priceUsd: priceMultiplier,
      tokenType: isMeme ? 'MEME' : 'DEFI',
      dex: pick(DEX_BY_CHAIN['ETH']),
    });
  }

  // BASE tokens: ~700
  for (let i = 0; i < 700; i++) {
    const isMeme = Math.random() > 0.2;
    const name = isMeme
      ? BASE_MEME_NAMES[i % BASE_MEME_NAMES.length] + (i >= BASE_MEME_NAMES.length ? ` V${Math.floor(i / BASE_MEME_NAMES.length) + 1}` : '')
      : 'Base DeFi ' + (i + 1);
    const symbol = name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
    const priceMultiplier = isMeme ? rand(0.000001, 0.05) : rand(0.1, 100);
    allTokenData.push({
      symbol, name, chain: 'BASE',
      priceUsd: priceMultiplier,
      tokenType: isMeme ? 'MEME' : 'DEFI',
      dex: pick(DEX_BY_CHAIN['BASE']),
    });
  }

  // ARB tokens: ~500
  for (let i = 0; i < 500; i++) {
    const isMeme = Math.random() > 0.4;
    const name = isMeme ? `ARB Meme ${i + 1}` : ARB_NAMES[i % ARB_NAMES.length];
    const symbol = name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
    allTokenData.push({
      symbol, name, chain: 'ARB',
      priceUsd: isMeme ? rand(0.0001, 0.5) : rand(0.5, 200),
      tokenType: isMeme ? 'MEME' : 'DEFI',
      dex: pick(DEX_BY_CHAIN['ARB']),
    });
  }

  // OP tokens: ~300
  for (let i = 0; i < 300; i++) {
    const isMeme = Math.random() > 0.4;
    const name = isMeme ? `OP Meme ${i + 1}` : OP_NAMES[i % OP_NAMES.length];
    const symbol = name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
    allTokenData.push({
      symbol, name, chain: 'OP',
      priceUsd: isMeme ? rand(0.0001, 0.5) : rand(0.3, 150),
      tokenType: isMeme ? 'MEME' : 'DEFI',
      dex: pick(DEX_BY_CHAIN['OP']),
    });
  }

  console.log(`📊 Total token definitions: ${allTokenData.length}`);

  // Create tokens in batches
  const tokenIds: string[] = [];
  const tokenAddresses: string[] = [];
  const tokenPrices: number[] = [];
  const tokenChains: string[] = [];

  for (let i = 0; i < allTokenData.length; i += tokenBatchSize) {
    const batch = allTokenData.slice(i, i + tokenBatchSize);
    const results = await prisma.$transaction(
      batch.map(t => prisma.token.create({
        data: {
          symbol: t.symbol,
          name: t.name,
          address: t.chain === 'SOL' ? genSolAddress() : genEthAddress(),
          chain: t.chain,
          priceUsd: t.priceUsd,
          volume24h: rand(1000, 100000000),
          liquidity: rand(500, 50000000),
          marketCap: rand(10000, 5000000000),
          priceChange5m: rand(-10, 10),
          priceChange15m: rand(-20, 20),
          priceChange1h: rand(-30, 30),
          priceChange6h: rand(-40, 40),
          priceChange24h: rand(-50, 50),
          dex: t.dex,
          holderCount: randInt(10, 100000),
          uniqueWallets24h: randInt(5, 20000),
          botActivityPct: rand(5, 50),
          smartMoneyPct: rand(1, 30),
        }
      }))
    );
    results.forEach((r, idx) => {
      tokenIds.push(r.id);
      tokenAddresses.push(r.address);
      tokenPrices.push(batch[idx].priceUsd);
      tokenChains.push(batch[idx].chain);
    });
    if ((i / tokenBatchSize) % 5 === 0) {
      console.log(`  💾 Tokens created: ${tokenIds.length} / ${allTokenData.length}`);
    }
  }
  console.log(`✅ Created ${tokenIds.length} tokens`);

  // ============================================================
  // 2. CREATE TOKEN DNA FOR ALL TOKENS
  // ============================================================
  console.log('🧬 Creating TokenDNA for all tokens...');
  const dnaBatchSize = 500;

  for (let i = 0; i < tokenIds.length; i += dnaBatchSize) {
    const batchIds = tokenIds.slice(i, i + dnaBatchSize);
    await prisma.$transaction(
      batchIds.map((id, idx) => {
        const botPct = rand(5, 45);
        const smPct = rand(2, 25);
        const retailPct = rand(20, 60);
        const whalePct = rand(2, 15);
        const sniperPct = rand(1, 20);
        const mevPct = rand(3, 30);
        const copyPct = rand(1, 10);

        return prisma.tokenDNA.create({
          data: {
            tokenId: id,
            liquidityDNA: JSON.stringify(Array.from({ length: 8 }, () => rand(0, 1))),
            walletDNA: JSON.stringify(Array.from({ length: 6 }, () => rand(0, 1))),
            topologyDNA: JSON.stringify(Array.from({ length: 10 }, () => rand(0, 1))),
            riskScore: randInt(5, 98),
            botActivityScore: botPct,
            smartMoneyScore: smPct,
            retailScore: retailPct,
            whaleScore: whalePct,
            washTradeProb: rand(0, 0.4),
            sniperPct,
            mevPct,
            copyBotPct: copyPct,
            traderComposition: JSON.stringify({
              smartMoney: randInt(2, 15),
              whale: randInt(1, 8),
              bot_mev: randInt(3, 20),
              bot_sniper: randInt(5, 25),
              bot_copy: randInt(1, 8),
              bot_wash: randInt(0, 5),
              retail: randInt(30, 60),
              creator: randInt(0, 2),
              fund: randInt(0, 3),
            }),
            topWallets: JSON.stringify(
              Array.from({ length: 5 }, (_, wi) => ({
                address: genSolAddress().substring(0, 10) + '...',
                label: ['SMART_MONEY', 'WHALE', 'BOT_SNIPER', 'BOT_MEV', 'RETAIL'][wi],
                pnl: rand(-5000, 50000),
                entryRank: randInt(1, 500),
                holdTime: rand(0.5, 1440),
              }))
            ),
          }
        });
      })
    );
    if ((i / dnaBatchSize) % 5 === 0) {
      console.log(`  💾 DNA created: ${Math.min(i + dnaBatchSize, tokenIds.length)} / ${tokenIds.length}`);
    }
  }
  console.log(`✅ Created ${tokenIds.length} TokenDNA records`);

  // ============================================================
  // 3. CREATE 500+ TRADERS
  // ============================================================
  console.log('👤 Creating 500+ traders...');

  // Build trader definitions
  interface TraderDef {
    address: string;
    chain: string;
    name: string;
    label: string;
    isBot: boolean;
    botType: string | null;
  }

  const traderDefs: TraderDef[] = [];

  // Smart Money: 80
  for (let i = 0; i < 80; i++) {
    const chain = pick(CHAINS);
    traderDefs.push({
      address: chain === 'SOL' ? genSolAddress() : genEthAddress(),
      chain,
      name: `Smart Money ${i + 1}`,
      label: 'SMART_MONEY',
      isBot: false,
      botType: null,
    });
  }

  // Whales: 60
  for (let i = 0; i < 60; i++) {
    const chain = pick(CHAINS);
    traderDefs.push({
      address: chain === 'SOL' ? genSolAddress() : genEthAddress(),
      chain,
      name: `Whale ${i + 1}`,
      label: 'WHALE',
      isBot: false,
      botType: null,
    });
  }

  // MEV Bots: 50
  for (let i = 0; i < 50; i++) {
    traderDefs.push({
      address: genSolAddress(),
      chain: 'SOL',
      name: `MEV Bot ${i + 1}`,
      label: 'BOT_MEV',
      isBot: true,
      botType: 'MEV_EXTRACTOR',
    });
  }

  // Sniper Bots: 50
  for (let i = 0; i < 50; i++) {
    const chain = pick(['SOL', 'ETH', 'BASE']);
    traderDefs.push({
      address: chain === 'SOL' ? genSolAddress() : genEthAddress(),
      chain,
      name: `Sniper Bot ${i + 1}`,
      label: 'BOT_SNIPER',
      isBot: true,
      botType: 'SNIPER_BOT',
    });
  }

  // Sandwich Bots: 30
  for (let i = 0; i < 30; i++) {
    const chain = pick(['SOL', 'ETH']);
    traderDefs.push({
      address: chain === 'SOL' ? genSolAddress() : genEthAddress(),
      chain,
      name: `Sandwich Bot ${i + 1}`,
      label: 'BOT_MEV',
      isBot: true,
      botType: 'SANDWICH_BOT',
    });
  }

  // Arbitrage Bots: 25
  for (let i = 0; i < 25; i++) {
    traderDefs.push({
      address: genEthAddress(),
      chain: 'ETH',
      name: `Arbitrage Bot ${i + 1}`,
      label: 'BOT_ARBITRAGE',
      isBot: true,
      botType: 'ARBITRAGE_BOT',
    });
  }

  // Copy Bots: 20
  for (let i = 0; i < 20; i++) {
    const chain = pick(CHAINS);
    traderDefs.push({
      address: chain === 'SOL' ? genSolAddress() : genEthAddress(),
      chain,
      name: `Copy Bot ${i + 1}`,
      label: 'BOT_COPY',
      isBot: true,
      botType: 'COPY_BOT',
    });
  }

  // Wash Trading Bots: 15
  for (let i = 0; i < 15; i++) {
    const chain = pick(['SOL', 'ETH', 'BASE']);
    traderDefs.push({
      address: chain === 'SOL' ? genSolAddress() : genEthAddress(),
      chain,
      name: `Wash Bot ${i + 1}`,
      label: 'BOT_WASH',
      isBot: true,
      botType: 'WASH_TRADING_BOT',
    });
  }

  // JIT LP Bots: 15
  for (let i = 0; i < 15; i++) {
    traderDefs.push({
      address: genSolAddress(),
      chain: 'SOL',
      name: `JIT LP Bot ${i + 1}`,
      label: 'BOT_MAKER',
      isBot: true,
      botType: 'JUST_IN_TIME_BOT',
    });
  }

  // Frontrun Bots: 15
  for (let i = 0; i < 15; i++) {
    traderDefs.push({
      address: genSolAddress(),
      chain: 'SOL',
      name: `Frontrun Bot ${i + 1}`,
      label: 'FRONT_RUN_BOT',
      isBot: true,
      botType: 'FRONT_RUN_BOT',
    });
  }

  // Snipers (human): 40
  for (let i = 0; i < 40; i++) {
    const chain = pick(['SOL', 'ETH', 'BASE']);
    traderDefs.push({
      address: chain === 'SOL' ? genSolAddress() : genEthAddress(),
      chain,
      name: `Sniper ${i + 1}`,
      label: 'SNIPER',
      isBot: false,
      botType: null,
    });
  }

  // Retail: 100
  for (let i = 0; i < 100; i++) {
    const chain = pick(CHAINS);
    traderDefs.push({
      address: chain === 'SOL' ? genSolAddress() : genEthAddress(),
      chain,
      name: `Retail ${i + 1}`,
      label: 'RETAIL',
      isBot: false,
      botType: null,
    });
  }

  // Funds: 10
  for (let i = 0; i < 10; i++) {
    traderDefs.push({
      address: genEthAddress(),
      chain: 'ETH',
      name: `Fund ${i + 1}`,
      label: 'FUND',
      isBot: false,
      botType: null,
    });
  }

  // Yield Farmers: 15
  for (let i = 0; i < 15; i++) {
    const chain = pick(['SOL', 'ETH']);
    traderDefs.push({
      address: chain === 'SOL' ? genSolAddress() : genEthAddress(),
      chain,
      name: `Yield Farmer ${i + 1}`,
      label: 'YIELD_FARMER',
      isBot: false,
      botType: null,
    });
  }

  // Airdrop Hunters: 10
  for (let i = 0; i < 10; i++) {
    const chain = pick(CHAINS);
    traderDefs.push({
      address: chain === 'SOL' ? genSolAddress() : genEthAddress(),
      chain,
      name: `Airdrop Hunter ${i + 1}`,
      label: 'AIRDROP_HUNTER',
      isBot: false,
      botType: null,
    });
  }

  console.log(`📊 Total trader definitions: ${traderDefs.length}`);

  // Create traders in batches
  const traderIds: string[] = [];
  const traderData: Array<{ id: string; chain: string; label: string; isBot: boolean; botType: string | null }> = [];

  for (let i = 0; i < traderDefs.length; i += 100) {
    const batch = traderDefs.slice(i, i + 100);
    const results = await prisma.$transaction(
      batch.map(t => {
        const isSmartMoney = t.label === 'SMART_MONEY';
        const isWhale = t.label === 'WHALE' || t.label === 'FUND';
        const isSniper = t.label === 'SNIPER';
        const isBot = t.isBot;

        let winRate = rand(0.3, 0.55);
        let avgHoldTimeMin = rand(30, 720);
        let avgTradeSizeUsd = rand(100, 5000);
        let totalTrades = randInt(10, 200);
        let totalPnl = rand(-5000, 15000);
        let totalVolume = rand(5000, 500000);
        let smartMoneyScore = rand(0, 30);
        let whaleScore = rand(0, 20);
        let sniperScore = rand(0, 15);
        let botConfidence = 0;
        let washTradeScore = rand(0, 0.1);
        let copyTradeScore = rand(0, 0.15);
        let frontrunCount = 0;
        let sandwichCount = 0;
        let mevExtractionUsd = 0;
        let consistencyScore = rand(0.2, 0.5);
        let isActive247 = false;
        let avgTimeBetweenTrades = rand(30, 720);
        let totalHoldingsUsd = rand(100, 50000);
        let avgSlippageBps = randInt(10, 100);
        let earlyEntryCount = 0;
        let avgEntryRank = rand(100, 5000);
        let avgExitMultiplier = 1;
        let block0EntryCount = 0;
        let sharpeRatio = rand(-0.5, 1);
        let profitFactor = rand(0.5, 1.5);

        if (isBot) {
          winRate = rand(0.55, 0.96);
          consistencyScore = rand(0.7, 0.98);
          isActive247 = Math.random() > 0.2;
          avgTimeBetweenTrades = rand(0.1, 10);
          botConfidence = rand(0.7, 0.98);
          totalTrades = randInt(500, 50000);
          totalVolume = rand(100000, 100000000);

          if (t.botType === 'MEV_EXTRACTOR') {
            avgHoldTimeMin = rand(0.1, 1);
            frontrunCount = randInt(50, 5000);
            mevExtractionUsd = rand(10000, 500000);
            avgSlippageBps = randInt(1, 5);
            winRate = rand(0.88, 0.96);
          } else if (t.botType === 'SNIPER_BOT') {
            avgHoldTimeMin = rand(1, 30);
            sniperScore = rand(60, 98);
            block0EntryCount = randInt(10, 200);
            avgSlippageBps = randInt(50, 500);
            winRate = rand(0.4, 0.7);
          } else if (t.botType === 'SANDWICH_BOT') {
            avgHoldTimeMin = rand(0.1, 2);
            sandwichCount = randInt(100, 5000);
            mevExtractionUsd = rand(5000, 200000);
            winRate = rand(0.85, 0.95);
          } else if (t.botType === 'ARBITRAGE_BOT') {
            avgHoldTimeMin = rand(0.05, 0.5);
            winRate = rand(0.9, 0.99);
            avgSlippageBps = randInt(1, 3);
          } else if (t.botType === 'WASH_TRADING_BOT') {
            washTradeScore = rand(0.7, 0.98);
            winRate = 0.5;
          } else if (t.botType === 'COPY_BOT') {
            copyTradeScore = rand(0.7, 0.95);
            winRate = rand(0.45, 0.6);
          } else if (t.botType === 'JUST_IN_TIME_BOT') {
            avgHoldTimeMin = rand(0.5, 5);
            mevExtractionUsd = rand(5000, 100000);
            winRate = rand(0.85, 0.95);
          } else if (t.botType === 'FRONT_RUN_BOT') {
            avgHoldTimeMin = rand(0.1, 1);
            frontrunCount = randInt(100, 3000);
            mevExtractionUsd = rand(10000, 300000);
            winRate = rand(0.8, 0.93);
          }
        } else if (isSmartMoney) {
          winRate = rand(0.6, 0.85);
          avgHoldTimeMin = rand(60, 10080);
          avgTradeSizeUsd = rand(50000, 500000);
          smartMoneyScore = rand(60, 98);
          totalTrades = randInt(50, 1000);
          totalPnl = rand(100000, 10000000);
          totalVolume = rand(500000, 100000000);
          totalHoldingsUsd = rand(500000, 50000000);
          earlyEntryCount = randInt(10, 100);
          avgEntryRank = rand(1, 100);
          avgExitMultiplier = rand(2, 10);
          sharpeRatio = rand(1.2, 3.5);
          profitFactor = rand(1.5, 4);
        } else if (isWhale) {
          avgHoldTimeMin = rand(1440, 43200);
          avgTradeSizeUsd = rand(500000, 10000000);
          whaleScore = rand(70, 100);
          totalHoldingsUsd = rand(5000000, 500000000);
          totalVolume = rand(1000000, 500000000);
          totalPnl = rand(1000000, 50000000);
          totalTrades = randInt(20, 500);
          sharpeRatio = rand(0.5, 2);
          profitFactor = rand(1, 3);
        } else if (isSniper) {
          sniperScore = rand(50, 95);
          earlyEntryCount = randInt(5, 50);
          avgEntryRank = rand(1, 50);
          block0EntryCount = randInt(2, 30);
          avgHoldTimeMin = rand(1, 120);
          totalTrades = randInt(50, 3000);
          winRate = rand(0.35, 0.65);
        }

        const hourPattern = Array.from({ length: 24 }, (_, h) => {
          if (isBot) return rand(3, 8);
          if (isSmartMoney) return (h >= 13 && h <= 21) ? rand(4, 10) : rand(0, 3);
          return (h >= 8 && h <= 23) ? rand(2, 6) : rand(0, 2);
        });

        const dayPattern = Array.from({ length: 7 }, () => randInt(5, 25));

        return prisma.trader.create({
          data: {
            address: t.address,
            chain: t.chain,
            primaryLabel: t.label,
            subLabels: JSON.stringify([]),
            labelConfidence: isBot ? rand(0.7, 0.98) : rand(0.4, 0.9),
            isBot,
            botType: t.botType,
            botConfidence,
            botDetectionSignals: JSON.stringify(
              isBot ? [
                { signal: 'consistency_score', value: consistencyScore },
                { signal: 'active_247', value: isActive247 },
                { signal: 'avg_time_between_trades', value: avgTimeBetweenTrades },
              ] : []
            ),
            botFirstDetectedAt: isBot ? new Date(Date.now() - rand(86400000, 180 * 86400000)) : null,
            totalTrades,
            winRate,
            avgPnl: totalPnl / (totalTrades || 1),
            totalPnl,
            avgHoldTimeMin,
            avgTradeSizeUsd,
            largestTradeUsd: avgTradeSizeUsd * rand(2, 10),
            totalVolumeUsd: totalVolume,
            maxDrawdown: rand(-50000, -100),
            sharpeRatio,
            profitFactor,
            avgSlippageBps,
            frontrunCount,
            frontrunByCount: frontrunCount > 0 ? 0 : randInt(0, 5),
            sandwichCount,
            sandwichVictimCount: sandwichCount > 0 ? 0 : randInt(0, 10),
            washTradeScore,
            copyTradeScore,
            mevExtractionUsd,
            avgTimeBetweenTrades,
            tradingHourPattern: JSON.stringify(hourPattern),
            tradingDayPattern: JSON.stringify(dayPattern),
            isActiveAtNight: isBot || Math.random() > 0.6,
            isActive247,
            consistencyScore,
            uniqueTokensTraded: randInt(5, 500),
            avgPositionsAtOnce: randInt(1, 15),
            maxPositionsAtOnce: randInt(3, 30),
            preferredChains: JSON.stringify([t.chain, ...(Math.random() > 0.5 ? [pick(CHAINS.filter(c => c !== t.chain))] : [])]),
            preferredDexes: JSON.stringify(pickN(DEX_BY_CHAIN[t.chain] || ['uniswap'], randInt(1, 3))),
            preferredTokenTypes: JSON.stringify(
              isBot ? ['MEME'] : isSmartMoney ? ['DEFI', 'L1', 'L2'] : pickN(TOKEN_TYPES, randInt(1, 3))
            ),
            isSmartMoney,
            smartMoneyScore,
            earlyEntryCount,
            avgEntryRank,
            avgExitMultiplier,
            topCallCount: isSmartMoney ? randInt(10, 100) : randInt(0, 20),
            worstCallCount: isSmartMoney ? randInt(2, 20) : randInt(5, 50),
            isWhale,
            whaleScore,
            totalHoldingsUsd,
            avgPositionUsd: totalHoldingsUsd / rand(3, 15),
            priceImpactAvg: whaleScore > 50 ? rand(0.5, 5) : rand(0, 0.5),
            isSniper,
            sniperScore,
            avgBlockToTrade: isSniper ? rand(0.5, 5) : rand(50, 5000),
            block0EntryCount,
            firstSeen: new Date(Date.now() - rand(86400000, 365 * 86400000)),
            lastActive: new Date(Date.now() - rand(0, 3600000)),
            lastAnalyzed: new Date(),
            dataQuality: rand(0.3, 0.95),
          }
        });
      })
    );

    results.forEach(r => {
      traderIds.push(r.id);
      traderData.push({ id: r.id, chain: r.chain, label: r.primaryLabel, isBot: r.isBot, botType: r.botType });
    });
    console.log(`  💾 Traders created: ${traderIds.length} / ${traderDefs.length}`);
  }
  console.log(`✅ Created ${traderIds.length} traders`);

  // ============================================================
  // 4. CREATE BEHAVIOR PATTERNS FOR ALL TRADERS
  // ============================================================
  console.log('🧩 Creating behavior patterns...');
  let patternCount = 0;

  for (let i = 0; i < traderData.length; i += 200) {
    const batch = traderData.slice(i, i + 200);
    const patterns = batch.flatMap(t => {
      let traderPatterns: string[];
      if (t.isBot) {
        if (t.botType === 'MEV_EXTRACTOR') traderPatterns = ['MEV_EXTRACTOR', 'SCALPER'];
        else if (t.botType === 'SNIPER_BOT') traderPatterns = ['SNIPER_ENTRY', 'SCALPER'];
        else if (t.botType === 'SANDWICH_BOT') traderPatterns = ['SANDWICH_ATTACKER', 'MEV_EXTRACTOR'];
        else if (t.botType === 'ARBITRAGE_BOT') traderPatterns = ['MULTI_HOP_SWAPPER', 'BRIDGE_HOPPER'];
        else if (t.botType === 'WASH_TRADING_BOT') traderPatterns = ['WASH_TRADER'];
        else if (t.botType === 'COPY_BOT') traderPatterns = ['COPY_CAT'];
        else if (t.botType === 'JUST_IN_TIME_BOT') traderPatterns = ['JUST_IN_TIME_LP', 'LIQUIDITY_PROVIDER'];
        else traderPatterns = ['SCALPER', 'MEV_EXTRACTOR'];
      } else if (t.label === 'SMART_MONEY') {
        traderPatterns = ['ACCUMULATOR', 'MOMENTUM_RIDER', 'CONTRARIAN'];
      } else if (t.label === 'WHALE' || t.label === 'FUND') {
        traderPatterns = ['ACCUMULATOR', 'DIAMOND_HANDS'];
      } else if (t.label === 'SNIPER') {
        traderPatterns = ['SNIPER_ENTRY', 'SCALPER'];
      } else if (t.label === 'YIELD_FARMER') {
        traderPatterns = ['YIELD_FARMER', 'LIQUIDITY_PROVIDER'];
      } else if (t.label === 'AIRDROP_HUNTER') {
        traderPatterns = ['AIRDROP_FARMER', 'BRIDGE_HOPPER'];
      } else {
        traderPatterns = pickN(['SWING_TRADER', 'MOMENTUM_RIDER', 'SCALPER', 'DIAMOND_HANDS'], randInt(1, 3));
      }

      return traderPatterns.map(pattern => prisma.traderBehaviorPattern.create({
        data: {
          traderId: t.id,
          pattern,
          confidence: rand(0.5, 0.95),
          dataPoints: randInt(20, 500),
          firstObserved: new Date(Date.now() - rand(86400000, 90 * 86400000)),
          lastObserved: new Date(Date.now() - rand(0, 86400000)),
          metadata: JSON.stringify({ source: 'algorithm_v2' }),
        }
      }));
    });

    await prisma.$transaction(patterns);
    patternCount += patterns.length;
    console.log(`  💾 Patterns: ${patternCount}`);
  }
  console.log(`✅ Created ${patternCount} behavior patterns`);

  // ============================================================
  // 5. CREATE LABEL ASSIGNMENTS
  // ============================================================
  console.log('🏷️ Creating label assignments...');
  let labelCount = 0;

  for (let i = 0; i < traderData.length; i += 200) {
    const batch = traderData.slice(i, i + 200);
    const labels = batch.flatMap(t => {
      const assignments = [
        prisma.traderLabelAssignment.create({
          data: {
            traderId: t.id,
            label: t.label,
            source: t.isBot ? 'ALGORITHM' : t.label === 'SMART_MONEY' ? 'ON_CHAIN_ANALYSIS' : 'PATTERN_MATCHING',
            confidence: rand(0.5, 0.98),
            evidence: JSON.stringify([
              `Classification based on trading patterns`,
              `Label: ${t.label}`,
            ]),
            assignedAt: new Date(),
          }
        })
      ];

      // Add secondary labels for some traders
      if (t.label === 'SMART_MONEY') {
        assignments.push(
          prisma.traderLabelAssignment.create({
            data: {
              traderId: t.id,
              label: 'WHALE',
              source: 'ON_CHAIN_ANALYSIS',
              confidence: rand(0.3, 0.7),
              evidence: JSON.stringify(['Large holdings detected']),
              assignedAt: new Date(),
            }
          })
        );
      }

      return assignments;
    });

    await prisma.$transaction(labels);
    labelCount += labels.length;
  }
  console.log(`✅ Created ${labelCount} label assignments`);

  // ============================================================
  // 6. CREATE WALLET TOKEN HOLDINGS (20000+)
  // ============================================================
  console.log('💰 Creating wallet token holdings...');
  let holdingCount = 0;

  for (let i = 0; i < traderData.length; i += 50) {
    const batch = traderData.slice(i, i + 50);
    const holdings = batch.flatMap(t => {
      // Each trader holds 3-15 tokens from their chain
      const chainTokenIdxs = tokenIds
        .map((id, idx) => ({ id, idx }))
        .filter(({ idx }) => tokenChains[idx] === t.chain);

      const numHoldings = Math.min(randInt(3, 15), chainTokenIdxs.length);
      const selected = pickN(chainTokenIdxs, numHoldings);

      return selected.map(({ id: tokenId, idx }) => {
        const price = tokenPrices[idx];
        const balance = rand(100, 1000000);
        const avgEntry = price * rand(0.4, 1.4);

        return prisma.walletTokenHolding.create({
          data: {
            traderId: t.id,
            tokenAddress: tokenAddresses[idx],
            tokenSymbol: allTokenData[idx]?.symbol || 'UNKNOWN',
            chain: t.chain,
            balance,
            valueUsd: balance * price,
            avgEntryPrice: avgEntry,
            unrealizedPnl: (price - avgEntry) * balance,
            unrealizedPnlPct: ((price - avgEntry) / avgEntry) * 100,
            firstBuyAt: new Date(Date.now() - rand(86400000, 90 * 86400000)),
            lastTradeAt: new Date(Date.now() - rand(0, 86400000)),
            buyCount: randInt(1, 20),
            sellCount: randInt(0, 10),
            totalBoughtUsd: balance * avgEntry * rand(0.8, 1.5),
            totalSoldUsd: balance * avgEntry * rand(0, 0.5),
          }
        });
      });
    });

    // Split into sub-batches to avoid transaction limits
    for (let j = 0; j < holdings.length; j += 200) {
      await prisma.$transaction(holdings.slice(j, j + 200));
    }
    holdingCount += holdings.length;
    if ((i / 50) % 5 === 0) console.log(`  💾 Holdings: ${holdingCount}`);
  }
  console.log(`✅ Created ${holdingCount} wallet token holdings`);

  // ============================================================
  // 7. CREATE TRADER TRANSACTIONS (20000+)
  // ============================================================
  console.log('📝 Creating trader transactions...');
  let txCount = 0;

  // Create transactions for top 200 traders (100 each = 20000)
  const topTraders = traderData.slice(0, Math.min(200, traderData.length));

  for (let i = 0; i < topTraders.length; i += 20) {
    const batch = topTraders.slice(i, i + 20);
    const txs = batch.flatMap(t => {
      const chainTokenIdxs = tokenIds
        .map((id, idx) => ({ id, idx }))
        .filter(({ idx }) => tokenChains[idx] === t.chain);

      const numTx = randInt(50, 150);

      return Array.from({ length: numTx }, () => {
        const tokenInfo = chainTokenIdxs[Math.floor(Math.random() * chainTokenIdxs.length)];
        if (!tokenInfo) return null;

        const price = tokenPrices[tokenInfo.idx];
        const isBuy = Math.random() > 0.45;
        const valueUsd = rand(50, t.isBot ? 50000 : (t.label === 'WHALE' ? 5000000 : 10000));

        return prisma.traderTransaction.create({
          data: {
            traderId: t.id,
            txHash: genTxHash(t.chain),
            blockNumber: randInt(180000000, 210000000),
            blockTime: new Date(Date.now() - rand(0, 30 * 86400000)),
            chain: t.chain,
            dex: pick(DEX_BY_CHAIN[t.chain] || ['uniswap']),
            action: isBuy ? 'BUY' : 'SELL',
            tokenAddress: tokenAddresses[tokenInfo.idx],
            tokenSymbol: allTokenData[tokenInfo.idx]?.symbol || 'UNKNOWN',
            quoteToken: t.chain === 'SOL' ? 'SOL' : 'WETH',
            amountIn: valueUsd / (price || 1),
            amountOut: valueUsd / (price || 1) * rand(0.95, 1.05),
            priceUsd: price * rand(0.95, 1.05),
            valueUsd,
            slippageBps: t.isBot ? randInt(1, 10) : randInt(20, 200),
            pnlUsd: isBuy ? null : rand(-1000, 5000),
            isFrontrun: t.isBot && t.botType === 'MEV_EXTRACTOR' && Math.random() > 0.7,
            isSandwich: t.botType === 'SANDWICH_BOT' && Math.random() > 0.5,
            isWashTrade: t.botType === 'WASH_TRADING_BOT' && Math.random() > 0.5,
            isJustInTime: t.botType === 'JUST_IN_TIME_BOT' && Math.random() > 0.6,
            priorityFee: t.isBot ? rand(0.001, 0.1) : 0,
            totalFeeUsd: rand(0.01, 5),
            tokenAgeAtTrade: rand(1, 43200),
            holderCountAtTrade: randInt(10, 5000),
            liquidityAtTrade: rand(10000, 5000000),
            metadata: JSON.stringify({ source: 'seed_simulation' }),
          }
        });
      }).filter(Boolean);
    });

    // Process in sub-batches
    for (let j = 0; j < txs.length; j += 100) {
      await prisma.$transaction(txs.slice(j, j + 100));
    }
    txCount += txs.length;
    console.log(`  💾 Transactions: ${txCount}`);
  }
  console.log(`✅ Created ${txCount} trader transactions`);

  // ============================================================
  // 8. CREATE PRICE CANDLES (50000+)
  // ============================================================
  console.log('🕯️ Creating price candles...');
  let candleCount = 0;
  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

  // Create candles for top 500 tokens
  const topTokenCount = Math.min(500, tokenIds.length);
  const candleTokenIdxs = Array.from({ length: topTokenCount }, (_, i) => i);

  for (let i = 0; i < candleTokenIdxs.length; i += 25) {
    const batchIdxs = candleTokenIdxs.slice(i, i + 25);
    const candles = batchIdxs.flatMap(tokenIdx => {
      const price = tokenPrices[tokenIdx];
      const chain = tokenChains[tokenIdx];
      const addr = tokenAddresses[tokenIdx];

      // 1h candles for last 7 days = 168 candles per token
      const tf = pick(timeframes);
      const numCandles = randInt(50, 200);

      return Array.from({ length: numCandles }, (_, ci) => {
        const basePrice = price * rand(0.7, 1.3);
        const volatility = basePrice * rand(0.01, 0.1);
        const open = basePrice + rand(-volatility, volatility);
        const close = open + rand(-volatility, volatility);
        const high = Math.max(open, close) + rand(0, volatility);
        const low = Math.min(open, close) - rand(0, volatility);

        return prisma.priceCandle.create({
          data: {
            tokenAddress: addr,
            chain,
            timeframe: tf,
            timestamp: new Date(Date.now() - (numCandles - ci) * 3600000),
            open,
            high,
            low,
            close,
            volume: rand(1000, 5000000),
            trades: randInt(10, 5000),
            source: pick(['birdeye', 'dexscreener', 'internal']),
          }
        });
      });
    });

    for (let j = 0; j < candles.length; j += 500) {
      await prisma.$transaction(candles.slice(j, j + 500));
    }
    candleCount += candles.length;
    if ((i / 25) % 4 === 0) console.log(`  💾 Candles: ${candleCount}`);
  }
  console.log(`✅ Created ${candleCount} price candles`);

  // ============================================================
  // 9. CREATE SIGNALS (500+)
  // ============================================================
  console.log('🚨 Creating signals...');
  const signalBatch = Array.from({ length: 500 }, () => {
    const type = pick(SIGNAL_TYPES);
    const tokenIdx = randInt(0, tokenIds.length - 1);
    const price = tokenPrices[tokenIdx];

    const descriptions: Record<string, string[]> = {
      'RUG_PULL': ['Liquidity removal detected - pool drained 40%', 'Creator wallet moving to exchange', 'Mint function unlocked'],
      'SMART_MONEY_ENTRY': ['Top smart money wallet accumulated 2.3%', '3 profitable wallets entered within 10 min', 'Known whale building position'],
      'BOT_ACTIVITY_SPIKE': ['MEV activity increased 300% in last hour', '8 sniper bots detected at launch', 'Wash trading pattern detected'],
      'WHALE_MOVEMENT': ['Whale transferred 500K tokens to exchange', '2M USD buy in single transaction'],
      'V_SHAPE': ['Sharp rejection from support with volume', 'Flash crash recovery - smart money buying'],
      'DIVERGENCE': ['Price lower lows + smart money accumulating', 'Volume divergence - rising on declining volume'],
      'LIQUIDITY_TRAP': ['False breakout - stops likely hunted', 'Concentrated liquidity at key level'],
      'BREAKOUT': ['Price breaking above resistance with volume', 'Key level breached - momentum building'],
      'ACCUMULATION_ZONE': ['Smart money accumulating in range', 'Whale wallet adding position steadily'],
      'PUMP_IMMINENT': ['Multiple signals converging for upside', 'Bullish setup forming'],
      'DUMP_IMMINENT': ['Distribution pattern detected', 'Large sell wall forming'],
    };

    const descs = descriptions[type] || ['Signal detected by analysis engine'];

    return prisma.signal.create({
      data: {
        type,
        tokenId: tokenIds[tokenIdx],
        confidence: randInt(30, 98),
        priceTarget: price * rand(0.5, 2),
        direction: ['RUG_PULL', 'WASH_TRADING_ALERT', 'DUMP_IMMINENT', 'BREAKDOWN'].includes(type)
          ? 'AVOID'
          : Math.random() > 0.5 ? 'LONG' : 'SHORT',
        description: pick(descs),
        metadata: JSON.stringify({
          source: pick(['on-chain', 'wallet-tracking', 'bot-detection', 'behavioral-analysis']),
          timeframe: pick(['5m', '15m', '1h', '4h', '24h']),
          relatedWallets: Array.from({ length: randInt(1, 5) }, () => genSolAddress().substring(0, 10) + '...'),
          botInvolvement: type.includes('BOT') || type.includes('WASH'),
        }),
        createdAt: new Date(Date.now() - rand(0, 3600000)),
      }
    });
  });

  for (let i = 0; i < signalBatch.length; i += 100) {
    await prisma.$transaction(signalBatch.slice(i, i + 100));
  }
  console.log(`✅ Created ${signalBatch.length} signals`);

  // ============================================================
  // 10. CREATE PATTERN RULES (30+)
  // ============================================================
  console.log('📐 Creating pattern rules...');
  const patternRules = [
    { name: 'Smart Money Accumulation + Low Bot Activity', category: 'SMART_MONEY', winRate: 0.76, occurrences: 134 },
    { name: 'Rug Pull + Sniper Bot Cluster', category: 'DEFENSIVE', winRate: 0.91, occurrences: 267 },
    { name: 'MEV Dominance Warning', category: 'BOT_AWARE', winRate: 0.84, occurrences: 189 },
    { name: 'V-Shape Recovery + Smart Money', category: 'TECHNICAL', winRate: 0.68, occurrences: 95 },
    { name: 'Wash Trading Avoidance', category: 'DEFENSIVE', winRate: 0.93, occurrences: 312 },
    { name: 'Whale Entry Pattern', category: 'SMART_MONEY', winRate: 0.71, occurrences: 88 },
    { name: 'Copy Trade Cascade', category: 'BOT_AWARE', winRate: 0.62, occurrences: 156 },
    { name: 'Genesis Phase Sniper Entry', category: 'ALPHA_HUNTER', winRate: 0.55, occurrences: 423 },
    { name: 'Growth Phase Momentum', category: 'TECHNICAL', winRate: 0.73, occurrences: 201 },
    { name: 'FOMO Phase Distribution', category: 'DEFENSIVE', winRate: 0.87, occurrences: 178 },
    { name: 'Decline Phase Contrarian', category: 'ADAPTIVE', winRate: 0.45, occurrences: 345 },
    { name: 'Legacy Phase Value', category: 'DEEP_ANALYSIS', winRate: 0.58, occurrences: 67 },
    { name: 'Cross-Chain Arbitrage Window', category: 'BOT_AWARE', winRate: 0.92, occurrences: 45 },
    { name: 'JIT LP Front-Run Signal', category: 'MICRO_STRUCTURE', winRate: 0.81, occurrences: 234 },
    { name: 'Sandwich Attack Alert', category: 'DEFENSIVE', winRate: 0.89, occurrences: 567 },
    { name: 'Volume Spike + Price Breakout', category: 'TECHNICAL', winRate: 0.66, occurrences: 290 },
    { name: 'Liquidity Drain Warning', category: 'DEFENSIVE', winRate: 0.94, occurrences: 123 },
    { name: 'Smart Money Exit Cascade', category: 'SMART_MONEY', winRate: 0.79, occurrences: 156 },
    { name: 'Sniper Bot Cluster Entry', category: 'BOT_AWARE', winRate: 0.57, occurrences: 89 },
    { name: 'Mean Reversion Zone', category: 'ADAPTIVE', winRate: 0.63, occurrences: 210 },
    { name: 'Sector Rotation Signal', category: 'DEEP_ANALYSIS', winRate: 0.69, occurrences: 134 },
    { name: 'Multi-Timeframe Confluence', category: 'TECHNICAL', winRate: 0.74, occurrences: 178 },
    { name: 'Accumulation + Low Volatility', category: 'ALPHA_HUNTER', winRate: 0.72, occurrences: 223 },
    { name: 'Distribution Pattern Top', category: 'DEFENSIVE', winRate: 0.82, occurrences: 189 },
    { name: 'Flash Crash Recovery', category: 'ADAPTIVE', winRate: 0.61, occurrences: 56 },
    { name: 'DeFi Yield Opportunity', category: 'ALPHA_HUNTER', winRate: 0.67, occurrences: 145 },
    { name: 'Bridge Volume Anomaly', category: 'BOT_AWARE', winRate: 0.75, occurrences: 67 },
    { name: 'Airdrop Farm Cluster', category: 'BOT_AWARE', winRate: 0.58, occurrences: 234 },
    { name: 'NFT Floor Sweep Pattern', category: 'ALPHA_HUNTER', winRate: 0.54, occurrences: 89 },
    { name: 'Stablecoin Depeg Warning', category: 'DEFENSIVE', winRate: 0.88, occurrences: 34 },
  ];

  await prisma.$transaction(
    patternRules.map(p => prisma.patternRule.create({
      data: {
        name: p.name,
        description: `Pattern: ${p.name} - detected ${p.occurrences} times with ${(p.winRate * 100).toFixed(1)}% win rate`,
        category: p.category,
        conditions: JSON.stringify({
          logic: 'AND',
          rules: [
            { field: 'volume', operator: '>', value: randInt(10000, 500000) },
            { field: 'smartMoneyScore', operator: '>', value: randInt(20, 80) },
            { field: 'botActivityPct', operator: '<', value: randInt(20, 60) },
          ]
        }),
        isActive: true,
        backtestResults: JSON.stringify({
          avgReturn: rand(-15, 40),
          maxDrawdown: rand(-80, -5),
          sharpeRatio: rand(-0.5, 3),
        }),
        winRate: p.winRate,
        occurrences: p.occurrences,
      }
    }))
  );
  console.log(`✅ Created ${patternRules.length} pattern rules`);

  // ============================================================
  // 11. CREATE CROSS-CHAIN WALLET LINKS (50+)
  // ============================================================
  console.log('🔗 Creating cross-chain wallet links...');
  const crossChainLinks = [];

  const solTraders = traderData.filter(t => t.chain === 'SOL');
  const ethTraders = traderData.filter(t => t.chain === 'ETH');
  const baseTraders = traderData.filter(t => t.chain === 'BASE');

  // Link bots across chains
  for (let i = 0; i < Math.min(20, solTraders.length, ethTraders.length); i++) {
    if (solTraders[i].isBot && ethTraders[i].isBot) {
      crossChainLinks.push(
        prisma.crossChainWallet.create({
          data: {
            primaryWalletId: solTraders[i].id,
            linkedWalletId: ethTraders[i].id,
            primaryChain: 'SOL',
            linkedChain: 'ETH',
            linkedAddress: genEthAddress(),
            linkType: 'SAME_ENTITY',
            linkConfidence: rand(0.6, 0.9),
            evidence: JSON.stringify(['Similar trading patterns', 'Temporal correlation']),
            bridgeTxCount: randInt(2, 15),
            totalBridgedUsd: rand(5000, 500000),
          }
        })
      );
    }
  }

  // Link smart money across chains
  const smSol = solTraders.filter(t => t.label === 'SMART_MONEY');
  const smEth = ethTraders.filter(t => t.label === 'SMART_MONEY');
  for (let i = 0; i < Math.min(15, smSol.length, smEth.length); i++) {
    crossChainLinks.push(
      prisma.crossChainWallet.create({
        data: {
          primaryWalletId: smSol[i].id,
          linkedWalletId: smEth[i].id,
          primaryChain: 'SOL',
          linkedChain: 'ETH',
          linkedAddress: genEthAddress(),
          linkType: 'LIKELY_LINKED',
          linkConfidence: rand(0.3, 0.7),
          evidence: JSON.stringify(['Similar win rates', 'Cross-chain bridge txs']),
          bridgeTxCount: randInt(1, 5),
          totalBridgedUsd: rand(10000, 200000),
        }
      })
    );
  }

  // Link BASE and ETH wallets
  for (let i = 0; i < Math.min(15, baseTraders.length, ethTraders.length); i++) {
    crossChainLinks.push(
      prisma.crossChainWallet.create({
        data: {
          primaryWalletId: baseTraders[i].id,
          linkedWalletId: ethTraders[i].id,
          primaryChain: 'BASE',
          linkedChain: 'ETH',
          linkedAddress: genEthAddress(),
          linkType: 'BRIDGE_USER',
          linkConfidence: rand(0.4, 0.8),
          evidence: JSON.stringify(['Bridge transactions detected']),
          bridgeTxCount: randInt(1, 10),
          totalBridgedUsd: rand(5000, 100000),
        }
      })
    );
  }

  for (let i = 0; i < crossChainLinks.length; i += 50) {
    await prisma.$transaction(crossChainLinks.slice(i, i + 50));
  }
  console.log(`✅ Created ${crossChainLinks.length} cross-chain wallet links`);

  // ============================================================
  // 12. CREATE TRADING SYSTEMS (20+)
  // ============================================================
  console.log('⚙️ Creating trading systems...');
  const tradingSystems = [
    { name: 'Alpha Sniper Pro', category: 'ALPHA_HUNTER', desc: 'Snipes early entries on high-potential tokens with low bot activity' },
    { name: 'Smart Money Shadow', category: 'SMART_MONEY', desc: 'Mirrors smart money wallet entries with validated confirmation' },
    { name: 'Rug Shield', category: 'DEFENSIVE', desc: 'Detects and avoids rug pulls, wash trading, and MEV traps' },
    { name: 'Momentum Rider', category: 'TECHNICAL', desc: 'Rides momentum waves in Growth and FOMO phases' },
    { name: 'Bot Avoidance Engine', category: 'BOT_AWARE', desc: 'Filters out tokens dominated by bots and MEV extractors' },
    { name: 'Deep DNA Scanner', category: 'DEEP_ANALYSIS', desc: 'Analyzes TokenDNA for hidden alpha signals' },
    { name: 'Micro Structure Alpha', category: 'MICRO_STRUCTURE', desc: 'Exploits order book micro-structure for short-term gains' },
    { name: 'Adaptive Phase Trader', category: 'ADAPTIVE', desc: 'Adapts strategy based on detected token lifecycle phase' },
    { name: 'V-Shape Catcher', category: 'TECHNICAL', desc: 'Catches V-shape recoveries with smart money confirmation' },
    { name: 'Whale Tail', category: 'SMART_MONEY', desc: 'Tracks whale accumulation and rides their momentum' },
    { name: 'Contrarian Value', category: 'ADAPTIVE', desc: 'Buys during decline phase when fundamentals remain strong' },
    { name: 'Genesis Hunter', category: 'ALPHA_HUNTER', desc: 'Targets genesis phase tokens with smart money present' },
    { name: 'MEV Shield Pro', category: 'DEFENSIVE', desc: 'Protects against MEV extraction and sandwich attacks' },
    { name: 'Yield Optimizer', category: 'DEEP_ANALYSIS', desc: 'Finds optimal DeFi yield opportunities with risk assessment' },
    { name: 'Cross-Chain Arbitrageur', category: 'BOT_AWARE', desc: 'Detects cross-chain arbitrage opportunities' },
    { name: 'Sector Rotation Engine', category: 'DEEP_ANALYSIS', desc: 'Tracks sector rotation between MEME, DEFI, L1, L2' },
    { name: 'Compound Growth Engine', category: 'ADAPTIVE', desc: 'Optimizes for compound growth with fee-awareness' },
    { name: 'Sentiment Divergence', category: 'TECHNICAL', desc: 'Trades divergence between on-chain sentiment and price' },
    { name: 'Liquidity Provider Pro', category: 'MICRO_STRUCTURE', desc: 'Optimizes LP positions with JIT strategies' },
    { name: 'Flash Recovery System', category: 'ADAPTIVE', desc: 'Buys flash crashes with strict risk management' },
  ];

  const systemIds: string[] = [];
  for (const sys of tradingSystems) {
    const system = await prisma.tradingSystem.create({
      data: {
        name: sys.name,
        description: sys.desc,
        category: sys.category,
        icon: pick(['🎯', '🧠', '🛡️', '⚡', '🔍', '📈', '🔄', '💎', '🦈', '🦅', '🔥', '🌊']),
        assetFilter: JSON.stringify({
          chains: pickN(CHAINS, randInt(1, 3)),
          minLiquidity: rand(10000, 500000),
          tokenTypes: pickN(TOKEN_TYPES, randInt(1, 3)),
        }),
        phaseConfig: JSON.stringify({
          GENESIS: { enabled: Math.random() > 0.3 },
          INCIPIENT: { enabled: Math.random() > 0.2 },
          GROWTH: { enabled: true },
          FOMO: { enabled: Math.random() > 0.4 },
          DECLINE: { enabled: Math.random() > 0.5 },
          LEGACY: { enabled: Math.random() > 0.6 },
        }),
        entrySignal: JSON.stringify({
          smartMoneyBuys: { min: randInt(1, 5) },
          botActivityPct: { max: randInt(20, 50) },
          volumeSpike: { min: randInt(100, 500) },
        }),
        executionConfig: JSON.stringify({
          dex: 'auto',
          slippageBps: randInt(10, 100),
          priorityFee: rand(0.001, 0.01),
        }),
        exitSignal: JSON.stringify({
          takeProfitPct: randInt(20, 100),
          stopLossPct: randInt(5, 20),
          trailingStopPct: randInt(5, 15),
        }),
        bigDataContext: JSON.stringify({
          regime: pick(REGIMES),
          volThreshold: rand(0.1, 0.5),
          botSwarmThreshold: randInt(20, 50),
        }),
        primaryTimeframe: pick(['5m', '15m', '1h', '4h']),
        confirmTimeframes: JSON.stringify(pickN(['1m', '5m', '15m', '1h', '4h', '1d'], 2)),
        maxPositionPct: rand(2, 10),
        maxOpenPositions: randInt(3, 15),
        stopLossPct: rand(5, 20),
        takeProfitPct: rand(20, 80),
        trailingStopPct: rand(5, 15),
        cashReservePct: rand(10, 30),
        allocationMethod: pick(['KELLY_MODIFIED', 'EQUAL_WEIGHT', 'RISK_PARITY', 'OPTIMAL_F']),
        allocationConfig: JSON.stringify({ kellyFraction: rand(0.25, 0.5) }),
        isActive: Math.random() > 0.5,
        isPaperTrading: Math.random() > 0.4,
        autoOptimize: Math.random() > 0.5,
        optimizationMethod: pick(['GRID', 'WALK_FORWARD', 'BAYESIAN', 'GENETIC']),
        optimizationFreq: pick(['DAILY', 'WEEKLY', 'MONTHLY']),
        totalBacktests: randInt(1, 50),
        bestSharpe: rand(0.5, 3),
        bestWinRate: rand(0.5, 0.9),
        bestPnlPct: rand(10, 200),
        avgHoldTimeMin: rand(5, 4320),
      }
    });
    systemIds.push(system.id);
  }
  console.log(`✅ Created ${systemIds.length} trading systems`);

  // ============================================================
  // 13. CREATE BACKTEST RUNS (50+)
  // ============================================================
  console.log('🧪 Creating backtest runs...');
  const backtestIds: string[] = [];

  for (let i = 0; i < Math.min(50, systemIds.length); i++) {
    const systemId = systemIds[i];
    const initialCapital = rand(100, 10000);
    const pnlPct = rand(-30, 80);
    const finalCapital = initialCapital * (1 + pnlPct / 100);
    const totalTrades = randInt(10, 500);
    const winTrades = Math.floor(totalTrades * rand(0.3, 0.8));

    const backtest = await prisma.backtestRun.create({
      data: {
        systemId,
        mode: pick(['HISTORICAL', 'PAPER', 'FORWARD']),
        periodStart: new Date(Date.now() - rand(30, 180) * 86400000),
        periodEnd: new Date(Date.now() - rand(0, 30) * 86400000),
        initialCapital,
        capitalAllocation: JSON.stringify({ method: 'KELLY_MODIFIED', fraction: 0.5 }),
        finalCapital,
        totalPnl: finalCapital - initialCapital,
        totalPnlPct: pnlPct,
        annualizedReturn: rand(-50, 200),
        benchmarkReturn: rand(-20, 50),
        alpha: rand(-10, 30),
        totalTrades,
        winTrades,
        lossTrades: totalTrades - winTrades,
        winRate: winTrades / totalTrades,
        avgWin: rand(100, 5000),
        avgLoss: rand(-3000, -50),
        profitFactor: rand(0.5, 3),
        expectancy: rand(-50, 200),
        maxDrawdown: rand(-10000, -100),
        maxDrawdownPct: rand(-50, -5),
        sharpeRatio: rand(-1, 3),
        sortinoRatio: rand(-1, 4),
        calmarRatio: rand(-1, 5),
        recoveryFactor: rand(0.5, 5),
        avgHoldTimeMin: rand(5, 4320),
        marketExposurePct: rand(20, 80),
        phaseResults: JSON.stringify({
          GENESIS: { pnl: rand(-100, 500), trades: randInt(0, 20) },
          GROWTH: { pnl: rand(-100, 1000), trades: randInt(5, 50) },
          FOMO: { pnl: rand(-200, 500), trades: randInt(2, 30) },
        }),
        timeframeResults: JSON.stringify({
          '1h': { pnl: rand(-100, 500) },
          '4h': { pnl: rand(-100, 800) },
        }),
        operationTypeResults: JSON.stringify({
          SCALP: { pnl: rand(-50, 300), count: randInt(5, 50) },
          SWING: { pnl: rand(-200, 1000), count: randInt(2, 20) },
        }),
        allocationMethodResults: JSON.stringify({
          KELLY: { pnl: rand(-100, 800) },
          EQUAL: { pnl: rand(-100, 600) },
        }),
        optimizationEnabled: Math.random() > 0.5,
        optimizationMethod: pick(['GRID', 'WALK_FORWARD', 'BAYESIAN']),
        inSampleScore: rand(0.5, 0.95),
        outOfSampleScore: rand(0.3, 0.85),
        walkForwardRatio: rand(0.5, 1.2),
        status: pick(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']),
        progress: rand(0, 1),
        startedAt: new Date(Date.now() - rand(3600000, 86400000)),
        completedAt: new Date(Date.now() - rand(0, 3600000)),
      }
    });
    backtestIds.push(backtest.id);
  }
  console.log(`✅ Created ${backtestIds.length} backtest runs`);

  // ============================================================
  // 14. CREATE BACKTEST OPERATIONS (200+)
  // ============================================================
  console.log('📊 Creating backtest operations...');
  let opsCount = 0;

  for (const backtestId of backtestIds) {
    const systemId = pick(systemIds);
    const tokenIdx = randInt(0, tokenIds.length - 1);
    const price = tokenPrices[tokenIdx];
    const numOps = randInt(5, 15);

    const ops = Array.from({ length: numOps }, () => {
      const entryPrice = price * rand(0.7, 1.3);
      const exitPrice = entryPrice * rand(0.8, 1.5);
      const isWin = exitPrice > entryPrice;
      const positionSize = rand(100, 5000);
      const pnl = (exitPrice - entryPrice) / entryPrice * positionSize;

      return prisma.backtestOperation.create({
        data: {
          backtestId,
          systemId,
          tokenAddress: tokenAddresses[tokenIdx],
          tokenSymbol: allTokenData[tokenIdx]?.symbol || 'UNKNOWN',
          chain: tokenChains[tokenIdx],
          tokenPhase: pick(PHASES),
          tokenAgeMinutes: rand(1, 43200),
          marketConditions: JSON.stringify({ regime: pick(REGIMES), volatility: rand(0.1, 0.5) }),
          tokenDnaSnapshot: JSON.stringify({ riskScore: randInt(10, 90), smartMoneyScore: rand(0, 100) }),
          traderComposition: JSON.stringify({ smartMoney: randInt(1, 15), bot_mev: randInt(3, 25) }),
          bigDataContext: JSON.stringify({ regime: pick(REGIMES) }),
          operationType: pick(['SCALP', 'SWING_LONG', 'DCA_ENTRY', 'MOMENTUM_RIDE', 'CONTRARIAN_BUY']),
          timeframe: pick(['5m', '15m', '1h', '4h']),
          entryPrice,
          entryTime: new Date(Date.now() - rand(86400000, 30 * 86400000)),
          entryReason: JSON.stringify({ signal: 'smart_money_entry', confidence: rand(0.5, 0.95) }),
          exitPrice: Math.random() > 0.3 ? exitPrice : null,
          exitTime: Math.random() > 0.3 ? new Date(Date.now() - rand(0, 86400000)) : null,
          exitReason: Math.random() > 0.3 ? pick(['TAKE_PROFIT', 'STOP_LOSS', 'TRAILING_STOP', 'SIGNAL_EXIT', 'TIMEOUT']) : null,
          quantity: rand(10, 100000),
          positionSizeUsd: positionSize,
          pnlUsd: Math.random() > 0.3 ? pnl : null,
          pnlPct: Math.random() > 0.3 ? (pnl / positionSize) * 100 : null,
          holdTimeMin: rand(5, 4320),
          maxFavorableExc: rand(0, positionSize * 0.3),
          maxAdverseExc: rand(-positionSize * 0.2, 0),
          capitalAllocPct: rand(2, 15),
          allocationMethodUsed: pick(['KELLY_MODIFIED', 'EQUAL_WEIGHT', 'RISK_PARITY']),
        }
      });
    });

    await prisma.$transaction(ops);
    opsCount += ops.length;
  }
  console.log(`✅ Created ${opsCount} backtest operations`);

  // ============================================================
  // 15. CREATE PREDICTIVE SIGNALS (100+)
  // ============================================================
  console.log('🔮 Creating predictive signals...');
  const predSignals = Array.from({ length: 100 }, () => {
    const signalType = pick(PREDICTION_TYPES);
    const chain = pick(CHAINS);
    const tokenIdx = randInt(0, Math.min(500, tokenIds.length - 1));

    return prisma.predictiveSignal.create({
      data: {
        signalType,
        chain,
        tokenAddress: Math.random() > 0.5 ? tokenAddresses[tokenIdx] : null,
        sector: pick(TOKEN_TYPES),
        prediction: JSON.stringify({
          direction: pick(['BULLISH', 'BEARISH', 'NEUTRAL']),
          magnitude: rand(1, 30),
          timeframe: pick(['1h', '4h', '24h']),
        }),
        direction: pick(['BULLISH', 'BEARISH', 'NEUTRAL']),
        confidence: rand(0.3, 0.95),
        timeframe: pick(['1h', '4h', '24h', '7d']),
        validUntil: new Date(Date.now() + rand(3600000, 7 * 86400000)),
        evidence: JSON.stringify(
          Array.from({ length: randInt(2, 5) }, () => ({
            type: pick(['volume', 'wallet_activity', 'bot_behavior', 'price_action']),
            value: rand(0, 100),
          }))
        ),
        historicalHitRate: rand(0.3, 0.9),
        dataPointsUsed: randInt(100, 50000),
        wasCorrect: Math.random() > 0.5 ? Math.random() > 0.4 : null,
        actualOutcome: Math.random() > 0.5 ? JSON.stringify({ realized: rand(-30, 50) }) : null,
      }
    });
  });

  for (let i = 0; i < predSignals.length; i += 50) {
    await prisma.$transaction(predSignals.slice(i, i + 50));
  }
  console.log(`✅ Created ${predSignals.length} predictive signals`);

  // ============================================================
  // 16. CREATE TOKEN LIFECYCLE STATES (500+)
  // ============================================================
  console.log('🔄 Creating token lifecycle states...');
  const lifecycleStates = Array.from({ length: 500 }, () => {
    const tokenIdx = randInt(0, tokenIds.length - 1);
    const phase = pick(PHASES);

    return prisma.tokenLifecycleState.create({
      data: {
        tokenAddress: tokenAddresses[tokenIdx],
        chain: tokenChains[tokenIdx],
        phase,
        phaseProbability: rand(0.3, 0.95),
        phaseDistribution: JSON.stringify({
          GENESIS: rand(0, 0.3),
          INCIPIENT: rand(0, 0.3),
          GROWTH: rand(0, 0.4),
          FOMO: rand(0, 0.3),
          DECLINE: rand(0, 0.3),
          LEGACY: rand(0, 0.2),
        }),
        transitionFrom: Math.random() > 0.5 ? pick(PHASES.filter(p => p !== phase)) : null,
        transitionProb: rand(0.1, 0.6),
        signals: JSON.stringify({
          volumeTrend: pick(['increasing', 'decreasing', 'stable']),
          holderGrowth: pick(['growing', 'declining', 'stable']),
          smartMoneyActivity: pick(['entering', 'exiting', 'neutral']),
          botActivity: pick(['high', 'medium', 'low']),
        }),
        detectedAt: new Date(Date.now() - rand(0, 7 * 86400000)),
      }
    });
  });

  for (let i = 0; i < lifecycleStates.length; i += 100) {
    await prisma.$transaction(lifecycleStates.slice(i, i + 100));
  }
  console.log(`✅ Created ${lifecycleStates.length} token lifecycle states`);

  // ============================================================
  // 17. CREATE TRADER BEHAVIOR MODELS (100+)
  // ============================================================
  console.log('🧠 Creating trader behavior models...');
  const behaviorModels = ARCHETYPES.flatMap(archetype =>
    PHASES.flatMap(phase =>
      ['BUY', 'SELL', 'HOLD', 'ACCUMULATE', 'DISTRIBUTE', 'WATCH'].map(action =>
        prisma.traderBehaviorModel.create({
          data: {
            archetype,
            tokenPhase: phase,
            action,
            probability: rand(0.05, 0.8),
            intensity: rand(0, 0.5),
            duration: rand(1, 168),
            observations: randInt(10, 5000),
            confidence: rand(0.3, 0.95),
            lastUpdated: new Date(),
          }
        })
      )
    )
  );

  for (let i = 0; i < behaviorModels.length; i += 100) {
    await prisma.$transaction(behaviorModels.slice(i, i + 100));
  }
  console.log(`✅ Created ${behaviorModels.length} trader behavior models`);

  // ============================================================
  // 18. CREATE FEEDBACK METRICS (200+)
  // ============================================================
  console.log('📈 Creating feedback metrics...');
  const feedbackMetrics = Array.from({ length: 200 }, () =>
    prisma.feedbackMetrics.create({
      data: {
        sourceType: pick(['signal', 'backtest', 'live_trade']),
        sourceId: pick([...backtestIds.slice(0, 10), 'system_1', 'signal_1']),
        metricName: pick(['accuracy', 'brier_score', 'sharpe', 'win_rate', 'profit_factor', 'calibration']),
        metricValue: rand(-0.5, 1),
        context: JSON.stringify({
          phase: pick(PHASES),
          regime: pick(REGIMES),
          chain: pick(CHAINS),
        }),
        period: pick(['1h', '4h', '24h', '7d', '30d']),
        measuredAt: new Date(Date.now() - rand(0, 7 * 86400000)),
      }
    })
  );

  for (let i = 0; i < feedbackMetrics.length; i += 100) {
    await prisma.$transaction(feedbackMetrics.slice(i, i + 100));
  }
  console.log(`✅ Created ${feedbackMetrics.length} feedback metrics`);

  // ============================================================
  // 19. CREATE BRAIN CYCLE RUNS (30+)
  // ============================================================
  console.log('🧬 Creating brain cycle runs...');
  const brainCycles = Array.from({ length: 30 }, (_, i) => {
    const initialCapital = 10;
    const cyclePnlPct = rand(-5, 15);
    const capitalAfter = initialCapital * (1 + cyclePnlPct / 100);
    const tokensScanned = randInt(20, 200);

    return prisma.brainCycleRun.create({
      data: {
        cycleNumber: i + 1,
        capitalUsd: capitalAfter,
        initialCapitalUsd: initialCapital,
        chain: pick(CHAINS),
        scanLimit: randInt(20, 100),
        status: pick(['RUNNING', 'COMPLETED', 'FAILED', 'PAUSED']),
        startedAt: new Date(Date.now() - rand(3600000, 48 * 3600000)),
        completedAt: Math.random() > 0.2 ? new Date(Date.now() - rand(0, 3600000)) : null,
        tokensScanned,
        tokensOperable: Math.floor(tokensScanned * rand(0.1, 0.4)),
        tokensTradeable: Math.floor(tokensScanned * rand(0.02, 0.15)),
        topPicks: JSON.stringify(
          Array.from({ length: randInt(3, 10) }, () => ({
            symbol: pick(SOL_MEME_NAMES).toUpperCase().replace(/[^A-Z0-9]/g, ''),
            score: rand(50, 98),
            reason: pick(['smart_money_entry', 'low_bot_activity', 'v_shape', 'momentum']),
          }))
        ),
        operabilitySummary: JSON.stringify({
          premium: randInt(1, 5),
          good: randInt(3, 10),
          marginal: randInt(5, 20),
          risky: randInt(5, 15),
          unoperable: randInt(10, 50),
        }),
        capitalBeforeCycle: initialCapital,
        capitalAfterCycle: capitalAfter,
        cyclePnlUsd: capitalAfter - initialCapital,
        cyclePnlPct,
        cumulativeReturnPct: rand(-10, 100),
        phaseDistribution: JSON.stringify({
          GENESIS: randInt(0, 5),
          INCIPIENT: randInt(1, 10),
          GROWTH: randInt(5, 30),
          FOMO: randInt(2, 15),
          DECLINE: randInt(3, 20),
          LEGACY: randInt(1, 10),
        }),
        dominantRegime: pick(REGIMES),
        regimeConfidence: rand(0.4, 0.9),
        errorLog: Math.random() > 0.8 ? 'Rate limit hit on API call' : null,
        cycleDurationMs: randInt(5000, 300000),
      }
    });
  });

  await prisma.$transaction(brainCycles);
  console.log(`✅ Created ${brainCycles.length} brain cycle runs`);

  // ============================================================
  // 20. CREATE OPERABILITY SNAPSHOTS (500+)
  // ============================================================
  console.log('📊 Creating operability snapshots...');
  let snapCount = 0;

  for (let i = 0; i < Math.min(500, tokenIds.length); i += 50) {
    const batchIdxs = Array.from({ length: Math.min(50, tokenIds.length - i) }, (_, j) => i + j);
    const snapshots = batchIdxs.map(idx => {
      const price = tokenPrices[idx];
      const liquidity = rand(1000, 10000000);
      const volume = rand(1000, 50000000);
      const mcap = rand(10000, 1000000000);
      const overallScore = rand(0, 100);

      const operabilityLevel = overallScore > 80 ? 'PREMIUM' :
        overallScore > 60 ? 'GOOD' :
        overallScore > 40 ? 'MARGINAL' :
        overallScore > 20 ? 'RISKY' : 'UNOPERABLE';

      return prisma.operabilitySnapshot.create({
        data: {
          tokenAddress: tokenAddresses[idx],
          symbol: allTokenData[idx]?.symbol || 'UNKNOWN',
          chain: tokenChains[idx],
          overallScore,
          liquidityScore: rand(0, 100),
          feeScore: rand(0, 100),
          slippageScore: rand(0, 100),
          healthScore: rand(0, 100),
          marginScore: rand(0, 100),
          totalCostUsd: rand(0.1, 50),
          totalCostPct: rand(0.1, 10),
          slippagePct: rand(0.01, 5),
          recommendedPositionUsd: rand(10, 10000),
          operabilityLevel,
          isOperable: overallScore > 40,
          minimumGainPct: rand(1, 20),
          priceUsd: price,
          liquidityUsd: liquidity,
          volume24h: volume,
          marketCap: mcap,
          warnings: JSON.stringify(
            Array.from({ length: randInt(0, 3) }, () =>
              pick(['High slippage risk', 'Low liquidity', 'Bot-dominated', 'Wash trading detected', 'Fee impact high'])
            )
          ),
        }
      });
    });

    await prisma.$transaction(snapshots);
    snapCount += snapshots.length;
  }
  console.log(`✅ Created ${snapCount} operability snapshots`);

  // ============================================================
  // 21. CREATE COMPOUND GROWTH TRACKER (100+)
  // ============================================================
  console.log('📈 Creating compound growth tracker...');
  const growthEntries = Array.from({ length: 100 }, (_, i) => {
    const periodPnlPct = rand(-5, 10);
    const capitalUsd = 10 * (1 + rand(-0.1, 0.5));

    return prisma.compoundGrowthTracker.create({
      data: {
        capitalUsd,
        initialCapitalUsd: 10,
        totalReturnPct: ((capitalUsd - 10) / 10) * 100,
        totalPnlUsd: capitalUsd - 10,
        periodPnlUsd: rand(-1, 3),
        periodReturnPct: periodPnlPct,
        periodTrades: randInt(1, 20),
        periodWins: randInt(0, 15),
        periodLosses: randInt(0, 10),
        totalFeesPaidUsd: rand(0.1, 5),
        totalSlippageUsd: rand(0.05, 2),
        feeAdjustedPnlUsd: capitalUsd - 10 - rand(0.1, 3),
        feeAdjustedReturnPct: periodPnlPct * rand(0.8, 0.98),
        maxDrawdownPct: rand(-20, -1),
        sharpeRatio: rand(-0.5, 3),
        winRate: rand(0.3, 0.8),
        dailyCompoundRate: rand(-0.01, 0.05),
        projectedAnnualReturn: rand(-50, 500),
        period: pick(['1h', '4h', '24h', '7d']),
        measuredAt: new Date(Date.now() - (100 - i) * 3600000),
      }
    });
  });

  await prisma.$transaction(growthEntries);
  console.log(`✅ Created ${growthEntries.length} compound growth entries`);

  // ============================================================
  // 22. CREATE EXTRACTION JOBS (10+)
  // ============================================================
  console.log('⛏️ Creating extraction jobs...');
  const extractionJobs = [
    { type: 'COINGECKO', recordsProcessed: 5250, tokensDiscovered: 5250 },
    { type: 'DEXSCREENER_SOL', recordsProcessed: 2100, tokensDiscovered: 2100, candlesStored: 25000 },
    { type: 'DEXSCREENER_ETH', recordsProcessed: 1600, tokensDiscovered: 1600, candlesStored: 18000 },
    { type: 'DEXSCREENER_BASE', recordsProcessed: 750, tokensDiscovered: 750, candlesStored: 5000 },
    { type: 'DEXPAPRIKA', recordsProcessed: 5000, tokensDiscovered: 5000 },
    { type: 'SQD_WALLET_PROFILING', recordsProcessed: 550, walletsProfiled: 550 },
    { type: 'ONCHAIN_TRANSACTION_SCAN', recordsProcessed: 20000, transactionsStored: 20000 },
    { type: 'SMART_MONEY_TRACKER', recordsProcessed: 80, signalsGenerated: 200 },
    { type: 'BOT_DETECTION_SCAN', recordsProcessed: 300, signalsGenerated: 150 },
    { type: 'CANDLE_BACKFILL', recordsProcessed: 50000, candlesStored: 50000 },
    { type: 'PROTOCOL_DATA_EXTRACT', recordsProcessed: 50, protocolsStored: 50 },
    { type: 'LIFECYCLE_ANALYSIS', recordsProcessed: 500, signalsGenerated: 50 },
  ];

  await prisma.$transaction(
    extractionJobs.map(job => prisma.extractionJob.create({
      data: {
        type: job.type,
        jobType: pick(['FULL', 'INCREMENTAL', 'BACKFILL']),
        status: pick(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']),
        chain: pick(CHAINS),
        startedAt: new Date(Date.now() - rand(3600000, 48 * 3600000)),
        completedAt: Math.random() > 0.2 ? new Date(Date.now() - rand(0, 3600000)) : null,
        error: Math.random() > 0.85 ? 'Rate limit exceeded' : null,
        recordsProcessed: job.recordsProcessed,
        tokensDiscovered: job.tokensDiscovered || 0,
        candlesStored: job.candlesStored || 0,
        walletsProfiled: job.walletsProfiled || 0,
        transactionsStored: job.transactionsStored || 0,
        signalsGenerated: job.signalsGenerated || 0,
        protocolsStored: job.protocolsStored || 0,
        sourcesUsed: JSON.stringify([job.type]),
        durationMs: randInt(1000, 300000),
        errors: JSON.stringify(Math.random() > 0.7 ? ['Timeout on page 5'] : []),
        config: JSON.stringify({ chain: pick(CHAINS), limit: 1000 }),
        metadata: JSON.stringify({ version: '1.0' }),
      }
    }))
  );
  console.log(`✅ Created ${extractionJobs.length} extraction jobs`);

  // ============================================================
  // 23. CREATE DATA RETENTION POLICIES
  // ============================================================
  console.log('🗄️ Creating data retention policies...');
  const retentionPolicies = [
    { dataType: 'SIGNALS', tableName: 'Signal', retentionDays: 30 },
    { dataType: 'CANDLES_1M', tableName: 'PriceCandle', retentionDays: 7 },
    { dataType: 'CANDLES_1H', tableName: 'PriceCandle', retentionDays: 90 },
    { dataType: 'CANDLES_1D', tableName: 'PriceCandle', retentionDays: 365 },
    { dataType: 'TRANSACTIONS', tableName: 'TraderTransaction', retentionDays: 90 },
    { dataType: 'WALLET_HOLDINGS', tableName: 'WalletTokenHolding', retentionDays: 30 },
    { dataType: 'OPERABILITY_SNAPSHOTS', tableName: 'OperabilitySnapshot', retentionDays: 30 },
    { dataType: 'PREDICTIVE_SIGNALS', tableName: 'PredictiveSignal', retentionDays: 7 },
    { dataType: 'FEEDBACK_METRICS', tableName: 'FeedbackMetrics', retentionDays: 90 },
    { dataType: 'DECISION_LOGS', tableName: 'DecisionLog', retentionDays: 180 },
  ];

  await prisma.$transaction(
    retentionPolicies.map(p => prisma.dataRetentionPolicy.create({
      data: {
        dataType: p.dataType,
        tableName: p.tableName,
        retentionDays: p.retentionDays,
        hotDays: Math.floor(p.retentionDays * 0.3),
        warmDays: Math.floor(p.retentionDays * 0.6),
        coldDays: p.retentionDays,
        archiveMethod: pick(['DELETE', 'AGGREGATE', 'COMPRESS']),
        compressionEnabled: true,
        aggregationInterval: p.retentionDays > 30 ? '1h' : null,
        isActive: true,
        lastCleanupAt: new Date(Date.now() - rand(0, 86400000)),
        lastArchiveStats: JSON.stringify({ rowsArchived: randInt(100, 10000), sizeSavedMB: rand(1, 50) }),
      }
    }))
  );
  console.log(`✅ Created ${retentionPolicies.length} data retention policies`);

  // ============================================================
  // 24. CREATE API RATE LIMITS
  // ============================================================
  console.log('⏱️ Creating API rate limits...');
  const rateLimits = [
    { service: 'COINGECKO', maxRequests: 30, windowMs: 60000 },
    { service: 'DEXSCREENER', maxRequests: 300, windowMs: 60000 },
    { service: 'DEXPAPRIKA', maxRequests: 100, windowMs: 60000 },
    { service: 'BIRDEYE', maxRequests: 100, windowMs: 60000 },
    { service: 'SQD', maxRequests: 50, windowMs: 60000 },
    { service: 'HELLOMOON', maxRequests: 30, windowMs: 60000 },
    { service: 'SOLSCAN', maxRequests: 50, windowMs: 60000 },
    { service: 'ETHERSCAN', maxRequests: 5, windowMs: 1000 },
  ];

  await prisma.$transaction(
    rateLimits.map(r => prisma.apiRateLimit.create({
      data: {
        service: r.service,
        maxRequests: r.maxRequests,
        windowMs: r.windowMs,
        currentCount: randInt(0, r.maxRequests * 0.8),
        windowStart: new Date(),
      }
    }))
  );
  console.log(`✅ Created ${rateLimits.length} API rate limits`);

  // ============================================================
  // 25. CREATE DECISION LOGS (50+)
  // ============================================================
  console.log('📝 Creating decision logs...');
  const decisionLogs = Array.from({ length: 50 }, () => {
    const tokenIdx = randInt(0, Math.min(500, tokenIds.length - 1));

    return prisma.decisionLog.create({
      data: {
        systemId: Math.random() > 0.5 ? pick(systemIds) : null,
        tokenAddress: Math.random() > 0.3 ? tokenAddresses[tokenIdx] : null,
        chain: pick(CHAINS),
        tokenSymbol: allTokenData[tokenIdx]?.symbol || null,
        decisionType: pick(['SYSTEM_MATCH', 'MANUAL', 'AUTO']),
        decision: pick(['BUY', 'SELL', 'HOLD', 'WAIT']),
        recommendedSystem: Math.random() > 0.5 ? pick(tradingSystems).name : null,
        confidence: rand(0.3, 0.95),
        dataQualityScore: rand(0.3, 0.9),
        reasoning: JSON.stringify({
          signals: randInt(1, 5),
          smartMoneyCount: randInt(0, 5),
          botActivityLevel: pick(['LOW', 'MEDIUM', 'HIGH']),
          phaseDetected: pick(PHASES),
          regime: pick(REGIMES),
        }),
        outcome: Math.random() > 0.4 ? pick(['PROFIT', 'LOSS', 'NEUTRAL']) : null,
        pnlPct: Math.random() > 0.4 ? rand(-30, 50) : null,
        tokenPhaseAtDecision: pick(PHASES),
        regimeAtDecision: pick(REGIMES),
        operabilityAtDecision: rand(10, 95),
        wasActedUpon: Math.random() > 0.5,
        realizedPnlPct: Math.random() > 0.6 ? rand(-20, 40) : null,
        decisionWasCorrect: Math.random() > 0.5 ? Math.random() > 0.4 : null,
        realizedPnlUsd: Math.random() > 0.6 ? rand(-100, 500) : null,
        smartMoneySignal: Math.random() > 0.5 ? pick(['accumulation', 'distribution', 'neutral']) : null,
      }
    });
  });

  for (let i = 0; i < decisionLogs.length; i += 50) {
    await prisma.$transaction(decisionLogs.slice(i, i + 50));
  }
  console.log(`✅ Created ${decisionLogs.length} decision logs`);

  // ============================================================
  // 26. CREATE PROTOCOL DATA (20+)
  // ============================================================
  console.log('🌐 Creating protocol data...');
  const protocols = [
    { protocol: 'Raydium', chain: 'SOL' },
    { protocol: 'Orca', chain: 'SOL' },
    { protocol: 'Jupiter', chain: 'SOL' },
    { protocol: 'Meteora', chain: 'SOL' },
    { protocol: 'Drift', chain: 'SOL' },
    { protocol: 'Kamino', chain: 'SOL' },
    { protocol: 'MarginFi', chain: 'SOL' },
    { protocol: 'Sanctum', chain: 'SOL' },
    { protocol: 'Uniswap V3', chain: 'ETH' },
    { protocol: 'Aave V3', chain: 'ETH' },
    { protocol: 'Curve', chain: 'ETH' },
    { protocol: 'Lido', chain: 'ETH' },
    { protocol: 'GMX', chain: 'ARB' },
    { protocol: 'Camelot', chain: 'ARB' },
    { protocol: 'Pendle', chain: 'ARB' },
    { protocol: 'Aerodrome', chain: 'BASE' },
    { protocol: 'Velodrome', chain: 'OP' },
    { protocol: 'Synthetix', chain: 'OP' },
    { protocol: 'Balancer', chain: 'ETH' },
    { protocol: 'SushiSwap', chain: 'ETH' },
  ];

  await prisma.$transaction(
    protocols.map(p => prisma.protocolData.create({
      data: {
        protocol: p.protocol,
        chain: p.chain,
        slug: p.protocol.toLowerCase().replace(/\s+/g, '-'),
        slug_chain: `${p.protocol.toLowerCase().replace(/\s+/g, '-')}-${p.chain.toLowerCase()}`,
        tvl: rand(1000000, 10000000000),
        tvlUsd: rand(1000000, 10000000000),
        volume24h: rand(100000, 500000000),
        fees24h: rand(1000, 5000000),
        metadata: JSON.stringify({
          category: pick(['DEX', 'LENDING', 'DERIVATIVES', 'YIELD', 'BRIDGE', 'LIQUIDITY']),
          chains: [p.chain],
          auditStatus: pick(['audited', 'unaudited', 'partially-audited']),
        }),
      }
    }))
  );
  console.log(`✅ Created ${protocols.length} protocol data records`);

  // ============================================================
  // 27. CREATE SYSTEM EVOLUTION RECORDS (10+)
  // ============================================================
  console.log('🧬 Creating system evolution records...');
  if (systemIds.length >= 3) {
    const evolutions = Array.from({ length: 10 }, (_, i) => {
      const parentIdx = randInt(0, systemIds.length - 1);
      let childIdx = randInt(0, systemIds.length - 1);
      if (childIdx === parentIdx) childIdx = (childIdx + 1) % systemIds.length;

      return prisma.systemEvolution.create({
        data: {
          parentSystemId: systemIds[parentIdx],
          childSystemId: systemIds[childIdx],
          evolutionType: pick(['parameter_adjust', 'phase_specialize', 'hybrid_generate']),
          triggerMetric: pick(['sharpe_ratio', 'win_rate', 'max_drawdown', 'profit_factor']),
          triggerValue: rand(-1, 3),
          improvementPct: rand(-10, 30),
          backtestId: Math.random() > 0.5 ? pick(backtestIds) : null,
          approvedAt: Math.random() > 0.5 ? new Date() : null,
        }
      });
    });

    await prisma.$transaction(evolutions);
    console.log(`✅ Created ${evolutions.length} system evolution records`);
  }

  // ============================================================
  // 28. CREATE COMPARATIVE ANALYSIS (10+)
  // ============================================================
  console.log('🔬 Creating comparative analysis records...');
  if (systemIds.length >= 4) {
    const comparisons = Array.from({ length: 10 }, () => {
      const aIdx = randInt(0, systemIds.length - 1);
      let bIdx = randInt(0, systemIds.length - 1);
      if (bIdx === aIdx) bIdx = (bIdx + 1) % systemIds.length;

      return prisma.comparativeAnalysis.create({
        data: {
          modelA: tradingSystems[aIdx].name,
          modelB: tradingSystems[bIdx].name,
          dimension: pick(['model_vs_model', 'phase_vs_phase', 'period_vs_period']),
          context: JSON.stringify({
            phase: pick(PHASES),
            regime: pick(REGIMES),
            timeframe: pick(['1h', '4h', '24h']),
          }),
          metricsA: JSON.stringify({ accuracy: rand(0.5, 0.9), sharpe: rand(0.5, 3), brier: rand(0.1, 0.4) }),
          metricsB: JSON.stringify({ accuracy: rand(0.5, 0.9), sharpe: rand(0.5, 3), brier: rand(0.1, 0.4) }),
          winner: pick(['A', 'B', 'tie']),
          confidenceDiff: rand(0, 0.3),
        }
      });
    });

    await prisma.$transaction(comparisons);
    console.log(`✅ Created ${comparisons.length} comparative analysis records`);
  }

  // ============================================================
  // 29. CREATE USER EVENTS (50+)
  // ============================================================
  console.log('👤 Creating user events...');
  const userEvents = Array.from({ length: 50 }, () => {
    const tokenIdx = randInt(0, Math.min(200, tokenIds.length - 1));

    return prisma.userEvent.create({
      data: {
        eventType: pick(['OPEN_POSITION', 'CLOSE_POSITION', 'SET_ALERT', 'VIEW_TOKEN', 'ADD_WATCHLIST']),
        tokenId: Math.random() > 0.3 ? tokenIds[tokenIdx] : null,
        walletAddress: Math.random() > 0.5 ? genSolAddress() : null,
        entryPrice: Math.random() > 0.5 ? tokenPrices[tokenIdx] : null,
        stopLoss: Math.random() > 0.5 ? tokenPrices[tokenIdx] * 0.9 : null,
        takeProfit: Math.random() > 0.5 ? tokenPrices[tokenIdx] * 1.3 : null,
        pnl: Math.random() > 0.5 ? rand(-100, 500) : null,
      }
    });
  });

  await prisma.$transaction(userEvents);
  console.log(`✅ Created ${userEvents.length} user events`);

  // ============================================================
  // FINAL SUMMARY
  // ============================================================
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  const finalCounts = {
    tokens: await prisma.token.count(),
    tokenDNA: await prisma.tokenDNA.count(),
    traders: await prisma.trader.count(),
    behaviorPatterns: await prisma.traderBehaviorPattern.count(),
    labelAssignments: await prisma.traderLabelAssignment.count(),
    walletHoldings: await prisma.walletTokenHolding.count(),
    transactions: await prisma.traderTransaction.count(),
    priceCandles: await prisma.priceCandle.count(),
    signals: await prisma.signal.count(),
    patternRules: await prisma.patternRule.count(),
    crossChainLinks: await prisma.crossChainWallet.count(),
    tradingSystems: await prisma.tradingSystem.count(),
    backtestRuns: await prisma.backtestRun.count(),
    backtestOps: await prisma.backtestOperation.count(),
    predictiveSignals: await prisma.predictiveSignal.count(),
    lifecycleStates: await prisma.tokenLifecycleState.count(),
    behaviorModels: await prisma.traderBehaviorModel.count(),
    feedbackMetrics: await prisma.feedbackMetrics.count(),
    brainCycles: await prisma.brainCycleRun.count(),
    operabilitySnapshots: await prisma.operabilitySnapshot.count(),
    compoundGrowth: await prisma.compoundGrowthTracker.count(),
    extractionJobs: await prisma.extractionJob.count(),
    retentionPolicies: await prisma.dataRetentionPolicy.count(),
    apiRateLimits: await prisma.apiRateLimit.count(),
    decisionLogs: await prisma.decisionLog.count(),
    protocolData: await prisma.protocolData.count(),
    systemEvolutions: await prisma.systemEvolution.count(),
    comparativeAnalysis: await prisma.comparativeAnalysis.count(),
    userEvents: await prisma.userEvent.count(),
  };

  console.log('\n🏆 ================================================');
  console.log('🏆 CRYPTOQUANT TERMINAL - MASSIVE SEED COMPLETE');
  console.log('🏆 ================================================');
  console.log(`⏱️  Elapsed: ${elapsed}s`);
  console.log('\n📊 FINAL DATABASE COUNTS:');
  Object.entries(finalCounts).forEach(([key, value]) => {
    console.log(`  ${key}: ${value.toLocaleString()}`);
  });

  const totalRecords = Object.values(finalCounts).reduce((a, b) => a + b, 0);
  console.log(`\n🎯 TOTAL RECORDS: ${totalRecords.toLocaleString()}`);

  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
