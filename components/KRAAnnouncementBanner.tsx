"use client"

import { AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

export default function KRAAnnouncementBanner() {
  const pathname = usePathname()
  const [announcement, setAnnouncement] = useState<string | null>(null)

  const [isKra, setIsKra] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname.toLowerCase()
      setIsKra(host.startsWith("kra.") || host.includes("kra.akubrecah.com"))
    }
    // Set active third-party compliance facilitation announcement notice
    setAnnouncement(
      "Cyber Café Assistance Notice: Instant KRA PIN certificate retrieval & compliance facilitation. Official free government portal: itax.kra.go.ke."
    )
  }, [])

  if (!isKra || !announcement || pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard')) return null

  return (
    <div role="region" aria-label="Service Notice" className="w-full bg-surface-container border-b border-outline-variant text-on-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" />
          <p className="text-on-surface-variant font-medium truncate sm:whitespace-normal">
            {announcement}
          </p>
        </div>
      </div>
    </div>
  )
}
