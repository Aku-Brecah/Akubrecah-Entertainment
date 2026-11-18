-- Production Readiness Audit: Non-destructive schema alignment & index optimization
-- 1. Convert mpesa_transactions.user_id from UUID to TEXT so Clerk user IDs (e.g. user_2x...) do not raise Postgres 22P02
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mpesa_transactions'
      AND column_name = 'user_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE "mpesa_transactions"
      ALTER COLUMN "user_id" TYPE TEXT USING "user_id"::text;
  END IF;
END $$;

-- 2. Add missing query indexes for hot lookup paths
CREATE INDEX IF NOT EXISTS "ai_conversations_channel_user_phone_status_idx"
  ON "ai_conversations"("channel", "user_phone", "status");

CREATE INDEX IF NOT EXISTS "ticket_messages_ticket_id_idx"
  ON "ticket_messages"("ticket_id");

CREATE INDEX IF NOT EXISTS "mpesa_transactions_clerk_id_idx"
  ON "mpesa_transactions"("clerk_id");

CREATE INDEX IF NOT EXISTS "cyber_invoices_checkoutId_idx"
  ON "cyber_invoices"("checkoutId");

CREATE INDEX IF NOT EXISTS "system_logs_actor_idx"
  ON "system_logs"("actor");

-- 3. Drop redundant non-unique indexes that duplicate existing UNIQUE constraints
DROP INDEX IF EXISTS "certificate_downloads_checkoutId_idx";
DROP INDEX IF EXISTS "cyber_cafes_whatsappPhone_idx";
DROP INDEX IF EXISTS "cyber_invoices_invoiceNumber_idx";
