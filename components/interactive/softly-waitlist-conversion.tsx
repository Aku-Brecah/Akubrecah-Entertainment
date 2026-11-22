"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"

export function SoftlyWaitlistConversion() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
    setTimeout(() => {
      router.push(`/contact?email=${encodeURIComponent(email.trim())}`)
    }, 600)
  }

  return (
    <div className="relative w-full rounded-[3rem] bg-white/80 border border-stone-200/70 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] px-6 py-16 sm:px-12 sm:py-24 overflow-hidden text-center">
      {/* High-blur floating pastel gradients */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#FFE4E1] opacity-60 blur-[80px] animate-float-blob"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-20 w-96 h-96 rounded-full bg-[#E6E6FA] opacity-60 blur-[90px] animate-float-blob [animation-delay:2s]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-[#E8EFE8] opacity-50 blur-[75px]"
      />

      <div className="relative z-10 max-w-xl mx-auto space-y-6">
        {/* Dark stone #292524 rounded-square icon at the top with a coral dot */}
        <div className="w-14 h-14 rounded-2xl bg-[#292524] flex items-center justify-center mx-auto shadow-[0_4px_20px_-2px_rgba(0,0,0,0.12)]">
          <span className="w-3.5 h-3.5 rounded-full bg-[#FFB7B2]" />
        </div>

        <div className="space-y-3">
          <p className="font-cursive text-2xl sm:text-3xl text-[#78716C]">
            project scoping &amp; technical consultation
          </p>
          <h2 className="text-3xl sm:text-5xl font-medium text-[#292524] tracking-[-0.025em] leading-[1.12]">
            Planning a custom platform or mobile app{" "}
            <span className="font-cursive text-4xl sm:text-6xl font-normal text-[#292524] px-1">
              with us
            </span>
            ?
          </h2>
          <p className="text-sm sm:text-base text-[#78716C] max-w-md mx-auto leading-relaxed">
            Share your email to schedule a direct engineering consultation in Nairobi, or configure your technical requirements in our live scope estimator.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-md mx-auto pt-2"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address..."
            aria-label="Email address"
            className="flex-1 h-13 px-6 rounded-full bg-stone-50 border border-stone-200 text-sm text-[#292524] placeholder:text-[#78716C] focus:outline-none focus:border-[#FFB7B2] focus:ring-2 focus:ring-[#FFB7B2]/30 shadow-2xs"
          />
          <button
            type="submit"
            className="h-13 px-7 rounded-full bg-[#292524] text-[#FDFCF8] text-sm font-medium shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1)] hover:scale-105 transition-transform duration-300 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            {submitted ? (
              <>
                <Check className="w-4 h-4 text-[#FFB7B2]" />
                <span>Redirecting...</span>
              </>
            ) : (
              <>
                <span>Join &amp; Consult</span>
                <ArrowRight className="w-4 h-4 text-[#FFB7B2]" />
              </>
            )}
          </button>
        </form>

        <div className="pt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-[#78716C]">
          <Link
            href="/estimator"
            className="underline underline-offset-4 hover:text-[#292524] transition-colors"
          >
            Interactive Scope Estimator
          </Link>
          <span>·</span>
          <Link
            href="/services"
            className="underline underline-offset-4 hover:text-[#292524] transition-colors"
          >
            Engineering Services
          </Link>
          <span>·</span>
          <Link
            href="/contact"
            className="underline underline-offset-4 hover:text-[#292524] transition-colors"
          >
            Direct Inquiry Form
          </Link>
          <span>·</span>
          <Link
            href="/retrieval-portal"
            className="underline underline-offset-4 hover:text-[#292524] transition-colors"
          >
            KRA Retrieval Portal
          </Link>
        </div>
      </div>
    </div>
  )
}
