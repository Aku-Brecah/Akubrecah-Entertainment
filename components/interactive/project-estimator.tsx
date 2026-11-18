"use client"

import React, { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ServiceType {
  id: string
  label: string
  tagline: string
  baseDays: number
  baseStack: string[]
}

const SERVICES: ServiceType[] = [
  {
    id: "govtech",
    label: "GovTech & Tax Portals",
    tagline: "KRA PIN retrieval, statutory verification, instant mobile billing & thermal ETR receipts",
    baseDays: 7,
    baseStack: ["Statutory Integration", "Citizen Verification Gateway", "Thermal ETR POS Engine", "Zero-Disk RAM Security"],
  },
  {
    id: "web",
    label: "Enterprise Web Systems",
    tagline: "High-concurrency full-stack platforms, client portals & automated workflows",
    baseDays: 14,
    baseStack: ["Enterprise Cloud Architecture", "High-Throughput Microservices", "Role-Based Access Control", "Edge CDN Scaling"],
  },
  {
    id: "mobile",
    label: "Native Mobile Ecosystems",
    tagline: "iOS and Android apps with offline caching, biometrics & push notifications",
    baseDays: 21,
    baseStack: ["Cross-Platform Mobile Apps", "Biometric Authentication", "Offline-First Data Sync", "Encrypted Secure Storage"],
  },
  {
    id: "brand",
    label: "Creative Brand & Print",
    tagline: "Full brand identity books, design tokens, thermal POS slips & commercial collateral",
    baseDays: 5,
    baseStack: ["Corporate Modernism Tokens", "Brand Identity Guidelines", "Thermal Print Specifications", "Vector Asset System"],
  },
]

const SCALES = [
  { id: "starter", label: "MVP / Pilot", desc: "Up to 1,000 monthly users", multiplier: 1 },
  { id: "growth", label: "Growth / SME Hub", desc: "5,000 – 25,000 monthly transactions", multiplier: 1.3 },
  { id: "enterprise", label: "High-Concurrency", desc: "100,000+ monthly requests with failover", multiplier: 1.7 },
]

const ADDONS = [
  { id: "billing", label: "Automated Instant Mobile Billing", shortLabel: "M-Pesa Billing", days: 2 },
  { id: "etr", label: "80mm Thermal Receipt Engine", shortLabel: "Thermal Receipts", days: 2 },
  { id: "bot", label: "Automated WhatsApp Customer Assistant", shortLabel: "WhatsApp Bot", days: 3 },
  { id: "ratelimit", label: "High-Concurrency Rate Limiter", shortLabel: "Rate Limiter", days: 1 },
  { id: "rbac", label: "Multi-Role Client Portal & Admin RBAC", shortLabel: "Admin RBAC", days: 2 },
]

export function ProjectEstimator() {
  const [selectedService, setSelectedService] = useState<string>("govtech")
  const [selectedScale, setSelectedScale] = useState<string>("growth")
  const [selectedAddons, setSelectedAddons] = useState<string[]>(["billing", "bot", "etr"])

  const activeService = SERVICES.find((s) => s.id === selectedService) || SERVICES[0]
  const activeScale = SCALES.find((s) => s.id === selectedScale) || SCALES[1]

  const toggleAddon = (id: string) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Calculate estimated turnaround time
  const addonDays = selectedAddons.reduce((acc, id) => {
    const addon = ADDONS.find((a) => a.id === id)
    return acc + (addon?.days || 0)
  }, 0)

  const totalEstimatedDays = Math.ceil((activeService.baseDays + addonDays) * activeScale.multiplier)

  // Construct pre-filled WhatsApp message
  const prefilledText = encodeURIComponent(
    `Hello Akubrecah Technologies! I scoped a project on your website:\n• Service: ${activeService.label}\n• Scale: ${activeScale.label}\n• Addons: ${selectedAddons.join(", ")}\n• Target Turnaround: ~${totalEstimatedDays} business days.\nI would like to schedule a technical discovery call.`
  )
  const whatsappUrl = `https://wa.me/254791497858?text=${prefilledText}`

  return (
    <section id="project-estimator" className="space-y-8">
      {/* Title */}
      <div className="space-y-3 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
          <span>Interactive Architecture Sandbox</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight">
          Scope Your Digital Solution in Seconds
        </h2>
        <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
          Configure your service requirements, scale, and enterprise capabilities. Get immediate architecture blueprints and turnaround estimates.
        </p>
      </div>

      {/* Main Interactive Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left: Configuration Steps (7 cols) */}
        <div className="lg:col-span-7 space-y-6 p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft">

          {/* Step 1: Service Type */}
          <div className="space-y-3" role="group" aria-labelledby="estimator-step-1">
            <h3 id="estimator-step-1" className="text-xs font-black uppercase tracking-wider text-on-surface flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-mono">1</span>
              Select Core Engineering Domain:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SERVICES.map((srv) => {
                const isSelected = selectedService === srv.id
                return (
                  <button
                    key={srv.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedService(srv.id)}
                    className={`p-4 rounded-2xl text-left transition-all cursor-pointer border ${isSelected
                        ? "bg-primary/5 dark:bg-primary/10 border-primary ring-2 ring-primary/20 shadow-xs"
                        : "bg-surface-container/40 dark:bg-slate-800/50 border-outline-variant hover:border-primary/40"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-on-surface">{srv.label}</span>
                      {isSelected && (
                        <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">Active</span>
                      )}
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-2 line-clamp-2 leading-relaxed">
                      {srv.tagline}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Step 2: Deployment Scale */}
          <div className="space-y-3" role="group" aria-labelledby="estimator-step-2">
            <h3 id="estimator-step-2" className="text-xs font-black uppercase tracking-wider text-on-surface flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-mono">2</span>
              Deployment Scale &amp; Concurrency:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {SCALES.map((scale) => {
                const isSelected = selectedScale === scale.id
                return (
                  <button
                    key={scale.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedScale(scale.id)}
                    className={`p-3 rounded-xl text-center transition-all cursor-pointer border ${isSelected
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-surface-container/40 dark:bg-slate-800/50 border-outline-variant text-on-surface hover:border-primary/40"
                      }`}
                  >
                    <p className="text-xs font-bold leading-tight">{scale.label}</p>
                    <p className={`text-[10px] mt-1 ${isSelected ? "text-white/80" : "text-on-surface-variant"}`}>
                      {scale.desc}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Step 3: Add-on Capabilities */}
          <div className="space-y-3" role="group" aria-labelledby="estimator-step-3">
            <h3 id="estimator-step-3" className="text-xs font-black uppercase tracking-wider text-on-surface flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-mono">3</span>
              Select Enterprise Capabilities:
            </h3>
            <div className="flex flex-wrap gap-2">
              {ADDONS.map((addon) => {
                const isChecked = selectedAddons.includes(addon.id)
                return (
                  <button
                    key={addon.id}
                    type="button"
                    aria-pressed={isChecked}
                    onClick={() => toggleAddon(addon.id)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${isChecked
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-surface-container/40 dark:bg-slate-800/50 border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-primary/30"
                      }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isChecked ? "bg-emerald-500" : "bg-outline-variant"}`} />
                    <span>{addon.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Live Architecture Blueprint & Turnaround (5 cols) */}
        <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-xl space-y-6">

          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <span className="text-xs font-black uppercase tracking-widest text-slate-300">
              System Blueprint
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Validated Architecture
            </span>
          </div>

          {/* Estimated Turnaround Time */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Projected Turnaround:
              </span>
              <span className="text-2xl font-black text-white font-mono">
                ~{totalEstimatedDays} Days
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Sprint-based delivery following the 4-phase engineering methodology (Architect → Build → Audit → Deploy).
            </p>
          </div>

          {/* Recommended Tech Stack Pills */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Recommended Stack & Modules:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeService.baseStack.map((tech) => (
                <span
                  key={tech}
                  className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 border border-white/10"
                >
                  {tech}
                </span>
              ))}
              {selectedAddons.map((addonId) => {
                const a = ADDONS.find((item) => item.id === addonId)
                return a ? (
                  <span
                    key={addonId}
                    className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  >
                    + {a.shortLabel}
                  </span>
                ) : null
              })}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 space-y-3">
            <Button
              asChild
              size="lg"
              className="w-full h-12 rounded-xl bg-primary text-white font-bold text-xs sm:text-sm hover:bg-primary/90 shadow-md shadow-primary/30 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <Link href={`/contact?service=${selectedService}&scale=${selectedScale}`}>
                <span>Lock In Scope & Request Blueprint</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full h-11 px-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Discuss Config via WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
