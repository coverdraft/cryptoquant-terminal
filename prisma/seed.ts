import { PrismaClient, Token, Trader } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// REALISTIC MULTI-CHAIN TRADER DATA
// ============================================================

// Solana wallet addresses (realistic format)
const SOL_WALLETS = [
  { address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', name: 'Galaxy Whale', chain: 'SOL' },
  { address: 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy', name: 'SOL Sniper Alpha', chain: 'SOL' },
  { address: '9WzDX4Bi8cP8kqXnj1GKmD1RZZJ8rGmBqg9QJ2v5mkR7', name: 'Jito MEV Bot #1', chain: 'SOL' },
  { address: '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbjShVrDR', name: 'Raydium LP Whale', chain: 'SOL' },
  { address: 'BtZ7ufVSRsL2LT6rG3YgDN1mQfvNXSt3yExgZ6mKyE8j', name: 'Meme Degen King', chain: 'SOL' },
  { address: '2ZHJwiYmEjv3ZXKC6B6sq5sSXxG6sAJ4wEcF8m3vj8sK', name: 'Sandwich Bot Sol', chain: 'SOL' },
  { address: 'CwiHrdQcv3Y2DKBQjz5hGv2z9MNB2sB6L8j6rNxKrXhN', name: 'Copy Trader Pro', chain: 'SOL' },
  { address: 'HuG3zY6u2df7nYt4tqNvY8jBkL9E6dRxWmZ3qV7aXcDs', name: 'Retail Trader SOL', chain: 'SOL' },
  { address: '3ND1ngD3VJdQqXrG9s8mFxTp5jUqN7vK4R2wB6yC8pLq', name: 'Jupiter Aggregator Bot', chain: 'SOL' },
  { address: 'FcWsdZHoS3GKQbpM5mS6k4YGIkFY3SJ2Fz8vGPvEsKCM', name: 'Pump.fun Sniper', chain: 'SOL' },
  { address: '4k3DjzHnzuEiQqN8d7JrW3s2Vx9bM5cY6pL1kR8fT2gA', name: 'DeFi Yield Farmer', chain: 'SOL' },
  { address: 'B1g5d2K8qM7vJ4pR3sN6wE9xF2cY8bL5hT1kA7mD3gV', name: 'Wash Trading Bot #1', chain: 'SOL' },
  { address: '7mK3pL9vJ2wR5nB8qF1sD4xE7yC3bH6tG0kM9aN5jW', name: 'Smart Accumulator', chain: 'SOL' },
  { address: 'Hk8dF2jL5mN9pQ3rS6vW8yB4xC1zE7tA0gK3fJ6iR', name: 'JIT LP Bot', chain: 'SOL' },
  { address: '9qN7pK3mJ6wR2vB5xF8sD1yE4zC7bH0tG3kA6fL9i', name: 'Airdrop Hunter Bot', chain: 'SOL' },
  { address: '2wE5vK8nJ3qR7pB1xF4sD6yC9zH2bL5tG8kM3fN0i', name: 'Flash Loan Arbitrageur', chain: 'SOL' },
  { address: 'D5rK8mN2qJ6wB3vF9sP1yE4zH7cL0tG3kA6fI9bW', name: 'Meteora DLMM Bot', chain: 'SOL' },
  { address: '8pS2qL5nJ3wR6vB9xF1sD4yE7zC0bH3tG6kA9fK2i', name: 'Orca CLMM Optimizer', chain: 'SOL' },
  { address: '3kF6qN9mJ2wR5vB8xF1sD4yE7zC0bH3tG6kA9fL2i', name: 'Meme Rotation Bot', chain: 'SOL' },
  { address: 'G7nJ3qL6mR9wB2vF5sP8yE1zH4cK7tG0kA3fN6iW', name: 'Institutional SOL Fund', chain: 'SOL' },
  { address: '5qL8nK3mJ6wR2vB5xF9sD1yE4zC7bH0tG3kA6fN9i', name: 'BONK Diamond Hands', chain: 'SOL' },
  { address: 'C4pK7mN2qJ5wR8vB1xF4sD6yE9zH2bL5tG8kA3fI0', name: 'Kamino Leverage Trader', chain: 'SOL' },
  { address: 'F2nJ5qL8mR3wB6vK9sP1yE4zH7cL0tG3kA6fN9iW', name: 'Tensor NFT Flipper', chain: 'SOL' },
  { address: '1wR4vK7nJ2qB5xF8sD1yE4zC7bH0tG3kA6fN9iL', name: 'Drift Perp Trader', chain: 'SOL' },
  { address: 'A6qL9mN3qJ5wR8vB2xF4sD7yE1zH4cK0tG3kA6fN9', name: 'Bridge Arbitrage Bot', chain: 'SOL' },
];

// Ethereum wallet addresses (realistic format)
const ETH_WALLETS = [
  { address: '0x28C6c06298d514Db089934071355E5743bf21d60', name: 'Binance Hot Wallet', chain: 'ETH' },
  { address: '0x56Eddb7aa87536c09CCc2793473599fD21A8b17F', name: 'Uniswap V3 Whale', chain: 'ETH' },
  { address: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', name: 'Uniswap Universal Router', chain: 'ETH' },
  { address: '0x6b75d8AF2505971E510c4D9C9c9c9c9c9c9c9c9c', name: 'MEV Builder Flashbots', chain: 'ETH' },
  { address: '0xA69babEF1cA67A37Ffaf7a485DfffFF8057F6D62', name: 'PEPE Sniper Bot', chain: 'ETH' },
  { address: '0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5', name: 'Ethereum Foundation', chain: 'ETH' },
  { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18', name: 'Institutional DeFi Fund', chain: 'ETH' },
  { address: '0x8EB8a3b98659Cece2F5D7C2D2e2e2e2e2e2e2e2e', name: 'Sandwich Bot ETH #1', chain: 'ETH' },
  { address: '0x3DdfA8eC3052539376Fb86085A0cB0A6a3F8c9f1', name: 'Arbitrage Scanner ETH', chain: 'ETH' },
  { address: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed', name: 'Wash Trading Bot ETH', chain: 'ETH' },
  { address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', name: 'Vitalik.eth (Label)', chain: 'ETH' },
  { address: '0x2FA5e7669b307c81558A1d3F1F0e9c6c9c9c9c9c', name: '1inch Aggregator Bot', chain: 'ETH' },
  { address: '0xDef1C0ded9bec7F1a1670819833240f027b25EfF', name: '0x Protocol Router', chain: 'ETH' },
  { address: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', name: 'Uniswap Auto Router V3', chain: 'ETH' },
  { address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', name: 'Uniswap V2 Router', chain: 'ETH' },
  { address: '0xEf1c6E67703c7BD7107eed8303Fbe6EC2554BF6B', name: 'Balancer Vault Bot', chain: 'ETH' },
  { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', name: 'WETH Wrapper Bot', chain: 'ETH' },
  { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', name: 'Smart Money ETH Alpha', chain: 'ETH' },
  { address: '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8', name: 'Binance Cold Wallet', chain: 'ETH' },
  { address: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503', name: 'Curve Gauge Whale', chain: 'ETH' },
];

// Base / ARB wallets
const L2_WALLETS = [
  { address: '0x0904DAc3347EA6a554F9450B2B8e7b7a7a7a7a7a', name: 'Base Meme Sniper', chain: 'BASE' },
  { address: '0x1a4e4c1D46a1B6386D0e8B3c9d2E5f8A1b4C7d0E', name: 'ARB Perp Trader', chain: 'ARB' },
  { address: '0x2b5f5d2E57b2C7495E1c8D4a6B9f0C3E6d1A4b7F', name: 'Base Bridge Bot', chain: 'BASE' },
  { address: '0x3c6g6e3F68c3D8506F2e5B4c7A0d1E4f7A2b5C8D', name: 'OP Degen Ape', chain: 'OP' },
  { address: '0x4d7h7f4G79d4E9617G3f6C5d8B1e2F5a8C3b6D9E', name: 'GMX Perp Whale ARB', chain: 'ARB' },
];

// Bot type classification templates
const BOT_TEMPLATES = [
  { name: 'MEV Extractor', botType: 'MEV_EXTRACTOR', label: 'BOT_MEV', isBot: true,
    metrics: { winRate: 0.92, avgHoldTimeMin: 0.5, avgSlippageBps: 2, frontrunCount: 150, mevExtractionUsd: 45000, consistencyScore: 0.95, isActive247: true }},
  { name: 'Sniper Bot', botType: 'SNIPER_BOT', label: 'BOT_SNIPER', isBot: true,
    metrics: { winRate: 0.55, avgHoldTimeMin: 15, avgSlippageBps: 200, frontrunCount: 20, block0EntryCount: 45, consistencyScore: 0.85, isActive247: true }},
  { name: 'Sandwich Bot', botType: 'SANDWICH_BOT', label: 'BOT_MEV', isBot: true,
    metrics: { winRate: 0.88, avgHoldTimeMin: 0.3, avgSlippageBps: 5, sandwichCount: 200, mevExtractionUsd: 25000, consistencyScore: 0.92, isActive247: true }},
  { name: 'Copy Trading Bot', botType: 'COPY_BOT', label: 'BOT_COPY', isBot: true,
    metrics: { winRate: 0.52, avgHoldTimeMin: 120, copyTradeScore: 0.85, consistencyScore: 0.75, isActive247: false }},
  { name: 'Arbitrage Bot', botType: 'ARBITRAGE_BOT', label: 'BOT_ARBITRAGE', isBot: true,
    metrics: { winRate: 0.95, avgHoldTimeMin: 0.1, avgSlippageBps: 1, multiHopCount: 500, consistencyScore: 0.98, isActive247: true }},
  { name: 'Wash Trading Bot', botType: 'WASH_TRADING_BOT', label: 'BOT_WASH', isBot: true,
    metrics: { winRate: 0.50, avgHoldTimeMin: 5, washTradeScore: 0.85, selfTradeCount: 50, consistencyScore: 0.80, isActive247: true }},
  { name: 'JIT LP Bot', botType: 'JIT_LP_BOT', label: 'BOT_MAKER', isBot: true,
    metrics: { winRate: 0.90, avgHoldTimeMin: 2, justInTimeCount: 80, mevExtractionUsd: 15000, consistencyScore: 0.88, isActive247: true }},
  { name: 'Jito Tip Bot', botType: 'FRONT_RUN_BOT', label: 'BOT_MEV', isBot: true,
    metrics: { winRate: 0.87, avgHoldTimeMin: 0.2, priorityFeeUsd: 5000, frontrunCount: 80, consistencyScore: 0.93, isActive247: true }},
];

// Smart money templates
const SMART_MONEY_TEMPLATES = [
  { name: 'Institutional DeFi Fund', label: 'SMART_MONEY', isBot: false,
    metrics: { winRate: 0.72, avgHoldTimeMin: 4320, avgTradeSizeUsd: 250000, sharpeRatio: 2.1, profitFactor: 2.5, avgEntryRank: 15, earlyEntryCount: 30, avgExitMultiplier: 4.2 }},
  { name: 'Alpha Wallet', label: 'SMART_MONEY', isBot: false,
    metrics: { winRate: 0.68, avgHoldTimeMin: 1440, avgTradeSizeUsd: 50000, sharpeRatio: 1.8, profitFactor: 2.0, avgEntryRank: 25, earlyEntryCount: 22, avgExitMultiplier: 3.5 }},
  { name: 'Smart Accumulator', label: 'SMART_MONEY', isBot: false,
    metrics: { winRate: 0.65, avgHoldTimeMin: 7200, avgTradeSizeUsd: 100000, sharpeRatio: 1.5, profitFactor: 1.8, avgEntryRank: 100, earlyEntryCount: 8, avgExitMultiplier: 2.8 }},
  { name: 'Institutional SOL Fund', label: 'FUND', isBot: false,
    metrics: { winRate: 0.70, avgHoldTimeMin: 10080, avgTradeSizeUsd: 500000, sharpeRatio: 1.9, profitFactor: 2.2, avgEntryRank: 200, earlyEntryCount: 5, avgExitMultiplier: 3.0 }},
];

// Whale templates
const WHALE_TEMPLATES = [
  { name: 'Galaxy Whale', label: 'WHALE', isBot: false,
    metrics: { winRate: 0.58, avgHoldTimeMin: 2880, avgTradeSizeUsd: 1000000, totalHoldingsUsd: 25000000, whaleScore: 95 }},
  { name: 'Raydium LP Whale', label: 'WHALE', isBot: false,
    metrics: { winRate: 0.55, avgHoldTimeMin: 1440, avgTradeSizeUsd: 500000, totalHoldingsUsd: 12000000, whaleScore: 85 }},
  { name: 'Binance Cold Wallet', label: 'WHALE', isBot: false,
    metrics: { winRate: 0, avgHoldTimeMin: 0, avgTradeSizeUsd: 5000000, totalHoldingsUsd: 500000000, whaleScore: 100 }},
  { name: 'Uniswap V3 Whale', label: 'WHALE', isBot: false,
    metrics: { winRate: 0.62, avgHoldTimeMin: 4320, avgTradeSizeUsd: 750000, totalHoldingsUsd: 18000000, whaleScore: 90 }},
];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function generateHourPattern(isBot: boolean, isSmartMoney: boolean): number[] {
  const pattern: number[] = [];
  for (let h = 0; h < 24; h++) {
    if (isBot) {
      pattern.push(randomBetween(3, 8)); // Uniform for bots
    } else if (isSmartMoney) {
      // Smart money trades during market hours (UTC 13-21 = US market)
      const base = (h >= 13 && h <= 21) ? randomBetween(4, 10) : randomBetween(0, 3);
      pattern.push(base);
    } else {
      // Retail trades more randomly but with some pattern
      const base = (h >= 8 && h <= 23) ? randomBetween(2, 6) : randomBetween(0, 2);
      pattern.push(base);
    }
  }
  return pattern;
}

function generateDayPattern(): number[] {
  return Array.from({ length: 7 }, () => Math.floor(randomBetween(5, 25)));
}

async function seed() {
  console.log('🌱 Seeding database with comprehensive trader data...');

  // Clean existing data
  await prisma.backtestOperation.deleteMany();
  await prisma.backtestRun.deleteMany();
  await prisma.tradingSystem.deleteMany();
  await prisma.predictiveSignal.deleteMany();
  await prisma.traderLabelAssignment.deleteMany();
  await prisma.crossChainWallet.deleteMany();
  await prisma.traderBehaviorPattern.deleteMany();
  await prisma.walletTokenHolding.deleteMany();
  await prisma.traderTransaction.deleteMany();
  await prisma.trader.deleteMany();
  await prisma.userEvent.deleteMany();
  await prisma.signal.deleteMany();
  await prisma.tokenDNA.deleteMany();
  await prisma.patternRule.deleteMany();
  await prisma.token.deleteMany();

  // ============================================================
  // 1. CREATE TOKENS
  // ============================================================
  const SOL_TOKENS = [
    { symbol: 'BONK', name: 'Bonk', price: 0.00002847 },
    { symbol: 'WIF', name: 'dogwifhat', price: 2.34 },
    { symbol: 'JUP', name: 'Jupiter', price: 1.12 },
    { symbol: 'ORCA', name: 'Orca', price: 3.87 },
    { symbol: 'RAY', name: 'Raydium', price: 2.45 },
    { symbol: 'JTO', name: 'Jito', price: 3.21 },
    { symbol: 'POPCAT', name: 'Popcat', price: 1.45 },
    { symbol: 'BOME', name: 'Book of Meme', price: 0.0112 },
    { symbol: 'SLERF', name: 'Slerf', price: 0.234 },
    { symbol: 'PUMP', name: 'Pump.fun', price: 0.00567 },
    { symbol: 'TENSOR', name: 'Tensor', price: 0.712 },
    { symbol: 'KAMINO', name: 'Kamino', price: 0.156 },
    { symbol: 'DRIFT', name: 'Drift Protocol', price: 0.89 },
    { symbol: 'PYTH', name: 'Pyth Network', price: 0.387 },
    { symbol: 'MEW', name: 'Cat in a Dogs World', price: 0.00892 },
    { symbol: 'TURBO', name: 'Turbo', price: 0.00891 },
  ];

  const ETH_TOKENS = [
    { symbol: 'PEPE', name: 'Pepe', price: 0.00001234 },
    { symbol: 'SHIB', name: 'Shiba Inu', price: 0.00002567 },
    { symbol: 'FLOKI', name: 'Floki Inu', price: 0.000234 },
    { symbol: 'UNI', name: 'Uniswap', price: 7.89 },
    { symbol: 'AAVE', name: 'Aave', price: 89.12 },
    { symbol: 'LINK', name: 'Chainlink', price: 14.56 },
    { symbol: 'MKR', name: 'Maker', price: 2890.45 },
    { symbol: 'GMX', name: 'GMX', price: 34.56 },
    { symbol: 'PENDLE', name: 'Pendle', price: 5.67 },
    { symbol: 'CRV', name: 'Curve DAO', price: 0.56 },
    { symbol: 'BLUR', name: 'Blur', price: 0.34 },
    { symbol: 'ARB', name: 'Arbitrum', price: 1.12 },
    { symbol: 'ENS', name: 'Ethereum Name Service', price: 12.56 },
    { symbol: 'LDO', name: 'Lido DAO', price: 2.34 },
    { symbol: 'COMP', name: 'Compound', price: 56.78 },
    { symbol: 'SNX', name: 'Synthetix', price: 3.45 },
  ];

  const tokens: Token[] = [];
  const allTokenData = [
    ...SOL_TOKENS.map(t => ({ ...t, chain: 'SOL' })),
    ...ETH_TOKENS.map(t => ({ ...t, chain: 'ETH' })),
  ];

  for (const t of allTokenData) {
    const token = await prisma.token.create({
      data: {
        symbol: t.symbol,
        name: t.name,
        address: t.chain === 'SOL'
          ? `${t.symbol.toLowerCase()}${Math.random().toString(36).substring(2, 15)}SolAddress`
          : `0x${Math.random().toString(16).substring(2, 42)}`,
        chain: t.chain,
        priceUsd: t.price,
        volume24h: randomBetween(50000, 50000000),
        liquidity: randomBetween(10000, 10000000),
        marketCap: randomBetween(100000, 1000000000),
        priceChange5m: randomBetween(-8, 8),
        priceChange15m: randomBetween(-15, 15),
        priceChange1h: randomBetween(-20, 20),
        priceChange24h: randomBetween(-40, 40),
        dex: t.chain === 'SOL' ? 'raydium' : 'uniswap',
        holderCount: Math.floor(randomBetween(100, 50000)),
        uniqueWallets24h: Math.floor(randomBetween(50, 5000)),
        botActivityPct: randomBetween(5, 45),
        smartMoneyPct: randomBetween(2, 25),
      }
    });
    tokens.push(token);

    // Create enriched DNA
    const botActivityPct = randomBetween(5, 45);
    const smartMoneyPct = randomBetween(2, 25);
    const retailPct = randomBetween(20, 60);
    const whalePct = randomBetween(2, 15);
    const sniperPct = randomBetween(1, 20);
    const mevPct = randomBetween(3, 30);
    const copyBotPct = randomBetween(1, 10);

    await prisma.tokenDNA.create({
      data: {
        tokenId: token.id,
        liquidityDNA: JSON.stringify(Array.from({ length: 8 }, () => randomBetween(0, 1))),
        walletDNA: JSON.stringify(Array.from({ length: 6 }, () => randomBetween(0, 1))),
        topologyDNA: JSON.stringify(Array.from({ length: 10 }, () => randomBetween(0, 1))),
        riskScore: Math.floor(randomBetween(10, 95)),
        botActivityScore: botActivityPct,
        smartMoneyScore: smartMoneyPct,
        retailScore: retailPct,
        whaleScore: whalePct,
        washTradeProb: randomBetween(0, 0.3),
        sniperPct,
        mevPct,
        copyBotPct,
        traderComposition: JSON.stringify({
          smartMoney: Math.floor(randomBetween(2, 15)),
          whale: Math.floor(randomBetween(1, 8)),
          bot_mev: Math.floor(randomBetween(3, 20)),
          bot_sniper: Math.floor(randomBetween(5, 25)),
          bot_copy: Math.floor(randomBetween(1, 8)),
          bot_wash: Math.floor(randomBetween(0, 5)),
          retail: Math.floor(randomBetween(30, 60)),
          creator: Math.floor(randomBetween(0, 2)),
          fund: Math.floor(randomBetween(0, 3)),
        }),
        topWallets: JSON.stringify(
          Array.from({ length: 5 }, (_, i) => ({
            address: `${Math.random().toString(36).substring(2, 10)}...`,
            label: ['SMART_MONEY', 'WHALE', 'BOT_SNIPER', 'BOT_MEV', 'RETAIL'][i],
            pnl: randomBetween(-5000, 50000),
            entryRank: Math.floor(randomBetween(1, 500)),
            holdTime: randomBetween(0.5, 1440),
          }))
        ),
      }
    });
  }
  console.log(`✅ Created ${tokens.length} tokens with enriched DNA`);

  // ============================================================
  // 2. CREATE TRADERS - The core intelligence layer
  // ============================================================
  const allWallets = [...SOL_WALLETS, ...ETH_WALLETS, ...L2_WALLETS];
  const traders: Trader[] = [];

  for (const wallet of allWallets) {
    // Determine if this wallet is a bot, smart money, whale, or retail
    const botTemplate = BOT_TEMPLATES.find(b => wallet.name.includes(b.name.split(' ')[0]) || wallet.name.toLowerCase().includes('bot'));
    const smTemplate = SMART_MONEY_TEMPLATES.find(s => wallet.name.includes(s.name));
    const whaleTemplate = WHALE_TEMPLATES.find(w => wallet.name.includes(w.name));

    let isBot = false;
    let botType: string | null = null;
    let primaryLabel = 'RETAIL';
    let labelConfidence = 0.5;
    let winRate = randomBetween(0.3, 0.55);
    let avgHoldTimeMin = randomBetween(30, 720);
    let avgTradeSizeUsd = randomBetween(100, 5000);
    let totalTrades = Math.floor(randomBetween(10, 200));
    let totalPnl = randomBetween(-5000, 15000);
    let totalVolume = randomBetween(5000, 500000);
    let smartMoneyScore = randomBetween(0, 30);
    let whaleScore = randomBetween(0, 20);
    let sniperScore = randomBetween(0, 15);
    let botConfidence = 0;
    let washTradeScore = randomBetween(0, 0.1);
    let copyTradeScore = randomBetween(0, 0.15);
    let frontrunCount = 0;
    let sandwichCount = 0;
    let mevExtractionUsd = 0;
    let consistencyScore = randomBetween(0.2, 0.5);
    let isActive247 = false;
    let avgTimeBetweenTrades = randomBetween(30, 720);
    let isSmartMoney = false;
    let isWhale = false;
    let isSniper = false;
    let earlyEntryCount = 0;
    let avgEntryRank = randomBetween(100, 5000);
    let avgExitMultiplier = 1;
    let totalHoldingsUsd = randomBetween(100, 50000);
    let avgSlippageBps = Math.floor(randomBetween(10, 100));

    if (botTemplate) {
      isBot = true;
      botType = botTemplate.botType;
      primaryLabel = botTemplate.label;
      labelConfidence = randomBetween(0.7, 0.98);
      winRate = botTemplate.metrics.winRate;
      avgHoldTimeMin = botTemplate.metrics.avgHoldTimeMin;
      frontrunCount = botTemplate.metrics.frontrunCount || 0;
      sandwichCount = botTemplate.metrics.sandwichCount || 0;
      washTradeScore = botTemplate.metrics.washTradeScore || randomBetween(0, 0.1);
      copyTradeScore = botTemplate.metrics.copyTradeScore || randomBetween(0, 0.1);
      mevExtractionUsd = botTemplate.metrics.mevExtractionUsd || 0;
      consistencyScore = botTemplate.metrics.consistencyScore;
      isActive247 = botTemplate.metrics.isActive247;
      avgTimeBetweenTrades = randomBetween(0.1, 5);
      botConfidence = randomBetween(0.7, 0.98);
      totalTrades = Math.floor(randomBetween(500, 10000));
      totalVolume = randomBetween(100000, 50000000);
      avgTradeSizeUsd = randomBetween(1000, 50000);
      avgSlippageBps = botTemplate.metrics.avgSlippageBps || 50;
    } else if (smTemplate) {
      primaryLabel = smTemplate.label;
      labelConfidence = randomBetween(0.6, 0.9);
      winRate = smTemplate.metrics.winRate;
      avgHoldTimeMin = smTemplate.metrics.avgHoldTimeMin;
      avgTradeSizeUsd = smTemplate.metrics.avgTradeSizeUsd;
      smartMoneyScore = randomBetween(60, 95);
      isSmartMoney = true;
      earlyEntryCount = smTemplate.metrics.earlyEntryCount;
      avgEntryRank = smTemplate.metrics.avgEntryRank;
      avgExitMultiplier = smTemplate.metrics.avgExitMultiplier;
      totalTrades = Math.floor(randomBetween(50, 500));
      totalPnl = randomBetween(50000, 5000000);
      totalVolume = randomBetween(500000, 50000000);
      totalHoldingsUsd = randomBetween(100000, 10000000);
    } else if (whaleTemplate) {
      primaryLabel = whaleTemplate.label;
      labelConfidence = randomBetween(0.7, 0.95);
      winRate = whaleTemplate.metrics.winRate || randomBetween(0.5, 0.65);
      avgHoldTimeMin = whaleTemplate.metrics.avgHoldTimeMin || randomBetween(1440, 7200);
      avgTradeSizeUsd = whaleTemplate.metrics.avgTradeSizeUsd;
      totalHoldingsUsd = whaleTemplate.metrics.totalHoldingsUsd;
      whaleScore = whaleTemplate.metrics.whaleScore;
      isWhale = true;
      totalTrades = Math.floor(randomBetween(20, 300));
      totalVolume = randomBetween(1000000, 100000000);
      totalPnl = randomBetween(100000, 10000000);
    } else if (wallet.name.toLowerCase().includes('sniper')) {
      primaryLabel = 'SNIPER';
      labelConfidence = randomBetween(0.5, 0.85);
      sniperScore = randomBetween(60, 95);
      isSniper = true;
      winRate = randomBetween(0.4, 0.6);
      avgHoldTimeMin = randomBetween(5, 60);
      earlyEntryCount = Math.floor(randomBetween(10, 50));
      avgEntryRank = randomBetween(1, 20);
      totalTrades = Math.floor(randomBetween(100, 2000));
      isActive247 = Math.random() > 0.3;
    }

    const trader = await prisma.trader.create({
      data: {
        address: wallet.address,
        chain: wallet.chain,
        ensName: wallet.chain === 'ETH' && wallet.name.includes('vitalik') ? 'vitalik.eth' : undefined,
        solName: wallet.chain === 'SOL' && Math.random() > 0.7 ? `${wallet.name.toLowerCase().replace(/\s/g, '')}.sol` : undefined,
        
        primaryLabel,
        subLabels: JSON.stringify(primaryLabel === 'SMART_MONEY' ? ['WHALE'] : primaryLabel === 'BOT_MEV' ? ['FRONT_RUNNER'] : []),
        labelConfidence,
        
        isBot,
        botType,
        botConfidence,
        botDetectionSignals: JSON.stringify(
          isBot ? [{ signal: 'consistency_score', value: consistencyScore }, { signal: 'active_247', value: isActive247 }] : []
        ),
        botFirstDetectedAt: isBot ? new Date(Date.now() - randomBetween(86400000, 90 * 86400000)) : undefined,
        
        totalTrades,
        winRate,
        avgPnl: totalPnl / (totalTrades || 1),
        totalPnl,
        avgHoldTimeMin,
        avgTradeSizeUsd,
        largestTradeUsd: avgTradeSizeUsd * randomBetween(2, 10),
        totalVolumeUsd: totalVolume,
        maxDrawdown: randomBetween(-50000, -100),
        sharpeRatio: isSmartMoney ? randomBetween(1.2, 2.5) : randomBetween(-0.5, 1),
        profitFactor: isSmartMoney ? randomBetween(1.5, 3) : randomBetween(0.5, 1.5),
        
        avgSlippageBps,
        frontrunCount,
        frontrunByCount: frontrunCount > 0 ? 0 : Math.floor(randomBetween(0, 5)),
        sandwichCount,
        sandwichVictimCount: sandwichCount > 0 ? 0 : Math.floor(randomBetween(0, 10)),
        washTradeScore,
        copyTradeScore,
        mevExtractionUsd,
        
        avgTimeBetweenTrades,
        tradingHourPattern: JSON.stringify(generateHourPattern(isBot, isSmartMoney)),
        tradingDayPattern: JSON.stringify(generateDayPattern()),
        isActiveAtNight: isBot || Math.random() > 0.6,
        isActive247,
        consistencyScore,
        
        uniqueTokensTraded: Math.floor(randomBetween(5, 200)),
        avgPositionsAtOnce: Math.floor(randomBetween(1, 15)),
        maxPositionsAtOnce: Math.floor(randomBetween(3, 30)),
        preferredChains: JSON.stringify([wallet.chain, ...(Math.random() > 0.5 ? [wallet.chain === 'SOL' ? 'ETH' : 'SOL'] : [])]),
        preferredDexes: JSON.stringify(
          wallet.chain === 'SOL'
            ? ['raydium', 'orca', 'jupiter', 'meteora'].slice(0, Math.floor(randomBetween(1, 4)))
            : ['uniswap', 'curve', '1inch', 'sushiswap'].slice(0, Math.floor(randomBetween(1, 4)))
        ),
        preferredTokenTypes: JSON.stringify(
          isBot ? ['MEME'] : isSmartMoney ? ['DEFI', 'L1', 'L2'] : ['MEME', 'DEFI']
        ),
        
        isSmartMoney,
        smartMoneyScore,
        earlyEntryCount,
        avgEntryRank,
        avgExitMultiplier,
        topCallCount: isSmartMoney ? Math.floor(randomBetween(10, 100)) : Math.floor(randomBetween(0, 20)),
        worstCallCount: isSmartMoney ? Math.floor(randomBetween(2, 20)) : Math.floor(randomBetween(5, 50)),
        
        isWhale,
        whaleScore,
        totalHoldingsUsd,
        avgPositionUsd: totalHoldingsUsd / randomBetween(3, 15),
        priceImpactAvg: whaleScore > 50 ? randomBetween(0.5, 5) : randomBetween(0, 0.5),
        
        isSniper,
        sniperScore,
        avgBlockToTrade: isSniper ? randomBetween(0.5, 3) : randomBetween(50, 5000),
        block0EntryCount: isSniper ? Math.floor(randomBetween(5, 30)) : 0,
        
        firstSeen: new Date(Date.now() - randomBetween(86400000, 365 * 86400000)),
        lastActive: new Date(Date.now() - randomBetween(0, 3600000)),
        lastAnalyzed: new Date(),
        dataQuality: randomBetween(0.4, 0.95),
      }
    });
    traders.push(trader);

    // ============================================================
    // 3. CREATE BEHAVIOR PATTERNS FOR EACH TRADER
    // ============================================================
    const patterns: string[] = [];
    if (isBot) {
      patterns.push('MEV_EXTRACTOR', 'SCALPER');
    } else if (isSmartMoney) {
      patterns.push('ACCUMULATOR', 'MOMENTUM_RIDER', 'CONTRARIAN');
    } else if (isWhale) {
      patterns.push('ACCUMULATOR', 'DIAMOND_HANDS');
    } else if (isSniper) {
      patterns.push('SNIPER_ENTRY', 'SCALPER');
    } else {
      patterns.push('SWING_TRADER', 'MOMENTUM_RIDER');
    }

    for (const pattern of patterns) {
      await prisma.traderBehaviorPattern.create({
        data: {
          traderId: trader.id,
          pattern,
          confidence: randomBetween(0.5, 0.95),
          dataPoints: Math.floor(randomBetween(20, trader.totalTrades)),
          firstObserved: new Date(Date.now() - randomBetween(86400000, 90 * 86400000)),
          lastObserved: new Date(Date.now() - randomBetween(0, 86400000)),
          metadata: JSON.stringify({ source: 'algorithm_v1' }),
        }
      });
    }

    // ============================================================
    // 4. CREATE LABEL ASSIGNMENTS
    // ============================================================
    await prisma.traderLabelAssignment.create({
      data: {
        traderId: trader.id,
        label: primaryLabel,
        source: isBot ? 'ALGORITHM' : isSmartMoney ? 'ON_CHAIN_ANALYSIS' : 'PATTERN_MATCHING',
        confidence: labelConfidence,
        evidence: JSON.stringify([
          `Automated classification based on ${trader.totalTrades} trades`,
          `Consistency score: ${consistencyScore.toFixed(2)}`,
          isBot ? `Bot detection signals: ${botType}` : `Win rate: ${(winRate * 100).toFixed(1)}%`,
        ]),
        assignedAt: new Date(),
      }
    });

    // Add secondary label if applicable
    if (isSmartMoney && whaleScore > 30) {
      await prisma.traderLabelAssignment.create({
        data: {
          traderId: trader.id,
          label: 'WHALE',
          source: 'ON_CHAIN_ANALYSIS',
          confidence: 0.6,
          evidence: JSON.stringify([`Holdings: $${totalHoldingsUsd.toFixed(0)}`]),
          assignedAt: new Date(),
        }
      });
    }

    // ============================================================
    // 5. CREATE TOKEN HOLDINGS FOR TRADERS
    // ============================================================
    const chainTokens = tokens.filter(t => t.chain === wallet.chain);
    const holdingCount = Math.floor(randomBetween(1, Math.min(8, chainTokens.length)));
    const shuffled = [...chainTokens].sort(() => Math.random() - 0.5);
    
    for (const token of shuffled.slice(0, holdingCount)) {
      const balance = randomBetween(100, 1000000);
      const avgEntry = token.priceUsd * randomBetween(0.6, 1.3);
      
      await prisma.walletTokenHolding.create({
        data: {
          traderId: trader.id,
          tokenAddress: token.address,
          tokenSymbol: token.symbol,
          chain: token.chain,
          balance,
          valueUsd: balance * token.priceUsd,
          avgEntryPrice: avgEntry,
          unrealizedPnl: (token.priceUsd - avgEntry) * balance,
          unrealizedPnlPct: ((token.priceUsd - avgEntry) / avgEntry) * 100,
          firstBuyAt: new Date(Date.now() - randomBetween(86400000, 90 * 86400000)),
          lastTradeAt: new Date(Date.now() - randomBetween(0, 86400000)),
          buyCount: Math.floor(randomBetween(1, 20)),
          sellCount: Math.floor(randomBetween(0, 10)),
          totalBoughtUsd: balance * avgEntry * randomBetween(0.8, 1.5),
          totalSoldUsd: balance * avgEntry * randomBetween(0, 0.5),
        }
      });
    }
  }
  console.log(`✅ Created ${traders.length} traders with full profiles, patterns, labels, and holdings`);

  // ============================================================
  // 6. CREATE CROSS-CHAIN WALLET LINKS
  // ============================================================
  const solTraders = traders.filter(t => t.chain === 'SOL');
  const ethTraders = traders.filter(t => t.chain === 'ETH');
  
  // Link some SOL bots to ETH equivalents
  let linkCount = 0;
  for (let i = 0; i < Math.min(5, solTraders.length, ethTraders.length); i++) {
    const solTrader = solTraders[i];
    const ethTrader = ethTraders[i];
    
    if (solTrader.isBot && ethTrader.isBot) {
      await prisma.crossChainWallet.create({
        data: {
          primaryWalletId: solTrader.id,
          linkedWalletId: ethTrader.id,
          primaryChain: 'SOL',
          linkedChain: 'ETH',
          linkedAddress: ethTrader.address,
          linkType: 'SAME_ENTITY',
          linkConfidence: randomBetween(0.6, 0.9),
          evidence: JSON.stringify([
            'Similar trading patterns across chains',
            'Same consistency score',
            'Temporal correlation in trade timing',
          ]),
          bridgeTxCount: Math.floor(randomBetween(2, 15)),
          totalBridgedUsd: randomBetween(5000, 500000),
        }
      });
      linkCount++;
    }
  }
  
  // Link smart money across chains
  const smSol = solTraders.find(t => t.isSmartMoney);
  const smEth = ethTraders.find(t => t.isSmartMoney);
  if (smSol && smEth) {
    await prisma.crossChainWallet.create({
      data: {
        primaryWalletId: smSol.id,
        linkedWalletId: smEth.id,
        primaryChain: 'SOL',
        linkedChain: 'ETH',
        linkedAddress: smEth.address,
        linkType: 'LIKELY_LINKED',
        linkConfidence: 0.45,
        evidence: JSON.stringify([
          'Similar win rates and hold times',
          'Cross-chain bridge transactions detected',
          'Overlapping DEX usage patterns',
        ]),
        bridgeTxCount: Math.floor(randomBetween(1, 5)),
        totalBridgedUsd: randomBetween(10000, 200000),
      }
    });
    linkCount++;
  }
  console.log(`✅ Created ${linkCount} cross-chain wallet links`);

  // ============================================================
  // 7. CREATE TRANSACTIONS FOR KEY TRADERS
  // ============================================================
  let txCount = 0;
  const keyTraders = traders.slice(0, 10); // Top 10 traders get full tx history
  
  for (const trader of keyTraders) {
    const chainTokens = tokens.filter(t => t.chain === trader.chain);
    const txNum = Math.min(trader.totalTrades, 50); // Cap at 50 per trader for seed
    
    for (let i = 0; i < txNum; i++) {
      const token = chainTokens[Math.floor(Math.random() * chainTokens.length)];
      const isBuy = Math.random() > 0.45;
      const valueUsd = trader.avgTradeSizeUsd * randomBetween(0.5, 2);
      
      await prisma.traderTransaction.create({
        data: {
          traderId: trader.id,
          txHash: `${trader.chain === 'SOL' ? '' : '0x'}${Math.random().toString(trader.chain === 'SOL' ? 36 : 16).substring(2, trader.chain === 'SOL' ? 88 : 66)}`,
          blockNumber: Math.floor(randomBetween(180000000, 200000000)),
          blockTime: new Date(Date.now() - randomBetween(0, 30 * 86400000)),
          chain: trader.chain,
          dex: trader.chain === 'SOL'
            ? ['raydium', 'orca', 'jupiter', 'meteora'][Math.floor(Math.random() * 4)]
            : ['uniswap', 'curve', '1inch', 'sushiswap'][Math.floor(Math.random() * 4)],
          action: isBuy ? 'BUY' : 'SELL',
          tokenAddress: token.address,
          tokenSymbol: token.symbol,
          quoteToken: trader.chain === 'SOL' ? 'SOL' : 'WETH',
          amountIn: valueUsd / (token.priceUsd || 1) * (isBuy ? 1 : randomBetween(0.8, 1.2)),
          amountOut: valueUsd / (token.priceUsd || 1) * (isBuy ? randomBetween(0.8, 1.2) : 1),
          priceUsd: token.priceUsd * randomBetween(0.95, 1.05),
          valueUsd,
          slippageBps: trader.isBot ? Math.floor(randomBetween(1, 10)) : Math.floor(randomBetween(20, 200)),
          pnlUsd: isBuy ? undefined : randomBetween(-1000, 5000),
          isFrontrun: trader.isBot && Math.random() > 0.7,
          isSandwich: trader.botType === 'SANDWICH_BOT' && Math.random() > 0.5,
          isWashTrade: trader.botType === 'WASH_TRADING_BOT' && Math.random() > 0.5,
          priorityFee: trader.isBot ? randomBetween(0.001, 0.1) : 0,
          totalFeeUsd: randomBetween(0.01, 5),
          tokenAgeAtTrade: randomBetween(1, 43200), // minutes since token creation
          holderCountAtTrade: Math.floor(randomBetween(10, 5000)),
          liquidityAtTrade: randomBetween(10000, 5000000),
          metadata: JSON.stringify({ source: 'seed_simulation' }),
        }
      });
      txCount++;
    }
  }
  console.log(`✅ Created ${txCount} transactions for top traders`);

  // ============================================================
  // 8. CREATE SIGNALS
  // ============================================================
  const signalTypes = ['RUG_PULL', 'SMART_MONEY_ENTRY', 'LIQUIDITY_TRAP', 'V_SHAPE', 'DIVERGENCE', 'BOT_ACTIVITY_SPIKE', 'WASH_TRADING_ALERT', 'WHALE_MOVEMENT'];
  const signalDescriptions: Record<string, string[]> = {
    'RUG_PULL': [
      'Liquidity removal detected - 40% of pool drained in last 5 blocks',
      'Creator wallet moving tokens to exchange - high probability exit scam',
      'Smart contract mint function unlocked - unlimited supply risk',
    ],
    'SMART_MONEY_ENTRY': [
      'Top-10 smart money wallet accumulated 2.3% of supply',
      '3 wallets with >85% win rate entered within 10 minutes',
      'Known profitable whale building position over 4 hours',
    ],
    'BOT_ACTIVITY_SPIKE': [
      'MEV bot activity increased 300% in last hour - frontrunning risk',
      'Sniper bot detected entering within block 0 - 8 bots identified',
      'Wash trading pattern detected - 5 wallets cycling volume',
    ],
    'WASH_TRADING_ALERT': [
      'Circular trading detected between 3 wallets - artificial volume',
      'Self-trading pattern identified - wallet buying own sells',
    ],
    'WHALE_MOVEMENT': [
      'Whale wallet transferred 500K tokens to exchange - potential sell pressure',
      'Large accumulation detected - 2M USD buy in single transaction',
    ],
    'LIQUIDITY_TRAP': [
      'False breakout pattern - liquidity above range, stops likely hunted',
      'Concentrated liquidity at key level - stop hunt imminent',
    ],
    'V_SHAPE': [
      'Sharp rejection from support with volume spike - V-shape forming',
      'Flash crash recovery - smart money buying the dip',
    ],
    'DIVERGENCE': [
      'Price making lower lows while smart money accumulating - bullish divergence',
      'Volume divergence detected - price rising on declining volume',
    ],
  };

  for (let i = 0; i < 40; i++) {
    const type = signalTypes[Math.floor(Math.random() * signalTypes.length)];
    const token = tokens[Math.floor(Math.random() * tokens.length)];
    const descriptions = signalDescriptions[type] || signalDescriptions['DIVERGENCE'];
    
    await prisma.signal.create({
      data: {
        type,
        tokenId: token.id,
        confidence: Math.floor(randomBetween(30, 98)),
        priceTarget: token.priceUsd * randomBetween(0.7, 1.5),
        direction: type === 'RUG_PULL' || type === 'WASH_TRADING_ALERT' ? 'AVOID' : (Math.random() > 0.5 ? 'LONG' : 'SHORT'),
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        metadata: JSON.stringify({
          source: ['on-chain', 'wallet-tracking', 'bot-detection', 'behavioral-analysis'][Math.floor(Math.random() * 4)],
          timeframe: ['5m', '15m', '1h', '4h', '24h'][Math.floor(Math.random() * 5)],
          relatedWallets: Array.from({ length: Math.floor(randomBetween(1, 5)) }, () =>
            `${Math.random().toString(36).substring(2, 10)}...`
          ),
          botInvolvement: type.includes('BOT') || type.includes('WASH') ? true : Math.random() > 0.7,
        }),
        createdAt: new Date(Date.now() - Math.floor(randomBetween(0, 3600000))),
      }
    });
  }
  console.log('✅ Created 40 signals (including bot/wash trading alerts)');

  // ============================================================
  // 9. CREATE PATTERN RULES
  // ============================================================
  const patterns = [
    {
      name: 'Smart Money Accumulation + Bot Absence',
      conditions: JSON.stringify({
        logic: 'AND',
        rules: [
          { field: 'smartMoneyBuys', operator: '>', value: 3 },
          { field: 'botActivityPct', operator: '<', value: 15 },
          { field: 'volume24h', operator: '>', value: 100000 },
          { field: 'washTradeProb', operator: '<', value: 0.1 },
        ]
      }),
      winRate: 0.76,
      occurrences: 134,
      backtestResults: JSON.stringify({
        avgReturn: 14.2,
        maxDrawdown: -7.8,
        sharpeRatio: 1.95,
      }),
    },
    {
      name: 'Rug Pull + Bot Sniping Pattern',
      conditions: JSON.stringify({
        logic: 'AND',
        rules: [
          { field: 'sniperPct', operator: '>', value: 30 },
          { field: 'botActivityPct', operator: '>', value: 40 },
          { field: 'liquidityChange', operator: '<', value: -20 },
          { field: 'creatorWalletActive', operator: '==', value: true },
        ]
      }),
      winRate: 0.91,
      occurrences: 267,
      backtestResults: JSON.stringify({
        avgReturn: -52.3,
        maxDrawdown: -95.1,
        sharpeRatio: -0.52,
      }),
    },
    {
      name: 'MEV Bot Dominance Warning',
      conditions: JSON.stringify({
        logic: 'AND',
        rules: [
          { field: 'mevPct', operator: '>', value: 25 },
          { field: 'sandwichCount', operator: '>', value: 10 },
          { field: 'avgSlippageBps', operator: '>', value: 100 },
        ]
      }),
      winRate: 0.84,
      occurrences: 189,
      backtestResults: JSON.stringify({
        avgReturn: -12.5,
        maxDrawdown: -35.2,
        sharpeRatio: 0.15,
      }),
    },
    {
      name: 'V-Shape Recovery + Smart Money Buy',
      conditions: JSON.stringify({
        logic: 'AND',
        rules: [
          { field: 'priceDrop', operator: '<', value: -15 },
          { field: 'volumeSpike', operator: '>', value: 300 },
          { field: 'smartMoneyBuys', operator: '>', value: 2 },
          { field: 'botActivityPct', operator: '<', value: 20 },
        ]
      }),
      winRate: 0.68,
      occurrences: 95,
      backtestResults: JSON.stringify({
        avgReturn: 25.3,
        maxDrawdown: -16.8,
        sharpeRatio: 1.35,
      }),
    },
    {
      name: 'Wash Trading Token Avoidance',
      conditions: JSON.stringify({
        logic: 'AND',
        rules: [
          { field: 'washTradeProb', operator: '>', value: 0.3 },
          { field: 'selfTradeCount', operator: '>', value: 5 },
          { field: 'volume24h', operator: '>', value: 100000 },
        ]
      }),
      winRate: 0.93,
      occurrences: 312,
      backtestResults: JSON.stringify({
        avgReturn: -28.7,
        maxDrawdown: -78.4,
        sharpeRatio: -0.35,
      }),
    },
    {
      name: 'Whale Following + Low Bot Activity',
      conditions: JSON.stringify({
        logic: 'AND',
        rules: [
          { field: 'whaleTransactions', operator: '>', value: 5 },
          { field: 'avgTxSize', operator: '>', value: 50000 },
          { field: 'botActivityPct', operator: '<', value: 15 },
        ]
      }),
      winRate: 0.71,
      occurrences: 145,
      backtestResults: JSON.stringify({
        avgReturn: 16.8,
        maxDrawdown: -11.2,
        sharpeRatio: 1.62,
      }),
    },
  ];

  for (const p of patterns) {
    await prisma.patternRule.create({ data: p });
  }
  console.log('✅ Created 6 pattern rules (including bot/wash trading detection)');

  // ============================================================
  // 10. CREATE USER EVENTS
  // ============================================================
  for (let i = 0; i < 120; i++) {
    const token = tokens[Math.floor(Math.random() * tokens.length)];
    const eventType = ['OPEN_POSITION', 'CLOSE_POSITION', 'STOP_LOSS_HIT', 'TAKE_PROFIT_HIT', 'CANCEL'][Math.floor(Math.random() * 5)];
    
    await prisma.userEvent.create({
      data: {
        eventType,
        tokenId: token.id,
        walletAddress: `${Math.random().toString(16).substring(2, 42)}`,
        entryPrice: token.priceUsd * randomBetween(0.9, 1.1),
        stopLoss: token.priceUsd * randomBetween(0.85, 0.95),
        takeProfit: token.priceUsd * randomBetween(1.05, 1.3),
        pnl: ['CLOSE_POSITION', 'STOP_LOSS_HIT', 'TAKE_PROFIT_HIT'].includes(eventType)
          ? randomBetween(-500, 2000) : null,
        createdAt: new Date(Date.now() - Math.floor(randomBetween(0, 86400000))),
      }
    });
  }
  console.log('✅ Created 120 user events');

  // ============================================================
  // 11. CREATE TRADING SYSTEMS (15 across 8 categories)
  // ============================================================
  const tradingSystemsData = [
    // ALPHA_HUNTER (2)
    {
      name: 'Sniper Genesis',
      description: 'Block-0 entry system for new token launches. Targets tokens with high smart money presence in first blocks and exits on momentum decay.',
      category: 'ALPHA_HUNTER',
      icon: '🎯',
      assetFilter: JSON.stringify({ minLiquidity: 5000, maxHolderCount: 200, chains: ['SOL'], dexes: ['raydium', 'pump'], tokenTypes: ['MEME'], minSmartMoneyPct: 5 }),
      phaseConfig: JSON.stringify({ enabled: ['GENESIS', 'LAUNCH'], GENESIS: { maxEntryBlock: 2, minVolumeUsd: 1000 }, LAUNCH: { maxEntryMinutes: 30, minBuysSmartMoney: 2 } }),
      entrySignal: JSON.stringify({ type: 'MULTI_CONDITION', conditions: [{ field: 'blockAge', operator: '<=', value: 2 }, { field: 'smartMoneyBuys', operator: '>=', value: 2 }, { field: 'botActivityPct', operator: '<', value: 30 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'LIMIT', slippageBps: 200, priorityFeeSOL: 0.001, useJito: true, splitEntry: false, maxRetries: 3 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 40, trailing: true, trailingPct: 10 }, stopLoss: { pct: 15, type: 'HARD' }, timeout: { minutes: 120, exitAt: 'MARKET' }, signalExit: { smartMoneySellCount: 3, botSpikePct: 50 } }),
      bigDataContext: JSON.stringify({ requiredRegime: 'RISK_ON', maxVolatilityIndex: 80, botSwarmAlert: 'AVOID' }),
      primaryTimeframe: '5m',
      confirmTimeframes: JSON.stringify(['1m', '15m']),
      maxPositionPct: 3,
      maxOpenPositions: 5,
      stopLossPct: 15,
      takeProfitPct: 40,
      trailingStopPct: 10,
      cashReservePct: 30,
      allocationMethod: 'KELLY_MODIFIED',
      allocationConfig: JSON.stringify({ kellyFraction: 0.25, maxAllocationPct: 3, minConfidence: 0.6 }),
      isActive: true,
      isPaperTrading: true,
      version: 3,
      autoOptimize: true,
      optimizationMethod: 'WALK_FORWARD',
      optimizationFreq: 'WEEKLY',
      totalBacktests: 8,
      bestSharpe: 1.85,
      bestWinRate: 0.58,
      bestPnlPct: 42.5,
      avgHoldTimeMin: 45,
    },
    {
      name: 'Meme Rocket',
      description: 'Momentum-based meme coin catcher. Identifies tokens entering acceleration phase with rising volume and smart money accumulation.',
      category: 'ALPHA_HUNTER',
      icon: '🚀',
      assetFilter: JSON.stringify({ chains: ['SOL', 'BASE'], dexes: ['raydium', 'uniswap'], tokenTypes: ['MEME'], minVolume24h: 50000, maxMarketCap: 5000000 }),
      phaseConfig: JSON.stringify({ enabled: ['LAUNCH', 'EARLY'], LAUNCH: { maxAgeMinutes: 60 }, EARLY: { maxAgeHours: 24, minVolumeSpike: 3 } }),
      entrySignal: JSON.stringify({ type: 'MULTI_CONDITION', conditions: [{ field: 'volumeSpike', operator: '>=', value: 3 }, { field: 'priceChange1h', operator: '>=', value: 20 }, { field: 'smartMoneyBuys1h', operator: '>=', value: 1 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'MARKET', slippageBps: 150, useJito: true, splitEntry: true, splits: 3, splitIntervalMin: 5 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 60, trailing: true, trailingPct: 15 }, stopLoss: { pct: 12, type: 'TRAILING' }, timeout: { minutes: 240 } }),
      bigDataContext: JSON.stringify({ requiredRegime: 'RISK_ON', minFearGreed: 50 }),
      primaryTimeframe: '15m',
      confirmTimeframes: JSON.stringify(['5m', '1h']),
      maxPositionPct: 4,
      maxOpenPositions: 8,
      stopLossPct: 12,
      takeProfitPct: 60,
      trailingStopPct: 15,
      cashReservePct: 25,
      allocationMethod: 'KELLY_MODIFIED',
      allocationConfig: JSON.stringify({ kellyFraction: 0.3, maxAllocationPct: 4 }),
      isActive: false,
      isPaperTrading: true,
      version: 2,
      autoOptimize: false,
      totalBacktests: 5,
      bestSharpe: 1.42,
      bestWinRate: 0.52,
      bestPnlPct: 28.7,
      avgHoldTimeMin: 90,
    },
    // SMART_MONEY (2)
    {
      name: 'Smart Entry Mirror',
      description: 'Mirrors identified smart money wallets with proven track records. Enters only when multiple smart money wallets accumulate the same token.',
      category: 'SMART_MONEY',
      icon: '🧠',
      assetFilter: JSON.stringify({ chains: ['SOL', 'ETH'], minSmartMoneyPct: 10, maxBotActivityPct: 25, tokenTypes: ['DEFI', 'L1', 'MEME'] }),
      phaseConfig: JSON.stringify({ enabled: ['EARLY', 'GROWTH'], EARLY: { minSmartMoneyBuys: 3 }, GROWTH: { minSmartMoneyBuys: 2, minHolderGrowth: 1.5 } }),
      entrySignal: JSON.stringify({ type: 'SMART_MONEY_FOLLOW', conditions: [{ field: 'smartMoneyBuys24h', operator: '>=', value: 3 }, { field: 'avgSmartMoneyWinRate', operator: '>=', value: 0.65 }, { field: 'smartMoneyAccumPctSupply', operator: '>=', value: 0.5 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'LIMIT', slippageBps: 50, splitEntry: true, splits: 5, splitIntervalMin: 30 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 30, trailing: true, trailingPct: 8 }, stopLoss: { pct: 10, type: 'HARD' }, signalExit: { smartMoneySellDetected: true, smartMoneySellPct: 20 } }),
      bigDataContext: JSON.stringify({ anyRegime: true }),
      primaryTimeframe: '1h',
      confirmTimeframes: JSON.stringify(['15m', '4h']),
      maxPositionPct: 5,
      maxOpenPositions: 10,
      stopLossPct: 10,
      takeProfitPct: 30,
      trailingStopPct: 8,
      cashReservePct: 20,
      allocationMethod: 'KELLY_MODIFIED',
      allocationConfig: JSON.stringify({ kellyFraction: 0.35, maxAllocationPct: 5, minSmartMoneyScore: 70 }),
      isActive: true,
      isPaperTrading: false,
      version: 5,
      autoOptimize: true,
      optimizationMethod: 'BAYESIAN',
      optimizationFreq: 'MONTHLY',
      totalBacktests: 12,
      bestSharpe: 2.45,
      bestWinRate: 0.68,
      bestPnlPct: 35.2,
      avgHoldTimeMin: 360,
    },
    {
      name: 'Whale Tail',
      description: 'Tracks whale accumulation patterns and follows large position builds. Uses on-chain data to detect stealth accumulation before price moves.',
      category: 'SMART_MONEY',
      icon: '🐋',
      assetFilter: JSON.stringify({ chains: ['ETH', 'SOL'], minWhaleScore: 60, tokenTypes: ['DEFI', 'L1', 'L2'], minLiquidity: 100000 }),
      phaseConfig: JSON.stringify({ enabled: ['EARLY', 'GROWTH', 'MATURE'], EARLY: { minWhaleBuys: 2 }, GROWTH: { minWhaleBuys: 1, whaleAccumPct: 2 }, MATURE: { minWhaleBuys: 2, trend: 'ACCUMULATING' } }),
      entrySignal: JSON.stringify({ type: 'WHALE_FOLLOW', conditions: [{ field: 'whaleBuys48h', operator: '>=', value: 3 }, { field: 'totalWhaleAccumUsd', operator: '>=', value: 100000 }, { field: 'whaleAvgEntryVsCurrent', operator: '<=', value: 1.05 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'TWAP', twapDurationMin: 60, slippageBps: 30, splitEntry: true, splits: 8 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 25, trailing: true, trailingPct: 6 }, stopLoss: { pct: 8, type: 'HARD' }, signalExit: { whaleDistributionDetected: true, whaleSellPct: 15 } }),
      bigDataContext: JSON.stringify({ anyRegime: true, avoidHighVolatility: true }),
      primaryTimeframe: '4h',
      confirmTimeframes: JSON.stringify(['1h', '1d']),
      maxPositionPct: 6,
      maxOpenPositions: 6,
      stopLossPct: 8,
      takeProfitPct: 25,
      trailingStopPct: 6,
      cashReservePct: 15,
      allocationMethod: 'EQUAL_WEIGHT',
      allocationConfig: JSON.stringify({ weightPerPosition: 5, maxWeight: 8 }),
      isActive: true,
      isPaperTrading: false,
      version: 4,
      autoOptimize: true,
      optimizationMethod: 'WALK_FORWARD',
      optimizationFreq: 'WEEKLY',
      totalBacktests: 9,
      bestSharpe: 2.10,
      bestWinRate: 0.72,
      bestPnlPct: 22.8,
      avgHoldTimeMin: 1440,
    },
    // TECHNICAL (2)
    {
      name: 'Momentum Breakout',
      description: 'Classical momentum breakout system adapted for crypto. Identifies tokens breaking out of consolidation with volume confirmation.',
      category: 'TECHNICAL',
      icon: '📈',
      assetFilter: JSON.stringify({ chains: ['SOL', 'ETH'], minVolume24h: 100000, minLiquidity: 50000, tokenTypes: ['DEFI', 'L1', 'MEME'] }),
      phaseConfig: JSON.stringify({ enabled: ['GROWTH', 'MATURE'], GROWTH: { minConsolidationHours: 4 }, MATURE: { minConsolidationHours: 24 } }),
      entrySignal: JSON.stringify({ type: 'BREAKOUT', conditions: [{ field: 'priceAboveBBUpper', operator: '==', value: true }, { field: 'volumeVsAvg', operator: '>=', value: 2.5 }, { field: 'rsi', operator: '<=', value: 75 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'STOP_LIMIT', slippageBps: 50, stopOffsetPct: 0.5 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 20, trailing: true, trailingPct: 5 }, stopLoss: { pct: 7, type: 'HARD' }, signalExit: { rsiAbove: 80, volumeDeclinePct: 40 } }),
      bigDataContext: JSON.stringify({ anyRegime: true }),
      primaryTimeframe: '1h',
      confirmTimeframes: JSON.stringify(['15m', '4h']),
      maxPositionPct: 4,
      maxOpenPositions: 12,
      stopLossPct: 7,
      takeProfitPct: 20,
      trailingStopPct: 5,
      cashReservePct: 20,
      allocationMethod: 'KELLY_MODIFIED',
      allocationConfig: JSON.stringify({ kellyFraction: 0.2, maxAllocationPct: 4 }),
      isActive: true,
      isPaperTrading: true,
      version: 3,
      autoOptimize: false,
      totalBacktests: 15,
      bestSharpe: 1.65,
      bestWinRate: 0.55,
      bestPnlPct: 18.3,
      avgHoldTimeMin: 180,
    },
    {
      name: 'V-Shape Recovery',
      description: 'Detects sharp price dips with immediate recovery signals. Capitalizes on panic sells where smart money steps in to buy.',
      category: 'TECHNICAL',
      icon: '🔄',
      assetFilter: JSON.stringify({ chains: ['SOL', 'ETH'], minLiquidity: 25000, tokenTypes: ['DEFI', 'MEME', 'L1'], minHolderCount: 500 }),
      phaseConfig: JSON.stringify({ enabled: ['EARLY', 'GROWTH', 'MATURE'], EARLY: { minDipPct: -20 }, GROWTH: { minDipPct: -15 }, MATURE: { minDipPct: -10 } }),
      entrySignal: JSON.stringify({ type: 'V_SHAPE', conditions: [{ field: 'priceDrop1h', operator: '<=', value: -15 }, { field: 'volumeSpike', operator: '>=', value: 300 }, { field: 'buyPressureRatio', operator: '>=', value: 1.5 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'LIMIT', slippageBps: 100, limitOffsetFromDip: 2 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 30, trailing: true, trailingPct: 8 }, stopLoss: { pct: 8, type: 'HARD' }, timeout: { minutes: 180 } }),
      bigDataContext: JSON.stringify({ preferredRegime: 'NEUTRAL', avoidRegime: 'RISK_OFF' }),
      primaryTimeframe: '15m',
      confirmTimeframes: JSON.stringify(['5m', '1h']),
      maxPositionPct: 5,
      maxOpenPositions: 8,
      stopLossPct: 8,
      takeProfitPct: 30,
      trailingStopPct: 8,
      cashReservePct: 25,
      allocationMethod: 'KELLY_MODIFIED',
      allocationConfig: JSON.stringify({ kellyFraction: 0.3, maxAllocationPct: 5 }),
      isActive: false,
      isPaperTrading: true,
      version: 2,
      autoOptimize: true,
      optimizationMethod: 'GRID',
      optimizationFreq: 'WEEKLY',
      totalBacktests: 6,
      bestSharpe: 1.35,
      bestWinRate: 0.62,
      bestPnlPct: 25.1,
      avgHoldTimeMin: 120,
    },
    // DEFENSIVE (2)
    {
      name: 'Rug Pull Avoider',
      description: 'Identifies and avoids tokens with rug pull characteristics. Uses token DNA analysis to detect red flags before entering any position.',
      category: 'DEFENSIVE',
      icon: '🛡️',
      assetFilter: JSON.stringify({ chains: ['SOL', 'ETH', 'BASE'], maxWashTradeProb: 0.1, maxCreatorHoldingsPct: 15, minLiquidityLockedPct: 50 }),
      phaseConfig: JSON.stringify({ enabled: ['GENESIS', 'LAUNCH', 'EARLY'], GENESIS: { maxCreatorPct: 10 }, LAUNCH: { minLiquidityLocked: true }, EARLY: { minHolders: 100 } }),
      entrySignal: JSON.stringify({ type: 'SAFETY_GATE', conditions: [{ field: 'washTradeProb', operator: '<', value: 0.1 }, { field: 'creatorTokensPct', operator: '<', value: 15 }, { field: 'liquidityLocked', operator: '==', value: true }, { field: 'mintRenounced', operator: '==', value: true }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'LIMIT', slippageBps: 30, requireConfirmation: true, confirmationBlocks: 3 }),
      exitSignal: JSON.stringify({ signalExit: { rugPullSignals: ['liquidityRemoval', 'creatorSell', 'mintUnlocked'], immediateExit: true }, stopLoss: { pct: 10, type: 'HARD' } }),
      bigDataContext: JSON.stringify({ anyRegime: true }),
      primaryTimeframe: '1h',
      confirmTimeframes: JSON.stringify(['15m']),
      maxPositionPct: 3,
      maxOpenPositions: 5,
      stopLossPct: 10,
      takeProfitPct: 25,
      cashReservePct: 40,
      allocationMethod: 'CONSERVATIVE',
      allocationConfig: JSON.stringify({ maxAllocationPct: 3, minSafetyScore: 80 }),
      isActive: true,
      isPaperTrading: false,
      version: 7,
      autoOptimize: true,
      optimizationMethod: 'WALK_FORWARD',
      optimizationFreq: 'MONTHLY',
      totalBacktests: 20,
      bestSharpe: 2.80,
      bestWinRate: 0.75,
      bestPnlPct: 15.6,
      avgHoldTimeMin: 720,
    },
    {
      name: 'Capital Preserver',
      description: 'Ultra-conservative system focused on capital preservation. Only enters highest-conviction setups with minimal drawdown tolerance.',
      category: 'DEFENSIVE',
      icon: '🏦',
      assetFilter: JSON.stringify({ chains: ['ETH', 'SOL'], minLiquidity: 500000, minMarketCap: 10000000, maxBotActivityPct: 15, tokenTypes: ['DEFI', 'L1'] }),
      phaseConfig: JSON.stringify({ enabled: ['MATURE', 'ESTABLISHED'], MATURE: { minDaysSinceLaunch: 30 }, ESTABLISHED: { minDaysSinceLaunch: 90 } }),
      entrySignal: JSON.stringify({ type: 'CONFLUENCE', conditions: [{ field: 'smartMoneyScore', operator: '>=', value: 70 }, { field: 'riskScore', operator: '<=', value: 30 }, { field: 'washTradeProb', operator: '<', value: 0.05 }, { field: 'trendDirection', operator: '==', value: 'UP' }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'TWAP', twapDurationMin: 120, slippageBps: 10 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 15, trailing: true, trailingPct: 4 }, stopLoss: { pct: 5, type: 'HARD' }, signalExit: { trendReversal: true, smartMoneyExit: true } }),
      bigDataContext: JSON.stringify({ requiredRegime: 'NEUTRAL', maxFearGreed: 75 }),
      primaryTimeframe: '4h',
      confirmTimeframes: JSON.stringify(['1h', '1d']),
      maxPositionPct: 3,
      maxOpenPositions: 4,
      stopLossPct: 5,
      takeProfitPct: 15,
      trailingStopPct: 4,
      cashReservePct: 50,
      allocationMethod: 'CONSERVATIVE',
      allocationConfig: JSON.stringify({ maxAllocationPct: 3, minConfluence: 4 }),
      isActive: true,
      isPaperTrading: false,
      version: 6,
      autoOptimize: true,
      optimizationMethod: 'BAYESIAN',
      optimizationFreq: 'MONTHLY',
      totalBacktests: 18,
      bestSharpe: 3.0,
      bestWinRate: 0.72,
      bestPnlPct: 9.8,
      avgHoldTimeMin: 2880,
    },
    // BOT_AWARE (2)
    {
      name: 'MEV Shadow',
      description: 'Operates in MEV-heavy environments by using private mempool routing and anti-frontrun techniques. Protects trades from sandwich attacks.',
      category: 'BOT_AWARE',
      icon: '👻',
      assetFilter: JSON.stringify({ chains: ['SOL', 'ETH'], maxMevPct: 40, tokenTypes: ['MEME', 'DEFI'], minLiquidity: 20000 }),
      phaseConfig: JSON.stringify({ enabled: ['LAUNCH', 'EARLY', 'GROWTH'], LAUNCH: { usePrivateMempool: true }, EARLY: { checkSandwichRisk: true } }),
      entrySignal: JSON.stringify({ type: 'STEALTH', conditions: [{ field: 'sandwichRiskScore', operator: '<', value: 30 }, { field: 'mevExtractionAvgBps', operator: '<', value: 50 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'PRIVATE_LIMIT', useFlashbots: true, useJito: true, jitoTipSOL: 0.0005, antiSandwich: true, decoyTx: true }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 25, trailing: true, trailingPct: 7 }, stopLoss: { pct: 10, type: 'HARD' }, signalExit: { frontrunDetected: true, immediateExit: true } }),
      bigDataContext: JSON.stringify({ anyRegime: true, monitorBotSwarm: true }),
      primaryTimeframe: '5m',
      confirmTimeframes: JSON.stringify(['1m']),
      maxPositionPct: 4,
      maxOpenPositions: 6,
      stopLossPct: 10,
      takeProfitPct: 25,
      trailingStopPct: 7,
      cashReservePct: 25,
      allocationMethod: 'KELLY_MODIFIED',
      allocationConfig: JSON.stringify({ kellyFraction: 0.2, mevPenaltyFactor: 0.5 }),
      isActive: true,
      isPaperTrading: true,
      version: 4,
      autoOptimize: false,
      totalBacktests: 7,
      bestSharpe: 1.55,
      bestWinRate: 0.60,
      bestPnlPct: 20.3,
      avgHoldTimeMin: 60,
    },
    {
      name: 'Anti-Sniper Shield',
      description: 'Filters out sniper-bot-dominated tokens and only trades when bot activity is within acceptable thresholds. Protects retail from bot traps.',
      category: 'BOT_AWARE',
      icon: '🔰',
      assetFilter: JSON.stringify({ chains: ['SOL', 'ETH', 'BASE'], maxSniperPct: 15, maxBotActivityPct: 20, minRetailPct: 40, tokenTypes: ['MEME', 'DEFI'] }),
      phaseConfig: JSON.stringify({ enabled: ['LAUNCH', 'EARLY', 'GROWTH'], LAUNCH: { maxSniperPct: 10 }, EARLY: { maxSniperPct: 15 }, GROWTH: { maxSniperPct: 20 } }),
      entrySignal: JSON.stringify({ type: 'BOT_FILTER', conditions: [{ field: 'sniperPct', operator: '<', value: 15 }, { field: 'botActivityPct', operator: '<', value: 20 }, { field: 'copyBotPct', operator: '<', value: 10 }, { field: 'washTradeProb', operator: '<', value: 0.15 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'LIMIT', slippageBps: 50, requireMinLiquidity: 50000 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 30, trailing: true, trailingPct: 8 }, stopLoss: { pct: 12, type: 'HARD' }, signalExit: { botActivitySpike: 35, sniperEntryWave: true } }),
      bigDataContext: JSON.stringify({ anyRegime: true }),
      primaryTimeframe: '15m',
      confirmTimeframes: JSON.stringify(['5m', '1h']),
      maxPositionPct: 4,
      maxOpenPositions: 8,
      stopLossPct: 12,
      takeProfitPct: 30,
      trailingStopPct: 8,
      cashReservePct: 20,
      allocationMethod: 'KELLY_MODIFIED',
      allocationConfig: JSON.stringify({ kellyFraction: 0.25, botRiskDiscount: 0.3 }),
      isActive: false,
      isPaperTrading: true,
      version: 2,
      autoOptimize: true,
      optimizationMethod: 'GRID',
      optimizationFreq: 'WEEKLY',
      totalBacktests: 4,
      bestSharpe: 1.20,
      bestWinRate: 0.58,
      bestPnlPct: 16.7,
      avgHoldTimeMin: 240,
    },
    // DEEP_ANALYSIS (2)
    {
      name: 'Fundamental Scanner',
      description: 'Deep fundamental analysis system that evaluates token utility, team, tokenomics, and holder distribution before entry.',
      category: 'DEEP_ANALYSIS',
      icon: '🔬',
      assetFilter: JSON.stringify({ chains: ['ETH', 'SOL'], tokenTypes: ['DEFI', 'L1', 'L2'], minLiquidity: 200000, minHolderCount: 1000, maxTop10HolderPct: 40 }),
      phaseConfig: JSON.stringify({ enabled: ['GROWTH', 'MATURE', 'ESTABLISHED'], GROWTH: { minDaysActive: 7 }, MATURE: { minDaysActive: 30 }, ESTABLISHED: { minDaysActive: 90 } }),
      entrySignal: JSON.stringify({ type: 'FUNDAMENTAL', conditions: [{ field: 'utilityScore', operator: '>=', value: 60 }, { field: 'teamScore', operator: '>=', value: 50 }, { field: 'tokenomicsScore', operator: '>=', value: 70 }, { field: 'holderDistributionScore', operator: '>=', value: 65 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'TWAP', twapDurationMin: 240, slippageBps: 20 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 20, trailing: true, trailingPct: 5 }, stopLoss: { pct: 8, type: 'HARD' }, signalExit: { fundamentalDeterioration: true } }),
      bigDataContext: JSON.stringify({ anyRegime: true }),
      primaryTimeframe: '1d',
      confirmTimeframes: JSON.stringify(['4h']),
      maxPositionPct: 5,
      maxOpenPositions: 8,
      stopLossPct: 8,
      takeProfitPct: 20,
      trailingStopPct: 5,
      cashReservePct: 15,
      allocationMethod: 'EQUAL_WEIGHT',
      allocationConfig: JSON.stringify({ weightPerPosition: 5, fundamentalBonusPct: 2 }),
      isActive: true,
      isPaperTrading: false,
      version: 3,
      autoOptimize: true,
      optimizationMethod: 'BAYESIAN',
      optimizationFreq: 'MONTHLY',
      totalBacktests: 10,
      bestSharpe: 2.30,
      bestWinRate: 0.70,
      bestPnlPct: 19.4,
      avgHoldTimeMin: 4320,
    },
    {
      name: 'Holder Evolution',
      description: 'Tracks holder count growth, distribution changes, and wallet behavior evolution to identify tokens gaining organic adoption.',
      category: 'DEEP_ANALYSIS',
      icon: '📊',
      assetFilter: JSON.stringify({ chains: ['SOL', 'ETH'], tokenTypes: ['DEFI', 'L1', 'MEME'], minHolderCount: 200, minHolderGrowth7d: 10 }),
      phaseConfig: JSON.stringify({ enabled: ['EARLY', 'GROWTH', 'MATURE'], EARLY: { minHolderGrowth24h: 5 }, GROWTH: { minHolderGrowth7d: 10 }, MATURE: { minHolderGrowth30d: 15 } }),
      entrySignal: JSON.stringify({ type: 'HOLDER_ANALYSIS', conditions: [{ field: 'holderGrowth7d', operator: '>=', value: 15 }, { field: 'newSmartMoneyHolders', operator: '>=', value: 2 }, { field: 'avgHolderAge', operator: '>=', value: 7 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'LIMIT', slippageBps: 30, splitEntry: true, splits: 4 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 25, trailing: true, trailingPct: 6 }, stopLoss: { pct: 10, type: 'HARD' }, signalExit: { holderDeclinePct: -10, whaleExodus: true } }),
      bigDataContext: JSON.stringify({ anyRegime: true }),
      primaryTimeframe: '4h',
      confirmTimeframes: JSON.stringify(['1h', '1d']),
      maxPositionPct: 4,
      maxOpenPositions: 10,
      stopLossPct: 10,
      takeProfitPct: 25,
      trailingStopPct: 6,
      cashReservePct: 20,
      allocationMethod: 'KELLY_MODIFIED',
      allocationConfig: JSON.stringify({ kellyFraction: 0.3, holderGrowthBonus: 0.1 }),
      isActive: false,
      isPaperTrading: true,
      version: 2,
      autoOptimize: false,
      totalBacktests: 3,
      bestSharpe: 1.50,
      bestWinRate: 0.63,
      bestPnlPct: 21.0,
      avgHoldTimeMin: 720,
    },
    // MICRO_STRUCTURE (1)
    {
      name: 'Order Flow Imbalance',
      description: 'Microstructure analysis system that detects order flow imbalances. Trades on the side of aggressive flow when passive liquidity is thin.',
      category: 'MICRO_STRUCTURE',
      icon: '⚖️',
      assetFilter: JSON.stringify({ chains: ['SOL'], dexes: ['raydium', 'orca'], tokenTypes: ['MEME', 'DEFI'], minLiquidity: 30000 }),
      phaseConfig: JSON.stringify({ enabled: ['LAUNCH', 'EARLY', 'GROWTH'], LAUNCH: { minVolumeUsd: 5000 }, EARLY: { minVolumeUsd: 20000 } }),
      entrySignal: JSON.stringify({ type: 'ORDER_FLOW', conditions: [{ field: 'buySellRatio', operator: '>=', value: 2.0 }, { field: 'aggressiveFlowDirection', operator: '==', value: 'BUY' }, { field: 'passiveLiquidityDepth', operator: '<=', value: 50000 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'MARKET', slippageBps: 80, useJito: true, jitoTipSOL: 0.001 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 15, trailing: false }, stopLoss: { pct: 5, type: 'HARD' }, timeout: { minutes: 30 }, signalExit: { flowReversalDetected: true } }),
      bigDataContext: JSON.stringify({ anyRegime: true, monitorOrderFlow: true }),
      primaryTimeframe: '1m',
      confirmTimeframes: JSON.stringify(['5m']),
      maxPositionPct: 2,
      maxOpenPositions: 15,
      stopLossPct: 5,
      takeProfitPct: 15,
      cashReservePct: 30,
      allocationMethod: 'KELLY_MODIFIED',
      allocationConfig: JSON.stringify({ kellyFraction: 0.15, flowStrengthWeight: 0.5 }),
      isActive: true,
      isPaperTrading: true,
      version: 2,
      autoOptimize: true,
      optimizationMethod: 'GENETIC',
      optimizationFreq: 'DAILY',
      totalBacktests: 11,
      bestSharpe: 1.90,
      bestWinRate: 0.65,
      bestPnlPct: 12.8,
      avgHoldTimeMin: 15,
    },
    // ADAPTIVE (2)
    {
      name: 'Regime Switcher',
      description: 'Automatically switches between strategies based on detected market regime. Bull mode uses momentum, bear mode uses defensive, neutral uses smart money.',
      category: 'ADAPTIVE',
      icon: '🔀',
      assetFilter: JSON.stringify({ chains: ['SOL', 'ETH'], tokenTypes: ['DEFI', 'L1', 'MEME', 'L2'] }),
      phaseConfig: JSON.stringify({ enabled: ['LAUNCH', 'EARLY', 'GROWTH', 'MATURE'], regimeMap: { RISK_ON: 'momentum', RISK_OFF: 'defensive', NEUTRAL: 'smart_money' } }),
      entrySignal: JSON.stringify({ type: 'REGIME_ADAPTIVE', conditions: { RISK_ON: [{ field: 'momentumScore', operator: '>=', value: 70 }], RISK_OFF: [{ field: 'safetyScore', operator: '>=', value: 80 }], NEUTRAL: [{ field: 'smartMoneyScore', operator: '>=', value: 65 }] } }),
      executionConfig: JSON.stringify({ orderType: 'ADAPTIVE', RISK_ON: { slippageBps: 100 }, RISK_OFF: { slippageBps: 20 }, NEUTRAL: { slippageBps: 50 } }),
      exitSignal: JSON.stringify({ RISK_ON: { takeProfit: { pct: 40, trailing: true, trailingPct: 12 }, stopLoss: { pct: 10 } }, RISK_OFF: { takeProfit: { pct: 10, trailing: true, trailingPct: 3 }, stopLoss: { pct: 5 } }, NEUTRAL: { takeProfit: { pct: 20, trailing: true, trailingPct: 6 }, stopLoss: { pct: 8 } } }),
      bigDataContext: JSON.stringify({ regimeDetection: true, minConfidence: 0.7 }),
      primaryTimeframe: '1h',
      confirmTimeframes: JSON.stringify(['15m', '4h']),
      maxPositionPct: 5,
      maxOpenPositions: 10,
      stopLossPct: 8,
      takeProfitPct: 25,
      trailingStopPct: 8,
      cashReservePct: 20,
      allocationMethod: 'KELLY_MODIFIED',
      allocationConfig: JSON.stringify({ kellyFraction: 0.3, regimeAdjustment: true }),
      isActive: true,
      isPaperTrading: false,
      version: 8,
      autoOptimize: true,
      optimizationMethod: 'ENSEMBLE',
      optimizationFreq: 'WEEKLY',
      totalBacktests: 25,
      bestSharpe: 2.65,
      bestWinRate: 0.67,
      bestPnlPct: 30.5,
      avgHoldTimeMin: 480,
    },
    {
      name: 'Multi-Strategy Fusion',
      description: 'Ensemble system that combines signals from multiple categories. Uses weighted voting across Alpha Hunter, Smart Money, and Technical signals.',
      category: 'ADAPTIVE',
      icon: '🧬',
      assetFilter: JSON.stringify({ chains: ['SOL', 'ETH', 'BASE'], tokenTypes: ['DEFI', 'L1', 'MEME'], minLiquidity: 10000 }),
      phaseConfig: JSON.stringify({ enabled: ['LAUNCH', 'EARLY', 'GROWTH', 'MATURE'], fusionWeights: { ALPHA_HUNTER: 0.3, SMART_MONEY: 0.35, TECHNICAL: 0.2, DEFENSIVE: 0.15 } }),
      entrySignal: JSON.stringify({ type: 'ENSEMBLE_VOTE', conditions: { minVotePct: 0.6, requiredCategories: 2, weights: { ALPHA_HUNTER: 0.3, SMART_MONEY: 0.35, TECHNICAL: 0.2, DEFENSIVE: 0.15 } } }),
      executionConfig: JSON.stringify({ orderType: 'ADAPTIVE', confidenceBasedSlippage: true, minSlippageBps: 30, maxSlippageBps: 150 }),
      exitSignal: JSON.stringify({ type: 'ENSEMBLE_EXIT', conditions: { exitVotePct: 0.5, anyCategoryHardStop: true }, takeProfit: { pct: 25, trailing: true, trailingPct: 7 }, stopLoss: { pct: 10, type: 'HARD' } }),
      bigDataContext: JSON.stringify({ regimeAware: true, crossCategoryValidation: true }),
      primaryTimeframe: '1h',
      confirmTimeframes: JSON.stringify(['5m', '15m', '4h']),
      maxPositionPct: 4,
      maxOpenPositions: 12,
      stopLossPct: 10,
      takeProfitPct: 25,
      trailingStopPct: 7,
      cashReservePct: 20,
      allocationMethod: 'KELLY_MODIFIED',
      allocationConfig: JSON.stringify({ kellyFraction: 0.25, ensembleConfidenceWeight: 0.4 }),
      isActive: true,
      isPaperTrading: true,
      version: 5,
      autoOptimize: true,
      optimizationMethod: 'ENSEMBLE',
      optimizationFreq: 'WEEKLY',
      totalBacktests: 30,
      bestSharpe: 2.20,
      bestWinRate: 0.64,
      bestPnlPct: 26.8,
      avgHoldTimeMin: 300,
    },
    // ─────────────────────────────────────────────────────────────
    // NEW SYSTEMS (15 added to reach 30+ total)
    // ─────────────────────────────────────────────────────────────
    // SMART_MONEY (+2 → 4 total)
    {
      name: 'Diamond Holder Mirror',
      description: 'Tracks long-hold smart money wallets that rarely trade but have 80%+ win rates. Holds positions for weeks.',
      category: 'SMART_MONEY',
      icon: '💎',
      assetFilter: JSON.stringify({ chains: ['SOL', 'ETH'], minSmartMoneyWinRate: 0.8, minAvgHoldDays: 14, tokenTypes: ['DEFI', 'L1', 'L2'], minLiquidity: 100000 }),
      phaseConfig: JSON.stringify({ enabled: ['GROWTH', 'MATURE', 'ESTABLISHED'], GROWTH: { minSmartMoneyBuys: 2 }, MATURE: { minSmartMoneyBuys: 1, minHoldDays: 7 }, ESTABLISHED: { minSmartMoneyBuys: 1, minHoldDays: 30 } }),
      entrySignal: JSON.stringify({ type: 'DIAMOND_HOLDER_FOLLOW', conditions: [{ field: 'smartMoneyWinRate', operator: '>=', value: 0.8 }, { field: 'smartMoneyAvgHoldDays', operator: '>=', value: 14 }, { field: 'smartMoneyBuys7d', operator: '>=', value: 1 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'TWAP', twapDurationMin: 180, slippageBps: 30, splitEntry: true, splits: 6 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 80, trailing: true, trailingPct: 15 }, stopLoss: { pct: 20, type: 'TRAILING' }, timeout: { minutes: 20160 }, signalExit: { smartMoneySellDetected: true, diamondHolderExitPct: 30 } }),
      bigDataContext: JSON.stringify({ anyRegime: true, avoidHighVolatility: true }),
      primaryTimeframe: '4h',
      confirmTimeframes: JSON.stringify(['1h', '1d']),
      maxPositionPct: 8,
      maxOpenPositions: 5,
      stopLossPct: 20,
      takeProfitPct: 80,
      trailingStopPct: 15,
      cashReservePct: 20,
      allocationMethod: 'KELLY_MODIFIED',
      allocationConfig: JSON.stringify({ kellyFraction: 0.35, maxAllocationPct: 8, minSmartMoneyWinRate: 0.8 }),
      isActive: true,
      isPaperTrading: true,
      version: 1,
      autoOptimize: true,
      optimizationMethod: 'BAYESIAN',
      optimizationFreq: 'MONTHLY',
      totalBacktests: 4,
      bestSharpe: 2.10,
      bestWinRate: 0.78,
      bestPnlPct: 55.2,
      avgHoldTimeMin: 10080,
    },
    {
      name: 'Whale Cluster Tracker',
      description: 'Monitors groups of whale wallets acting in concert. Detects synchronized accumulation/distribution patterns.',
      category: 'SMART_MONEY',
      icon: '🐋',
      assetFilter: JSON.stringify({ chains: ['ETH', 'SOL'], minWhaleClusterSize: 3, tokenTypes: ['DEFI', 'L1', 'L2'], minLiquidity: 200000 }),
      phaseConfig: JSON.stringify({ enabled: ['EARLY', 'GROWTH', 'MATURE'], EARLY: { minWhaleClusterSize: 3 }, GROWTH: { minWhaleClusterSize: 2, minSyncScore: 0.7 }, MATURE: { minWhaleClusterSize: 2, minSyncScore: 0.6 } }),
      entrySignal: JSON.stringify({ type: 'WHALE_CLUSTER', conditions: [{ field: 'whaleClusterSize', operator: '>=', value: 3 }, { field: 'syncAccumScore', operator: '>=', value: 0.7 }, { field: 'totalClusterAccumUsd', operator: '>=', value: 500000 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'TWAP', twapDurationMin: 90, slippageBps: 25, splitEntry: true, splits: 5 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 50, trailing: true, trailingPct: 10 }, stopLoss: { pct: 12, type: 'HARD' }, signalExit: { clusterDistribution: true, syncSellScore: 0.5 } }),
      bigDataContext: JSON.stringify({ anyRegime: true }),
      primaryTimeframe: '1h',
      confirmTimeframes: JSON.stringify(['15m', '4h']),
      maxPositionPct: 6,
      maxOpenPositions: 6,
      stopLossPct: 12,
      takeProfitPct: 50,
      trailingStopPct: 10,
      cashReservePct: 20,
      allocationMethod: 'SCORE_BASED',
      allocationConfig: JSON.stringify({ scoreWeights: { syncScore: 0.4, clusterSize: 0.3, accumUsd: 0.3 }, maxAllocationPct: 6 }),
      isActive: false,
      isPaperTrading: true,
      version: 1,
      autoOptimize: true,
      optimizationMethod: 'WALK_FORWARD',
      optimizationFreq: 'WEEKLY',
      totalBacktests: 5,
      bestSharpe: 1.80,
      bestWinRate: 0.64,
      bestPnlPct: 38.5,
      avgHoldTimeMin: 480,
    },
    // ALPHA_HUNTER (+2 → 4 total)
    {
      name: 'Liquidity Surge Alpha',
      description: 'Enters when sudden liquidity injections are detected before price discovery occurs.',
      category: 'ALPHA_HUNTER',
      icon: '⚡',
      assetFilter: JSON.stringify({ chains: ['SOL', 'ETH'], dexes: ['raydium', 'uniswap', 'orca'], tokenTypes: ['MEME', 'DEFI'], minLiquidity: 5000 }),
      phaseConfig: JSON.stringify({ enabled: ['GENESIS', 'LAUNCH'], GENESIS: { minLiquiditySurgePct: 100 }, LAUNCH: { minLiquiditySurgePct: 50, maxAgeMinutes: 60 } }),
      entrySignal: JSON.stringify({ type: 'LIQUIDITY_SURGE', conditions: [{ field: 'liquidityChange1h', operator: '>=', value: 50 }, { field: 'priceChange1h', operator: '<=', value: 5 }, { field: 'botActivityPct', operator: '<', value: 25 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'LIMIT', slippageBps: 150, useJito: true, splitEntry: true, splits: 2 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 30, trailing: true, trailingPct: 8 }, stopLoss: { pct: 10, type: 'HARD' }, timeout: { minutes: 180 }, signalExit: { liquidityDrainPct: 30 } }),
      bigDataContext: JSON.stringify({ requiredRegime: 'RISK_ON', maxVolatilityIndex: 70 }),
      primaryTimeframe: '15m',
      confirmTimeframes: JSON.stringify(['5m', '1h']),
      maxPositionPct: 3,
      maxOpenPositions: 6,
      stopLossPct: 10,
      takeProfitPct: 30,
      trailingStopPct: 8,
      cashReservePct: 30,
      allocationMethod: 'FIXED_FRACTIONAL',
      allocationConfig: JSON.stringify({ fractionPct: 2, maxAllocationPct: 3 }),
      isActive: true,
      isPaperTrading: true,
      version: 1,
      autoOptimize: false,
      totalBacktests: 3,
      bestSharpe: 1.45,
      bestWinRate: 0.55,
      bestPnlPct: 22.0,
      avgHoldTimeMin: 60,
    },
    {
      name: 'New Launch Scanner',
      description: 'Scans newly launched tokens with high smart money presence in first blocks.',
      category: 'ALPHA_HUNTER',
      icon: '🔍',
      assetFilter: JSON.stringify({ chains: ['SOL'], dexes: ['raydium', 'pump'], tokenTypes: ['MEME'], maxAgeMinutes: 5, minSmartMoneyPct: 8 }),
      phaseConfig: JSON.stringify({ enabled: ['GENESIS'], GENESIS: { maxEntryBlock: 5, minSmartMoneyBuys: 2, minVolumeUsd: 2000 } }),
      entrySignal: JSON.stringify({ type: 'LAUNCH_SCAN', conditions: [{ field: 'blockAge', operator: '<=', value: 5 }, { field: 'smartMoneyBuys', operator: '>=', value: 2 }, { field: 'initialLiquidityUsd', operator: '>=', value: 2000 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'MARKET', slippageBps: 300, useJito: true, jitoTipSOL: 0.002, maxRetries: 5 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 100, trailing: true, trailingPct: 20 }, stopLoss: { pct: 25, type: 'HARD' }, timeout: { minutes: 360 }, signalExit: { smartMoneySellCount: 2, botSpikePct: 40 } }),
      bigDataContext: JSON.stringify({ requiredRegime: 'RISK_ON', botSwarmAlert: 'AVOID' }),
      primaryTimeframe: '5m',
      confirmTimeframes: JSON.stringify(['1m', '15m']),
      maxPositionPct: 2,
      maxOpenPositions: 8,
      stopLossPct: 25,
      takeProfitPct: 100,
      trailingStopPct: 20,
      cashReservePct: 35,
      allocationMethod: 'FIXED_RATIO',
      allocationConfig: JSON.stringify({ ratioPerPosition: 0.02, maxAllocationPct: 2 }),
      isActive: false,
      isPaperTrading: true,
      version: 1,
      autoOptimize: false,
      totalBacktests: 2,
      bestSharpe: 1.20,
      bestWinRate: 0.40,
      bestPnlPct: 65.0,
      avgHoldTimeMin: 30,
    },
    // TECHNICAL (+2 → 4 total)
    {
      name: 'RSI Divergence Pro',
      description: 'Identifies RSI divergences across 3 timeframes for high-probability reversals.',
      category: 'TECHNICAL',
      icon: '📉',
      assetFilter: JSON.stringify({ chains: ['SOL', 'ETH'], tokenTypes: ['DEFI', 'L1', 'MEME'], minVolume24h: 50000, minLiquidity: 25000 }),
      phaseConfig: JSON.stringify({ enabled: ['GROWTH', 'MATURE', 'ESTABLISHED'], GROWTH: { minDivergenceTimeframes: 2 }, MATURE: { minDivergenceTimeframes: 3 }, ESTABLISHED: { minDivergenceTimeframes: 2 } }),
      entrySignal: JSON.stringify({ type: 'RSI_DIVERGENCE', conditions: [{ field: 'rsiDivergenceCount', operator: '>=', value: 3 }, { field: 'priceTrend', operator: '==', value: 'DIVERGENT' }, { field: 'volumeConfirmation', operator: '==', value: true }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'LIMIT', slippageBps: 50, splitEntry: true, splits: 3 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 25, trailing: true, trailingPct: 6 }, stopLoss: { pct: 8, type: 'HARD' }, signalExit: { rsiReversalComplete: true, divergenceInvalidated: true } }),
      bigDataContext: JSON.stringify({ anyRegime: true, avoidExtremeVolatility: true }),
      primaryTimeframe: '1h',
      confirmTimeframes: JSON.stringify(['15m', '4h', '1d']),
      maxPositionPct: 5,
      maxOpenPositions: 10,
      stopLossPct: 8,
      takeProfitPct: 25,
      trailingStopPct: 6,
      cashReservePct: 20,
      allocationMethod: 'VOLATILITY_TARGETING',
      allocationConfig: JSON.stringify({ targetVolatility: 15, maxAllocationPct: 5, lookbackDays: 30 }),
      isActive: true,
      isPaperTrading: true,
      version: 2,
      autoOptimize: true,
      optimizationMethod: 'GRID',
      optimizationFreq: 'WEEKLY',
      totalBacktests: 7,
      bestSharpe: 1.75,
      bestWinRate: 0.62,
      bestPnlPct: 19.8,
      avgHoldTimeMin: 240,
    },
    {
      name: 'Bollinger Squeeze Breakout',
      description: 'Detects Bollinger Band squeeze patterns before explosive moves.',
      category: 'TECHNICAL',
      icon: '📏',
      assetFilter: JSON.stringify({ chains: ['SOL', 'ETH'], tokenTypes: ['DEFI', 'L1', 'MEME'], minVolume24h: 30000, minLiquidity: 20000 }),
      phaseConfig: JSON.stringify({ enabled: ['GROWTH', 'MATURE'], GROWTH: { minSqueezeDurationBars: 10 }, MATURE: { minSqueezeDurationBars: 20 } }),
      entrySignal: JSON.stringify({ type: 'BOLLINGER_SQUEEZE', conditions: [{ field: 'bbWidth', operator: '<=', value: 0.02 }, { field: 'bbSqueezeDuration', operator: '>=', value: 10 }, { field: 'volumeAboveAvg', operator: '==', value: true }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'STOP_LIMIT', slippageBps: 80, stopOffsetPct: 0.3 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 35, trailing: true, trailingPct: 8 }, stopLoss: { pct: 10, type: 'HARD' }, signalExit: { bbExpansionComplete: true, volumeDeclinePct: 50 } }),
      bigDataContext: JSON.stringify({ anyRegime: true }),
      primaryTimeframe: '1h',
      confirmTimeframes: JSON.stringify(['15m', '4h']),
      maxPositionPct: 4,
      maxOpenPositions: 10,
      stopLossPct: 10,
      takeProfitPct: 35,
      trailingStopPct: 8,
      cashReservePct: 25,
      allocationMethod: 'MEAN_VARIANCE_OPTIMIZATION',
      allocationConfig: JSON.stringify({ riskFreeRate: 0.04, maxAllocationPct: 4, lookbackDays: 60 }),
      isActive: false,
      isPaperTrading: true,
      version: 1,
      autoOptimize: true,
      optimizationMethod: 'WALK_FORWARD',
      optimizationFreq: 'WEEKLY',
      totalBacktests: 4,
      bestSharpe: 1.55,
      bestWinRate: 0.58,
      bestPnlPct: 24.3,
      avgHoldTimeMin: 180,
    },
    // DEFENSIVE (+2 → 4 total)
    {
      name: 'Capital Preservation Shield',
      description: 'Ultra-conservative approach: only enters when 4+ safety signals align and bot activity is below 10%.',
      category: 'DEFENSIVE',
      icon: '🛡️',
      assetFilter: JSON.stringify({ chains: ['ETH', 'SOL'], maxBotActivityPct: 10, maxWashTradeProb: 0.05, minLiquidity: 500000, tokenTypes: ['DEFI', 'L1'], minMarketCap: 20000000 }),
      phaseConfig: JSON.stringify({ enabled: ['MATURE', 'ESTABLISHED'], MATURE: { minDaysSinceLaunch: 30, minSafetySignals: 4 }, ESTABLISHED: { minDaysSinceLaunch: 90, minSafetySignals: 3 } }),
      entrySignal: JSON.stringify({ type: 'SAFETY_CONFLUENCE', conditions: [{ field: 'safetySignalCount', operator: '>=', value: 4 }, { field: 'botActivityPct', operator: '<', value: 10 }, { field: 'smartMoneyScore', operator: '>=', value: 75 }, { field: 'riskScore', operator: '<=', value: 20 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'TWAP', twapDurationMin: 240, slippageBps: 10 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 15, trailing: true, trailingPct: 3 }, stopLoss: { pct: 5, type: 'HARD' }, signalExit: { safetySignalBroken: true, botActivitySpike: 15 } }),
      bigDataContext: JSON.stringify({ requiredRegime: 'NEUTRAL', maxFearGreed: 60 }),
      primaryTimeframe: '4h',
      confirmTimeframes: JSON.stringify(['1h', '1d']),
      maxPositionPct: 3,
      maxOpenPositions: 4,
      stopLossPct: 5,
      takeProfitPct: 15,
      trailingStopPct: 3,
      cashReservePct: 50,
      allocationMethod: 'MIN_VARIANCE',
      allocationConfig: JSON.stringify({ maxAllocationPct: 3, minVarianceThreshold: 0.02, lookbackDays: 90 }),
      isActive: true,
      isPaperTrading: false,
      version: 1,
      autoOptimize: true,
      optimizationMethod: 'BAYESIAN',
      optimizationFreq: 'MONTHLY',
      totalBacktests: 8,
      bestSharpe: 2.90,
      bestWinRate: 0.76,
      bestPnlPct: 8.5,
      avgHoldTimeMin: 4320,
    },
    {
      name: 'Drawdown Recovery Mode',
      description: 'Activates after portfolio drawdown events. Reduces position sizes and increases confirmation requirements.',
      category: 'DEFENSIVE',
      icon: '🩹',
      assetFilter: JSON.stringify({ chains: ['ETH', 'SOL'], tokenTypes: ['DEFI', 'L1'], minLiquidity: 300000, minMarketCap: 10000000, maxBotActivityPct: 15 }),
      phaseConfig: JSON.stringify({ enabled: ['MATURE', 'ESTABLISHED'], MATURE: { minDaysSinceLaunch: 14 }, ESTABLISHED: { minDaysSinceLaunch: 60 }, recoveryMode: { maxDrawdownPct: -10, positionSizeReduction: 0.5, extraConfirmations: 2 } }),
      entrySignal: JSON.stringify({ type: 'RECOVERY_GATE', conditions: [{ field: 'portfolioDrawdownPct', operator: '<=', value: -5 }, { field: 'riskScore', operator: '<=', value: 25 }, { field: 'smartMoneyScore', operator: '>=', value: 70 }, { field: 'confirmationCount', operator: '>=', value: 5 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'TWAP', twapDurationMin: 180, slippageBps: 15, reducedPositionPct: 50 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 10, trailing: true, trailingPct: 3 }, stopLoss: { pct: 5, type: 'HARD' }, signalExit: { portfolioRecovered: true, drawdownRecoveryPct: 80 } }),
      bigDataContext: JSON.stringify({ requiredRegime: 'NEUTRAL', maxVolatilityIndex: 40 }),
      primaryTimeframe: '1h',
      confirmTimeframes: JSON.stringify(['15m', '4h']),
      maxPositionPct: 2,
      maxOpenPositions: 3,
      stopLossPct: 5,
      takeProfitPct: 10,
      trailingStopPct: 3,
      cashReservePct: 60,
      allocationMethod: 'MAX_DRAWDOWN_CONTROL',
      allocationConfig: JSON.stringify({ maxDrawdownPct: 5, maxAllocationPct: 2, recoveryPositionScale: 0.5 }),
      isActive: false,
      isPaperTrading: true,
      version: 1,
      autoOptimize: true,
      optimizationMethod: 'WALK_FORWARD',
      optimizationFreq: 'MONTHLY',
      totalBacktests: 6,
      bestSharpe: 2.40,
      bestWinRate: 0.70,
      bestPnlPct: 6.2,
      avgHoldTimeMin: 1440,
    },
    // BOT_AWARE (+2 → 4 total)
    {
      name: 'MEV Protection Router',
      description: 'Routes transactions to avoid MEV extraction. Uses private mempool and timing optimization.',
      category: 'BOT_AWARE',
      icon: '🔒',
      assetFilter: JSON.stringify({ chains: ['SOL', 'ETH'], maxMevPct: 50, tokenTypes: ['MEME', 'DEFI'], minLiquidity: 15000 }),
      phaseConfig: JSON.stringify({ enabled: ['LAUNCH', 'EARLY', 'GROWTH'], LAUNCH: { usePrivateMempool: true, mevProtectionLevel: 'MAX' }, EARLY: { mevProtectionLevel: 'HIGH' }, GROWTH: { mevProtectionLevel: 'MEDIUM' } }),
      entrySignal: JSON.stringify({ type: 'MEV_PROTECTED', conditions: [{ field: 'mevExtractionRisk', operator: '<', value: 20 }, { field: 'sandwichRiskScore', operator: '<', value: 25 }, { field: 'privateMempoolAvailable', operator: '==', value: true }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'PRIVATE_LIMIT', useFlashbots: true, useJito: true, jitoTipSOL: 0.001, antiSandwich: true, timingOptimization: true, randomizeTimingMs: 500 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 30, trailing: true, trailingPct: 8 }, stopLoss: { pct: 12, type: 'HARD' }, signalExit: { mevAttackDetected: true, immediateExit: true } }),
      bigDataContext: JSON.stringify({ anyRegime: true, monitorMevActivity: true }),
      primaryTimeframe: '5m',
      confirmTimeframes: JSON.stringify(['1m', '15m']),
      maxPositionPct: 5,
      maxOpenPositions: 6,
      stopLossPct: 12,
      takeProfitPct: 30,
      trailingStopPct: 8,
      cashReservePct: 25,
      allocationMethod: 'EQUAL_WEIGHT',
      allocationConfig: JSON.stringify({ weightPerPosition: 5, maxWeight: 8 }),
      isActive: true,
      isPaperTrading: true,
      version: 1,
      autoOptimize: false,
      totalBacktests: 4,
      bestSharpe: 1.60,
      bestWinRate: 0.61,
      bestPnlPct: 18.5,
      avgHoldTimeMin: 45,
    },
    {
      name: 'Bot Noise Filter',
      description: 'Filters out bot-generated noise to find genuine price signals. Removes wash trade volume from analysis.',
      category: 'BOT_AWARE',
      icon: '🔇',
      assetFilter: JSON.stringify({ chains: ['SOL', 'ETH', 'BASE'], maxWashTradeProb: 0.2, tokenTypes: ['MEME', 'DEFI'], minLiquidity: 10000 }),
      phaseConfig: JSON.stringify({ enabled: ['EARLY', 'GROWTH', 'MATURE'], EARLY: { minWashTradeFilter: 0.85 }, GROWTH: { minWashTradeFilter: 0.80 }, MATURE: { minWashTradeFilter: 0.75 } }),
      entrySignal: JSON.stringify({ type: 'NOISE_FILTERED', conditions: [{ field: 'washTradeProb', operator: '<', value: 0.2 }, { field: 'organicVolumePct', operator: '>=', value: 60 }, { field: 'botNoiseFilteredSignal', operator: '==', value: true }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'LIMIT', slippageBps: 60, requireConfirmation: true }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 25, trailing: true, trailingPct: 6 }, stopLoss: { pct: 10, type: 'HARD' }, signalExit: { botNoiseSpike: 40, washTradeSpike: true } }),
      bigDataContext: JSON.stringify({ anyRegime: true }),
      primaryTimeframe: '15m',
      confirmTimeframes: JSON.stringify(['5m', '1h']),
      maxPositionPct: 5,
      maxOpenPositions: 8,
      stopLossPct: 10,
      takeProfitPct: 25,
      trailingStopPct: 6,
      cashReservePct: 20,
      allocationMethod: 'RISK_PARITY',
      allocationConfig: JSON.stringify({ riskBudgetPct: 5, maxAllocationPct: 5, noisePenaltyFactor: 0.5 }),
      isActive: false,
      isPaperTrading: true,
      version: 1,
      autoOptimize: true,
      optimizationMethod: 'GRID',
      optimizationFreq: 'WEEKLY',
      totalBacktests: 3,
      bestSharpe: 1.35,
      bestWinRate: 0.59,
      bestPnlPct: 15.4,
      avgHoldTimeMin: 180,
    },
    // DEEP_ANALYSIS (+2 → 4 total)
    {
      name: 'On-Chain Fundamentals',
      description: 'Analyzes holder distribution, dev wallet activity, and contract security for undervalued tokens.',
      category: 'DEEP_ANALYSIS',
      icon: '⛓️',
      assetFilter: JSON.stringify({ chains: ['ETH', 'SOL'], tokenTypes: ['DEFI', 'L1', 'L2'], minLiquidity: 150000, minHolderCount: 500, maxDevWalletPct: 10, minContractSecurityScore: 60 }),
      phaseConfig: JSON.stringify({ enabled: ['GROWTH', 'MATURE', 'ESTABLISHED'], GROWTH: { minDaysActive: 7, minSecurityScore: 60 }, MATURE: { minDaysActive: 30, minSecurityScore: 70 }, ESTABLISHED: { minDaysActive: 90, minSecurityScore: 80 } }),
      entrySignal: JSON.stringify({ type: 'ONCHAIN_FUNDAMENTAL', conditions: [{ field: 'holderDistributionScore', operator: '>=', value: 65 }, { field: 'devWalletActivity', operator: '<=', value: 'LOW' }, { field: 'contractSecurityScore', operator: '>=', value: 70 }, { field: 'undervaluedScore', operator: '>=', value: 60 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'TWAP', twapDurationMin: 300, slippageBps: 15 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 50, trailing: true, trailingPct: 10 }, stopLoss: { pct: 15, type: 'HARD' }, signalExit: { fundamentalDeterioration: true, devWalletAnomaly: true } }),
      bigDataContext: JSON.stringify({ anyRegime: true }),
      primaryTimeframe: '4h',
      confirmTimeframes: JSON.stringify(['1h', '1d']),
      maxPositionPct: 5,
      maxOpenPositions: 6,
      stopLossPct: 15,
      takeProfitPct: 50,
      trailingStopPct: 10,
      cashReservePct: 15,
      allocationMethod: 'SCORE_BASED',
      allocationConfig: JSON.stringify({ scoreWeights: { holderDistribution: 0.3, contractSecurity: 0.3, devWalletSafety: 0.2, undervalued: 0.2 }, maxAllocationPct: 5 }),
      isActive: true,
      isPaperTrading: false,
      version: 1,
      autoOptimize: true,
      optimizationMethod: 'BAYESIAN',
      optimizationFreq: 'MONTHLY',
      totalBacktests: 5,
      bestSharpe: 2.20,
      bestWinRate: 0.68,
      bestPnlPct: 32.1,
      avgHoldTimeMin: 2880,
    },
    {
      name: 'Token DNA Profiler',
      description: 'Uses the Token DNA system (Liquidity, Wallet, Topological) to find tokens with favorable DNA profiles.',
      category: 'DEEP_ANALYSIS',
      icon: '🧬',
      assetFilter: JSON.stringify({ chains: ['SOL', 'ETH'], tokenTypes: ['DEFI', 'L1', 'MEME'], minLiquidity: 50000, minDnaScore: 60 }),
      phaseConfig: JSON.stringify({ enabled: ['EARLY', 'GROWTH', 'MATURE'], EARLY: { minDnaScore: 65 }, GROWTH: { minDnaScore: 60 }, MATURE: { minDnaScore: 55 } }),
      entrySignal: JSON.stringify({ type: 'DNA_PROFILE', conditions: [{ field: 'liquidityDnaScore', operator: '>=', value: 60 }, { field: 'walletDnaScore', operator: '>=', value: 60 }, { field: 'topologicalDnaScore', operator: '>=', value: 60 }, { field: 'compositeDnaScore', operator: '>=', value: 65 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'LIMIT', slippageBps: 40, splitEntry: true, splits: 4 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 40, trailing: true, trailingPct: 8 }, stopLoss: { pct: 12, type: 'HARD' }, signalExit: { dnaScoreDrop: 15, profileDeterioration: true } }),
      bigDataContext: JSON.stringify({ anyRegime: true }),
      primaryTimeframe: '1h',
      confirmTimeframes: JSON.stringify(['15m', '4h']),
      maxPositionPct: 4,
      maxOpenPositions: 8,
      stopLossPct: 12,
      takeProfitPct: 40,
      trailingStopPct: 8,
      cashReservePct: 20,
      allocationMethod: 'CUSTOM_COMPOSITE',
      allocationConfig: JSON.stringify({ compositeWeights: { liquidityDna: 0.35, walletDna: 0.35, topologicalDna: 0.3 }, maxAllocationPct: 4 }),
      isActive: false,
      isPaperTrading: true,
      version: 1,
      autoOptimize: true,
      optimizationMethod: 'WALK_FORWARD',
      optimizationFreq: 'WEEKLY',
      totalBacktests: 3,
      bestSharpe: 1.65,
      bestWinRate: 0.63,
      bestPnlPct: 27.8,
      avgHoldTimeMin: 360,
    },
    // MICRO_STRUCTURE (+2 → 3 total)
    {
      name: 'DEX Order Flow Imbalance',
      description: 'Detects order flow imbalances in DEX order books before price moves.',
      category: 'MICRO_STRUCTURE',
      icon: '📊',
      assetFilter: JSON.stringify({ chains: ['SOL'], dexes: ['raydium', 'orca'], tokenTypes: ['MEME', 'DEFI'], minLiquidity: 20000 }),
      phaseConfig: JSON.stringify({ enabled: ['LAUNCH', 'EARLY', 'GROWTH'], LAUNCH: { minVolumeUsd: 3000 }, EARLY: { minVolumeUsd: 15000 }, GROWTH: { minVolumeUsd: 50000 } }),
      entrySignal: JSON.stringify({ type: 'DEX_ORDER_FLOW', conditions: [{ field: 'dexBuySellRatio', operator: '>=', value: 2.5 }, { field: 'orderFlowImbalance', operator: '>=', value: 0.6 }, { field: 'thinLiquidityAhead', operator: '==', value: true }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'MARKET', slippageBps: 100, useJito: true, jitoTipSOL: 0.0015 }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 20, trailing: false }, stopLoss: { pct: 8, type: 'HARD' }, timeout: { minutes: 45 }, signalExit: { flowReversalDetected: true, imbalanceNormalize: true } }),
      bigDataContext: JSON.stringify({ anyRegime: true, monitorDexFlow: true }),
      primaryTimeframe: '1m',
      confirmTimeframes: JSON.stringify(['5m']),
      maxPositionPct: 3,
      maxOpenPositions: 12,
      stopLossPct: 8,
      takeProfitPct: 20,
      cashReservePct: 30,
      allocationMethod: 'KELLY_MODIFIED',
      allocationConfig: JSON.stringify({ kellyFraction: 0.2, flowImbalanceWeight: 0.6 }),
      isActive: true,
      isPaperTrading: true,
      version: 1,
      autoOptimize: true,
      optimizationMethod: 'GENETIC',
      optimizationFreq: 'DAILY',
      totalBacktests: 6,
      bestSharpe: 1.70,
      bestWinRate: 0.62,
      bestPnlPct: 14.5,
      avgHoldTimeMin: 20,
    },
    {
      name: 'Tick-by-Tick Scalper',
      description: 'Ultra-fast scalping on tick data. Requires sub-second execution.',
      category: 'MICRO_STRUCTURE',
      icon: '⚡',
      assetFilter: JSON.stringify({ chains: ['SOL'], dexes: ['raydium', 'orca'], tokenTypes: ['MEME', 'DEFI'], minLiquidity: 50000, minTickVolume: 100 }),
      phaseConfig: JSON.stringify({ enabled: ['LAUNCH', 'EARLY'], LAUNCH: { minTickRate: 10 }, EARLY: { minTickRate: 5 } }),
      entrySignal: JSON.stringify({ type: 'TICK_SCALP', conditions: [{ field: 'tickDirection', operator: '==', value: 'BUY_DOMINANT' }, { field: 'tickVelocity', operator: '>=', value: 5 }, { field: 'spreadBps', operator: '<=', value: 50 }], logic: 'AND' }),
      executionConfig: JSON.stringify({ orderType: 'MARKET', slippageBps: 50, useJito: true, jitoTipSOL: 0.003, requireSubSecond: true }),
      exitSignal: JSON.stringify({ takeProfit: { pct: 10, trailing: false }, stopLoss: { pct: 5, type: 'HARD' }, timeout: { minutes: 5 }, signalExit: { tickDirectionReversal: true } }),
      bigDataContext: JSON.stringify({ anyRegime: true, requireLowLatency: true }),
      primaryTimeframe: '1m',
      confirmTimeframes: JSON.stringify([]),
      maxPositionPct: 2,
      maxOpenPositions: 20,
      stopLossPct: 5,
      takeProfitPct: 10,
      cashReservePct: 35,
      allocationMethod: 'FIXED_FRACTIONAL',
      allocationConfig: JSON.stringify({ fractionPct: 1.5, maxAllocationPct: 2 }),
      isActive: false,
      isPaperTrading: true,
      version: 1,
      autoOptimize: false,
      totalBacktests: 2,
      bestSharpe: 1.30,
      bestWinRate: 0.56,
      bestPnlPct: 8.2,
      avgHoldTimeMin: 3,
    },
    // ADAPTIVE (+1 → 3 total)
    {
      name: 'Bayesian Regime Switcher',
      description: 'Uses Bayesian inference to detect regime changes and adapt strategy parameters in real-time.',
      category: 'ADAPTIVE',
      icon: '🎲',
      assetFilter: JSON.stringify({ chains: ['SOL', 'ETH'], tokenTypes: ['DEFI', 'L1', 'MEME', 'L2'], minLiquidity: 20000 }),
      phaseConfig: JSON.stringify({ enabled: ['LAUNCH', 'EARLY', 'GROWTH', 'MATURE'], regimePriors: { RISK_ON: 0.33, RISK_OFF: 0.33, NEUTRAL: 0.34 }, transitionMatrix: { RISK_ON_RISK_OFF: 0.1, RISK_ON_NEUTRAL: 0.2, RISK_OFF_NEUTRAL: 0.2 } }),
      entrySignal: JSON.stringify({ type: 'BAYESIAN_REGIME', conditions: { RISK_ON: [{ field: 'regimePosteriorPct', operator: '>=', value: 0.7 }, { field: 'momentumScore', operator: '>=', value: 65 }], RISK_OFF: [{ field: 'regimePosteriorPct', operator: '>=', value: 0.7 }, { field: 'safetyScore', operator: '>=', value: 75 }], NEUTRAL: [{ field: 'regimePosteriorPct', operator: '>=', value: 0.6 }, { field: 'smartMoneyScore', operator: '>=', value: 60 }] } }),
      executionConfig: JSON.stringify({ orderType: 'ADAPTIVE', RISK_ON: { slippageBps: 80 }, RISK_OFF: { slippageBps: 15 }, NEUTRAL: { slippageBps: 40 } }),
      exitSignal: JSON.stringify({ RISK_ON: { takeProfit: { pct: 30, trailing: true, trailingPct: 10 }, stopLoss: { pct: 10 } }, RISK_OFF: { takeProfit: { pct: 10, trailing: true, trailingPct: 3 }, stopLoss: { pct: 5 } }, NEUTRAL: { takeProfit: { pct: 20, trailing: true, trailingPct: 6 }, stopLoss: { pct: 8 } } }),
      bigDataContext: JSON.stringify({ regimeDetection: true, bayesianInference: true, minPosteriorConfidence: 0.7, updateFreq: '1m' }),
      primaryTimeframe: '1h',
      confirmTimeframes: JSON.stringify(['15m', '4h']),
      maxPositionPct: 5,
      maxOpenPositions: 8,
      stopLossPct: 10,
      takeProfitPct: 30,
      trailingStopPct: 8,
      cashReservePct: 25,
      allocationMethod: 'REGIME_BASED',
      allocationConfig: JSON.stringify({ regimeWeights: { RISK_ON: 1.5, NEUTRAL: 1.0, RISK_OFF: 0.5 }, maxAllocationPct: 5, posteriorThreshold: 0.7 }),
      isActive: true,
      isPaperTrading: true,
      version: 1,
      autoOptimize: true,
      optimizationMethod: 'BAYESIAN',
      optimizationFreq: 'WEEKLY',
      totalBacktests: 9,
      bestSharpe: 2.35,
      bestWinRate: 0.65,
      bestPnlPct: 28.4,
      avgHoldTimeMin: 360,
    },
  ];

  const tradingSystems: any[] = [];
  for (const sysData of tradingSystemsData) {
    const system = await prisma.tradingSystem.create({ data: sysData });
    tradingSystems.push(system);
  }
  console.log(`✅ Created ${tradingSystems.length} trading systems across 8 categories`);

  // ============================================================
  // 12. CREATE BACKTEST RUNS (8: 5 COMPLETED, 2 RUNNING, 1 FAILED)
  // ============================================================
  const backtestsData = [
    // COMPLETED (5)
    {
      systemId: tradingSystems[0].id, // Sniper Genesis
      mode: 'HISTORICAL',
      periodStart: new Date('2024-10-01'),
      periodEnd: new Date('2025-01-15'),
      initialCapital: 10000,
      capitalAllocation: JSON.stringify({ method: 'KELLY_MODIFIED', kellyFraction: 0.25 }),
      allocationMethod: 'KELLY_MODIFIED',
      finalCapital: 14250,
      totalPnl: 4250,
      totalPnlPct: 42.5,
      annualizedReturn: 48.2,
      benchmarkReturn: 12.5,
      alpha: 35.7,
      totalTrades: 156,
      winTrades: 91,
      lossTrades: 65,
      winRate: 0.583,
      avgWin: 87.50,
      avgLoss: -55.38,
      profitFactor: 2.19,
      expectancy: 27.24,
      maxDrawdown: -1850,
      maxDrawdownPct: -12.3,
      sharpeRatio: 1.85,
      sortinoRatio: 2.42,
      calmarRatio: 3.46,
      recoveryFactor: 2.30,
      avgHoldTimeMin: 45,
      marketExposurePct: 35,
      phaseResults: JSON.stringify({ GENESIS: { trades: 45, winRate: 0.51, pnlPct: 8.2 }, LAUNCH: { trades: 78, winRate: 0.62, pnlPct: 25.1 }, EARLY: { trades: 33, winRate: 0.58, pnlPct: 9.2 } }),
      timeframeResults: JSON.stringify({ '5m': { trades: 89, winRate: 0.55, pnlPct: 18.5 }, '15m': { trades: 67, winRate: 0.63, pnlPct: 24.0 } }),
      operationTypeResults: JSON.stringify({ SCALP: { trades: 89, winRate: 0.56 }, SWING_LONG: { trades: 67, winRate: 0.61 } }),
      allocationMethodResults: JSON.stringify({ KELLY_MODIFIED: { avgAllocationPct: 2.8, bestAllocationPct: 3.0 } }),
      optimizationEnabled: true,
      optimizationMethod: 'WALK_FORWARD',
      bestParameters: JSON.stringify({ kellyFraction: 0.28, stopLossPct: 14, takeProfitPct: 45 }),
      optimizationScore: 0.82,
      inSampleScore: 1.85,
      outOfSampleScore: 1.62,
      walkForwardRatio: 0.88,
      status: 'COMPLETED',
      progress: 1.0,
      startedAt: new Date('2025-01-16T10:00:00Z'),
      completedAt: new Date('2025-01-16T10:45:00Z'),
    },
    {
      systemId: tradingSystems[2].id, // Smart Entry Mirror
      mode: 'HISTORICAL',
      periodStart: new Date('2024-06-01'),
      periodEnd: new Date('2025-01-31'),
      initialCapital: 25000,
      capitalAllocation: JSON.stringify({ method: 'KELLY_MODIFIED', kellyFraction: 0.35 }),
      allocationMethod: 'KELLY_MODIFIED',
      finalCapital: 33800,
      totalPnl: 8800,
      totalPnlPct: 35.2,
      annualizedReturn: 38.5,
      benchmarkReturn: 18.2,
      alpha: 20.3,
      totalTrades: 89,
      winTrades: 61,
      lossTrades: 28,
      winRate: 0.685,
      avgWin: 245.00,
      avgLoss: -142.86,
      profitFactor: 3.72,
      expectancy: 98.88,
      maxDrawdown: -2250,
      maxDrawdownPct: -8.2,
      sharpeRatio: 2.45,
      sortinoRatio: 3.15,
      calmarRatio: 4.69,
      recoveryFactor: 3.91,
      avgHoldTimeMin: 360,
      marketExposurePct: 45,
      phaseResults: JSON.stringify({ EARLY: { trades: 28, winRate: 0.71, pnlPct: 14.5 }, GROWTH: { trades: 45, winRate: 0.67, pnlPct: 18.2 }, MATURE: { trades: 16, winRate: 0.69, pnlPct: 2.5 } }),
      timeframeResults: JSON.stringify({ '1h': { trades: 52, winRate: 0.71, pnlPct: 22.1 }, '4h': { trades: 37, winRate: 0.65, pnlPct: 13.1 } }),
      operationTypeResults: JSON.stringify({ DCA_ENTRY: { trades: 35, winRate: 0.74 }, SWING_LONG: { trades: 54, winRate: 0.65 } }),
      allocationMethodResults: JSON.stringify({ KELLY_MODIFIED: { avgAllocationPct: 4.5, bestAllocationPct: 5.0 } }),
      optimizationEnabled: true,
      optimizationMethod: 'BAYESIAN',
      bestParameters: JSON.stringify({ kellyFraction: 0.38, minSmartMoneyScore: 72, trailingStopPct: 7 }),
      optimizationScore: 0.89,
      inSampleScore: 2.45,
      outOfSampleScore: 2.18,
      walkForwardRatio: 0.89,
      status: 'COMPLETED',
      progress: 1.0,
      startedAt: new Date('2025-02-01T08:00:00Z'),
      completedAt: new Date('2025-02-01T09:20:00Z'),
    },
    {
      systemId: tradingSystems[6].id, // Rug Pull Avoider
      mode: 'HISTORICAL',
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2025-02-01'),
      initialCapital: 50000,
      capitalAllocation: JSON.stringify({ method: 'CONSERVATIVE', maxAllocationPct: 3 }),
      allocationMethod: 'CONSERVATIVE',
      finalCapital: 57800,
      totalPnl: 7800,
      totalPnlPct: 15.6,
      annualizedReturn: 10.4,
      benchmarkReturn: 8.5,
      alpha: 1.9,
      totalTrades: 210,
      winTrades: 158,
      lossTrades: 52,
      winRate: 0.752,
      avgWin: 85.00,
      avgLoss: -105.77,
      profitFactor: 2.44,
      expectancy: 37.14,
      maxDrawdown: -3450,
      maxDrawdownPct: -6.2,
      sharpeRatio: 2.80,
      sortinoRatio: 3.82,
      calmarRatio: 1.68,
      recoveryFactor: 2.26,
      avgHoldTimeMin: 720,
      marketExposurePct: 25,
      phaseResults: JSON.stringify({ GENESIS: { trades: 52, winRate: 0.71, pnlPct: 3.1 }, LAUNCH: { trades: 85, winRate: 0.76, pnlPct: 6.8 }, EARLY: { trades: 73, winRate: 0.78, pnlPct: 5.7 } }),
      timeframeResults: JSON.stringify({ '1h': { trades: 125, winRate: 0.76, pnlPct: 9.2 }, '4h': { trades: 85, winRate: 0.74, pnlPct: 6.4 } }),
      operationTypeResults: JSON.stringify({ SWING_LONG: { trades: 130, winRate: 0.77 }, DCA_ENTRY: { trades: 80, winRate: 0.73 } }),
      allocationMethodResults: JSON.stringify({ CONSERVATIVE: { avgAllocationPct: 2.5, bestAllocationPct: 3.0 } }),
      optimizationEnabled: true,
      optimizationMethod: 'WALK_FORWARD',
      bestParameters: JSON.stringify({ maxAllocationPct: 3, minSafetyScore: 82, stopLossPct: 8 }),
      optimizationScore: 0.91,
      inSampleScore: 2.80,
      outOfSampleScore: 2.55,
      walkForwardRatio: 0.91,
      status: 'COMPLETED',
      progress: 1.0,
      startedAt: new Date('2025-02-02T12:00:00Z'),
      completedAt: new Date('2025-02-02T14:30:00Z'),
    },
    {
      systemId: tradingSystems[10].id, // MEV Shadow
      mode: 'HISTORICAL',
      periodStart: new Date('2024-09-01'),
      periodEnd: new Date('2025-01-31'),
      initialCapital: 15000,
      capitalAllocation: JSON.stringify({ method: 'KELLY_MODIFIED', kellyFraction: 0.2, mevPenaltyFactor: 0.5 }),
      allocationMethod: 'KELLY_MODIFIED',
      finalCapital: 18045,
      totalPnl: 3045,
      totalPnlPct: 20.3,
      annualizedReturn: 25.1,
      benchmarkReturn: 10.8,
      alpha: 14.3,
      totalTrades: 312,
      winTrades: 187,
      lossTrades: 125,
      winRate: 0.599,
      avgWin: 42.50,
      avgLoss: -39.24,
      profitFactor: 1.63,
      expectancy: 9.76,
      maxDrawdown: -2100,
      maxDrawdownPct: -13.2,
      sharpeRatio: 1.55,
      sortinoRatio: 1.98,
      calmarRatio: 1.90,
      recoveryFactor: 1.45,
      avgHoldTimeMin: 60,
      marketExposurePct: 55,
      phaseResults: JSON.stringify({ LAUNCH: { trades: 95, winRate: 0.55, pnlPct: 5.2 }, EARLY: { trades: 128, winRate: 0.62, pnlPct: 11.5 }, GROWTH: { trades: 89, winRate: 0.63, pnlPct: 3.6 } }),
      timeframeResults: JSON.stringify({ '5m': { trades: 180, winRate: 0.58, pnlPct: 10.5 }, '1m': { trades: 132, winRate: 0.62, pnlPct: 9.8 } }),
      operationTypeResults: JSON.stringify({ SCALP: { trades: 210, winRate: 0.60 }, MOMENTUM_RIDE: { trades: 102, winRate: 0.59 } }),
      allocationMethodResults: JSON.stringify({ KELLY_MODIFIED: { avgAllocationPct: 3.2, mevSavingsUsd: 450 } }),
      optimizationEnabled: false,
      status: 'COMPLETED',
      progress: 1.0,
      startedAt: new Date('2025-02-03T15:00:00Z'),
      completedAt: new Date('2025-02-03T15:35:00Z'),
    },
    {
      systemId: tradingSystems[13].id, // Regime Switcher
      mode: 'HISTORICAL',
      periodStart: new Date('2024-03-01'),
      periodEnd: new Date('2025-02-01'),
      initialCapital: 20000,
      capitalAllocation: JSON.stringify({ method: 'KELLY_MODIFIED', kellyFraction: 0.3, regimeAdjustment: true }),
      allocationMethod: 'KELLY_MODIFIED',
      finalCapital: 26100,
      totalPnl: 6100,
      totalPnlPct: 30.5,
      annualizedReturn: 26.8,
      benchmarkReturn: 15.3,
      alpha: 11.5,
      totalTrades: 245,
      winTrades: 164,
      lossTrades: 81,
      winRate: 0.669,
      avgWin: 72.50,
      avgLoss: -72.22,
      profitFactor: 2.02,
      expectancy: 24.90,
      maxDrawdown: -3200,
      maxDrawdownPct: -14.5,
      sharpeRatio: 2.65,
      sortinoRatio: 3.28,
      calmarRatio: 1.84,
      recoveryFactor: 1.91,
      avgHoldTimeMin: 480,
      marketExposurePct: 40,
      phaseResults: JSON.stringify({ RISK_ON: { trades: 95, winRate: 0.68, pnlPct: 22.1 }, RISK_OFF: { trades: 62, winRate: 0.73, pnlPct: 3.5 }, NEUTRAL: { trades: 88, winRate: 0.61, pnlPct: 4.9 } }),
      timeframeResults: JSON.stringify({ '1h': { trades: 142, winRate: 0.67, pnlPct: 18.2 }, '4h': { trades: 103, winRate: 0.66, pnlPct: 12.3 } }),
      operationTypeResults: JSON.stringify({ MOMENTUM_RIDE: { trades: 95, winRate: 0.68 }, SWING_LONG: { trades: 88, winRate: 0.61 }, DCA_ENTRY: { trades: 62, winRate: 0.73 } }),
      allocationMethodResults: JSON.stringify({ KELLY_MODIFIED: { RISK_ON: { avgPct: 4.5 }, RISK_OFF: { avgPct: 2.0 }, NEUTRAL: { avgPct: 3.5 } } }),
      optimizationEnabled: true,
      optimizationMethod: 'ENSEMBLE',
      bestParameters: JSON.stringify({ regimeConfidence: 0.75, RISK_ON_kelly: 0.4, RISK_OFF_kelly: 0.15, NEUTRAL_kelly: 0.3 }),
      optimizationScore: 0.86,
      inSampleScore: 2.65,
      outOfSampleScore: 2.30,
      walkForwardRatio: 0.87,
      status: 'COMPLETED',
      progress: 1.0,
      startedAt: new Date('2025-02-04T09:00:00Z'),
      completedAt: new Date('2025-02-04T10:15:00Z'),
    },
    // RUNNING (2)
    {
      systemId: tradingSystems[4].id, // Momentum Breakout
      mode: 'HISTORICAL',
      periodStart: new Date('2024-08-01'),
      periodEnd: new Date('2025-02-28'),
      initialCapital: 10000,
      capitalAllocation: JSON.stringify({ method: 'KELLY_MODIFIED', kellyFraction: 0.2 }),
      allocationMethod: 'KELLY_MODIFIED',
      finalCapital: 0,
      totalPnl: 0,
      totalPnlPct: 0,
      totalTrades: 87,
      winTrades: 48,
      lossTrades: 39,
      winRate: 0.552,
      avgWin: 55.00,
      avgLoss: -42.31,
      profitFactor: 1.60,
      maxDrawdown: -1200,
      maxDrawdownPct: -10.8,
      sharpeRatio: 1.42,
      phaseResults: JSON.stringify({ GROWTH: { trades: 52, winRate: 0.54, pnlPct: 5.8 }, MATURE: { trades: 35, winRate: 0.57, pnlPct: 4.1 } }),
      timeframeResults: JSON.stringify({ '1h': { trades: 52, winRate: 0.56 }, '15m': { trades: 35, winRate: 0.54 } }),
      status: 'RUNNING',
      progress: 0.67,
      startedAt: new Date('2025-03-04T08:00:00Z'),
    },
    {
      systemId: tradingSystems[14].id, // Multi-Strategy Fusion
      mode: 'PAPER',
      periodStart: new Date('2025-01-01'),
      periodEnd: new Date('2025-03-15'),
      initialCapital: 30000,
      capitalAllocation: JSON.stringify({ method: 'KELLY_MODIFIED', kellyFraction: 0.25, ensembleConfidenceWeight: 0.4 }),
      allocationMethod: 'KELLY_MODIFIED',
      finalCapital: 0,
      totalPnl: 0,
      totalPnlPct: 0,
      totalTrades: 42,
      winTrades: 27,
      lossTrades: 15,
      winRate: 0.643,
      avgWin: 95.00,
      avgLoss: -68.00,
      profitFactor: 2.50,
      maxDrawdown: -800,
      maxDrawdownPct: -2.5,
      sharpeRatio: 1.88,
      phaseResults: JSON.stringify({ LAUNCH: { trades: 8, winRate: 0.50 }, EARLY: { trades: 18, winRate: 0.67 }, GROWTH: { trades: 16, winRate: 0.69 } }),
      timeframeResults: JSON.stringify({ '1h': { trades: 25, winRate: 0.64 }, '15m': { trades: 17, winRate: 0.65 } }),
      status: 'RUNNING',
      progress: 0.42,
      startedAt: new Date('2025-03-04T10:30:00Z'),
    },
    // FAILED (1)
    {
      systemId: tradingSystems[1].id, // Meme Rocket
      mode: 'HISTORICAL',
      periodStart: new Date('2024-11-01'),
      periodEnd: new Date('2025-02-01'),
      initialCapital: 8000,
      capitalAllocation: JSON.stringify({ method: 'KELLY_MODIFIED', kellyFraction: 0.3 }),
      allocationMethod: 'KELLY_MODIFIED',
      finalCapital: 0,
      totalPnl: 0,
      totalPnlPct: 0,
      totalTrades: 23,
      winTrades: 12,
      lossTrades: 11,
      winRate: 0.522,
      maxDrawdown: -2400,
      maxDrawdownPct: -28.5,
      status: 'FAILED',
      progress: 0.18,
      startedAt: new Date('2025-03-03T14:00:00Z'),
      completedAt: new Date('2025-03-03T14:12:00Z'),
      errorLog: 'Backtest failed: Insufficient historical data for 3 tokens. Data source timeout after 300s. Tokens with missing candles: [0xabc..., 0xdef..., 0xghi...]. Consider reducing the asset filter scope or adding fallback data sources.',
    },
  ];

  const backtestRuns: any[] = [];
  for (const btData of backtestsData) {
    const run = await prisma.backtestRun.create({ data: btData });
    backtestRuns.push(run);
  }
  console.log(`✅ Created ${backtestRuns.length} backtest runs (5 completed, 2 running, 1 failed)`);

  // ============================================================
  // 13. CREATE BACKTEST OPERATIONS (50 spread across completed backtests)
  // ============================================================
  const completedBacktests = backtestRuns.filter(b => b.status === 'COMPLETED');
  const solTokens = tokens.filter(t => t.chain === 'SOL');
  const ethTokens = tokens.filter(t => t.chain === 'ETH');
  const operationTypes = ['SCALP', 'SWING_LONG', 'DCA_ENTRY', 'MOMENTUM_RIDE', 'DCA_EXIT', 'SCALP_LONG'];
  const tokenPhases = ['GENESIS', 'LAUNCH', 'EARLY', 'GROWTH', 'MATURE', 'ESTABLISHED'];
  const exitReasons = ['TAKE_PROFIT', 'STOP_LOSS', 'TRAILING_STOP', 'SIGNAL_EXIT', 'TIMEOUT'];
  const timeframes = ['1m', '5m', '15m', '1h', '4h'];

  let opCount = 0;
  const opsPerBacktest = [12, 15, 10, 8, 5]; // 50 total

  for (let btIdx = 0; btIdx < completedBacktests.length; btIdx++) {
    const bt = completedBacktests[btIdx];
    const system = tradingSystems.find(s => s.id === bt.systemId);
    const numOps = opsPerBacktest[btIdx] || 8;
    const isSolSystem = system?.category === 'ALPHA_HUNTER' || system?.category === 'MICRO_STRUCTURE' || Math.random() > 0.5;
    const tokenPool = isSolSystem ? solTokens : ethTokens;

    for (let i = 0; i < numOps; i++) {
      const token = tokenPool[Math.floor(Math.random() * tokenPool.length)];
      const opType = operationTypes[Math.floor(Math.random() * operationTypes.length)];
      const phase = tokenPhases[Math.floor(Math.random() * tokenPhases.length)];
      const tf = timeframes[Math.floor(Math.random() * timeframes.length)];
      const isWin = Math.random() < bt.winRate;
      const entryPrice = token.priceUsd * randomBetween(0.7, 1.3);
      const priceMovement = isWin ? randomBetween(0.02, 0.35) : randomBetween(-0.15, -0.03);
      const exitPrice = entryPrice * (1 + priceMovement);
      const quantity = randomBetween(50, 5000);
      const positionSizeUsd = entryPrice * quantity;
      const pnlUsd = (exitPrice - entryPrice) * quantity;
      const holdTime = opType === 'SCALP' ? randomBetween(1, 30) : opType === 'DCA_ENTRY' ? randomBetween(60, 720) : randomBetween(30, 1440);

      await prisma.backtestOperation.create({
        data: {
          backtestId: bt.id,
          systemId: bt.systemId,
          tokenAddress: token.address,
          tokenSymbol: token.symbol,
          chain: token.chain,
          tokenPhase: phase,
          tokenAgeMinutes: phase === 'GENESIS' ? randomBetween(0, 5) : phase === 'LAUNCH' ? randomBetween(5, 60) : phase === 'EARLY' ? randomBetween(60, 1440) : phase === 'GROWTH' ? randomBetween(1440, 10080) : randomBetween(10080, 43200),
          marketConditions: JSON.stringify({ regime: ['RISK_ON', 'NEUTRAL', 'RISK_OFF'][Math.floor(Math.random() * 3)], volatilityIndex: randomBetween(20, 80), trendStrength: randomBetween(0.2, 0.9) }),
          tokenDnaSnapshot: JSON.stringify({ riskScore: Math.floor(randomBetween(15, 85)), botActivityPct: randomBetween(5, 40), smartMoneyScore: randomBetween(10, 80), holderCount: Math.floor(randomBetween(50, 10000)) }),
          traderComposition: JSON.stringify({ smartMoney: Math.floor(randomBetween(2, 15)), whale: Math.floor(randomBetween(1, 8)), bot_mev: Math.floor(randomBetween(3, 20)), retail: Math.floor(randomBetween(30, 60)) }),
          bigDataContext: JSON.stringify({ regime: ['RISK_ON', 'NEUTRAL', 'RISK_OFF'][Math.floor(Math.random() * 3)], botSwarmLevel: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] }),
          operationType: opType,
          timeframe: tf,
          entryPrice,
          entryTime: new Date(Date.now() - randomBetween(86400000, 90 * 86400000)),
          entryReason: JSON.stringify({ signal: ['momentum_breakout', 'smart_money_accumulation', 'volume_spike', 'v_shape_recovery', 'order_flow_imbalance'][Math.floor(Math.random() * 5)], confidence: randomBetween(0.5, 0.95) }),
          exitPrice,
          exitTime: new Date(Date.now() - randomBetween(0, 86400000)),
          exitReason: exitReasons[Math.floor(Math.random() * exitReasons.length)],
          quantity,
          positionSizeUsd,
          pnlUsd,
          pnlPct: priceMovement * 100,
          holdTimeMin: holdTime,
          maxFavorableExc: isWin ? priceMovement * randomBetween(1.1, 1.8) * entryPrice : randomBetween(0, priceMovement * 0.3) * entryPrice,
          maxAdverseExc: isWin ? -randomBetween(0.01, 0.05) * entryPrice : -priceMovement * randomBetween(0.8, 1.5) * entryPrice,
          capitalAllocPct: randomBetween(2, 6),
          allocationMethodUsed: bt.allocationMethod,
        }
      });
      opCount++;
    }
  }
  console.log(`✅ Created ${opCount} backtest operations across ${completedBacktests.length} completed backtests`);

  // ============================================================
  // 14. CREATE PREDICTIVE SIGNALS (20 across different signal types)
  // ============================================================
  const predictiveSignalsData = [
    { signalType: 'REGIME_CHANGE', chain: 'SOL', sector: null, prediction: JSON.stringify({ from: 'RISK_ON', to: 'NEUTRAL', probability: 0.72, catalyst: 'BTC rejection at $72K resistance' }), confidence: 0.72, timeframe: '4h', validUntil: new Date(Date.now() + 4 * 3600000), evidence: JSON.stringify(['BTC failed to break $72K 3 times', 'Funding rates declining', 'Smart money reducing exposure']), historicalHitRate: 0.68, dataPointsUsed: 342, wasCorrect: null, actualOutcome: null },
    { signalType: 'REGIME_CHANGE', chain: 'ETH', sector: null, prediction: JSON.stringify({ from: 'NEUTRAL', to: 'RISK_ON', probability: 0.65, catalyst: 'ETH ETF inflow surge' }), confidence: 0.65, timeframe: '1d', validUntil: new Date(Date.now() + 24 * 3600000), evidence: JSON.stringify(['ETH ETF daily inflow +$450M', 'BTC dominance declining', 'DeFi TVL increasing']), historicalHitRate: 0.62, dataPointsUsed: 215, wasCorrect: true, actualOutcome: JSON.stringify({ regime: 'RISK_ON', movePct: 8.5 }) },
    { signalType: 'BOT_SWARM', chain: 'SOL', sector: 'MEME', prediction: JSON.stringify({ botType: 'SNIPER_BOT', expectedCount: 15, tokenPhase: 'LAUNCH', riskLevel: 'HIGH' }), confidence: 0.88, timeframe: '15m', validUntil: new Date(Date.now() + 15 * 60000), evidence: JSON.stringify(['12 sniper wallets activated in last 5 min', 'Jito tip spike 5x', 'New pair created on Raydium']), historicalHitRate: 0.91, dataPointsUsed: 1250, wasCorrect: null, actualOutcome: null },
    { signalType: 'BOT_SWARM', chain: 'ETH', sector: 'MEME', prediction: JSON.stringify({ botType: 'MEV_EXTRACTOR', expectedActivity: 'HIGH', sandwichRisk: 0.85 }), confidence: 0.82, timeframe: '5m', validUntil: new Date(Date.now() + 5 * 60000), evidence: JSON.stringify(['Gas price spike 3x', 'Flashbots bundle count +200%', 'Uniswap slippage increase']), historicalHitRate: 0.85, dataPointsUsed: 890, wasCorrect: true, actualOutcome: JSON.stringify({ sandwichAttacks: 12, mevExtractedUsd: 45000 }) },
    { signalType: 'WHALE_MOVEMENT', chain: 'SOL', sector: null, prediction: JSON.stringify({ direction: 'ACCUMULATING', token: 'WIF', estimatedUsd: 2500000, impact: 'MODERATE' }), confidence: 0.78, timeframe: '1h', validUntil: new Date(Date.now() + 3600000), evidence: JSON.stringify(['3 whale wallets buying WIF', 'OTC desk activity detected', 'WIF outflow from exchanges']), historicalHitRate: 0.72, dataPointsUsed: 456, wasCorrect: null, actualOutcome: null },
    { signalType: 'WHALE_MOVEMENT', chain: 'ETH', sector: 'DEFI', prediction: JSON.stringify({ direction: 'DISTRIBUTING', token: 'UNI', estimatedUsd: 5000000, impact: 'HIGH' }), confidence: 0.71, timeframe: '4h', validUntil: new Date(Date.now() + 4 * 3600000), evidence: JSON.stringify(['Uniswap V3 whale LP removal', '2M UNI transferred to exchange', 'Historical sell pattern match']), historicalHitRate: 0.65, dataPointsUsed: 328, wasCorrect: false, actualOutcome: JSON.stringify({ direction: 'ACCUMULATING', priceChangePct: 5.2 }) },
    { signalType: 'LIQUIDITY_DRAIN', chain: 'SOL', sector: 'MEME', prediction: JSON.stringify({ token: 'PUMP', drainPct: 40, rugPullProb: 0.72, timeHorizon: '2h' }), confidence: 0.76, timeframe: '1h', validUntil: new Date(Date.now() + 3600000), evidence: JSON.stringify(['Creator wallet moving tokens', 'Liquidity LP tokens unlocked', 'Mint function not renounced']), historicalHitRate: 0.82, dataPointsUsed: 567, wasCorrect: true, actualOutcome: JSON.stringify({ drainPct: 65, rugPull: true }) },
    { signalType: 'CORRELATION_BREAK', chain: 'ETH', sector: 'DEFI', prediction: JSON.stringify({ assets: ['AAVE', 'COMP'], previousCorrelation: 0.85, newCorrelation: 0.35, direction: 'AAVE outperforming' }), confidence: 0.69, timeframe: '1d', validUntil: new Date(Date.now() + 24 * 3600000), evidence: JSON.stringify(['AAVE revenue up 40%', 'COMP governance uncertainty', 'DeFi sector rotation']), historicalHitRate: 0.58, dataPointsUsed: 189, wasCorrect: null, actualOutcome: null },
    { signalType: 'ANOMALY', chain: 'SOL', sector: 'MEME', prediction: JSON.stringify({ type: 'VOLUME_ANOMALY', token: 'BONK', volumeMultiplier: 12, expectedDirection: 'UP' }), confidence: 0.83, timeframe: '15m', validUntil: new Date(Date.now() + 15 * 60000), evidence: JSON.stringify(['BONK volume 12x average', 'Social mention spike 8x', 'Exchange listing rumor']), historicalHitRate: 0.75, dataPointsUsed: 423, wasCorrect: true, actualOutcome: JSON.stringify({ priceChange: '+18%', volumeMultiplier: 15 }) },
    { signalType: 'ANOMALY', chain: 'ETH', sector: null, prediction: JSON.stringify({ type: 'GAS_ANOMALY', expectedGasMultiplier: 5, likelyCatalyst: 'NFT mint or airdrop' }), confidence: 0.61, timeframe: '30m', validUntil: new Date(Date.now() + 30 * 60000), evidence: JSON.stringify(['Gas price spike 4x', 'Pending tx count +300%', 'Contract interaction spike']), historicalHitRate: 0.55, dataPointsUsed: 210, wasCorrect: null, actualOutcome: null },
    { signalType: 'CYCLE_POSITION', chain: 'SOL', sector: null, prediction: JSON.stringify({ position: 'MID_CYCLE', pctToTop: 35, expectedDuration: '2-4 weeks' }), confidence: 0.74, timeframe: '1d', validUntil: new Date(Date.now() + 7 * 86400000), evidence: JSON.stringify(['BTC halving cycle analysis', 'Altcoin season index: 62', 'Meme coin rotation active']), historicalHitRate: 0.66, dataPointsUsed: 890, wasCorrect: null, actualOutcome: null },
    { signalType: 'SECTOR_ROTATION', chain: 'ETH', sector: null, prediction: JSON.stringify({ from: 'L1', to: 'DEFI', rotationPct: 15, timeframe: '3-7d' }), confidence: 0.67, timeframe: '4h', validUntil: new Date(Date.now() + 4 * 3600000), evidence: JSON.stringify(['L1 tokens cooling off', 'DeFi yields increasing', 'TVL flowing into DeFi protocols']), historicalHitRate: 0.60, dataPointsUsed: 345, wasCorrect: true, actualOutcome: JSON.stringify({ fromPct: -5, toPct: 12 }) },
    { signalType: 'MEAN_REVERSION_ZONE', chain: 'SOL', sector: 'MEME', prediction: JSON.stringify({ token: 'WIF', currentVsMean: -22, revertTarget: -5, probability: 0.71 }), confidence: 0.71, timeframe: '4h', validUntil: new Date(Date.now() + 4 * 3600000), evidence: JSON.stringify(['WIF 22% below 20-day MA', 'RSI at 28 (oversold)', 'Smart money accumulating dip']), historicalHitRate: 0.63, dataPointsUsed: 278, wasCorrect: null, actualOutcome: null },
    { signalType: 'MEAN_REVERSION_ZONE', chain: 'ETH', sector: 'DEFI', prediction: JSON.stringify({ token: 'CRV', currentVsMean: -35, revertTarget: -10, probability: 0.58 }), confidence: 0.58, timeframe: '1d', validUntil: new Date(Date.now() + 24 * 3600000), evidence: JSON.stringify(['CRV at 6-month low vs ETH', 'veCRV lock rate increasing', 'Protocol revenue stable']), historicalHitRate: 0.55, dataPointsUsed: 167, wasCorrect: false, actualOutcome: JSON.stringify({ furtherDrop: -12 }) },
    { signalType: 'SMART_MONEY_POSITIONING', chain: 'SOL', sector: 'MEME', prediction: JSON.stringify({ direction: 'LONG', topWallets: 5, avgWinRate: 0.72, avgEntryVsCurrent: 1.05 }), confidence: 0.80, timeframe: '1h', validUntil: new Date(Date.now() + 3600000), evidence: JSON.stringify(['5 top smart money wallets long', 'Average win rate 72%', 'Positions opened in last 2h']), historicalHitRate: 0.74, dataPointsUsed: 512, wasCorrect: null, actualOutcome: null },
    { signalType: 'SMART_MONEY_POSITIONING', chain: 'ETH', sector: 'L1', prediction: JSON.stringify({ direction: 'SHORT', topWallets: 3, avgWinRate: 0.68, reducingExposure: true }), confidence: 0.63, timeframe: '4h', validUntil: new Date(Date.now() + 4 * 3600000), evidence: JSON.stringify(['3 smart money wallets reducing', 'Take-profit orders detected', 'DeFi position unwinding']), historicalHitRate: 0.59, dataPointsUsed: 234, wasCorrect: null, actualOutcome: null },
    { signalType: 'VOLATILITY_REGIME', chain: 'SOL', sector: null, prediction: JSON.stringify({ from: 'LOW', to: 'HIGH', expectedMove: '5-8%', timeframe: '4-8h' }), confidence: 0.77, timeframe: '1h', validUntil: new Date(Date.now() + 3600000), evidence: JSON.stringify(['Bollinger Band squeeze 72h', 'Implied volatility 2x realized', 'Funding rates neutral']), historicalHitRate: 0.70, dataPointsUsed: 645, wasCorrect: true, actualOutcome: JSON.stringify({ actualMove: '6.2%', direction: 'UP' }) },
    { signalType: 'VOLATILITY_REGIME', chain: 'ETH', sector: null, prediction: JSON.stringify({ from: 'HIGH', to: 'MEDIUM', expectedMove: '2-4%', timeframe: '12-24h' }), confidence: 0.72, timeframe: '4h', validUntil: new Date(Date.now() + 4 * 3600000), evidence: JSON.stringify(['VIX declining', 'ETH options skew normalizing', 'Liquidation cascade complete']), historicalHitRate: 0.68, dataPointsUsed: 389, wasCorrect: null, actualOutcome: null },
    { signalType: 'CORRELATION_BREAK', chain: 'SOL', sector: 'MEME', prediction: JSON.stringify({ assets: ['WIF', 'BONK'], previousCorrelation: 0.78, newCorrelation: 0.25, direction: 'WIF outperforming' }), confidence: 0.64, timeframe: '4h', validUntil: new Date(Date.now() + 4 * 3600000), evidence: JSON.stringify(['WIF listed on new exchange', 'BONK whale distributing', 'Divergent social sentiment']), historicalHitRate: 0.56, dataPointsUsed: 198, wasCorrect: null, actualOutcome: null },
    { signalType: 'LIQUIDITY_DRAIN', chain: 'ETH', sector: 'DEFI', prediction: JSON.stringify({ protocol: 'Curve', poolOutflowUsd: 8000000, stablecoinFlight: true }), confidence: 0.69, timeframe: '1d', validUntil: new Date(Date.now() + 24 * 3600000), evidence: JSON.stringify(['CRV pool TVL -15% in 24h', 'Stablecoin outflows increasing', 'Governance dispute active']), historicalHitRate: 0.62, dataPointsUsed: 290, wasCorrect: null, actualOutcome: null },
  ];

  let predSignalCount = 0;
  for (const sigData of predictiveSignalsData) {
    await prisma.predictiveSignal.create({ data: sigData });
    predSignalCount++;
  }
  console.log(`✅ Created ${predSignalCount} predictive signals across different signal types`);

  console.log(`
🎉 Seeding complete!
📊 Summary:
  - ${tokens.length} tokens across SOL & ETH chains
  - ${traders.length} traders with full behavioral profiles
  - Bot detection for ${traders.filter(t => t.isBot).length} identified bots
  - Smart Money scoring for ${traders.filter(t => t.isSmartMoney).length} wallets
  - Whale classification for ${traders.filter(t => t.isWhale).length} wallets
  - Sniper tracking for ${traders.filter(t => t.isSniper).length} wallets
  - ${linkCount} cross-chain wallet correlations
  - ${txCount} individual transaction records
  - 40 signals (including bot & wash trading alerts)
  - 6 enhanced pattern rules
  - Full DNA enrichment with bot/smart money/retail composition
  - ${tradingSystems.length} trading systems across 8 categories
  - ${backtestRuns.length} backtest runs (5 completed, 2 running, 1 failed)
  - ${opCount} backtest operations
  - ${predSignalCount} predictive signals
  `);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
