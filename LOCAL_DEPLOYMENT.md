# CryptoQuant Terminal - Local Deployment Guide (Mac)

## Quick Start (Zero Cost, Open Source)

### Prerequisites (Free)
- **Node.js 20+** (https://nodejs.org - free)
- **Git** (pre-installed on macOS or: `xcode-select --install`)
- **4GB RAM minimum** (8GB recommended)

### Installation

```bash
# 1. Clone/download the project
git clone <your-repo-url> cryptoquant-terminal
cd cryptoquant-terminal

# 2. Install dependencies (free, no API keys needed)
npm install

# 3. Initialize database
npx prisma db push

# 4. Build the application
npm run build

# 5. Start the server
npm run start
```

Open http://localhost:3000 in your browser.

### Architecture: Why Local Mac is Better

| Feature | Local Mac | Online (Cloud) |
|---------|-----------|----------------|
| **Cost** | $0 (your hardware) | $5-50/month (VPS) |
| **Data privacy** | 100% local | Exposed to cloud |
| **API keys** | Stored locally only | On remote server |
| **Performance** | Direct DB access | Network latency |
| **Uptime** | When you want | 24/7 (costs money) |
| **Memory** | 8-16GB available | Limited (costs more) |
| **Storage** | Unlimited (your disk) | Limited (costs more) |

### Easy Updates

```bash
# Update to latest version
git pull origin main
npm install
npm run build
npm run start

# That's it! Database and data are preserved.
```

### Memory Management

The app is designed for responsible memory usage:

- **SQLite database**: No separate DB server, ~1MB per 1000 tokens
- **Cache**: 20MB max (auto-evicts old data)
- **Brain modules**: Lazy-loaded only when needed
- **Frontend**: 60s polling intervals (not aggressive)
- **Request queue**: Max 2 concurrent API calls from frontend

Memory usage on Mac:
- Idle: ~50MB
- Active analysis: ~200-400MB
- Peak (brain cycle): ~500MB

### Turn Off and Resume

```bash
# Stop the server (Ctrl+C or)
pkill -f "next start"

# All data is saved in SQLite: db/custom.db
# When you restart, everything continues where it left off

# Start again
npm run start
```

The app automatically:
- Resumes data collection from where it stopped
- Continues backtesting from the last checkpoint
- Restores brain cycle state from database
- No data is lost on restart

### Autonomous Trading Pipeline (12 Steps)

The pipeline runs automatically when you activate the Brain:

1. **Token Discovery** → CoinGecko + DexScreener scan
2. **Candlestick Pattern Scan** → Detect formations on OHLCV data
3. **Behavioral Prediction** → Trader behavior analysis
4. **Cross-Correlation** → Multi-token correlation analysis
5. **Auto-Record Observation** → Save to DB automatically
6. **Deep Analysis + LLM** → AI-powered analysis (optional)
7. **Strategy Selection** → Match best trading system
8. **Prediction Storage** → Store all predictions for evaluation
9. **Autonomous Execution** → Paper trading by default
10. **Outcome Evaluation (4h)** → Check prediction accuracy
11. **Bayesian Model Update** → Learn from results
12. **Loop** → test → eval → improve → re-test

### Data Sources (All Free, No API Keys Required)

- **CoinGecko** (primary): Market data, prices, volumes
- **DexScreener**: DEX token data, liquidity
- **DexPaprika**: Additional token coverage

### Running 24/7 (Optional)

If you want the brain to run continuously on your Mac:

```bash
# Option 1: Use tmux (recommended)
brew install tmux
tmux new -s cryptoquant
npm run start
# Detach: Ctrl+B then D
# Reattach: tmux attach -t cryptoquant

# Option 2: Use launchd (auto-start on boot)
# Create ~/Library/LaunchAgents/com.cryptoquant.terminal.plist
```

### Troubleshooting

**Port already in use:**
```bash
lsof -i :3000
kill -9 <PID>
```

**Database issues:**
```bash
npx prisma db push --accept-data-loss
```

**Memory issues:**
```bash
NODE_OPTIONS="--max-old-space-size=512" npm run start
```

### Project Structure

```
cryptoquant-terminal/
├── db/custom.db          # SQLite database (auto-created)
├── src/
│   ├── app/              # Next.js pages & API routes
│   ├── components/       # UI components
│   ├── lib/services/     # Brain engines (40+ modules)
│   └── store/            # State management
├── scripts/              # Standalone scripts
└── prisma/               # Database schema
```
