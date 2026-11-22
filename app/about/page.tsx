import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, MapPin, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BreadcrumbSchema } from "@/components/seo/site-schema";

export const metadata: Metadata = {
  title: "About Akubrecah",
  description:
    "Learn about Akubrecah Entertainment — full-cycle software engineering and digital innovation firm headquartered in Nairobi, Kenya. Powering enterprise platforms, cloud systems, and government statutory automation.",
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
    title: "Kenya P9 Tax Calculator & Filing Guide",
    tag: "Free Tool",
    stat: "2024 Statutory Bands",
    speed: "Instant Computation",
    href: "/retrieval-portal?view=filing",
    desc: "Compute PAYE, NSSF, SHIF, and Housing Levy obligations and follow step-by-step official KRA iTax Nil Return instructions.",
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

      {/* Page Hero */}
      <div className="relative overflow-hidden py-10 md:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute -top-12 left-1/4 w-80 h-80 rounded-full bg-[#FFE4E1] opacity-60 blur-[90px] animate-float-blob" />
        <div aria-hidden="true" className="pointer-events-none absolute top-4 right-1/4 w-80 h-80 rounded-full bg-[#E6E6FA] opacity-60 blur-[90px] animate-float-blob [animation-delay:3s]" />
        <div className="relative z-10 w-full max-w-[1220px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link href="/" className="hover:text-on-surface transition-colors">Home</Link>
            <span>/</span>
            <span className="text-on-surface font-medium">About Akubrecah</span>
          </nav>
          <div className="max-w-4xl space-y-3">
            <span className="font-cursive text-2xl sm:text-3xl text-[#78716C] block">company profile · Nairobi, Kenya</span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium text-on-surface tracking-[-0.025em] leading-[1.08]">
              Software engineering grounded in{" "}
              <span className="font-cursive text-5xl sm:text-7xl font-normal">human</span>{" "}
              clarity.
            </h1>
            <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl leading-relaxed">
              Akubrecah Technologies is a software engineering firm headquartered in Nairobi. 
              We architect web platforms, native mobile applications, cloud infrastructure, 
              and statutory facilitation tools engineered for production workloads across East Africa.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant pt-1">
            <MapPin className="h-3.5 w-3.5 text-[#FFB7B2]" />
            <span>Nairobi, Kenya — Serving East African and regional enterprises</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-10 md:py-14 space-y-14">

        {/* Core Philosophy Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Main Content (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Engineering Practice
            </span>

            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                Disciplined execution for systems where downtime and data loss are unacceptable.
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                From Safaricom Daraja M-Pesa payment reconciliation to ephemeral tax document workflows, our systems are built around strict data contracts, predictable failure recovery, and maintainable architecture.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {[
                "Strict TypeScript and schema validation across API boundaries",
                "Automated CI/CD pipelines and zero-downtime deployments",
                "Encrypted TLS transport and OWASP input hardening",
                "Responsive, accessible interfaces across desktop and mobile",
                "Offline-capable mobile state synchronization",
                "Clear architectural documentation and client code ownership",
              ].map((feat) => (
                <div key={feat} className="flex items-start gap-2.5 text-xs sm:text-sm text-on-surface">
                  <span className="text-primary font-bold shrink-0 leading-tight">•</span>
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Button asChild className="h-10 px-6 rounded-lg bg-primary text-white font-semibold text-xs flex items-center gap-2 w-fit hover:bg-primary/90">
                <Link href="/contact">
                  <span>Speak With Our Engineering Team</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Specifications Table (5 cols) */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Operational Standards</h3>
              <dl className="divide-y divide-outline-variant text-xs">
                {coreCompetencies.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between py-3">
                    <dt className="text-on-surface-variant">{stat.label}</dt>
                    <dd className="font-semibold text-on-surface text-right">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

        </div>

        {/* Guiding Principles */}
        <div className="space-y-6">
          <div className="border-b border-outline-variant pb-4">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Operating Principles</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-on-surface mt-1">Standards That Govern Our Codebase</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {principles.map((p) => (
              <div key={p.num} className="pt-4 border-t-2 border-outline-variant space-y-2">
                <span className="text-xs font-mono font-semibold text-primary">{p.num}</span>
                <h3 className="text-base font-bold text-on-surface">{p.title}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Depth */}
        <div className="space-y-6">
          <div className="border-b border-outline-variant pb-4">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Technical Stack</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-on-surface mt-1">Core Technologies by Practice Layer</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stackCategories.map((item) => (
              <div key={item.title} className="p-6 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-on-surface">{item.title}</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{item.desc}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-outline-variant/60">
                  {item.technologies.map((tech) => (
                    <span key={tech} className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-container-low border border-outline-variant text-on-surface-variant">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* In-House Products Highlights */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-outline-variant pb-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">In-House Systems</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-on-surface">Public Tools Operated by Akubrecah</h2>
            </div>
            <Link href="/products" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 w-fit">
              <span>Explore all products</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {inHouseProducts.map((prod) => (
              <Link key={prod.title} href={prod.href} className="group block">
                <div className="p-6 rounded-xl bg-surface-container-lowest border border-outline-variant hover:border-primary/40 transition-colors space-y-4 h-full flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary">
                        {prod.tag}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-on-surface-variant group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors">{prod.title}</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{prod.desc}</p>
                  </div>
                  <div className="pt-3 border-t border-outline-variant flex items-center justify-between text-xs">
                    <span className="font-medium text-on-surface">{prod.stat}</span>
                    <span className="font-mono text-on-surface-variant">{prod.speed}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Consultation Bar */}
        <div className="p-8 sm:p-10 rounded-xl bg-surface-container-lowest border border-outline-variant flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <h2 className="text-xl sm:text-2xl font-bold text-on-surface">Discuss a software project with our engineering team</h2>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Whether launching a new platform, modernizing internal operations, or integrating Kenyan payment and compliance workflows, we provide clear technical scoping and delivery.
            </p>
          </div>
          <Button asChild size="lg" className="h-10 px-6 rounded-lg bg-primary text-white font-semibold text-xs flex items-center gap-2 shrink-0 hover:bg-primary/90">
            <Link href="/contact">
              <span>Start a Conversation</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

      </div>
    </div>
  )
}
