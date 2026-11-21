import {
  ArrowRight,
  Calculator,
  ExternalLink,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getPublishedProjects, getPublishedArticles } from '@/lib/cms';
import { filterPublicTechnologies, cleanPublicLiveUrl } from '@/lib/tech-filter';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Akubrecah Technologies | Software Engineering, GovTech & Digital Products',
  description:
    'Full-cycle software engineering, mission-critical statutory compliance portals, and high-throughput fintech infrastructure in Nairobi, Kenya. Web platforms, mobile apps, Daraja M-Pesa integrations, and cloud architectures.',
  keywords: [
    'Akubrecah Technologies',
    'Akubrecah Entertainment',
    'Software Engineering Kenya',
    'GovTech Automation East Africa',
    'KRA Compliance Portal',
    'KRA PIN Certificate Retrieval',
    'Statutory Compliance Data Grid',
    'Nil Returns Filing Automation',
    'Enterprise Mobile Applications Nairobi',
    'Fintech Daraja M-Pesa API Architecture',
    'Full-Stack Web Development Nairobi',
  ],
  alternates: {
    canonical: 'https://akubrecah.com',
  },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://akubrecah.com',
    siteName: 'Akubrecah Technologies',
    title: 'Akubrecah Technologies | Software Engineering & Digital Systems',
    description:
      'Architecting resilient software systems, cloud automation, and statutory tax compliance portals. High-impact engineering made in Nairobi, Kenya.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Akubrecah Technologies - Engineering Excellence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Akubrecah Technologies | Software Engineering & GovTech',
    description:
      'Full-cycle software engineering company in Nairobi, Kenya. Web, mobile, cloud infrastructure, GovTech gateways, and creative brand design.',
    images: ['/og-image.jpg'],
    creator: '@akubrecah',
  },
};

