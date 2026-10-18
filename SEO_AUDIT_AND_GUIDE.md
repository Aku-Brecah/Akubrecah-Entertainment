# Comprehensive SEO, Search Indexing & AI Discovery Master Strategy

**Website:** [akubrecah.com](https://akubrecah.com)  
**Organization:** Akubrecah Technologies Limited  
**Stack:** Next.js 16.1.1 (App Router), React 19, TypeScript, Tailwind CSS, Prisma  
**Audit & Implementation Date:** October 2026  

---

## 1. Executive Summary & Baseline Audit

Prior to this implementation, a comprehensive audit of the Akubrecah Technologies web platform revealed critical technical SEO, crawler accessibility, and indexing bottlenecks that limited search engine visibility:

| Audit Dimension | Original Baseline State | Identified Severity | Implemented Solution |
| :--- | :--- | :--- | :--- |
| **Domain Canonicalization** | Defaulted to staging `akubrecah.vercel.app` in `layout.tsx` | **Critical** | Unified `metadataBase: new URL('https://akubrecah.com')` with exact canonical self-references across all routes. |
| **Crawler Directives (`robots.txt`)** | Basic catch-all, missing dedicated directives for AI crawlers and missing disallows for auth/dashboard paths | **High** | Multi-agent rules for Googlebot, Bingbot, DuckDuckBot, Baiduspider, YandexBot, PerplexityBot, ChatGPT-User, Claude-Web, and Applebot; shielded private directories (`/admin/`, `/dashboard/`, `/api/`, `/checkout/`). |
| **XML Sitemap** | Incomplete static route list; included private admin verification utilities (`/pin-checker`) | **High** | Dynamic, cached (`revalidate = 3600`) sitemap featuring all canonical routes (`/retrieval-portal`, `/services`, `/solutions`, `/products`, `/projects`, `/articles`, `/legal/*`) and dynamic CMS entities with priority scoring. |
| **Render Architecture (SSR/SSG)** | Several public pages (`/services`, `/products`, `/solutions`, `/about`) were needlessly tagged with `"use client"`, preventing static HTML export and Next.js `metadata` exports | **Critical** | Converted marketing and directory pages to Server Components with full SSR/SSG pre-rendering (`○ Static`), ensuring bots receive complete HTML without JS execution. |
| **Structured Data (Schema.org)** | Missing JSON-LD schemas across the entire application | **Critical** | Deployed modular JSON-LD schemas: `TechCompany` / `Organization`, `WebSite` with `SearchAction`, `WebApplication` / `SoftwareApplication`, `Service`, `TechArticle`, `BreadcrumbList`, and `FAQPage`. |
| **AI Search Discovery** | Zero machine-readable guidance for Perplexity, ChatGPT search, Claude, or Copilot | **High** | Published official `public/llms.txt` and `public/llms-full.txt` outlining system boundaries, technical services, and citation anchors. |
| **IndexNow Protocol** | Missing | **Medium** | Implemented IndexNow verification key (`public/c95843a0d5c040d6832dbff09ce6a213.txt`) and programmatic dispatch utility (`lib/seo/indexnow.ts`). |
| **Image & Asset Performance** | Missing modern image delivery negotiation | **Medium** | Configured `next.config.mjs` with `compress: true`, AVIF/WebP automatic transcoding, and `X-Robots-Tag: noindex` HTTP shielding headers. |

---

## 2. Technical SEO Architecture & Implementation

### 2.1 Metadata Hierarchy & Canonical URLs
- **Root Layout (`app/layout.tsx`):**
  - Sets `metadataBase: new URL('https://akubrecah.com')`.
  - Implements the title template: `%s | Akubrecah Technologies`.
  - Default OpenGraph and Twitter Summary Large Image cards with local Kenyan metadata (`locale: 'en_KE'`).
  - Webmaster verification hooks for Google (`process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`), Bing, and Yandex.
- **Route-Specific Metadata & Canonical Tags:**
  - `/` (Home)
  - `/retrieval-portal` (Statutory Gateway)
  - `/services` (Engineering Services)
  - `/solutions` (Industry Solutions)
  - `/products` (In-House Products)
  - `/projects` & `/projects/[slug]` (Dynamic Systems Case Studies)
  - `/articles` & `/articles/[slug]` (Technical Field Notes)
  - `/about` (Corporate Background & Nairobi HQ)
  - `/contact` (Engineering Consultation Briefs)
  - `/legal` & `/legal/{privacy,terms,disclaimer,refund,aup,cookies}`

### 2.2 Server-Side Pre-Rendering
By refactoring marketing routes into pure Server Components, the Next.js Turbopack compiler now renders static HTML snapshots at build time:
- Essential headings (`<h1>`, `<h2>`), paragraph copy, feature checklists, and navigation links are in the initial HTTP response.
- Crawlers that do not execute client-side JavaScript (e.g., Baiduspider, standard curl/HTTP clients, low-resource web crawlers) see 100% of the content.

### 2.3 Shielding Private Routes
Private and authenticated pages must never pollute indexation:
1. `app/robots.ts` explicitly disallows:
   - `/admin/`, `/admin`
   - `/dashboard/`, `/dashboard`
   - `/api/`
   - `/checkout/`, `/checkout`
   - `/onboarding/`, `/onboarding`
   - `/sign-in/`, `/sign-up/`
2. `next.config.mjs` injects HTTP header:
   `X-Robots-Tag: noindex, nofollow, noarchive` for `/admin/:path*`, `/dashboard/:path*`, and `/api/:path*`.
3. Dedicated `layout.tsx` with `robots: { index: false, follow: false }` protects `/pin-checker`.

---

## 3. Schema.org JSON-LD Structured Data

All schemas are consolidated in [`components/seo/site-schema.tsx`](file:///home/akubrecah/Mac_Desktop/Akubrecah%20KRA/components/seo/site-schema.tsx):

1. **Organization / TechCompany (`SiteSchema`):**
   - Authoritative identity for Google Knowledge Graph.
   - Contains Nairobi coordinates (`latitude: -1.286389`, `longitude: 36.817223`), contact points (`+254791497858`), official email (`engineering@akubrecah.com`), and verified `sameAs` social profiles (GitHub, LinkedIn, Twitter).
2. **WebSite (`SiteSchema`):**
   - Configures `potentialAction: SearchAction` pointing to `https://akubrecah.com/articles?q={search_term_string}`.
3. **WebApplication (`SoftwareSchema`):**
   - Injected into `/retrieval-portal`.
   - Outlines browser requirements, category (`BusinessApplication`), operating system support, and statutory service pricing in KES.
4. **Service (`ServiceSchema`):**
   - Injected into `/services`.
   - Identifies enterprise engineering, cloud architecture, and statutory compliance capabilities for East Africa.
5. **TechArticle (`ArticleSchema`):**
   - Injected dynamically into `/articles/[slug]`.
   - Informs Google and AI engines of publication dates, modified dates, authorship, and featured imagery.
6. **BreadcrumbList (`BreadcrumbSchema`):**
   - Standardized across all pages to generate rich breadcrumb trails in SERP results.

---

## 4. AI Search Optimization & Generative Engine Optimization (GEO)

To optimize for **Google AI Overviews, Perplexity AI, ChatGPT Search, Microsoft Copilot, and Claude**:

1. **Semantic Content Structure:**
   - Single clear `<h1>` per page.
   - Distinct, informative `<h2>` subheadings matching natural conversational questions (e.g., "Engineering Standards Behind Every Product", "How We Deliver Every Project").
   - Explicit Kenyan statutory citations (Kenya Data Protection Act 2019, Kenya Revenue Authority).
2. **AI Crawler Permissions:**
   - Dedicated User-Agent sections in `robots.ts` granting crawl permissions to `PerplexityBot`, `ChatGPT-User`, `OAI-SearchBot`, `Claude-Web`, and `Applebot`.
3. **`llms.txt` and `llms-full.txt`:**
   - Implemented at `/public/llms.txt` and `/public/llms-full.txt`.
   - Outlines company capabilities, core URLs, security guarantees, and technical stacks in clean, markdown syntax for AI ingest pipelines.

---

## 5. Webmaster Tools & Indexing Verification Checklists

### 5.1 Google Search Console (GSC) Setup
1. **Domain Ownership Verification:**
   - Add DNS TXT record via your DNS provider (e.g., Cloudflare, Namecheap, GoDaddy):
     `google-site-verification=<TOKEN>`
   - Alternatively, add `<meta name="google-site-verification" content="<TOKEN>" />` by setting `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` in `.env.local` / Vercel Environment Variables.
2. **Sitemap Submission:**
   - In GSC -> Sitemaps -> Enter URL: `https://akubrecah.com/sitemap.xml` -> Click **Submit**.
   - Confirm status reports "Success" and all canonical URLs are discovered.
3. **URL Inspection & Live Test:**
   - Inspect `https://akubrecah.com` and `https://akubrecah.com/retrieval-portal`.
   - Verify: "URL is on Google", "Page is mobile-friendly", "Valid Breadcrumbs detected", "Valid SoftwareApplication detected".
4. **Coverage & Security Audit:**
   - Review "Security & Manual Actions" tab to ensure clean standing.

### 5.2 Bing Webmaster Tools & IndexNow
1. **Verification:**
   - Import verification directly from Google Search Console or add meta tag via `process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION`.
2. **Submit XML Sitemap:**
   - Submit `https://akubrecah.com/sitemap.xml` in Bing Webmaster Tools.
3. **IndexNow Activation:**
   - Bing will automatically verify key file at `https://akubrecah.com/c95843a0d5c040d6832dbff09ce6a213.txt`.
   - Any new or updated URLs can be submitted instantly via `lib/seo/indexnow.ts`:
     ```typescript
     import { submitToIndexNow } from '@/lib/seo/indexnow';
     await submitToIndexNow(['/articles/new-post', '/projects/new-case-study']);
     ```

### 5.3 Other Search Engines
- **DuckDuckGo:** Uses Bing's index + independent DuckDuckBot. Handled automatically via Bing submission and open robots permissions.
- **Yandex:** Configured via `yandex-verification` meta hook and IndexNow integration.
- **Baidu:** Allowed specifically in `robots.ts` under `User-Agent: Baiduspider`.
- **Yahoo:** Powered by Bing index. Verified via Bing Webmaster Tools.

---

## 6. Verification & Automated Quality Results

All checks have been executed and verified in the environment:

1. **Vitest SEO Test Suite (`tests/seo.test.ts`):**
   - `✓ Robots.txt Directive Verification`: 7 bot configurations, private route shielding, canonical sitemap pointer.
   - `✓ XML Sitemap Route Integrity`: Discovers all public routes, excludes private admin tools, validates priorities.
   - `✓ IndexNow Protocol Client`: Normalizes relative paths, handles payload construction, validates responses.
   - `✓ AI Discovery Files & Key Verification`: Validates `llms.txt`, `llms-full.txt`, and key text file presence.
   - **Result:** `6 passed / 6 test files (30 passed / 30 tests)`
2. **TypeScript Typecheck:**
   - Command: `npm run typecheck` (`tsc --noEmit`)
   - **Result:** Clean exit (code 0), zero typing errors across all layouts, schemas, and pages.
3. **Production Build Compilation:**
   - Command: `npm run build` (`prisma generate && next build`)
   - **Result:** Turbopack compilation succeeded (code 0).
   - Generated static pre-rendered HTML for all public routes (`/`, `/retrieval-portal`, `/services`, `/solutions`, `/products`, `/about`, `/contact`, `/legal/*`).

---

## 7. 30-Day Post-Deployment Monitoring Plan

| Timeframe | Action Items |
| :--- | :--- |
| **Day 1 (Immediate)** | 1. Deploy production branch to Vercel/host.<br>2. Submit `https://akubrecah.com/sitemap.xml` to Google Search Console and Bing Webmaster Tools.<br>3. Inspect `/` and `/retrieval-portal` using GSC URL Inspection and request initial indexing.<br>4. Trigger initial IndexNow ping for all canonical routes. |
| **Days 2 - 7** | 1. Monitor GSC "Pages" report for crawl errors, soft 404s, or canonical mismatches.<br>2. Confirm rich results detection (BreadcrumbList, WebApplication, TechArticle).<br>3. Check server logs for bot crawl activity (`Googlebot`, `Bingbot`, `PerplexityBot`). |
| **Days 8 - 14** | 1. Review Google Search Console Performance report for initial search impressions on terms like "KRA certificate retrieval", "tax returns filing Kenya", and "software engineering Nairobi".<br>2. Test Perplexity AI and ChatGPT Search queries regarding Akubrecah Technologies services to evaluate citation pickup. |
| **Days 15 - 30** | 1. Conduct monthly XML sitemap refresh.<br>2. Review Core Web Vitals real-user metric field data in GSC (LCP, INP, CLS).<br>3. Publish new engineering field notes via `/articles` to build topic authority and trigger automated IndexNow submissions. |
