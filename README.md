# Akubrecah KRA Portal

Kenya Revenue Authority (KRA) retrieval and certificate services — a Next.js 16 web portal and WhatsApp bot that lets Kenyan taxpayers look up KRA records by National ID or KRA PIN and pay for full, unmasked certificate downloads via Safaricom Daraja M-Pesa Express (STK Push).

## What it does

- **Taxpayer retrieval** (`/pin-checker`, `/api/kra/*`): DWR/API lookups against KRA endpoints through a configurable egress proxy, TSO station resolution, arithmetical captcha.
- **KDPA-compliant masking** (`lib/masking.ts`): pre-payment data is masked; the full PIN never leaves the server in plaintext for ID-based searches — it is sealed client-side (AES-256-GCM, `kraseal1:` blobs) and resolved server-side only inside payment endpoints.
- **Payments**: fixed KES 20 per certificate download (KES 500 for 30-day Cyber Cafe Pass). M-Pesa STK Push via Safaricom Daraja production API with callback token validation, underpayment rejection, idempotent callback processing, and Daraja STK Push Query reconciliation.
- **WhatsApp bot** (`/api/whatsapp/chat`): Evolution API integration — slash-command strict TSO flow, KRA lookups, M-Pesa Express payments, cyber café subscriptions, admin commands gated by `ADMIN_BOT_PIN` (with per-phone admin sessions and magic-link login).
- **Admin console** (`/admin`): role-access UI on `admin.akubrecah.com`, system logs, settings, inquiries, articles (CMS), user management.
- **Cyber café** subscriptions with monthly invoices delivered to WhatsApp.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Auth | Clerk (`proxy.ts` = Next 16 middleware), magic-token admin cookies (HMAC) |
| Data | Prisma 6 + Neon PostgreSQL, Redis-backed rate limiting (`lib/rate-limit`), in-memory graceful fallback |
| Payments | Safaricom Daraja M-Pesa Express (sole active gateway) |
| Bot | Evolution API (WhatsApp) + n8n delivery webhooks |
| Observability | Sentry (server/edge/client via `instrumentation.ts`), `lib/monitoring` error tracker, `lib/telemetry` PII sanitizer |
| Tests | Vitest (`tests/`) — masking/seal crypto, Daraja M-Pesa Express, rate limiting, feature flags, env schema, webhooks |

## Local development

```bash
npm install
npx prisma generate          # generate the Prisma client
npm run dev                  # http://localhost:3000
npm test                     # vitest
npm run typecheck            # tsc --noEmit
npm run lint                 # eslint
npm run build                # prisma generate && next build
```

Environment variables: see `.env.example` (documented and grouped: DB, Clerk, Daraja/M-Pesa, Evolution, Sentry, rate limiting, crypto, feature flags). Production boot must set `ENCRYPTION_KEY`/`JWT_SECRET` (sealed-PIN transport + admin magic tokens), `ADMIN_BOT_PIN`, `EVOLUTION_API_KEY`, `INTERNAL_PROXY_SECRET` and `DARAJA_CALLBACK_TOKEN`/`MPESA_CALLBACK_TOKEN` among others.

## Deployment

- **Vercel** (primary): CI on GitHub Actions builds and deploys on push to `main` (`.github/workflows/`).
- **Self-host VPS/Docker** (secondary): `Dockerfile` + `deploy/docker-compose.yml` (app + Caddy + Evolution + Redis + Postgres), served by Caddy. `deploy/Caddyfile` injects `X-Internal-Proxy-Secret` so the app can trust `cf-connecting-ip`/`X-Forwarded-For` for rate limiting; the M-Pesa callback URL must be registered as `/api/mpesa/callback?token=<DARAJA_CALLBACK_TOKEN>` in the Daraja portal.
- Data model changes: `npx prisma db push && npx prisma generate`.

## Security posture (what's hardened and why)

- No hardcoded secrets — all admin/service credentials come from env and **fail closed**; secrets are never accepted via URL query params on admin endpoints.
- Timing-safe comparisons for admin PIN, service secrets, Daraja callback tokens, and magic-token signatures.
- Payment records obey the PIN-lock rule (a payment for PIN A never unlocks PIN B) with idempotent callbacks, verified amounts (KES 20 floor), and no fake-success paths in production.
- TLS verification for KRA scraping defaults to secure (`KRA_ALLOW_INSECURE_TLS` is an explicit escape hatch).
- `scratch/`, `.env*` and agent tooling are gitignored; `.dockerignore` keeps real env files out of images.

## Repo layout

```
app/            App Router pages + API routes (kra, mpesa, whatsapp, admin, cyber…)
components/     UI (KRA portal, remotion certificate preview, admin tables)
lib/            Domain services: kra-api, mpesa-verification, certificate-fulfillment, cyber-subscription,
                masking, rate-limit, magic-token, monitoring, telemetry, feature-flags
deploy/         Caddyfile + docker-compose for the VPS stack
prisma/         Prisma schema (Postgres)
tests/          Vitest suites
scripts/        Ops scripts; scripts/legacy/ = one-off VPS/migration tools
```

Historical audit/implementation notes live in `docs/` and the root `*.md` files (`TASKS.md` is the running implementation log).
