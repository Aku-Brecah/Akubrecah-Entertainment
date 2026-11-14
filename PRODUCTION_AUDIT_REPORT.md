# Production Readiness Audit Report — Akubrecah Technologies & KRA Portal

**Audit Scope:** Full 14-Phase End-to-End Codebase Reconnaissance, UI/UX, Interactive Elements, Forms, API/Backend, Database, Auth/RBAC, Integrations (Daraja M-Pesa, KRA Portal, Clerk, WhatsApp, Sentry), Performance, Build, SEO, and QA Verification  
**Branch:** `fix/audit-p0-security-and-routing`  
**Audit Date:** 2026-11-14  

---

## 1. Executive Summary & Verdict

The Akubrecah Technologies agency platform and KRA Taxpayer Retrieval Portal (`akubrecah.com`, `kra.akubrecah.com`, `admin.akubrecah.com`) were audited end-to-end across all pages, components, routes, database models, integrations, and security boundaries.

**Audit Verdict:** **PRODUCTION READY (Verified Clean Build, Zero Type/Lint Errors, 15/15 Test Suites & 125/125 Tests Passing)** after remediating **12 concrete defects** uncovered during inspection (13 file-level defect fixes across routing, authorization UX, deep-linking, runtime safety, disconnected UI/billing states, Prisma delegate casing bugs, and missing assets).

Three non-blocking operational observations remain documented in Section 5 for post-launch iteration (OG banner artwork aspect ratio, CSP enforcement promotion, and Clerk password-reset dashboard workflow).

---

## 2. Application Architecture & Inventory (Phase 1)

### 2.1 Technology Stack
| Layer | Technology / Version | Notes |
| --- | --- | --- |
| Framework | Next.js `^16.1.1` (built `16.4.2` Turbopack) | App Router + `proxy.ts` subdomain routing |
| UI Runtime | React `^19.0.0`, Tailwind CSS `^4.3.3` | Custom components + glassmorphic agency & portal UI |
| Language | TypeScript (strict `tsc --noEmit`) | Zod `^4.6.7` schema validation (`lib/validation/schemas.ts`) |
| Database / ORM | PostgreSQL + Prisma `^6.1.0` (`6.2.1` generated) | 32 models in `prisma/schema.prisma` |
| Authentication | Clerk (`@clerk/nextjs ^7.2.8`) | Combined with admin PIN/cookie/email verification (`lib/admin-auth.ts`) |
| Payments | Safaricom Daraja M-Pesa Express | Exclusively Daraja (`Short Code 9914132`, Buy Goods Till `9348469`) |
| Caching / Limits | `ioredis ^5.10.0` | Rate limiting and telemetry caching |
| Observability | Sentry (`@sentry/nextjs ^11.8.0`) | Wrapped in `next.config.mjs` |
| Testing | Vitest `^5.0.5`, ESLint `^9.39.5` | 15 test suites, 125 unit/integration tests |

### 2.2 Application Inventory
- **Pages (`app/**/page.tsx`): 41 total routes**
  - **Public Agency (12):** `/`, `/about`, `/services`, `/solutions`, `/products`, `/projects`, `/projects/[slug]`, `/articles`, `/articles/[slug]`, `/contact`, `/estimator`, `/remotion-demo`.
  - **Legal & Compliance (7):** `/legal`, `/legal/disclaimer`, `/legal/privacy`, `/legal/terms`, `/legal/refund`, `/legal/aup`, `/legal/cookies`.
  - **KRA Public Portal & Subdomain Placeholder (2):** `/retrieval-portal`, `/brand` (`notFound()`).
  - **Auth, Taxpayer Dashboard & Utilities (8):** `/sign-in/[[...sign-in]]`, `/sign-up/[[...sign-up]]`, `/sso-callback`, `/onboarding`, `/dashboard`, `/dashboard/filing`, `/dashboard/profile`, `/pin-checker`.
  - **Admin Console (12):** `/admin`, `/admin/articles`, `/admin/brand`, `/admin/inquiries`, `/admin/kra-retrievals`, `/admin/messages`, `/admin/projects`, `/admin/role-access`, `/admin/settings`, `/admin/system-health`, `/admin/system-logs`, `/admin/user-management`.
