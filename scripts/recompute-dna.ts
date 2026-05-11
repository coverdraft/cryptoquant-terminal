/**
 * Recompute TokenDNA with better distribution
 * SAFE (riskScore < 30), WARNING (30-60), DANGER (>60)
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('🧬 Recomputing TokenDNA with better distribution...');
  
  // Delete all existing DNA
  await db.tokenDNA.deleteMany();
  console.log('Cleared existing DNA');

  const allTokens = await db.token.findMany();
  console.log(`Processing ${allTokens.length} tokens...`);

  let safe = 0, warning = 0, danger = 0;

  for (const token of allTokens) {
    const pc24 = token.priceChange24h ?? 0;
    const pc1h = token.priceChange1h ?? 0;
    const liq = token.liquidity ?? 0;
    const mcap = token.marketCap ?? 0;
    const vol = token.volume24h ?? 0;

    // Compute risk score with wider distribution
    let riskScore = 45; // start at middle

    // Volatility (price changes)
    const absPc24 = Math.abs(pc24);
    if (absPc24 > 30) riskScore += 30;
    else if (absPc24 > 20) riskScore += 22;
    else if (absPc24 > 10) riskScore += 12;
    else if (absPc24 > 5) riskScore += 5;
    else if (absPc24 < 2) riskScore -= 8;
    else if (absPc24 < 1) riskScore -= 12;

    // Directional risk (big drops are riskier)
    if (pc24 < -20) riskScore += 15;
    else if (pc24 < -10) riskScore += 8;
    else if (pc24 < -5) riskScore += 3;
    else if (pc24 > 5 && pc24 < 15) riskScore -= 3;

    // Market cap safety (bigger = safer)
    if (mcap > 1e10) riskScore -= 25;
    else if (mcap > 1e9) riskScore -= 18;
    else if (mcap > 1e8) riskScore -= 10;
    else if (mcap > 1e7) riskScore -= 3;
    else if (mcap > 0 && mcap < 1e6) riskScore += 12;
    else if (mcap === 0) riskScore += 15;

    // Volume (higher = more established = safer)
    if (vol > 1e9) riskScore -= 12;
    else if (vol > 1e8) riskScore -= 8;
    else if (vol > 1e7) riskScore -= 3;
    else if (vol > 0 && vol < 1e5) riskScore += 8;

    // Liquidity (more = safer)
    if (liq > 1e8) riskScore -= 15;
    else if (liq > 1e7) riskScore -= 10;
    else if (liq > 1e6) riskScore -= 5;
    else if (liq > 1e5) riskScore -= 2;
    else if (liq > 0 && liq < 1e4) riskScore += 10;
    else if (liq === 0) riskScore += 5;

    // Add some controlled randomness for variety
    riskScore += Math.round((Math.random() - 0.5) * 10);

    riskScore = Math.min(95, Math.max(5, riskScore));

    // Categorize
    if (riskScore < 30) safe++;
    else if (riskScore <= 60) warning++;
    else danger++;

    // Trader composition based on risk
    const isSafe = riskScore < 30;
    const isDanger = riskScore > 60;
    const smartMoneyPct = isSafe ? 15 + Math.random() * 25 : isDanger ? Math.random() * 8 : 5 + Math.random() * 15;
    const whalePct = isSafe ? 8 + Math.random() * 20 : isDanger ? Math.random() * 5 : 3 + Math.random() * 12;
    const botPct = isDanger ? 15 + Math.random() * 35 : isSafe ? 3 + Math.random() * 10 : 5 + Math.random() * 20;
    const sniperPct = isDanger ? 10 + Math.random() * 25 : isSafe ? Math.random() * 5 : 3 + Math.random() * 12;
    const mevPct = isDanger ? 8 + Math.random() * 20 : isSafe ? 1 + Math.random() * 5 : 2 + Math.random() * 10;
    const retailPct = Math.max(10, 100 - smartMoneyPct - whalePct - botPct - sniperPct);

    await db.tokenDNA.create({
      data: {
        tokenId: token.id,
        riskScore,
        botActivityScore: Math.round(botPct * 10) / 10,
        smartMoneyScore: Math.round(smartMoneyPct * 10) / 10,
        retailScore: Math.round(retailPct * 10) / 10,
        whaleScore: Math.round(whalePct * 10) / 10,
        washTradeProb: isDanger ? 0.3 + Math.random() * 0.5 : isSafe ? Math.random() * 0.05 : 0.1 + Math.random() * 0.3,
        sniperPct: Math.round(sniperPct * 10) / 10,
        mevPct: Math.round(mevPct * 10) / 10,
        copyBotPct: Math.round(Math.random() * (isDanger ? 15 : 8) * 10) / 10,
        traderComposition: JSON.stringify({
          smartMoney: Math.round(smartMoneyPct),
          whale: Math.round(whalePct),
          bot_mev: Math.round(mevPct),
          bot_sniper: Math.round(sniperPct),
          bot_copy: Math.round(Math.random() * 8),
          retail: Math.round(retailPct),
          creator: Math.round(Math.random() * 2),
          fund: Math.round(Math.random() * 5),
        }),
      },
    });
  }

  console.log(`
╔══════════════════════════════════════════════╗
║  🧬 TokenDNA Recomputed!                    ║
╠══════════════════════════════════════════════╣
║  🟢 SAFE:         ${String(safe).padStart(5)} (riskScore < 30)      ║
║  🟡 WARNING:      ${String(warning).padStart(5)} (30-60)            ║
║  🔴 DANGER:       ${String(danger).padStart(5)} (riskScore > 60)    ║
║  Total:           ${String(safe + warning + danger).padStart(5)}                    ║
╚══════════════════════════════════════════════╝
  `);

  await db.$disconnect();
}

main().catch(console.error);
