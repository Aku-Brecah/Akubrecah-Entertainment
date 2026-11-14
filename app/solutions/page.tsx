import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Software Solutions & Industry Specializations",
  description: "Enterprise software solutions across FinTech, GovTech, automated statutory compliance, ERP systems, and cloud-native SaaS engineering in Nairobi, Kenya.",
  alternates: {
    canonical: "https://akubrecah.com/solutions",
  },
  openGraph: {
    title: "Enterprise Software Solutions | Akubrecah Technologies",
    description: "Tailored software solutions for FinTech payments, GovTech statutory automation, ERP, and cloud-native SaaS systems.",
    url: "https://akubrecah.com/solutions",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Akubrecah Enterprise Software Solutions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Software Solutions & Industry Specializations | Akubrecah",
    description: "FinTech payments, GovTech compliance portals, ERP, and cloud-native SaaS.",
    images: ["/og-image.jpg"],
  },
}

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BreadcrumbSchema, ServiceSchema } from "@/components/seo/site-schema"

const solutions = [
  {
    id: "fintech",
    title: "Financial Technology & Payments",
    subtitle: "Automated payment flows, multi-currency ledgers & instant reconciliation",
    description: "From M-Pesa Daraja STK Push integrations to multi-currency balance ledgers and automated reconciliation systems — we build the financial infrastructure that powers modern business in East Africa.",
    tag: "Fintech & Payments",
    deliverables: [
      "M-Pesa Daraja API (STK Push, C2B, B2C, B2B) architecture",
      "Real-time mobile & digital payment reconciliation pipelines",
      "Multi-currency transaction ledger engines",
      "Automated bank statement reconciliation pipelines",
      "Real-time financial dashboards & cashflow telemetry",
      "Fraud detection signals & risk scoring algorithms",
    ],
  },
  {
    id: "govtech",
    title: "Government & Public Sector",
    subtitle: "Statutory compliance portals & secure citizen-facing services",
    description: "We specialize in digitizing public sector workflows — from citizen identity verification gateways to automated statutory compliance portals and inter-agency data exchange APIs.",
    tag: "GovTech Systems",
    deliverables: [
      "National ID & KRA PIN verification gateways",
      "Automated compliance certificate generation engines",
      "Statutory returns filing automation workflows",
      "Role-based citizen portal access control & audit trails",
      "Government API integrations (KRA, NTSA, eCitizen)",
      "KDPA 2019 data protection compliance architecture",
    ],
  },
  {
    id: "enterprise",
    title: "Enterprise Operations & ERP",
    subtitle: "Replacing manual paperwork with structured, auditable digital portals",
    description: "Digitize sprawling operational workflows with real-time web and mobile portals, automated document generation pipelines, custom ERP modules, and operational telemetry.",
    tag: "Enterprise Systems",
    deliverables: [
      "Custom ERP modules & operational management tools",
      "Cryptographic PDF document generation and automated archiving",
      "Granular approval hierarchies & Role-Based Access Control",
      "CRM & third-party enterprise integrations",
      "Real-time business telemetry dashboards",
      "Automated multi-channel notification pipelines (SMS/Email)",
    ],
  },
  {
    id: "saas",
    title: "SaaS Product Engineering",
    subtitle: "Full-cycle product architecture and development for software ventures",
    description: "From initial architecture to production scale, we partner with ventures to architect, build, and deploy multi-tenant SaaS products designed for rapid iteration and stability.",
    tag: "SaaS & Ventures",
    deliverables: [
      "Rapid MVP delivery built on production-quality foundations",
      "Multi-tenant subscription billing (Safaricom M-Pesa Express, Stripe)",
      "Authentication, SSO & team permission management",
      "Usage metering and real-time product analytics",
      "Public API design, rate-limiting & developer documentation",
      "Cloud-native auto-scaling architecture",
    ],
  },
]

const processSteps = [
  {
    num: "01",
    title: "Discovery & System Architecture",
    desc: "We define system boundaries, data models, API contracts, and security policies before touching a single line of production code.",
  },
  {
    num: "02",
    title: "Vertical Slice Iterations",
    desc: "We build thin, complete slices — UI, business logic, persistence, and automated verification — providing testable software every sprint.",
  },
  {
    num: "03",
    title: "Security & QA Hardening",
    desc: "Automated type checking, security static analysis, integration testing, and performance profiling are run prior to every release.",
  },
  {
    num: "04",
    title: "Zero-Downtime Deployment",
    desc: "Automated GitOps deployments with blue-green failover and live telemetry monitoring ensure continuous service availability.",
  },
]

