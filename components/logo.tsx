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
 * Displays the authoritative circular site icon emblem as requested.
 */
export function Logo({ 
  className, 
  width = 36, 
  height = 36,
  showBadge = true,
  badgeOnly = true,
}: LogoProps) {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const size = Math.max(28, Math.min(height, 56))

  if (!mounted) {
    return <div style={{ width: size, height: size }} className="rounded-full bg-transparent shrink-0" />
  }

  const logoSrc = resolvedTheme === 'dark' ? '/akubrecah-logo-dark.png' : '/akubrecah-logo.png'
  const altText = "Akubrecah"

  if (badgeOnly) {
    return (
      <div 
        className={cn("relative shrink-0 rounded-full overflow-hidden shadow-2xs border border-outline-variant/40 bg-white p-0.5", className)}
        style={{ width: size, height: size }}
      >
        <Image
          src="/logo-circle.png"
          alt="Akubrecah Site Icon"
          fill
          sizes={`${size}px`}
          priority
          className="object-cover rounded-full"
        />
      </div>
    )
  }

  return (
    <div className={cn("relative inline-flex items-center gap-2.5", className)}>
      {showBadge && (
        <div 
          className="relative shrink-0 rounded-full overflow-hidden shadow-2xs border border-outline-variant/40 bg-white p-0.5"
          style={{ width: size, height: size }}
        >
          <Image
            src="/logo-circle.png"
            alt="Akubrecah Emblem"
            fill
            sizes={`${size}px`}
            priority
            className="object-cover rounded-full"
          />
        </div>
      )}
      <div className="relative flex items-center justify-center shrink-0" style={{ width, height }}>
        <Image
          src={logoSrc}
          alt={altText}
          fill
          priority
          className="object-contain"
        />
      </div>
    </div>
  )
}
