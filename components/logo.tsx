import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  width?: number
  height?: number
  siteIconOnly?: boolean
}

const LOGO_ASPECT_RATIO = 885 / 282

/**
 * Akubrecah Brand Logo component.
 * Uses explicit aspect-ratio dimensions so flexbox parents (even with min-w-0)
 * can never collapse the logo, and swaps cleanly between light and dark assets.
 */
export function Logo({
  className,
  height = 36,
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
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-circle.png"
          alt="Akubrecah Site Icon"
          width={size}
          height={size}
          decoding="async"
          className="h-full w-full object-cover rounded-full block"
        />
      </span>
    )
  }

  const altText = "Akubrecah Entertainment"
  const computedWidth = Math.round(height * LOGO_ASPECT_RATIO)

  return (
    <span
      className={cn("inline-flex items-center shrink-0 select-none", className)}
      style={{ height, width: computedWidth, minWidth: computedWidth }}
    >
      {/* Light mode logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/akubrecah-logo.png"
        alt={altText}
        width={computedWidth}
        height={height}
        decoding="async"
        className="block dark:hidden object-contain"
        style={{ height: `${height}px`, width: `${computedWidth}px` }}
      />
      {/* Dark mode logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/akubrecah-logo-dark.png"
        alt={altText}
        width={computedWidth}
        height={height}
        decoding="async"
        className="hidden dark:block object-contain"
        style={{ height: `${height}px`, width: `${computedWidth}px` }}
      />
    </span>
  )
}
