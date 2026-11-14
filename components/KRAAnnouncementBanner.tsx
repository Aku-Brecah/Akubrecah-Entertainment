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
    <div role="alert" aria-live="polite" className="sticky top-0 z-[60] w-full bg-primary text-white border-b border-white/10 shadow-none">
      <div className="flex items-center py-1 h-8">
        <div className="flex-shrink-0 pl-4">
          <AlertCircle className="h-4 w-4 text-white" />
        </div>
        
        <div className="flex-1 overflow-hidden mx-4">
          <div className="animate-marquee whitespace-nowrap inline-block">
            <span className="text-xs font-bold uppercase tracking-widest px-8">
              {announcement}
            </span>
            <span className="text-xs font-bold uppercase tracking-widest px-8">
              {announcement}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
