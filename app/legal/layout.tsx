"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"
import {
  ArrowLeft,
  ChevronRight,
  Shield,
  AlertTriangle,
  Lock,
  FileText,
  RotateCcw,
  Ban,
  Cookie,
  Home,
  CheckCircle2,
} from "lucide-react"

const LEGAL_NAV = [
  { label: "Overview", href: "/legal", icon: Shield },
  { label: "Disclaimer", href: "/legal/disclaimer", icon: AlertTriangle, badge: "Important" },
  { label: "Privacy Policy", href: "/legal/privacy", icon: Lock, badge: "KDPA" },
  { label: "Terms of Service", href: "/legal/terms", icon: FileText },
  { label: "Refund Policy", href: "/legal/refund", icon: RotateCcw },
  { label: "Acceptable Use", href: "/legal/aup", icon: Ban },
  { label: "Cookie Policy", href: "/legal/cookies", icon: Cookie },
]

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Determine current active document name for breadcrumbs
  const currentDoc = LEGAL_NAV.find((item) => item.href === pathname) || {
    label: "Legal Document",
    href: pathname,
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-5 sm:py-6 pb-12 space-y-6">
        
        {/* ============================================================== */}
        {/* TOP BAR: BREADCRUMBS & HOME LINK */}
        {/* ============================================================== */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60"
        >
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Link
              href="/"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-border" />
            <Link
              href="/legal"
              className={`hover:text-primary transition-colors ${
                pathname === "/legal" ? "text-foreground font-bold" : ""
              }`}
            >
              Legal Center
            </Link>
            {pathname !== "/legal" && (
              <>
                <ChevronRight className="w-3 h-3 text-border" />
                <span className="text-foreground font-bold">{currentDoc.label}</span>
              </>
            )}
          </nav>

          {/* Direct Return Button */}
          <Link
            href="/retrieval-portal"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Certificate Portal</span>
          </Link>
        </motion.div>

        {/* ============================================================== */}
        {/* HORIZONTAL POLICY SELECTOR TABS */}
        {/* ============================================================== */}
        <div className="overflow-x-auto scrollbar-none pb-1">
          <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-surface-container/60 dark:bg-slate-900/60 border border-border min-w-max">
            {LEGAL_NAV.map((tab) => {
              const Icon = tab.icon
              const isActive = pathname === tab.href
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-primary text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* ============================================================== */}
        {/* PAGE BODY */}
        {/* ============================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}
