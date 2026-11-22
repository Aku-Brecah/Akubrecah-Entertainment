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
    <section id="project-estimator" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

      {/* Left: Configuration Steps (7 cols) */}
      <div className="lg:col-span-7 space-y-6 p-6 sm:p-8 rounded-xl bg-surface-container-lowest border border-outline-variant">

        {/* Step 1: Service Type */}
        <div className="space-y-3" role="group" aria-labelledby="estimator-step-1">
          <h2 id="estimator-step-1" className="text-xs font-semibold uppercase tracking-wider text-on-surface flex items-center gap-2">
            <span className="font-mono text-primary">01</span>
            <span>Select Core Engineering Domain</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SERVICES.map((srv) => {
              const isSelected = selectedService === srv.id
              return (
                <button
                  key={srv.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedService(srv.id)}
                  className={`p-4 rounded-lg text-left transition-colors cursor-pointer border ${isSelected
                      ? "bg-primary/5 border-primary"
                      : "bg-surface-container-low border-outline-variant hover:border-primary/40"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface">{srv.label}</span>
                    {isSelected && (
                      <span className="text-[10px] font-mono font-semibold text-primary">Selected</span>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1.5 line-clamp-2 leading-relaxed">
                    {srv.tagline}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Step 2: Deployment Scale */}
        <div className="space-y-3 pt-2 border-t border-outline-variant" role="group" aria-labelledby="estimator-step-2">
          <h2 id="estimator-step-2" className="text-xs font-semibold uppercase tracking-wider text-on-surface flex items-center gap-2">
            <span className="font-mono text-primary">02</span>
            <span>Deployment Scale &amp; Concurrency</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {SCALES.map((scale) => {
              const isSelected = selectedScale === scale.id
              return (
                <button
                  key={scale.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedScale(scale.id)}
                  className={`p-3 rounded-lg text-left transition-colors cursor-pointer border ${isSelected
                      ? "bg-primary text-white border-primary"
                      : "bg-surface-container-low border-outline-variant text-on-surface hover:border-primary/40"
                    }`}
                >
                  <p className="text-xs font-semibold leading-tight">{scale.label}</p>
                  <p className={`text-[11px] mt-1 ${isSelected ? "text-white/85" : "text-on-surface-variant"}`}>
                    {scale.desc}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Step 3: Add-on Capabilities */}
        <div className="space-y-3 pt-2 border-t border-outline-variant" role="group" aria-labelledby="estimator-step-3">
          <h2 id="estimator-step-3" className="text-xs font-semibold uppercase tracking-wider text-on-surface flex items-center gap-2">
            <span className="font-mono text-primary">03</span>
            <span>Additional Integration Modules</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {ADDONS.map((addon) => {
              const isChecked = selectedAddons.includes(addon.id)
              return (
                <button
                  key={addon.id}
                  type="button"
                  aria-pressed={isChecked}
                  onClick={() => toggleAddon(addon.id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${isChecked
                      ? "bg-primary/10 text-primary border-primary/40 font-semibold"
                      : "bg-surface-container-low border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-primary/30"
                    }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isChecked ? "bg-primary" : "bg-outline"}`} />
                  <span>{addon.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right: Live Architecture Specification & Turnaround (5 cols) */}
      <div className="lg:col-span-5 p-6 sm:p-8 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-6">

        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-outline-variant pb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface">
            Specification Summary
          </span>
          <span className="text-xs font-mono text-primary font-semibold">
            {activeService.label}
          </span>
        </div>

        {/* Estimated Turnaround Time */}
        <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-on-surface-variant font-medium">
              Estimated Delivery Timeline
            </span>
            <span className="text-2xl font-bold text-on-surface font-mono">
              ~{totalEstimatedDays} business days
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Incremental sprint delivery across architecture, implementation, security review, and production deployment.
          </p>
        </div>

        {/* Recommended Tech Stack */}
        <div className="space-y-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant block">
            Included Architecture Modules
          </span>
          <div className="flex flex-wrap gap-1.5">
            {activeService.baseStack.map((tech) => (
              <span
                key={tech}
                className="text-[11px] font-mono px-2.5 py-1 rounded bg-surface-container-low text-on-surface border border-outline-variant"
              >
                {tech}
              </span>
            ))}
            {selectedAddons.map((addonId) => {
              const a = ADDONS.find((item) => item.id === addonId)
              return a ? (
                <span
                  key={addonId}
                  className="text-[11px] font-mono px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/25 font-medium"
                >
                  + {a.shortLabel}
                </span>
              ) : null
            })}
          </div>
        </div>

        {/* Action CTAs */}
        <div className="pt-2 space-y-2.5">
          <Button
            asChild
            size="lg"
            className="w-full h-11 rounded-lg bg-primary text-white font-semibold text-xs hover:bg-primary/90 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Link href={`/contact?service=${selectedService}&scale=${selectedScale}`}>
              <span>Request Formal Proposal for This Scope</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full h-10 px-4 rounded-lg border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>Discuss Specification via WhatsApp</span>
          </a>
        </div>
      </div>
    </section>
  )
}
