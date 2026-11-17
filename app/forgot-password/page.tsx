"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useSignIn } from "@clerk/nextjs/legacy"
import { useRouter } from "next/navigation"
import { Mail, Lock, KeyRound, ArrowLeft, ArrowRight, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ForgotPasswordPage() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<"request" | "reset" | "done">("request")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || !signIn) return

    setLoading(true)
    setError(null)
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      })
      setStep("reset")
    } catch (err: any) {
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Unable to send reset code. Please check your email address."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || !signIn) return

    setLoading(true)
    setError(null)
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password: newPassword,
      })

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId })
        setStep("done")
        setTimeout(() => {
          router.push("/dashboard")
        }, 1200)
      } else {
        setError("Password updated, but additional sign-in verification is required. Please sign in normally.")
      }
    } catch (err: any) {
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Invalid code or password does not meet security requirements."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md bg-card text-card-foreground border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mx-auto">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Reset Your Password
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === "request" && "Enter the email address associated with your account to receive a verification code."}
            {step === "reset" && `Enter the reset code sent to ${email} and choose a new strong password.`}
            {step === "done" && "Your password has been updated. Redirecting to your account..."}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === "done" ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-semibold text-foreground">Password reset successful</p>
            <Button asChild className="w-full h-11 rounded-xl">
              <Link href="/dashboard">Continue to Dashboard</Link>
            </Button>
          </div>
        ) : step === "request" ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="reset-email" className="text-xs font-bold uppercase tracking-wider text-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  id="reset-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-10 rounded-xl"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading || !isLoaded} className="w-full h-11 rounded-xl font-bold">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Reset Code...
                </>
              ) : (
                <>
                  Send Reset Code
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="reset-code" className="text-xs font-bold uppercase tracking-wider text-foreground">
                Email Verification Code
              </label>
              <Input
                id="reset-code"
                type="text"
                inputMode="numeric"
                required
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-11 font-mono tracking-widest rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reset-new-password" className="text-xs font-bold uppercase tracking-wider text-foreground">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  id="reset-new-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11 pl-10 pr-10 rounded-xl"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading || !isLoaded} className="w-full h-11 rounded-xl font-bold">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Update Password & Sign In"
              )}
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep("request")
                setError(null)
              }}
              className="w-full text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Use a different email address
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-border text-center">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
