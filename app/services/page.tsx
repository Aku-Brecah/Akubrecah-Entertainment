import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight } from "lucide-react";
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
    title: "Engineering Services & Architecture Solutions | Akubrecah Technologies",
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
    question: "What core software engineering technologies does Akubrecah specialize in?",
    answer: "We specialize in modern web platforms using Next.js 15, React 19, and TypeScript; mobile applications using Swift/SwiftUI, Kotlin/Compose, and React Native; and cloud infrastructure using AWS, GCP, Docker, and Kubernetes.",
  },
  {
    question: "Does Akubrecah build integrations for Kenya Revenue Authority (KRA) and M-Pesa?",
    answer: "Yes. We have deep expertise in building high-throughput payment gateways with Safaricom Daraja M-Pesa APIs (STK Push, C2B, B2C) and integrating with government statutory systems like KRA iTax, eCitizen, and NTSA.",
  },
  {
    question: "How does Akubrecah ensure system security and data privacy?",
    answer: "We enforce security-by-default on every build: OWASP compliance, encrypted TLS transmission, strict role-based access control (RBAC), automated vulnerability scanning in CI/CD, and adherence to the Kenya Data Protection Act 2019.",
  },
];

const services = [
  {
    id: "web",
    tag: "Full-Stack Web Engineering",
    title: "Web Applications & Scalable SaaS",
    subtitle: "Production-grade Next.js, React, and strict TypeScript systems",
    description: "We build resilient, server-rendered and statically generated web applications engineered for speed, search discovery, and enterprise security. Designed to handle high concurrent traffic with fast, dependable response times.",
    href: "/contact?service=web",
    ctaText: "Discuss Web Project",
    features: [
      "Server-rendered Next.js 15 & React 19 architecture",
      "Optimized Core Web Vitals and fast rendering across devices",
      "Strict end-to-end TypeScript with runtime validation",
      "Multi-tenant SaaS architecture & automated M-Pesa billing",
      "WCAG 2.1 AA accessibility & semantic HTML standards",
      "Automated CI/CD pipelines & zero-downtime deployment",
    ],
    stack: ["Next.js 15", "React 19", "TypeScript", "Tailwind CSS", "Prisma ORM", "PostgreSQL"],
  },
  {
    id: "mobile",
    tag: "Native & Universal Mobile",
    title: "Mobile App Ecosystems",
    subtitle: "Native iOS, Android, and cross-platform React Native apps",
    description: "From native Swift/SwiftUI and Kotlin/Jetpack to cross-platform React Native with offline-first synchronization, we engineer mobile applications that deliver smooth, reliable experiences in any network condition.",
    href: "/contact?service=mobile",
    ctaText: "Discuss Mobile App",
    features: [
      "Universal iOS (Swift/SwiftUI) & Android (Kotlin/Compose)",
      "Offline-first local SQLite caching with auto-sync",
      "Biometric security (FaceID/Fingerprint) & hardware APIs",
      "Push notification systems (APNs, FCM) & deep linking",
      "M-Pesa STK Push and mobile money checkout SDKs",
      "App Store & Google Play release pipelines",
    ],
    stack: ["React Native", "Swift / SwiftUI", "Kotlin / Compose", "SQLite", "Expo", "Firebase"],
  },
  {
    id: "cloud",
    tag: "Cloud Architecture & DevOps",
    title: "Cloud Infrastructure & GitOps",
    subtitle: "Container orchestration, Terraform IaC, and resilient microservices",
    description: "We architect secure, scalable cloud infrastructure across AWS, GCP, and Azure. Automated GitOps CI/CD pipelines, container orchestration, and continuous monitoring eliminate manual operations and deployment risks.",
    href: "/contact?service=cloud",
    ctaText: "Discuss Cloud Architecture",
    features: [
      "Docker & Kubernetes container orchestration at scale",
      "Infrastructure as Code (IaC) with Terraform & Pulumi",
      "Multi-region failover, blue-green & canary deployments",
      "Automated GitHub Actions CI/CD with security scanning",
      "Edge CDN caching, DDoS mitigation, and WAF setup",
      "High-availability PostgreSQL & Redis clustering with PITR",
    ],
    stack: ["AWS / GCP", "Docker & K8s", "Terraform", "GitHub Actions", "Redis", "Cloudflare"],
  },
  {
    id: "enterprise",
    tag: "GovTech & Enterprise Systems",
    title: "Enterprise & Statutory Integration",
    subtitle: "High-throughput APIs, ERP connectors, and compliance portals",
    description: "Bespoke digital transformation for enterprises and statutory agencies. We engineer high-throughput transaction gateways, automated statutory compliance pipelines, and custom back-office operations systems.",
    href: "/contact?service=enterprise",
    ctaText: "Discuss Enterprise Systems",
    features: [
      "M-Pesa Daraja API integration (STK Push, C2B, B2C, B2B)",
      "KRA iTax, eCitizen, NTSA, and statutory API connectors",
      "Cryptographic PDF generation and automated digital signing",
      "Granular Role-Based Access Control (RBAC) & audit logging",
      "ERP / HRMS / Accounting integrations (SAP, Sage, custom)",
      "High-throughput event streaming with Kafka or RabbitMQ",
    ],
    stack: ["Node.js", "Python / FastAPI", "PostgreSQL", "M-Pesa Daraja", "Apache Kafka", "Docker"],
  },
];

