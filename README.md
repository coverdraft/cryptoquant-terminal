# CryptoQuant Terminal

Professional crypto analytics terminal with 9 interactive panels, real-time data, AI-powered signals, and smart money tracking.

Built with **Next.js 16** + **React 19** + **TypeScript** + **Tailwind CSS 4** + **shadcn/ui** + **Prisma** + **SQLite**.

---

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Start dev server
npm run dev
```

Open **http://localhost:3000**

---

## Data Seeding (First Time)

The terminal needs data to work. Run these in order:

```bash
# 1. Load tokens from DexScreener (~3,000+ tokens)
curl http://localhost:3000/api/seed

# 2. Enrich tokens with liquidity data + generate signals
curl http://localhost:3000/api/data-sync

# 3. Seed traders for Smart Money panel (550 traders)
npx tsx scripts/seed-traders.ts

# 4. (Optional) Run full Prisma seed (tokens + trading systems + behavior models)
npx tsx prisma/seed.ts
```

---

## The 9 Panels

| Key | Panel | Tab ID | Component | API Routes | Description |
|-----|-------|--------|-----------|------------|-------------|
| **F1** | Token Flow | `dashboard` | `token-flow.tsx` | `/api/market/tokens`, `/api/dashboard/stats` | Live token table with prices, volume, liquidity, DNA scores |
| **F2** | Signals | `signals` | `signal-center.tsx` | `/api/signals`, `/api/predictive` | Real-time + predictive signals with token names, confidence, direction |
| **F3** | DNA Scanner | `dna-scanner` | `dna-scanner.tsx` | `/api/tokens/[id]` | Token DNA profile: risk, bot activity, smart money presence, whale concentration |
| **F4** | Brain | `brain` | `brain-control.tsx` | `/api/brain/scheduler`, `/api/brain/status` | 12-phase analysis pipeline control (Start/Stop/Run Cycle) |
| **F5** | Trading Systems | `trading-systems` | `trading-systems-lab.tsx` | `/api/trading-systems`, `/api/trading-systems/templates` | CRUD trading systems with 5-layer config (asset filter, phases, entry/exit, execution) |
| **F6** | Backtesting Lab | `backtesting` | `backtesting-lab.tsx` | `/api/backtest`, `/api/backtest/[id]/run` | Create and run backtests against trading systems with walk-forward analysis |
| **F7** | Smart Money | `trader-intel` | `trader-intelligence.tsx` | `/api/traders`, `/api/traders/bots`, `/api/traders/leaderboard` | 550 traders across 8 archetypes (whale, degen, sniper, MEV bot, etc.) |
| **F8** | Deep Analysis | `deep-analysis` | `deep-analysis-panel.tsx` | `/api/deep-analysis` | Deep token analysis using Brain Orchestrator + Candlestick Patterns + Cross-Correlation |
| **F9** | Predictive Engine | `big-data` | `big-data-predictive.tsx` | `/api/predictive` | AI-generated signals (regime change, bot swarms, whale movement, etc.) |

### Hidden Tabs (bonus)
- `charts` - OHLCV candlestick chart
- `pattern-builder` - Pattern rule builder
- `heatmap` - User activity heatmap

---

## Architecture

```
src/
├── app/
│   ├── api/              # 70 API route handlers
│   │   ├── brain/        # Brain engine (init, analyze, scheduler, pipeline, status)
│   │   ├── backtest/     # Backtesting (create, run, walk-forward)
│   │   ├── market/       # Market data (tokens, ohlcv, smart-money, search)
│   │   ├── signals/      # Signal CRUD + filtering
│   │   ├── traders/      # Trader intelligence (leaderboard, bots, search)
│   │   ├── trading-systems/  # Trading system CRUD + templates + activate
│   │   ├── predictive/   # Predictive signal generation + queries
│   │   ├── deep-analysis/    # Deep token analysis
│   │   ├── seed/          # Fast bulk token loader (DexScreener)
│   │   └── data-sync/    # Token enrichment + signal generation
│   └── page.tsx           # Main terminal UI
├── components/
│   ├── dashboard/         # 22 terminal components
│   └── ui/                # 36 shadcn/ui primitives
├── lib/
│   ├── db.ts              # Prisma singleton
│   ├── services/          # 58 service modules
│   │   ├── brain-*.ts     # Brain engine (orchestrator, pipeline, scheduler, capacity)
│   │   ├── backtest-*.ts  # Backtesting engine
│   │   ├── dexscreener-client.ts  # DexScreener API (primary, no rate limits)
│   │   ├── dexpaprika-client.ts   # DexPaprika API (cross-chain, OHLCV)
│   │   ├── coingecko-client.ts    # CoinGecko API (secondary, rate limited)
│   │   ├── signal-generators.ts   # Signal generation logic
│   │   ├── smart-money-tracker.ts # Smart money tracking
│   │   ├── wallet-profiler.ts     # Wallet profiling
│   │   ├── bot-detection.ts       # Bot detection engine
│   │   ├── trading-system-engine.ts  # Trading system engine
│   │   ├── big-data-engine.ts     # Predictive engine
│   │   └── ...            # Many more
│   ├── real-data-loader.ts # Main data orchestrator
│   └── validations.ts     # Zod schemas
├── store/
│   ├── crypto-store.ts    # Zustand main state
│   └── deep-analysis-store.ts
├── hooks/
└── prisma/
    └── schema.prisma      # 22+ models

