-- =============================================================================
-- Migration: 20261122_security_rls_hardening
-- Purpose: Enable PostgreSQL Row Level Security (RLS) across all user-owned,
--          financial, session, and administrative tables as defense-in-depth.
--          Policies allow the backend service role (or superuser) full access
--          while scoping direct session connections by:
--            - current_setting('app.current_clerk_id', true)
--            - current_setting('app.current_user_id', true)
--            - current_setting('app.current_role', true) = 'admin'
-- =============================================================================

-- Helper function: returns true when running as the trusted backend service
-- connection (where app.enforce_rls is not explicitly set to 'on') OR when
-- the current session role is 'admin'.
CREATE OR REPLACE FUNCTION public.is_admin_or_service_context()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    COALESCE(current_setting('app.enforce_rls', true), 'off') <> 'on'
    OR COALESCE(current_setting('app.current_role', true), '') IN ('admin', 'super_admin', 'service_role');
$$;

-- 1. Enable RLS on all sensitive tables
ALTER TABLE IF EXISTS "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "certificate_downloads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "mpesa_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "cyber_cafes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "cyber_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "session_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "user_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "inquiries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "inquiry_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "inquiry_replies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "system_logs" ENABLE ROW LEVEL SECURITY;

-- 2. Users table policies (owner can read/update own profile; admin/service has full access)
DROP POLICY IF EXISTS "users_select_own_or_admin" ON "users";
CREATE POLICY "users_select_own_or_admin" ON "users"
  FOR SELECT
  USING (
    public.is_admin_or_service_context()
    OR "clerkId" = COALESCE(current_setting('app.current_clerk_id', true), '')
    OR "id"::text = COALESCE(current_setting('app.current_user_id', true), '')
  );

DROP POLICY IF EXISTS "users_insert_own_or_admin" ON "users";
CREATE POLICY "users_insert_own_or_admin" ON "users"
  FOR INSERT
  WITH CHECK (
    public.is_admin_or_service_context()
    OR "clerkId" = COALESCE(current_setting('app.current_clerk_id', true), '')
  );

DROP POLICY IF EXISTS "users_update_own_or_admin" ON "users";
CREATE POLICY "users_update_own_or_admin" ON "users"
  FOR UPDATE
  USING (
    public.is_admin_or_service_context()
    OR "clerkId" = COALESCE(current_setting('app.current_clerk_id', true), '')
    OR "id"::text = COALESCE(current_setting('app.current_user_id', true), '')
  )
  WITH CHECK (
    public.is_admin_or_service_context()
    OR "clerkId" = COALESCE(current_setting('app.current_clerk_id', true), '')
    OR "id"::text = COALESCE(current_setting('app.current_user_id', true), '')
  );

DROP POLICY IF EXISTS "users_delete_admin_only" ON "users";
CREATE POLICY "users_delete_admin_only" ON "users"
  FOR DELETE
  USING (public.is_admin_or_service_context());

-- 3. Subscriptions table policies (scoped to owning userId)
DROP POLICY IF EXISTS "subscriptions_select_own_or_admin" ON "subscriptions";
CREATE POLICY "subscriptions_select_own_or_admin" ON "subscriptions"
  FOR SELECT
  USING (
    public.is_admin_or_service_context()
    OR "userId"::text = COALESCE(current_setting('app.current_user_id', true), '')
  );

DROP POLICY IF EXISTS "subscriptions_mutate_admin_or_service" ON "subscriptions";
CREATE POLICY "subscriptions_mutate_admin_or_service" ON "subscriptions"
  FOR ALL
  USING (public.is_admin_or_service_context())
  WITH CHECK (public.is_admin_or_service_context());

-- 4. Certificate downloads policies (scoped to userId / clerkUserId)
DROP POLICY IF EXISTS "certificate_downloads_select_own_or_admin" ON "certificate_downloads";
CREATE POLICY "certificate_downloads_select_own_or_admin" ON "certificate_downloads"
  FOR SELECT
  USING (
    public.is_admin_or_service_context()
    OR "clerkUserId" = COALESCE(current_setting('app.current_clerk_id', true), '')
    OR "userId"::text = COALESCE(current_setting('app.current_user_id', true), '')
  );

DROP POLICY IF EXISTS "certificate_downloads_insert_own_or_admin" ON "certificate_downloads";
CREATE POLICY "certificate_downloads_insert_own_or_admin" ON "certificate_downloads"
  FOR INSERT
  WITH CHECK (
    public.is_admin_or_service_context()
    OR "clerkUserId" = COALESCE(current_setting('app.current_clerk_id', true), '')
    OR "userId"::text = COALESCE(current_setting('app.current_user_id', true), '')
  );

DROP POLICY IF EXISTS "certificate_downloads_modify_admin_only" ON "certificate_downloads";
CREATE POLICY "certificate_downloads_modify_admin_only" ON "certificate_downloads"
  FOR DELETE
  USING (public.is_admin_or_service_context());

