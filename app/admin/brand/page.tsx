"use client"

import React, { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Copy,
  Check,
  Download,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Type,
  Palette,
  Layers,
  Sliders,
  ExternalLink,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface ColorSwatch {
  name: string
  hex: string
  rgb: string
  hsl: string
  role: string
  isDarkText?: boolean
  borderRequired?: boolean
}

const BRAND_PALETTE: ColorSwatch[] = [
  {
    name: "Tuscan Red",
    hex: "#BA1A1A",
    rgb: "186, 26, 26",
    hsl: "0, 75%, 42%",
    role: "Primary Brand Color — Statutory Authority & Energy",
  },
  {
    name: "Obsidian Black",
    hex: "#0F172A",
    rgb: "15, 23, 42",
    hsl: "222, 47%, 11%",
    role: "Monolithic Depth, High-Contrast Surface & Dark Mode Ground",
  },
  {
    name: "Chalk White",
    hex: "#F4F4F5",
    rgb: "244, 244, 245",
    hsl: "240, 5%, 96%",
    role: "Neutral Light Surface — High Legibility without Eye Strain",
    isDarkText: true,
  },
  {
    name: "Pure White",
    hex: "#FFFFFF",
    rgb: "255, 255, 255",
    hsl: "0, 0%, 100%",
    role: "Bright Contrast, Card Foreground & High-Visibility Targets",
    isDarkText: true,
    borderRequired: true,
  },
  {
    name: "Print Cyan",
    hex: "#00C2FF",
    rgb: "0, 194, 255",
    hsl: "194, 100%, 50%",
    role: "Conduit Telemetry & Print Accent (from Akubrecah Logo)",
    isDarkText: true,
  },
  {
    name: "Brand Emerald",
    hex: "#10B981",
    rgb: "16, 185, 129",
    hsl: "160, 84%, 39%",
    role: "Verification Badges & Success States (from Akubrecah Logo)",
  },
]

export default function BrandBookPage() {
  const [copiedHex, setCopiedHex] = useState<string | null>(null)
  const [customText, setCustomText] = useState("Engineering digital products that scale.")
  const [fontSize, setFontSize] = useState(28)
  const [fontWeight, setFontWeight] = useState<number>(700)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedHex(text)
    setTimeout(() => setCopiedHex(null), 2000)
  }

  return (
    <div className="relative w-full bg-background text-on-background font-sans overflow-x-hidden min-h-screen">
      
      {/* Background glow — deep red, no purple */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-[radial-gradient(ellipse_at_30%_0%,rgba(186,26,26,0.12)_0%,transparent_70%)] pointer-events-none z-0" />
      <div className="absolute top-40 right-[10%] w-96 h-96 bg-primary/5 rounded-full filter blur-[120px] pointer-events-none z-0" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24 space-y-20">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <Link href="/admin" className="hover:text-primary transition-colors">Admin Dashboard</Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-50" />
          <span className="text-on-surface font-bold">Brand Book & Identity Design System</span>
        </div>

        {/* Hero Banner */}
        <section className="space-y-6 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container border border-outline-variant text-xs font-semibold">
            <span className="flex h-2 w-2 rounded-full bg-primary" />
            <span className="font-black text-red-700 dark:text-red-400">Akubrecah Entertainment</span>
            <span className="text-outline-muted">·</span>
            <span>Brand Book & Design Spec</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-on-surface tracking-tight leading-[1.08]">
            Corporate Modernism.<br />
            <span className="text-primary bg-gradient-to-br from-primary to-red-700 bg-clip-text text-transparent">
              Systemic Precision.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
            The official brand guide and design token architecture for Akubrecah Entertainment. 
            Defining our monolithic aesthetic, color spectrum, typographic discipline, and interactive digital standards.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button asChild size="lg" className="h-12 px-6 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 shadow-md shadow-primary/20">
              <Link href="/retrieval-portal">
                Explore Live Portal <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-6 rounded-xl border-outline-variant font-bold text-xs hover:bg-surface-container">
              <Link href="/contact">
                Work with Our Brand & Tech Studio
              </Link>
            </Button>
          </div>
        </section>

        {/* ===================== SECTION 1: BRAND OVERVIEW ===================== */}
        <section className="p-8 sm:p-12 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft space-y-6">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
            <Layers className="w-4 h-4" />
            <span>01 Brand Overview</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
                &ldquo;Engineering digital products that scale.&rdquo;
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                Akubrecah Entertainment is a full-cycle software engineering and digital innovation house based in Nairobi, Kenya. 
                The firm architects mission-critical GovTech compliance portals, cloud infrastructure, native mobile apps, 
                and high-fidelity brand identities serving enterprises, startups, and government workflows across East Africa.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-surface-container/60 border border-outline-variant space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface">Core Pillars</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-surface dark:bg-slate-900 border border-outline-variant/60">
                  <span className="font-mono text-primary font-bold">01.</span>
                  <p className="font-bold text-on-surface mt-1">Design</p>
                  <p className="text-[11px] text-on-surface-variant">Corporate Modernism & Tokens</p>
                </div>
                <div className="p-3 rounded-xl bg-surface dark:bg-slate-900 border border-outline-variant/60">
                  <span className="font-mono text-primary font-bold">02.</span>
                  <p className="font-bold text-on-surface mt-1">Print</p>
                  <p className="text-[11px] text-on-surface-variant">80mm Fiscal ETR Thermal POS</p>
                </div>
                <div className="p-3 rounded-xl bg-surface dark:bg-slate-900 border border-outline-variant/60">
                  <span className="font-mono text-primary font-bold">03.</span>
                  <p className="font-bold text-on-surface mt-1">Brand</p>
                  <p className="text-[11px] text-on-surface-variant">Identity & Visual Solvency</p>
                </div>
                <div className="p-3 rounded-xl bg-surface dark:bg-slate-900 border border-outline-variant/60">
                  <span className="font-mono text-primary font-bold">04.</span>
                  <p className="font-bold text-on-surface mt-1">Tech</p>
                  <p className="text-[11px] text-on-surface-variant">Scalable Cloud & APIs</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== SECTION 2: BRAND LOGO ===================== */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
            <Sparkles className="w-4 h-4" />
            <span>02 Brand Logo & Variants</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Light Variant */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200 text-slate-900 space-y-6 flex flex-col justify-between shadow-soft">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Primary Logo (Light Surface)
                </span>
                <div className="h-32 flex items-center justify-center my-4">
                  <Image
                    src="/akubrecah-logo.png"
                    alt="Akubrecah Entertainment Light Logo"
                    width={240}
                    height={70}
                    className="object-contain"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Clear space: 40px all sides</span>
                <a
                  href="/akubrecah-logo.png"
                  download="akubrecah-logo-light.png"
                  className="font-bold text-primary flex items-center gap-1 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" /> Download Asset
                </a>
              </div>
            </div>

            {/* Dark Variant */}
            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 text-white space-y-6 flex flex-col justify-between shadow-soft">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Monolithic Variant (Dark Surface)
                </span>
                <div className="h-32 flex items-center justify-center my-4">
                  <Image
                    src="/akubrecah-logo-dark.png"
                    alt="Akubrecah Entertainment Dark Logo"
                    width={240}
                    height={70}
                    className="object-contain"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Min width: 96px / 1.00 inch</span>
                <a
                  href="/akubrecah-logo-dark.png"
                  download="akubrecah-logo-dark.png"
                  className="font-bold text-primary flex items-center gap-1 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" /> Download Asset
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== SECTION 3: COLOR PALETTE ===================== */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
              <Palette className="w-4 h-4" />
              <span>03 Color Palette & Tokens</span>
            </div>
            <span className="text-xs text-on-surface-variant">
              Click any color swatch to copy HEX code
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BRAND_PALETTE.map((color) => {
              const isCopied = copiedHex === color.hex
              return (
                <div
                  key={color.name}
                  onClick={() => copyToClipboard(color.hex)}
                  className="rounded-3xl bg-surface-container-lowest border border-outline-variant overflow-hidden shadow-soft hover:shadow-md transition-all cursor-pointer group"
                >
                  {/* Swatch preview */}
                  <div
                    className={`h-28 w-full p-4 flex flex-col justify-between transition-transform duration-300 group-hover:scale-[1.02] ${
                      color.borderRequired ? "border-b border-outline-variant" : ""
                    }`}
                    style={{ backgroundColor: color.hex }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                          color.isDarkText ? "bg-black/10 text-slate-900" : "bg-white/20 text-white"
                        }`}
                      >
                        {color.hex}
                      </span>
                      <button
                        type="button"
                        className={`p-1.5 rounded-lg transition-colors ${
                          color.isDarkText
                            ? "bg-black/10 text-slate-900 hover:bg-black/20"
                            : "bg-white/20 text-white hover:bg-white/30"
                        }`}
                        aria-label={`Copy ${color.hex}`}
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {isCopied && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-center bg-black/40 text-white py-0.5 rounded-md">
                        Copied to Clipboard!
                      </span>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="p-5 space-y-2">
                    <p className="font-black text-sm text-on-surface">{color.name}</p>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">
                      {color.role}
                    </p>
                    <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-on-surface-variant border-t border-outline-variant/60">
                      <span>RGB: {color.rgb}</span>
                      <span>HSL: {color.hsl}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ===================== SECTION 4: TYPOGRAPHY ===================== */}
        <section className="p-8 sm:p-12 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft space-y-8">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
            <Type className="w-4 h-4" />
            <span>04 Typography & Hierarchy (Inter)</span>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
              Primary Typeface: Inter
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl leading-relaxed">
              Designed for computer screens, Inter features a tall x-height to aid in readability of mixed-case and lower-case text. 
              Paired with strict tabular numbers for official PIN and tax records.
            </p>
          </div>

          {/* Interactive Font Previewer */}
          <div className="p-6 rounded-2xl bg-surface-container/60 border border-outline-variant space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Type sample text..."
                className="flex-1 h-11 px-3 rounded-xl bg-surface dark:bg-slate-900 border border-outline-variant text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 w-full"
              />

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xs font-mono text-on-surface-variant shrink-0">
                  {fontSize}px
                </span>
                <input
                  type="range"
                  min="16"
                  max="64"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full sm:w-32 accent-primary"
                />

                <select
                  value={fontWeight}
                  onChange={(e) => setFontWeight(Number(e.target.value))}
                  className="h-11 px-2.5 rounded-xl bg-surface dark:bg-slate-900 border border-outline-variant text-xs font-bold text-on-surface focus:outline-none"
                >
                  <option value={400}>Regular (400)</option>
                  <option value={600}>SemiBold (600)</option>
                  <option value={700}>Bold (700)</option>
                  <option value={900}>Black (900)</option>
                </select>
              </div>
            </div>

            {/* Live Text Output */}
            <div className="p-6 rounded-xl bg-surface dark:bg-slate-950 border border-outline-variant/60 overflow-hidden break-words">
              <p
                style={{
                  fontSize: `${fontSize}px`,
                  fontWeight: fontWeight,
                  lineHeight: 1.15,
                }}
                className="text-on-surface transition-all tracking-tight"
              >
                {customText || "Engineering digital products that scale."}
              </p>
            </div>
          </div>
        </section>

        {/* ===================== SECTION 5: BRAND VOICE & VALUES ===================== */}
        <section className="p-8 sm:p-12 rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full filter blur-[80px] pointer-events-none" />

          <div className="relative z-10 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
            <ShieldCheck className="w-4 h-4" />
            <span>05 Brand Voice & Architectural Values</span>
          </div>

          <div className="relative z-10 space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              &ldquo;Engineering Rigor, Security by Default, Measurable Outcomes, Performance&rdquo;
            </h2>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            
            {/* Aesthetic Pillars */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <span className="text-xs font-black uppercase tracking-widest text-red-400">
                Aesthetic Principles
              </span>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <strong>Corporate Modernism:</strong> Clean, authoritative, zero bloated tropes.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <strong>Modular Symmetry:</strong> Balanced component grids and clear visual weighting.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <strong>Monolithic Solidity:</strong> Deep, unshakeable dark and light contrasts.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <strong>Technical Polish:</strong> High-density data tables, tactile buttons & 44px targets.
                </li>
              </ul>
            </div>

            {/* Tone of Voice */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <span className="text-xs font-black uppercase tracking-widest text-red-400">
                Tone of Voice
              </span>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <strong>Authoritative:</strong> Confident in statutory compliance and high concurrency.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <strong>Technical:</strong> Precise, metrics-oriented (latency, throughput, encryption).
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <strong>Pragmatic:</strong> Direct solutions without superfluous jargon or false promises.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <strong>Disciplined:</strong> Strict zero-server PDF storage and KDPA compliance.
                </li>
              </ul>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
