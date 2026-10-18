"use client"

import Image from "next/image"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  width?: number
  height?: number
  siteIconOnly?: boolean
}

/**
 * Akubrecah Brand Logo component.
 * Renders the primary brand logo on the website (adapted for dark/light mode).
 * The circular emblem is retained for the site icon / favicon.
 */
export function Logo({ 
  className, 
  width = 130, 
  height = 38,
  siteIconOnly = false,
}: LogoProps) {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div style={{ width: siteIconOnly ? height : width, height }} className="bg-transparent shrink-0" />
  }

  if (siteIconOnly) {
    const size = Math.max(28, Math.min(height, 56))
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

  const logoSrc = resolvedTheme === 'dark' ? '/akubrecah-logo-dark.png' : '/akubrecah-logo.png'
  const altText = "Akubrecah Technologies"

  return (
    <div className={cn("relative flex items-center justify-center shrink-0", className)} style={{ width, height }}>
      <Image
        src={logoSrc}
        alt={altText}
        fill
        priority
        className="object-contain"
      />
    </div>
  )
}
