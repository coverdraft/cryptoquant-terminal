# CryptoQuant Terminal

Professional-grade crypto analytics terminal with real-time token tracking, DNA risk scanning, smart money intelligence, and AI-powered predictions.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socket.io)

---

## Features

- **Real-time Token Flow** — Live token prices, volume, and market movements via WebSocket
- **DNA Scanner** — Token risk profiling: liquidity DNA, wallet DNA, bot activity, wash trade detection
- **Smart Money Intelligence** — Wallet classification, behavioral profiling, and cross-chain tracking
- **Brain Engine** — 24/7 autonomous analysis scheduler with 12-step pipeline
- **Trading Systems Lab** — Create, configure, and manage systematic trading strategies
- **Backtesting Engine** — Historical and walk-forward backtesting with anti-overfitting checks
- **Big Data Predictive Engine** — Regime detection, anomaly scoring, and predictive signals
- **Deep Analysis** — LLM-powered token analysis with multi-dimensional scoring
- **Bot Detection** — MEV, sniper, sandwich, wash trading, and copy bot identification
- **Paper Trading** — Simulated execution with fee-awareness and compound growth tracking
- **OHLCV Charts** — Historical candlestick data with pattern recognition
- **Cross-Chain Support** — SOL, ETH, Base, Arbitrum, and more via multi-chain screener

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Next.js 16 (SSR)                  │
│          React 19 · Tailwind 4 · shadcn/ui          │
├─────────────────────────────────────────────────────┤
│              API Routes (60+ endpoints)              │
│     Brain · Tokens · Traders · Backtest · Market     │
├────────────────────────┬────────────────────────────┤
│   Prisma ORM (SQLite)  │   Socket.IO Server (:3003) │
│   25+ data models      │   Real-time event stream   │
├────────────────────────┴────────────────────────────┤
│              Brain Engine (40+ service modules)       │
│  Scheduler · Pipeline · Cycle · Orchestrator · LLM   │
├─────────────────────────────────────────────────────┤
│           Data Sources (free, no API keys)            │
│     CoinGecko · DexScreener · DexPaprika             │
└─────────────────────────────────────────────────────┘
```

**Data flow:** Blockchain APIs → Service modules → SQLite via Prisma → Next.js API routes → React UI. Real-time updates flow through Socket.IO server → WebSocket provider → Zustand store → UI components.

---

## Quick Start

### Prerequisites

- **Node.js 18+** (20+ recommended) — [Download](https://nodejs.org)
- **Bun** (recommended for faster installs) — `npm install -g bun`
- **4 GB RAM** minimum (8 GB recommended)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/cryptoquant-terminal.git
cd cryptoquant-terminal

# 2. Install dependencies
bun install          # or: npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your settings (see Environment Variables below)

# 4. Initialize the database
npx prisma db push
npx prisma generate

# 5. Build the application
bun run build        # or: npm run build

# 6. Start the development server
bun run dev          # or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Start the WebSocket Server

The WebSocket server provides real-time token updates, signals, and brain events:

```bash
# From project root
npx tsx mini-services/crypto-ws/index.ts
```

This starts the Socket.IO server on port **3003** and an internal brain event bridge on port **3010**.

For production:

```bash
bun run start        # or: npm run start
# Then in a separate terminal:
npx tsx mini-services/crypto-ws/index.ts
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | SQLite database path (relative to `prisma/`) |
| `HELIUS_API_KEY` | — | Helius Solana RPC API key (optional) |
| `MORALIS_API_KEY` | — | Moralis multi-chain API key (optional) |
| `ETHERSCAN_API_KEY` | — | Etherscan Ethereum API key (optional) |
| `SQD_API_KEY` | — | SQD Network data key (optional) |
| `DUNE_API_KEY` | — | Dune Analytics API key (optional) |
| `FOOTPRINT_API_KEY` | — | Footprint Analytics API key (optional) |
| `DATA_SOURCE` | `hybrid` | Data mode: `hybrid` \| `simulation` \| `live` |
| `WS_BRIDGE_URL` | `http://localhost:3010` | Brain event bridge URL |
| `WS_CLIENT_PORT` | `3003` | WebSocket server port |
| `NEXTAUTH_SECRET` | — | NextAuth secret (future auth) |
| `NEXTAUTH_URL` | `http://localhost:3000` | NextAuth base URL |
| `BRAIN_SCAN_LIMIT` | `250` | Max tokens scanned per brain cycle |
| `BRAIN_CAPITAL_USD` | `10` | Starting capital for brain paper trading |
| `BRAIN_CHAIN` | `SOL` | Default chain for brain analysis |
| `PORT` | `3000` | Next.js server port |
| `NODE_ENV` | `development` | Runtime environment |

