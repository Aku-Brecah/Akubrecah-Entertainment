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
  Clock 
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getPublishedProjects, getPublishedArticles } from '@/lib/cms'

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Akubrecah Technologies | Premier Software Engineering & GovTech Solutions',
  description:
    'Bespoke full-stack web platforms, native iOS & Android ecosystems, cloud DevOps, and enterprise GovTech automation systems in Nairobi, Kenya. Home of the Akubrecah KRA Compliance & Statutory Document Suite.',
  keywords: [
    'Software Engineering Kenya',
    'Next.js Development Company Nairobi',
    'GovTech Automation East Africa',
    'KRA Compliance Portal',
    'KRA PIN Certificate Retrieval',
    'Tax Compliance Certificate Kenya',
    'Nil Returns Filing Automation',
    'Enterprise Mobile Applications Kenya',
    'Fintech Daraja M-Pesa API Architecture',
  ],
  alternates: {
    canonical: 'https://akubrecah.com',
  },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://akubrecah.com',
    siteName: 'Akubrecah Technologies',
    title: 'Akubrecah Technologies | Premier Software Engineering & GovTech Solutions',
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
      'Premier software engineering company in Nairobi, Kenya. Full-stack web, mobile, cloud infrastructure, and automated statutory gateways.',
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
    { icon: Laptop, label: "Web Engineering", desc: "Next.js, React, TypeScript", href: "/services" },
    { icon: Smartphone, label: "Mobile Apps", desc: "iOS, Android, React Native", href: "/services" },
    { icon: Cloud, label: "Cloud & DevOps", desc: "AWS, GCP, Kubernetes", href: "/services" },
    { icon: Layers, label: "Enterprise Systems", desc: "APIs, ERPs, Automation", href: "/services" },
  ]

  return (
    <div className="relative w-full bg-background text-on-background font-sans overflow-x-hidden">
      
      {/* Background glow — deep red, no purple */}
      <div className="absolute top-0 inset-x-0 h-[700px] bg-[radial-gradient(ellipse_at_20%_0%,rgba(186,26,26,0.10)_0%,transparent_70%)] pointer-events-none z-0" />
      <div className="absolute top-20 right-[8%] w-96 h-96 bg-primary/4 rounded-full filter blur-[130px] pointer-events-none z-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col space-y-24 pb-24 pt-8 md:pt-14">

        {/* ============================= HERO ============================= */}
        <section id="hero" className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          
          {/* Left: Text */}
          <div className="flex-1 space-y-7">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-high border border-outline-variant text-xs font-semibold shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-primary" />
              <span className="font-black text-red-700 dark:text-red-400">Akubrecah Technologies</span>
              <span className="text-outline-muted">·</span>
              <span className="text-on-surface-variant">Nairobi, Kenya</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-on-surface tracking-tight leading-[1.06]">
              Engineering<br />
              <span className="text-primary bg-gradient-to-br from-primary to-red-800 bg-clip-text text-transparent">
                Digital Products
              </span><br />
              That Scale.
            </h1>

            <p className="text-base sm:text-lg text-on-surface-variant max-w-lg leading-relaxed">
              Full-cycle software engineering — from concept to production. Web platforms, 
              native mobile apps, cloud infrastructure, and mission-critical automated systems 
              engineered for East Africa and beyond.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button asChild size="lg" className="h-13 px-7 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/92 shadow-lg shadow-primary/20 flex items-center gap-2 group">
                <Link href="/contact">
                  <span>Start a Project</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-13 px-7 rounded-xl border-outline-variant font-bold text-sm hover:bg-surface-container flex items-center gap-2">
                <Link href="/services">
                  <Code2 className="h-4 w-4 text-primary" />
                  <span>View Services</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Right: Capability Grid with CSS Entrance */}
          <div className="flex-1 grid grid-cols-2 gap-4 w-full max-w-md animate-in fade-in slide-in-from-right-6 duration-700 ease-out">
            {capabilities.map((cap, i) => {
              const Icon = cap.icon
              return (
                <Link
                  key={cap.label}
                  href={cap.href}
                  className="group p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant hover:border-primary/50 hover:shadow-md transition-all duration-300 space-y-3"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary w-fit group-hover:bg-primary group-hover:text-white transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{cap.label}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{cap.desc}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* ============================= FEATURED PROJECTS & CASE STUDIES ============================= */}
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
                      {proj.liveUrl && (
                        <a
                          href={proj.liveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-on-surface-variant hover:text-primary transition-colors p-1"
                          aria-label={`Open live system for ${proj.title}`}
                          title={`Open live system for ${proj.title}`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                          <span className="sr-only">Open live system for {proj.title}</span>
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
                      {((proj as any).technologies || (proj as any).techStack || []).slice(0, 4).map((tech: string) => (
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

        {/* ============================= LATEST TECHNICAL NOTES ============================= */}
        {articles.length > 0 && (
          <section id="articles-teaser" className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-widest">
                  <BookOpen className="h-3.5 w-3.5" />
                  Engineering Writing
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight">
                  Field Notes & Tutorials
                </h2>
                <p className="text-sm text-on-surface-variant max-w-xl">
                  Pragmatic architectural insights, payment engineering patterns, and lessons learned from production.
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

        {/* ============================= SERVICES TEASER ============================= */}
        <section className="p-10 sm:p-14 rounded-3xl bg-on-surface text-background dark:bg-surface-container-lowest dark:text-on-surface space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-red-300 dark:text-red-300">Engineering Capabilities</span>
              <h2 className="text-3xl sm:text-4xl font-black leading-tight">
                Built for Complexity.<br />Delivered with Precision.
              </h2>
              <p className="text-sm opacity-70 max-w-md leading-relaxed">
                From fintech payment gateways to government portals, from consumer mobile apps to enterprise ERPs — 
                we architect systems that handle real-world scale.
              </p>
            </div>
            <Button asChild size="lg" className="h-13 px-7 rounded-xl bg-primary text-white font-bold text-sm flex items-center gap-2 group shrink-0">
              <Link href="/services">
                <span>Explore All Services</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Globe, title: "Web Platforms", sub: "Next.js · React · TypeScript" },
              { icon: Smartphone, title: "Mobile Apps", sub: "iOS · Android · RN" },
              { icon: Cloud, title: "Cloud & DevOps", sub: "AWS · K8s · CI/CD" },
              { icon: Zap, title: "GovTech APIs", sub: "M-Pesa · KRA · Custom" },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="p-4 rounded-2xl bg-white/5 dark:bg-surface-container border border-white/10 dark:border-outline-variant space-y-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="font-bold text-sm">{item.title}</p>
                  <p className="text-xs opacity-60">{item.sub}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ============================= PROCESS TEASER ============================= */}
        <section className="space-y-8 text-center max-w-3xl mx-auto">
          <div className="space-y-3">
            <span className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-widest">How We Work</span>
            <h2 className="text-3xl sm:text-4xl font-black text-on-surface">
              Disciplined Engineering Methodology
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Every project runs through our proven 4-phase lifecycle — no shortcuts, no surprises.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-0 items-center justify-center">
            {[
              { step: "01", label: "Architect" },
              { step: "02", label: "Build" },
              { step: "03", label: "Audit" },
              { step: "04", label: "Deploy" },
            ].map((phase, i) => (
              <div key={phase.step} className="flex items-center">
                <div className="px-5 py-3 rounded-2xl bg-surface-container-lowest border border-outline-variant text-center min-w-[110px]">
                  <span className="text-xs font-mono font-black text-primary">{phase.step}</span>
                  <p className="font-bold text-sm text-on-surface">{phase.label}</p>
                </div>
                {i < 3 && <div className="hidden sm:block w-8 h-0.5 bg-outline-variant" />}
              </div>
            ))}
          </div>
          <Button asChild variant="outline" size="sm" className="h-10 px-6 rounded-xl font-bold text-xs gap-2">
            <Link href="/about">
              Learn Our Methodology <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </section>

        {/* ============================= CTA BAND ============================= */}
        <section className="relative overflow-hidden p-10 sm:p-14 rounded-3xl bg-primary text-white space-y-6 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08)_0%,transparent_60%)] pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-black leading-tight">
              Ready to Build Your Next Digital System?
            </h2>
            <p className="text-white/85 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Our engineering team is ready to scope, architect, and deliver your product — 
              from MVP to enterprise scale.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
              <Button asChild size="lg" className="h-12 px-8 rounded-xl bg-white text-primary font-bold text-sm hover:bg-white/90 shadow-md shadow-black/10 flex items-center gap-2 group">
                <Link href="/contact">
                  Start a Project <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild size="lg" className="h-12 px-8 rounded-xl border border-white/40 bg-transparent text-white font-bold text-sm hover:bg-white/15 hover:text-white backdrop-blur-sm transition-colors flex items-center gap-2">
                <Link href="/products">
                  View In-House Products
                </Link>
              </Button>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
