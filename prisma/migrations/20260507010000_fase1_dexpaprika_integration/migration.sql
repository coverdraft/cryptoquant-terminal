-- FASE 1: DexPaprika Integration - Add multi-chain token metrics
ALTER TABLE "Token" ADD COLUMN "buySellRatio1h" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Token" ADD COLUMN "buySellRatio6h" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Token" ADD COLUMN "buySellRatio24h" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Token" ADD COLUMN "buyVolumeUsd" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "Token" ADD COLUMN "sellVolumeUsd" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "Token" ADD COLUMN "athPrice" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "Token" ADD COLUMN "fdv" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "Token" ADD COLUMN "poolCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Token" ADD COLUMN "networkId" TEXT NOT NULL DEFAULT 'ethereum';

-- Index for multi-chain screening
CREATE INDEX "Token_networkId_idx" ON "Token"("networkId");
CREATE INDEX "Token_buySellRatio24h_idx" ON "Token"("buySellRatio24h");
CREATE INDEX "Token_fdv_idx" ON "Token"("fdv");
