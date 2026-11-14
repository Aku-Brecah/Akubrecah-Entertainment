import React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { Cpu, Sparkles, ArrowRight, ShieldCheck, Zap, Layers, MessageSquare } from "lucide-react"
import { BreadcrumbSchema } from "@/components/seo/site-schema"
import { ProjectEstimator } from "@/components/interactive/project-estimator"
import { Button } from "@/components/ui/button"

export const revalidate = 3600

export const metadata: Metadata = {
  title: "Interactive System Architecture & Project Estimator | Akubrecah Technologies",
  description:
    "Scope your enterprise software, GovTech statutory portal, native mobile app, or digital platform in seconds. Instant architecture specifications, engineering stack recommendations, and timeline calculation.",
  alternates: {
    canonical: "https://akubrecah.com/estimator",
  },
  openGraph: {
    title: "Interactive Architecture & Cost Estimator | Akubrecah Technologies",
    description:
      "Instant architecture specifications, engineering stack recommendations, and timeline calculation for high-scale digital platforms.",
    url: "https://akubrecah.com/estimator",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Akubrecah Architecture & Project Estimator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Interactive Architecture & Project Estimator | Akubrecah",
    description: "Instant architecture scope, engineering recommendations, and turnaround calculator.",
    images: ["/og-image.jpg"],
  },
}

export default function EstimatorPage() {
  return (
    <div className="min-h-screen bg-background text-on-background selection:bg-primary/20 selection:text-primary">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://akubrecah.com" },
          { name: "Architecture Estimator", url: "https://akubrecah.com/estimator" },
        ]}
      />

      {/* Hero Header */}
      <section className="bg-surface-container-lowest border-b border-outline-variant relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="absolute top-12 left-10 w-72 h-72 bg-[#00C2FF]/4 rounded-full filter blur-[100px] pointer-events-none" />

        <div className="w-full max-w-none mx-auto px-3 sm:px-5 lg:px-6 py-8 md:py-10 space-y-5 relative z-10">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-on-surface font-semibold">Architecture Estimator</span>
          </nav>

          <div className="max-w-5xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary shadow-2xs">
              <Cpu className="w-3.5 h-3.5" />
              <span>Interactive Architecture Sandbox</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-on-surface tracking-tight leading-[1.08]">
              Scope & Architect Your{" "}
              <span className="text-primary bg-gradient-to-br from-primary via-red-600 to-red-800 bg-clip-text text-transparent">
                Digital Platform
              </span>
            </h1>

            <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed max-w-4xl">
              Configure your service requirements, scale tier, payment gateways, and security compliance. 
              Get instant architectural blueprints, recommended technology stacks, and turnaround timelines.
            </p>
          </div>
        </div>
      </section>

      {/* Main Sandbox Section */}
      <main className="w-full max-w-none mx-auto px-3 sm:px-5 lg:px-6 py-8 md:py-10 space-y-10">
        <ProjectEstimator />

        {/* Discovery & Consultation Banner */}
        <section className="rounded-3xl p-8 sm:p-12 bg-surface-container-lowest border border-outline-variant shadow-soft flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Direct Lead Architect Review</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
              Need a Custom Enterprise Solution or SLA?
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              For complex multi-tenant platforms, custom GovTech integrations, fiscal thermal ETR systems, 
              or legacy system migrations, our senior engineering team provides tailored scoping workshops.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full md:w-auto">
            <Button asChild size="lg" className="h-12 px-6 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 shadow-md shadow-primary/20 flex items-center gap-2">
              <Link href="/contact">
                <MessageSquare className="w-4 h-4" />
                <span>Book Technical Discovery</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-6 rounded-xl border-outline-variant font-bold text-sm hover:bg-surface-container flex items-center gap-2">
              <Link href="/projects">
                <span>Explore Case Studies</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
