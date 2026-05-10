import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Generando Pattern Signals ===');

  const rules = await prisma.patternRule.findMany({ where: { isActive: true } });
  console.log(`Reglas activas: ${rules.length}`);

  const tokens = await prisma.token.findMany({ take: 100 });
  console.log(`Tokens: ${tokens.length}`);

  if (rules.length === 0 || tokens.length === 0) {
    console.log('No hay reglas o tokens');
    return;
  }

  const deleted = await prisma.signal.deleteMany({ where: { type: 'PATTERN' } });
  console.log(`Pattern signals anteriores borrados: ${deleted.count}`);

  let created = 0;

  for (const rule of rules) {
    let c: any = {};
    try {
      c = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions as string) : (rule.conditions || {});
    } catch { continue; }

    for (const token of tokens) {
      try {
        const pc24 = token.priceChange24h ?? 0;
        const vol = token.volume24h ?? 0;
        const liq = token.liquidity ?? 0;
        const mcap = token.marketCap ?? 0;

        let matched = false;
        let confidence = 0.5;
        let desc = rule.description || rule.name;

        // 1. Flash Crash Recovery: dropThreshold + recoveryThreshold
        if (c.dropThreshold !== undefined && pc24 < c.dropThreshold) {
          matched = true;
          confidence += 0.1;
          desc = `${rule.name}: Flash crash detected (${pc24.toFixed(2)}% 24h, threshold ${c.dropThreshold}%)`;
        }

        // 2. Volume Spike: minPriceChange + volumeMultiplier
        if (c.volumeMultiplier !== undefined && c.minPriceChange !== undefined) {
          if (Math.abs(pc24) >= c.minPriceChange && vol > 1000000) {
            matched = true;
            confidence += 0.1;
            desc = `${rule.name}: High volume with price move (${pc24.toFixed(2)}%, vol $${(vol/1e6).toFixed(1)}M)`;
          }
        }

        // 3. Liquidity Drain: liquidityDropPct + maxPriceChange
        if (c.liquidityDropPct !== undefined && c.maxPriceChange !== undefined) {
          if (Math.abs(pc24) <= c.maxPriceChange && liq > 0 && liq < 1000000) {
            matched = true;
            confidence += 0.1;
            desc = `${rule.name}: Low liquidity with stable price (liq $${(liq/1000).toFixed(0)}K)`;
          }
        }

        // 4. Bullish Divergence: h1Change + h24Change
        if (c.h1Change !== undefined && c.h24Change !== undefined) {
          if (pc24 < c.h24Change) {
            matched = true;
            confidence += 0.1;
            desc = `${rule.name}: 24h negative (${pc24.toFixed(2)}%) with potential 1h divergence`;
          }
        }

        // 5. Rug Pull Pattern: minDrop + minVolume
        if (c.minDrop !== undefined && c.minVolume !== undefined) {
          if (pc24 <= c.minDrop && vol >= c.minVolume) {
            matched = true;
            confidence += 0.15;
            desc = `${rule.name}: Drop ${pc24.toFixed(2)}% with vol $${(vol/1e6).toFixed(1)}M`;
          }
        }

        // 6. V-Shape Bounce: min24hDrop + min1hBounce
        if (c.min24hDrop !== undefined) {
          if (pc24 <= c.min24hDrop) {
            matched = true;
            confidence += 0.1;
            desc = `${rule.name}: 24h drop ${pc24.toFixed(2)}% with bounce potential`;
          }
        }

        // 7. Momentum Breakout: minChange + minVolume
        if (c.minChange !== undefined && c.minVolume !== undefined) {
          if (Math.abs(pc24) >= c.minChange && vol >= c.minVolume) {
            matched = true;
            confidence += 0.1;
            desc = `${rule.name}: ${pc24 > 0 ? 'Up' : 'Down'} momentum ${pc24.toFixed(2)}% vol $${(vol/1e6).toFixed(1)}M`;
          }
        }

        // 8. Smart Money Entry: min24hChange + min1hChange + minVolume
        if (c.min24hChange !== undefined && c.minVolume !== undefined) {
          if (pc24 >= c.min24hChange && vol >= c.minVolume) {
            matched = true;
            confidence += 0.1;
            desc = `${rule.name}: Entry signal ${pc24.toFixed(2)}% vol $${(vol/1e6).toFixed(1)}M`;
          }
        }

        // 9. Smart Money Exit: max24hChange + max1hChange + minVolume
        if (c.max24hChange !== undefined && c.minVolume !== undefined) {
          if (pc24 <= c.max24hChange && vol >= c.minVolume) {
            matched = true;
            confidence += 0.1;
            desc = `${rule.name}: Exit signal ${pc24.toFixed(2)}% vol $${(vol/1e6).toFixed(1)}M`;
          }
        }

        // 10. Liquidity Trap: maxLiquidity + volumeRatio
        if (c.maxLiquidity !== undefined && c.volumeRatio !== undefined) {
          if (liq > 0 && liq <= c.maxLiquidity && vol > liq * c.volumeRatio) {
            matched = true;
            confidence += 0.15;
            desc = `${rule.name}: Low liq $${(liq/1000).toFixed(0)}K with high vol ratio`;
          }
        }

        // 11. Trend Reversal: min1hAbs + min24hAbs
        if (c.min24hAbs !== undefined) {
          if (Math.abs(pc24) >= c.min24hAbs) {
            matched = true;
            confidence += 0.1;
            desc = `${rule.name}: Strong move ${pc24.toFixed(2)}% suggesting reversal`;
          }
        }

        // 12. Accumulation Zone: maxPriceChange + minVolume
        if (c.maxPriceChange !== undefined && c.minVolume !== undefined) {
          if (Math.abs(pc24) <= c.maxPriceChange && vol >= c.minVolume) {
            matched = true;
            confidence += 0.1;
            desc = `${rule.name}: Low volatility ${pc24.toFixed(2)}% with high vol $${(vol/1e6).toFixed(1)}M`;
          }
        }

        if (!matched) continue;

        confidence = Math.min(confidence, 0.95);
        const direction = pc24 > 1 ? 'BULLISH' : pc24 < -1 ? 'BEARISH' : 'NEUTRAL';

        await prisma.signal.create({
          data: {
            type: 'PATTERN',
            tokenId: token.id,
            confidence: Math.round(confidence * 100),
            direction,
            description: desc.slice(0, 500),
            metadata: JSON.stringify({
              patternRuleId: rule.id,
              patternRuleName: rule.name,
              category: rule.category || 'GENERAL',
              tokenSymbol: token.symbol,
              tokenChain: token.chain,
            }),
          },
        });
        created++;
      } catch { /* skip */ }
    }
  }

  console.log(`\nPattern signals creados: ${created}`);
  const total = await prisma.signal.count({ where: { type: 'PATTERN' } });
  console.log(`Total PATTERN signals en DB: ${total}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