prisma/
└── seed.ts                # Comprehensive 6-phase seed script

scripts/
├── seed-traders.ts        # 550 traders across 8 archetypes
├── seed-tokens.ts         # Token loader
├── seed-events.ts         # User event seed
├── compute-token-dna.ts   # DNA computation
└── ...                    # 17 total scripts
```

---

## Data Sources

| Source | Type | Rate Limit | Use |
|--------|------|-----------|-----|
| **DexScreener** | REST API | None | Primary: token discovery, liquidity, price data |
| **DexPaprika** | REST API | Moderate | Cross-chain data, OHLCV candles |
| **CoinGecko** | REST API | 10-30 req/min | Secondary: top tokens, market data |

### Not Yet Integrated (planned)
- **Helius** — Solana wallet transactions (env: `HELIUS_API_KEY`)
- **Etherscan** — Ethereum wallet data (env: `ETHERSCAN_API_KEY`)
- **Dune Analytics** — On-chain analytics (env: `DUNE_API_KEY`)
- **Footprint Analytics** — Historical data (env: `FOOTPRINT_API_KEY`)

---

## Database Schema (22+ Models)

**Core**: `Token`, `TokenDNA`, `Signal`, `PriceCandle`, `PredictiveSignal`

**Traders**: `Trader`, `TraderTransaction`, `WalletTokenHolding`, `TraderBehaviorPattern`, `CrossChainWallet`, `TraderLabelAssignment`, `TraderBehaviorModel`

**Systems**: `TradingSystem`, `BacktestRun`, `BacktestOperation`

**Brain**: `BrainCycleRun`, `SchedulerState`, `CapitalState`, `OperabilitySnapshot`, `OperabilityScore`

**Analytics**: `TokenLifecycleState`, `PatternRule`, `ComparativeAnalysis`, `SystemEvolution`, `FeedbackMetrics`, `TradingCycle`

**Social**: `UserEvent`, `CompoundGrowthTracker`

---

## Project Status & Roadmap

### Current State: **v0.9 — Functional Prototype**

All 9 panels are working with real and simulated data. The terminal loads, displays tokens, generates signals, shows trader intelligence, and supports backtesting.

### What Works Now

- [x] Token loading from DexScreener (3,000+ tokens)
- [x] Token enrichment with liquidity data
- [x] Signal generation (RUG_PULL, SMART_MONEY_ENTRY, LIQUIDITY_TRAP, V_SHAPE, DIVERGENCE)
- [x] Signals display token NAMES (not DB IDs) - fixed 2025-05-12
- [x] TokenDNA risk profiling (riskScore, botActivity, smartMoneyScore, whaleScore)
- [x] Brain 12-phase pipeline (Start/Stop/Run Cycle)
- [x] Trading Systems CRUD (8 templates)
- [x] Backtesting Lab (create, run, view results)
- [x] Smart Money panel with 550 traders across 8 archetypes
- [x] Deep Analysis (Brain Orchestrator + Candlestick Patterns + Cross-Correlation)
- [x] Predictive Engine (regime change, bot swarms, whale movement signals)
- [x] OHLCV candles loading (~1,266 from DexPaprika)
- [x] 16,687 trader transactions, 1,090 behavior patterns, 2,882 token holdings

### Known Issues / Limitations

- [ ] **Low liquidity coverage**: Only ~245/3,437 tokens have liquidity data (7%) — DexScreener rate limits during enrichment
- [ ] **No real smart money data**: `dexPaprikaClient.trackSmartMoney()` returns `[]` — requires Helius/Etherscan integration for on-chain wallet data
- [ ] **Predictive signals not auto-generated**: Must click "Run Full Analysis" in F9 panel — no scheduled generation yet
- [ ] **Deep Analysis needs token address**: No autocomplete dropdown — user must paste address manually
- [ ] **DNA Scanner "Similar Patterns"**: Section is hardcoded mock data, not from real pattern matching
- [ ] **Brain scheduler**: May fail silently if in-memory singleton not initialized before DB state update

### Next Milestones

#### v1.0 — Production Ready
- [ ] Integrate Helius API for real Solana wallet tracking
- [ ] Integrate Etherscan for Ethereum wallet data
- [ ] Auto-generate predictive signals on schedule
- [ ] Increase liquidity coverage to 50%+ tokens
- [ ] Add token search autocomplete in Deep Analysis
- [ ] Implement real pattern matching in DNA Scanner
- [ ] Add WebSocket real-time price streaming
- [ ] Error boundary and loading states for all panels

#### v1.1 — Enhanced Analytics
- [ ] Cross-chain correlation analysis
- [ ] Wallet profiling with PnL tracking
- [ ] Portfolio simulation (paper trading)
- [ ] Custom alert system (email/webhook notifications)
- [ ] Historical signal accuracy tracking (wasCorrect field)
- [ ] Regime detection with ML models

#### v1.2 — Social & Collaboration
- [ ] User accounts and authentication
- [ ] Shared trading systems and strategies
- [ ] Leaderboard with verified track records
- [ ] Community signal feed with voting

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# Database
DATABASE_URL="file:/home/z/my-project/db/custom.db"

# Primary data sources (free, no key needed)
# DexScreener - no API key required
# DexPaprika - no API key required

# Secondary data sources
COINGECKO_API_KEY=""           # Optional, increases rate limit

# On-chain data (needed for real smart money tracking)
HELIUS_API_KEY=""              # Solana wallet transactions
ETHERSCAN_API_KEY=""           # Ethereum wallet data

# Analytics (optional)
DUNE_API_KEY=""                # On-chain analytics
FOOTPRINT_API_KEY=""           # Historical data
SQD_API_KEY=""                 # Subsquid indexer
BIRDEYE_API_KEY=""             # Solana DEX data

# Auth (optional)
NEXTAUTH_SECRET=""             # For user authentication
NEXTAUTH_URL="http://localhost:3000"
```

