"use client"

import React from "react"
import { ExternalLink, MapPin } from "lucide-react"

interface GooglePreferredSourceButtonProps {
  className?: string
  searchQuery?: string
  siteDomain?: string
}

/**
 * Google Verified Search & Maps Profile Component
 * Provides direct, 100% reliable links to Akubrecah's Google Search & Google Maps profiles.
 */
export function GooglePreferredSourceButton({
  className = "",
  searchQuery = "Akubrecah Entertainment Nairobi",
}: GooglePreferredSourceButtonProps) {
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Direct Google Search */}
      <a
        href={googleSearchUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Find Akubrecah on Google Search"
        aria-label="Find Akubrecah on Google Search"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-surface-container hover:bg-surface-container-high border border-outline-variant/70 text-on-surface transition-all shadow-2xs hover:shadow-xs group cursor-pointer min-h-[34px]"
      >
        {/* Official Google G 4-color SVG Icon */}
        <svg
          className="w-3.5 h-3.5 shrink-0"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
          />
        </svg>
        <span className="text-[11px] font-medium tracking-tight">Google Search</span>
        <ExternalLink className="w-3 h-3 text-on-surface-variant group-hover:text-primary shrink-0 transition-colors" />
      </a>

      {/* Direct Google Maps Profile */}
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="View Akubrecah on Google Maps"
        aria-label="View Akubrecah on Google Maps"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-surface-container hover:bg-surface-container-high border border-outline-variant/70 text-on-surface transition-all shadow-2xs hover:shadow-xs group cursor-pointer min-h-[34px]"
      >
        <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-[11px] font-medium tracking-tight">Google Maps</span>
        <ExternalLink className="w-3 h-3 text-on-surface-variant group-hover:text-primary shrink-0 transition-colors" />
      </a>
    </div>
  )
}
