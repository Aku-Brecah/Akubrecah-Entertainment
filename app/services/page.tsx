import {
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ServiceSchema, BreadcrumbSchema, FaqSchema } from "@/components/seo/site-schema";

export const metadata: Metadata = {
  title: "Engineering Services & Architecture Solutions",
  description:
    "Full-cycle software engineering services: Next.js & React web applications, native iOS & Android mobile systems, AWS/GCP cloud DevOps, and automated GovTech statutory integration.",
  keywords: [
    "Full-Stack Web Engineering Kenya",
    "Next.js SaaS Development",
    "Mobile App Development Nairobi",
    "Cloud DevOps AWS GCP Kenya",
    "Custom Enterprise Architecture Africa",
    "KRA API Gateway Integration",
  ],
  alternates: {
    canonical: "https://akubrecah.com/services",
  },
  openGraph: {
    title: "Engineering Services & Architecture Solutions | Akubrecah",
    description:
      "Full-cycle software engineering: Web applications, native mobile apps, cloud infrastructure, and enterprise automation systems.",
    url: "https://akubrecah.com/services",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Akubrecah Engineering Services",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Engineering Services & Architecture Solutions | Akubrecah",
    description: "Production-grade web apps, mobile ecosystems, cloud DevOps, and enterprise systems.",
    images: ["/og-image.jpg"],
  },
};

const servicesFaqs = [
  {
    question: "What core software engineering services does Akubrecah provide?",
    answer:
      "We deliver four core engineering practices: full-stack web applications and statutory portals (Next.js/TypeScript), Safaricom Daraja M-Pesa payment and ledger systems, cross-platform mobile applications with offline sync, and automated cloud/media processing pipelines.",
  },
  {
    question: "How does Akubrecah align with the Kenya Data Protection Act 2019?",
    answer:
      "Our GovTech gateways utilize in-memory ephemeral parsing pipelines that stream generated PDFs directly from RAM. Citizen tax documents are never saved to persistent disk storage and sensitive identifiers are masked prior to settlement.",
  },
  {
    question: "Can these systems integrate into existing banking and ERP architectures?",
    answer:
      "Yes. All systems offer typed REST/webhook handshakes, dead-letter queue isolation, and automated ledger reconciliations compatible with standard banking and enterprise ERPs.",
  },
];