const engineeringHighlights = [
  {
    step: "01",
    title: "OWASP-Hardened Standards",
    desc: "Vulnerability assessments, zero-trust network policies, rate-limiting, and automated SAST/DAST scans on every pull request.",
  },
  {
    step: "02",
    title: "Clean Code & Architecture",
    desc: "Domain-driven design, single-responsibility modules, strict typing, and comprehensive test coverage across every vertical slice.",
  },
  {
    step: "03",
    title: "Telemetry & Observability",
    desc: "Integrated real-time error tracking, distributed tracing, and automated health checks ensure immediate visibility into system vitals.",
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <ServiceSchema
        name="Enterprise Software & GovTech Engineering"
        description="Full-cycle software engineering services: Next.js & React web applications, native iOS & Android mobile systems, AWS/GCP cloud DevOps, and automated GovTech statutory integration."
        serviceType="Software Engineering & Cloud Architecture"
        url="https://akubrecah.com/services"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://akubrecah.com" },
          { name: "Services", url: "https://akubrecah.com/services" },
        ]}
      />
      <FaqSchema items={servicesFaqs} />

      {/* Page Hero */}
      <div className="bg-surface-container-lowest border-b border-outline-variant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 space-y-6">
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <span className="text-on-surface font-semibold">Engineering Capabilities</span>
          </nav>
          <div className="max-w-3xl space-y-4">
            <span className="text-xs font-black text-primary uppercase tracking-widest">Capabilities & Services</span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-on-surface tracking-tight leading-tight">
              Software Engineering<br />
              <span className="text-primary">Built for Production Scale.</span>
            </h1>
            <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl leading-relaxed">
              We design, build, and deploy production-grade digital products. From high-throughput financial infrastructure to mission-critical mobile ecosystems.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 space-y-16">

        {/* Services Showcase */}
        {services.map((service) => {
          return (
            <div 
              key={service.id} 
              id={service.id} 
              className="p-8 sm:p-12 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 inline-block mb-2">
                    {service.tag}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">{service.title}</h2>
                  <p className="text-sm font-semibold text-primary mt-1">{service.subtitle}</p>
                </div>
                <Link href={service.href}>
                  <Button className="h-11 px-6 rounded-xl bg-primary text-white font-bold text-xs flex items-center gap-2 group w-fit">
                    {service.ctaText} <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>

              <div>
                <p className="text-sm text-on-surface-variant leading-relaxed max-w-4xl">{service.description}</p>
              </div>

              {/* Deliverables & Capabilities */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">Key Engineering Deliverables</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {service.features.map((feat) => (
                    <div key={feat} className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-surface-container text-xs font-medium text-on-surface">
                      <span className="text-primary font-bold shrink-0 leading-tight">•</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technology Stack */}
              <div className="space-y-2 pt-2 border-t border-outline-variant/60">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">Technology Stack</span>
                <div className="flex flex-wrap gap-2">
                  {service.stack.map((tech) => (
                    <span key={tech} className="text-xs font-semibold px-3 py-1 rounded-xl bg-surface-container text-on-surface border border-outline-variant">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* Highlights Section */}
        <div className="space-y-8 pt-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-black text-primary uppercase tracking-widest">Quality Assurance</span>
            <h2 className="text-3xl font-black text-on-surface">Engineering Standards Built Into Every Sprint</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {engineeringHighlights.map((item) => {
              return (
                <div key={item.title} className="p-7 rounded-3xl bg-surface-container-lowest border border-outline-variant space-y-4 shadow-soft">
                  <span className="text-xs font-mono font-black text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20 w-fit inline-block">
                    {item.step}
                  </span>
                  <h3 className="text-lg font-bold text-on-surface">{item.title}</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="p-10 sm:p-14 rounded-3xl bg-primary text-white text-center space-y-5">
          <h2 className="text-3xl font-black">Not Sure Which Capability Fits Your Needs?</h2>
          <p className="text-white/80 text-sm max-w-lg mx-auto">
            Book a 30-minute architecture discovery session. Our principal engineers will review your objectives and outline a concrete technical roadmap.
          </p>
          <Link href="/contact">
            <Button size="lg" className="h-12 px-8 rounded-xl bg-white text-primary font-bold text-sm flex items-center gap-2 mx-auto group">
              Book Discovery Session <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

      </div>
    </div>
  );
}
