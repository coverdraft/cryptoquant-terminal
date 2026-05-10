-- DropIndex
DROP INDEX "Token_address_chain_key";

-- CreateIndex
CREATE INDEX "Token_chain_idx" ON "Token"("chain");

-- CreateIndex
CREATE INDEX "Token_volume24h_idx" ON "Token"("volume24h");

-- CreateIndex
CREATE INDEX "Token_address_chain_idx" ON "Token"("address", "chain");

-- CreateIndex
CREATE INDEX "Trader_chain_idx" ON "Trader"("chain");

-- CreateIndex
CREATE INDEX "Trader_primaryLabel_idx" ON "Trader"("primaryLabel");

-- CreateIndex
CREATE INDEX "Trader_isBot_idx" ON "Trader"("isBot");

-- CreateIndex
CREATE INDEX "Trader_isSmartMoney_idx" ON "Trader"("isSmartMoney");

-- CreateIndex
CREATE INDEX "Trader_isWhale_idx" ON "Trader"("isWhale");

-- CreateIndex
CREATE INDEX "Trader_totalVolumeUsd_idx" ON "Trader"("totalVolumeUsd");

-- CreateIndex
CREATE INDEX "TraderTransaction_traderId_idx" ON "TraderTransaction"("traderId");

-- CreateIndex
CREATE INDEX "TraderTransaction_tokenAddress_idx" ON "TraderTransaction"("tokenAddress");

-- CreateIndex
CREATE INDEX "TraderTransaction_chain_idx" ON "TraderTransaction"("chain");

-- CreateIndex
CREATE INDEX "TraderTransaction_blockTime_idx" ON "TraderTransaction"("blockTime");

-- CreateIndex
CREATE INDEX "WalletTokenHolding_traderId_idx" ON "WalletTokenHolding"("traderId");

-- CreateIndex
CREATE INDEX "WalletTokenHolding_tokenAddress_idx" ON "WalletTokenHolding"("tokenAddress");
