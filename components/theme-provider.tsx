"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// Suppress expected localhost dev warnings (next-themes FOUC script tag & Clerk production domain check)
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalConsoleError = console.error
  console.error = (...args: unknown[]) => {
    const firstArg =
      typeof args[0] === "string"
        ? args[0]
        : args[0] instanceof Error
          ? args[0].message
          : String(args[0] ?? "")
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    if (
      firstArg.includes("Encountered a script tag while rendering React component") ||
      (isLocalhost && firstArg.includes("Clerk: Production Keys are only allowed for domain"))
    ) {
      return
    }
    originalConsoleError.apply(console, args)
  }
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
