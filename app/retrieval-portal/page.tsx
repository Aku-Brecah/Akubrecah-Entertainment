"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileCheck2,
  FileSpreadsheet,
  ShieldCheck,
  Lock,
  Zap,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser, UserButton } from "@clerk/nextjs"
import { KRAPortal } from "@/components/kra-portal"
import { KRAFilingPortal } from "@/components/kra-filing-portal"
import { CyberSubscriptionCard } from "@/components/cyber-subscription-card"
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
  const [showCyberModal, setShowCyberModal] = useState(false)
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
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-xs group-hover:scale-105 transition-transform">
              KRA
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="text-[11px] sm:text-sm font-black tracking-tight text-on-surface uppercase">
                  Compliance<span className="hidden sm:inline"> Portal</span>
                </span>
                <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  GovTech
                </span>
              </div>
              <span className="text-[10px] text-on-surface-variant font-medium hidden md:inline">
                Republic of Kenya · Statutory Compliance Engine
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
            <span>Statutory Verification Engine</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-on-surface tracking-tight">
            {mode === "retrieval" ? (
              <>
                Instant KRA <span className="text-primary">Certificate Retrieval</span>
              </>
            ) : (
              <>
                Automated Tax Returns <span className="text-primary">Filing Gateway</span>
              </>
            )}
          </h1>

          <p className="text-[11px] sm:text-xs md:text-sm text-on-surface-variant max-w-xl mx-auto leading-relaxed">
            {mode === "retrieval"
              ? "Enter your National ID or KRA PIN below to generate and download your official cryptographically verified document in seconds."
              : "File your Nil Returns or guided declarations directly to the statutory registry with verified e-acknowledgment receipts."}
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

        {/* COMPACT INSTITUTIONAL TRUST STRIP: 2x2 ON MOBILE, ROW ON TABLET/DESKTOP */}
        <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-around p-3 sm:p-3.5 rounded-2xl bg-surface-container border border-outline-variant/60 gap-2 sm:gap-4 text-center text-[10px] sm:text-[11px] text-on-surface-variant font-medium">
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
            <span>KDPA 2019 Certified</span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-outline-variant/80" />
          <div className="flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-on-surface shrink-0" />
            <span>256-Bit TLS Bank Security</span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-outline-variant/80" />
          <div className="flex items-center justify-center gap-1.5">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
            <span>2.4s Avg Retrieval</span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-outline-variant/80" />
          <div className="flex items-center justify-center gap-1.5">
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
            <span>Authentic QR Seal</span>
          </div>
        </div>

        {/* SECONDARY UTILITIES: HOW IT WORKS & CYBER PASS (BELOW THE CORE WORKSPACE) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-1 sm:pt-2">
          
          {/* How It Works Card */}
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
                1. Enter National ID or PIN · 2. Automated Registry Lookup · 3. Download Cryptographically Signed PDF.
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
                    <span className="text-on-surface-variant text-[11px]">Reverse National ID lookup means you don't even need your PIN or iTax password.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <span className="font-mono font-black text-primary px-1.5 py-0.5 rounded bg-primary/10 text-[10px]">02</span>
                    <span className="text-on-surface-variant text-[11px]">Instant handshake queries the statutory registry to confirm official names, station, and date.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <span className="font-mono font-black text-primary px-1.5 py-0.5 rounded bg-primary/10 text-[10px]">03</span>
                    <span className="text-on-surface-variant text-[11px]">Download your official certificate with live QR-code verification stamp.</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Cyber Cafe & Pro Pass Card */}
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-xs font-black text-on-surface">Cyber Cafe & Pro Plan</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10">
                  KES 500 / mo
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-snug">
                Cyber cafe operator or high-volume agent? Unlock unlimited instant downloads without paying per retrieval.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCyberModal(!showCyberModal)}
              className="h-9 px-3.5 rounded-xl border-outline-variant text-xs font-bold text-primary hover:bg-primary/5 self-start cursor-pointer"
            >
              {showCyberModal ? "Hide Pass Details" : "View Unlimited Pass"}
            </Button>
          </div>

        </div>

        {/* Expandable Cyber Subscription View */}
        <AnimatePresence>
          {showCyberModal && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CyberSubscriptionCard compact={false} />
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* ============================================================== */}
      {/* 3. MINIMAL GOVTECH FOOTER */}
      {/* ============================================================== */}
      <footer className="mt-auto border-t border-outline-variant/60 bg-surface-container-lowest/80 py-5 sm:py-6 text-xs text-on-surface-variant">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left">
          <p className="text-[11px] text-on-surface-variant">
            &copy; {new Date().getFullYear()} Akubrecah Technologies. Republic of Kenya Statutory Compliance Gateway.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px]">
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
