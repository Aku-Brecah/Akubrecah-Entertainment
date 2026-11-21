"use client"

import React, { useState } from "react"
import Link from "next/link"
import { ArrowRight, X } from "lucide-react"

export default function KRAAnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className="relative z-40 w-full bg-[#E8EFE8]/90 text-[#292524] border-b border-stone-200/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-10 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5 min-w-0 truncate">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white text-[#292524] font-medium text-[11px] shrink-0 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#FFB7B2]" />
            Statutory season
          </span>
          <span className="text-[#78716C] truncate">
            KRA PIN certificate retrieval &amp; nil returns filing workspace is active.
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/retrieval-portal"
            className="inline-flex items-center gap-1 font-medium text-[#292524] hover:text-[#78716C] transition-colors whitespace-nowrap"
          >
            <span>Open workspace</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 text-[#78716C] hover:text-[#292524] rounded-full transition-colors cursor-pointer"
            aria-label="Dismiss announcement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