const ecosystemLayers = [
  {
    category: "Web Applications",
    spec: "Next.js 15 · React 19 · TypeScript",
    detail: "Server-rendered responsive web apps with strict type validation and optimized Core Web Vitals.",
  },
  {
    category: "Mobile Apps",
    spec: "iOS Swift · Android Kotlin · React Native",
    detail: "High-performance native mobile apps with offline-first synchronization and biometric security.",
  },
  {
    category: "Cloud & DevOps",
    spec: "AWS · GCP · Docker · K8s · CI/CD",
    detail: "Containerized deployment pipelines, zero-trust network boundaries, and automated monitoring.",
  },
]

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <ServiceSchema
        name="Enterprise Domain Software Solutions"
        description="Tailored software solutions across FinTech, GovTech, automated statutory compliance, ERP systems, and cloud-native SaaS engineering in Nairobi, Kenya."
        serviceType="Enterprise Software Architecture & GovTech Solutions"
        url="https://akubrecah.com/solutions"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://akubrecah.com" },
          { name: "Solutions", url: "https://akubrecah.com/solutions" },
        ]}
      />

      {/* Page Hero */}
      <div className="bg-surface-container-lowest border-b border-outline-variant">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-8 md:py-10 space-y-5">
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <span className="text-on-surface font-semibold">Industry Solutions</span>
          </nav>
          <div className="max-w-5xl space-y-3">
            <span className="text-xs font-black text-primary uppercase tracking-widest">Industry Specializations</span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-on-surface tracking-tight leading-tight">
              Industry Solutions:<br />
              <span className="text-primary">Sovereign &amp; Enterprise Infrastructure.</span>
            </h1>
            <p className="text-base sm:text-lg text-on-surface-variant max-w-4xl leading-relaxed">
              Tailored architectures for state compliance gateways, instant Daraja financial settlements, IoT fleet telematics, and automated video intelligence across East Africa.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/contact">
              <Button size="lg" className="h-12 px-7 rounded-xl bg-primary text-white font-bold text-sm flex items-center gap-2 group">
                Discuss Your Requirements <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-8 md:py-10 space-y-10">

        {/* Solutions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {solutions.map((sol) => {
            return (
              <div
                key={sol.id}
                id={sol.id}
                className="p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft hover:border-primary/40 transition-all duration-300 space-y-6 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  {/* Tag Header */}
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {sol.tag}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-on-surface">{sol.title}</h2>
                    <p className="text-xs font-bold mt-1 text-primary">{sol.subtitle}</p>
                    <p className="text-xs sm:text-sm text-on-surface-variant mt-3 leading-relaxed">{sol.description}</p>
                  </div>

                  {/* Deliverables checklist */}
                  <div className="space-y-2.5">
                    {sol.deliverables.map((item) => (
                      <div key={item} className="flex items-start gap-2.5 text-xs sm:text-sm text-on-surface">
                        <span className="text-primary font-bold shrink-0 leading-tight">•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-outline-variant">
                  <Link href={`/contact?solution=${sol.id}`} className="block">
                    <Button className="w-full h-11 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-2 group hover:bg-primary/90">
                      Consult on {sol.title} <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* Execution Framework / 4 Steps */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-black text-primary uppercase tracking-widest">Delivery Framework</span>
            <h2 className="text-3xl font-black text-on-surface">How We Deliver Every Project</h2>
            <p className="text-sm text-on-surface-variant max-w-xl mx-auto">
              Regardless of domain or technical complexity, our work follows a structured 4-phase methodology.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {processSteps.map((step) => (
              <div key={step.num} className="p-7 rounded-3xl bg-surface-container-lowest border border-outline-variant space-y-4 shadow-soft">
                <span className="text-xs font-mono font-black text-primary px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 w-fit inline-block">
                  Phase {step.num}
                </span>
                <h3 className="text-base font-bold text-on-surface">{step.title}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cross-Platform Ecosystem Banner */}
        <div className="p-8 sm:p-12 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-black text-primary uppercase tracking-widest">Unified Ecosystems</span>
            <h2 className="text-3xl font-black text-on-surface">Cross-Platform. End-to-End.</h2>
            <p className="text-sm text-on-surface-variant max-w-xl mx-auto">
              We deliver cohesive product ecosystems — responsive web apps, native mobile apps, and scalable cloud APIs — all under one unified engineering team.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {ecosystemLayers.map((item) => {
              return (
                <div key={item.category} className="p-6 rounded-2xl bg-surface-container text-left space-y-2 border border-outline-variant/60">
                  <p className="font-bold text-sm text-on-surface">{item.category}</p>
                  <p className="text-xs font-mono text-primary font-semibold">{item.spec}</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{item.detail}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom CTA Banner (Obsidian Sovereign Theme) */}
        <div className="p-8 sm:p-12 lg:p-14 rounded-3xl bg-[#111315] text-white border border-stone-800 space-y-6 shadow-xl">
          <div className="space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-stone-700 bg-stone-900/80">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">Direct Engineering Consultation</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Deploy Sovereign Infrastructure with Akubrecah
            </h2>
            <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
              Consult directly with our principal systems engineers in Nairobi. We architect resilient systems engineered for zero tolerance of failure.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link href="/contact">
                <Button size="lg" className="h-12 px-6 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 flex items-center gap-2">
                  Start Project Brief <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/services">
                <Button size="lg" variant="outline" className="h-12 px-6 rounded-xl border-stone-700 bg-transparent text-white font-bold text-sm hover:bg-white/10">
                  Explore Capabilities
                </Button>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
