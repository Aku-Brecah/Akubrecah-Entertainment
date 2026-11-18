'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export function AdminLayoutWrapper({ 
  children, 
  hostname = "" 
}: { 
  children: React.ReactNode
  hostname?: string 
}) {
  const pathname = usePathname()

  const initialIsKra = hostname.toLowerCase().startsWith("kra.") || hostname.toLowerCase().includes("kra.akubrecah.com")
  const initialIsAdmin = hostname.toLowerCase().startsWith("admin.") || hostname.toLowerCase().includes("admin.akubrecah.com")

  const [isKraDomain, setIsKraDomain] = useState(initialIsKra)
  const [isAdminDomain, setIsAdminDomain] = useState(initialIsAdmin)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname.toLowerCase()
      setIsKraDomain(host.startsWith("kra.") || host.includes("kra.akubrecah.com"))
      setIsAdminDomain(host.startsWith("admin.") || host.includes("admin.akubrecah.com"))
    }
  }, [])

  const isStandalonePage =
    pathname?.startsWith('/sign-in') ||
    pathname?.startsWith('/sign-up') ||
    pathname?.startsWith('/forgot-password') ||
    pathname?.startsWith('/sso-callback') ||
    pathname?.startsWith('/remotion-demo') ||
    pathname?.startsWith('/onboarding') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/dashboard') ||
    pathname === '/retrieval-portal' ||
    pathname?.startsWith('/retrieval-portal') ||
    isKraDomain ||
    isAdminDomain

  if (isStandalonePage) {
    return <main id="main-content" className="flex-grow flex flex-col w-full min-h-screen min-w-0">{children}</main>
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main id="main-content" className="flex-grow flex-1 flex flex-col w-full pt-16">
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}

