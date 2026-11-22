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
 * Renders the primary brand logo on every page and swaps automatically
 * between light (/akubrecah-logo.png) and dark (/akubrecah-logo-dark.png) themes.
 */
export function Logo({
  className,
  height = 38,
  siteIconOnly = false,
}: LogoProps) {
  if (siteIconOnly) {
    const size = Math.max(28, Math.min(height, 56))
    return (
      <span
        className={cn(
          "relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden shadow-2xs border border-stone-200/70 dark:border-stone-700 bg-white p-0.5 select-none",
          className
        )}
        style={{ width: size, height: size }}
      >
        <Image
          src="/logo-circle.png"
          alt="Akubrecah Site Icon"
          width={288}
          height={288}
          priority
          unoptimized
          className="h-full w-full object-cover rounded-full"
        />
      </span>
    )
  }

  const altText = "Akubrecah Entertainment"
  const hasExplicitHeightClass = Boolean(className && /\bh-/.test(className))

  return (
    <span
      className={cn("inline-flex items-center shrink-0 select-none", className)}
      style={!hasExplicitHeightClass ? { height } : undefined}
    >
      {/* Light mode logo */}
      <Image
        src="/akubrecah-logo.png"
        alt={altText}
        width={885}
        height={282}
        priority
        unoptimized
        className="h-full w-auto max-w-none object-contain dark:hidden"
      />
      {/* Dark mode logo */}
      <Image
        src="/akubrecah-logo-dark.png"
        alt={altText}
        width={885}
        height={282}
        priority
        unoptimized
        className="h-full w-auto max-w-none object-contain hidden dark:block"
      />
    </span>
  )
}
