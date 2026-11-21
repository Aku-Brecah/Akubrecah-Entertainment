import React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, MessageSquare } from "lucide-react"
import { BreadcrumbSchema } from "@/components/seo/site-schema"
import { ProjectEstimator } from "@/components/interactive/project-estimator"
import { Button } from "@/components/ui/button"

export const revalidate = 3600

export const metadata: Metadata = {
  title: "Interactive System Architecture & Project Estimator",
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
      <section className="bg-surface-container-lowest border-b border-outline-variant">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-10 md:py-12 space-y-4">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-on-surface font-medium">Architecture Estimator</span>
          </nav>

          <div className="max-w-4xl space-y-3">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Project Scoping &amp; Turnaround Calculator
            </span>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-on-surface tracking-tight leading-tight">
              Scope your software architecture and delivery timeline.
            </h1>

            <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed max-w-3xl">
              Select your core engineering domain, deployment scale, and required integration modules to generate a recommended stack specification and projected turnaround estimate.
            </p>
          </div>
        </div>
      </section>

      {/* Main Sandbox Section */}
      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-10 md:py-14 space-y-12">
        <ProjectEstimator />

        {/* Discovery & Consultation Banner */}
        <section className="rounded-xl p-8 sm:p-10 bg-surface-container-lowest border border-outline-variant flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Custom Enterprise Scoping
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
              Need a custom multi-tenant architecture or dedicated SLA?
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              For bespoke platforms, custom statutory integrations, thermal POS systems, or legacy database migrations, our engineering team provides detailed technical scoping workshops.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <Button asChild size="lg" className="h-10 px-5 rounded-lg bg-primary text-white font-semibold text-xs hover:bg-primary/90 flex items-center gap-2">
              <Link href="/contact">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Book Technical Discovery</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-10 px-5 rounded-lg border-outline-variant font-semibold text-xs hover:bg-surface-container flex items-center gap-2">
              <Link href="/projects">
                <span>View Case Studies</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
