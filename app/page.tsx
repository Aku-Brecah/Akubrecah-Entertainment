import { 
  ArrowRight, 
  Laptop, 
  Smartphone, 
  Cloud, 
  Layers, 
  Code2, 
  Zap, 
  Globe, 
  FolderGit2, 
  ExternalLink, 
  BookOpen, 
  Clock,
  ShieldCheck,
  Sparkles,
  Star,
  FileCheck2,
  Printer,
  Cpu,
  MessageSquare,
  CheckCircle2
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getPublishedProjects, getPublishedArticles } from '@/lib/cms'
import { ProjectEstimator } from '@/components/interactive/project-estimator'
import { ReviewSection } from '@/components/reviews/review-section'
import { filterPublicTechnologies, cleanPublicLiveUrl } from '@/lib/tech-filter'

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Akubrecah Entertainment | Software Engineering, GovTech & Brand Production',
  description:
    'Full-cycle digital innovation house in Nairobi, Kenya. Mission-critical KRA statutory compliance portals, fiscal thermal ETR receipts, bespoke web platforms, native mobile ecosystems, and creative brand identity.',
  keywords: [
    'Akubrecah Entertainment',
    'Software Engineering Kenya',
    'GovTech Automation East Africa',
    'KRA Compliance Portal',
    'KRA PIN Certificate Retrieval',
    'Thermal ETR Receipt Printer Kenya',
    'Nil Returns Filing Automation',
    'Enterprise Mobile Applications Nairobi',
    'Fintech Daraja M-Pesa API Architecture',
    'Brand Identity Design Kenya'
  ],
  alternates: {
    canonical: 'https://akubrecah.com',
  },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://akubrecah.com',
    siteName: 'Akubrecah Entertainment',
    title: 'Akubrecah Entertainment | Software Engineering, GovTech & Brand Production',
    description:
      'Architecting resilient software systems, cloud automation, and statutory tax compliance portals. High-impact engineering made in Nairobi, Kenya.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Akubrecah Entertainment - Engineering Excellence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Akubrecah Entertainment | Software Engineering & GovTech',
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
      icon: ShieldCheck, 
      label: "GovTech Portals", 
      desc: "KRA PIN Retrieval, ETR Receipts & Nil Returns", 
      href: "/retrieval-portal",
      badge: "Instant KES 20"
    },
    { 
      icon: Laptop, 
      label: "Web Engineering", 
      desc: "Next.js 16, High-Scale SSR & Microservices", 
      href: "/services#web" 
    },
    { 
      icon: Smartphone, 
      label: "Mobile Ecosystems", 
      desc: "iOS, Android & React Native Biometrics", 
      href: "/services#mobile" 
    },
    { 
      icon: Printer, 
      label: "Brand & Thermal Print", 
      desc: "80mm POS Layouts, Fiscal Thermal Receipts & Identity", 
      href: "/services",
    },
  ]

  return (
    <div className="relative w-full bg-background text-on-background font-sans overflow-x-hidden">
      
      {/* Background glow & Monolithic Circuit Traces — deep red & cyan, strictly NO purple */}
      <div className="absolute top-0 inset-x-0 h-[750px] bg-[radial-gradient(ellipse_at_25%_0%,rgba(186,26,26,0.14)_0%,transparent_70%)] pointer-events-none z-0" />
      <div className="absolute top-24 right-[5%] w-[450px] h-[450px] bg-primary/5 rounded-full filter blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-80 left-[10%] w-[320px] h-[320px] bg-[#00C2FF]/4 rounded-full filter blur-[130px] pointer-events-none z-0" />

      {/* SVG Monolithic Circuit Wirelines */}
      <div className="absolute top-0 inset-x-0 h-[600px] pointer-events-none opacity-20 dark:opacity-30 z-0 overflow-hidden">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="circuit-line" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#BA1A1A" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#00C2FF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#BA1A1A" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <path d="M-100,50 L200,50 L300,150 L800,150 L950,300 L1600,300" fill="none" stroke="url(#circuit-line)" strokeWidth="1.5" strokeDasharray="6,6" />
          <path d="M100,300 L400,300 L550,450 L1200,450" fill="none" stroke="url(#circuit-line)" strokeWidth="1" />
          <circle cx="300" cy="150" r="3" fill="#00C2FF" />
          <circle cx="950" cy="300" r="3.5" fill="#BA1A1A" />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col space-y-24 pb-24 pt-8 md:pt-14">

        {/* ============================= MONOLITHIC HERO ============================= */}
        <section id="hero" className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          
          {/* Left: Text & Magnetic CTAs */}
          <div className="flex-1 space-y-7">
            
            {/* Live Telemetry Pill */}
            <div className="inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-high border border-outline-variant text-xs font-semibold shadow-xs">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-black text-red-700 dark:text-red-400">Akubrecah Entertainment</span>
              <span className="text-outline-muted">·</span>
              <span className="text-on-surface-variant font-mono text-[11px]">Design · Print · Brand · Tech</span>
              <span className="text-outline-muted hidden sm:inline">·</span>
              <span className="text-emerald-700 dark:text-emerald-400 text-[11px] font-mono font-bold hidden sm:inline">
                Gateway: 99.8% Online
              </span>
            </div>

            {/* Asymmetric Monolithic Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-on-surface tracking-tight leading-[1.05]">
              Engineering<br />
              <span className="text-primary bg-gradient-to-br from-primary via-red-600 to-red-800 bg-clip-text text-transparent">
                Digital Products
              </span><br />
              That Scale.
            </h1>

            <p className="text-base sm:text-lg text-on-surface-variant max-w-xl leading-relaxed">
              Full-cycle software engineering, mission-critical statutory compliance portals, and creative brand production. 
              From automated KRA PIN retrieval and fiscal thermal ETR receipts to enterprise cloud platforms and native mobile apps.
            </p>

            {/* Magnetic CTA Action Center */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="h-13 px-7 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/25 flex items-center gap-2 group transition-all">
                <Link href="/retrieval-portal">
                  <FileCheck2 className="h-4 w-4" />
                  <span>Retrieve KRA PIN (KES 20)</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="h-13 px-6 rounded-xl border-outline-variant font-bold text-sm hover:bg-surface-container flex items-center gap-2 transition-all">
                <a href="#project-estimator">
                  <Cpu className="h-4 w-4 text-primary" />
                  <span>Interactive Estimator</span>
                </a>
              </Button>

              <Button asChild variant="ghost" size="lg" className="h-13 px-5 rounded-xl text-on-surface-variant hover:text-primary font-bold text-sm flex items-center gap-2">
                <Link href="/projects">
                  <FolderGit2 className="h-4 w-4 text-primary" />
                  <span>View Projects</span>
                </Link>
              </Button>
            </div>

            {/* Live Trust Metrics Strip */}
            <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-on-surface-variant border-t border-outline-variant/60">
              <div className="flex items-center gap-1.5 font-bold text-on-surface">
                <span className="text-amber-500 flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </span>
                <span className="font-mono">4.9/5.0</span>
                <span className="opacity-70 font-normal">(1,280+ Reviews)</span>
              </div>
              <div className="flex items-center gap-1 font-mono font-bold text-on-surface">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>52,480+ Certificates Retrieved</span>
              </div>
            </div>
          </div>

          {/* Right: Monolithic Capability Grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
            {capabilities.map((cap) => {
              const Icon = cap.icon
              return (
                <Link
                  key={cap.label}
                  href={cap.href}
                  className="group p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant hover:border-primary/50 hover:shadow-lg transition-all duration-300 space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    {cap.badge && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {cap.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors flex items-center justify-between">
                      <span>{cap.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{cap.desc}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* ============================= INTERACTIVE ARCHITECTURE ESTIMATOR ============================= */}
        <ProjectEstimator />

        {/* ============================= FEATURED PRODUCTION SYSTEMS ============================= */}
        <section id="featured-projects" className="space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-widest">
                <FolderGit2 className="h-3.5 w-3.5" />
                Engineering Case Studies
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight">
                Featured Production Systems
              </h2>
              <p className="text-sm text-on-surface-variant max-w-xl">
                Real-world platforms architected for high concurrency, zero-data-loss compliance, and seamless payment flows.
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
                      <span className="text-[11px] font-black uppercase tracking-wider text-red-700 dark:text-red-400 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
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
                        <span key={tech} className="text-[10px] font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md border border-outline-variant/60">
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
                Loading production portfolio...
              </div>
            )}
          </div>
        </section>

        {/* ============================= REVIEWS & SOCIAL PROOF ENGINE ============================= */}
        <ReviewSection />

        {/* ============================= TECHNICAL NOTES ============================= */}
        {articles.length > 0 && (
          <section id="articles-teaser" className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-widest">
                  <BookOpen className="h-3.5 w-3.5" />
                  Engineering Writing
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight">
                  Field Notes & Production Insights
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
                      <span className="font-bold text-red-700 dark:text-red-400 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                        {art.category}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {art.readingTimeMinutes} min
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
            <span className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-widest">How We Work</span>
            <h2 className="text-3xl sm:text-4xl font-black text-on-surface">
              Disciplined Engineering Methodology
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Every project runs through our proven 4-phase lifecycle — no shortcuts, zero data leaks, predictable delivery.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-0 items-center justify-center">
            {[
              { step: "01", label: "Architect", desc: "Topology & Tokens" },
              { step: "02", label: "Build", desc: "Vertical Slices" },
              { step: "03", label: "Audit", desc: "Security & QA" },
              { step: "04", label: "Deploy", desc: "Edge CDN & Telemetry" },
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
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12)_0%,transparent_60%)] pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <h2 className="text-3xl sm:text-5xl font-black leading-tight tracking-tight">
              Ready to Build Your Next Digital System?
            </h2>
            <p className="text-white/90 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Akubrecah Entertainment provides end-to-end engineering, automated GovTech gateways, and creative brand design. 
              Let&apos;s build software that scales.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
              <Button asChild size="lg" className="h-12 px-8 rounded-xl bg-white text-primary font-bold text-sm hover:bg-white/90 shadow-md shadow-black/10 flex items-center gap-2 group cursor-pointer">
                <Link href="/contact">
                  Start a Project <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild size="lg" className="h-12 px-8 rounded-xl border border-white/40 bg-transparent text-white font-bold text-sm hover:bg-white/15 hover:text-white backdrop-blur-sm transition-colors flex items-center gap-2 cursor-pointer">
                <Link href="/retrieval-portal">
                  Instant KRA PIN Portal
                </Link>
              </Button>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
