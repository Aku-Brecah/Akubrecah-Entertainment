"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileCheck2,
  FileSpreadsheet,
  ShieldCheck,
  Lock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser, UserButton } from "@clerk/nextjs"
import { KRAPortal } from "@/components/kra-portal"
import { KRAFilingPortal } from "@/components/kra-filing-portal"
import { CyberSubscriptionCard } from "@/components/cyber-subscription-card"
import { GooglePreferredSourceButton } from "@/components/google-preferred-source-button"
import { Logo } from "@/components/logo"
import Link from "next/link"

type ServiceMode = "retrieval" | "filing"

function FlagshipPortalContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useUser()

  const requestedView = searchParams.get("view")
  const [mode, setMode] = useState<ServiceMode>(
    requestedView === "filing" ? "filing" : "retrieval"
  )
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  useEffect(() => {
    if (requestedView === "filing") {
      setMode("filing")
    } else if (requestedView === "retrieval") {
      setMode("retrieval")
    }
  }, [requestedView])

  const handleModeChange = (newMode: ServiceMode) => {
    setMode(newMode)
    const params = new URLSearchParams(window.location.search)
    params.set("view", newMode)
    router.replace(`/retrieval-portal?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-surface-bright text-on-surface font-sans selection:bg-primary/20 selection:text-primary flex flex-col">
      
      {/* ============================================================== */}
      {/* 1. ADAPTIVE RESPONSIVE GOVTECH TOP NAVIGATION BAR */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-50 bg-surface/95 dark:bg-surface-dark/95 backdrop-blur-md border-b border-outline-variant/80">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Brand Mark & Identity */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group transition-opacity hover:opacity-90 shrink-0">
            <Logo width={120} height={34} className="h-7 sm:h-8 w-auto transition-transform group-hover:scale-[1.02]" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="text-[11px] sm:text-sm font-black tracking-tight text-on-surface uppercase">
                  Akubrecah<span className="hidden sm:inline"> Cyber Portal</span>
                </span>
                <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Independent
                </span>
              </div>
              <span className="text-[10px] text-on-surface-variant font-medium hidden md:inline">
                Akubrecah Technologies · Cyber Services & Document Retrieval
              </span>
            </div>
          </Link>

          {/* Center: Responsive Mode Segmented Control */}
          <div className="flex items-center p-0.5 sm:p-1 rounded-xl sm:rounded-2xl bg-surface-container border border-outline-variant/80 shadow-2xs">
            <button
              type="button"
              onClick={() => handleModeChange("retrieval")}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                mode === "retrieval"
                  ? "bg-primary text-white shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5 shrink-0" />
              <span><span className="hidden sm:inline">Certificate </span>Retrieval</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("filing")}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                mode === "filing"
                  ? "bg-primary text-white shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span><span className="hidden sm:inline">Returns </span>Filing</span>
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold ml-0.5">
                Demo · Coming Soon
              </span>
            </button>
          </div>

          {/* Right Header Status & Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Gateway Live</span>
            </div>

            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-7 h-7 sm:w-8 sm:h-8 border border-outline-variant rounded-full",
                },
              }}
            />
          </div>

        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. FOCUSED HERO WORKSPACE (ZERO SCROLL ACROSS ALL DEVICES) */}
      {/* ============================================================== */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        
        {/* Compact, Focused Title Banner */}
        <div className="text-center space-y-1.5 sm:space-y-2 max-w-2xl mx-auto px-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-primary/10 text-primary text-[10px] sm:text-xs font-bold uppercase tracking-wider border border-primary/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cyber Facilitation Desk</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-on-surface tracking-tight">
            {mode === "retrieval" ? (
              <>
                Fast KRA <span className="text-primary">Certificate Retrieval</span>
              </>
            ) : (
              <>
                Assisted Tax Returns <span className="text-primary">Filing (Interactive Demo)</span>
              </>
            )}
          </h1>

          <p className="text-[11px] sm:text-xs md:text-sm text-on-surface-variant max-w-xl mx-auto leading-relaxed">
            {mode === "retrieval"
              ? "Enter your National ID or KRA PIN below to generate and download your verified compliance document in seconds."
              : "Interactive Demo Preview: Test our automated returns preparation workflow. Direct statutory transmission to the KRA gateway is coming soon."}
          </p>
        </div>

        {/* PRIMARY ENGINE: FRONT AND CENTER (IMMEDIATELY VISIBLE ON MOBILE & DESKTOP) */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            {mode === "retrieval" ? (
              <motion.div
                key="retrieval-engine"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <KRAPortal hideHeader={true} />
              </motion.div>
            ) : (
              <motion.div
                key="filing-engine"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <KRAFilingPortal onBackToSelection={() => handleModeChange("retrieval")} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* HOW IT WORKS UTILITY CARD */}
        <div className="w-full pt-1 sm:pt-2">
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-on-surface uppercase tracking-wider">
                  How It Works
                </span>
                <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">
                  Instant Process
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-snug">
                1. Enter National ID or PIN · 2. Automated Registry Lookup · 3. Download Cryptographically Signed PDF for only KES 20.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 self-start min-h-[36px] cursor-pointer"
            >
              <span>{showHowItWorks ? "Hide Details" : "View Step-by-Step"}</span>
              {showHowItWorks ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <AnimatePresence>
              {showHowItWorks && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 pt-2 border-t border-outline-variant/60"
                >
                  <div className="flex items-start gap-2 text-xs">
                    <span className="font-mono font-black text-primary px-1.5 py-0.5 rounded bg-primary/10 text-[10px]">01</span>
                    <span className="text-on-surface-variant text-[11px]">Reverse National ID lookup means you don&apos;t even need your PIN or iTax password.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <span className="font-mono font-black text-primary px-1.5 py-0.5 rounded bg-primary/10 text-[10px]">02</span>
                    <span className="text-on-surface-variant text-[11px]">Instant handshake queries the statutory registry to confirm official names, station, and date.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <span className="font-mono font-black text-primary px-1.5 py-0.5 rounded bg-primary/10 text-[10px]">03</span>
                    <span className="text-on-surface-variant text-[11px]">Pay the standard KES 20 download fee via M-Pesa to download your tamper-proof certificate.</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* CYBER CAFE UNLIMITED MONTHLY PLAN (COMPACT VARIANT) */}
        <div className="w-full">
          <CyberSubscriptionCard compact={true} />
        </div>

        {/* ============================================================== */}
        {/* 3. CRAWLABLE STATUTORY GUIDE & TAXPAYER FAQ ACCORDION (SEO/GOOGLE) */}
        {/* ============================================================== */}
        <section aria-labelledby="statutory-guide-heading" className="space-y-6 pt-6 sm:pt-10 border-t border-outline-variant/60">
          
          <div className="space-y-2 text-center max-w-2xl mx-auto">
            <span className="text-[11px] font-black text-primary uppercase tracking-widest">
              Statutory Knowledge Base & Verification Standard
            </span>
            <h2 id="statutory-guide-heading" className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
              Complete Guide to KRA PIN Retrieval & Nil Returns Filing
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Official compliance procedures, reverse identity lookups, and legal data protection guarantees for Kenyan taxpayers and cyber cafe operators.
            </p>
          </div>

          {/* 3-Step Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-mono font-bold text-xs">
                01
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-on-surface">
                Reverse National ID Query
              </h3>
              <p className="text-[11px] sm:text-xs text-on-surface-variant leading-relaxed">
                Forgot your PIN, registered email, or iTax password? Enter your 7 or 8-digit Kenyan National ID number. Our automated gateway matches your statutory taxpayer record in real time.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">
                02
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-on-surface">
                Authentic QR Verification
              </h3>
              <p className="text-[11px] sm:text-xs text-on-surface-variant leading-relaxed">
                Downloaded certificates feature the official high-resolution QR verification code, official station designation, and taxpayer names recognized by Kenyan banks, employers, and government institutions.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-mono font-bold text-xs">
                03
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-on-surface">
                KDPA 2019 Privacy First
              </h3>
              <p className="text-[11px] sm:text-xs text-on-surface-variant leading-relaxed">
                Built strictly within the Kenya Data Protection Act 2019 framework. 256-bit TLS bank encryption with zero data retention. Your sensitive taxpayer credentials are never stored or logged.
              </p>
            </div>
          </div>

          {/* Crawlable Frequently Asked Questions Accordion */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              <h3 className="text-sm sm:text-base font-black text-on-surface">
                Frequently Asked Questions (FAQs)
              </h3>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  q: "How can I retrieve my KRA PIN certificate using only my National ID?",
                  a: "Enter your 7 or 8-digit Kenyan National ID number into the search box above. The system queries statutory taxpayer databases to verify your registered profile and renders your official certificate immediately with an authentic QR verification stamp.",
                },
                {
                  q: "Can I retrieve my certificate if I forgot my iTax password and email address?",
                  a: "Yes. Traditional iTax logins require your password, security question answer, and access to your registered email. The Akubrecah retrieval system uses reverse identity lookup with your National ID number, allowing you to bypass forgotten passwords.",
                },
                {
                  q: "How much does it cost to retrieve and download the certificate?",
                  a: "Identity lookup and preview verification are 100% free. Generating and downloading the official high-resolution PDF certificate with instant WhatsApp and Email delivery is only KES 20 (20 bob) per retrieval.",
                },
                {
                  q: "How fast is the certificate delivered?",
                  a: "Retrieval and rendering take an average of 2.4 seconds. Upon completing the M-Pesa transaction, your certificate displays instantly on your screen and is simultaneously dispatched to your specified WhatsApp number and email.",
                },
                {
                  q: "What should I do if the portal returns 'No Record Found'?",
                  a: "A 'No Record Found' result means no KRA PIN is currently associated with that National ID in the statutory database. If you have never registered for a KRA PIN before, you will need to register on the official iTax portal or visit a Huduma Centre.",
                },
                {
                  q: "How do I file KRA Nil Returns online through this portal?",
                  a: "Toggle the service selector to 'Returns Filing (Demo · Coming Soon)'. You can preview the automated returns calculation workflow in interactive demo mode. Live statutory submissions directly into KRA iTax will be enabled soon.",
                },
                {
                  q: "Is this certificate accepted by Kenyan banks, employers, and government agencies?",
                  a: "Yes. The generated certificate is an official statutory compliance document complete with taxpayer names, PIN number, station, and the standard KRA QR verification code that can be scanned by any smartphone or validation terminal.",
                },
                {
                  q: "Is Akubrecah Technologies affiliated with the Kenya Revenue Authority (KRA)?",
                  a: "Akubrecah Technologies is an independent private software engineering firm and cyber facilitation service provider. We are not the Kenya Revenue Authority. We operate as an independent facilitator under Kenyan commercial law to assist citizens with technical and statutory document retrievals.",
                },
              ].map((faq, index) => (
                <details
                  key={index}
                  className="group rounded-2xl bg-surface-container-lowest border border-outline-variant/70 p-4 transition-colors hover:border-primary/40 open:border-primary/50 shadow-2xs"
                >
                  <summary className="flex items-center justify-between font-bold text-xs sm:text-sm text-on-surface cursor-pointer select-none list-none">
                    <span className="flex items-center gap-2 pr-2">
                      <span className="text-primary font-mono text-xs">Q{index + 1}.</span>
                      <span>{faq.q}</span>
                    </span>
                    <ChevronDown className="w-4 h-4 text-on-surface-variant shrink-0 group-open:rotate-180 transition-transform duration-200" />
                  </summary>
                  <div className="mt-3 text-xs sm:text-[13px] text-on-surface-variant leading-relaxed border-t border-outline-variant/40 pt-3">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* Cross-linking Statutory & Engineering Deep Links */}
          <div className="p-4 sm:p-5 rounded-2xl bg-surface-container border border-outline-variant/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-on-surface">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold">Explore Engineering Case Studies & Developer Articles:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/articles" className="text-primary font-bold hover:underline flex items-center gap-1">
                <span>Technical Articles</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <span className="text-outline-muted">·</span>
              <Link href="/services" className="text-primary font-bold hover:underline flex items-center gap-1">
                <span>GovTech Services</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <span className="text-outline-muted">·</span>
              <Link href="/legal/privacy" className="text-on-surface-variant hover:text-primary transition-colors">
                <span>Privacy & KDPA</span>
              </Link>
            </div>
          </div>

        </section>

      </main>

      {/* ============================================================== */}
      {/* 3. MINIMAL GOVTECH FOOTER */}
      {/* ============================================================== */}
      <footer className="mt-auto border-t border-outline-variant/60 bg-surface-container-lowest/80 py-5 sm:py-6 text-xs text-on-surface-variant">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left">
          <p className="text-[11px] text-on-surface-variant">
            &copy; {new Date().getFullYear()} Akubrecah Technologies. Independent third-party cyber assistance provider. Not affiliated with the Kenya Revenue Authority (KRA).
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px]">
            <GooglePreferredSourceButton siteDomain="akubrecah.com" />
            <Link href="/legal/disclaimer" className="text-primary font-medium hover:underline underline-offset-4">
              Disclaimer
            </Link>
            <Link href="/legal/privacy" className="hover:text-primary transition-colors underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            <Link href="/legal/terms" className="hover:text-primary transition-colors underline-offset-4 hover:underline">
              Terms of Service
            </Link>
            <a
              href="https://itax.kra.go.ke"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              Official iTax Portal ↗
            </a>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default function RetrievalPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-bright flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <FlagshipPortalContent />
    </Suspense>
  )
}
