# Staging Environment & Release Workflow Guide

This guide establishes the architecture, deployment isolation, sandbox testing, and promotion procedures for the **Staging Environment** of Akubrecah Enterprise & KRA Portal.

---

## 1. Environment Topology

```
┌─────────────────────────────────┐
│     LOCAL DEVELOPMENT (dev)     │
│  - SQLite / Local PostgreSQL    │
│  - Mock / Fallback Services     │
│  - In-memory rate limiting      │
└────────────────┬────────────────┘
                 │  git push (PR)
                 ▼
┌─────────────────────────────────┐
│       STAGING (preview)         │
│  - Isolated Staging Database    │
│  - Paystack Sandbox (Test Keys) │
│  - M-Pesa Daraja Sandbox        │
│  - Sentry environment: staging  │
│  - Strict KDPA PII Masking      │
└────────────────┬────────────────┘
                 │  merge to main
                 ▼
┌─────────────────────────────────┐
│      PRODUCTION (live)          │
│  - Production DB (PgBouncer)    │
│  - Paystack Live Keys           │
│  - Safaricom Daraja Production  │
│  - Sentry environment: prod     │
│  - Live WhatsApp Bot Fulfillment│
└─────────────────────────────────┘
```

---

## 2. Staging Isolation Rules

To prevent accidental data pollution, financial transactions, or spamming real customers:

1. **Database Isolation:**
   - **Rule:** Never point Staging or Vercel Preview deployments to the production `DATABASE_URL`.
   - **Procedure:** Use a dedicated database branch (e.g. Neon ephemeral branching or Supabase Staging project). Set `DATABASE_URL` in Vercel Preview environment settings to the staging database connection string.

2. **Payment Gateway Sandboxing:**
   - **Paystack:** Set `PAYSTACK_SECRET_KEY=sk_test_...` and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...`. Never use live keys in preview or staging.
   - **M-Pesa:** Use Daraja sandbox consumer key/secret and test shortcode `174379`.

3. **WhatsApp Bot & Customer Notifications:**
   - In staging, set `ADMIN_WHATSAPP_NUMBERS` exclusively to developer test phones.
   - The platform will never trigger unsolicited messages to customer numbers in non-production environments.

4. **Telemetry & Error Tracking:**
   - Set `APP_ENV=staging` and `SENTRY_ENVIRONMENT=staging`.
   - All errors captured in staging are grouped under the "staging" environment tag in Sentry, avoiding false alarms on production dashboards.

---

## 3. Deployment & Release Runbook

### Step 1: Pre-Release Verification (Local)
Before opening a Pull Request, run the local verification suite:
```bash
# 1. Validate Prisma schema
npm run prisma:validate

# 2. Strict static analysis (0 errors allowed)
npm run lint -- --quiet

# 3. TypeScript compilation
npm run typecheck

# 4. Execute automated test suite
npm test

# 5. Production build check
npm run build
```

### Step 2: Ephemeral Preview Deployment (GitHub Actions)
1. Push branch to remote:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request against `main`.
3. GitHub Actions triggers `ci.yml`:
   - Runs Prisma validation, ESLint, TypeScript typecheck, and Vitest test suite.
   - Executes Gitleaks secret scanner.
   - Automatically builds and deploys an ephemeral Vercel preview.
   - Comments the preview URL directly on the PR.

### Step 3: Staging Smoke Testing Checklist
Verify the following in the staging/preview deployment before merging:
- [ ] Authentication: Sign in with Clerk test user account.
- [ ] Retrieval Portal: Search a test PIN, confirm arithmetic CAPTCHA and Radar Scanning HUD.
- [ ] PII Masking: Ensure sensitive details (email, phone, address) are masked according to KDPA rules.
- [ ] Rate Limiting: Rapidly send 12 requests to `/api/mpesa/stkpush`; verify HTTP 429 and `Retry-After` header.
- [ ] Feature Flags: Toggle a feature flag in `/api/admin/feature-flags` and verify immediate behavior change.
- [ ] Error Reporting: Trigger an intentional 404 or test error and confirm it appears in Sentry tagged `staging`.

### Step 4: Promotion to Production
1. Once approved, merge the Pull Request into `main`.
2. GitHub Actions triggers `deploy.yml`:
   - Re-verifies quality gate and builds the production bundle.
   - Deploys prebuilt artifacts to Vercel Production.
   - Dispatches a WhatsApp notification to the admin mobile number with commit SHA and release notes.

---

## 4. Rollback Procedure

If a critical issue is discovered in production:
1. **Instant Rollback via Vercel Dashboard:**
   - Navigate to **Deployments** → locate previous stable deployment → click **Instant Rollback**.
2. **Feature Flag Emergency Kill Switch:**
   - If the issue is tied to a specific feature (e.g. M-Pesa STK push or Nil returns), disable the flag immediately via the Admin API without redeploying:
     ```bash
     curl -X POST https://admin.akubrecah.com/api/admin/feature-flags \
       -H "Content-Type: application/json" \
       -H "x-admin-pin: YOUR_ADMIN_PIN" \
       -d '{"key": "enable_nil_tax_filing", "isActive": false}'
     ```
3. **Git Revert:**
   ```bash
   git revert HEAD
   git push origin main
   ```
