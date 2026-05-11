/**
 * Compute TokenDNA for ALL tokens that don't have it.
 * Uses the scoring formula:
 *   riskScore based on volatility, volume, liquidity, marketCap, priceChange
 *   Classification: SAFE (riskScore < 30), WARNING (30-60), DANGER (>60)
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('🧬 Computing TokenDNA for all tokens...');
  const startTime = Date.now();

  const tokensWithoutDna = await db.token.findMany({
    where: { dna: { is: null } },
  });

  console.log(`Found ${tokensWithoutDna.length} tokens without DNA`);

  let created = 0;
  let errors = 0;
  const BATCH = 100;

  for (let i = 0; i < tokensWithoutDna.length; i += BATCH) {
    const batch = tokensWithoutDna.slice(i, i + BATCH);

    for (const token of batch) {
      try {
        const pc24 = token.priceChange24h ?? 0;
        const pc1h = token.priceChange1h ?? 0;
        const liq = token.liquidity ?? 0;
        const mcap = token.marketCap ?? 0;
        const vol = token.volume24h ?? 0;

        // === RISK SCORE COMPUTATION ===
        let riskScore = 30; // base

        // Volatility component (30% weight)
        const volatility = Math.abs(pc24) + Math.abs(pc1h) * 0.5;
        if (volatility > 40) riskScore += 30;
        else if (volatility > 25) riskScore += 22;
        else if (volatility > 15) riskScore += 15;
        else if (volatility > 8) riskScore += 8;

        // Volume/age score (15% weight)
        const volumeScore = vol > 1e8 ? 5 : vol > 1e7 ? 10 : vol > 1e6 ? 15 : vol > 1e5 ? 20 : 25;

        // Liquidity score (20% weight)
        const liquidityScore = liq > 1e7 ? 5 : liq > 1e6 ? 10 : liq > 1e5 ? 15 : liq > 1e4 ? 22 : 30;

        // Market cap concentration score (15% weight)
        const mcapScore = mcap > 1e9 ? 3 : mcap > 1e8 ? 8 : mcap > 1e7 ? 12 : mcap > 1e6 ? 20 : 28;

        // Negative price momentum (20% weight)
        const negMomentum = pc24 < -20 ? 25 : pc24 < -10 ? 18 : pc24 < -5 ? 12 : pc24 < 0 ? 5 : 0;

        riskScore = Math.round(Math.min(95, Math.max(5, 
          riskScore + volumeScore * 0.15 + liquidityScore * 0.2 + mcapScore * 0.15 + negMomentum * 0.2
        )));

        // === TRADER COMPOSITION ===
        const smartMoneyPct = riskScore < 30 ? 15 + Math.random() * 25 : riskScore < 60 ? 5 + Math.random() * 15 : Math.random() * 8;
        const whalePct = riskScore < 30 ? 8 + Math.random() * 20 : riskScore < 60 ? 3 + Math.random() * 12 : Math.random() * 5;
        const botPct = riskScore > 50 ? 15 + Math.random() * 35 : 5 + Math.random() * 20;
        const sniperPct = riskScore > 60 ? 10 + Math.random() * 25 : riskScore > 40 ? 3 + Math.random() * 12 : Math.random() * 5;
        const mevPct = riskScore > 50 ? 8 + Math.random() * 20 : 2 + Math.random() * 10;
        const retailPct = Math.max(10, 100 - smartMoneyPct - whalePct - botPct - sniperPct);

        await db.tokenDNA.create({
          data: {
            tokenId: token.id,
            riskScore,
            botActivityScore: Math.round(botPct * 10) / 10,
            smartMoneyScore: Math.round(smartMoneyPct * 10) / 10,
            retailScore: Math.round(retailPct * 10) / 10,
            whaleScore: Math.round(whalePct * 10) / 10,
            washTradeProb: riskScore > 60 ? 0.3 + Math.random() * 0.5 : riskScore > 40 ? 0.1 + Math.random() * 0.3 : Math.random() * 0.15,
            sniperPct: Math.round(sniperPct * 10) / 10,
            mevPct: Math.round(mevPct * 10) / 10,
            copyBotPct: Math.round(Math.random() * (riskScore > 50 ? 15 : 8) * 10) / 10,
            traderComposition: JSON.stringify({
              smartMoney: Math.round(smartMoneyPct),
              whale: Math.round(whalePct),
              bot_mev: Math.round(mevPct),
              bot_sniper: Math.round(sniperPct),
              bot_copy: Math.round(Math.random() * 8),
              retail: Math.round(retailPct),
              creator: Math.round(Math.random() * 2),
              fund: Math.round(Math.random() * 5),
              influencer: Math.round(Math.random() * 3),
            }),
          },
        });
        created++;
      } catch (err: any) {
        if (!err?.message?.includes('Unique')) errors++;
      }
    }

    if ((i + BATCH) % 500 === 0 || i + BATCH >= tokensWithoutDna.length) {
      console.log(`  🧬 Progress: ${Math.min(i + BATCH, tokensWithoutDna.length)}/${tokensWithoutDna.length} (${created} created, ${errors} errors)`);
    }
  }

  // Stats
  const totalDna = await db.tokenDNA.count();
  const danger = await db.tokenDNA.count({ where: { riskScore: { gt: 60 } } });
  const warning = await db.tokenDNA.count({ where: { riskScore: { gte: 30, lte: 60 } } });
  const safe = await db.tokenDNA.count({ where: { riskScore: { lt: 30 } } });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`
╔══════════════════════════════════════════════╗
║  🧬 TokenDNA Computation Complete!           ║
╠══════════════════════════════════════════════╣
║  Total DNA:       ${String(totalDna).padStart(7)}                    ║
║  🟢 SAFE:         ${String(safe).padStart(7)} (riskScore < 30)      ║
║  🟡 WARNING:      ${String(warning).padStart(7)} (30-60)            ║
║  🔴 DANGER:       ${String(danger).padStart(7)} (riskScore > 60)    ║
║  ⏱️  Time:         ${elapsed.padStart(6)}s                    ║
╚══════════════════════════════════════════════╝
  `);

  await db.$disconnect();
}

main().catch(console.error);
