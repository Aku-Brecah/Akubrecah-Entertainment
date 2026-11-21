"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import {
  FileCheck2,
  ShieldCheck,
  ChevronDown,
  FileText,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  Smartphone,
  Receipt,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser, UserButton } from "@clerk/nextjs"
import { KRAPortal } from "@/components/kra-portal"
import { KRAFilingPortal } from "@/components/kra-filing-portal"
import { GooglePreferredSourceButton } from "@/components/google-preferred-source-button"
import { Logo } from "@/components/logo"
import Link from "next/link"

type ServiceMode = "retrieval" | "filing"

function FlagshipPortalContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isLoaded, isSignedIn, user } = useUser()

  const requestedView = searchParams.get("view")
  const [mode, setMode] = useState<ServiceMode>(
    requestedView === "filing" ? "filing" : "retrieval"
  )

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
    <div className="min-h-screen overflow-x-hidden bg-surface text-on-surface font-sans selection:bg-primary/20 selection:text-primary flex flex-col">

      {/* ============================================================== */}
      {/* 1. ADAPTIVE RESPONSIVE GOVTECH TOP NAVIGATION BAR */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-50 w-full bg-surface-container-lowest border-b border-outline-variant">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">

          {/* Brand Mark & Identity */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 transition-opacity hover:opacity-90 min-w-0">
            <Logo width={120} height={34} className="h-7 sm:h-8 w-auto shrink-0" />
            <div className="flex flex-col min-w-0 border-l border-outline-variant pl-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold tracking-tight text-on-surface truncate">
                  Akubrecah<span className="hidden sm:inline"> Cyber Portal</span>
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant border border-outline-variant shrink-0">
                  Independent
                </span>
              </div>
              <span className="text-[10px] text-on-surface-variant hidden md:inline">
                Statutory Facilitation &amp; Document Retrieval
              </span>
            </div>
          </Link>

          {/* Right Header: Active Mode Badge & Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleModeChange("retrieval")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white transition-colors"
            >
              <FileCheck2 className="w-3.5 h-3.5 shrink-0" />
              <span><span className="hidden sm:inline">Certificate </span>Retrieval</span>
            </button>
            {isLoaded && isSignedIn && (
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-7 h-7 sm:w-8 sm:h-8 border border-outline-variant rounded-full",
                  },
                }}
              />
            )}
          </div>

        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. FOCUSED HERO WORKSPACE */}
      {/* ============================================================== */}
      <div className="flex-1 w-full max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-10 xl:px-12 py-4 sm:py-6 space-y-5 sm:space-y-6">

        {/* Focused Hero Header */}
        <div className="text-center space-y-1.5 max-w-3xl mx-auto px-1">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider">
            Independent Cyber Facilitation Service
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
            {mode === "retrieval" ? (
              "KRA PIN Certificate Retrieval"
            ) : (
              "Kenya P9 Tax Calculator & Filing Guide"
            )}
          </h1>

          <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
            {mode === "retrieval"
              ? "Enter your National ID or KRA PIN below to verify your taxpayer record and download your PDF certificate."
              : "Calculate Kenyan PAYE, NSSF, SHIF, and Housing Levy estimates before filing directly on the official KRA iTax portal."}
          </p>
        </div>

        {/* PRIMARY ENGINE: FRONT AND CENTER */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            {mode === "retrieval" ? (
              <motion.div
                key="retrieval-engine"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <KRAPortal hideHeader={true} />
              </motion.div>
            ) : (
              <motion.div
                key="filing-engine"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <KRAFilingPortal onBackToSelection={() => handleModeChange("retrieval")} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* System Guarantees Grid */}
        <section aria-label="System Features" className="w-full max-w-4xl mx-auto pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-2">
                  <FileText className="w-4 h-4" />
                  <span>PDF Generation</span>
                </div>
                <h3 className="text-sm font-bold text-on-surface">Formatted Certificate Output</h3>
                <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                  Direct browser download of your verified taxpayer details and KRA QR verification reference.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-outline-variant flex items-center gap-1.5 text-[11px] font-medium text-on-surface-variant">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <span>On-demand generation</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-2">
                  <Smartphone className="w-4 h-4" />
                  <span>M-Pesa Checkout</span>
                </div>
                <h3 className="text-sm font-bold text-on-surface">KES 20 Single Retrieval</h3>
                <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                  Safaricom Daraja STK Push prompt on your handset with automatic receipt reconciliation and manual Till fallback.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-outline-variant flex items-center gap-1.5 text-[11px] font-medium text-on-surface-variant">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <span>Automated Daraja reconciliation</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Data Handling</span>
                </div>
                <h3 className="text-sm font-bold text-on-surface">Zero Document Storage</h3>
                <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                  In-memory ephemeral RAM streaming. Generated PDFs are never cached or persisted on server disk.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-outline-variant flex items-center gap-1.5 text-[11px] font-medium text-on-surface-variant">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <span>KDPA 2019 aligned</span>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section aria-labelledby="how-it-works-heading" className="w-full pt-1">
          <div className="p-5 sm:p-6 rounded-xl bg-surface-container-lowest border border-outline-variant flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant pb-3">
              <div>
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">
                  Retrieval Workflow
                </span>
                <h2 id="how-it-works-heading" className="text-sm sm:text-base font-bold text-on-surface tracking-tight">
                  How KRA PIN Certificate Retrieval Works
                </h2>
              </div>
              <span className="text-xs font-mono text-on-surface-variant">
                Standard Tariff: KES 20.00
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-primary text-xs">
                    01
                  </span>
                  <span className="text-xs font-bold text-on-surface">Enter National ID or PIN</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Reverse National ID lookup locates your registered taxpayer record even if you have forgotten your PIN or iTax password.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-primary text-xs">
                    02
                  </span>
                  <span className="text-xs font-bold text-on-surface">Verify Masked Record</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Confirm your registered taxpayer name, tax station, and active status before initiating payment.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-primary text-xs">
                    03
                  </span>
                  <span className="text-xs font-bold text-on-surface">Complete KES 20 M-Pesa Payment</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Authorize the KES 20 M-Pesa prompt to stream your formatted PDF certificate directly to your device.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PAYMENT & DELIVERY OPTIONS SHOWCASE */}
        <section aria-labelledby="payment-options-heading" className="w-full space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-1">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider block">
                Payment Options
              </span>
              <h2 id="payment-options-heading" className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
                Two Ways to Complete KES 20.00 Checkout
              </h2>
            </div>
            <span className="text-xs text-on-surface-variant">
              Automated STK Push or Manual Till receipt verification
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-on-surface">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <span>Option 1 · M-Pesa Express (STK Push)</span>
                </div>
                <span className="text-[11px] font-mono text-primary font-semibold">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Enter your M-Pesa phone number to receive a direct KES 20.00 PIN prompt on your handset and unlock your PDF automatically once confirmed.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-on-surface">
                  <Receipt className="w-4 h-4 text-primary" />
                  <span>Option 2 · Manual Till &amp; Receipt Code</span>
                </div>
                <span className="text-[11px] font-mono text-on-surface-variant">
                  Fallback
                </span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                If the handset prompt is delayed, switch to Manual Payment, pay KES 20.00 via Lipa na M-Pesa Buy Goods Till, and paste your M-Pesa SMS or 10-character transaction code.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 3. CRAWLABLE STATUTORY GUIDE & TAXPAYER FAQ ACCORDION */}
        {/* ============================================================== */}
        <section aria-labelledby="statutory-guide-heading" className="space-y-6 pt-6 sm:pt-8 border-t border-outline-variant">

          <div className="space-y-1.5 max-w-3xl">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Taxpayer Reference &amp; Compliance Notes
            </span>
            <h2 id="statutory-guide-heading" className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
              Guide to KRA PIN Retrieval &amp; Nil Returns Preparation
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Compliance procedures, reverse identity lookups, and data protection standards for Kenyan taxpayers and cyber cafe operators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-2">
              <span className="font-mono font-semibold text-primary text-xs">01</span>
              <h3 className="text-sm font-bold text-on-surface">
                Reverse National ID Query
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Forgot your PIN, registered email, or iTax password? Enter your 7 or 8-digit Kenyan National ID number to locate your statutory taxpayer record.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-2">
              <span className="font-mono font-semibold text-primary text-xs">02</span>
              <h3 className="text-sm font-bold text-on-surface">
                QR Verification Stamp
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Generated certificates include your verified KRA PIN, tax station designation, registration date, and QR verification link.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-2">
              <span className="font-mono font-semibold text-primary text-xs">03</span>
              <h3 className="text-sm font-bold text-on-surface">
                KDPA 2019 Privacy Controls
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Engineered in alignment with the Kenya Data Protection Act 2019 using encrypted TLS transport and volatile memory streaming with zero document retention.
              </p>
            </div>
          </div>

          {/* Crawlable Frequently Asked Questions Accordion */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              <h3 className="text-sm sm:text-base font-bold text-on-surface">
                Frequently Asked Questions (FAQs)
              </h3>
            </div>

            <div className="space-y-2">
              {[
                {
                  q: "How can I retrieve my KRA PIN certificate using only my National ID?",
                  a: "Enter your 7 or 8-digit Kenyan National ID number into the search box above. The system queries statutory taxpayer databases to verify your registered profile and renders your certificate with a QR verification stamp.",
                },
                {
                  q: "Can I retrieve my certificate if I forgot my iTax password and email address?",
                  a: "Yes. Traditional iTax logins require your password, security question answer, and access to your registered email. The Akubrecah retrieval system uses reverse identity lookup with your National ID number, allowing you to retrieve your PIN details without logging into iTax.",
                },
                {
                  q: "How much does it cost to retrieve and download the certificate?",
                  a: "Identity lookup and masked preview verification are free. Downloading the PDF certificate costs KES 20 per retrieval via M-Pesa (or up to 50 retrievals/day with the KES 500/month Cyber Cafe pass).",
                },
                {
                  q: "How fast is the certificate delivered?",
                  a: "Once Safaricom confirms your M-Pesa payment, your PDF certificate is generated in memory and downloaded directly to your browser immediately. Orders initiated on our WhatsApp bot are delivered directly in the chat.",
                },
                {
                  q: "What should I do if the portal returns 'No Record Found'?",
                  a: "A 'No Record Found' result means no KRA PIN is currently associated with that National ID in the statutory database. If you have never registered for a KRA PIN before, you will need to register on the official iTax portal or visit a Huduma Centre.",
                },
                {
                  q: "Can I file KRA Nil Returns directly on this portal?",
                  a: "Nil returns and annual income tax returns are submitted directly on the official KRA iTax portal (itax.kra.go.ke). You can use our free Kenya P9 Tax Calculator and Nil Returns checklist here to prepare your figures beforehand.",
                },
                {
                  q: "Is this certificate accepted by Kenyan banks, employers, and government agencies?",
                  a: "The generated PDF reproduces your live verified KRA taxpayer record with your PIN, station, and QR verification link. Always verify acceptance requirements with your requesting institution or download directly from itax.kra.go.ke.",
                },
                {
                  q: "Is Akubrecah Entertainment affiliated with the Kenya Revenue Authority (KRA)?",
                  a: "No. Akubrecah Entertainment is an independent private software engineering firm and cyber facilitation provider. We are not affiliated with the Kenya Revenue Authority (KRA).",
                },
              ].map((faq, index) => (
                <details
                  key={index}
                  className="group rounded-xl bg-surface-container-lowest border border-outline-variant p-4 transition-colors hover:border-primary/40 open:border-primary/50"
                >
                  <summary className="flex items-center justify-between font-semibold text-xs sm:text-sm text-on-surface cursor-pointer select-none list-none">
                    <span className="flex items-center gap-2 pr-2">
                      <span className="text-primary font-mono text-xs">Q{index + 1}.</span>
                      <span>{faq.q}</span>
                    </span>
                    <ChevronDown className="w-4 h-4 text-on-surface-variant shrink-0 group-open:rotate-180 transition-transform duration-150" />
                  </summary>
                  <div className="mt-3 text-xs sm:text-[13px] text-on-surface-variant leading-relaxed border-t border-outline-variant pt-3">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* Cross-linking Statutory & Engineering Deep Links */}
          <div className="p-4 sm:p-5 rounded-xl bg-surface-container-low border border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-on-surface">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold">Related Guides &amp; Documentation:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/articles/kra-pin-retrieval-online-using-id-number-itax-login-guide"
                className="text-primary font-semibold hover:underline flex items-center gap-1"
              >
                <span>KRA PIN &amp; iTax Login Guide</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <span className="text-outline-variant">·</span>
              <Link href="/articles" className="text-primary font-semibold hover:underline flex items-center gap-1">
                <span>Technical Articles</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <span className="text-outline-variant">·</span>
              <Link href="/services" className="text-primary font-semibold hover:underline flex items-center gap-1">
                <span>GovTech Services</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <span className="text-outline-variant">·</span>
              <Link href="/legal/privacy" className="text-on-surface-variant hover:text-primary transition-colors">
                <span>Privacy &amp; KDPA</span>
              </Link>
            </div>
          </div>

        </section>

      </div>

      {/* ============================================================== */}
      {/* 3. MINIMAL GOVTECH FOOTER */}
      {/* ============================================================== */}
      <footer className="mt-auto border-t border-outline-variant bg-surface-container-lowest py-5 sm:py-6 text-xs text-on-surface-variant">
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-10 xl:px-12 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left">
          <p className="text-[11px] text-on-surface-variant">
            &copy; {new Date().getFullYear()} Akubrecah Entertainment. Independent third-party cyber assistance provider. Not affiliated with the Kenya Revenue Authority (KRA).
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
              Official iTax Portal
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
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <FlagshipPortalContent />
    </Suspense>
  )
}
