import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Lock,
  Scale,
  Shield,
  ShieldCheck,
  Smartphone,
  Terminal,
  Wallet,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getPublishedProjects, getPublishedArticles } from '@/lib/cms';
import { ReviewSection } from '@/components/reviews/review-section';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Akubrecah — Sovereign GovTech & Engineering Studio | Nairobi, Kenya',
  description:
    'Akubrecah builds high-availability platforms, regulatory compliance portals, and mission-critical fintech infrastructure across East Africa.',
  keywords: [
    'Akubrecah Entertainment',
    'Akubrecah Technologies',
    'Software Engineering Kenya',
    'GovTech Automation East Africa',
    'KRA Compliance Portal',
    'KRA PIN Certificate Retrieval',
    'Statutory Compliance Data Grid',
    'Nil Returns Filing Automation',
    'Enterprise Mobile Applications Nairobi',
    'Fintech Daraja M-Pesa API Architecture',
    'Brand Identity Design Kenya',
  ],
  alternates: {
    canonical: 'https://akubrecah.com',
  },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://akubrecah.com',
    siteName: 'Akubrecah',
    title: 'Akubrecah — Sovereign GovTech & Engineering Studio',
    description:
      'Engineering resilient digital systems from Nairobi. GovTech compliance portals, Safaricom Daraja M-Pesa pipelines, high-availability web platforms, and mobile ecosystems.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Akubrecah - Engineering Excellence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Akubrecah — Sovereign GovTech & Engineering Studio',
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

  const capabilities = [
    {
      title: 'GovTech & Compliance',
      badge: 'Flagship',
      desc: 'Dedicated state portals, automated KRA verification connectors, and legal architectures fully aligned with Kenya Data Protection Act 2019.',
      href: '/solutions#govtech',
      ctaText: 'Explore Portal Framework',
      icon: ShieldCheck,
    },
    {
      title: 'Web Engineering',
      desc: 'Full-stack robust architectures with Next.js, resilient microservices, and distributed systems architected for sub-second responses at scale.',
      href: '/services#web',
      ctaText: 'View Architecture Specs',
      icon: Terminal,
    },
    {
      title: 'Mobile Ecosystems',
      desc: 'Cross-platform native iOS & Android applications engineered with offline-first synchronization and minimal cellular payload footprint.',
      href: '/services#mobile',
      ctaText: 'Mobile Case Studies',
      icon: Smartphone,
    },
    {
      title: 'Daraja M-Pesa & Brand',
      desc: 'Enterprise Safaricom Daraja API pipelines, instant STK-push workflows, automated B2B/B2C settlements, and institutional brand kits.',
      href: '/services',
      ctaText: 'Daraja Integration Guides',
      icon: Wallet,
    },
  ];

  const featuredSystems = [
    {
      title: 'Akubrecah KRA Portal',
      tags: ['GovTech', 'M-Pesa Daraja', 'Next.js', 'AWS'],
      summary:
        'Automated sovereign compliance & tax document retrieval gateway handling thousands of automated validation requests daily with zero latency drops.',
      actionText: 'Live Production Portal',
      href: '/retrieval-portal',
      image: '/blog/kra-pin-retrieval-portal.png',
    },
    {
      title: 'Nairobi Basi Rapid Transit & Logistics',
      tags: ['IoT', 'Real-time APIs', 'Flutter', 'Postgres'],
      summary:
        'Real-time fleet telemetry & automated contactless fare collection architecture built for rapid transit commuter fleets in metropolitan Nairobi.',
      actionText: 'Telemetry Architecture',
      href: '/projects/swiftboda-ride',
      image: '/blog/tax-image-2.jpg',
    },
    {
      title: 'Sovereign Escrow & Settlement Engine',
      tags: ['Fintech', '256-Bit SSL', 'ISO 20022', 'Node'],
      summary:
        'Bank-grade multi-currency escrow handling cross-border commercial transactions with verifiable automated cryptographic release locks.',
      actionText: 'Security Whitepaper',
      href: '/projects',
      image: '/blog/tax-image-3.jpg',
    },
  ];

  return (
    <div className="relative w-full bg-background text-on-surface font-sans overflow-x-hidden">
      {/* ============================= SECTION 1: HERO SPLIT LAYOUT ============================= */}
      <section className="py-12 md:py-20 border-b border-outline-variant/60 relative overflow-hidden bg-surface-bright">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column */}
            <div className="lg:col-span-7 flex flex-col items-start space-y-6">
              {/* Eyebrow Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-outline-variant/70 bg-surface-container-low">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Software Engineering · GovTech · Brand
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[46px] lg:leading-[54px] font-black tracking-tight text-on-surface">
                Engineering resilient digital systems from{' '}
                <span className="text-primary">Nairobi</span>
              </h1>

              {/* Subtext */}
              <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl leading-relaxed">
                Akubrecah builds high-availability platforms, regulatory compliance portals, and mission-critical fintech infrastructure across East Africa.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-6 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 shadow-md shadow-primary/20 flex items-center gap-2 group transition-all"
                >
                  <Link href="/retrieval-portal">
                    <span>Retrieve KRA Certificate</span>
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
                    <span>View Projects</span>
                  </Link>
                </Button>
              </div>

              {/* Trust Micro-stats Strip */}
              <div className="pt-6 border-t border-outline-variant/60 w-full flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-on-surface-variant">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-on-surface">99.98% Uptime</span>
                </div>
                <span className="text-outline-variant">•</span>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <span>256-bit GovTech Security</span>
                </div>
                <span className="text-outline-variant">•</span>
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  <span>Central Bank &amp; KRA Compliant</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Product Preview Card */}
            <div className="lg:col-span-5" id="retrieval">
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm p-6 relative space-y-4">
                {/* Card Header Bar */}
                <div className="flex items-center justify-between pb-3.5 border-b border-outline-variant/60">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <span className="text-sm font-bold text-on-surface">KRA Compliance Verification</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    System Operational
                  </span>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1.5">
                      National ID or Registered KRA PIN
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value="A012938491Z"
                        className="w-full h-11 px-3.5 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface font-mono text-sm focus:outline-none"
                      />
                      <div className="absolute right-3 top-3 text-primary flex items-center">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  {/* Arithmetic Security Challenge Box */}
                  <div className="p-3.5 rounded-xl bg-surface-container-low border border-dashed border-outline-variant space-y-2">
                    <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
                      <span className="text-[10px] uppercase font-bold tracking-wider">Arithmetic Verification Challenge</span>
                      <Calculator className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1.5 bg-surface-container-lowest rounded-lg border border-outline-variant font-mono text-sm font-bold text-on-surface tracking-wider">
                        4 + 7 =
                      </div>
                      <input
                        type="text"
                        readOnly
                        value="11"
                        className="w-16 h-9 text-center bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface font-bold text-sm focus:outline-none"
                      />
                      <span className="text-xs font-semibold text-primary">Verified</span>
                    </div>
                  </div>

                  {/* M-Pesa STK Guarantee Tag */}
                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-on-surface font-medium">M-Pesa STK instant retrieval guarantee</span>
                    </div>
                    <span className="font-mono font-bold text-primary">KES 20</span>
                  </div>

                  {/* Action Button */}
                  <Button
                    asChild
                    size="lg"
                    className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Link href="/retrieval-portal">
                      <span>Initiate Tax Record Handshake</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                {/* Metadata Cryptographic Seal */}
                <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between text-[10px] text-on-surface-variant font-medium">
                  <span className="uppercase tracking-wider">Sovereign 256-Bit API Handshake</span>
                  <span className="font-mono">KEN-KRA-PUB-8022</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================= SECTION 2: CAPABILITY GRID ============================= */}
      <section className="py-16 md:py-20 bg-surface-container-lowest border-b border-outline-variant/60" id="capabilities">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="max-w-2xl mb-12 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-outline-variant/60 bg-surface-container-low">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Technical Practice
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight">
              Core Capabilities
            </h2>
            <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
              End-to-end technical execution tailored for sovereign compliance, high-volume transactions, and enterprise trust.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="p-6 rounded-2xl border border-outline-variant bg-surface-container-low flex flex-col justify-between relative group hover:border-primary/50 transition-all duration-200"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-lowest border border-outline-variant flex items-center justify-center text-primary shadow-xs">
                        <Icon className="h-5 w-5" />
                      </div>
                      {cap.badge && (
                        <span className="px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider">
                          {cap.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-on-surface mb-2">{cap.title}</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
                      {cap.desc}
                    </p>
                  </div>
                  <Link
                    href={cap.href}
                    className="pt-4 border-t border-outline-variant/60 text-xs font-semibold text-primary flex items-center gap-1 group-hover:underline"
                  >
                    <span>{cap.ctaText}</span>
                    <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================= SECTION 3: FEATURED PRODUCTION SYSTEMS ============================= */}
      <section className="py-16 md:py-20 bg-surface-bright border-b border-outline-variant/60" id="projects">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-outline-variant/60 bg-surface-container-low">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Portfolio &amp; Production Work
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight">
                Featured Systems in Production
              </h2>
              <p className="text-sm text-on-surface-variant">
                Verified institutional deployments across Kenya
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="h-10 px-5 rounded-xl font-bold text-xs gap-2 shrink-0">
              <Link href="/projects">
                Explore All Projects <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {featuredSystems.map((item) => (
              <div
                key={item.title}
                className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-xs flex flex-col group hover:border-primary/40 transition-all duration-200"
              >
                <div className="h-48 bg-surface-container-low border-b border-outline-variant relative overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                </div>
                <div className="p-6 flex flex-col flex-grow justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-surface-container-low text-on-surface-variant text-[10px] font-mono font-semibold uppercase border border-outline-variant/60"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-xl font-bold text-on-surface group-hover:text-primary transition-colors tracking-tight">
                      {item.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {item.summary}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-outline-variant/60 flex items-center justify-between">
                    <Link
                      href={item.href}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5"
                    >
                      <span>{item.actionText}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================= SECTION 4: LATEST ARTICLES & GUIDES ============================= */}
      <section className="py-16 md:py-20 bg-surface-container-lowest border-b border-outline-variant/60" id="articles">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-outline-variant/60 bg-surface-container-low">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Engineering Editorial
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight">
                Latest Articles &amp; Guides
              </h2>
            </div>
            <Link
              href="/articles"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              <span>Browse All Technical Writing</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Article 1 */}
            <article className="p-7 sm:p-8 rounded-2xl border border-outline-variant bg-surface-bright flex flex-col justify-between hover:border-primary/40 transition-colors space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider">
                    GovTech Guide
                  </span>
                  <span className="text-xs text-on-surface-variant">6 min read</span>
                  <span className="text-outline-variant">•</span>
                  <span className="text-xs text-on-surface-variant">Updated 2026</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
                  Comprehensive Guide: Fast KRA PIN &amp; Tax Compliance Certificate Retrieval in Kenya (2026)
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  A thorough breakdown of the technical protocols, official KRA API handshake processes, and instant M-Pesa automated retrieval workflows for individuals and enterprise corporate treasurers.
                </p>
              </div>
              <div className="pt-4 border-t border-outline-variant/60">
                <Link
                  href="/articles/kra-pin-retrieval-online-using-id-number-itax-login-guide"
                  className="inline-flex items-center gap-2 text-xs font-bold text-primary group hover:underline"
                >
                  <span>Read Full Regulatory Guide</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </article>

            {/* Article 2 */}
            <article className="p-7 sm:p-8 rounded-2xl border border-outline-variant bg-surface-bright flex flex-col justify-between hover:border-primary/40 transition-colors space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface text-[10px] font-bold uppercase tracking-wider border border-outline-variant">
                    Engineering Insights
                  </span>
                  <span className="text-xs text-on-surface-variant">9 min read</span>
                  <span className="text-outline-variant">•</span>
                  <span className="text-xs text-on-surface-variant">Architecture Review</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
                  Scaling Safaricom Daraja M-Pesa Webhooks Under High Concurrency
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  Architectural strategies for idempotency, retry backoffs, and dead-letter queue isolation when processing tens of thousands of automated STK callbacks simultaneously without packet loss.
                </p>
              </div>
              <div className="pt-4 border-t border-outline-variant/60">
                <Link
                  href="/articles"
                  className="inline-flex items-center gap-2 text-xs font-bold text-on-surface group hover:text-primary transition-colors"
                >
                  <span>Read Architectural Review</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ============================= SECTION 5: GOOGLE REVIEWS STRIP ============================= */}
      <ReviewSection />

      {/* ============================= SECTION 6: METHODOLOGY / 4-PHASE LIFECYCLE ============================= */}
      <section className="py-16 md:py-20 bg-surface-bright border-b border-outline-variant/60">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 text-center space-y-8">
          <div className="space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">
              Delivery Standards
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-on-surface">
              Disciplined Engineering Methodology
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Every system runs through our proven 4-phase lifecycle — no shortcuts, zero data leaks, predictable delivery.
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
                <div className="px-5 py-3 rounded-2xl bg-surface-container-lowest border border-outline-variant text-center min-w-[130px]">
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
        </div>
      </section>

      {/* ============================= SECTION 7: OBSIDIAN CONSULTATION CTA BAND ============================= */}
      <section className="py-20 bg-[#111315] text-white relative overflow-hidden border-t border-stone-800" id="contact">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 relative z-10">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-stone-700 bg-stone-900/80">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold text-white/90 tracking-wider uppercase">
                Direct Engineering Consultation
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[40px] lg:leading-[48px] font-bold text-white tracking-tight">
              Ready to build mission-critical software or verify sovereign records?
            </h2>
            <p className="text-base sm:text-lg text-stone-300 leading-relaxed max-w-2xl">
              Partner with Nairobi’s dedicated GovTech and software engineering studio. We architect resilient systems engineered for zero tolerance of failure.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                asChild
                size="lg"
                className="h-12 px-6 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 flex items-center gap-2 shadow-md shadow-primary/20 transition-all"
              >
                <Link href="/contact">
                  <span>Start a project</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-6 rounded-xl border-stone-700 bg-transparent text-white font-bold text-sm hover:bg-white/10 transition-all"
              >
                <Link href="/services">
                  <span>Explore All Services</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
