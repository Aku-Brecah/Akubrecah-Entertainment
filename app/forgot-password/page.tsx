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
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 bg-[#FDFCF8] text-[#292524] font-sans overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -left-20 w-96 h-96 rounded-full bg-[#FFE4E1] opacity-60 blur-[95px] animate-float-blob"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-12 -right-20 w-96 h-96 rounded-full bg-[#E6E6FA] opacity-60 blur-[100px] animate-float-blob [animation-delay:3s]"
      />

      <div className="relative z-10 w-full max-w-md bg-white text-[#292524] border border-stone-100 rounded-[2.5rem] p-7 sm:p-9 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_24px_60px_-22px_rgba(255,183,178,0.32)] space-y-6">
        <div className="space-y-1.5 border-b border-stone-100 pb-5">
          <div className="flex items-center justify-between">
            <span className="font-cursive text-2xl sm:text-3xl text-[#78716C]">account recovery</span>
            <span className="w-8 h-8 rounded-full bg-[#E8EFE8] flex items-center justify-center text-[#292524]">
              <KeyRound className="w-4 h-4" />
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-[-0.025em] text-[#292524]">
            Reset your password
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed">
            {step === "request" && "Enter the email address associated with your account to receive a verification code."}
            {step === "reset" && `Enter the reset code sent to ${email} and choose a new password.`}
            {step === "done" && "Your password has been updated. Redirecting to your workspace..."}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-4 rounded-2xl bg-[#FFE4E1]/70 border border-[#FFB7B2] text-[#292524] text-xs font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === "done" ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-[#292524]" />
            <p className="text-sm font-medium text-[#292524]">Password reset successful</p>
            <Button asChild className="w-full h-12 rounded-full bg-[#FFB7B2] text-[#292524]">
              <Link href="/dashboard">Continue to workspace</Link>
            </Button>
          </div>
        ) : step === "request" ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="reset-email" className="text-xs font-medium text-[#292524] pl-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#78716C] absolute left-4 top-1/2 -translate-y-1/2" />
                <Input
                  id="reset-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-11 rounded-full"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading || !isLoaded} className="w-full h-12 rounded-full font-medium bg-[#FFB7B2] text-[#292524]">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending reset code...
                </>
              ) : (
                <>
                  Send reset code
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="reset-code" className="text-xs font-medium text-[#292524] pl-1">
                Email verification code
              </label>
              <Input
                id="reset-code"
                type="text"
                inputMode="numeric"
                required
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-12 font-mono tracking-widest rounded-full text-center"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reset-new-password" className="text-xs font-medium text-[#292524] pl-1">
                New password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#78716C] absolute left-4 top-1/2 -translate-y-1/2" />
                <Input
                  id="reset-new-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-12 pl-11 pr-11 rounded-full"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-[#292524]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading || !isLoaded} className="w-full h-12 rounded-full font-medium bg-[#FFB7B2] text-[#292524]">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating password...
                </>
              ) : (
                "Update password & sign in"
              )}
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep("request")
                setError(null)
              }}
              className="w-full text-xs font-medium text-[#78716C] hover:text-[#292524]"
            >
              Use a different email address
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-stone-100 text-center">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#292524] hover:text-[#78716C] underline underline-offset-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to log in
          </Link>
        </div>
      </div>
    </div>
  )
}