- **API Endpoints (`app/api/**/route.ts`): 45 total handlers**
  - **Admin (17):** `admin/articles`, `admin/daraja`, `admin/feature-flags`, `admin/github-repos`, `admin/inquiries`, `admin/kra-retrievals`, `admin/logout`, `admin/logs`, `admin/magic-login`, `admin/migrate-users`, `admin/overview`, `admin/projects`, `admin/services`, `admin/settings`, `admin/skills`, `admin/system-health`, `admin/users`.
  - **KRA & Certificates (9):** `kra/captcha`, `kra/live-verify/id`, `kra/live-verify/pin`, `kra/nil-return`, `kra/retrieve`, `kra/upload-id`, `certificate/check-access`, `certificate/record-download`, `certificate/verified-data`.
  - **PDF Generation (2):** `generate-certificate`, `generate-receipt`.
  - **M-Pesa Daraja (4):** `mpesa/stkpush`, `mpesa/status/[checkoutRequestId]`, `mpesa/verify`, `mpesa/callback`.
  - **Cyber Cafe Subscriptions (3):** `cyber/user-status`, `cyber/subscribe-web`, `cyber/invoice/[id]`.
  - **WhatsApp Bot (2):** `whatsapp/webhook`, `whatsapp/chat`.
  - **Public / Telemetry / Health (8):** `analytics/track`, `articles`, `github/repos`, `google-reviews`, `health`, `inquiries`, `projects`, `public/flags`.
- **Database Models (`prisma/schema.prisma`): 32 models**
  - `ai_conversations`, `ai_task_logs`, `ai_tasks`, `app_settings`, `blog_posts`, `job_positions`, `kra_pin_cache`, `service_settings`, `session_activities`, `sessions`, `ticket_messages`, `tickets`, `user_activities`, `users`, `Subscription`, `CertificateDownload`, `MpesaTransaction`, `CyberCafe`, `CyberInvoice`, `SystemLog`, `Project`, `Article`, `Inquiry`, `InquiryNote`, `InquiryReply`, `SkillCategory`, `Skill`, `WorkExperience`, `ServiceOffering`, `Testimonial`, `SiteSetting`, `MediaAsset`.

---

## 3. Defects Found & Remediated