const servicePractices = [
  {
    id: "govtech",
    anchorAlias: "web",
    practiceCode: "Practice 01 · Web & Statutory Engineering",
    title: "Web Platforms & Statutory Compliance Gateways",
    description:
      "Server-rendered web applications, internal administrative consoles, and statutory document retrieval architecture. Includes automated KRA PIN verification, Kenya P9 tax calculation, and volatile RAM PDF streaming.",
    chips: [
      "Volatile RAM PDF streaming",
      "Zero-disk privacy engine",
      "Encrypted TLS verification",
    ],
    outcomes: [
      "On-demand PDF taxpayer certificate generation with verifiable QR links.",
      "Interactive Kenya P9 income tax calculator and official iTax filing guidance.",
      "Privacy-by-design data minimization aligned with the Kenya Data Protection Act 2019.",
    ],
    stack: ["Next.js", "TypeScript", "Volatile Memory Streams", "Node.js", "PostgreSQL"],
    ctaText: "Inspect Retrieval Portal",
    ctaHref: "/retrieval-portal",
    caption: "Figure 1.1 — KRA Tax Verification & Ephemeral Document Streaming Console",
    mockupImage: "/images/solutions/govtech-gateway.jpg",
    mockupAlt: "KRA Tax Compliance & Verification Interface",
  },
  {
    id: "fintech",
    anchorAlias: "enterprise",
    practiceCode: "Practice 02 · Enterprise & Payment Systems",
    title: "Daraja M-Pesa STK Billing & Ledger Reconciliation",
    description:
      "Financial transaction engines engineered to process mobile money callbacks deterministically. Covers STK push dispatch, fail-closed webhook token verification, and atomic receipt redemption.",
    chips: [
      "Idempotent callback verification",
      "Safaricom Daraja STK Push",
      "PostgreSQL audit ledger",
    ],
    outcomes: [
      "Real-time Safaricom Daraja STK Push & callback ingestion with fail-closed token verification.",
      "Atomic receipt redemption preventing double-spending and duplicate charges.",
      "Automatic STK Query reconciliation when callbacks are delayed.",
    ],
    stack: ["Safaricom Daraja API", "Upstash Redis", "TypeScript", "PostgreSQL", "Docker"],
    ctaText: "Discuss Payment Architecture",
    ctaHref: "/contact?solution=fintech",
    caption: "Figure 1.2 — Daraja M-Pesa Express STK Callback & Reconciliation Pipeline",
    mockupImage: "/images/solutions/mpesa-reconciliation.jpg",
    mockupAlt: "M-Pesa STK Push Pipeline and Reconciliation Dashboard",
  },
  {
    id: "transit",
    anchorAlias: "mobile",
    practiceCode: "Practice 03 · Mobile Application Ecosystems",
    title: "Native & Cross-Platform Mobile Engineering",
    description:
      "iOS, Android, and React Native applications built for field operations and East African mobility corridors. Consolidates live GPS telemetry, offline-tolerant state synchronization, and mobile money checkout.",
    chips: [
      "Offline-first mobile sync",
      "Live WebSocket geolocation",
      "M-Pesa fare integration",
    ],
    outcomes: [
      "Live vehicle geolocation tracking and geo-fenced terminal queue orchestration.",
      "Offline-tolerant mobile synchronization designed for variable cellular networks.",
      "Dynamic dispatch tooling tailored for urban Nairobi transit corridors.",
    ],
    stack: ["React Native / Expo", "WebSocket Gateways", "GeoJSON", "Google Maps", "PostgreSQL"],
    ctaText: "Read Mobile Case Study",
    ctaHref: "/projects/swiftboda-ride",
    caption: "Figure 1.3 — Real-Time Fleet Telemetry & Dispatch Application",
    mockupImage: "/images/solutions/nairobi-fleet-telematics.jpg",
    mockupAlt: "Nairobi Metro Fleet Telemetry and Dispatch Interface",
  },
  {
    id: "media",
    anchorAlias: "cloud",
    practiceCode: "Practice 04 · Cloud Infrastructure & Media Workers",
    title: "Cloud DevOps & Automated Media Processing Pipelines",
    description:
      "Containerized worker fleets and CI/CD pipelines orchestrating background jobs, audio transcription, English/Swahili subtitle localization, and multi-bitrate media transcoding.",
    chips: [
      "Containerized cloud workers",
      "English & Swahili NLP",
      "Automated FFmpeg pipelines",
    ],
    outcomes: [
      "Automated media segmentation and frame-accurate clip rendering workflows.",
      "Speech recognition and subtitle alignment for East African broadcast content.",
      "Multi-bitrate H.264/WebM transcoding optimized for bandwidth-constrained networks.",
    ],
    stack: ["Docker", "FFmpeg Filtergraphs", "Faster-Whisper", "Python", "CI/CD Pipelines"],
    ctaText: "View Pipeline Case Study",
    ctaHref: "/projects/AutoChop",
    caption: "Figure 1.4 — Containerized Video Transcoding & Subtitle Alignment Worker",
    mockupImage: "/images/solutions/aetherflow-video-pipeline.jpg",
    mockupAlt: "Aetherflow Video AI Transcoding and Localization Interface",
  },
];

