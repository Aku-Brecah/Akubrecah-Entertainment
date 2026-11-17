import type { Metadata } from "next"
import Link from "next/link"
import { Shield, FileText, AlertTriangle, Cookie, RotateCcw, Ban, ArrowRight, ExternalLink, Scale, CheckCircle2 } from "lucide-react"

export const metadata: Metadata = {
  title: "Legal & Compliance Center | Akubrecah Technologies",
  description: "Legal policies, terms of service, acceptable use standards, privacy protections, and compliance information for Akubrecah Technologies.",
  alternates: {
    canonical: "https://akubrecah.com/legal",
  },
  openGraph: {
    title: "Legal & Compliance Center | Akubrecah Technologies",
    description: "Legal policies, terms of service, acceptable use standards, and KDPA 2019 compliance information.",
    url: "https://akubrecah.com/legal",
    type: "website",
    images: ["/og-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Legal & Compliance Center | Akubrecah",
    description: "Legal policies, terms of service, and KDPA 2019 compliance information.",
    images: ["/og-image.jpg"],
  },
}

const legalDocs = [
  {
    icon: AlertTriangle,
    title: "Statutory Disclaimer",
    description:
      "Clarifies that Akubrecah is NOT the Kenya Revenue Authority (KRA). Outlines our third-party independence, real-time data sourcing, and limits of liability.",
    href: "/legal/disclaimer",
    tag: "Mandatory Disclosure",
    tagColor: "text-primary bg-primary/10 border-primary/20",
    badge: "Important",
    featured: true,
  },
  {
    icon: Shield,
    title: "Privacy Policy",
    description:
      "How we collect, process, and protect your personal data under Kenya's Data Protection Act 2019 (KDPA). Covers ID data, zero unmasked caching, and your rights.",
    href: "/legal/privacy",
    tag: "Data Protection Act 2019",
    tagColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    icon: FileText,
    title: "Terms of Service",
    description:
      "The binding agreement governing your use of Akubrecah. Covers acceptable use, convenience fees, liability limits, and Republic of Kenya governing law.",
    href: "/legal/terms",
    tag: "Binding Agreement",
    tagColor: "text-primary bg-primary/10 border-primary/20",
  },
  {
    icon: RotateCcw,
    title: "Refund Policy",
    description:
      "Our 100% Delivery or Refund guarantee. Outlines service fee rules, delivery failure refund procedures, and M-Pesa reversal timelines.",
    href: "/legal/refund",
    tag: "Payments & Protection",
    tagColor: "text-primary bg-primary/10 border-primary/20",
  },
  {
    icon: Ban,
    title: "Acceptable Use Policy",
    description:
      "Statutory rules of conduct. Strictly prohibits querying third-party taxpayer data without consent, automated scraping, phishing, and fraudulent misuse.",
    href: "/legal/aup",
    tag: "User Conduct",
    tagColor: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    icon: Cookie,
    title: "Cookie Policy",
    description:
      "Details our minimal cookie footprint. We use strictly functional Clerk authentication session cookies — zero advertising, tracking, or surveillance cookies.",
    href: "/legal/cookies",
    tag: "Zero Ad Tracking",
    tagColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
]

export default function LegalIndexPage() {
  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-card dark:bg-slate-900 border border-border/80 dark:border-slate-800 p-6 sm:p-10 shadow-xs">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
              <Scale className="w-3.5 h-3.5" />
              Statutory Compliance Center
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-surface-container dark:bg-slate-800 text-on-surface-variant border border-border">
              Republic of Kenya
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-foreground">
            Legal & Compliance Center
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            All institutional policies, terms of service, acceptable use standards, and statutory disclaimers governing
            the Akubrecah Compliance Portal.
          </p>

          <div className="p-4 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-foreground/90 font-medium leading-relaxed">
              <strong>Mandatory Notice:</strong> Akubrecah is an independent third-party convenience software service
              and is <strong>NOT</strong> the Kenya Revenue Authority (KRA) or any government agency. Official KRA services
              are available free of charge at{" "}
              <a
                href="https://itax.kra.go.ke"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline font-bold"
              >
                itax.kra.go.ke
              </a>.
            </p>
          </div>
        </div>
      </div>

      {/* Legal Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {legalDocs.map((doc) => {
          const Icon = doc.icon
          return (
            <Link
              key={doc.href}
              href={doc.href}
              className={`group flex flex-col justify-between p-6 rounded-3xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${
                doc.featured
                  ? "bg-surface-card dark:bg-slate-900 border-primary/40 shadow-xs"
                  : "bg-surface-card dark:bg-slate-900 border-border/80 dark:border-slate-800 hover:border-primary/30"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-surface-container dark:bg-slate-800 border border-border flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-2xs">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${doc.tagColor}`}>
                    {doc.tag}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-sm font-black uppercase tracking-tight text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                    {doc.title}
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {doc.description}
                  </p>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-border/60 flex items-center justify-between text-xs font-bold text-primary">
                <span>Read Full Policy</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Official Government Portals Callout */}
      <div className="rounded-3xl bg-surface-card dark:bg-slate-900 border border-border p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Direct Official Government Services
            </span>
            <h3 className="text-base font-bold text-foreground">
              Prefer Free Manual Government Portals?
            </h3>
            <p className="text-xs text-muted-foreground">
              You can access your KRA PIN certificate directly on the official portal at zero cost.
            </p>
          </div>
          <a
            href="https://itax.kra.go.ke"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container dark:bg-slate-800 border border-border text-xs font-bold text-foreground hover:bg-muted transition-all active:scale-95 shrink-0"
          >
            <span>Visit itax.kra.go.ke</span>
            <ExternalLink className="w-3.5 h-3.5 text-primary" />
          </a>
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <p>All legal documents last reviewed: <strong>10 June 2026</strong> · Akubrecah Entertainment</p>
        <div className="flex items-center gap-4">
          <a href="mailto:legal@akubrecah.com" className="text-primary hover:underline font-bold">
            legal@akubrecah.com
          </a>
          <span>•</span>
          <Link href="/contact" className="hover:text-foreground">
            Support Desk
          </Link>
        </div>
      </div>
    </div>
  )
}
