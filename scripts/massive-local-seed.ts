/**
 * Massive Local Data Generator - No API calls needed
 * Generates realistic crypto data locally for immediate use.
 * Your Mac can then sync with live APIs when running.
 * 
 * Run: DATABASE_URL="file:./dev.db" npx tsx scripts/massive-local-seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Real top crypto data (as of 2025)
const REAL_TOKENS = [
  { symbol: 'BTC', name: 'Bitcoin', price: 97500, mcap: 1920000000000, vol: 42000000000, chain: 'ETH' },
  { symbol: 'ETH', name: 'Ethereum', price: 3850, mcap: 463000000000, vol: 22000000000, chain: 'ETH' },
  { symbol: 'SOL', name: 'Solana', price: 178, mcap: 82000000000, vol: 5500000000, chain: 'SOL' },
  { symbol: 'BNB', name: 'BNB', price: 680, mcap: 102000000000, vol: 2500000000, chain: 'BSC' },
  { symbol: 'XRP', name: 'Ripple', price: 2.45, mcap: 140000000000, vol: 8000000000, chain: 'ETH' },
  { symbol: 'ADA', name: 'Cardano', price: 1.05, mcap: 37000000000, vol: 1500000000, chain: 'ETH' },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.38, mcap: 56000000000, vol: 3200000000, chain: 'ETH' },
  { symbol: 'AVAX', name: 'Avalanche', price: 42, mcap: 17000000000, vol: 800000000, chain: 'ETH' },
  { symbol: 'DOT', name: 'Polkadot', price: 8.5, mcap: 12000000000, vol: 500000000, chain: 'ETH' },
  { symbol: 'LINK', name: 'Chainlink', price: 22, mcap: 14000000000, vol: 900000000, chain: 'ETH' },
  { symbol: 'MATIC', name: 'Polygon', price: 0.92, mcap: 9000000000, vol: 600000000, chain: 'MATIC' },
  { symbol: 'UNI', name: 'Uniswap', price: 15, mcap: 9000000000, vol: 500000000, chain: 'ETH' },
  { symbol: 'ATOM', name: 'Cosmos', price: 12, mcap: 4500000000, vol: 300000000, chain: 'ETH' },
  { symbol: 'AAVE', name: 'Aave', price: 280, mcap: 4200000000, vol: 350000000, chain: 'ETH' },
  { symbol: 'ARB', name: 'Arbitrum', price: 1.2, mcap: 5500000000, vol: 700000000, chain: 'ARB' },
  { symbol: 'OP', name: 'Optimism', price: 2.8, mcap: 3500000000, vol: 250000000, chain: 'OP' },
  { symbol: 'NEAR', name: 'NEAR Protocol', price: 7.5, mcap: 8000000000, vol: 600000000, chain: 'ETH' },
  { symbol: 'FTM', name: 'Fantom', price: 1.1, mcap: 3000000000, vol: 200000000, chain: 'ETH' },
  { symbol: 'ALGO', name: 'Algorand', price: 0.55, mcap: 4500000000, vol: 180000000, chain: 'ETH' },
  { symbol: 'FIL', name: 'Filecoin', price: 8.2, mcap: 4700000000, vol: 280000000, chain: 'ETH' },
  // Solana ecosystem
  { symbol: 'JUP', name: 'Jupiter', price: 1.35, mcap: 1800000000, vol: 320000000, chain: 'SOL' },
  { symbol: 'RAY', name: 'Raydium', price: 4.2, mcap: 1100000000, vol: 180000000, chain: 'SOL' },
  { symbol: 'ORCA', name: 'Orca', price: 5.8, mcap: 380000000, vol: 45000000, chain: 'SOL' },
  { symbol: 'BONK', name: 'Bonk', price: 0.000028, mcap: 1900000000, vol: 350000000, chain: 'SOL' },
  { symbol: 'WIF', name: 'dogwifhat', price: 2.8, mcap: 2800000000, vol: 500000000, chain: 'SOL' },
  { symbol: 'JTO', name: 'Jito', price: 3.5, mcap: 800000000, vol: 120000000, chain: 'SOL' },
  { symbol: 'PYTH', name: 'Pyth Network', price: 0.55, mcap: 750000000, vol: 80000000, chain: 'SOL' },
  { symbol: 'RENDER', name: 'Render', price: 10.5, mcap: 4100000000, vol: 350000000, chain: 'SOL' },
  { symbol: 'MANGO', name: 'Mango Markets', price: 0.08, mcap: 40000000, vol: 5000000, chain: 'SOL' },
  { symbol: 'STEP', name: 'Step Finance', price: 0.12, mcap: 25000000, vol: 3000000, chain: 'SOL' },
];

function genSolAddr(): string {
  const b58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  return Array.from({length: 44}, () => b58[Math.floor(Math.random() * b58.length)]).join('');
}

function genEthAddr(): string {
  const h = '0123456789abcdef';
  return '0x' + Array.from({length: 40}, () => h[Math.floor(Math.random() * h.length)]).join('');
}

function rand(min: number, max: number) { return min + Math.random() * (max - min); }
function randInt(min: number, max: number) { return Math.floor(rand(min, max)); }

async function main() {
  console.log('🚀 CryptoQuant Terminal - Massive Local Data Generator');
  console.log('======================================================\n');
  
  const start = Date.now();

  // ========== STEP 1: TOKENS (5000+) ==========
  console.log('=== STEP 1: Generating 5000+ tokens ===');
  const existingTokens = await prisma.token.count();
  if (existingTokens >= 4000) {
    console.log(`Already have ${existingTokens} tokens, skipping`);
  } else {
    const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon'];
    const suffixes = ['Fi', 'Swap', 'Coin', 'Token', 'Chain', 'Net', 'DAO', 'Protocol', 'Finance', 'Labs', 'AI', 'Meta', 'Verse', 'X', 'Pro', 'Max', 'Ultra', 'Prime', 'Hyper', 'Core'];
    const chains = ['SOL', 'ETH', 'BSC', 'BASE', 'ARB', 'MATIC', 'OP'];
    
    let totalTokens = existingTokens;
    
    // First, add real tokens
    for (const rt of REAL_TOKENS) {
      try {
        await prisma.token.upsert({
          where: { address: `coingecko_${rt.symbol.toLowerCase()}` },
          update: {
            priceUsd: rt.price, volume24h: rt.vol, marketCap: rt.mcap,
            priceChange24h: rand(-15, 15), priceChange1h: rand(-3, 3),
            priceChange6h: rand(-8, 8), priceChange15m: rand(-2, 2), priceChange5m: rand(-1, 1),
            liquidity: rt.vol * rand(0.1, 0.5),
            holderCount: randInt(1000, 500000), uniqueWallets24h: randInt(100, 50000),
            botActivityPct: rand(0, 30), smartMoneyPct: rand(0, 20),
            dex: rt.chain === 'SOL' ? 'raydium' : 'uniswap',
          },
          create: {
            address: `coingecko_${rt.symbol.toLowerCase()}`,
            symbol: rt.symbol, name: rt.name, chain: rt.chain,
            priceUsd: rt.price, volume24h: rt.vol, marketCap: rt.mcap,
            priceChange24h: rand(-15, 15), priceChange1h: rand(-3, 3),
            priceChange6h: rand(-8, 8), priceChange15m: rand(-2, 2), priceChange5m: rand(-1, 1),
            liquidity: rt.vol * rand(0.1, 0.5),
            holderCount: randInt(1000, 500000), uniqueWallets24h: randInt(100, 50000),
            botActivityPct: rand(0, 30), smartMoneyPct: rand(0, 20),
            dex: rt.chain === 'SOL' ? 'raydium' : 'uniswap',
          },
        });
        totalTokens++;
      } catch { /* skip */ }
    }
    console.log(`[Tokens] ${REAL_TOKENS.length} real tokens added`);
    
    // Generate remaining tokens with realistic data
    const needed = 5100 - totalTokens;
    const batchSize = 500;
    
    for (let batch = 0; batch < Math.ceil(needed / batchSize); batch++) {
      const tokens = [];
      const batchCount = Math.min(batchSize, needed - batch * batchSize);
      
      for (let i = 0; i < batchCount; i++) {
        const chain = chains[Math.floor(Math.random() * chains.length)];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        const num = randInt(1, 999);
        const symbol = `${prefix.substring(0,3).toUpperCase()}${suffix.substring(0,2).toUpperCase()}${num}`;
        const name = `${prefix} ${suffix}`;
        const mcapTier = Math.random();
        const mcap = mcapTier < 0.6 ? rand(50000, 5000000) : mcapTier < 0.85 ? rand(5000000, 50000000) : mcapTier < 0.95 ? rand(50000000, 500000000) : rand(500000000, 50000000000);
        const price = mcap / rand(1000000, 10000000000);
        
        tokens.push({
          address: `gen_${symbol.toLowerCase()}_${chain.toLowerCase()}_${batch * batchSize + i}`,
          symbol, name, chain,
          priceUsd: Math.round(price * 10000) / 10000,
          volume24h: Math.round(mcap * rand(0.005, 0.15)),
          marketCap: Math.round(mcap),
          liquidity: Math.round(mcap * rand(0.03, 0.15)),
          priceChange5m: Math.round(rand(-5, 5) * 100) / 100,
          priceChange15m: Math.round(rand(-8, 8) * 100) / 100,
          priceChange1h: Math.round(rand(-15, 15) * 100) / 100,
          priceChange6h: Math.round(rand(-25, 25) * 100) / 100,
          priceChange24h: Math.round(rand(-40, 40) * 100) / 100,
          holderCount: randInt(10, 100000),
          uniqueWallets24h: randInt(5, 10000),
          botActivityPct: Math.round(rand(0, 50) * 100) / 100,
          smartMoneyPct: Math.round(rand(0, 30) * 100) / 100,
          dex: chain === 'SOL' ? 'raydium' : chain === 'BSC' ? 'pancakeswap' : 'uniswap',
        });
      }
      
      try {
        await prisma.token.createMany({ data: tokens });
        totalTokens += batchCount;
        console.log(`[Tokens] Batch ${batch + 1}: ${batchCount} created (total: ${totalTokens})`);
      } catch (err: any) {
        console.log(`[Tokens] Batch error: ${err.message}`);
      }
    }
  }
  
  const tokenCount = await prisma.token.count();
  console.log(`[Tokens] Final count: ${tokenCount}`);

  // ========== STEP 2: SMART MONEY WALLETS (550+) ==========
  console.log('\n=== STEP 2: Generating 550+ Smart Money Wallets ===');
  const existingTraders = await prisma.trader.count();
  if (existingTraders >= 500) {
    console.log(`Already have ${existingTraders} traders, skipping`);
  } else {
    const labels = ['SMART_MONEY', 'WHALE', 'SNIPER', 'BOT_MEV', 'BOT_SNIPER', 'BOT_COPY', 'BOT_ARBITRAGE', 'BOT_WASH', 'RETAIL', 'FUND', 'INFLUENCER'];
    const botTypes = ['MEV_EXTRACTOR', 'SNIPER_BOT', 'COPY_BOT', 'ARBITRAGE_BOT', 'SANDWICH_BOT', 'WASH_TRADING_BOT', 'MARKET_MAKER_BOT', 'SCALPER_BOT'];
    const chains = ['SOL', 'ETH', 'BSC', 'BASE', 'ARB'];
    const batchSize = 100;
    const targetCount = 550;
    
    for (let batch = 0; batch < Math.ceil(targetCount / batchSize); batch++) {
      const traders = [];
      const batchCount = Math.min(batchSize, targetCount - batch * batchSize);
      
      for (let i = 0; i < batchCount; i++) {
        const chain = chains[Math.floor(Math.random() * chains.length)];
        const isBot = Math.random() < 0.35;
        const isSmart = !isBot && Math.random() < 0.2;
        const isWhale = !isBot && !isSmart && Math.random() < 0.1;
        const primaryLabel = isBot ? labels[3 + Math.floor(Math.random() * 5)] : isSmart ? 'SMART_MONEY' : isWhale ? 'WHALE' : Math.random() < 0.1 ? 'FUND' : 'RETAIL';
        
        const totalTrades = isBot ? randInt(500, 5000) : isSmart ? randInt(50, 500) : randInt(10, 200);
        const totalPnl = isSmart ? rand(50000, 5000000) : isWhale ? rand(100000, 10000000) : isBot ? rand(0, 1000000) : rand(-50000, 200000);
        
        traders.push({
          address: chain === 'SOL' ? genSolAddr() : genEthAddr(),
          chain,
          primaryLabel,
          subLabels: JSON.stringify(isBot ? ['BOT'] : isSmart ? ['PROFITABLE'] : []),
          labelConfidence: rand(0.5, 1),
          isBot,
          botType: isBot ? botTypes[Math.floor(Math.random() * botTypes.length)] : null,
          botConfidence: isBot ? rand(0.7, 1) : 0,
          botDetectionSignals: JSON.stringify(isBot ? ['FAST_EXECUTION'] : []),
          totalTrades,
          winRate: isSmart ? rand(0.55, 0.8) : isBot ? rand(0.5, 0.8) : rand(0.3, 0.6),
          avgPnl: totalPnl / totalTrades,
          totalPnl,
          avgHoldTimeMin: isBot ? rand(1, 30) : rand(60, 10080),
          avgTradeSizeUsd: isWhale ? rand(50000, 500000) : rand(100, 50000),
          largestTradeUsd: isWhale ? rand(500000, 5000000) : rand(1000, 100000),
          totalVolumeUsd: totalTrades * (isWhale ? 100000 : 5000),
          sharpeRatio: isSmart ? rand(1.5, 4) : rand(-1, 2),
          profitFactor: isSmart ? rand(1.5, 4) : rand(0.5, 2),
          isSmartMoney: isSmart,
          smartMoneyScore: isSmart ? rand(60, 100) : rand(0, 30),
          isWhale,
          whaleScore: isWhale ? rand(70, 100) : rand(0, 20),
          isSniper: !isBot && Math.random() < 0.08,
          isActive247: isBot,
          consistencyScore: isBot ? rand(0.8, 1) : rand(0, 0.5),
          uniqueTokensTraded: isBot ? randInt(20, 200) : randInt(5, 50),
          totalHoldingsUsd: isWhale ? rand(100000, 10000000) : rand(100, 500000),
          preferredChains: JSON.stringify([chain]),
          preferredDexes: JSON.stringify([chain === 'SOL' ? 'raydium' : 'uniswap']),
        });
      }
      
      try {
        await prisma.trader.createMany({ data: traders });
        console.log(`[Traders] Batch ${batch + 1}: ${batchCount} created`);
      } catch (err: any) {
        console.log(`[Traders] Batch error: ${err.message}`);
      }
    }
  }
  
  const traderCount = await prisma.trader.count();
  console.log(`[Traders] Final count: ${traderCount}`);

  // ========== STEP 3: TOKEN DNA (ALL tokens) ==========
  console.log('\n=== STEP 3: Computing TokenDNA for ALL tokens ===');
  const tokensWithoutDna = await prisma.token.findMany({
    where: { dna: { is: null } },
    take: 5000,
    select: { id: true, priceChange24h: true, liquidity: true, marketCap: true, volume24h: true, chain: true },
  });
  console.log(`[DNA] ${tokensWithoutDna.length} tokens need DNA`);
  
  if (tokensWithoutDna.length > 0) {
    let dnaCreated = 0;
    const batchSize = 200;
    
    for (let i = 0; i < tokensWithoutDna.length; i += batchSize) {
      const batch = tokensWithoutDna.slice(i, i + batchSize);
      const dnaData = batch.map(token => {
        const pc24 = token.priceChange24h || 0;
        const liq = token.liquidity || 0;
        const mcap = token.marketCap || 0;
        const vol = token.volume24h || 0;
        
        let volRisk = Math.abs(pc24) > 50 ? 40 : Math.abs(pc24) > 20 ? 30 : Math.abs(pc24) > 10 ? 20 : Math.abs(pc24) > 5 ? 10 : 0;
        let liqRisk = liq > 0 && liq < 50000 ? 30 : liq > 0 && liq < 200000 ? 20 : liq > 0 && liq < 1000000 ? 10 : liq === 0 && vol > 0 ? 35 : 0;
        let mcapRisk = mcap > 0 && mcap < 1000000 ? 25 : mcap > 0 && mcap < 10000000 ? 15 : mcap > 0 && mcap < 50000000 ? 5 : 0;
        let washRisk = liq > 0 && vol > 0 && vol / liq > 10 ? 20 : liq > 0 && vol > 0 && vol / liq > 5 ? 15 : 0;
        let momRisk = pc24 < -30 ? 25 : pc24 < -15 ? 20 : pc24 < -5 ? 10 : 0;
        let riskScore = Math.min(98, Math.max(5, 20 + volRisk + liqRisk + mcapRisk + washRisk + momRisk));
        
        const isHighRisk = riskScore > 60;
        const isLowRisk = riskScore < 30;
        
        return {
          tokenId: token.id,
          riskScore,
          botActivityScore: Math.round((isHighRisk ? rand(30, 80) : isLowRisk ? rand(0, 15) : rand(5, 35)) * 100) / 100,
          smartMoneyScore: Math.round((isLowRisk ? rand(20, 60) : isHighRisk ? rand(0, 20) : rand(5, 30)) * 100) / 100,
          retailScore: Math.round((isHighRisk ? rand(20, 50) : rand(40, 80)) * 100) / 100,
          whaleScore: Math.round((isLowRisk ? rand(15, 50) : rand(0, 25)) * 100) / 100,
          washTradeProb: Math.round((isHighRisk ? rand(0.2, 0.7) : rand(0, 0.15)) * 1000) / 1000,
          sniperPct: Math.round((isHighRisk ? rand(10, 40) : rand(0, 5)) * 100) / 100,
          mevPct: Math.round((isHighRisk ? rand(5, 25) : rand(0, 8)) * 100) / 100,
          copyBotPct: Math.round((isHighRisk ? rand(5, 20) : rand(0, 5)) * 100) / 100,
          traderComposition: JSON.stringify({
            smartMoney: randInt(0, 6), whale: randInt(0, 5), bot_mev: randInt(0, 10),
            bot_sniper: randInt(0, 8), bot_copy: randInt(0, 5), retail: randInt(2, 16),
            creator: Math.random() > 0.9 ? 1 : 0, fund: isLowRisk ? randInt(0, 3) : 0,
          }),
          topWallets: JSON.stringify(Array.from({length: randInt(3, 8)}, () => ({
            address: token.chain === 'SOL' ? genSolAddr() : genEthAddr(),
            label: ['SMART_MONEY', 'WHALE', 'SNIPER', 'RETAIL', 'BOT_MEV'][randInt(0, 5)],
            pnl: Math.round((Math.random() * 2 - 0.5) * 100000),
            entryRank: randInt(1, 100),
            holdTime: randInt(10, 10080),
          }))),
        };
      });
      
      try {
        await prisma.tokenDNA.createMany({ data: dnaData });
        dnaCreated += batch.length;
        console.log(`[DNA] Batch: ${batch.length} created (total: ${dnaCreated})`);
      } catch (err: any) {
        // Try one by one for error
        for (const d of dnaData) {
          try { await prisma.tokenDNA.create({ data: d }); dnaCreated++; } catch { /* skip dup */ }
        }
      }
    }
  }
  
  const dnaCount = await prisma.tokenDNA.count();
  const danger = await prisma.tokenDNA.count({ where: { riskScore: { gt: 60 } } });
  const safe = await prisma.tokenDNA.count({ where: { riskScore: { lt: 30 } } });
  console.log(`[DNA] Final: ${dnaCount} (DANGER: ${danger}, SAFE: ${safe})`);

  // ========== STEP 4: SIGNALS (3000+) ==========
  console.log('\n=== STEP 4: Generating 3000+ signals ===');
  const existingSignals = await prisma.signal.count();
  if (existingSignals >= 2500) {
    console.log(`Already have ${existingSignals} signals, skipping`);
  } else {
    const tokens = await prisma.token.findMany({
      where: { volume24h: { gt: 0 } },
      take: 2000,
      select: { id: true, symbol: true, priceUsd: true, priceChange24h: true, volume24h: true, liquidity: true },
    });
    
    const signals: any[] = [];
    const types = ['RUG_PULL', 'LIQUIDITY_TRAP', 'V_SHAPE_RECOVERY', 'SMART_MONEY_ENTRY', 'VOLUME_SPIKE', 'PRICE_ANOMALY', 'BOT_SWARM', 'WHALE_MOVEMENT', 'MOMENTUM', 'MEAN_REVERSION'];
    
    for (const token of tokens) {
      const pc24 = token.priceChange24h || 0;
      const vol = token.volume24h || 0;
      const liq = token.liquidity || 0;
      
      if (Math.abs(pc24) > 10) {
        signals.push({ type: pc24 > 0 ? 'MOMENTUM' : 'PRICE_ANOMALY', tokenId: token.id,
          confidence: Math.min(95, Math.floor(40 + Math.abs(pc24))),
          priceTarget: Math.round((token.priceUsd || 0) * (1 + (pc24 > 0 ? 0.1 : -0.1)) * 10000) / 10000,
          direction: pc24 > 0 ? 'LONG' : 'SHORT',
          description: `${token.symbol}: ${pc24 > 0 ? 'Bullish' : 'Bearish'} momentum (${pc24.toFixed(1)}% 24h)`,
          metadata: JSON.stringify({ priceChange24h: pc24 }),
        });
      }
      if (liq > 0 && liq < 100000 && vol > liq * 2) {
        signals.push({ type: 'LIQUIDITY_TRAP', tokenId: token.id, confidence: randInt(60, 90),
          priceTarget: Math.round((token.priceUsd || 0) * 0.5 * 10000) / 10000, direction: 'SHORT',
          description: `${token.symbol}: Low liquidity trap`, metadata: JSON.stringify({ liq, vol }),
        });
      }
      if (Math.random() < 0.08) {
        signals.push({ type: types[randInt(0, types.length)], tokenId: token.id, confidence: randInt(50, 90),
          priceTarget: Math.round((token.priceUsd || 0) * (1 + rand(-0.3, 0.5)) * 10000) / 10000,
          direction: ['LONG', 'SHORT', 'NEUTRAL'][randInt(0, 3)],
          description: `${token.symbol}: Signal detected`, metadata: JSON.stringify({}),
        });
      }
    }
    
    const BATCH = 500;
    for (let i = 0; i < signals.length; i += BATCH) {
      try { await prisma.signal.createMany({ data: signals.slice(i, i + BATCH) }); } catch { /* skip */ }
    }
    console.log(`[Signals] ${signals.length} created`);
  }

  // ========== STEP 5: EVENTS (1200+) ==========
  console.log('\n=== STEP 5: Generating 1200+ events ===');
  const existingEvents = await prisma.userEvent.count();
  if (existingEvents >= 1000) {
    console.log(`Already have ${existingEvents} events, skipping`);
  } else {
    const tokens = await prisma.token.findMany({ take: 500, select: { id: true } });
    const eventTypes = ['PRICE_ALERT', 'VOLUME_SPIKE', 'LIQUIDITY_CHANGE', 'TOKEN_LISTED', 'SMART_MONEY_MOVE', 'RUG_PULL_DETECTED', 'PATTERN_DETECTED', 'WHALE_MOVEMENT'];
    
    const events = Array.from({length: 1200}, () => ({
      eventType: eventTypes[randInt(0, eventTypes.length)],
      tokenId: tokens[randInt(0, tokens.length)].id,
      walletAddress: Math.random() < 0.3 ? (Math.random() < 0.5 ? genSolAddr() : genEthAddr()) : null,
      entryPrice: rand(0, 1000), stopLoss: rand(0, 500), takeProfit: rand(0, 5000),
      pnl: (Math.random() - 0.4) * 10000,
    }));
    
    const BATCH = 200;
    for (let i = 0; i < events.length; i += BATCH) {
      try { await prisma.userEvent.createMany({ data: events.slice(i, i + BATCH) }); } catch { /* skip */ }
    }
    console.log(`[Events] ${events.length} created`);
  }

  // ========== STEP 6: PRICE CANDLES (10000+) ==========
  console.log('\n=== STEP 6: Generating 10000+ price candles ===');
  const existingCandles = await prisma.priceCandle.count();
  if (existingCandles >= 8000) {
    console.log(`Already have ${existingCandles} candles, skipping`);
  } else {
    const tokens = await prisma.token.findMany({
      where: { priceUsd: { gt: 0 } },
      take: 200,
      select: { address: true, chain: true, priceUsd: true },
    });
    
    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
    const candles: any[] = [];
    
    for (const token of tokens) {
      const base = token.priceUsd;
      if (base <= 0) continue;
      const tfs = [timeframes[randInt(0, 6)], timeframes[randInt(0, 6)]];
      
      for (const tf of tfs) {
        for (let h = 24; h >= 1; h--) {
          const open = base * (1 + (Math.random() - 0.5) * 0.04);
          const close = open * (1 + (Math.random() - 0.5) * 0.04);
          candles.push({
            tokenAddress: token.address, chain: token.chain, timeframe: tf,
            timestamp: new Date(Date.now() - h * 3600000),
            open: Math.round(open * 10000) / 10000, high: Math.round(Math.max(open, close) * (1 + Math.random() * 0.02) * 10000) / 10000,
            low: Math.round(Math.min(open, close) * (1 - Math.random() * 0.02) * 10000) / 10000, close: Math.round(close * 10000) / 10000,
            volume: Math.round(base * rand(100, 10000) * 100) / 100, trades: randInt(10, 500), source: 'local',
          });
        }
      }
    }
    
    const BATCH = 500;
    for (let i = 0; i < candles.length; i += BATCH) {
      try { await prisma.priceCandle.createMany({ data: candles.slice(i, i + BATCH), skipDuplicates: false }); } catch { /* skip */ }
    }
    console.log(`[Candles] ${candles.length} generated`);
  }

  // ========== STEP 7: PREDICTIVE SIGNALS (240+) ==========
  console.log('\n=== STEP 7: Generating 240+ predictive signals ===');
  const existingPred = await prisma.predictiveSignal.count();
  if (existingPred >= 200) {
    console.log(`Already have ${existingPred} predictive signals`);
  } else {
    const types = ['REGIME_CHANGE', 'BOT_SWARM', 'WHALE_MOVEMENT', 'LIQUIDITY_DRAIN', 'ANOMALY', 'SMART_MONEY_POSITIONING', 'VOLATILITY_REGIME', 'CORRELATION_BREAK'];
    const dirs = ['BULLISH', 'BEARISH', 'NEUTRAL'];
    const sectors = ['MEME', 'DEFI', 'L1', 'L2', 'NFT', 'BRIDGE', 'STABLE'];
    const chains = ['SOL', 'ETH', 'BSC', 'BASE'];
    
    const preds = Array.from({length: 240}, () => ({
      signalType: types[randInt(0, types.length)], chain: chains[randInt(0, chains.length)],
      sector: sectors[randInt(0, sectors.length)],
      prediction: JSON.stringify({ direction: dirs[randInt(0, 3)], expectedMove: rand(-10, 20).toFixed(2) + '%' }),
      direction: dirs[randInt(0, 3)], confidence: Math.round(rand(0.3, 0.9) * 100) / 100,
      timeframe: ['1h', '4h', '24h', '7d'][randInt(0, 4)],
      validUntil: new Date(Date.now() + rand(0, 7) * 86400000),
      evidence: JSON.stringify([{ source: 'on-chain', metric: 'volume_change', value: rand(1, 100).toFixed(1) + '%' }]),
      historicalHitRate: rand(10, 80), dataPointsUsed: randInt(50, 500),
    }));
    
    try { await prisma.predictiveSignal.createMany({ data: preds }); } catch { /* skip */ }
    console.log(`[Predictive] ${preds.length} created`);
  }

  // ========== STEP 8: TRANSACTIONS (5000+) ==========
  console.log('\n=== STEP 8: Generating 5000+ transactions ===');
  const existingTx = await prisma.traderTransaction.count();
  if (existingTx >= 4000) {
    console.log(`Already have ${existingTx} transactions`);
  } else {
    const traders = await prisma.trader.findMany({ take: 200, select: { id: true, chain: true } });
    const tokens = await prisma.token.findMany({ take: 200, select: { address: true, symbol: true, priceUsd: true } });
    const actions = ['BUY', 'SELL', 'SWAP'];
    const dexes = ['raydium', 'uniswap', 'orca', 'jupiter', 'pancakeswap'];
    
    const txs = Array.from({length: 5000}, () => {
      const trader = traders[randInt(0, traders.length)];
      const token = tokens[randInt(0, tokens.length)];
      const action = actions[randInt(0, 3)];
      const price = token.priceUsd || rand(0.01, 100);
      const amount = rand(1, 10000);
      return {
        traderId: trader.id,
        txHash: '0x' + Array.from({length: 64}, () => '0123456789abcdef'[randInt(0, 16)]).join(''),
        chain: trader.chain, dex: dexes[randInt(0, dexes.length)], action,
        tokenAddress: token.address, tokenSymbol: token.symbol,
        quoteToken: trader.chain === 'SOL' ? 'SOL' : 'ETH',
        amountIn: amount, amountOut: amount * price * (1 + (Math.random() - 0.5) * 0.1),
        priceUsd: price, valueUsd: amount * price,
        slippageBps: randInt(0, 100),
        pnlUsd: action === 'SELL' ? (Math.random() - 0.4) * 10000 : null,
        isFrontrun: Math.random() < 0.05, isSandwich: Math.random() < 0.03,
        blockTime: new Date(Date.now() - Math.random() * 86400000 * 30),
      };
    });
    
    const BATCH = 200;
    for (let i = 0; i < txs.length; i += BATCH) {
      try { await prisma.traderTransaction.createMany({ data: txs.slice(i, i + BATCH), skipDuplicates: false }); } catch { /* skip */ }
    }
    console.log(`[Transactions] ${txs.length} created`);
  }

  // ========== STEP 9: BEHAVIOR PATTERNS ==========
  console.log('\n=== STEP 9: Generating trader behavior patterns ===');
  const existingPatterns = await prisma.traderBehaviorPattern.count();
  if (existingPatterns >= 500) {
    console.log(`Already have ${existingPatterns} patterns`);
  } else {
    const traders = await prisma.trader.findMany({ take: 300, select: { id: true } });
    const patterns = ['ACCUMULATOR', 'DUMPER', 'SCALPER', 'SWING_TRADER', 'DIAMOND_HANDS', 'MOMENTUM_RIDER', 'CONTRARIAN', 'SNIPER_ENTRY', 'WASH_TRADER', 'COPY_CAT'];
    
    const bps = [];
    for (const trader of traders) {
      const numPatterns = randInt(1, 3);
      for (let p = 0; p < numPatterns; p++) {
        bps.push({
          traderId: trader.id,
          pattern: patterns[randInt(0, patterns.length)],
          confidence: rand(0.4, 0.95),
          dataPoints: randInt(10, 500),
        });
      }
    }
    
    const BATCH = 200;
    for (let i = 0; i < bps.length; i += BATCH) {
      try { await prisma.traderBehaviorPattern.createMany({ data: bps.slice(i, i + BATCH) }); } catch { /* skip */ }
    }
    console.log(`[Patterns] ${bps.length} created`);
  }

  // ========== FINAL SUMMARY ==========
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('\n======================================================');
  console.log('📊 FINAL SUMMARY');
  console.log('======================================================');
  console.log(`Tokens:        ${await prisma.token.count()}`);
  console.log(`Traders:       ${await prisma.trader.count()}`);
  console.log(`TokenDNA:      ${await prisma.tokenDNA.count()}`);
  console.log(`Signals:       ${await prisma.signal.count()}`);
  console.log(`Events:        ${await prisma.userEvent.count()}`);
  console.log(`Price Candles: ${await prisma.priceCandle.count()}`);
  console.log(`Predictive:    ${await prisma.predictiveSignal.count()}`);
  console.log(`Transactions:  ${await prisma.traderTransaction.count()}`);
  console.log(`Patterns:      ${await prisma.traderBehaviorPattern.count()}`);
  console.log(`\n⏱️  Completed in ${elapsed}s`);
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
