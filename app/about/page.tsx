import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, MapPin, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BreadcrumbSchema } from "@/components/seo/site-schema";

export const metadata: Metadata = {
  title: "About Akubrecah Technologies | Software Engineering & Innovation",
  description:
    "Learn about Akubrecah Technologies — full-cycle software engineering and digital innovation firm headquartered in Nairobi, Kenya. Powering enterprise platforms, cloud systems, and government statutory automation.",
  alternates: {
    canonical: "https://akubrecah.com/about",
  },
  openGraph: {
    title: "About Akubrecah Technologies | Software Engineering Excellence",
    description:
      "Full-cycle software engineering firm in Nairobi, Kenya. Resilient web apps, native mobile, cloud infrastructure, and GovTech platforms.",
    url: "https://akubrecah.com/about",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "About Akubrecah Technologies",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Akubrecah Technologies | Software Engineering & Innovation",
    description: "Full-cycle software engineering firm in Nairobi, Kenya.",
    images: ["/og-image.jpg"],
  },
};

const principles = [
  {
    num: "01",
    title: "Engineering Rigor Above All",
    desc: "We treat software engineering as a rigorous discipline. Every module is strictly typed, tested, audited, and documented before deploying to production.",
  },
  {
    num: "02",
    title: "Security by Default",
    desc: "TLS 1.3 encryption, OWASP hardening, and rigorous access control are built into the foundation from day one, never bolted on after.",
  },
  {
    num: "03",
    title: "Measurable Business Outcomes",
    desc: "We prioritize real-world velocity, uptime, latency metrics, and user adoption over vanity metrics and superficial deliverable checklists.",
  },
  {
    num: "04",
    title: "Responsive Performance",
    desc: "Optimized database query planners, distributed caching, and lean bundle delivery ensure fast, dependable interactions across all devices.",
  },
]

const stackCategories = [
  {
    title: "Web & Enterprise SaaS",
    desc: "Modern reactive web apps built with Next.js, React, strict TypeScript, and Tailwind CSS for peak Core Web Vitals.",
    technologies: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Prisma ORM", "PostgreSQL"],
  },
  {
    title: "Mobile App Ecosystems",
    desc: "High-performance native iOS (Swift), Android (Kotlin), and universal React Native applications with offline-first synchronization.",
    technologies: ["React Native", "Swift / SwiftUI", "Kotlin / Compose", "SQLite", "Expo"],
  },
  {
    title: "Cloud & DevOps Infrastructure",
    desc: "Containerized microservices and automated GitOps CI/CD pipelines deployed to standard cloud providers and modern edge networks.",
    technologies: ["Docker", "Linux / VPS", "GitHub Actions", "Redis", "Cloudflare"],
  },
]

const inHouseProducts = [
  {
    title: "KRA Certificate Retrieval Portal",
    tag: "Flagship GovTech",
    stat: "Direct Registry Lookup",
    speed: "Instant Resolution",
    href: "/retrieval-portal",
    desc: "Automated retrieval and cryptographic verification of compliance documents via National ID and PIN.",
  },
  {
    title: "Automated Tax Returns Filing",
    tag: "Compliance Suite",
    stat: "Guided Submission",
    speed: "Standard iTax Formats",
    href: "/dashboard/filing",
    desc: "Streamlined statutory compliance assistant guiding Kenyan businesses through iTax nil returns efficiently.",
  },
]