const engineeringHighlights = [
  {
    step: "01",
    title: "OWASP-Hardened Standards",
    desc: "Input validation, rate limiting, zero-secret source control, and strict authorization checks enforced across every server route.",
  },
  {
    step: "02",
    title: "Clean Code & Architecture",
    desc: "Domain-driven boundaries, single-responsibility services, strict TypeScript typing, and automated test coverage per vertical slice.",
  },
  {
    step: "03",
    title: "Telemetry & Observability",
    desc: "Structured audit logging, upstream latency tracking, and automated health checks across database, auth, and payment dependencies.",
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <ServiceSchema
        name="Engineering Services & Architecture Solutions"
        description="Full-cycle software engineering services: Next.js & React web applications, native iOS & Android mobile systems, AWS/GCP cloud DevOps, and automated GovTech statutory integration."
        serviceType="Software Engineering & Enterprise Architecture"
        url="https://akubrecah.com/services"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://akubrecah.com" },
          { name: "Services", url: "https://akubrecah.com/services" },
        ]}
      />
      <FaqSchema items={servicesFaqs} />

      {/* ============================= HERO SECTION ============================= */}
      <section className="border-b border-outline-variant bg-surface-container-lowest py-10 md:py-12">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 space-y-4">
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <span className="text-on-surface font-medium">Engineering Services</span>
          </nav>

          <div className="max-w-4xl space-y-3">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Technical Capabilities &amp; Delivery Practices
            </span>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-on-surface tracking-tight leading-tight">
              Full-cycle software engineering across web, mobile, payments, and cloud.
            </h1>

            <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed max-w-3xl">
              We design, build, and maintain production software systems for organizations in Kenya and East Africa—combining typed full-stack architectures with local payment and regulatory integrations.
            </p>
          </div>

          {/* Practice Quick-Jump Index */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-outline-variant text-xs">
            <a href="#web" className="group block p-3 rounded-lg bg-surface-container-low border border-outline-variant hover:border-primary/50 transition-colors">
              <span className="font-mono text-primary font-semibold">01</span>
              <p className="font-semibold text-on-surface group-hover:text-primary mt-0.5">Web &amp; GovTech</p>
            </a>
            <a href="#enterprise" className="group block p-3 rounded-lg bg-surface-container-low border border-outline-variant hover:border-primary/50 transition-colors">
              <span className="font-mono text-primary font-semibold">02</span>
              <p className="font-semibold text-on-surface group-hover:text-primary mt-0.5">Daraja &amp; Ledgers</p>
            </a>
            <a href="#mobile" className="group block p-3 rounded-lg bg-surface-container-low border border-outline-variant hover:border-primary/50 transition-colors">
              <span className="font-mono text-primary font-semibold">03</span>
              <p className="font-semibold text-on-surface group-hover:text-primary mt-0.5">Mobile Systems</p>
            </a>
            <a href="#cloud" className="group block p-3 rounded-lg bg-surface-container-low border border-outline-variant hover:border-primary/50 transition-colors">
              <span className="font-mono text-primary font-semibold">04</span>
              <p className="font-semibold text-on-surface group-hover:text-primary mt-0.5">Cloud &amp; Pipelines</p>
            </a>
          </div>
        </div>
      </section>

      {/* ============================= ENGINEERING PRACTICE SPECIFICATIONS ============================= */}
      <div className="py-10 md:py-14 space-y-10">
        {servicePractices.map((card) => (
          <section
            key={card.id}
            id={card.id}
            className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 scroll-mt-24"
          >
            <div id={card.anchorAlias} className="scroll-mt-24 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 sm:p-8 lg:p-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
                {/* Specification Column */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="space-y-1.5">
                    <span className="text-xs font-mono font-semibold text-primary uppercase tracking-wider block">
                      {card.practiceCode}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight leading-snug">
                      {card.title}
                    </h2>
                  </div>

                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {card.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {card.chips.map((chip) => (
                      <span
                        key={chip}
                        className="inline-flex items-center px-2.5 py-1 rounded bg-surface-container-low text-xs font-medium text-on-surface border border-outline-variant"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>

                  {/* Key Engineering Deliverables (tested in tests/messages.test.ts) */}
                  <div className="space-y-2 pt-2 border-t border-outline-variant/60">
                    <span className="text-xs font-semibold text-on-surface uppercase tracking-wider block">
                      Key Engineering Deliverables
                    </span>
                    <ul className="space-y-2 text-xs sm:text-sm text-on-surface-variant">
                      {card.outcomes.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Technology Stack (tested in tests/messages.test.ts) */}
                  <div className="space-y-2 pt-2 border-t border-outline-variant/60">
                    <span className="text-xs font-semibold text-on-surface uppercase tracking-wider block">
                      Technology Stack
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {card.stack.map((tech) => (
                        <span
                          key={tech}
                          className="text-xs font-mono px-2.5 py-0.5 rounded bg-surface-container-low text-on-surface-variant border border-outline-variant"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      asChild
                      size="lg"
                      className="h-10 px-5 rounded-lg bg-primary text-white font-semibold text-xs hover:bg-primary/90 flex items-center gap-2 w-fit"
                    >
                      <Link href={card.ctaHref}>
                        <span>{card.ctaText}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Clean Architectural Figure Frame (no fake macOS dots) */}
                <figure className="lg:col-span-5 rounded-lg border border-outline-variant bg-surface-container-low overflow-hidden">
                  <div className="relative aspect-[16/10] bg-surface-container">
                    <Image
                      src={card.mockupImage}
                      alt={card.mockupAlt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 42vw"
                    />
                  </div>
                  <figcaption className="px-4 py-2.5 border-t border-outline-variant text-[11px] font-mono text-on-surface-variant bg-surface-container-lowest">
                    {card.caption}
                  </figcaption>
                </figure>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* ============================= QUALITY ASSURANCE STANDARDS ============================= */}
      <section className="py-12 border-t border-outline-variant bg-surface-container-lowest">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 space-y-8">
          <div className="border-b border-outline-variant pb-4">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Quality Assurance
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-on-surface mt-1">
              Verification Standards Applied to Every Engagement
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {engineeringHighlights.map((item) => (
              <div
                key={item.title}
                className="pt-4 border-t-2 border-outline-variant space-y-2"
              >
                <span className="text-xs font-mono font-semibold text-primary">
                  {item.step}
                </span>
                <h3 className="text-base font-bold text-on-surface">{item.title}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================= CONSULTATION CTA ============================= */}
      <section className="py-12 border-t border-outline-variant bg-surface">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="p-8 sm:p-10 rounded-xl bg-surface-container-lowest border border-outline-variant flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-2xl">
              <h2 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
                Scope an engineering engagement with our team
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                Share your system requirements or evaluate timelines and deliverables using our project scope estimator.
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
                <Link href="/estimator">Interactive Cost Estimator</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
