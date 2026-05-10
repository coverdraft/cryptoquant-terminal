-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chain" TEXT NOT NULL DEFAULT 'SOL',
    "priceUsd" REAL NOT NULL DEFAULT 0,
    "volume24h" REAL NOT NULL DEFAULT 0,
    "liquidity" REAL NOT NULL DEFAULT 0,
    "marketCap" REAL NOT NULL DEFAULT 0,
    "priceChange5m" REAL NOT NULL DEFAULT 0,
    "priceChange15m" REAL NOT NULL DEFAULT 0,
    "priceChange1h" REAL NOT NULL DEFAULT 0,
    "priceChange24h" REAL NOT NULL DEFAULT 0,
    "dexId" TEXT,
    "pairAddress" TEXT,
    "dex" TEXT,
    "pairUrl" TEXT,
    "holderCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueWallets24h" INTEGER NOT NULL DEFAULT 0,
    "botActivityPct" REAL NOT NULL DEFAULT 0,
    "smartMoneyPct" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Trader" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "chain" TEXT NOT NULL DEFAULT 'SOL',
    "ensName" TEXT,
    "solName" TEXT,
    "primaryLabel" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "subLabels" TEXT NOT NULL DEFAULT '[]',
    "labelConfidence" REAL NOT NULL DEFAULT 0,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "botType" TEXT,
    "botConfidence" REAL NOT NULL DEFAULT 0,
    "botDetectionSignals" TEXT NOT NULL DEFAULT '[]',
    "botDetectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "botFirstDetectedAt" DATETIME,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "winRate" REAL NOT NULL DEFAULT 0,
    "avgPnl" REAL NOT NULL DEFAULT 0,
    "totalPnl" REAL NOT NULL DEFAULT 0,
    "avgHoldTimeMin" REAL NOT NULL DEFAULT 0,
    "avgTradeSizeUsd" REAL NOT NULL DEFAULT 0,
    "largestTradeUsd" REAL NOT NULL DEFAULT 0,
    "totalVolumeUsd" REAL NOT NULL DEFAULT 0,
    "maxDrawdown" REAL NOT NULL DEFAULT 0,
    "sharpeRatio" REAL NOT NULL DEFAULT 0,
    "profitFactor" REAL NOT NULL DEFAULT 0,
    "avgSlippageBps" INTEGER NOT NULL DEFAULT 0,
    "frontrunCount" INTEGER NOT NULL DEFAULT 0,
    "frontrunByCount" INTEGER NOT NULL DEFAULT 0,
    "sandwichCount" INTEGER NOT NULL DEFAULT 0,
    "sandwichVictimCount" INTEGER NOT NULL DEFAULT 0,
    "washTradeScore" REAL NOT NULL DEFAULT 0,
    "copyTradeScore" REAL NOT NULL DEFAULT 0,
    "mevExtractionUsd" REAL NOT NULL DEFAULT 0,
    "avgTimeBetweenTrades" REAL NOT NULL DEFAULT 0,
    "tradingHourPattern" TEXT NOT NULL DEFAULT '[]',
    "tradingDayPattern" TEXT NOT NULL DEFAULT '[]',
    "isActiveAtNight" BOOLEAN NOT NULL DEFAULT false,
    "isActive247" BOOLEAN NOT NULL DEFAULT false,
    "consistencyScore" REAL NOT NULL DEFAULT 0,
    "uniqueTokensTraded" INTEGER NOT NULL DEFAULT 0,
    "avgPositionsAtOnce" INTEGER NOT NULL DEFAULT 0,
    "maxPositionsAtOnce" INTEGER NOT NULL DEFAULT 0,
    "preferredChains" TEXT NOT NULL DEFAULT '[]',
    "preferredDexes" TEXT NOT NULL DEFAULT '[]',
    "preferredTokenTypes" TEXT NOT NULL DEFAULT '[]',
    "isSmartMoney" BOOLEAN NOT NULL DEFAULT false,
    "smartMoneyScore" REAL NOT NULL DEFAULT 0,
    "earlyEntryCount" INTEGER NOT NULL DEFAULT 0,
    "avgEntryRank" REAL NOT NULL DEFAULT 0,
    "avgExitMultiplier" REAL NOT NULL DEFAULT 0,
    "topCallCount" INTEGER NOT NULL DEFAULT 0,
    "worstCallCount" INTEGER NOT NULL DEFAULT 0,
    "isWhale" BOOLEAN NOT NULL DEFAULT false,
    "whaleScore" REAL NOT NULL DEFAULT 0,
    "totalHoldingsUsd" REAL NOT NULL DEFAULT 0,
    "avgPositionUsd" REAL NOT NULL DEFAULT 0,
    "priceImpactAvg" REAL NOT NULL DEFAULT 0,
    "isSniper" BOOLEAN NOT NULL DEFAULT false,
    "sniperScore" REAL NOT NULL DEFAULT 0,
    "avgBlockToTrade" REAL NOT NULL DEFAULT 0,
    "block0EntryCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActive" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAnalyzed" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analysisVersion" INTEGER NOT NULL DEFAULT 1,
    "dataQuality" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TraderTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "traderId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" INTEGER,
    "blockTime" DATETIME NOT NULL,
    "chain" TEXT NOT NULL DEFAULT 'SOL',
    "dex" TEXT,
    "action" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "tokenSymbol" TEXT,
    "quoteToken" TEXT,
    "amountIn" REAL NOT NULL DEFAULT 0,
    "amountOut" REAL NOT NULL DEFAULT 0,
    "priceUsd" REAL NOT NULL DEFAULT 0,
    "valueUsd" REAL NOT NULL DEFAULT 0,
    "slippageBps" INTEGER,
    "pnlUsd" REAL,
    "isFrontrun" BOOLEAN NOT NULL DEFAULT false,
    "isSandwich" BOOLEAN NOT NULL DEFAULT false,
    "isWashTrade" BOOLEAN NOT NULL DEFAULT false,
    "isJustInTime" BOOLEAN NOT NULL DEFAULT false,
    "pairedTxHash" TEXT,
    "gasUsed" REAL,
    "gasPrice" REAL,
    "priorityFee" REAL,
    "totalFeeUsd" REAL,
    "tokenAgeAtTrade" REAL,
    "holderCountAtTrade" INTEGER,
    "liquidityAtTrade" REAL,
    "logIndex" INTEGER,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TraderTransaction_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "Trader" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WalletTokenHolding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "traderId" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "tokenSymbol" TEXT,
    "chain" TEXT NOT NULL DEFAULT 'SOL',
    "balance" REAL NOT NULL DEFAULT 0,
    "valueUsd" REAL NOT NULL DEFAULT 0,
    "avgEntryPrice" REAL NOT NULL DEFAULT 0,
    "unrealizedPnl" REAL NOT NULL DEFAULT 0,
    "unrealizedPnlPct" REAL NOT NULL DEFAULT 0,
    "firstBuyAt" DATETIME,
    "lastTradeAt" DATETIME,
    "buyCount" INTEGER NOT NULL DEFAULT 0,
    "sellCount" INTEGER NOT NULL DEFAULT 0,
    "totalBoughtUsd" REAL NOT NULL DEFAULT 0,
    "totalSoldUsd" REAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WalletTokenHolding_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "Trader" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TraderBehaviorPattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "traderId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 0,
    "dataPoints" INTEGER NOT NULL DEFAULT 0,
    "firstObserved" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastObserved" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "TraderBehaviorPattern_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "Trader" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CrossChainWallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "primaryWalletId" TEXT NOT NULL,
    "linkedWalletId" TEXT NOT NULL,
    "primaryChain" TEXT NOT NULL,
    "linkedChain" TEXT NOT NULL,
    "linkedAddress" TEXT NOT NULL,
    "linkType" TEXT NOT NULL DEFAULT 'SAME_ENTITY',
    "linkConfidence" REAL NOT NULL DEFAULT 0,
    "evidence" TEXT NOT NULL DEFAULT '[]',
    "bridgeTxCount" INTEGER NOT NULL DEFAULT 0,
    "totalBridgedUsd" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrossChainWallet_primaryWalletId_fkey" FOREIGN KEY ("primaryWalletId") REFERENCES "Trader" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CrossChainWallet_linkedWalletId_fkey" FOREIGN KEY ("linkedWalletId") REFERENCES "Trader" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TraderLabelAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "traderId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ALGORITHM',
    "confidence" REAL NOT NULL DEFAULT 0,
    "evidence" TEXT NOT NULL DEFAULT '[]',
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "TraderLabelAssignment_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "Trader" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'CUSTOM',
    "tokenId" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "priceTarget" REAL,
    "direction" TEXT NOT NULL DEFAULT 'LONG',
    "description" TEXT NOT NULL DEFAULT '',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Signal_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL DEFAULT 'OPEN_POSITION',
    "tokenId" TEXT,
    "walletAddress" TEXT,
    "entryPrice" REAL,
    "stopLoss" REAL,
    "takeProfit" REAL,
    "pnl" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PatternRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "conditions" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "backtestResults" TEXT NOT NULL DEFAULT '{}',
    "winRate" REAL NOT NULL DEFAULT 0,
    "occurrences" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TokenDNA" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenId" TEXT NOT NULL,
    "liquidityDNA" TEXT NOT NULL DEFAULT '[]',
    "walletDNA" TEXT NOT NULL DEFAULT '[]',
    "topologyDNA" TEXT NOT NULL DEFAULT '[]',
    "riskScore" INTEGER NOT NULL DEFAULT 50,
    "botActivityScore" REAL NOT NULL DEFAULT 0,
    "smartMoneyScore" REAL NOT NULL DEFAULT 0,
    "retailScore" REAL NOT NULL DEFAULT 0,
    "whaleScore" REAL NOT NULL DEFAULT 0,
    "washTradeProb" REAL NOT NULL DEFAULT 0,
    "sniperPct" REAL NOT NULL DEFAULT 0,
    "mevPct" REAL NOT NULL DEFAULT 0,
    "copyBotPct" REAL NOT NULL DEFAULT 0,
    "traderComposition" TEXT NOT NULL DEFAULT '{}',
    "topWallets" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenDNA_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Token_address_key" ON "Token"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Trader_address_key" ON "Trader"("address");

-- CreateIndex
CREATE UNIQUE INDEX "TraderTransaction_txHash_key" ON "TraderTransaction"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "TokenDNA_tokenId_key" ON "TokenDNA"("tokenId");