> **Note:** No API keys are required to run the terminal. It ships with simulation mode and free data sources (CoinGecko, DexScreener, DexPaprika). API keys unlock additional data coverage.

---

## Project Structure

```
cryptoquant-terminal/
├── prisma/
│   └── schema.prisma       # Database schema (25+ models)
├── src/
│   ├── app/
│   │   ├── page.tsx         # Main dashboard (single-page app)
│   │   ├── layout.tsx       # Root layout
│   │   └── api/             # API route handlers
│   │       ├── brain/       # Brain engine endpoints
│   │       ├── tokens/      # Token CRUD
│   │       ├── traders/     # Trader intelligence
│   │       ├── market/      # Market data & OHLCV
│   │       ├── backtest/    # Backtesting endpoints
│   │       ├── signals/     # Signal management
│   │       ├── trading-systems/  # System lab
│   │       ├── paper-trading/    # Paper execution
│   │       ├── predictive/  # Predictive signals
│   │       └── ...          # patterns, decisions, extractor, etc.
│   ├── components/
│   │   ├── dashboard/       # Terminal UI panels
│   │   └── ui/              # shadcn/ui base components
│   ├── lib/
│   │   ├── services/        # 40+ brain & data service modules
│   │   ├── db.ts            # Prisma client
│   │   ├── ws-bridge.ts     # Brain → WebSocket event bridge
│   │   └── unified-cache.ts # In-memory caching layer
│   ├── store/
│   │   └── crypto-store.ts  # Zustand global state
│   └── hooks/               # React hooks
├── mini-services/
│   └── crypto-ws/
│       └── index.ts         # Standalone Socket.IO server
└── examples/
    └── websocket/
        └── server.ts        # Example WebSocket server
```

---

## API Overview

| Route Group | Endpoints | Description |
|---|---|---|
| `/api/brain/` | status, scheduler, pipeline, analyze, capacity, growth, loops, phase-signals, phase-strategy, backfill | Brain engine control & monitoring |
| `/api/tokens/` | list, detail | Token data & management |
| `/api/traders/` | list, detail, search, leaderboard, bots | Trader intelligence & wallet profiling |
| `/api/market/` | summary, tokens, ohlcv, smart-money, buy-sell-pressure, context, search, pools, stream | Market data & analytics |
| `/api/signals/` | list, detail | Signal feed |
| `/api/backtest/` | create, run, detail, walk-forward | Backtesting engine |
| `/api/trading-systems/` | list, detail, activate, templates | Trading system management |
| `/api/paper-trading/` | positions, trades | Simulated execution |
| `/api/predictive/` | list | Predictive signals |
| `/api/decisions/` | list | Decision logs |
| `/api/extractor/` | trigger | Data extraction jobs |
| `/api/deep-analysis/` | run | LLM-powered deep analysis |

---

## Brain Engine

The Brain is a 24/7 autonomous analysis engine that runs a continuous loop of:

1. **Token Discovery** — Scan CoinGecko and DexScreener for trending tokens
2. **Operability Filter** — Assess fee impact, slippage, and liquidity for tradeability
3. **DNA Analysis** — Compute risk scores, bot activity, smart money presence
4. **Candlestick Pattern Scan** — Detect formations on OHLCV data
5. **Behavioral Prediction** — Analyze trader behavior by archetype and token phase
6. **Cross-Correlation** — Multi-token correlation analysis
7. **Strategy Selection** — Match the best trading system for each token
8. **Signal Generation** — Produce actionable signals with confidence scores
9. **Paper Trading** — Execute simulated trades with fee awareness
10. **Outcome Evaluation** — Check prediction accuracy after 4 hours
11. **Bayesian Update** — Learn from results and update models
12. **Loop** — Test → Evaluate → Improve → Re-test

The scheduler persists its state to SQLite, so it resumes exactly where it left off after restarts. Capital growth is tracked with compound returns and fee-adjusted PnL.

---

## Keyboard Shortcuts

| Key | Panel |
|---|---|
| `F1` | Token Flow — Live token feed & prices |
| `F2` | Signals — Real-time signal feed |
| `F3` | DNA Scanner — Token DNA risk analysis |
| `F4` | Brain — Control center & scheduler |
| `F5` | Trading Systems — Strategy lab |
| `F6` | Backtesting Lab — Strategy backtesting |
| `F7` | Smart Money — Trader intelligence |
| `F8` | Deep Analysis — Deep token analysis |
| `F9` | Predictive Engine — AI predictions |
| `Escape` | Return to previous panel |

---

## License

[MIT](LICENSE)
