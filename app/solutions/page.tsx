import {
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ServiceSchema, BreadcrumbSchema } from "@/components/seo/site-schema";

export const metadata: Metadata = {
  title: "Industry Solutions: Sovereign & Enterprise Infrastructure",
  description:
    "High-assurance digital platforms, compliance engines, and automated clearing pipelines built specifically for East Africa's regulatory, banking, and real-time transit landscape.",
  alternates: {
    canonical: "https://akubrecah.com/solutions",
  },
  openGraph: {
    title: "Industry Solutions: Sovereign & Enterprise Infrastructure | Akubrecah Technologies",
    description:
      "High-assurance digital platforms, compliance engines, and automated clearing pipelines built specifically for East Africa's regulatory, banking, and real-time transit landscape.",
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
    title: "Industry Solutions: Sovereign & Enterprise Infrastructure | Akubrecah",
    description:
      "FinTech payments, GovTech compliance portals, ERP, and cloud-native SaaS.",
    images: ["/og-image.jpg"],
  },
};

const industryVerticals = [
  {
    id: "govtech",
    anchorAlias: "govtech-portal",
    sector: "Sector 01 · Public Sector & Statutory Facilitation",
    title: "Tax Compliance & Citizen Document Retrieval Portals",
    description:
      "High-trust web portals built for Kenyan taxpayers and cyber cafe operators. Engineered around ephemeral memory streaming so sensitive tax certificates are verified and delivered without persistent disk storage.",
    specs: [
      { label: "Compliance Standard", value: "Kenya Data Protection Act 2019" },
      { label: "Document Persistence", value: "Volatile RAM stream (0 bytes stored)" },
      { label: "Fulfillment Channels", value: "Browser PDF & WhatsApp Bot" },
    ],
    outcomes: [
      "On-demand PDF taxpayer certificate generation with verifiable QR links.",
      "Interactive Kenya P9 tax calculator and official iTax filing guidance.",
      "Privacy-by-design data minimization aligned with the Kenya Data Protection Act 2019.",
    ],
    ctaText: "Open Retrieval Portal",
    ctaHref: "/retrieval-portal",
    mockupImage: "/images/solutions/govtech-gateway.jpg",
    mockupAlt: "KRA Tax Compliance & Verification Interface",
  },
  {
    id: "fintech",
    anchorAlias: "payments",
    sector: "Sector 02 · Financial Technology & Mobile Money",
    title: "Daraja M-Pesa Payment Gateways & Automated Ledgers",
    description:
      "Transaction processing pipelines engineered for East African mobile money workflows. Eliminates lost callbacks and duplicate redemptions through atomic database locking and automated STK query fallbacks.",
    specs: [
      { label: "Payment Rails", value: "Safaricom Daraja STK Push & C2B" },
      { label: "Webhook Security", value: "Fail-closed token verification" },
      { label: "Ledger Integrity", value: "Idempotent receipt locking" },
    ],
    outcomes: [
      "Real-time Safaricom Daraja STK Push & callback ingestion with fail-closed token verification.",
      "Atomic receipt redemption preventing double-spending and duplicate charges.",
      "Automatic STK Query reconciliation when callbacks are delayed.",
    ],
    ctaText: "Inquire About Fintech Architecture",
    ctaHref: "/contact?solution=fintech",
    mockupImage: "/images/solutions/mpesa-reconciliation.jpg",
    mockupAlt: "M-Pesa STK Push Pipeline and Reconciliation Dashboard",
  },
  {
    id: "transit",
    anchorAlias: "enterprise",
    sector: "Sector 03 · Mobility, Logistics & Field Operations",
    title: "Fleet Telematics & Corridor Dispatch Platforms",
    description:
      "Operational visibility and dispatch software built for urban transit SACCOs and logistics fleets. Combines live GPS socket streams with offline-capable driver mobile apps and automated fare collection.",
    specs: [
      { label: "Telemetry Transport", value: "WebSocket & GeoJSON streams" },
      { label: "Network Resilience", value: "Offline-first local SQLite queue" },
      { label: "Fare Settlement", value: "Integrated M-Pesa Express" },
    ],
    outcomes: [
      "Live vehicle geolocation tracking and geo-fenced terminal queue orchestration.",
      "Offline-tolerant mobile synchronization designed for variable cellular networks.",
      "Dynamic dispatch tooling tailored for urban Nairobi transit corridors.",
    ],
    ctaText: "Read Transit Case Study",
    ctaHref: "/projects/swiftboda-ride",
    mockupImage: "/images/solutions/nairobi-fleet-telematics.jpg",
    mockupAlt: "Nairobi Metro Fleet Telemetry and Dispatch Interface",
  },
  {
    id: "media",
    anchorAlias: "saas",
    sector: "Sector 04 · Media, Publishing & Cloud SaaS",
    title: "Automated Broadcast Localization & SaaS Workflows",
    description:
      "Multi-tenant SaaS products and background media pipelines that automate transcription, English/Swahili subtitle translation, and frame-accurate video rendering for regional publishers.",
    specs: [
      { label: "Language Support", value: "English & Swahili speech models" },
      { label: "Media Processing", value: "Containerized FFmpeg workers" },
      { label: "Output Formats", value: "Multi-bitrate H.264 & WebM" },
    ],
    outcomes: [
      "Automated media segmentation and frame-accurate clip rendering workflows.",
      "Speech recognition and subtitle alignment for East African broadcast content.",
      "Multi-bitrate H.264/WebM transcoding optimized for bandwidth-constrained networks.",
    ],
    ctaText: "Inspect Media Pipeline",
    ctaHref: "/projects/AutoChop",
    mockupImage: "/images/solutions/aetherflow-video-pipeline.jpg",
    mockupAlt: "Aetherflow Video AI Transcoding and Localization Interface",
  },
];

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <ServiceSchema
        name="Industry Solutions: Sovereign & Enterprise Infrastructure"
        description="Enterprise software solutions across FinTech, GovTech, automated statutory compliance, ERP systems, and cloud-native SaaS engineering in Nairobi, Kenya."
        serviceType="Enterprise Software Architecture & GovTech Solutions"
        url="https://akubrecah.com/solutions"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://akubrecah.com" },
          { name: "Solutions", url: "https://akubrecah.com/solutions" },
        ]}
      />

      {/* ============================= HERO SECTION ============================= */}
      <section className="border-b border-outline-variant bg-surface-container-lowest py-10 md:py-12">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 space-y-4">
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <span className="text-on-surface font-medium">Industry Solutions</span>
          </nav>

          <div className="max-w-4xl space-y-3">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Domain Architectures by Sector
            </span>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-on-surface tracking-tight leading-tight">
              Industry solutions tailored to East African regulatory and payment realities.
            </h1>

            <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed max-w-3xl">
              Every industry vertical imposes distinct operational constraints—from KDPA 2019 privacy compliance in citizen portals to callback idempotency in mobile money settlements and offline resilience in transit fleets.
            </p>
          </div>
        </div>
      </section>

      {/* ============================= VERTICALS DIRECTORY ============================= */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-10 md:py-14 space-y-12">
        <div className="divide-y divide-outline-variant border-t border-b border-outline-variant">
          {industryVerticals.map((vertical) => (
            <section
              key={vertical.id}
              id={vertical.id}
              className="py-10 first:pt-8 last:pb-8 scroll-mt-24"
            >
              <div id={vertical.anchorAlias} className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
                {/* Left Column: Sector Title & Specifications Table */}
                <div className="lg:col-span-5 space-y-5">
                  <div className="space-y-1.5">
                    <span className="text-xs font-mono font-semibold text-primary uppercase tracking-wider block">
                      {vertical.sector}
                    </span>
                    <h2 className="text-2xl font-bold text-on-surface tracking-tight">
                      {vertical.title}
                    </h2>
                  </div>

                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {vertical.description}
                  </p>

                  <dl className="bg-surface-container-lowest border border-outline-variant rounded-lg divide-y divide-outline-variant text-xs">
                    {vertical.specs.map((spec) => (
                      <div key={spec.label} className="flex items-center justify-between px-4 py-2.5">
                        <dt className="text-on-surface-variant">{spec.label}</dt>
                        <dd className="font-mono font-semibold text-on-surface text-right">{spec.value}</dd>
                      </div>
                    ))}
                  </dl>

                  <ul className="space-y-2 text-xs sm:text-sm text-on-surface-variant">
                    {vertical.outcomes.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-1">
                    <Button
                      asChild
                      size="lg"
                      className="h-10 px-5 rounded-lg bg-primary text-white font-semibold text-xs hover:bg-primary/90 flex items-center gap-2 w-fit"
                    >
                      <Link href={vertical.ctaHref}>
                        <span>{vertical.ctaText}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Right Column: Clean Reference Figure */}
                <div className="lg:col-span-7">
                  <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
                    <div className="relative aspect-[16/10] bg-surface-container">
                      <Image
                        src={vertical.mockupImage}
                        alt={vertical.mockupAlt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 55vw"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* ============================= CONSULTATION CTA ============================= */}
        <div className="p-8 sm:p-10 rounded-xl bg-surface-container-lowest border border-outline-variant flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
              Need an architecture tailored to your industry requirements?
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Consult with our engineering team to review compliance constraints, payment integrations, and deployment topologies.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              asChild
              size="lg"
              className="h-10 px-6 rounded-lg bg-primary text-white font-semibold text-xs hover:bg-primary/90"
            >
              <Link href="/contact">Schedule Technical Consultation</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-10 px-5 rounded-lg border-outline-variant font-semibold text-xs hover:bg-surface-container"
            >
              <Link href="/products">Explore In-House Products</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
