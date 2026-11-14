# Production Readiness Checklist — Akubrecah Technologies & KRA Portal

**Status:** Complete & Verified  
**Verification Baseline:** `fix/audit-p0-security-and-routing` (2026-11-14)

---

## 1. Architecture, Routing & Proxy (`proxy.ts` / `next.config.mjs`)
- [x] Next.js 16 App Router conventions followed (`proxy.ts` used exclusively; no `middleware.ts` present).
- [x] Multi-subdomain routing verified (`akubrecah.com`, `kra.akubrecah.com`, `admin.akubrecah.com`, and local development fallback).
- [x] Clean admin subdomain allowlist includes `/messages` and `/brand` alongside core admin sections (`proxy.ts`).
- [x] Zero unintended 404 routes across all 41 app pages (`app/**/page.tsx`) and 45 API handlers (`app/api/**/route.ts`).
- [x] `/pin-checker` deep-links (`/retrieval-portal?pin=...`) switch cleanly to the PIN Lookup tab and prefill the query input (`components/kra-portal.tsx`).
- [x] `/dashboard/filing` connects directly to `/retrieval-portal?view=filing` and `/dashboard` with zero dead-end UI.
- [x] `/contact` prefill parameters (`?service=`, `?solution=`, `?scale=`) map cleanly to `projectTypes` and KES `budgetRanges`.

## 2. Authentication, Authorization & RBAC
- [x] All `/api/admin/*` endpoints enforce `verifyAdminCaller` (`lib/admin-auth.ts`) with timing-safe `safeCompare`.
- [x] Header admin navigation visibility strictly matches configured admin email (`Boolean(configAdminEmail && userEmail === configAdminEmail)` in `components/site-header.tsx`).
- [x] Taxpayer profile security controls use genuine Clerk SDK state (`clerkUser?.twoFactorEnabled`, `clerkUser?.lastSignInAt`, `openUserProfile()`) with zero mock sessions or local-only password/email toggles (`components/profile-client.tsx`).
- [x] Admin user reset action (`POST /api/admin/users`) executes real Clerk session revocation (`client.sessions.revokeSession`) and returns server-verified feedback (`app/admin/user-management/page.tsx`).

## 3. Payments (Safaricom Daraja M-Pesa Express)
- [x] Single active payment gateway: Safaricom Daraja M-Pesa Express (`Short Code 9914132`, Buy Goods Till `9348469`).
- [x] STK Push, status polling, callback processing, and manual verification schemas validated via Zod (`lib/validation/schemas.ts`).
- [x] Sole paid retrieval deliverable enforced (`KRA PIN Certificate (PDF)`), with thermal receipt printer artifacts retired.
- [x] Cyber Cafe monthly subscription card (`<CyberSubscriptionCard />`) integrated into both `/dashboard` and `/retrieval-portal`.

## 4. Database & Prisma Integrity
- [x] `prisma/schema.prisma` validates cleanly (`32` models, zero schema drift).
- [x] Prisma client v6.2.1 generated cleanly in build pipeline (`prisma generate && next build`).
- [x] Case-sensitive delegate bug (`db.SystemLog` → `db.systemLog`) fixed in `app/api/admin/kra-retrievals/route.ts`.
- [x] Admin overview certificate downloads include relational `users` attribution (`app/api/admin/overview/route.ts`).
- [x] Dashboard certificate counter reconciles both `certificateDownload.count` and SystemLog metrics (`app/dashboard/page.tsx`).

## 5. UI/UX, Forms & Operational Health
- [x] Expired `2026-03-31` promotional cutoff removed from `components/KRAAnnouncementBanner.tsx`.
- [x] Profile screen handles missing DOB (`"Not provided"`), empty gender/nationality options, and missing Clerk avatar images via initials fallback.
- [x] `/admin/system-health` consumes live `/api/admin/logs?limit=15` telemetry and provides working severity cycling (`"all"` / `"warning"` / `"error"`).

## 6. Security Headers, SEO & Assets
- [x] Security headers configured in `next.config.mjs`: `X-Content-Type-Options`, `X-Frame-Options`, `HSTS`, `Permissions-Policy`, `CSP-Report-Only`.
- [x] Non-indexable administrative, dashboard, and API routes return `X-Robots-Tag: noindex`.
- [x] Missing OpenGraph image resolved (`public/og-image.jpg` present and valid JPEG).
- [x] `/robots.txt` and `/sitemap.xml` built and verified in static output (`80/80` pages).

## 7. Pre-Deploy Automated Gate
- [x] `npx prisma validate` exits `0`.
- [x] `npm run typecheck` (`tsc --noEmit`) exits `0` with zero errors.
- [x] `npm run lint -- --quiet` (`eslint . --quiet`) exits `0` with zero errors.
- [x] `npm test` (`vitest run`) exits `0` (`15/15` files, `125/125` tests passing).
- [x] `npm run build` (`prisma generate && next build`) exits `0` with all routes compiled cleanly.
- [ ] **Post-Deploy / Creative Polish (Non-Blocking):** Swap `public/og-image.jpg` with dedicated `1200x630` hero graphic if custom social card art is desired, and evaluate promoting `Content-Security-Policy-Report-Only` to enforcing mode after live CSP telemetry check.
