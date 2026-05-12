/**
 * Seed Missing Dashboard Data
 * - Smart Money Wallets (Trader with isSmartMoney=true)
 * - User Events (recent activity)
 * - Token DNA (risk scores for dangerTokens/safeTokens)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Seeding Missing Dashboard Data ===\n');

  // 1. SMART MONEY WALLETS
  const existingTraders = await prisma.trader.count({ where: { isSmartMoney: true } });
  console.log(`Smart money wallets actuales: ${existingTraders}`);

  if (existingTraders === 0) {
    const smartMoneyWallets = [
      { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18', chain: 'ETH', primaryLabel: 'SMART_MONEY', isSmartMoney: true, smartMoneyScore: 85, totalPnl: 1250000, winRate: 0.78, totalTrades: 342, avgHoldTimeMin: 2880 },
      { address: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72', chain: 'ETH', primaryLabel: 'SMART_MONEY', isSmartMoney: true, smartMoneyScore: 78, totalPnl: 890000, winRate: 0.72, totalTrades: 256, avgHoldTimeMin: 1440 },
      { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', chain: 'ETH', primaryLabel: 'WHALE', isSmartMoney: true, smartMoneyScore: 92, totalPnl: 4500000, winRate: 0.82, totalTrades: 189, avgHoldTimeMin: 4320 },
      { address: '5775E1c7826B4C5c0793Fb1d83621fA7c6Df9eA', chain: 'SOL', primaryLabel: 'SNIPER', isSmartMoney: true, smartMoneyScore: 75, totalPnl: 670000, winRate: 0.75, totalTrades: 512, avgHoldTimeMin: 360 },
      { address: '3a1B09eC5240Ae023BC3f1B83C1e5E7C3f3f3f3f', chain: 'SOL', primaryLabel: 'SMART_MONEY', isSmartMoney: true, smartMoneyScore: 88, totalPnl: 2100000, winRate: 0.80, totalTrades: 178, avgHoldTimeMin: 2160 },
      { address: '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8', chain: 'ETH', primaryLabel: 'FUND', isSmartMoney: true, smartMoneyScore: 95, totalPnl: 8900000, winRate: 0.85, totalTrades: 95, avgHoldTimeMin: 10080 },
      { address: '0x1DB92e2EeBC8E0c075a02BeA49a2935BcD2dFCFb', chain: 'ETH', primaryLabel: 'SMART_MONEY', isSmartMoney: true, smartMoneyScore: 72, totalPnl: 560000, winRate: 0.71, totalTrades: 687, avgHoldTimeMin: 720 },
      { address: 'Ae2D4617c862309A512DC3a8A1A1a28A3c8E5c2A', chain: 'SOL', primaryLabel: 'SNIPER', isSmartMoney: true, smartMoneyScore: 68, totalPnl: 340000, winRate: 0.68, totalTrades: 1024, avgHoldTimeMin: 180 },
      { address: '0x28C6c06298d514Db089934071355E5743bf21d60', chain: 'ETH', primaryLabel: 'BOT_ARBITRAGE', isSmartMoney: true, smartMoneyScore: 90, totalPnl: 780000, winRate: 0.91, totalTrades: 4500, avgHoldTimeMin: 30 },
      { address: '9F4c4511e3001b55e2Ae4B4d5c6F7d8E9a0B1c2D', chain: 'SOL', primaryLabel: 'SMART_MONEY', isSmartMoney: true, smartMoneyScore: 74, totalPnl: 420000, winRate: 0.74, totalTrades: 234, avgHoldTimeMin: 5760 },
    ];

    for (const w of smartMoneyWallets) {
      try {
        await prisma.trader.create({ data: w });
      } catch (e: any) {
        if (!e.message?.includes('Unique')) console.error(`Error creating wallet:`, e.message);
      }
    }
    console.log(`Creados ${smartMoneyWallets.length} smart money wallets`);
  }

  // 2. USER EVENTS (recent activity)
  const existingEvents = await prisma.userEvent.count({
    where: { createdAt: { gte: new Date(Date.now() - 86400000) } },
  });
  console.log(`\nRecent events actuales: ${existingEvents}`);

  if (existingEvents === 0) {
    const eventTypes = ['TOKEN_VIEW', 'SIGNAL_RECEIVED', 'ALERT_TRIGGERED', 'TRADE_EXECUTED', 'PORTFOLIO_CHECK', 'PATTERN_DETECTED', 'RISK_ALERT'];
    const tokens = await prisma.token.findMany({ take: 20 });

    let eventsCreated = 0;
    for (let i = 0; i < 50; i++) {
      try {
        const token = tokens[Math.floor(Math.random() * tokens.length)];
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const hoursAgo = Math.floor(Math.random() * 20);

        await prisma.userEvent.create({
          data: {
            eventType,
            tokenId: token.id,
            entryPrice: token.priceUsd,
            createdAt: new Date(Date.now() - hoursAgo * 3600000),
          },
        });
        eventsCreated++;
      } catch { /* skip */ }
    }
    console.log(`Creados ${eventsCreated} user events`);
  }

  // 3. TOKEN DNA (for dangerTokens / safeTokens)
  const tokensWithDna = await prisma.tokenDNA.count();
  console.log(`\nToken DNA actuales: ${tokensWithDna}`);

  if (tokensWithDna === 0) {
    const tokens = await prisma.token.findMany({ take: 60 });
    let dnaCreated = 0;

    for (const token of tokens) {
      try {
        const pc24 = token.priceChange24h ?? 0;
        const vol = token.volume24h ?? 0;
        const liq = token.liquidity ?? 0;
        const mcap = token.marketCap ?? 0;

        let riskScore = 30;
        if (Math.abs(pc24) > 20) riskScore += 30;
        else if (Math.abs(pc24) > 10) riskScore += 20;
        else if (Math.abs(pc24) > 5) riskScore += 10;

        if (liq > 0 && liq < 50000) riskScore += 25;
        else if (liq > 0 && liq < 200000) riskScore += 15;
        else if (liq > 0 && liq < 1000000) riskScore += 5;

        if (mcap > 0 && mcap < 1000000) riskScore += 20;
        else if (mcap > 0 && mcap < 10000000) riskScore += 10;

        if (pc24 < -15) riskScore += 20;
        else if (pc24 < -5) riskScore += 10;

        riskScore = Math.min(95, Math.max(5, riskScore));

        await prisma.tokenDNA.create({
          data: {
            tokenId: token.id,
            riskScore,
            botActivityScore: Math.random() * 40,
            smartMoneyScore: Math.random() * 30,
            retailScore: 40 + Math.random() * 40,
            whaleScore: Math.random() * 50,
            washTradeProb: Math.random() * 0.3,
            sniperPct: Math.random() * 20,
            mevPct: Math.random() * 15,
            copyBotPct: Math.random() * 10,
          },
        });
        dnaCreated++;
      } catch { /* skip */ }
    }
    console.log(`Creados ${dnaCreated} Token DNA records`);
  }

  // 4. FINAL SUMMARY
  const stats = {
    totalTokens: await prisma.token.count(),
    smartMoneyWallets: await prisma.trader.count({ where: { isSmartMoney: true } }),
    recentEvents: await prisma.userEvent.count({ where: { createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    tokensWithDna: await prisma.tokenDNA.count(),
    dangerTokens: (await prisma.tokenDNA.findMany({ where: { riskScore: { gt: 60 } } })).length,
    safeTokens: (await prisma.tokenDNA.findMany({ where: { riskScore: { lte: 30 } } })).length,
    patternSignals: await prisma.signal.count({ where: { type: 'PATTERN' } }),
    predictiveSignals: await prisma.predictiveSignal.count(),
    tokensWithLiquidity: await prisma.token.count({ where: { liquidity: { gt: 0 } } }),
  };

  console.log('\n=== RESUMEN FINAL ===');
  console.log(JSON.stringify(stats, null, 2));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
