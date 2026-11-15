import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  ExternalLink,
  Lock,
  Scale,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  Wallet,
  Zap,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getPublishedProjects, getPublishedArticles } from '@/lib/cms';
import { ReviewSection } from '@/components/reviews/review-section';
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
      label: 'GovTech & Compliance',
      desc: 'Automated Tax Verification, Statutory Compliance Data Grid & Certificate Delivery',
      href: '/solutions#govtech',
      badge: 'Flagship',
      icon: ShieldCheck,
    },
    {
      label: 'Web Engineering',
      desc: 'High-Scale Server-Rendered Platforms, APIs & Microservices (Next.js & React)',
      href: '/services#web',
      icon: Terminal,
    },
    {
      label: 'Mobile Ecosystems',
      desc: 'Native iOS & Android, React Native & Offline-First Sync Architectures',
      href: '/services#mobile',
      icon: Smartphone,
    },
    {
      label: 'Daraja M-Pesa & Fintech',
      desc: 'Safaricom Daraja M-Pesa Express STK, Automated Ledgers & B2B/B2C Settlements',
      href: '/services#enterprise',
      icon: Wallet,
    },
  ];

  return (
    <div className="relative w-full bg-background text-on-surface font-sans overflow-x-hidden">
      <div className="relative z-10 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 flex flex-col space-y-16 pb-16 pt-6 md:pt-10">

        {/* ============================= HERO SECTION ============================= */}
        <section id="hero" className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 pt-2">
          {/* Left: Text & Action Center */}
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-outline-variant/70 bg-surface-container-low">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Full-Cycle Software Engineering · GovTech · Cloud
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-on-surface tracking-tight leading-[1.05]">
              Engineering<br />
              <span className="text-primary">Digital Products</span><br />
              That Scale.
            </h1>

            <p className="text-base sm:text-lg text-on-surface-variant max-w-xl leading-relaxed">
              Full-cycle software engineering, mission-critical statutory compliance portals, and high-throughput fintech infrastructure.
              From automated KRA PIN retrieval and Safaricom Daraja M-Pesa billing to enterprise cloud platforms and native mobile apps.
            </p>

            {/* Action Center */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
              <Button
                asChild
                size="lg"
                className="h-12 px-7 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 shadow-md shadow-primary/20 flex items-center gap-2 group transition-all"
              >
                <Link href="/services">
                  <span>Explore Capabilities</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-6 rounded-xl border-outline-variant font-bold text-sm hover:bg-surface-container transition-all"
              >
                <Link href="/projects">
                  <span>View Case Studies</span>
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-6 rounded-xl border-outline-variant font-bold text-sm hover:bg-surface-container transition-all"
              >
                <Link href="/estimator">
                  <Calculator className="h-4 w-4 mr-1 text-primary" />
                  <span>Cost Estimator</span>
                </Link>
              </Button>

              <Button
                asChild
                variant="ghost"
                size="lg"
                className="h-12 px-5 rounded-xl text-on-surface-variant hover:text-primary font-bold text-sm"
              >
                <Link href="/contact">
                  <span>Schedule Consultation</span>
                </Link>
              </Button>
            </div>

            {/* Verified Operational Facts */}
            <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-on-surface-variant border-t border-outline-variant/60">
              <span className="font-semibold text-on-surface">Headquartered in Nairobi, Kenya</span>
              <span className="hidden sm:inline text-outline-variant">•</span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" />
                99.98% High Availability
              </span>
              <span className="hidden sm:inline text-outline-variant">•</span>
              <span>Statutory GovTech &amp; Safaricom Daraja M-Pesa</span>
              <span className="hidden sm:inline text-outline-variant">•</span>
              <span>Custom Enterprise Software</span>
            </div>
          </div>

          {/* Right: Core Capability Matrix */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <Link
                  key={cap.label}
                  href={cap.href}
                  className="group p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant hover:border-primary/50 transition-all duration-200 flex flex-col justify-between shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-9 h-9 rounded-xl bg-surface-container-low border border-outline-variant flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      {cap.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {cap.badge}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
                        {cap.label}
                      </span>
                      <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                        {cap.desc}
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 flex items-center gap-1 text-xs font-bold text-primary group-hover:underline">
                    <span>Explore practice</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ============================= FLAGSHIP PRODUCTION SYSTEM SPOTLIGHT ============================= */}
        <section className="p-8 sm:p-10 lg:p-12 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-sm relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                Live Production Platform · GovTech Flagship
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-on-surface tracking-tight">
                Akubrecah KRA PIN Certificate Retrieval &amp; Statutory Portal
              </h2>
              <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
                Our high-availability statutory compliance gateway handles National ID verification, automated Nil return filing, and sub-120ms volatile RAM PDF streaming with instant Safaricom Daraja M-Pesa Express reconciliation. Built with zero-disk unencrypted persistence under strict compliance with the Kenya Data Protection Act 2019.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="px-3 py-1 rounded-md bg-surface-container-low text-xs font-mono font-semibold text-on-surface border border-outline-variant">
                  Sub-120ms Volatile Streaming
                </span>
                <span className="px-3 py-1 rounded-md bg-surface-container-low text-xs font-mono font-semibold text-on-surface border border-outline-variant">
                  Zero-Disk Persistence
                </span>
                <span className="px-3 py-1 rounded-md bg-surface-container-low text-xs font-mono font-semibold text-on-surface border border-outline-variant">
                  Instant M-Pesa STK (KES 20)
                </span>
                <span className="px-3 py-1 rounded-md bg-surface-container-low text-xs font-mono font-semibold text-on-surface border border-outline-variant">
                  KDPA 2019 Certified
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <Button
                  asChild
                  size="lg"
                  className="h-11 px-6 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 flex items-center gap-2 shadow-sm"
                >
                  <Link href="/retrieval-portal">
                    <span>Launch Live Portal</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-11 px-5 rounded-xl border-outline-variant font-bold text-xs hover:bg-surface-container"
                >
                  <Link href="/pin-checker">
                    <span>Check PIN Format</span>
                  </Link>
                </Button>
                <Link
                  href="/projects/akubrecah-kra-certificate-portal"
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 ml-2"
                >
                  <span>Read Architecture Review</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Verification Proof Badge / Mock Summary Card */}
            <div className="lg:col-span-5 bg-surface-container-low border border-outline-variant rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <span className="text-xs font-bold text-on-surface">Statutory Verification Proof</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                  Operational
                </span>
              </div>
              <div className="space-y-3 text-xs text-on-surface">
                <div className="flex items-center justify-between py-1.5 border-b border-outline-variant/40">
                  <span className="text-on-surface-variant">Taxpayer Identity Format</span>
                  <span className="font-mono font-bold">National ID / KRA PIN</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-outline-variant/40">
                  <span className="text-on-surface-variant">Arithmetic Security Challenge</span>
                  <span className="font-mono text-primary font-bold">Automated SVG HMAC</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-outline-variant/40">
                  <span className="text-on-surface-variant">M-Pesa STK Guarantee</span>
                  <span className="font-mono font-bold text-primary">KES 20</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-on-surface-variant">Upstream Handshake</span>
                  <span className="font-mono text-xs">Direct encrypted TLS</span>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  href="/retrieval-portal"
                  className="w-full py-2.5 px-4 rounded-xl bg-surface-container-lowest border border-outline-variant text-xs font-bold text-on-surface flex items-center justify-between hover:border-primary/50 transition-colors"
                >
                  <span>Retrieve KRA PIN Certificate</span>
                  <ArrowRight className="h-3.5 w-3.5 text-primary" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ============================= FEATURED PRODUCTION SYSTEMS ============================= */}
        <section id="featured-projects" className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-black text-primary uppercase tracking-widest">
                Engineering Case Studies
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight">
                Featured Production Systems
              </h2>
              <p className="text-sm text-on-surface-variant max-w-xl">
                Real-world platforms architected for high concurrency, zero-data-loss compliance, and seamless payment flows across Kenya.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="h-10 px-5 rounded-xl font-bold text-xs gap-2 shrink-0">
              <Link href="/projects">
                Explore All Projects <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.length > 0 ? (
              projects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-7 rounded-3xl bg-surface-container-lowest border border-outline-variant hover:border-primary/40 transition-all duration-300 shadow-soft hover:shadow-xl flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                        {proj.category}
                      </span>
                      {cleanPublicLiveUrl(proj.slug, proj.liveUrl) && (
                        <a
                          href={cleanPublicLiveUrl(proj.slug, proj.liveUrl)!}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline p-1"
                          aria-label={`Open live system for ${proj.title}`}
                          title={`Open live system for ${proj.title}`}
                        >
                          <span>Live System</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-on-surface group-hover:text-primary transition-colors tracking-tight">
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
                          className="text-[10px] font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md border border-outline-variant/60"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-outline-variant/60 flex items-center justify-between">
                    <Link
                      href={`/projects/${proj.slug}`}
                      className="text-xs font-bold text-primary group-hover:underline flex items-center gap-1.5"
                    >
                      Read Case Study <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant text-center text-xs text-on-surface-variant">
                No featured case studies published yet — check back soon.
              </div>
            )}
          </div>
        </section>

        {/* ============================= INTERACTIVE ARCHITECTURE ESTIMATOR BANNER ============================= */}
        <section className="p-8 sm:p-10 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <Calculator className="h-3.5 w-3.5" />
              Interactive Scope &amp; Budget Estimator
            </div>
            <h3 className="text-2xl font-black text-on-surface tracking-tight">
              Planning a digital platform, mobile app, or GovTech gateway?
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Use our interactive scope calculator to select frontend stacks, cloud databases, security parameters, and payment rails to receive an instant timeline and cost breakdown.
            </p>
          </div>
          <Button asChild size="lg" className="rounded-xl px-6 bg-primary text-white font-bold text-xs hover:bg-primary/90 shadow-sm shrink-0 flex items-center gap-2">
            <Link href="/estimator">
              <span>Calculate Project Scope</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </section>

        {/* ============================= REVIEWS & SOCIAL PROOF ENGINE ============================= */}
        <ReviewSection />

        {/* ============================= TECHNICAL NOTES / ARTICLES ============================= */}
        {articles.length > 0 && (
          <section id="articles-teaser" className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2">
                <span className="text-xs font-black text-primary uppercase tracking-widest">
                  Engineering Writing
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight">
                  Field Notes &amp; Production Insights
                </h2>
                <p className="text-sm text-on-surface-variant max-w-xl">
                  Pragmatic architectural insights, payment engineering patterns, and lessons learned from live Kenyan systems.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="h-10 px-5 rounded-xl font-bold text-xs gap-2 shrink-0">
                <Link href="/articles">
                  All Articles <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {articles.map((art) => (
                <div
                  key={art.id}
                  className="p-7 rounded-3xl bg-surface-container-lowest border border-outline-variant hover:border-primary/40 transition-all shadow-soft group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                      <span className="font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                        {art.category}
                      </span>
                      <span className="font-mono">
                        {art.readingTimeMinutes} min read
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-on-surface group-hover:text-primary transition-colors tracking-tight">
                      <Link href={`/articles/${art.slug}`}>
                        {art.title}
                      </Link>
                    </h3>

                    <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                      {art.excerpt}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-outline-variant/60">
                    <Link
                      href={`/articles/${art.slug}`}
                      className="text-xs font-bold text-primary flex items-center gap-1.5 hover:underline"
                    >
                      Read Technical Article <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================= METHODOLOGY ============================= */}
        <section className="space-y-8 text-center max-w-3xl mx-auto">
          <div className="space-y-3">
            <span className="text-xs font-black text-primary uppercase tracking-widest">
              How We Work
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-on-surface">
              Disciplined Engineering Methodology
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Every project runs through our proven 4-phase lifecycle — no shortcuts, zero data leaks, predictable delivery.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-0 items-center justify-center">
            {[
              { step: '01', label: 'Architect', desc: 'Topology & Tokens' },
              { step: '02', label: 'Build', desc: 'Vertical Slices' },
              { step: '03', label: 'Audit', desc: 'Security & QA' },
              { step: '04', label: 'Deploy', desc: 'Edge CDN & Telemetry' },
            ].map((phase, i) => (
              <div key={phase.step} className="flex items-center">
                <div className="px-5 py-3 rounded-2xl bg-surface-container-lowest border border-outline-variant text-center min-w-[120px]">
                  <span className="text-xs font-mono font-black text-primary">{phase.step}</span>
                  <p className="font-bold text-sm text-on-surface">{phase.label}</p>
                  <p className="text-[10px] text-on-surface-variant">{phase.desc}</p>
                </div>
                {i < 3 && <div className="hidden sm:block w-6 h-0.5 bg-outline-variant" />}
              </div>
            ))}
          </div>
          <Button asChild variant="outline" size="sm" className="h-10 px-6 rounded-xl font-bold text-xs gap-2">
            <Link href="/about">
              Learn Our Methodology <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </section>

        {/* ============================= FINAL CTA BAND ============================= */}
        <section className="relative overflow-hidden p-10 sm:p-14 rounded-3xl bg-primary text-white space-y-6 text-center shadow-xl">
          <div className="relative z-10 space-y-4">
            <h2 className="text-3xl sm:text-5xl font-black leading-tight tracking-tight">
              Ready to Build Your Next Digital System?
            </h2>
            <p className="text-white/90 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Akubrecah Technologies provides end-to-end engineering, automated GovTech gateways, and creative brand design.
              Let&apos;s build software that scales.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
              <Button
                asChild
                size="lg"
                className="h-12 px-8 rounded-xl bg-white text-primary font-bold text-sm hover:bg-white/90 shadow-md shadow-black/10 flex items-center gap-2 group cursor-pointer"
              >
                <Link href="/contact">
                  Start a Project <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="h-12 px-8 rounded-xl border border-white/40 bg-transparent text-white font-bold text-sm hover:bg-white/15 hover:text-white backdrop-blur-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Link href="/projects">
                  View Case Studies
                </Link>
              </Button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
