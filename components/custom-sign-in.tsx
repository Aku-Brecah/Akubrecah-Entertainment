"use client"

import React, { useState } from "react"
import { useSignIn } from "@clerk/nextjs/legacy"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Check,
  Star,
  KeyRound,
  ShieldCheck,
  FileCheck2,
  Smartphone,
} from "lucide-react"
import { isSafeRedirectPath } from "@/lib/edge/routing"

export function CustomSignIn({ isKraPortal = false }: { isKraPortal?: boolean }) {
  const { isLoaded, signIn, setActive } = useSignIn()
  const searchParams = useSearchParams()
  const [defaultRedirect, setDefaultRedirect] = useState(isKraPortal ? "/" : "/dashboard")

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname.toLowerCase()
      const isHostAdmin = host.startsWith("admin.")
      const isHostKra = isKraPortal || host.startsWith("kra.") || searchParams.get("portal") === "kra"
      setDefaultRedirect(isHostAdmin || isHostKra ? "/" : "/dashboard")
    }
  }, [searchParams, isKraPortal])

  const rawRedirect = searchParams.get("redirect_url")
  const redirectUrl = rawRedirect && isSafeRedirectPath(rawRedirect) ? rawRedirect : defaultRedirect

  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verification & OTP state
  const [requiresVerification, setRequiresVerification] = useState(false)
  const [verificationMode, setVerificationMode] = useState<"first_factor" | "second_factor">("second_factor")
  const [verificationStrategy, setVerificationStrategy] = useState<string>("email_code")
  const [verificationCode, setVerificationCode] = useState("")
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [resendStatus, setResendStatus] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || !signIn) return

    setLoading(true)
    setError(null)
    setResendStatus(null)

    try {
      const result = await signIn.create({
        identifier: identifier.trim(),
        password: password,
      })

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId })
        window.location.href = redirectUrl
        return
      }

      if (result.status === "needs_first_factor") {
        const factors = result.supportedFirstFactors as any[]
        const emailFactor = factors?.find((f) => f.strategy === "email_code")
        const phoneFactor = factors?.find((f) => f.strategy === "phone_code")

        if (emailFactor) {
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: emailFactor.emailAddressId,
          })
          setVerificationStrategy("email_code")
        } else if (phoneFactor) {
          await signIn.prepareFirstFactor({
            strategy: "phone_code",
            phoneNumberId: phoneFactor.phoneNumberId,
          })
          setVerificationStrategy("phone_code")
        }
        setVerificationMode("first_factor")
        setRequiresVerification(true)
        return
      }

      if (result.status === "needs_second_factor") {
        const factors = result.supportedSecondFactors as any[]
        const emailFactor = factors?.find((f) => f.strategy === "email_code")
        const phoneFactor = factors?.find((f) => f.strategy === "phone_code")
        const totpFactor = factors?.find((f) => f.strategy === "totp")

        if (emailFactor) {
          await signIn.prepareSecondFactor({ strategy: "email_code" })
          setVerificationStrategy("email_code")
        } else if (phoneFactor) {
          await signIn.prepareSecondFactor({ strategy: "phone_code" })
          setVerificationStrategy("phone_code")
        } else if (totpFactor) {
          setVerificationStrategy("totp")
        }
        setVerificationMode("second_factor")
        setRequiresVerification(true)
        return
      }

      setError("Additional verification required. Please try another sign-in method.")
    } catch (err: any) {
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Invalid email or password. Please try again."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || !signIn) return

    setVerificationLoading(true)
    setError(null)

    try {
      let result: any
      if (verificationMode === "first_factor") {
        result = await signIn.attemptFirstFactor({
          strategy: verificationStrategy as any,
          code: verificationCode.trim(),
        })
      } else {
        result = await signIn.attemptSecondFactor({
          strategy: verificationStrategy as any,
          code: verificationCode.trim(),
        })
      }

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId })
        window.location.href = redirectUrl
      } else {
        setError("Verification code accepted, but additional verification is needed.")
      }
    } catch (err: any) {
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Invalid verification code. Please check and try again."
      setError(msg)
    } finally {
      setVerificationLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!isLoaded || !signIn) return
    setError(null)
    setResendStatus("Resending code...")
    try {
      if (verificationMode === "first_factor") {
        const factors = signIn.supportedFirstFactors as any[]
        const factor = factors?.find((f) => f.strategy === verificationStrategy)
        if (factor) {
          await signIn.prepareFirstFactor({
            strategy: verificationStrategy as any,
            emailAddressId: factor.emailAddressId,
            phoneNumberId: factor.phoneNumberId,
          })
        }
      } else {
        if (verificationStrategy === "email_code" || verificationStrategy === "phone_code") {
          await signIn.prepareSecondFactor({ strategy: verificationStrategy as any })
        }
      }
      setResendStatus("New code sent! Please check your inbox.")
    } catch (err: any) {
      setResendStatus(null)
      setError(err.errors?.[0]?.message || "Failed to resend code.")
    }
  }

  const handleGoogleSignIn = async () => {
    if (!isLoaded || !signIn) return
    setGoogleLoading(true)
    setError(null)

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: redirectUrl,
      })
    } catch (err: any) {
      setGoogleLoading(false)
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Google sign in failed. Please try again."
      setError(msg)
    }
  }

  const marqueeItems = [
    "Safaricom Daraja M-Pesa Express",
    "KDPA 2019 Zero-Storage Privacy",
    "Nairobi Cyber Cafe Network",
    "Volatile RAM PDF Streaming",
    "Next.js Enterprise Cloud",
    "256-Bit TLS Encrypted Sessions",
  ]

  return (
    <div
      className="min-h-screen w-full bg-[#fdf9f3] text-[#23201d] antialiased overflow-x-hidden"
      style={{ fontFamily: "'Poppins', 'Outfit', ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* 1. STICKY BLURRED HEADER */}
      <header className="sticky top-0 z-50 w-full bg-[#fdf9f3]/80 backdrop-blur-md border-b border-[#efe6d8]/70">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          {/* LEFT: Brand lockup */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff7a59] to-[#b83a16] shadow-[0_8px_20px_-8px_rgba(255,122,89,0.55)] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105">
              <svg className="w-4 h-4" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
                <path d="M208,144a15.78,15.78,0,0,1-10.42,14.94L146,178l-19,51.62a15.92,15.92,0,0,1-29.88,0L78,178l-51.62-19a15.92,15.92,0,0,1,0-29.88L78,110l19-51.62a15.92,15.92,0,0,1,29.88,0L146,110l51.62,19A15.78,15.78,0,0,1,208,144Z" />
              </svg>
            </span>
            <span className="font-bold text-[18px] tracking-tight text-[#23201d]">
              Akubrecah
            </span>
          </Link>

          {/* CENTER: Nav links (hidden below md) */}
          <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-[#736c63]">
            <a href="#how-it-works" className="hover:text-[#23201d] transition-colors">
              How it works
            </a>
            <Link href="/retrieval-portal" className="hover:text-[#23201d] transition-colors">
              Retrieval portal
            </Link>
            <Link href="/estimator" className="hover:text-[#23201d] transition-colors">
              Scope estimator
            </Link>
          </nav>

          {/* RIGHT: Auth switch + solid bg-ink pill CTA */}
          <div className="flex items-center gap-4">
            <Link
              href="/sign-up"
              className="hidden sm:inline-block text-sm font-medium text-[#23201d]/80 hover:text-[#23201d] transition-colors"
            >
              Create account
            </Link>
            <Link
              href="/retrieval-portal"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#23201d] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#23201d]/90 transition-all"
            >
              <span>Get started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. TWO-COLUMN HERO + LOGIN SECTION */}
      <section
        id="signin"
        className="relative overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(255,122,89,0.10), transparent 45%), radial-gradient(circle at 88% 8%, rgba(43,182,163,0.12), transparent 45%)",
        }}
      >
        {/* Two decorative blurred blobs behind content */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#ff7a59]/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-40 -right-20 w-96 h-96 rounded-full bg-[#2bb6a3]/20 blur-3xl"
        />

        <div className="relative z-10 mx-auto max-w-6xl px-6 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* LEFT COLUMN: Friendly Product Pitch */}
          <div className="space-y-7">
            {/* Eyebrow pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#efe6d8] shadow-[0_1px_2px_rgba(35,32,29,0.04),0_12px_30px_-12px_rgba(35,32,29,0.16)] text-xs font-semibold text-[#23201d]">
              <span className="w-2 h-2 rounded-full bg-[#2bb6a3]" />
              <span>
                {isKraPortal
                  ? "Independent KRA compliance workspace"
                  : "Digital living room for statutory & engineering tools"}
              </span>
            </div>

            {/* Big tracking-tight headline with hand-drawn teal underline on one accent word */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-bold tracking-tight text-[#23201d] leading-[1.1]">
              From ID lookup to certificate in one{" "}
              <span className="relative inline-block text-[#23201d]">
                breath
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-[#2bb6a3]"
                  viewBox="0 0 180 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M3 10.5C42 3.5 118 2.5 177 9.5"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              .
            </h1>

            {/* Value paragraph (warm and human, zero em-dashes) */}
            <p className="text-base sm:text-lg text-[#736c63] leading-relaxed max-w-xl">
              Sign in to your Akubrecah workspace to manage KRA PIN certificate retrievals, Cyber Cafe monthly passes, Safaricom Daraja M-Pesa receipts, and custom software projects in one calm place.
            </p>

            {/* Three-item teal-check benefit list */}
            <ul className="space-y-3.5 pt-1">
              {[
                "Instant KRA PIN retrieval with zero server PDF storage",
                "Same-page Safaricom Daraja M-Pesa Express verification",
                "Free to start, no card needed, KDPA 2019 privacy aligned",
              ].map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 text-sm sm:text-[15px] font-medium text-[#23201d]">
                  <span className="w-6 h-6 rounded-full bg-[#2bb6a3]/15 text-[#16776a] flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            {/* Stacked-avatar social-proof cluster with 5-star rating */}
            <div className="pt-3 flex flex-wrap items-center gap-4">
              <div className="flex -space-x-2.5">
                {[
                  { initials: "WM", bg: "bg-[#FFB7B2] text-[#23201d]" },
                  { initials: "BO", bg: "bg-[#E8EFE8] text-[#16776a]" },
                  { initials: "AK", bg: "bg-[#EFEDF4] text-[#23201d]" },
                  { initials: "DN", bg: "bg-[#23201d] text-white" },
                ].map((av) => (
                  <div
                    key={av.initials}
                    className={`w-10 h-10 rounded-full border-2 border-[#fdf9f3] ${av.bg} text-xs font-bold flex items-center justify-center shadow-xs`}
                  >
                    {av.initials}
                  </div>
                ))}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-[#ff7a59]">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-[#ff7a59] text-[#ff7a59]" />
                  ))}
                  <span className="text-xs font-bold text-[#23201d] ml-1">5.0</span>
                </div>
                <p className="text-xs text-[#736c63]">
                  Loved by taxpayers, cyber cafes &amp; engineering teams in Kenya
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: White rounded-4xl (2rem) Login Card */}
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white rounded-[2rem] border border-[#efe6d8] p-7 sm:p-9 shadow-[0_2px_4px_rgba(35,32,29,0.04),0_24px_60px_-22px_rgba(255,122,89,0.28)] space-y-6">
              {/* Card Header */}
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-between">
                  <span className="font-cursive text-2xl text-[#736c63]">welcome back</span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E8EFE8] text-[#16776a] text-[11px] font-semibold">
                    256-bit TLS
                  </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-[#23201d]">
                  {requiresVerification ? "Verify your security code" : "Log in to your workspace"}
                </h2>
                <p className="text-xs sm:text-sm text-[#736c63]">
                  {requiresVerification
                    ? "Enter the 6-digit verification code sent to your device"
                    : "Continue with Google or sign in with your email and password"}
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-2xl bg-[#ff7a59]/10 border border-[#ff7a59]/30 text-[#b83a16] text-xs font-medium flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {!requiresVerification ? (
                <div className="space-y-5">
                  {/* Social Auth Button: Continue with Google */}
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading || loading}
                      className="w-full h-12 px-4 rounded-2xl bg-white hover:bg-[#fdf9f3] border border-[#efe6d8] hover:border-[#23201d]/25 flex items-center justify-center gap-3 text-sm font-semibold text-[#23201d] shadow-[0_1px_2px_rgba(35,32,29,0.04),0_12px_30px_-12px_rgba(35,32,29,0.16)] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {googleLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#ff7a59]" />
                      ) : (
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                      )}
                      <span>Continue with Google</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative flex items-center justify-center">
                    <div className="w-full border-t border-[#efe6d8]" />
                    <span className="bg-white px-3 text-xs font-medium text-[#736c63] whitespace-nowrap">
                      or sign in with email
                    </span>
                    <div className="w-full border-t border-[#efe6d8]" />
                  </div>

                  {/* Email & Password Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="signin-email" className="block text-xs font-semibold text-[#23201d]">
                        Email address
                      </label>
                      <div className="relative flex items-center rounded-2xl border border-[#efe6d8] bg-[#fdf9f3]/60 auth-input-focus transition-all">
                        <Mail className="w-4 h-4 text-[#736c63] ml-4 shrink-0" />
                        <input
                          id="signin-email"
                          type="text"
                          required
                          autoComplete="username"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="you@company.com"
                          className="w-full h-12 px-3 bg-transparent border-0 rounded-2xl text-sm text-[#23201d] placeholder:text-[#736c63]/60 focus:outline-none focus:ring-0"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="signin-password" className="block text-xs font-semibold text-[#23201d]">
                          Password
                        </label>
                        <Link
                          href="/forgot-password"
                          className="text-xs font-semibold text-[#c8431f] hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative flex items-center rounded-2xl border border-[#efe6d8] bg-[#fdf9f3]/60 auth-input-focus transition-all">
                        <Lock className="w-4 h-4 text-[#736c63] ml-4 shrink-0" />
                        <input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full h-12 px-3 bg-transparent border-0 rounded-2xl text-sm text-[#23201d] placeholder:text-[#736c63]/60 focus:outline-none focus:ring-0"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="pr-4 pl-2 text-[#736c63] hover:text-[#23201d] transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !identifier || !password}
                      className="w-full h-12 rounded-2xl bg-[#ff7a59] hover:bg-[#c8431f] text-white font-semibold text-sm shadow-[0_8px_20px_-8px_rgba(255,122,89,0.55)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <>
                          <span>Log in to workspace</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                /* OTP / 2FA Verification Step */
                <form onSubmit={handleVerificationSubmit} className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-[#2bb6a3]/10 border border-[#2bb6a3]/30 text-xs text-[#16776a] font-medium flex items-start gap-2.5">
                    <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      {verificationStrategy === "email_code"
                        ? "We sent a 6-digit security code to your email address. Enter it below to finish signing in."
                        : verificationStrategy === "phone_code"
                        ? "We sent a 6-digit security code via SMS. Enter it below to finish signing in."
                        : "Enter the 6-digit code from your authenticator app."}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="signin-otp" className="block text-xs font-semibold text-[#23201d]">
                      6-digit verification code
                    </label>
                    <div className="relative flex items-center rounded-2xl border border-[#efe6d8] bg-[#fdf9f3]/60 auth-input-focus transition-all">
                      <input
                        id="signin-otp"
                        type="text"
                        required
                        maxLength={6}
                        autoFocus
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="123456"
                        className="w-full h-12 px-4 bg-transparent border-0 rounded-2xl text-center font-mono tracking-widest text-lg text-[#23201d] focus:outline-none focus:ring-0"
                      />
                    </div>
                  </div>

                  {resendStatus && (
                    <p className="text-xs text-[#16776a] font-semibold text-center">{resendStatus}</p>
                  )}

                  <button
                    type="submit"
                    disabled={verificationLoading || verificationCode.length < 6}
                    className="w-full h-12 rounded-2xl bg-[#ff7a59] hover:bg-[#c8431f] text-white font-semibold text-sm shadow-[0_8px_20px_-8px_rgba(255,122,89,0.55)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {verificationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & continue"}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-2">
                    {verificationStrategy !== "totp" && (
                      <button
                        type="button"
                        onClick={handleResendCode}
                        className="text-[#c8431f] hover:underline font-semibold cursor-pointer"
                      >
                        Resend code
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setRequiresVerification(false)
                        setVerificationCode("")
                        setError(null)
                        setResendStatus(null)
                      }}
                      className="text-[#736c63] hover:text-[#23201d] ml-auto cursor-pointer"
                    >
                      Back to login
                    </button>
                  </div>
                </form>
              )}

              {/* Legal Footnote & Independent KRA Notice */}
              <div className="space-y-3 pt-2 border-t border-[#efe6d8]">
                <p className="text-[11px] text-[#736c63] leading-relaxed text-center">
                  By continuing, you agree to our{" "}
                  <Link href="/legal/terms" className="text-[#23201d] font-medium underline underline-offset-2">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/legal/privacy" className="text-[#23201d] font-medium underline underline-offset-2">
                    Privacy Policy
                  </Link>
                  . Independent service, not affiliated with KRA (
                  <a
                    href="https://itax.kra.go.ke"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-[#23201d]"
                  >
                    itax.kra.go.ke
                  </a>
                  ).
                </p>

                <p className="text-xs text-center text-[#736c63]">
                  New to Akubrecah?{" "}
                  <Link href="/sign-up" className="font-semibold text-[#c8431f] hover:underline ml-1">
                    Create account
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BELOW THE FOLD: 'TRUSTED BY' LOGO MARQUEE STRIP */}
      <section className="border-y border-[#efe6d8] bg-white/60 py-8 overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 mb-4 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#736c63]">
            Built around trusted East African standards &amp; payment infrastructure
          </span>
        </div>
        <div className="relative flex overflow-x-hidden">
          <div className="flex animate-auth-marquee whitespace-nowrap gap-10 py-1">
            {[...marqueeItems, ...marqueeItems].map((item, idx) => (
              <div
                key={`${item}-${idx}`}
                className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white border border-[#efe6d8] text-xs font-semibold text-[#736c63] shadow-2xs"
              >
                <span className="w-2 h-2 rounded-full bg-[#2bb6a3]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. THREE-STEP 'HOW IT WORKS' SECTION */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-16 lg:py-20 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2.5">
          <span className="font-cursive text-3xl text-[#736c63] block">unhurried &amp; transparent</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#23201d]">
            How your workspace flows
          </h2>
          <p className="text-sm sm:text-base text-[#736c63]">
            Whether you are retrieving a KRA PIN certificate or managing a monthly Cyber Cafe subscription, everything happens in three quiet steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              icon: ShieldCheck,
              accent: "bg-[#ff7a59]/15 text-[#c8431f]",
              title: "Sign in or verify ID",
              desc: "Use one-click Google login or your email and password to unlock your personal compliance and engineering console.",
            },
            {
              step: "02",
              icon: Smartphone,
              accent: "bg-[#2bb6a3]/15 text-[#16776a]",
              title: "Confirm on M-Pesa Express",
              desc: "Settle single KES 20 lookups or activate a KES 500 monthly Cyber Cafe pass directly on the same page with zero redirects.",
            },
            {
              step: "03",
              icon: FileCheck2,
              accent: "bg-[#FFB7B2]/30 text-[#23201d]",
              title: "Stream PDF from volatile RAM",
              desc: "Your official certificate compiles in memory and downloads immediately to your device with zero disk retention.",
            },
          ].map((card) => (
            <div
              key={card.step}
              className="bg-white rounded-[2rem] border border-[#efe6d8] p-7 shadow-[0_1px_2px_rgba(35,32,29,0.04),0_12px_30px_-12px_rgba(35,32,29,0.16)] space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className={`w-11 h-11 rounded-2xl ${card.accent} flex items-center justify-center`}>
                  <card.icon className="w-5 h-5" />
                </span>
                <span className="text-xs font-mono font-bold text-[#736c63]">Step {card.step}</span>
              </div>
              <h3 className="text-lg font-bold text-[#23201d] tracking-tight">{card.title}</h3>
              <p className="text-xs sm:text-sm text-[#736c63] leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. DARK GRADIENT CTA BAND */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#23201d] via-[#292524] to-[#171514] text-white p-8 sm:p-12 lg:p-14 shadow-[0_12px_40px_-12px_rgba(35,32,29,0.35)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-16 w-72 h-72 rounded-full bg-[#ff7a59]/25 blur-3xl animate-float-blob"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-16 w-72 h-72 rounded-full bg-[#2bb6a3]/20 blur-3xl animate-float-blob [animation-delay:3s]"
          />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="space-y-2.5 max-w-xl">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#FFB7B2]">
                Ready when you are
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
                Need an instant KRA PIN certificate without logging in first?
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                You can launch a direct National ID or KRA PIN lookup right away in our public retrieval portal or scope your next software project.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto shrink-0">
              <Link
                href="/retrieval-portal"
                className="h-12 px-6 rounded-2xl bg-[#ff7a59] hover:bg-[#c8431f] text-white text-sm font-semibold shadow-[0_8px_20px_-8px_rgba(255,122,89,0.55)] flex items-center justify-center gap-2 transition-all"
              >
                <span>Open retrieval portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/sign-up"
                className="h-12 px-6 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm font-semibold flex items-center justify-center transition-all"
              >
                Create free account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. LIGHT SOCIAL FOOTER */}
      <footer className="border-t border-[#efe6d8] bg-[#fdf9f3]">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#736c63]">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-[#ff7a59] flex items-center justify-center text-white font-bold text-[11px]">
              A
            </span>
            <span className="font-semibold text-[#23201d]">Akubrecah Entertainment</span>
            <span>·</span>
            <span>Nairobi, Kenya</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link href="/legal/privacy" className="hover:text-[#23201d] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/legal/terms" className="hover:text-[#23201d] transition-colors">
              Terms of Service
            </Link>
            <Link href="/legal/disclaimer" className="hover:text-[#23201d] transition-colors">
              Statutory Disclaimer
            </Link>
            <Link href="/contact" className="hover:text-[#23201d] transition-colors">
              Support Desk
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
