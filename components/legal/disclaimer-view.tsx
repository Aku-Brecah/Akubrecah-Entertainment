"use client"

import React, { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  Shield,
  Building2,
  ExternalLink,
  Printer,
  Share2,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Info,
  Phone,
  Mail,
  FileText,
  Lock,
  ArrowRight,
  Scale,
  Clock,
  MapPin,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react"
import toast from "react-hot-toast"

const SECTIONS = [
  { id: "independence", title: "1. Independence from KRA", badge: "Statutory Status" },
  { id: "accuracy", title: "2. Data Sourcing & Accuracy", badge: "Real-time Sync" },
  { id: "no-advice", title: "3. No Legal or Tax Advice", badge: "Advisory Limit" },
  { id: "availability", title: "4. Service Availability & Uptime", badge: "Infrastructure" },
  { id: "user-responsibility", title: "5. User Responsibility & Ownership", badge: "Compliance" },
  { id: "convenience-fees", title: "6. Convenience Fees & Free Options", badge: "Transparency" },
  { id: "external-links", title: "7. Official Portals Directory", badge: "Directory" },
  { id: "statutory-framework", title: "8. Kenyan Regulatory Compliance", badge: "Statutes" },
  { id: "contact", title: "9. Legal & Escalation Directory", badge: "Contact" },
]

const OFFICIAL_PORTALS = [
  {
    name: "Kenya Revenue Authority (KRA)",
    url: "https://www.kra.go.ke",
    purpose: "Official statutory tax administration portal",
    free: true,
  },
  {
    name: "KRA iTax Portal",
    url: "https://itax.kra.go.ke",
    purpose: "Direct self-service tax returns, PIN checks, and TCC applications",
    free: true,
  },
  {
    name: "eCitizen Government Gateway",
    url: "https://www.ecitizen.go.ke",
    purpose: "National digital identifier & integrated public service gateway",
    free: true,
  },
  {
    name: "Huduma Kenya",
    url: "https://www.hudumakenya.go.ke",
    purpose: "In-person public services and KRA desk assistance across 52+ centres",
    free: true,
  },
]

const FAQS = [
  {
    q: "Why does Akubrecah charge a fee when KRA's portal is free?",
    a: "Kenya Revenue Authority provides free manual access on itax.kra.go.ke. Akubrecah charges an optional convenience fee to cover server automation infrastructure, CAPTCHA decoding, PDF generation, instant WhatsApp document delivery, and 24/7 client retrieval assistance without requiring an iTax account password.",
  },
  {
    q: "Can Akubrecah amend, alter, or backdate my KRA records?",
    a: "No. Akubrecah is strictly a read-and-retrieval platform. We have zero authority to alter taxpayer records, waive tax penalties, or amend official registration data. Any amendments must be made directly with KRA via iTax or at a Huduma Centre.",
  },
  {
    q: "Is it legal to use a third-party cyber service to retrieve my certificate?",
    a: "Yes. Under Kenyan law, taxpayers and cyber cafe operators may engage automated third-party convenience tools with the consent of the credential owner, adhering strictly to the Kenya Data Protection Act (KDPA 2019) and Consumer Protection Act 2012.",
  },
  {
    q: "What happens if KRA's portal is undergoing maintenance?",
    a: "Because Akubrecah interfaces directly with live KRA systems in real time, scheduled or unscheduled KRA downtime may temporarily pause automated retrieval. In such events, our system holds your request in an automated retry queue or provides full refund credit under our Refund Policy.",
  },
]

export function DisclaimerView() {
  const [activeSection, setActiveSection] = useState("independence")
  const [copiedLink, setCopiedLink] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      toast.success("Disclaimer link copied to clipboard")
      setTimeout(() => setCopiedLink(false), 2500)
    }
  }

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print()
    }
  }

  const scrollToSection = (id: string) => {
    setActiveSection(id)
    const element = document.getElementById(id)
    if (element) {
      const yOffset = -90
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: "smooth" })
    }
  }

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* ============================================================== */}
      {/* 1. INSTITUTIONAL HERO HEADER */}
      {/* ============================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-surface-card dark:bg-slate-900 border border-border/80 dark:border-slate-800 p-6 sm:p-10 shadow-xs"
      >
        {/* Subtle Ambient Red Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Regulatory Badge Group */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                <AlertTriangle className="w-3.5 h-3.5" />
                Statutory Disclaimer
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-surface-container dark:bg-slate-800 text-on-surface-variant border border-border">
                <Scale className="w-3 h-3 text-muted-foreground" />
                Republic of Kenya
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                KDPA 2019 Compliant
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground uppercase">
              Statutory Independence & Service Disclaimer
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Mandatory legal disclosure regarding our third-party digital convenience service, public record data
              sourcing, and strict legal independence from the Kenya Revenue Authority (KRA).
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Last Revised: <strong>October 2026</strong>
              </span>
              <span className="hidden sm:inline text-border">•</span>
              <span>Document Version: <strong>2.4.0 (Statutory)</strong></span>
              <span className="hidden sm:inline text-border">•</span>
              <span>Ref: <strong>AKU-DISC-KE</strong></span>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-border bg-surface-container dark:bg-slate-800 text-foreground hover:bg-muted transition-all active:scale-95 shadow-2xs"
              title="Print official disclaimer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-border bg-surface-container dark:bg-slate-800 text-foreground hover:bg-muted transition-all active:scale-95 shadow-2xs"
              title="Copy link to clipboard"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Copied" : "Share"}</span>
            </button>
            <a
              href="https://itax.kra.go.ke"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 transition-all active:scale-95 shadow-xs"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Official KRA ↗</span>
            </a>
          </div>
        </div>
      </motion.div>

      {/* ============================================================== */}
      {/* 2. CRITICAL INDEPENDENCE NOTICE BANNER (SOVEREIGN RED) */}
      {/* ============================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-3xl border-2 border-primary/30 bg-primary/5 dark:bg-primary/10 p-6 sm:p-8 space-y-5"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-primary">
                Mandatory Legal Notice
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                Section 43 Consumer Protection Act
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight">
              Akubrecah is NOT the Kenya Revenue Authority (KRA)
            </h2>
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">
              Akubrecah (<strong>akubrecah.com</strong>) is an <strong>independent commercial software service</strong>{" "}
              providing self-service compliance tools and document retrieval automation. We are{" "}
              <strong>not affiliated with, authorized by, sponsored by, or an agent of the Kenya Revenue Authority</strong>{" "}
              or any agency of the National Government of Kenya. Official KRA services are accessible free of charge directly via{" "}
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

        {/* Side-by-Side Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Akubrecah Column */}
          <div className="rounded-2xl bg-surface-card dark:bg-slate-900/90 border border-border p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black tracking-wider uppercase text-primary">
                What Akubrecah Is
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-muted-foreground border border-border">
                Cyber Automation
              </span>
            </div>
            <ul className="text-xs space-y-2 text-on-surface-variant">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold shrink-0">•</span>
                <span>An assisted self-service portal for instant KRA PIN & certificate retrieval</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold shrink-0">•</span>
                <span>Automated PDF generator formatting certificates for immediate printing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold shrink-0">•</span>
                <span>Cyber cafe business subscription platform (KES 500/mo unlimited)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold shrink-0">•</span>
                <span>An independent digital service charging a transparent convenience fee</span>
              </li>
            </ul>
          </div>

          {/* KRA Column */}
          <div className="rounded-2xl bg-surface-card dark:bg-slate-900/90 border border-border p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black tracking-wider uppercase text-foreground">
                What Akubrecah Is Not
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-muted-foreground border border-border">
                Government Agency
              </span>
            </div>
            <ul className="text-xs space-y-2 text-on-surface-variant">
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold shrink-0">—</span>
                <span>NOT the Kenya Revenue Authority, Times Tower, or a government tax office</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold shrink-0">—</span>
                <span>Does NOT amend official tax records, waive penalties, or issue new PINs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold shrink-0">—</span>
                <span>Does NOT provide legal, certified accounting, or tax advisory services</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold shrink-0">—</span>
                <span>Does NOT possess private or back-channel access beyond public taxpayer portals</span>
              </li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* ============================================================== */}
      {/* 3. MAIN CONTENT: STICKY SIDEBAR + DETAILED SECTIONS */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* DESKTOP STICKY SIDEBAR (4 Cols) */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-6">
          {/* Document Table of Contents */}
          <div className="rounded-2xl bg-surface-card dark:bg-slate-900 border border-border p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-[11px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                Document Sections
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground">9 Sections</span>
            </div>

            <nav className="space-y-1">
              {SECTIONS.map((sec) => {
                const isActive = activeSection === sec.id
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                      isActive
                        ? "bg-primary text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <span className="truncate">{sec.title}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-surface-container text-muted-foreground"
                      }`}
                    >
                      {sec.badge}
                    </span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Quick Direct KRA Assistance Card */}
          <div className="rounded-2xl bg-surface-card dark:bg-slate-900 border border-border p-5 space-y-3.5 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Official KRA Contacts
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              For official taxpayer disputes, PIN cancellations, or tax obligation amendments, reach KRA directly:
            </p>
            <div className="space-y-2 text-xs font-medium">
              <a
                href="tel:0204999999"
                className="flex items-center gap-2 text-foreground hover:text-primary transition-colors p-2 rounded-lg bg-surface-container/60 dark:bg-slate-800/60"
              >
                <Phone className="w-3.5 h-3.5 text-primary" />
                <span>020 4 999 999 / 0711 099 999</span>
              </a>
              <a
                href="mailto:callcentre@kra.go.ke"
                className="flex items-center gap-2 text-foreground hover:text-primary transition-colors p-2 rounded-lg bg-surface-container/60 dark:bg-slate-800/60"
              >
                <Mail className="w-3.5 h-3.5 text-primary" />
                <span>callcentre@kra.go.ke</span>
              </a>
              <div className="flex items-start gap-2 text-muted-foreground p-2 rounded-lg bg-surface-container/60 dark:bg-slate-800/60">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span>Times Tower, Haile Selassie Avenue, Nairobi, Kenya</span>
              </div>
            </div>
          </div>

          {/* Related Legal Policies Link Box */}
          <div className="rounded-2xl bg-surface-card dark:bg-slate-900 border border-border p-5 space-y-3 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Related Legal Policies
            </span>
            <div className="space-y-1 text-xs">
              <Link
                href="/legal/privacy"
                className="flex items-center justify-between p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
              >
                <span>Privacy Policy (KDPA 2019)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/legal/terms"
                className="flex items-center justify-between p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
              >
                <span>Terms of Service</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/legal/refund"
                className="flex items-center justify-between p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
              >
                <span>Refund Policy</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/legal/aup"
                className="flex items-center justify-between p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
              >
                <span>Acceptable Use Policy</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </aside>

        {/* DETAILED DISCLAIMER ARTICLES (8 Cols) */}
        <main className="lg:col-span-8 space-y-6">

          {/* SECTION 1: INDEPENDENCE FROM KRA */}
          <article
            id="independence"
            className="rounded-3xl bg-surface-card dark:bg-slate-900 border border-border/80 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Section 01</span>
              <span className="text-[10px] font-semibold text-muted-foreground">Legal Independence</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              1. Independence from KRA & Government Entities
            </h3>
            <div className="text-xs sm:text-sm text-on-surface-variant leading-relaxed space-y-3 font-normal">
              <p>
                Akubrecah (<strong>akubrecah.com</strong>) is an independent, privately owned and operated web service
                engineered by Akubrecah Technologies. We are not an agent, subsidiary, joint venture, or representative
                of the Kenya Revenue Authority (KRA), the National Treasury, or the Government of Kenya.
              </p>
              <p>
                Our platform provides programmatic convenience tools that assist taxpayers in retrieving their genuine,
                publicly verifiable tax documents via official public verification interfaces on their own behalf. We
                possess no special, elevated, or administrative backdoors into KRA servers; our automation utilizes only
                the same public-facing endpoints available to any citizen browsing via a web browser.
              </p>
              <div className="p-3.5 rounded-xl bg-surface-container dark:bg-slate-800 border border-border text-xs text-muted-foreground">
                <strong className="text-foreground">Official Direct Access:</strong> Any registered taxpayer may access
                and download their KRA PIN certificate directly at no charge by visiting the official KRA portal at{" "}
                <a
                  href="https://itax.kra.go.ke"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline font-bold"
                >
                  itax.kra.go.ke
                </a>.
              </div>
            </div>
          </article>

          {/* SECTION 2: DATA SOURCING & ACCURACY */}
          <article
            id="accuracy"
            className="rounded-3xl bg-surface-card dark:bg-slate-900 border border-border/80 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Section 02</span>
              <span className="text-[10px] font-semibold text-muted-foreground">Registry Synchronization</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              2. Real-Time Data Sourcing & Accuracy Disclaimer
            </h3>
            <div className="text-xs sm:text-sm text-on-surface-variant leading-relaxed space-y-3">
              <p>
                All taxpayer information, KRA PIN records, tax stations, and registration dates retrieved through
                Akubrecah are mirrored verbatim from the official Kenya Revenue Authority database in real time.
                Akubrecah makes no alterations, edits, or interpretations of taxpayer records.
              </p>
              <p>
                Akubrecah makes <strong>no representations, warranties, or guarantees</strong> regarding the accuracy,
                completeness, or legal validity of the records returned by KRA. If your name, station, county, or
                identity documents on the generated certificate contain spelling errors or outdated addresses, these
                reflect historical entries in KRA&apos;s database, not an error by Akubrecah.
              </p>
              <p>
                To rectify statutory errors in your official KRA record, you must submit a formal Amendment of PIN
                Particulars directly via KRA iTax or visit your nearest Huduma Centre with original identification.
              </p>
            </div>
          </article>

          {/* SECTION 3: NO LEGAL OR TAX ADVICE */}
          <article
            id="no-advice"
            className="rounded-3xl bg-surface-card dark:bg-slate-900 border border-border/80 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Section 03</span>
              <span className="text-[10px] font-semibold text-muted-foreground">Advisory Boundaries</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
              <XCircle className="w-5 h-5 text-amber-500" />
              3. No Legal, Financial, or Tax Advice
            </h3>
            <div className="text-xs sm:text-sm text-on-surface-variant leading-relaxed space-y-3">
              <p>
                Content, calculators, FAQs, and guides published on <strong>akubrecah.com</strong> are provided
                strictly for operational informational convenience. Nothing on this website constitutes legal,
                financial, certified accounting, or tax advisory services under the Tax Procedures Act 2015.
              </p>
              <p>
                Neither Akubrecah nor its software engineers act as licensed tax agents on your behalf. For complex
                tax filings, corporate tax restructuring, dispute resolution, or penalty waiver applications, you are
                strongly advised to retain a Certified Public Accountant of Kenya (CPAK) or an accredited tax
                consultant licensed by the Institute of Certified Public Accountants of Kenya (ICPAK).
              </p>
            </div>
          </article>

          {/* SECTION 4: SERVICE AVAILABILITY */}
          <article
            id="availability"
            className="rounded-3xl bg-surface-card dark:bg-slate-900 border border-border/80 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Section 04</span>
              <span className="text-[10px] font-semibold text-muted-foreground">Uptime & Maintenance</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              4. Service Availability & KRA Maintenance Outages
            </h3>
            <div className="text-xs sm:text-sm text-on-surface-variant leading-relaxed space-y-3">
              <p>
                The operational speed and availability of our retrieval automation is directly contingent on the
                uptime and responsive latency of the government iTax portal (<code>itax.kra.go.ke</code>).
              </p>
              <p>
                Akubrecah exercises zero control over KRA scheduled system maintenance, national network outages, or
                intermittent CAPTCHA verification delays. We shall not be held liable for delayed filings, missed
                statutory deadlines, or government penalties arising from government server unavailability. In cases
                where a paid retrieval fails due to persistent KRA downtime, our <strong>100% Delivery or Refund
                Guarantee</strong> applies under our published Refund Policy.
              </p>
            </div>
          </article>

          {/* SECTION 5: USER RESPONSIBILITY */}
          <article
            id="user-responsibility"
            className="rounded-3xl bg-surface-card dark:bg-slate-900 border border-border/80 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Section 05</span>
              <span className="text-[10px] font-semibold text-muted-foreground">Accountability & Ethics</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              5. User Responsibility & Consensual Credential Ownership
            </h3>
            <div className="text-xs sm:text-sm text-on-surface-variant leading-relaxed space-y-3">
              <p>
                By initiating any query on Akubrecah, you explicitly warrant, represent, and certify under penalty of
                law that:
              </p>
              <ul className="space-y-1.5 pl-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  <span>You are either the legitimate holder of the National ID / KRA PIN queried, or an authorized cyber cafe professional assisting the citizen with their informed consent.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  <span>You are utilizing this convenience retrieval tool strictly for lawful documentation purposes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  <span>You will not harvest, scrape, resell, or distribute personal taxpayer data in violation of Section 29 of the Kenya Data Protection Act 2019.</span>
                </li>
              </ul>
              <p>
                Akubrecah operates ephemeral memory processing for live searches: we do not store unmasked national
                taxpayer databases or sell contact directories.
              </p>
            </div>
          </article>

          {/* SECTION 6: CONVENIENCE FEES */}
          <article
            id="convenience-fees"
            className="rounded-3xl bg-surface-card dark:bg-slate-900 border border-border/80 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Section 06</span>
              <span className="text-[10px] font-semibold text-muted-foreground">Pricing Transparency</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
              <Info className="w-5 h-5 text-emerald-600" />
              6. Convenience Fees & Free Official Alternatives
            </h3>
            <div className="text-xs sm:text-sm text-on-surface-variant leading-relaxed space-y-3">
              <p>
                Akubrecah maintains full commercial transparency regarding our fee schedule:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-4 rounded-2xl bg-surface-container dark:bg-slate-800 border border-border space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Single Retrieval</span>
                  <p className="text-lg font-black text-foreground">KES 50 – 100</p>
                  <p className="text-[11px] text-muted-foreground">
                    One-time automated retrieval with instant PDF download and optional WhatsApp delivery.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-surface-container dark:bg-slate-800 border border-border space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Cyber Cafe Plan</span>
                  <p className="text-lg font-black text-foreground">KES 500 / month</p>
                  <p className="text-[11px] text-muted-foreground">
                    Unlimited retrievals for registered cyber cafe businesses, bulk processing, and instant receipts.
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                <strong>Important Notice:</strong> These fees are for Akubrecah&apos;s software automation, server hosting,
                and technical delivery service only. They do NOT represent a tax fee charged by KRA. Any citizen who
                wishes to download their certificate without a convenience fee can do so for free on KRA&apos;s official website.
              </p>
            </div>
          </article>

          {/* SECTION 7: OFFICIAL PORTALS DIRECTORY */}
          <article
            id="external-links"
            className="rounded-3xl bg-surface-card dark:bg-slate-900 border border-border/80 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Section 07</span>
              <span className="text-[10px] font-semibold text-muted-foreground">Authoritative Directory</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-primary" />
              7. Official Government Portals Directory
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant">
              For complete transparency, below is the official directory of government portals where tax and identity
              services can be accessed directly from the Republic of Kenya:
            </p>
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container dark:bg-slate-800 text-[10px] uppercase font-bold tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-3">Portal Name</th>
                    <th className="p-3">Official Link</th>
                    <th className="p-3">Primary Purpose</th>
                    <th className="p-3">Direct Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-on-surface-variant">
                  {OFFICIAL_PORTALS.map((portal) => (
                    <tr key={portal.name} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3 font-bold text-foreground">{portal.name}</td>
                      <td className="p-3">
                        <a
                          href={portal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 font-semibold"
                        >
                          {portal.url.replace("https://", "")}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>
                      <td className="p-3 text-[11px] text-muted-foreground">{portal.purpose}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Free
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          {/* SECTION 8: STATUTORY FRAMEWORK */}
          <article
            id="statutory-framework"
            className="rounded-3xl bg-surface-card dark:bg-slate-900 border border-border/80 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Section 08</span>
              <span className="text-[10px] font-semibold text-muted-foreground">Kenyan Laws</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              8. Kenyan Statutory & Regulatory Compliance
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Akubrecah operates in strict alignment with statutory laws enacted by the Parliament of Kenya:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-border bg-surface-container/60 dark:bg-slate-800/60 space-y-1">
                <strong className="text-foreground flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  Data Protection Act 2019
                </strong>
                <p className="text-[11px] text-muted-foreground">
                  Enforces lawful processing, data minimization, transparency, and explicit user consent.
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-border bg-surface-container/60 dark:bg-slate-800/60 space-y-1">
                <strong className="text-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  Computer Misuse Act 2018
                </strong>
                <p className="text-[11px] text-muted-foreground">
                  Strictly prohibits unauthorized access, phishing, data interception, and fraudulent operations.
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-border bg-surface-container/60 dark:bg-slate-800/60 space-y-1">
                <strong className="text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Consumer Protection Act 2012
                </strong>
                <p className="text-[11px] text-muted-foreground">
                  Guarantees upfront pricing disclosure, delivery guarantees, and statutory dispute mechanisms.
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-border bg-surface-container/60 dark:bg-slate-800/60 space-y-1">
                <strong className="text-foreground flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Kenya ICT Act (Cap 411A)
                </strong>
                <p className="text-[11px] text-muted-foreground">
                  Regulates digital transactions, electronic records, and electronic signature recognition in Kenya.
                </p>
              </div>
            </div>
          </article>

          {/* SECTION 9: CONTACT & ESCALATION */}
          <article
            id="contact"
            className="rounded-3xl bg-surface-card dark:bg-slate-900 border border-border/80 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Section 09</span>
              <span className="text-[10px] font-semibold text-muted-foreground">Support & Legal</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              9. Legal Inquiries & Escalation Directory
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              If you have inquiries regarding this Statutory Disclaimer, wish to assert data rights under the Data
              Protection Act 2019, or believe any aspect of our service requires regulatory review, contact us through
              our dedicated channels:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="p-4 rounded-2xl bg-surface-container dark:bg-slate-800 border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Legal Counsel</span>
                <p className="font-bold text-foreground">legal@akubrecah.com</p>
                <p className="text-[10px] text-muted-foreground">Statutory compliance & legal notices</p>
              </div>
              <div className="p-4 rounded-2xl bg-surface-container dark:bg-slate-800 border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Privacy Officer</span>
                <p className="font-bold text-foreground">privacy@akubrecah.com</p>
                <p className="text-[10px] text-muted-foreground">Data requests & KDPA compliance</p>
              </div>
              <div className="p-4 rounded-2xl bg-surface-container dark:bg-slate-800 border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Customer Support</span>
                <p className="font-bold text-foreground">support@akubrecah.com</p>
                <p className="text-[10px] text-muted-foreground">Retrieval help & billing questions</p>
              </div>
            </div>
          </article>

          {/* ============================================================== */}
          {/* 4. INTERACTIVE ACCORDION FAQ */}
          {/* ============================================================== */}
          <section className="rounded-3xl bg-surface-card dark:bg-slate-900 border border-border/80 dark:border-slate-800 p-6 sm:p-8 space-y-5 shadow-xs">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              <h3 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight">
                Frequently Addressed Questions
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Clear answers to the most common legal, statutory, and operational questions regarding our independent service.
            </p>

            <div className="space-y-3 pt-2">
              {FAQS.map((faq, index) => {
                const isOpen = openFaq === index
                return (
                  <div
                    key={faq.q}
                    className="rounded-2xl border border-border bg-surface-container/50 dark:bg-slate-800/50 overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 font-bold text-xs sm:text-sm text-foreground hover:text-primary transition-colors"
                    >
                      <span>{faq.q}</span>
                      <span className="text-lg font-black text-primary shrink-0">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* ============================================================== */}
          {/* 5. STATUTORY FOOTER ACKNOWLEDGMENT */}
          {/* ============================================================== */}
          <div className="rounded-2xl bg-surface-card dark:bg-slate-900 border border-border p-5 text-center text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">
              Akubrecah Technologies Limited · Incorporated in Nairobi, Republic of Kenya
            </p>
            <p className="text-[11px]">
              By continuing to use this website, you acknowledge that you have read, understood, and consented to this
              Statutory Disclaimer and our binding Terms of Service.
            </p>
            <div className="pt-2 flex justify-center gap-4 text-xs font-bold text-primary">
              <Link href="/retrieval-portal" className="hover:underline flex items-center gap-1">
                Go to Certificate Retrieval <ArrowRight className="w-3 h-3" />
              </Link>
              <Link href="/legal" className="hover:underline">
                View All Legal Policies
              </Link>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