| ID | Severity | Area / File | Defect Found | Remediation Applied |
| --- | --- | --- | --- | --- |
| **AUD-01** | **P1 (Security/UX)** | [components/site-header.tsx](file:///home/akubrecah/Mac_Desktop/Akubrecah%20KRA/components/site-header.tsx) | Desktop navigation checked `isAdmin` loosely and risked showing the `Admin` link to non-admin signed-in users on `kra.akubrecah.com`. | Enforced `Boolean(configAdminEmail && userEmail === configAdminEmail)` at line 487 and wrapped desktop `<Link href="/admin">` in `{isAdmin && (...)}`. |
| **AUD-02** | **P1 (Routing)** | [proxy.ts](file:///home/akubrecah/Mac_Desktop/Akubrecah%20KRA/proxy.ts) | `isAdminSubdomain` clean sub-path rewrite allowlist omitted `/messages` and `/brand`, breaking clean subdomain paths on `admin.akubrecah.com`. | Added `/messages` (`pathname === '/messages' || pathname.startsWith('/messages/')`) and `/brand` (`pathname === '/brand' || pathname.startsWith('/brand/')`) to the allowlist. |
| **AUD-03** | **P1 (Deep-Link / Flow)** | [components/kra-portal.tsx](file:///home/akubrecah/Mac_Desktop/Akubrecah%20KRA/components/kra-portal.tsx) | Links from `/pin-checker` to `/retrieval-portal?pin=...` ignored the `pin` query parameter and stayed on the default tab. | Added URL `?pin=` query parameter reader inside the mount `useEffect` to switch `setActiveTab("pin")` and populate `formData.pin`. |
| **AUD-04** | **P1 (Crash Risk & Fake UI)** | [components/profile-client.tsx](file:///home/akubrecah/Mac_Desktop/Akubrecah%20KRA/components/profile-client.tsx) | Missing empty defaults (`initialDob`, `initialGender`, `initialNationality`), unguarded `new Date(dob)` rendering `"Invalid Date"`, missing avatar initials fallback, unwired photo camera button, misleading client-only email editing, fake local password/2FA controls, and 3 hardcoded mock login sessions with dead `Revoke` button. | Defaulted props to `""`, guarded DOB formatting (`"Not provided"` fallback), rendered initials fallback & wired photo change to Clerk `openUserProfile()`, made email read-only with Clerk profile redirect helper, added `"Not specified"` modal options, and replaced fake password/2FA/session rows with live `clerkUser?.twoFactorEnabled`, `clerkUser?.lastSignInAt`, and Clerk security management. |
| **AUD-05** | **P1 (Dead-End & Disconnected Billing)** | [app/dashboard/page.tsx](file:///home/akubrecah/Mac_Desktop/Akubrecah%20KRA/app/dashboard/page.tsx), [app/dashboard/filing/page.tsx](file:///home/akubrecah/Mac_Desktop/Akubrecah%20KRA/app/dashboard/filing/page.tsx), [app/retrieval-portal/page.tsx](file:///home/akubrecah/Mac_Desktop/Akubrecah%20KRA/app/retrieval-portal/page.tsx) | Dashboard omitted `db.certificateDownload.count` aggregation, linked filing demo to `/retrieval-portal` instead of `/retrieval-portal?view=filing`, and omitted `<CyberSubscriptionCard />`. `/retrieval-portal` omitted `<CyberSubscriptionCard compact={true} />`. `/dashboard/filing` ended in an empty placeholder card with no CTAs. | Aggregated `Math.max(certDownloadsCount, systemLogCertCount)`, fixed `?view=filing` link, rendered `<CyberSubscriptionCard />` on `/dashboard` and `<CyberSubscriptionCard compact={true} />` inside `<main>` on `/retrieval-portal`, and added `Launch Interactive Filing Demo` + `Back to Dashboard` CTAs to `/dashboard/filing`. |
| **AUD-06** | **P2 (Form Prefill)** | [app/contact/page.tsx](file:///home/akubrecah/Mac_Desktop/Akubrecah%20KRA/app/contact/page.tsx) | Solution/service CTA query parameters (`?service=`, `?solution=`, `?scale=`) failed to pre-select matching `projectTypes` and `budgetRanges` strings for `web`, `saas`, `mobile`, `mobility`, `cloud`, `enterprise`, `govtech`, `fintech`, `brand`, `starter`/`mvp`/`growth`. | Expanded query parameter mapper to align all solution slugs and scale tiers with exact `projectTypes` and KES `budgetRanges` options. |
| **AUD-07** | **P1 (Backend Bug / 500 Risk)** | [app/api/admin/kra-retrievals/route.ts](file:///home/akubrecah/Mac_Desktop/Akubrecah%20KRA/app/api/admin/kra-retrievals/route.ts) | Referenced `db.SystemLog?.findMany` (wrong casing vs Prisma lowercase delegate `db.systemLog`), causing SystemLog audit fallback to return undefined/no rows. | Corrected line 66 to `db.systemLog?.findMany`. |
| **AUD-08** | **P2 (Data Completeness)** | [app/api/admin/overview/route.ts](file:///home/akubrecah/Mac_Desktop/Akubrecah%20KRA/app/api/admin/overview/route.ts) | `db.certificateDownload.findMany` omitted user email/name relation, leaving recent certificate downloads unattributed in admin overview. | Added `include: { users: { select: { email: true, firstName: true, lastName: true } } }` to the query. |
| **AUD-09** | **P2 (Disconnected Admin Logs)** | [app/admin/system-health/page.tsx](file:///home/akubrecah/Mac_Desktop/Akubrecah%20KRA/app/admin/system-health/page.tsx) | System Health console lacked live log stream hydration and had an unwired log filter icon button. | Connected live `/api/admin/logs?limit=15` fetch inside `fetchHealth()` and wired the `filter_list` button to cycle `"all"` → `"warning"` → `"error"`. |
| **AUD-10** | **P1 (Fake Admin Action)** | [app/api/admin/users/route.ts](file:///home/akubrecah/Mac_Desktop/Akubrecah%20KRA/app/api/admin/users/route.ts), [app/admin/user-management/page.tsx](file:///home/akubrecah/Mac_Desktop/Akubrecah%20KRA/app/admin/user-management/page.tsx) | Clicking password/session reset in `/admin/user-management` only showed a fake client toast without calling any API. | Added server-side `action === "resetPassword" || action === "resetSessions"` handler revoking active Clerk sessions (`client.sessions.getSessionList` + `revokeSession`) and wired the admin UI button to `POST /api/admin/users` with server feedback toast. |
| **AUD-11** | **P2 (Stale UI Date)** | [components/KRAAnnouncementBanner.tsx](file:///home/akubrecah/Mac_Desktop/Akubrecah%20KRA/components/KRAAnnouncementBanner.tsx) | Hardcoded `2026-03-31` promotional cutoff expired and showed stale date copy. | Removed expired date cutoff and updated copy to reflect ongoing third-party cyber facilitation service. |
| **AUD-12** | **P2 (Broken Metadata Asset)** | [public/og-image.jpg](file:///home/akubrecah/Mac_Desktop/Akubrecah%20KRA/public/og-image.jpg) | Layout & route OpenGraph metadata referenced `/og-image.jpg`, which did not exist in `public/` (404). | Generated `public/og-image.jpg` (`44K` JPEG) from `public/Akubrecah-logo.jpeg` so social unfurls resolve HTTP 200. |

---

## 4. Security, Performance & Build Verification Highlights

- **Security Controls Verified:**
  - `next.config.mjs` enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Strict-Transport-Security`, `Permissions-Policy`, `Content-Security-Policy-Report-Only`, and `X-Robots-Tag: noindex` across `/admin`, `/dashboard`, and `/api`.
  - Admin endpoints guard every call through `verifyAdminCaller` (`lib/admin-auth.ts`) with timing-safe `safeCompare`, PIN/secret headers, `admin_magic_auth` cookie checks, and Clerk role/email enforcement.
  - Sensitive user PII is masked in `createSystemLog` (`lib/prisma.ts`) and unmasked taxpayer certificate access passes strict Zod validation (`lib/validation/schemas.ts`) and verified payment/subscription gating (`lib/mpesa-verification.ts`, `lib/subscription.ts`).
- **Build & Test Verification:**
  - `npx prisma validate`, `npm run typecheck`, `npm run lint -- --quiet`, `npm test` (15/15 files, 125/125 tests), and `npm run build` (`Next.js 16.4.2` Turbopack, 80/80 static pages + dynamic SSR/API routes + `ƒ Proxy (Middleware)`) all succeeded with exit code `0` (exact logs recorded in `TESTING_RESULTS.md`).

---

## 5. Remaining Non-Blocking Observations

1. **OpenGraph Banner Dimensions (`public/og-image.jpg`):** Currently sourced at `1000x319` JPEG while metadata declares `1200x630`; resolves cleanly with HTTP 200 today, and designers can swap in a dedicated `1200x630` hero graphic later without touching code.
2. **CSP Enforcement Mode (`next.config.mjs`):** Configured as `Content-Security-Policy-Report-Only`; promote to enforcing `Content-Security-Policy` once production telemetry confirms zero benign third-party script blocks (Clerk, Sentry, Remotion).
3. **Admin Password Reset Mechanism (`/admin/user-management`):** Because Clerk Backend SDK does not dispatch password-reset emails programmatically, the admin action immediately revokes all active Clerk sessions for that user so they re-authenticate or use Clerk's forgot-password flow upon next visit.