-- 5. M-Pesa Transactions policies (scoped to clerkUserId; mutations restricted to service/admin)
DROP POLICY IF EXISTS "mpesa_transactions_select_own_or_admin" ON "mpesa_transactions";
CREATE POLICY "mpesa_transactions_select_own_or_admin" ON "mpesa_transactions"
  FOR SELECT
  USING (
    public.is_admin_or_service_context()
    OR "clerkUserId" = COALESCE(current_setting('app.current_clerk_id', true), '')
  );

DROP POLICY IF EXISTS "mpesa_transactions_mutate_service_only" ON "mpesa_transactions";
CREATE POLICY "mpesa_transactions_mutate_service_only" ON "mpesa_transactions"
  FOR ALL
  USING (public.is_admin_or_service_context())
  WITH CHECK (public.is_admin_or_service_context());

-- 6. Cyber Cafes & Cyber Invoices policies (scoped to clerkUserId)
DROP POLICY IF EXISTS "cyber_cafes_select_own_or_admin" ON "cyber_cafes";
CREATE POLICY "cyber_cafes_select_own_or_admin" ON "cyber_cafes"
  FOR SELECT
  USING (
    public.is_admin_or_service_context()
    OR "clerkUserId" = COALESCE(current_setting('app.current_clerk_id', true), '')
  );

DROP POLICY IF EXISTS "cyber_cafes_mutate_service_only" ON "cyber_cafes";
CREATE POLICY "cyber_cafes_mutate_service_only" ON "cyber_cafes"
  FOR ALL
  USING (public.is_admin_or_service_context())
  WITH CHECK (public.is_admin_or_service_context());

DROP POLICY IF EXISTS "cyber_invoices_select_own_or_admin" ON "cyber_invoices";
CREATE POLICY "cyber_invoices_select_own_or_admin" ON "cyber_invoices"
  FOR SELECT
  USING (
    public.is_admin_or_service_context()
    OR EXISTS (
      SELECT 1 FROM "cyber_cafes" cc
      WHERE cc."id" = "cyber_invoices"."cyberCafeId"
        AND cc."clerkUserId" = COALESCE(current_setting('app.current_clerk_id', true), '')
    )
  );

DROP POLICY IF EXISTS "cyber_invoices_mutate_service_only" ON "cyber_invoices";
CREATE POLICY "cyber_invoices_mutate_service_only" ON "cyber_invoices"
  FOR ALL
  USING (public.is_admin_or_service_context())
  WITH CHECK (public.is_admin_or_service_context());

-- 7. Sessions, Session Activities, User Activities, Inquiries, System Logs (Admin/Service isolation)
DROP POLICY IF EXISTS "sessions_select_own_or_admin" ON "sessions";
CREATE POLICY "sessions_select_own_or_admin" ON "sessions"
  FOR SELECT
  USING (
    public.is_admin_or_service_context()
    OR "userId"::text = COALESCE(current_setting('app.current_user_id', true), '')
  );

DROP POLICY IF EXISTS "sessions_mutate_service_only" ON "sessions";
CREATE POLICY "sessions_mutate_service_only" ON "sessions"
  FOR ALL
  USING (public.is_admin_or_service_context())
  WITH CHECK (public.is_admin_or_service_context());

DROP POLICY IF EXISTS "session_activities_service_only" ON "session_activities";
CREATE POLICY "session_activities_service_only" ON "session_activities"
  FOR ALL
  USING (public.is_admin_or_service_context())
  WITH CHECK (public.is_admin_or_service_context());

DROP POLICY IF EXISTS "user_activities_select_own_or_admin" ON "user_activities";
CREATE POLICY "user_activities_select_own_or_admin" ON "user_activities"
  FOR SELECT
  USING (
    public.is_admin_or_service_context()
    OR "userId"::text = COALESCE(current_setting('app.current_user_id', true), '')
  );

DROP POLICY IF EXISTS "user_activities_mutate_service_only" ON "user_activities";
CREATE POLICY "user_activities_mutate_service_only" ON "user_activities"
  FOR ALL
  USING (public.is_admin_or_service_context())
  WITH CHECK (public.is_admin_or_service_context());

DROP POLICY IF EXISTS "inquiries_admin_or_service" ON "inquiries";
CREATE POLICY "inquiries_admin_or_service" ON "inquiries"
  FOR ALL
  USING (public.is_admin_or_service_context())
  WITH CHECK (public.is_admin_or_service_context());

DROP POLICY IF EXISTS "inquiry_notes_admin_or_service" ON "inquiry_notes";
CREATE POLICY "inquiry_notes_admin_or_service" ON "inquiry_notes"
  FOR ALL
  USING (public.is_admin_or_service_context())
  WITH CHECK (public.is_admin_or_service_context());

DROP POLICY IF EXISTS "inquiry_replies_admin_or_service" ON "inquiry_replies";
CREATE POLICY "inquiry_replies_admin_or_service" ON "inquiry_replies"
  FOR ALL
  USING (public.is_admin_or_service_context())
  WITH CHECK (public.is_admin_or_service_context());

DROP POLICY IF EXISTS "system_logs_admin_or_service" ON "system_logs";
CREATE POLICY "system_logs_admin_or_service" ON "system_logs"
  FOR ALL
  USING (public.is_admin_or_service_context())
  WITH CHECK (public.is_admin_or_service_context());
