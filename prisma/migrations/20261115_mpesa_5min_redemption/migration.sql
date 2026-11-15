-- Safe, idempotent migration for 5-minute M-Pesa transaction redemption system

-- 1. Alter certificate_downloads table
ALTER TABLE "certificate_downloads" 
  ADD COLUMN IF NOT EXISTS "redemption_status" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "first_claimed_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "download_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_downloaded_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill existing historical certificate_downloads:
-- Classify historical records older than 5 minutes as EXPIRED to prevent historical receipt replay
UPDATE "certificate_downloads"
SET 
  "first_claimed_at" = COALESCE("first_claimed_at", "createdAt"),
  "expires_at" = COALESCE("expires_at", "createdAt" + INTERVAL '5 minutes'),
  "redemption_status" = CASE 
    WHEN ("createdAt" + INTERVAL '5 minutes') < NOW() THEN 'EXPIRED'
    ELSE 'ACTIVE'
  END
WHERE "first_claimed_at" IS NULL OR "expires_at" IS NULL;

-- Indexes for certificate_downloads
CREATE INDEX IF NOT EXISTS "certificate_downloads_mpesaReceipt_idx" ON "certificate_downloads"("mpesaReceipt");
CREATE INDEX IF NOT EXISTS "certificate_downloads_redemption_status_idx" ON "certificate_downloads"("redemption_status");
CREATE INDEX IF NOT EXISTS "certificate_downloads_expires_at_idx" ON "certificate_downloads"("expires_at");

-- 2. Alter mpesa_transactions table
ALTER TABLE "mpesa_transactions"
  ADD COLUMN IF NOT EXISTS "redemption_status" TEXT NOT NULL DEFAULT 'UNUSED',
  ADD COLUMN IF NOT EXISTS "first_claimed_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "download_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_downloaded_at" TIMESTAMPTZ;

-- Backfill existing completed mpesa_transactions:
UPDATE "mpesa_transactions"
SET
  "first_claimed_at" = COALESCE("first_claimed_at", "created_at"),
  "expires_at" = COALESCE("expires_at", "created_at" + INTERVAL '5 minutes'),
  "redemption_status" = CASE
    WHEN "status" = 'COMPLETED' AND ("created_at" + INTERVAL '5 minutes') < NOW() THEN 'EXPIRED'
    WHEN "status" = 'COMPLETED' THEN 'ACTIVE'
    ELSE 'UNUSED'
  END
WHERE "status" = 'COMPLETED' AND ("first_claimed_at" IS NULL OR "expires_at" IS NULL);

-- Indexes for mpesa_transactions
CREATE INDEX IF NOT EXISTS "mpesa_transactions_mpesa_receipt_number_idx" ON "mpesa_transactions"("mpesa_receipt_number");
CREATE INDEX IF NOT EXISTS "mpesa_transactions_redemption_status_idx" ON "mpesa_transactions"("redemption_status");
CREATE INDEX IF NOT EXISTS "mpesa_transactions_expires_at_idx" ON "mpesa_transactions"("expires_at");
