"use client"

import Image from "next/image"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  width?: number
  height?: number
  showBadge?: boolean
  badgeOnly?: boolean
}

/**
 * Akubrecah Brand Logo component.
 * Features the official circular brand emblem ("Design | Print | Brand") alongside the wordmark.
 */
export function Logo({ 
  className, 
  width = 120, 
  height = 36,
  showBadge = true,
  badgeOnly = false,
}: LogoProps) {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div style={{ width: badgeOnly ? height : width, height }} className="bg-transparent" />
  }

  const logoSrc = resolvedTheme === 'dark' ? '/akubrecah-logo-dark.png' : '/akubrecah-logo.png'
  const altText = "Akubrecah Entertainment | Design Print Brand"
  const badgeSize = Math.max(28, Math.min(height, 38))

  return (
    <div className={cn("relative inline-flex items-center gap-2", className)}>
      {showBadge && (
        <div 
          className="relative shrink-0 rounded-full overflow-hidden shadow-sm border border-outline-variant/30 bg-white"
          style={{ width: badgeSize, height: badgeSize }}
        >
          <Image
            src="/logo-circle.png"
            alt="Akubrecah Entertainment Emblem"
            fill
            sizes={`${badgeSize}px`}
            priority
            className="object-cover"
          />
        </div>
      )}
      {!badgeOnly && (
        <div className="relative flex items-center justify-center shrink-0" style={{ width, height }}>
          <Image
            src={logoSrc}
            alt={altText}
            fill
            priority
            className="object-contain"
          />
        </div>
      )}
    </div>
  )
}