export default async function Home() {
  const [allProjects, allArticles] = await Promise.all([
    getPublishedProjects().catch(() => []),
    getPublishedArticles().catch(() => []),
  ]);
  const projects = allProjects.slice(0, 3);
  const articles = allArticles.slice(0, 2);

  const capabilities = [
    {
      code: '01',
      label: 'GovTech & Statutory Systems',
      desc: 'Automated tax record verification, ephemeral PDF certificate delivery, and compliance portals.',
      href: '/solutions#govtech',
      meta: 'KRA PIN & iTax Facilitation',
    },
    {
      code: '02',
      label: 'Web Platform Engineering',
      desc: 'Server-rendered web applications, internal administrative consoles, and typed APIs built on Next.js and PostgreSQL.',
      href: '/services#web',
      meta: 'Next.js · TypeScript · Postgres',
    },
    {
      code: '03',
      label: 'Mobile Application Ecosystems',
      desc: 'Native iOS, Android, and React Native field applications engineered with offline-first local state synchronization.',
      href: '/services#mobile',
      meta: 'iOS · Android · React Native',
    },
    {
      code: '04',
      label: 'Daraja M-Pesa & Payment Rails',
      desc: 'Safaricom Daraja STK Push billing, callback idempotency, automated Till verification, and ledger reconciliation.',
      href: '/services#enterprise',
      meta: 'STK Push · C2B · B2C Ledgers',
    },
  ];

  return (
    <div className="relative w-full bg-background text-on-surface font-sans">
      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 flex flex-col space-y-16 pb-16 pt-8 md:pt-12">

        {/* ============================= HERO SECTION ============================= */}
        <section id="hero" className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start pt-2">
          {/* Left: Editorial Positioning & Actions */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-primary tracking-wide uppercase">
              <span>Nairobi, Kenya</span>
              <span className="text-outline-variant">/</span>
              <span className="text-on-surface-variant">Software Engineering &amp; GovTech Infrastructure</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-on-surface tracking-tight leading-[1.1]">
              Software systems engineered for production load and statutory precision.
            </h1>

            <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl leading-relaxed">
              Akubrecah Technologies designs and operates web platforms, native mobile applications, Safaricom Daraja M-Pesa payment integrations, and independent KRA compliance facilitation tools for East African enterprises and citizens.
            </p>

            {/* Action Center */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
              <Button
                asChild
                size="lg"
                className="h-11 px-6 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 flex items-center gap-2"
              >
                <Link href="/services">
                  <span>Engineering Services</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 px-5 rounded-lg border-outline-variant font-semibold text-sm hover:bg-surface-container"
              >
                <Link href="/retrieval-portal">
                  <span>KRA Retrieval Portal</span>
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 px-5 rounded-lg border-outline-variant font-semibold text-sm hover:bg-surface-container"
              >
                <Link href="/estimator">
                  <Calculator className="h-4 w-4 mr-1 text-primary" />
                  <span>Scope Estimator</span>
                </Link>
              </Button>
            </div>

            {/* Verified Operational Facts */}
            <div className="pt-5 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-outline-variant text-xs">
              <div>
                <p className="font-semibold text-on-surface">Data Handling</p>
                <p className="text-on-surface-variant mt-0.5">Volatile RAM PDF streaming (KDPA 2019)</p>
              </div>
              <div>
                <p className="font-semibold text-on-surface">Payment Rails</p>
                <p className="text-on-surface-variant mt-0.5">Safaricom Daraja STK &amp; C2B verification</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="font-semibold text-on-surface">Delivery Scope</p>
                <p className="text-on-surface-variant mt-0.5">Web, iOS/Android &amp; API Gateways</p>
              </div>
            </div>
          </div>

          {/* Right: Structured Practice Directory */}
          <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant">
            <div className="px-5 py-3.5 bg-surface-container-low flex items-center justify-between">
              <span className="text-xs font-semibold text-on-surface">Core Engineering Practices</span>
              <Link href="/services" className="text-xs font-medium text-primary hover:underline">
                Full catalog &rarr;
              </Link>
            </div>
            {capabilities.map((cap) => (
              <Link
                key={cap.label}
                href={cap.href}
                className="group block p-5 hover:bg-surface-container-low transition-colors"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-xs font-mono text-primary font-semibold">{cap.code}</span>
                    <h2 className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                      {cap.label}
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-on-surface-variant shrink-0">{cap.meta}</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1.5 pl-6 leading-relaxed">
                  {cap.desc}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* ============================= FLAGSHIP PRODUCTION SYSTEM SPOTLIGHT ============================= */}
        <section className="p-6 sm:p-8 lg:p-10 rounded-xl bg-surface-container-lowest border border-outline-variant">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            <div className="lg:col-span-7 space-y-4">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider">
                In-House Production Platform · GovTech
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                KRA PIN Certificate Retrieval &amp; Statutory Facilitation Portal
              </h2>
              <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
                An independent compliance facilitation system for verifying Kenyan taxpayer records by National ID or KRA PIN, streaming formatted PDF certificates directly from volatile memory, and reconciling M-Pesa Express payments without retaining personal documents on disk.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                  <span className="font-semibold text-on-surface block">Zero-Disk PDF Streaming</span>
                  <span className="text-on-surface-variant">Certificates render in volatile RAM and stream directly to the browser.</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                  <span className="font-semibold text-on-surface block">Daraja M-Pesa Reconciliation</span>
                  <span className="text-on-surface-variant">KES 20 single retrieval or KES 500/month Cyber Cafe pass (50/day).</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3">
                <Button
                  asChild
                  size="lg"
                  className="h-10 px-5 rounded-lg bg-primary text-white font-semibold text-xs hover:bg-primary/90 flex items-center gap-2"
                >
                  <Link href="/retrieval-portal">
                    <span>Open Retrieval Portal</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-10 px-4 rounded-lg border-outline-variant font-semibold text-xs hover:bg-surface-container"
                >
                  <Link href="/pin-checker">
                    <span>PIN Format &amp; Obligation Checker</span>
                  </Link>
                </Button>
                <Link
                  href="/projects/akubrecah-kra-certificate-portal"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 ml-1"
                >
                  <span>Architecture Case Study</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Specification Summary Table */}
            <div className="lg:col-span-5 bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-on-surface">System Specification</span>
                </div>
                <span className="text-[11px] font-mono text-on-surface-variant">
                  KDPA 2019 Aligned
                </span>
              </div>
              <dl className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-outline-variant/60">
                  <dt className="text-on-surface-variant">Lookup Parameters</dt>
                  <dd className="font-mono font-semibold text-on-surface">National ID / KRA PIN</dd>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-outline-variant/60">
                  <dt className="text-on-surface-variant">Challenge Verification</dt>
                  <dd className="font-mono font-semibold text-on-surface">Stateless HMAC SVG</dd>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-outline-variant/60">
                  <dt className="text-on-surface-variant">Single Retrieval Tariff</dt>
                  <dd className="font-mono font-semibold text-primary">KES 20 (M-Pesa STK)</dd>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <dt className="text-on-surface-variant">Document Retention</dt>
                  <dd className="font-mono font-semibold text-on-surface">0 bytes persisted</dd>
                </div>
              </dl>
              <div className="pt-1">
                <Link
                  href="/retrieval-portal"
                  className="w-full py-2.5 px-4 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs font-semibold text-on-surface flex items-center justify-between hover:border-primary/50 transition-colors"
                >
                  <span>Proceed to Certificate Lookup</span>
                  <ArrowRight className="h-3.5 w-3.5 text-primary" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ============================= FEATURED PRODUCTION SYSTEMS ============================= */}
        <section id="featured-projects" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant pb-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Selected Work
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                Production Systems &amp; Case Studies
              </h2>
            </div>
            <Link href="/projects" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 shrink-0">
              <span>View all case studies</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.length > 0 ? (
              projects.map((proj) => (
                <article
                  key={proj.id}
                  className="p-6 rounded-xl bg-surface-container-lowest border border-outline-variant hover:border-primary/40 transition-colors flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-primary">
                        {proj.category}
                      </span>
                      {cleanPublicLiveUrl(proj.slug, proj.liveUrl) && (
                        <a
                          href={cleanPublicLiveUrl(proj.slug, proj.liveUrl)!}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-on-surface-variant hover:text-primary"
                          aria-label={`Open live system for ${proj.title}`}
                        >
                          <span>Live</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors tracking-tight">
                        <Link href={`/projects/${proj.slug}`}>
                          {proj.title}
                        </Link>
                      </h3>
                      <p className="text-xs text-on-surface-variant mt-2 line-clamp-3 leading-relaxed">
                        {proj.summary}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {filterPublicTechnologies((proj as any).technologies || []).slice(0, 4).map((tech: string) => (
                        <span
                          key={tech}
                          className="text-[11px] font-mono text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded border border-outline-variant"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 mt-5 border-t border-outline-variant flex items-center justify-between">
                    <Link
                      href={`/projects/${proj.slug}`}
                      className="text-xs font-semibold text-on-surface group-hover:text-primary flex items-center gap-1.5"
                    >
                      <span>Read case study</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <div className="col-span-3 p-8 rounded-xl bg-surface-container-lowest border border-outline-variant text-center text-xs text-on-surface-variant">
                No case studies published yet.
              </div>
            )}
          </div>
        </section>

        {/* ============================= TECHNICAL NOTES / ARTICLES ============================= */}
        {articles.length > 0 && (
          <section id="articles-teaser" className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant pb-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Technical Publication
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                  Field Notes &amp; Implementation Guides
                </h2>
              </div>
              <Link href="/articles" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 shrink-0">
                <span>All articles</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {articles.map((art) => (
                <article
                  key={art.id}
                  className="p-6 rounded-xl bg-surface-container-lowest border border-outline-variant hover:border-primary/40 transition-colors group flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                      <span className="font-semibold text-primary">
                        {art.category}
                      </span>
                      <span>·</span>
                      <span className="font-mono">
                        {art.readingTimeMinutes} min read
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors tracking-tight">
                      <Link href={`/articles/${art.slug}`}>
                        {art.title}
                      </Link>
                    </h3>

                    <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                      {art.excerpt}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-outline-variant">
                    <Link
                      href={`/articles/${art.slug}`}
                      className="text-xs font-semibold text-on-surface group-hover:text-primary flex items-center gap-1.5"
                    >
                      <span>Read article</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ============================= ENGINEERING METHODOLOGY ============================= */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant pb-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Delivery Lifecycle
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                How We Architect and Ship Systems
              </h2>
            </div>
            <Link href="/about" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5">
              <span>About our engineering standards</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                label: 'System Architecture',
                desc: 'Data modeling, API contract definitions, threat modeling, and payment reconciliation workflows before code is written.',
              },
              {
                step: '02',
                label: 'Vertical Slice Implementation',
                desc: 'End-to-end delivery across database schema, server validation, and responsive client interfaces in testable increments.',
              },
              {
                step: '03',
                label: 'Security & Compliance Audit',
                desc: 'Rate-limit verification, OWASP input sanitization, HMAC webhook validation, and KDPA 2019 privacy checks.',
              },
              {
                step: '04',
                label: 'Production Deployment',
                desc: 'Zero-downtime CI/CD releases, automated health telemetry, and structured incident logging.',
              },
            ].map((phase) => (
              <div key={phase.step} className="pt-4 border-t-2 border-outline-variant space-y-2">
                <span className="text-xs font-mono font-semibold text-primary">{phase.step}</span>
                <h3 className="text-base font-bold text-on-surface">{phase.label}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">{phase.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============================= FINAL CONSULTATION & ESTIMATOR BAR ============================= */}
        <section className="p-8 sm:p-10 rounded-xl bg-surface-container-lowest border border-outline-variant flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Project Scoping &amp; Technical Consultation
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
              Planning a custom platform, mobile application, or payment integration?
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Configure your technical requirements in our interactive scope estimator or speak directly with our engineering team in Nairobi.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              asChild
              size="lg"
              className="h-11 px-6 rounded-lg bg-primary text-white font-semibold text-xs hover:bg-primary/90 flex items-center gap-2"
            >
              <Link href="/contact">
                <span>Start a Project</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-11 px-5 rounded-lg border-outline-variant font-semibold text-xs hover:bg-surface-container"
            >
              <Link href="/estimator">
                <Calculator className="h-3.5 w-3.5 mr-1.5 text-primary" />
                <span>Interactive Cost Estimator</span>
              </Link>
            </Button>
          </div>
        </section>

      </div>
    </div>
  );
}
