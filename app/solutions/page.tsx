import {
  ArrowRight,
  Bus,
  CheckCircle2,
  CreditCard,
  Landmark,
  Lock,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ServiceSchema, BreadcrumbSchema } from "@/components/seo/site-schema";

export const metadata: Metadata = {
  title: "Industry Solutions: Sovereign & Enterprise Infrastructure | Akubrecah",
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

const solutionCards = [
  {
    id: "govtech",
    categoryPill: "GOVTECH & REGULATORY",
    icon: Landmark,
    title: "Automated Sovereign Tax Verification & KRA Gateway",
    description:
      "Direct cryptographic interoperability with national tax ledgers. Automated KRA PIN retrieval, real-time Nil returns submission, and compliant ephemeral validation with zero unencrypted taxpayer data retention.",
    chips: [
      "Sub-120ms PDF generation",
      "Zero-cache privacy engine",
      "Official iTax API handshake",
    ],
    outcomes: [
      "Instant signed PDF taxpayer certificate generation with verified QR hash.",
      "One-click Nil filing flow with immediate KRA acknowledgment receipt delivery.",
      "Strict compliance with Kenya Data Protection Act 2019 via in-memory ephemeral parsing.",
    ],
    ctaText: "Explore GovTech Engine",
    ctaHref: "/retrieval-portal",
    mockupTitle: "kra.govtech.portal / audit-console",
    mockupImage: "/images/solutions/govtech-gateway.jpg",
    mockupAlt: "KRA Tax Compliance & Verification Interface",
    isReversed: false,
    isDarkMockup: false,
  },
  {
    id: "fintech",
    categoryPill: "FINTECH & SETTLEMENT",
    icon: CreditCard,
    title: "High-Concurrency Daraja M-Pesa STK & Ledger Reconciliation",
    description:
      "Resilient financial transaction engine designed to eliminate payment dropouts during peak mobile money traffic. Instant STK push triggers, idempotent webhook queues, and automated treasury ledger reconciliations.",
    chips: [
      "99.998% STK callback capture",
      "Under 1.2s settlement cycle",
      "KES 210M+ daily clearing",
    ],
    outcomes: [
      "Real-time Safaricom Daraja C2B/B2C webhook ingestion with dead-letter isolation.",
      "Instant cryptographic matching against internal core banking balances.",
      "Automatic retry backoffs guaranteeing zero duplicate charges or unverified slips.",
    ],
    ctaText: "Review Fintech Architecture",
    ctaHref: "/contact?solution=fintech",
    mockupTitle: "M-PESA ENTERPRISE GATEWAY • RECON ENGINE",
    mockupImage: "/images/solutions/mpesa-reconciliation.jpg",
    mockupAlt: "M-Pesa STK Push Pipeline and Reconciliation Dashboard",
    isReversed: true,
    isDarkMockup: true,
  },
  {
    id: "transit",
    categoryPill: "TRANSIT & MOBILITY",
    icon: Bus,
    title: "Real-Time Nairobi Fleet Telematics & Dynamic Route Dispatch",
    description:
      "Mission-critical routing engine built for East African transit corridors. Consolidates real-time GPS telemetry, passenger tap-and-go fare collection, and congestion-adaptive dispatch schedules.",
    chips: [
      "94% ETA precision in heavy traffic",
      "19% fleet fuel reduction",
      "Sub-second telemetry sync",
    ],
    outcomes: [
      "Live vehicle geolocation tracking and geo-fenced terminal queue orchestration.",
      "Offline-first contactless tap-and-pay validators synchronizing across cellular edges.",
      "Dynamic rerouting around Nairobi arterial bottlenecks (Mombasa Rd, Thika Superhighway).",
    ],
    ctaText: "Inspect Fleet Platform",
    ctaHref: "/projects/swiftboda-ride",
    mockupTitle: "NAIROBI METRO TELEMETRY DISPATCH",
    mockupImage: "/images/solutions/nairobi-fleet-telematics.jpg",
    mockupAlt: "Nairobi Metro Fleet Telemetry and Dispatch Interface",
    isReversed: false,
    isDarkMockup: true,
  },
  {
    id: "media",
    categoryPill: "MEDIA AI & WORKFLOW",
    icon: Sparkles,
    title: "Intelligent Video Transcoding & Localization Automation",
    description:
      "Automated studio pipelines orchestrating audio context extraction, multi-dialect translation (English and Swahili NLP), automatic subtitle burning, and multi-format edge streaming.",
    chips: [
      "4.2x real-time render velocity",
      "99.4% Swahili/English accuracy",
      "Multi-OS binary output",
    ],
    outcomes: [
      "Automated news broadcast and commercial segmentation with frame-accurate cuts.",
      "Specialized East African dialect speech recognition and auto-caption alignment.",
      "Instant multi-bitrate H.264/WebM transcoding for bandwidth-constrained networks.",
    ],
    ctaText: "View Media AI Specs",
    ctaHref: "/projects/AutoChop",
    mockupTitle: "AETHERFLOW AI PIPELINE RUNNER",
    mockupImage: "/images/solutions/aetherflow-video-pipeline.jpg",
    mockupAlt: "Aetherflow Video AI Transcoding and Localization Interface",
    isReversed: true,
    isDarkMockup: true,
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
      <section className="border-b border-outline-variant/60 bg-surface-container-lowest py-12 md:py-16">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="max-w-4xl space-y-4">
            {/* Institutional Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full border border-outline-variant">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] sm:text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                ENGINEERED FOR SOVEREIGN SCALE &amp; MISSION-CRITICAL UPTIME
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-on-surface tracking-tight leading-tight">
              Industry Solutions:{" "}
              <span className="text-primary">
                Sovereign &amp; Enterprise Infrastructure
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed max-w-3xl">
              High-assurance digital platforms, compliance engines, and automated clearing pipelines built specifically for East Africa&apos;s regulatory, banking, and real-time transit landscape.
            </p>

            {/* Metrics Counter Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-outline-variant/60">
              <div className="border-l-2 border-primary pl-4 space-y-0.5">
                <div className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
                  99.98%
                </div>
                <div className="text-xs text-on-surface-variant font-medium">
                  Gateway SLA
                </div>
              </div>
              <div className="border-l-2 border-primary pl-4 space-y-0.5">
                <div className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
                  &lt;120ms
                </div>
                <div className="text-xs text-on-surface-variant font-medium">
                  Document Handshake
                </div>
              </div>
              <div className="border-l-2 border-primary pl-4 space-y-0.5">
                <div className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
                  KES 10B+
                </div>
                <div className="text-xs text-on-surface-variant font-medium">
                  Volume Routed
                </div>
              </div>
              <div className="border-l-2 border-primary pl-4 space-y-0.5">
                <div className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
                  100%
                </div>
                <div className="text-xs text-on-surface-variant font-medium">
                  Data Protection Act
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================= SOLUTION CARDS ============================= */}
      <div className="py-12 md:py-16 space-y-12 md:space-y-16">
        {solutionCards.map((card) => {
          const Icon = card.icon;
          return (
            <section
              key={card.id}
              id={card.id}
              className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12"
            >
              <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 lg:p-10 shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                  {/* Text Column */}
                  <div
                    className={`lg:col-span-6 space-y-5 ${
                      card.isReversed ? "order-1 lg:order-2" : "order-1"
                    }`}
                  >
                    {/* Category Pill */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container rounded-lg border border-outline-variant">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                        {card.categoryPill}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight leading-snug">
                      {card.title}
                    </h2>

                    {/* Description */}
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      {card.description}
                    </p>

                    {/* Metric Chips */}
                    <div className="flex flex-wrap gap-2 py-1">
                      {card.chips.map((chip) => (
                        <span
                          key={chip}
                          className="inline-flex items-center px-3 py-1 rounded-md bg-surface-container-low text-xs font-semibold text-on-surface border border-outline-variant"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>

                    {/* Bullet Outcomes */}
                    <ul className="space-y-2.5 text-xs sm:text-sm text-on-surface">
                      {card.outcomes.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Action Button */}
                    <div className="pt-2">
                      <Button
                        asChild
                        size="lg"
                        className="h-11 px-6 rounded-lg bg-primary text-white font-bold text-xs hover:bg-primary/90 flex items-center gap-2 group transition-all"
                      >
                        <Link href={card.ctaHref}>
                          <span>{card.ctaText}</span>
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Window Mockup Frame */}
                  <div
                    className={`lg:col-span-6 ${
                      card.isReversed
                        ? "order-2 lg:order-1"
                        : "order-2"
                    }`}
                  >
                    <div
                      className={`rounded-2xl border p-2 shadow-sm ${
                        card.isDarkMockup
                          ? "border-stone-800 bg-[#0c1017]"
                          : "border-outline-variant bg-surface-container-low"
                      }`}
                    >
                      <div
                        className={`flex items-center justify-between px-3.5 py-2 border-b rounded-t-xl ${
                          card.isDarkMockup
                            ? "border-stone-800 bg-[#131924]"
                            : "border-outline-variant bg-surface-container-lowest"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              card.isDarkMockup
                                ? "bg-stone-700"
                                : "bg-outline-variant"
                            }`}
                          />
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              card.isDarkMockup
                                ? "bg-stone-700"
                                : "bg-outline-variant"
                            }`}
                          />
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              card.isDarkMockup
                                ? "bg-stone-700"
                                : "bg-outline-variant"
                            }`}
                          />
                        </div>
                        <div
                          className={`text-[10px] font-mono ${
                            card.isDarkMockup
                              ? "text-stone-400"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {card.mockupTitle}
                        </div>
                      </div>
                      <div
                        className={`overflow-hidden rounded-b-xl relative aspect-[16/10] ${
                          card.isDarkMockup
                            ? "bg-stone-950"
                            : "bg-surface-container"
                        }`}
                      >
                        <Image
                          src={card.mockupImage}
                          alt={card.mockupAlt}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 100vw, 50vw"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* ============================= BOTTOM CTA BAND (Obsidian Sovereign Theme) ============================= */}
      <section className="bg-[#111315] text-white py-16 lg:py-20 border-t border-stone-800">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Deploy Sovereign Infrastructure with Akubrecah
          </h2>
          <p className="text-base sm:text-lg text-stone-300 max-w-2xl mx-auto leading-relaxed">
            Partner with East Africa&apos;s leading GovTech and systems engineering team to build resilient, compliant software.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button
              asChild
              size="lg"
              className="h-12 px-7 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
            >
              <Link href="/contact">Schedule Technical Consultation</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-7 rounded-lg border-stone-700 bg-transparent text-white font-bold text-sm hover:bg-stone-800 transition-colors"
            >
              <Link href="/products">Explore Developer APIs</Link>
            </Button>
          </div>

          {/* Trust Seals */}
          <div className="pt-8 border-t border-stone-800/80 flex flex-wrap items-center justify-center gap-6 text-xs text-stone-400 font-medium">
            <div className="flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-primary" />
              <span>256-Bit SSL Handshake</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-stone-700" />
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Data Protection Act 2019 Certified</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-stone-700" />
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-primary" />
              <span>99.98% Production Uptime</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
