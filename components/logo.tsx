import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  width?: number
  height?: number
  siteIconOnly?: boolean
}

/**
 * Akubrecah Brand Logo component.
 * Renders the primary brand logo on the website (adapted for dark/light mode via CSS).
 * Renders immediately during SSR to ensure optimal First Contentful Paint (FCP) and zero CLS.
 */
export function Logo({ 
  className, 
  width = 130, 
  height = 38,
  siteIconOnly = false,
}: LogoProps) {
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
          width={size}
          height={size}
          priority
          className="object-cover rounded-full"
        />
      </div>
    )
  }

  const altText = "Akubrecah Entertainment"

  return (
    <div className={cn("relative flex items-center justify-center shrink-0", className)} style={{ width, height }}>
      {/* Light mode logo */}
      <Image
        src="/akubrecah-logo.png"
        alt={altText}
        width={width}
        height={height}
        priority
        className="object-contain dark:hidden"
      />
      {/* Dark mode logo */}
      <Image
        src="/akubrecah-logo-dark.png"
        alt={altText}
        width={width}
        height={height}
        priority
        className="object-contain hidden dark:block"
      />
    </div>
  )
}
