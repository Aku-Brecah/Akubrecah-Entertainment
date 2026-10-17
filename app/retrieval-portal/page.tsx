"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileSpreadsheet,
  FileCheck2,
  ShieldCheck,
  ArrowRight,
  Zap,
  Lock,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Building2,
  Printer,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser, UserButton } from "@clerk/nextjs"
import { KRAPortal } from "@/components/kra-portal"
import { KRAFilingPortal } from "@/components/kra-filing-portal"
import { CyberSubscriptionCard } from "@/components/cyber-subscription-card"

type PortalView = "selection" | "retrieval" | "filing"

function FlagshipPortalContent() {
  const searchParams = useSearchParams()
  const { user, isLoaded } = useUser()

  const requestedView = searchParams.get("view")
  const initialView: PortalView =
    requestedView === "retrieval" || requestedView === "filing"
      ? requestedView
      : "selection"

  const [view, setView] = useState<PortalView>(initialView)

  useEffect(() => {
    if (requestedView === "retrieval" || requestedView === "filing") {
      setView(requestedView)
    }
  }, [requestedView])

  const userName = user?.firstName || user?.fullName?.split(" ")[0] || "Taxpayer"

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary">
      {/* ============================================================== */}
      {/* 1. MINIMAL GOVTECH TOP NAVIGATION BAR */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-50 bg-background/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-outline-variant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Statutory Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView("selection")}
              className="flex items-center gap-2.5 text-left group transition-opacity hover:opacity-90"
            >
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
                KRA
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-black tracking-wide text-on-surface uppercase">
                    KRA Flagship Portal
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    GovTech
                  </span>
                </div>
                <span className="text-[10px] text-on-surface-variant font-medium">
                  Republic of Kenya · Online Compliance Gateway
                </span>
              </div>
            </button>
          </div>

          {/* Right Controls: Live Badge, Switch Service, User Profile */}
          <div className="flex items-center gap-3">
            {view !== "selection" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView("selection")}
                className="hidden sm:flex border-outline-variant hover:bg-surface-container text-on-surface text-xs font-bold rounded-xl h-9 px-3 items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-primary" />
                <span>Switch Service</span>
              </Button>
            )}

            <div className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Statutory Gateway Live
            </div>

            {/* Clerk User Button */}
            <div className="pl-1">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-9 h-9 border border-outline-variant rounded-full",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. MAIN WORKSPACE */}
      {/* ============================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <AnimatePresence mode="wait">
          {/* ----------------------------------------------------------- */}
          {/* VIEW: 2-CHOICE SELECTION HUB */}
          {/* ----------------------------------------------------------- */}
          {view === "selection" && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="max-w-5xl mx-auto space-y-8"
            >
              {/* Welcoming Header */}
              <div className="text-center space-y-3 pt-2 pb-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Authorized Compliance Services</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-on-surface tracking-tight">
                  Welcome, <span className="text-primary">{userName}</span>
                </h1>

                <p className="text-sm sm:text-base text-on-surface-variant max-w-xl mx-auto font-medium">
                  Select the statutory tax service you wish to access today. You can toggle between returns filing and certificate retrieval at any time.
                </p>
              </div>

              {/* Cyber Subscription Status Bar */}
              <CyberSubscriptionCard compact={true} />

              {/* 2 Primary Service Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* ─────────────────────────────────────────────────── */}
                {/* CARD 1: TAX RETURNS FILING */}
                {/* ─────────────────────────────────────────────────── */}
                <div
                  onClick={() => setView("filing")}
                  className="group relative bg-surface-container-lowest border-2 border-outline-variant hover:border-primary rounded-3xl p-7 sm:p-8 shadow-xs hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-6 text-left"
                >
                  <div className="space-y-5">
                    {/* Icon & Badge */}
                    <div className="flex items-center justify-between">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all">
                        <FileSpreadsheet className="w-7 h-7" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                        Annual & Monthly
                      </span>
                    </div>

                    {/* Titles */}
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-on-surface group-hover:text-primary transition-colors">
                        Filing Tax Returns
                      </h3>
                      <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                        Automate your statutory returns submission directly to the KRA gateway. Includes fast-track Nil Returns and guided Individual Income Tax (P9) declarations.
                      </p>
                    </div>

                    {/* Feature Highlights */}
                    <ul className="space-y-2.5 text-xs text-on-surface font-medium pt-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Instant Nil Returns submission in &lt;60 seconds</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Support for students, unemployed & inactive PINs</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Verified KRA e-return acknowledgment receipt download</span>
                      </li>
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <Button
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm group-hover:shadow-md transition-all"
                  >
                    <span>Launch Returns Filing</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>

                {/* ─────────────────────────────────────────────────── */}
                {/* CARD 2: KRA CERTIFICATE RETRIEVAL */}
                {/* ─────────────────────────────────────────────────── */}
                <div
                  onClick={() => setView("retrieval")}
                  className="group relative bg-surface-container-lowest border-2 border-outline-variant hover:border-primary rounded-3xl p-7 sm:p-8 shadow-xs hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-6 text-left"
                >
                  <div className="space-y-5">
                    {/* Icon & Badge */}
                    <div className="flex items-center justify-between">
                      <div className="w-14 h-14 rounded-2xl bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all">
                        <FileCheck2 className="w-7 h-7" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-surface-container text-on-surface border border-outline-variant">
                        Instant PDF Search
                      </span>
                    </div>

                    {/* Titles */}
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-on-surface group-hover:text-primary transition-colors">
                        KRA Certificate Retrieval
                      </h3>
                      <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                        Instant statutory search and official PDF document generation. Retrieve Tax Compliance Certificates (TCC) or KRA PIN Certificates using your National ID or PIN.
                      </p>
                    </div>

                    {/* Feature Highlights */}
                    <ul className="space-y-2.5 text-xs text-on-surface font-medium pt-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Reverse National ID lookup (no PIN needed)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Cryptographically signed PDF with authentic QR code</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>KES 20 instant M-Pesa download or Cyber Cafe pass</span>
                      </li>
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <Button
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm group-hover:shadow-md transition-all"
                  >
                    <span>Launch Certificate Retrieval</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>

              {/* Institutional Trust Indicators */}
              <div className="pt-6 border-t border-outline-variant flex flex-wrap items-center justify-center gap-6 text-xs text-on-surface-variant font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>KDPA 2019 Compliant</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-on-surface-variant" />
                  <span>TLS 1.3 Bank-Grade Encryption</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>Direct Statutory Registry Sync</span>
                </span>
              </div>
            </motion.div>
          )}

          {/* ----------------------------------------------------------- */}
          {/* VIEW: TAX RETURNS FILING GATEWAY */}
          {/* ----------------------------------------------------------- */}
          {view === "filing" && (
            <motion.div
              key="filing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <KRAFilingPortal onBackToSelection={() => setView("selection")} />
            </motion.div>
          )}

          {/* ----------------------------------------------------------- */}
          {/* VIEW: KRA CERTIFICATE RETRIEVAL ENGINE */}
          {/* ----------------------------------------------------------- */}
          {view === "retrieval" && (
            <motion.div
              key="retrieval"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Back Bar */}
              <div className="flex items-center justify-between bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant shadow-sm">
                <Button
                  onClick={() => setView("selection")}
                  variant="outline"
                  size="sm"
                  className="border-outline-variant hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4 text-primary" />
                  <span>Back to Services</span>
                </Button>

                <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Instant Statutory Certificate Engine</span>
                </div>
              </div>

              {/* Embedded Retrieval Engine */}
              <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant shadow-sm p-4 sm:p-6 lg:p-8">
                <KRAPortal hideHeader={true} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ============================================================== */}
      {/* 3. MINIMAL GOVTECH FOOTER */}
      {/* ============================================================== */}
      <footer className="mt-16 border-t border-outline-variant bg-surface-container-lowest py-8 text-xs text-on-surface-variant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-[11px] text-on-surface-variant">
            &copy; {new Date().getFullYear()} Akubrecah Technologies. Republic of Kenya Statutory Compliance Gateway.
          </p>

          <div className="flex items-center gap-4 text-[11px]">
            <a href="/legal/privacy" className="hover:text-primary transition-colors underline-offset-4 hover:underline">
              Privacy Policy
            </a>
            <a href="/legal/terms" className="hover:text-primary transition-colors underline-offset-4 hover:underline">
              Terms of Service
            </a>
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#BA1A1A] border-t-transparent animate-spin" />
        </div>
      }
    >
      <FlagshipPortalContent />
    </Suspense>
  )
}
