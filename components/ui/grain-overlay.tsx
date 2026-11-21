import React from "react"

/**
 * Global analog fractal noise grain overlay ('Softly' Digital Wellness Spec)
 * Fixed div covering viewport with z-index 50, feTurbulence baseFrequency 0.65,
 * mix-blend-mode: overlay, opacity: 0.35, pointer-events: none.
 */
export function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-50 pointer-events-none opacity-[0.35] mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='softlyNoiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23softlyNoiseFilter)'/%3E%3C/svg%3E")`,
      }}
    />
  )
}
