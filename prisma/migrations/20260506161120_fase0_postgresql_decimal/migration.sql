-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chain" TEXT NOT NULL DEFAULT 'SOL',
    "priceUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "volume24h" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "liquidity" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "marketCap" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "priceChange5m" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceChange15m" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceChange1h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceChange24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dexId" TEXT,
    "pairAddress" TEXT,
    "dex" TEXT,
    "pairUrl" TEXT,
    "holderCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueWallets24h" INTEGER NOT NULL DEFAULT 0,
    "botActivityPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "smartMoneyPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trader" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chain" TEXT NOT NULL DEFAULT 'SOL',
    "ensName" TEXT,
    "solName" TEXT,
    "primaryLabel" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "subLabels" TEXT NOT NULL DEFAULT '[]',
    "labelConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "botType" TEXT,
    "botConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "botDetectionSignals" TEXT NOT NULL DEFAULT '[]',
    "botDetectionVersion" TEXT NOT NULL DEFAULT '1.0',
    "botFirstDetectedAt" TIMESTAMP(3),
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgPnl" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalPnl" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "avgHoldTimeMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgTradeSizeUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "largestTradeUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalVolumeUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "maxDrawdown" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sharpeRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitFactor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgSlippageBps" INTEGER NOT NULL DEFAULT 0,
    "frontrunCount" INTEGER NOT NULL DEFAULT 0,
    "frontrunByCount" INTEGER NOT NULL DEFAULT 0,
    "sandwichCount" INTEGER NOT NULL DEFAULT 0,
    "sandwichVictimCount" INTEGER NOT NULL DEFAULT 0,
    "washTradeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "copyTradeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mevExtractionUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "avgTimeBetweenTrades" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tradingHourPattern" TEXT NOT NULL DEFAULT '[]',
    "tradingDayPattern" TEXT NOT NULL DEFAULT '[]',
    "isActiveAtNight" BOOLEAN NOT NULL DEFAULT false,
    "isActive247" BOOLEAN NOT NULL DEFAULT false,
    "consistencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uniqueTokensTraded" INTEGER NOT NULL DEFAULT 0,
    "avgPositionsAtOnce" INTEGER NOT NULL DEFAULT 0,
    "maxPositionsAtOnce" INTEGER NOT NULL DEFAULT 0,
    "preferredChains" TEXT NOT NULL DEFAULT '[]',
    "preferredDexes" TEXT NOT NULL DEFAULT '[]',
    "preferredTokenTypes" TEXT NOT NULL DEFAULT '[]',
    "isSmartMoney" BOOLEAN NOT NULL DEFAULT false,
    "smartMoneyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "earlyEntryCount" INTEGER NOT NULL DEFAULT 0,
    "avgEntryRank" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgExitMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topCallCount" INTEGER NOT NULL DEFAULT 0,
    "worstCallCount" INTEGER NOT NULL DEFAULT 0,
    "isWhale" BOOLEAN NOT NULL DEFAULT false,
    "whaleScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHoldingsUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "avgPositionUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "priceImpactAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isSniper" BOOLEAN NOT NULL DEFAULT false,
    "sniperScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgBlockToTrade" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "block0EntryCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAnalyzed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analysisVersion" INTEGER NOT NULL DEFAULT 1,
    "dataQuality" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraderTransaction" (
    "id" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" INTEGER,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "chain" TEXT NOT NULL DEFAULT 'SOL',
    "dex" TEXT,
    "action" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "tokenSymbol" TEXT,
    "quoteToken" TEXT,
    "amountIn" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "amountOut" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "priceUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valueUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "slippageBps" INTEGER,
    "pnlUsd" DECIMAL(65,30),
    "isFrontrun" BOOLEAN NOT NULL DEFAULT false,
    "isSandwich" BOOLEAN NOT NULL DEFAULT false,
    "isWashTrade" BOOLEAN NOT NULL DEFAULT false,
    "isJustInTime" BOOLEAN NOT NULL DEFAULT false,
    "pairedTxHash" TEXT,
    "gasUsed" DOUBLE PRECISION,
    "gasPrice" DOUBLE PRECISION,
    "priorityFee" DOUBLE PRECISION,
    "totalFeeUsd" DECIMAL(65,30),
    "tokenAgeAtTrade" DOUBLE PRECISION,
    "holderCountAtTrade" INTEGER,
    "liquidityAtTrade" DECIMAL(65,30),
    "logIndex" INTEGER,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TraderTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTokenHolding" (
    "id" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "tokenSymbol" TEXT,
    "chain" TEXT NOT NULL DEFAULT 'SOL',
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valueUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "avgEntryPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "unrealizedPnl" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "unrealizedPnlPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "firstBuyAt" TIMESTAMP(3),
    "lastTradeAt" TIMESTAMP(3),
    "buyCount" INTEGER NOT NULL DEFAULT 0,
    "sellCount" INTEGER NOT NULL DEFAULT 0,
    "totalBoughtUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalSoldUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletTokenHolding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraderBehaviorPattern" (
    "id" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dataPoints" INTEGER NOT NULL DEFAULT 0,
    "firstObserved" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastObserved" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "TraderBehaviorPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrossChainWallet" (
    "id" TEXT NOT NULL,
    "primaryWalletId" TEXT NOT NULL,
    "linkedWalletId" TEXT NOT NULL,
    "primaryChain" TEXT NOT NULL,
    "linkedChain" TEXT NOT NULL,
    "linkedAddress" TEXT NOT NULL,
    "linkType" TEXT NOT NULL DEFAULT 'SAME_ENTITY',
    "linkConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evidence" TEXT NOT NULL DEFAULT '[]',
    "bridgeTxCount" INTEGER NOT NULL DEFAULT 0,
    "totalBridgedUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrossChainWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraderLabelAssignment" (
    "id" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ALGORITHM',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evidence" TEXT NOT NULL DEFAULT '[]',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "TraderLabelAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CUSTOM',
    "tokenId" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "priceTarget" DECIMAL(65,30),
    "direction" TEXT NOT NULL DEFAULT 'LONG',
    "description" TEXT NOT NULL DEFAULT '',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL DEFAULT 'OPEN_POSITION',
    "tokenId" TEXT,
    "walletAddress" TEXT,
    "entryPrice" DECIMAL(65,30),
    "stopLoss" DECIMAL(65,30),
    "takeProfit" DECIMAL(65,30),
    "pnl" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatternRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "conditions" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "backtestResults" TEXT NOT NULL DEFAULT '{}',
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "occurrences" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatternRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenDNA" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "liquidityDNA" TEXT NOT NULL DEFAULT '[]',
    "walletDNA" TEXT NOT NULL DEFAULT '[]',
    "topologyDNA" TEXT NOT NULL DEFAULT '[]',
    "riskScore" INTEGER NOT NULL DEFAULT 50,
    "botActivityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "smartMoneyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retailScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "whaleScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "washTradeProb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sniperPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mevPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "copyBotPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "traderComposition" TEXT NOT NULL DEFAULT '{}',
    "topWallets" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenDNA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictiveSignal" (
    "id" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "chain" TEXT NOT NULL DEFAULT 'SOL',
    "tokenAddress" TEXT,
    "sector" TEXT,
    "prediction" TEXT NOT NULL DEFAULT '{}',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timeframe" TEXT NOT NULL DEFAULT '1h',
    "validUntil" TIMESTAMP(3),
    "evidence" TEXT NOT NULL DEFAULT '[]',
    "historicalHitRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dataPointsUsed" INTEGER NOT NULL DEFAULT 0,
    "wasCorrect" BOOLEAN,
    "actualOutcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictiveSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingSystem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🎯',
    "assetFilter" TEXT NOT NULL DEFAULT '{}',
    "phaseConfig" TEXT NOT NULL DEFAULT '{}',
    "entrySignal" TEXT NOT NULL DEFAULT '{}',
    "executionConfig" TEXT NOT NULL DEFAULT '{}',
    "exitSignal" TEXT NOT NULL DEFAULT '{}',
    "bigDataContext" TEXT NOT NULL DEFAULT '{}',
    "primaryTimeframe" TEXT NOT NULL DEFAULT '1h',
    "confirmTimeframes" TEXT NOT NULL DEFAULT '[]',
    "maxPositionPct" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "maxOpenPositions" INTEGER NOT NULL DEFAULT 10,
    "stopLossPct" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "takeProfitPct" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "trailingStopPct" DOUBLE PRECISION,
    "cashReservePct" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "allocationMethod" TEXT NOT NULL DEFAULT 'KELLY_MODIFIED',
    "allocationConfig" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isPaperTrading" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentSystemId" TEXT,
    "autoOptimize" BOOLEAN NOT NULL DEFAULT false,
    "optimizationMethod" TEXT,
    "optimizationFreq" TEXT,
    "totalBacktests" INTEGER NOT NULL DEFAULT 0,
    "bestSharpe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bestWinRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bestPnlPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgHoldTimeMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacktestRun" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'HISTORICAL',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "initialCapital" DECIMAL(65,30) NOT NULL,
    "capitalAllocation" TEXT NOT NULL DEFAULT '{}',
    "allocationMethod" TEXT NOT NULL DEFAULT 'KELLY_MODIFIED',
    "finalCapital" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalPnl" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalPnlPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "annualizedReturn" DOUBLE PRECISION,
    "benchmarkReturn" DOUBLE PRECISION,
    "alpha" DOUBLE PRECISION,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "winTrades" INTEGER NOT NULL DEFAULT 0,
    "lossTrades" INTEGER NOT NULL DEFAULT 0,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgWin" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "avgLoss" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "profitFactor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectancy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDrawdown" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "maxDrawdownPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sharpeRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortinoRatio" DOUBLE PRECISION,
    "calmarRatio" DOUBLE PRECISION,
    "recoveryFactor" DOUBLE PRECISION,
    "avgHoldTimeMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marketExposurePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "phaseResults" TEXT NOT NULL DEFAULT '{}',
    "timeframeResults" TEXT NOT NULL DEFAULT '{}',
    "operationTypeResults" TEXT NOT NULL DEFAULT '{}',
    "allocationMethodResults" TEXT NOT NULL DEFAULT '{}',
    "optimizationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "optimizationMethod" TEXT,
    "bestParameters" TEXT,
    "optimizationScore" DOUBLE PRECISION,
    "inSampleScore" DOUBLE PRECISION,
    "outOfSampleScore" DOUBLE PRECISION,
    "walkForwardRatio" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BacktestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceCandle" (
    "id" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "chain" TEXT NOT NULL DEFAULT 'SOL',
    "timeframe" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "open" DECIMAL(65,30) NOT NULL,
    "high" DECIMAL(65,30) NOT NULL,
    "low" DECIMAL(65,30) NOT NULL,
    "close" DECIMAL(65,30) NOT NULL,
    "volume" DECIMAL(65,30) NOT NULL,
    "trades" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'multi_source',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceCandle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenLifecycleState" (
    "id" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "chain" TEXT NOT NULL DEFAULT 'SOL',
    "phase" TEXT NOT NULL,
    "phaseProbability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "phaseDistribution" TEXT NOT NULL DEFAULT '{}',
    "transitionFrom" TEXT,
    "transitionProb" DOUBLE PRECISION,
    "signals" TEXT NOT NULL DEFAULT '{}',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenLifecycleState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraderBehaviorModel" (
    "id" TEXT NOT NULL,
    "archetype" TEXT NOT NULL,
    "tokenPhase" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "intensity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "observations" INTEGER NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraderBehaviorModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackMetrics" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "context" TEXT NOT NULL DEFAULT '{}',
    "period" TEXT NOT NULL DEFAULT '24h',
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemEvolution" (
    "id" TEXT NOT NULL,
    "parentSystemId" TEXT,
    "childSystemId" TEXT NOT NULL,
    "evolutionType" TEXT NOT NULL,
    "triggerMetric" TEXT NOT NULL,
    "triggerValue" DOUBLE PRECISION NOT NULL,
    "improvementPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "backtestId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemEvolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComparativeAnalysis" (
    "id" TEXT NOT NULL,
    "modelA" TEXT NOT NULL,
    "modelB" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "context" TEXT NOT NULL DEFAULT '{}',
    "metricsA" TEXT NOT NULL DEFAULT '{}',
    "metricsB" TEXT NOT NULL DEFAULT '{}',
    "winner" TEXT,
    "confidenceDiff" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComparativeAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainCycleRun" (
    "id" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL DEFAULT 0,
    "capitalUsd" DECIMAL(65,30) NOT NULL DEFAULT 10,
    "initialCapitalUsd" DECIMAL(65,30) NOT NULL DEFAULT 10,
    "chain" TEXT NOT NULL DEFAULT 'SOL',
    "scanLimit" INTEGER NOT NULL DEFAULT 20,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "tokensScanned" INTEGER NOT NULL DEFAULT 0,
    "tokensOperable" INTEGER NOT NULL DEFAULT 0,
    "tokensTradeable" INTEGER NOT NULL DEFAULT 0,
    "topPicks" TEXT NOT NULL DEFAULT '[]',
    "operabilitySummary" TEXT NOT NULL DEFAULT '{}',
    "capitalBeforeCycle" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "capitalAfterCycle" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cyclePnlUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cyclePnlPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cumulativeReturnPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "phaseDistribution" TEXT NOT NULL DEFAULT '{}',
    "dominantRegime" TEXT NOT NULL DEFAULT 'SIDEWAYS',
    "regimeConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "errorLog" TEXT,
    "cycleDurationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainCycleRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperabilitySnapshot" (
    "id" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "chain" TEXT NOT NULL DEFAULT 'SOL',
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "liquidityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "slippageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "healthScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marginScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCostUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCostPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "slippagePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recommendedPositionUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "operabilityLevel" TEXT NOT NULL DEFAULT 'UNOPERABLE',
    "isOperable" BOOLEAN NOT NULL DEFAULT false,
    "minimumGainPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "liquidityUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "volume24h" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "marketCap" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cycleRunId" TEXT,
    "warnings" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperabilitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompoundGrowthTracker" (
    "id" TEXT NOT NULL,
    "capitalUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "initialCapitalUsd" DECIMAL(65,30) NOT NULL DEFAULT 10,
    "totalReturnPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPnlUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "periodPnlUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "periodReturnPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "periodTrades" INTEGER NOT NULL DEFAULT 0,
    "periodWins" INTEGER NOT NULL DEFAULT 0,
    "periodLosses" INTEGER NOT NULL DEFAULT 0,
    "totalFeesPaidUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalSlippageUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "feeAdjustedPnlUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "feeAdjustedReturnPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDrawdownPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sharpeRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyCompoundRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "projectedAnnualReturn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL DEFAULT '1h',
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompoundGrowthTracker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacktestOperation" (
    "id" TEXT NOT NULL,
    "backtestId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "tokenSymbol" TEXT,
    "chain" TEXT NOT NULL,
    "tokenPhase" TEXT NOT NULL,
    "tokenAgeMinutes" DOUBLE PRECISION NOT NULL,
    "marketConditions" TEXT NOT NULL DEFAULT '{}',
    "tokenDnaSnapshot" TEXT NOT NULL DEFAULT '{}',
    "traderComposition" TEXT NOT NULL DEFAULT '{}',
    "bigDataContext" TEXT NOT NULL DEFAULT '{}',
    "operationType" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "entryPrice" DECIMAL(65,30) NOT NULL,
    "entryTime" TIMESTAMP(3) NOT NULL,
    "entryReason" TEXT NOT NULL DEFAULT '{}',
    "exitPrice" DECIMAL(65,30),
    "exitTime" TIMESTAMP(3),
    "exitReason" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "positionSizeUsd" DECIMAL(65,30) NOT NULL,
    "pnlUsd" DECIMAL(65,30),
    "pnlPct" DOUBLE PRECISION,
    "holdTimeMin" DOUBLE PRECISION,
    "maxFavorableExc" DOUBLE PRECISION,
    "maxAdverseExc" DOUBLE PRECISION,
    "capitalAllocPct" DOUBLE PRECISION NOT NULL,
    "allocationMethodUsed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BacktestOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionJob" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sourcesUsed" TEXT NOT NULL DEFAULT '[]',
    "config" TEXT NOT NULL DEFAULT '{}',
    "tokensDiscovered" INTEGER NOT NULL DEFAULT 0,
    "candlesStored" INTEGER NOT NULL DEFAULT 0,
    "walletsProfiled" INTEGER NOT NULL DEFAULT 0,
    "transactionsStored" INTEGER NOT NULL DEFAULT 0,
    "signalsGenerated" INTEGER NOT NULL DEFAULT 0,
    "protocolsStored" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT NOT NULL DEFAULT '[]',
    "resultJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtractionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiRateLimit" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "callsThisMinute" INTEGER NOT NULL DEFAULT 0,
    "callsThisHour" INTEGER NOT NULL DEFAULT 0,
    "callsToday" INTEGER NOT NULL DEFAULT 0,
    "callsThisMonth" INTEGER NOT NULL DEFAULT 0,
    "maxCallsPerMinute" INTEGER,
    "maxCallsPerHour" INTEGER,
    "maxCallsPerDay" INTEGER,
    "maxCallsPerMonth" INTEGER,
    "minuteResetAt" TIMESTAMP(3),
    "hourResetAt" TIMESTAMP(3),
    "dayResetAt" TIMESTAMP(3),
    "monthResetAt" TIMESTAMP(3),
    "isThrottled" BOOLEAN NOT NULL DEFAULT false,
    "throttleUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSourceHealth" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "avgLatencyMs" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "uptime24h" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSourceHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProtocolData" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chain" TEXT NOT NULL DEFAULT 'SOL',
    "category" TEXT,
    "tvlUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tvlChange1d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tvlChange7d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mcap" DECIMAL(65,30),
    "fdv" DECIMAL(65,30),
    "bestYieldApy" DOUBLE PRECISION,
    "bestYieldPool" TEXT,
    "fees24h" DECIMAL(65,30),
    "fees7d" DECIMAL(65,30),
    "revenue24h" DECIMAL(65,30),
    "revenue7d" DECIMAL(65,30),
    "url" TEXT,
    "logo" TEXT,
    "description" TEXT,
    "audits" TEXT,
    "chains" TEXT NOT NULL DEFAULT '[]',
    "dataFetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProtocolData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapitalLearningState" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'SINGLE',
    "modeConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "strategyWeights" TEXT NOT NULL DEFAULT '{}',
    "recentWinRate" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "recentAvgPnlPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recentSharpe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDrawdownSeen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adjustedExpectedGain" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adjustedOperabilityThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feedbackHistory" TEXT NOT NULL DEFAULT '[]',
    "cycleCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapitalLearningState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Token_address_key" ON "Token"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Token_address_chain_key" ON "Token"("address", "chain");

-- CreateIndex
CREATE UNIQUE INDEX "Trader_address_key" ON "Trader"("address");

-- CreateIndex
CREATE UNIQUE INDEX "TraderTransaction_txHash_key" ON "TraderTransaction"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "TokenDNA_tokenId_key" ON "TokenDNA"("tokenId");

-- CreateIndex
CREATE INDEX "PriceCandle_tokenAddress_timeframe_timestamp_idx" ON "PriceCandle"("tokenAddress", "timeframe", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "PriceCandle_tokenAddress_chain_timeframe_timestamp_key" ON "PriceCandle"("tokenAddress", "chain", "timeframe", "timestamp");

-- CreateIndex
CREATE INDEX "TokenLifecycleState_tokenAddress_detectedAt_idx" ON "TokenLifecycleState"("tokenAddress", "detectedAt");

-- CreateIndex
CREATE INDEX "TraderBehaviorModel_archetype_tokenPhase_idx" ON "TraderBehaviorModel"("archetype", "tokenPhase");

-- CreateIndex
CREATE UNIQUE INDEX "TraderBehaviorModel_archetype_tokenPhase_action_key" ON "TraderBehaviorModel"("archetype", "tokenPhase", "action");

-- CreateIndex
CREATE INDEX "FeedbackMetrics_sourceType_metricName_measuredAt_idx" ON "FeedbackMetrics"("sourceType", "metricName", "measuredAt");

-- CreateIndex
CREATE INDEX "FeedbackMetrics_sourceType_sourceId_idx" ON "FeedbackMetrics"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "SystemEvolution_parentSystemId_idx" ON "SystemEvolution"("parentSystemId");

-- CreateIndex
CREATE INDEX "SystemEvolution_evolutionType_idx" ON "SystemEvolution"("evolutionType");

-- CreateIndex
CREATE INDEX "ComparativeAnalysis_dimension_measuredAt_idx" ON "ComparativeAnalysis"("dimension", "measuredAt");

-- CreateIndex
CREATE INDEX "ComparativeAnalysis_modelA_modelB_idx" ON "ComparativeAnalysis"("modelA", "modelB");

-- CreateIndex
CREATE INDEX "BrainCycleRun_status_startedAt_idx" ON "BrainCycleRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "BrainCycleRun_cycleNumber_idx" ON "BrainCycleRun"("cycleNumber");

-- CreateIndex
CREATE INDEX "OperabilitySnapshot_tokenAddress_createdAt_idx" ON "OperabilitySnapshot"("tokenAddress", "createdAt");

-- CreateIndex
CREATE INDEX "OperabilitySnapshot_operabilityLevel_createdAt_idx" ON "OperabilitySnapshot"("operabilityLevel", "createdAt");

-- CreateIndex
CREATE INDEX "OperabilitySnapshot_isOperable_createdAt_idx" ON "OperabilitySnapshot"("isOperable", "createdAt");

-- CreateIndex
CREATE INDEX "CompoundGrowthTracker_measuredAt_idx" ON "CompoundGrowthTracker"("measuredAt");

-- CreateIndex
CREATE INDEX "CompoundGrowthTracker_period_measuredAt_idx" ON "CompoundGrowthTracker"("period", "measuredAt");

-- CreateIndex
CREATE INDEX "ExtractionJob_status_createdAt_idx" ON "ExtractionJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ExtractionJob_jobType_createdAt_idx" ON "ExtractionJob"("jobType", "createdAt");

-- CreateIndex
CREATE INDEX "ApiRateLimit_isThrottled_idx" ON "ApiRateLimit"("isThrottled");

-- CreateIndex
CREATE UNIQUE INDEX "ApiRateLimit_source_key" ON "ApiRateLimit"("source");

-- CreateIndex
CREATE INDEX "DataSourceHealth_status_idx" ON "DataSourceHealth"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DataSourceHealth_source_key" ON "DataSourceHealth"("source");

-- CreateIndex
CREATE UNIQUE INDEX "ProtocolData_slug_chain_key" ON "ProtocolData"("slug", "chain");

-- CreateIndex
CREATE INDEX "CapitalLearningState_mode_idx" ON "CapitalLearningState"("mode");

-- AddForeignKey
ALTER TABLE "TraderTransaction" ADD CONSTRAINT "TraderTransaction_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "Trader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTokenHolding" ADD CONSTRAINT "WalletTokenHolding_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "Trader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraderBehaviorPattern" ADD CONSTRAINT "TraderBehaviorPattern_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "Trader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossChainWallet" ADD CONSTRAINT "CrossChainWallet_primaryWalletId_fkey" FOREIGN KEY ("primaryWalletId") REFERENCES "Trader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossChainWallet" ADD CONSTRAINT "CrossChainWallet_linkedWalletId_fkey" FOREIGN KEY ("linkedWalletId") REFERENCES "Trader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraderLabelAssignment" ADD CONSTRAINT "TraderLabelAssignment_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "Trader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenDNA" ADD CONSTRAINT "TokenDNA_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingSystem" ADD CONSTRAINT "TradingSystem_parentSystemId_fkey" FOREIGN KEY ("parentSystemId") REFERENCES "TradingSystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacktestRun" ADD CONSTRAINT "BacktestRun_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "TradingSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceCandle" ADD CONSTRAINT "PriceCandle_tokenAddress_fkey" FOREIGN KEY ("tokenAddress") REFERENCES "Token"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenLifecycleState" ADD CONSTRAINT "TokenLifecycleState_tokenAddress_fkey" FOREIGN KEY ("tokenAddress") REFERENCES "Token"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacktestOperation" ADD CONSTRAINT "BacktestOperation_backtestId_fkey" FOREIGN KEY ("backtestId") REFERENCES "BacktestRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacktestOperation" ADD CONSTRAINT "BacktestOperation_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "TradingSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