---

## Key Commands

```bash
# Development
npm run dev                    # Start Next.js dev server on port 3000

# Database
npx prisma generate            # Generate Prisma client from schema
npx prisma db push             # Push schema changes to database
npx prisma studio              # Open Prisma database browser

# Seeding
curl http://localhost:3000/api/seed          # Load tokens from DexScreener
curl http://localhost:3000/api/data-sync     # Enrich tokens + generate signals
npx tsx scripts/seed-traders.ts              # Seed 550 traders
npx tsx prisma/seed.ts                       # Full 6-phase seed

# Brain
curl -X POST http://localhost:3000/api/brain/init?force=true   # Initialize brain
curl http://localhost:3000/api/brain/scheduler                  # Check scheduler status
curl -X POST http://localhost:3000/api/brain/scheduler          # Start scheduler

# Production
npm run build                  # Build for production
npm start                      # Start production server
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `EADDRINUSE: port 3000` | `lsof -ti:3000 \| xargs kill -9` then restart |
| `brain/init "already-running"` | Add `?force=true` to reset lock |
| Signals show CUIDs instead of names | Fixed — `git pull` to get latest |
| 0 traders in Smart Money | Run `npx tsx scripts/seed-traders.ts` |
| 0 candles | Run `curl http://localhost:3000/api/data-sync` to load from DexPaprika |
| Empty token table | Run `curl http://localhost:3000/api/seed` to load from DexScreener |

---

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts, Framer Motion, Zustand, TanStack Query
- **Backend**: Next.js API Routes, Prisma ORM, SQLite
- **Real-time**: Socket.IO (WebSocket bridge)
- **Data**: DexScreener, DexPaprika, CoinGecko
- **AI/ML**: Brain Orchestrator (12-phase pipeline), Predictive Engine, Bot Detection

---

## License

Private — All rights reserved.