const coreCompetencies = [
  { label: "Deployment Topology", value: "Edge CDN & Microservices" },
  { label: "Data Protection", value: "KDPA 2019 Compliant" },
  { label: "API Gateways", value: "Daraja M-Pesa & KRA iTax" },
  { label: "Development Cadence", value: "CI/CD Automated Testing" },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://akubrecah.com" },
          { name: "About", url: "https://akubrecah.com/about" },
        ]}
      />

      {/* Page Hero - Matching Products Design */}
      <div className="bg-surface-container-lowest border-b border-outline-variant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 space-y-6">
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <span className="text-on-surface font-semibold">About Akubrecah</span>
          </nav>
          <div className="max-w-3xl space-y-4">
            <span className="text-xs font-black text-primary uppercase tracking-widest">Engineering Excellence · Nairobi, Kenya</span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-on-surface tracking-tight leading-tight">
              We Build Software<br />
              <span className="text-primary">That Lasts & Scales.</span>
            </h1>
            <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl leading-relaxed">
              Akubrecah Technologies is a premier software engineering firm headquartered in Nairobi. 
              We architect high-impact web platforms, native mobile applications, cloud infrastructure, 
              and mission-critical statutory automation systems that withstand real production load.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant pt-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Nairobi, Kenya — Engineering for East Africa and Global Enterprises</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 space-y-20">

        {/* Core Philosophy Section - Matching Products 5-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
          
          {/* Main Content (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                Engineering Conviction
              </span>
            </div>

            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight">
                World-Class Standards. Local Market Depth.
              </h2>
              <p className="text-sm font-bold mt-1 text-primary">
                Zero shortcuts, zero compromises, and no technical debt by design.
              </p>
              <p className="text-sm text-on-surface-variant mt-3 leading-relaxed">
                Founded on the conviction that East African businesses and institutions deserve engineering 
                built to global top-tier benchmarks. From high-throughput M-Pesa payment gateways to resilient 
                statutory compliance portals, our software is engineered for mission-critical reliability.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                "Strict TypeScript & comprehensive type safety",
                "Automated CI/CD pipelines & zero-downtime releases",
                "Encrypted TLS transmission & OWASP hardening",
                "High performance across all screen sizes",
                "Resilient offline-first mobile sync capabilities",
                "Clear documentation & enterprise code ownership",
              ].map((feat) => (
                <div key={feat} className="flex items-start gap-2.5 text-sm text-on-surface">
                  <span className="text-primary font-bold shrink-0 leading-tight">•</span>
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Link href="/contact">
                <Button className="h-12 px-7 rounded-xl bg-primary text-white font-bold text-sm flex items-center gap-2 group w-fit">
                  Work With Our Engineers <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Card (2 cols) - Matching Products Live Card */}
          <div className="lg:col-span-2">
            <div className="p-7 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft space-y-5 sticky top-24">
              <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Engineering Competencies</h4>
              <div className="space-y-4">
                {coreCompetencies.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between p-4 rounded-2xl bg-surface-container">
                    <span className="text-xs text-on-surface-variant font-semibold">{stat.label}</span>
                    <span className="text-sm font-bold text-on-surface text-right">{stat.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold pt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Active Engineering Operations
              </div>
            </div>
          </div>

        </div>

        {/* Guiding Principles - 4 Column / 2x2 Grid */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-black text-primary uppercase tracking-widest">Our Foundation</span>
            <h2 className="text-3xl font-black text-on-surface">Guiding Principles That Drive Every Line of Code</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {principles.map((p) => {
              return (
                <div key={p.num} className="p-7 rounded-3xl bg-surface-container-lowest border border-outline-variant space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-black text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">{p.num}</span>
                    </div>
                    <h3 className="text-lg font-bold text-on-surface">{p.title}</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Technical Depth - 3 Cards Highlight */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-black text-primary uppercase tracking-widest">Technical Capabilities</span>
            <h2 className="text-3xl font-black text-on-surface">Full-Stack Depth Across Every Layer</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stackCategories.map((item) => {
              return (
                <div key={item.title} className="p-7 rounded-3xl bg-surface-container-lowest border border-outline-variant space-y-5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-on-surface">{item.title}</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {item.technologies.map((tech) => (
                      <span key={tech} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-surface-container text-on-surface-variant">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Proof of Work - In-House Products Highlights */}
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-black text-primary uppercase tracking-widest">Demonstrated Precision</span>
              <h2 className="text-3xl font-black text-on-surface">Our In-House GovTech Suite</h2>
              <p className="text-sm text-on-surface-variant max-w-xl">
                The best testament to our capabilities: high-concurrency compliance tools built and run completely in-house.
              </p>
            </div>
            <Link href="/products">
              <Button variant="outline" className="rounded-xl border-outline-variant text-on-surface font-bold text-xs flex items-center gap-2">
                Explore All Products <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {inHouseProducts.map((prod) => (
              <Link key={prod.title} href={prod.href} className="group block">
                <div className="p-7 rounded-3xl bg-surface-container-lowest border border-outline-variant hover:border-primary/40 transition-all duration-300 space-y-4 h-full flex flex-col justify-between shadow-soft">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                        {prod.tag}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                    <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors">{prod.title}</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{prod.desc}</p>
                  </div>
                  <div className="pt-3 border-t border-outline-variant flex items-center justify-between text-xs">
                    <span className="font-bold text-on-surface">{prod.stat}</span>
                    <span className="text-emerald-600 font-semibold">{prod.speed}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA - Matching Products Style */}
        <div className="p-10 sm:p-14 rounded-3xl bg-primary text-white text-center space-y-5">
          <h2 className="text-3xl font-black">Ready to Build With Our Engineering Team?</h2>
          <p className="text-white/80 text-sm max-w-lg mx-auto">
            Whether launching a new venture, modernizing legacy enterprise systems, or automating statutory workflows — let&apos;s engineer something extraordinary together.
          </p>
          <Link href="/contact">
            <Button size="lg" className="h-12 px-8 rounded-xl bg-white text-primary font-bold text-sm flex items-center gap-2 mx-auto group">
              Start a Conversation <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

      </div>
    </div>
  )
}
