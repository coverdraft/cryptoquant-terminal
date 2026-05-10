-- PriceCandle Partitioning Strategy
-- Since Prisma doesn't support native partitioning, we document the strategy here.
-- To enable partitioning, run these commands manually after initial setup:
-- 
-- ALTER TABLE "PriceCandle" RENAME TO "PriceCandle_old";
-- CREATE TABLE "PriceCandle" (
--   LIKE "PriceCandle_old" INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
-- ) PARTITION BY RANGE ("timestamp");
-- 
-- Then create monthly partitions:
-- CREATE TABLE "PriceCandle_2026_01" PARTITION OF "PriceCandle"
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
-- etc.
-- 
-- For now, we add strategic indexes and a data retention policy table.

-- Add composite indexes for the most common query patterns
CREATE INDEX IF NOT EXISTS "PriceCandle_chain_timeframe_ts" ON "PriceCandle"("chain", "timeframe", "timestamp");
CREATE INDEX IF NOT EXISTS "PriceCandle_token_timeframe_ts" ON "PriceCandle"("tokenAddress", "timeframe", "timestamp" DESC);

-- Add composite index for TraderTransaction queries by token+time
CREATE INDEX IF NOT EXISTS "TraderTransaction_token_blockTime" ON "TraderTransaction"("tokenAddress", "blockTime" DESC);

-- Add index for brain cycle queries
CREATE INDEX IF NOT EXISTS "BrainCycleRun_chain_status" ON "BrainCycleRun"("chain", "status", "startedAt" DESC);

-- Add DataRetentionPolicy table for managing data lifecycle
CREATE TABLE IF NOT EXISTS "DataRetentionPolicy" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "hotDays" INTEGER NOT NULL DEFAULT 7,
    "warmDays" INTEGER NOT NULL DEFAULT 30,
    "coldDays" INTEGER NOT NULL DEFAULT 365,
    "archiveMethod" TEXT NOT NULL DEFAULT 'DELETE',
    "compressionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastArchivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DataRetentionPolicy_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DataRetentionPolicy_tableName_key" UNIQUE ("tableName")
);

-- Insert default retention policies
INSERT INTO "DataRetentionPolicy" ("id", "tableName", "hotDays", "warmDays", "coldDays", "archiveMethod", "compressionEnabled", "isActive", "createdAt", "updatedAt") VALUES
    ('rp_price_candle', 'PriceCandle', 7, 30, 365, 'AGGREGATE', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rp_trader_transaction', 'TraderTransaction', 7, 90, 365, 'COMPRESS', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rp_token_lifecycle_state', 'TokenLifecycleState', 30, 90, 365, 'DELETE', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rp_operability_snapshot', 'OperabilitySnapshot', 7, 30, 90, 'DELETE', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rp_brain_cycle_run', 'BrainCycleRun', 30, 90, 365, 'DELETE', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rp_extraction_job', 'ExtractionJob', 7, 30, 90, 'DELETE', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rp_api_rate_limit', 'ApiRateLimit', 1, 7, 30, 'DELETE', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rp_feedback_metrics', 'FeedbackMetrics', 30, 90, 365, 'AGGREGATE', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("tableName") DO NOTHING;

-- Add VACUUM settings for large tables
-- These will be applied at the PostgreSQL level
COMMENT ON TABLE "PriceCandle" IS 'Partitioning strategy: PARTITION BY RANGE(timestamp) with monthly partitions. Hot=7d (all timeframes), Warm=30d (5m+), Cold=365d (1h+). Use DataRetentionPolicy for lifecycle management.';
COMMENT ON TABLE "TraderTransaction" IS 'Hot=7d (all fields), Warm=90d (core fields only), Cold=365d (compressed). Use DataRetentionPolicy for lifecycle management.';
