"use client"

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"
import { Loader2 } from "lucide-react"

export default function SSOCallbackPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground space-y-4">
      <div className="flex flex-col items-center justify-center space-y-3 p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-lg max-w-sm text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <h2 className="text-lg font-black text-foreground">Completing Secure Sign-In...</h2>
        <p className="text-xs text-muted-foreground">
          Authenticating your credentials with Kenya Revenue Authority portal gateway.
        </p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  )
}
