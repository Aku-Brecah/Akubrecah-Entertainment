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
    id: "api-gateway",
    tag: "Core Infrastructure",
    title: "Akubrecah API Gateway",
    subtitle: "High-throughput microservice routing & event bus",
    description: "Our proprietary distributed API gateway architecture designed for low-latency request routing, token rate-limiting, and resilient webhook dispatch. Built with Next.js, Redis, and high-concurrency Node.js workers.",
    href: "/services#enterprise",
    ctaText: "Explore Gateway Architecture",
    features: [
      "Low-latency distributed routing",
      "Dynamic in-memory bounded LRU rate limiting",
      "Automated webhook retry with exponential backoff",
      "End-to-end payload signature verification (HMAC-SHA256)",
      "Zero-downtime hot reload configuration",
      "Prometheus & OpenTelemetry metric exports",
    ],
  },
  {
    id: "observability-console",
    tag: "Developer Platform",
    title: "Client & Engineering Console",
    subtitle: "Full-stack project observability & deployment hub",
    description: "A centralized dashboard for enterprise engineering clients. Track live production metrics, server resource utilization, database migration logs, and payment reconciliation in real-time.",
    href: "/dashboard",
    ctaText: "Open Engineering Console",
    features: [
      "Real-time container CPU, RAM & disk telemetry",
      "Integrated CI/CD build status and git commit tracking",
      "Audited multi-role team access control (RBAC)",
      "Automated incident alert notifications via WhatsApp & Email",
      "Encrypted credential & secret rotation manager",
      "Comprehensive API request logs and error tracking",
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
        <div className="w-full max-w-none mx-auto px-3 sm:px-5 lg:px-6 py-8 md:py-10 space-y-5">
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <span className="text-on-surface font-semibold">In-House Products</span>
          </nav>
          <div className="max-w-5xl space-y-3">
            <span className="text-xs font-black text-primary uppercase tracking-widest">Government & Tax Technology</span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-on-surface tracking-tight leading-tight">
              Battle-Tested<br />
              <span className="text-primary">Statutory Tools.</span>
            </h1>
            <p className="text-base sm:text-lg text-on-surface-variant max-w-4xl leading-relaxed">
              Built and operated in-house, these products demonstrate the precision of our engineering. 
              Designed for Kenyan taxpayers and businesses for instant, verified tax compliance.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-none mx-auto px-3 sm:px-5 lg:px-6 py-8 md:py-10 space-y-10">

        {/* Products */}
        <div className="space-y-10">
          {products.map((product) => {
            return (
              <div
                key={product.id}
                id={product.id}
                className="p-8 sm:p-10 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 inline-block mb-2">
                      {product.tag}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
                      {product.title}
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-primary">
                    {product.subtitle}
                  </p>
                </div>

                <p className="text-sm text-on-surface-variant leading-relaxed max-w-4xl">
                  {product.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 border-t border-outline-variant/60">
                  {product.features.map((feat) => (
                    <div key={feat} className="flex items-start gap-2.5 text-xs sm:text-sm text-on-surface">
                      <span className="text-primary font-bold shrink-0 leading-tight">•</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Link href={product.href}>
                    <Button className="h-11 px-7 rounded-xl bg-primary text-white font-bold text-xs sm:text-sm flex items-center gap-2 group w-fit hover:bg-primary/90">
                      {product.ctaText} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tech Highlights */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-black text-primary uppercase tracking-widest">Engineering Discipline</span>
            <h2 className="text-3xl font-black text-on-surface">Standards Behind Every Product</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {techHighlights.map((item) => {
              return (
                <div key={item.title} className="p-7 rounded-3xl bg-surface-container-lowest border border-outline-variant space-y-4">
                  <span className="text-xs font-mono font-black text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20 w-fit inline-block">
                    {item.step}
                  </span>
                  <h3 className="text-lg font-bold text-on-surface">{item.title}</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="p-10 sm:p-14 rounded-3xl bg-primary text-white text-center space-y-5">
          <h2 className="text-3xl font-black">Need a Custom Version for Your Organization?</h2>
          <p className="text-white/80 text-sm max-w-lg mx-auto">
            We configure and deploy our software architecture for enterprise and institutional clients. 
            Dedicated support and customized hosting options available.
          </p>
          <Link href="/contact">
            <Button size="lg" className="h-12 px-8 rounded-xl bg-white text-primary font-bold text-sm flex items-center gap-2 mx-auto group">
              Inquire About Deployment <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

      </div>
    </div>
  )
}
