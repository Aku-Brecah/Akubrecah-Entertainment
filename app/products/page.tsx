import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "In-House Products & Statutory Software Tools",
  description: "Explore Akubrecah Technologies' software products: Akubrecah API Gateway, high-throughput financial routing, and automated compliance tools built for East African enterprises.",
  alternates: {
    canonical: "https://akubrecah.com/products",
  },
  openGraph: {
    title: "In-House Products & Developer Tools | Akubrecah Technologies",
    description: "Explore software products, distributed API gateways, and tax compliance automation tools.",
    url: "https://akubrecah.com/products",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Akubrecah In-House Software Products",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "In-House Products & Statutory Software Tools | Akubrecah",
    description: "Distributed API gateways, observability consoles, and statutory compliance tools.",
    images: ["/og-image.jpg"],
  },
}

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BreadcrumbSchema, SoftwareSchema } from "@/components/seo/site-schema"

const products = [
  {
    id: "kra-portal",
    tag: "Flagship GovTech",
    title: "KRA PIN Certificate Retrieval Portal",
    subtitle: "Independent KRA PIN lookup & ephemeral PDF streaming",
    description: "An independent Kenyan cyber facilitation platform for verifying KRA PIN records via National ID or PIN and downloading formatted PDF certificates via Safaricom Daraja M-Pesa (KES 20 single or KES 500/month Cyber Cafe pass) with zero server-side PDF storage.",
    href: "/retrieval-portal",
    ctaText: "Launch Retrieval Portal",
    features: [
      "National ID & KRA PIN live verification",
      "Volatile RAM PDF generation with zero disk retention",
      "Safaricom Daraja M-Pesa STK Push & receipt verification",
      "Cyber Cafe monthly pass (up to 50 retrievals/day)",
      "WhatsApp bot certificate fulfillment channel",
      "Integrated Kenya P9 income tax calculator",
    ],
  },
  {
    id: "api-gateway",
    tag: "Core Infrastructure",
    title: "Akubrecah API Gateway",
    subtitle: "High-throughput microservice routing & event bus",
    description: "Our distributed API gateway architecture designed for resilient request routing, rate limiting, and webhook verification. Built with Next.js, Upstash Redis, and PostgreSQL.",
    href: "/services#enterprise",
    ctaText: "Explore Gateway Architecture",
    features: [
      "Low-latency distributed routing",
      "Redis + in-memory bounded LRU rate limiting",
      "Idempotent webhook processing with replay protection",
      "End-to-end payload signature verification (HMAC-SHA256)",
      "Encrypted TLS upstream transport",
      "Structured telemetry & audit logging",
    ],
  },
  {
    id: "observability-console",
    tag: "Developer Platform",
    title: "Client & Engineering Console",
    subtitle: "Account, subscription & retrieval workspace",
    description: "A centralized console for registered taxpayers, cyber cafe operators, and administrators to manage subscriptions, verify payment status, and monitor portal health in real time.",
    href: "/dashboard",
    ctaText: "Open Engineering Console",
    features: [
      "Cyber Cafe subscription status & invoice ledger",
      "Live database, Clerk, Daraja & KRA health monitoring",
      "Audited role-based access control (RBAC)",
      "Automated inquiry notifications via WhatsApp & Email",
      "Real-time Daraja STK Push reconciliation console",
      "Comprehensive system audit log viewer",
    ],
  },
]

const techHighlights = [
  {
    step: "01",
    title: "Encrypted & Hardened Standards",
    desc: "TLS 1.3 encryption, OWASP-hardened APIs, rate limiting, and automated security controls on all product endpoints.",
  },
  {
    step: "02",
    title: "High Performance Architecture",
    desc: "Edge-deployed infrastructure with aggressive caching, CDN routing, and optimized database queries for minimal latency.",
  },
  {
    step: "03",
    title: "Resilient Infrastructure",
    desc: "Automated deployments, health checks, and failover safeguards ensure continuous service availability.",
  },
]

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SoftwareSchema
        name="Akubrecah In-House Developer & Statutory Software Suite"
        description="High-throughput distributed API gateways, client engineering observability consoles, and GovTech compliance tools."
        applicationCategory="DeveloperApplication"
        url="https://akubrecah.com/products"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://akubrecah.com" },
          { name: "Products", url: "https://akubrecah.com/products" },
        ]}
      />

      {/* Page Hero */}
      <div className="bg-surface-container-lowest border-b border-outline-variant">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-10 md:py-12 space-y-4">
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <span className="text-on-surface font-medium">In-House Products</span>
          </nav>
          <div className="max-w-4xl space-y-3">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Proprietary Platforms &amp; Statutory Tools</span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-on-surface tracking-tight leading-tight">
              In-house software platforms and compliance utilities.
            </h1>
            <p className="text-base sm:text-lg text-on-surface-variant max-w-3xl leading-relaxed">
              Built and operated by Akubrecah Technologies, these platforms serve Kenyan taxpayers, cyber cafe operators, and engineering teams with verified statutory lookups, API routing, and operational telemetry.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-10 md:py-14 space-y-12">

        {/* Products Specification Sheets */}
        <div className="space-y-8">
          {products.map((product) => {
            return (
              <section
                key={product.id}
                id={product.id}
                className="p-6 sm:p-8 rounded-xl bg-surface-container-lowest border border-outline-variant grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                <div className="lg:col-span-5 space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary block">
                    {product.tag}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
                    {product.title}
                  </h2>
                  <p className="text-xs font-medium text-on-surface-variant">
                    {product.subtitle}
                  </p>
                  <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed pt-1">
                    {product.description}
                  </p>
                  <div className="pt-3">
                    <Button asChild className="h-10 px-5 rounded-lg bg-primary text-white font-semibold text-xs flex items-center gap-2 w-fit hover:bg-primary/90">
                      <Link href={product.href}>
                        <span>{product.ctaText}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-surface-container-low border border-outline-variant rounded-lg p-5 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant border-b border-outline-variant pb-2">
                    Capabilities &amp; Architecture Specifications
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {product.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-2 text-xs text-on-surface">
                        <span className="text-primary font-bold shrink-0 leading-tight">•</span>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )
          })}
        </div>

        {/* Tech Highlights */}
        <div className="space-y-6">
          <div className="border-b border-outline-variant pb-4">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Operational Standards</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-on-surface mt-1">Infrastructure Guarantees Behind Our Products</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {techHighlights.map((item) => (
              <div key={item.title} className="pt-4 border-t-2 border-outline-variant space-y-2">
                <span className="text-xs font-mono font-semibold text-primary">
                  {item.step}
                </span>
                <h3 className="text-base font-bold text-on-surface">{item.title}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Enterprise Licensing / Deployment CTA */}
        <div className="p-8 sm:p-10 rounded-xl bg-surface-container-lowest border border-outline-variant flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <h2 className="text-xl sm:text-2xl font-bold text-on-surface">Need a dedicated deployment for your organization?</h2>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              We configure and deploy dedicated instances of our gateway and compliance architecture for enterprise and institutional clients.
            </p>
          </div>
          <Button asChild size="lg" className="h-10 px-6 rounded-lg bg-primary text-white font-semibold text-xs flex items-center gap-2 shrink-0 hover:bg-primary/90">
            <Link href="/contact">
              <span>Inquire About Deployment</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

      </div>
    </div>
  )
}
