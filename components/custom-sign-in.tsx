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
import { Logo } from "@/components/logo"

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
    { text: "Safaricom Daraja M-Pesa Express", dot: "bg-[#FFB7B2]" },
    { text: "KDPA 2019 Zero-Storage Privacy", dot: "bg-[#E8EFE8]" },
    { text: "Nairobi Cyber Cafe Network", dot: "bg-[#EFEDF4]" },
    { text: "Volatile RAM PDF Streaming", dot: "bg-[#FFB7B2]" },
    { text: "Next.js Enterprise Cloud", dot: "bg-[#E8EFE8]" },
    { text: "256-Bit TLS Encrypted Sessions", dot: "bg-[#EFEDF4]" },
  ]

  return (
    <div className="min-h-screen w-full bg-[#FDFCF8] text-[#292524] font-sans antialiased overflow-x-hidden">
      {/* 1. FLOATING PILL-SHAPED NAV BAR (Matching 'Softly' Website Aesthetic) */}
      <header className="sticky top-3 sm:top-4 z-50 w-full flex justify-center px-4">
        <div className="w-full max-w-6xl h-14 sm:h-16 rounded-full bg-white/70 backdrop-blur-[20px] border border-stone-200/70 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] px-4 sm:px-6 flex items-center justify-between gap-3">
          {/* LEFT: Akubrecah Brand Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group hover:opacity-90 transition-opacity" aria-label="Akubrecah Entertainment">
            <Logo width={132} height={38} className="h-8 sm:h-9 w-auto" />
            {isKraPortal && (
              <span className="hidden sm:inline text-xs text-[#78716C] font-normal">
                · Cyber portal
              </span>
            )}
          </Link>

          {/* CENTER: Nav links in 14px Outfit Medium (hidden below md) */}
          <nav className="hidden md:flex items-center gap-6 text-[14px] font-medium text-[#78716C]">
            <a href="#how-it-works" className="hover:text-[#292524] transition-colors">
              How it works
            </a>
            <Link href="/retrieval-portal" className="hover:text-[#292524] transition-colors">
              Retrieval portal
            </Link>
            <Link href="/estimator" className="hover:text-[#292524] transition-colors">
              Scope estimator
            </Link>
            <Link href="/services" className="hover:text-[#292524] transition-colors">
              Services
            </Link>
          </nav>

          {/* RIGHT: Auth switch + dark stone (#292524) pill CTA button */}
          <div className="flex items-center gap-3">
            <Link
              href="/sign-up"
              className="hidden sm:inline-block px-3 py-1.5 text-[14px] font-medium text-[#292524] hover:text-[#78716C] transition-colors"
            >
              Create account
            </Link>
            <Link
              href="/retrieval-portal"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#292524] px-5 h-10 text-[14px] font-medium text-[#FDFCF8] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.08)] hover:scale-[1.02] transition-all"
            >
              <span>Get started</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFB7B2]" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. TWO-COLUMN HERO + LOGIN SECTION */}
      <section id="signin" className="relative overflow-hidden">
        {/* Two large blurred background blobs (#FFE4E1 and #E6E6FA) at 60% opacity matching the homepage */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -left-20 w-[380px] sm:w-[460px] h-[380px] sm:h-[460px] rounded-full bg-[#FFE4E1] opacity-60 blur-[95px] animate-float-blob"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-24 -right-20 w-[380px] sm:w-[480px] h-[380px] sm:h-[480px] rounded-full bg-[#E6E6FA] opacity-60 blur-[100px] animate-float-blob [animation-delay:3s]"
        />

        <div className="relative z-10 mx-auto max-w-6xl px-6 py-12 sm:py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* LEFT COLUMN: Friendly Product Pitch */}
          <div className="space-y-7 reveal-on-scroll">
            {/* Eyebrow pill */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/80 border border-stone-200/80 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] text-xs font-medium text-[#78716C]">
              <span className="w-2 h-2 rounded-full bg-[#FFB7B2]" />
              <span>
                {isKraPortal
                  ? "Independent KRA compliance workspace"
                  : "Nairobi digital living room · Software & statutory clarity"}
              </span>
            </div>

            {/* Big tracking-tight Outfit headline with Reenie Beanie cursive accent & hand-drawn underline */}
            <h1 className="text-[44px] sm:text-[56px] lg:text-[64px] font-medium tracking-[-0.025em] text-[#292524] leading-[1.06]">
              From ID lookup to certificate in one{" "}
              <span className="relative inline-block font-cursive text-[58px] sm:text-[72px] lg:text-[82px] font-normal text-[#292524] px-1 -rotate-2">
                breath
                <svg
                  className="absolute -bottom-1 left-0 w-full h-3 text-[#FFB7B2]"
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

            {/* Value paragraph */}
            <p className="text-base sm:text-lg text-[#78716C] leading-relaxed max-w-xl font-normal">
              Sign in to your Akubrecah workspace to manage KRA PIN certificate retrievals, Cyber Cafe monthly passes, Safaricom Daraja M-Pesa receipts, and custom software projects in one calm place.
            </p>

            {/* Three-item Softly Sage check benefit list */}
            <ul className="space-y-3.5 pt-1">
              {[
                "Instant KRA PIN retrieval with zero server PDF storage",
                "Same-page Safaricom Daraja M-Pesa Express verification",
                "Free to start, no card needed, KDPA 2019 privacy aligned",
              ].map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 text-sm sm:text-base font-normal text-[#292524]">
                  <span className="w-6 h-6 rounded-full bg-[#E8EFE8] text-[#292524] flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3.5 h-3.5 stroke-[2.2]" />
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            {/* Stacked-avatar social-proof cluster with 5-star rating & Reenie Beanie note */}
            <div className="pt-3 flex flex-wrap items-center gap-4">
              <div className="flex -space-x-2.5">
                {[
                  { initials: "WM", bg: "bg-[#FFB7B2] text-[#292524]" },
                  { initials: "BO", bg: "bg-[#E8EFE8] text-[#292524]" },
                  { initials: "AK", bg: "bg-[#EFEDF4] text-[#292524]" },
                  { initials: "DN", bg: "bg-[#292524] text-[#FDFCF8]" },
                ].map((av) => (
                  <div
                    key={av.initials}
                    className={`w-10 h-10 rounded-full border-2 border-[#FDFCF8] ${av.bg} text-xs font-medium flex items-center justify-center shadow-2xs`}
                  >
                    {av.initials}
                  </div>
                ))}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-[#FFB7B2]">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-[#FFB7B2] text-[#FFB7B2]" />
                  ))}
                  <span className="text-xs font-medium text-[#292524] ml-1">5.0</span>
                </div>
                <p className="text-xs text-[#78716C]">
                  Loved by taxpayers, cyber cafes &amp; engineering teams across Kenya
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: White rounded-[2.5rem] Login Card */}
          <div className="w-full max-w-md mx-auto reveal-on-scroll">
            <div className="bg-white rounded-[2.5rem] border border-stone-100 p-7 sm:p-9 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_24px_60px_-22px_rgba(255,183,178,0.32)] space-y-6">
              {/* Card Header */}
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-between">
                  <span className="font-cursive text-2xl sm:text-3xl text-[#78716C]">welcome back</span>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8EFE8] text-[#292524] text-[11px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#292524]" />
                    256-bit TLS
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-medium tracking-[-0.025em] text-[#292524]">
                  {requiresVerification ? "Verify your security code" : "Log in to your workspace"}
                </h2>
                <p className="text-xs sm:text-sm text-[#78716C]">
                  {requiresVerification
                    ? "Enter the 6-digit verification code sent to your device"
                    : "Continue with Google or sign in with your email and password"}
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div
                  role="alert"
                  className="p-4 rounded-2xl bg-[#FFE4E1]/70 border border-[#FFB7B2] text-[#292524] text-xs font-medium flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#292524]" />
                  <span>{error}</span>
                </div>
              )}

              {!requiresVerification ? (
                <div className="space-y-5">
                  {/* Social Auth Button: Continue with Google */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading || loading}
                    className="w-full h-12 px-5 rounded-full bg-white hover:bg-stone-50 border border-stone-200 flex items-center justify-center gap-3 text-sm font-medium text-[#292524] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {googleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#292524]" />
                    ) : (
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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

                  {/* Divider */}
                  <div className="relative flex items-center justify-center">
                    <div className="w-full border-t border-stone-200/80" />
                    <span className="bg-white px-3 text-xs font-normal text-[#78716C] whitespace-nowrap">
                      or sign in with email
                    </span>
                    <div className="w-full border-t border-stone-200/80" />
                  </div>

                  {/* Email & Password Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="signin-email" className="block text-xs font-medium text-[#292524] pl-1">
                        Email address
                      </label>
                      <div className="relative flex items-center rounded-full border border-stone-200 bg-stone-50 auth-input-focus transition-all">
                        <Mail className="w-4 h-4 text-[#78716C] ml-4 shrink-0" />
                        <input
                          id="signin-email"
                          type="text"
                          required
                          autoComplete="username"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="you@company.com"
                          className="w-full h-12 px-3 bg-transparent border-0 rounded-full text-sm text-[#292524] placeholder:text-[#78716C]/70 focus:outline-none focus:ring-0"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <label htmlFor="signin-password" className="block text-xs font-medium text-[#292524]">
                          Password
                        </label>
                        <Link
                          href="/forgot-password"
                          className="text-xs font-medium text-[#78716C] hover:text-[#292524] underline underline-offset-4 transition-colors"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative flex items-center rounded-full border border-stone-200 bg-stone-50 auth-input-focus transition-all">
                        <Lock className="w-4 h-4 text-[#78716C] ml-4 shrink-0" />
                        <input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full h-12 px-3 bg-transparent border-0 rounded-full text-sm text-[#292524] placeholder:text-[#78716C]/70 focus:outline-none focus:ring-0"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="pr-4 pl-2 text-[#78716C] hover:text-[#292524] transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !identifier || !password}
                      className="w-full h-12 rounded-full bg-[#FFB7B2] hover:brightness-95 text-[#292524] font-medium text-sm shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
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
                  <div className="p-4 rounded-2xl bg-[#E8EFE8] border border-stone-200/60 text-xs text-[#292524] font-normal flex items-start gap-2.5">
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
                    <label htmlFor="signin-otp" className="block text-xs font-medium text-[#292524] pl-1">
                      6-digit verification code
                    </label>
                    <div className="relative flex items-center rounded-full border border-stone-200 bg-stone-50 auth-input-focus transition-all">
                      <input
                        id="signin-otp"
                        type="text"
                        required
                        maxLength={6}
                        autoFocus
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="123456"
                        className="w-full h-12 px-4 bg-transparent border-0 rounded-full text-center font-mono tracking-widest text-lg text-[#292524] focus:outline-none focus:ring-0"
                      />
                    </div>
                  </div>

                  {resendStatus && (
                    <p className="text-xs text-[#292524] font-medium text-center">{resendStatus}</p>
                  )}

                  <button
                    type="submit"
                    disabled={verificationLoading || verificationCode.length < 6}
                    className="w-full h-12 rounded-full bg-[#FFB7B2] hover:brightness-95 text-[#292524] font-medium text-sm shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {verificationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & continue"}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-2">
                    {verificationStrategy !== "totp" && (
                      <button
                        type="button"
                        onClick={handleResendCode}
                        className="text-[#292524] underline underline-offset-4 font-medium cursor-pointer"
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
                      className="text-[#78716C] hover:text-[#292524] ml-auto cursor-pointer"
                    >
                      Back to login
                    </button>
                  </div>
                </form>
              )}

              {/* Legal Footnote & Independent KRA Notice */}
              <div className="space-y-3 pt-3 border-t border-stone-100">
                <p className="text-[11px] text-[#78716C] leading-relaxed text-center">
                  By continuing, you agree to our{" "}
                  <Link href="/legal/terms" className="text-[#292524] font-medium underline underline-offset-2">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/legal/privacy" className="text-[#292524] font-medium underline underline-offset-2">
                    Privacy Policy
                  </Link>
                  . Independent service, not affiliated with KRA (
                  <a
                    href="https://itax.kra.go.ke"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-[#292524]"
                  >
                    itax.kra.go.ke
                  </a>
                  ).
                </p>

                <p className="text-xs text-center text-[#78716C]">
                  New to Akubrecah?{" "}
                  <Link href="/sign-up" className="font-medium text-[#292524] underline underline-offset-4 hover:text-[#78716C] ml-1">
                    Create account
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BELOW THE FOLD: 'TRUSTED BY' MARQUEE STRIP */}
      <section className="border-y border-stone-200/60 bg-white/50 py-8 overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 mb-4 text-center">
          <span className="font-cursive text-2xl text-[#78716C]">
            built around trusted East African standards &amp; payment infrastructure
          </span>
        </div>
        <div className="relative flex overflow-x-hidden">
          <div className="flex animate-auth-marquee whitespace-nowrap gap-6 py-1">
            {[...marqueeItems, ...marqueeItems].map((item, idx) => (
              <div
                key={`${item.text}-${idx}`}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white border border-stone-100 text-xs font-medium text-[#78716C] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${item.dot}`} />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. THREE-STEP 'HOW IT WORKS' SECTION */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-16 lg:py-24 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="font-cursive text-3xl text-[#78716C] block">unhurried &amp; transparent</span>
          <h2 className="text-3xl sm:text-5xl font-medium tracking-[-0.025em] text-[#292524]">
            How your workspace flows
          </h2>
          <p className="text-sm sm:text-base text-[#78716C]">
            Whether you are retrieving a KRA PIN certificate or managing a monthly Cyber Cafe subscription, everything happens in three quiet steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              note: "step one",
              icon: ShieldCheck,
              tone: "bg-white",
              badge: "bg-[#FFB7B2]/40 text-[#292524]",
              title: "Sign in or verify ID",
              desc: "Use one-click Google login or your email and password to unlock your personal compliance and engineering console.",
            },
            {
              step: "02",
              note: "step two",
              icon: Smartphone,
              tone: "bg-[#E8EFE8]/75",
              badge: "bg-white text-[#292524]",
              title: "Confirm on M-Pesa Express",
              desc: "Settle single KES 20 lookups or activate a KES 500 monthly Cyber Cafe pass directly on the same page with zero redirects.",
            },
            {
              step: "03",
              note: "step three",
              icon: FileCheck2,
              tone: "bg-[#EFEDF4]/75",
              badge: "bg-white text-[#292524]",
              title: "Stream PDF from volatile RAM",
              desc: "Your official certificate compiles in memory and downloads immediately to your device with zero disk retention.",
            },
          ].map((card) => (
            <div
              key={card.step}
              className={`${card.tone} rounded-[2.25rem] border border-stone-100 p-8 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] space-y-4 transition-transform duration-500 hover:-translate-y-1`}
            >
              <div className="flex items-center justify-between">
                <span className={`w-11 h-11 rounded-2xl ${card.badge} flex items-center justify-center shadow-2xs`}>
                  <card.icon className="w-5 h-5" />
                </span>
                <span className="font-cursive text-2xl text-[#78716C]">{card.note}</span>
              </div>
              <h3 className="text-xl font-medium text-[#292524] tracking-[-0.02em]">{card.title}</h3>
              <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CONVERSION BAND (Matching Softly Waitlist Conversion Aesthetic) */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-[3rem] bg-white/80 border border-stone-200/70 p-8 sm:p-14 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#FFE4E1] opacity-60 blur-[80px] animate-float-blob"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -right-20 w-96 h-96 rounded-full bg-[#E6E6FA] opacity-60 blur-[90px] animate-float-blob [animation-delay:2s]"
          />

          <div className="relative z-10 max-w-xl mx-auto space-y-6">
            {/* Dark stone #292524 rounded-square icon at the top with a coral dot */}
            <div className="w-14 h-14 rounded-2xl bg-[#292524] flex items-center justify-center mx-auto shadow-[0_4px_20px_-2px_rgba(0,0,0,0.12)]">
              <span className="w-3.5 h-3.5 rounded-full bg-[#FFB7B2]" />
            </div>

            <div className="space-y-2.5">
              <p className="font-cursive text-2xl sm:text-3xl text-[#78716C]">
                ready when you are
              </p>
              <h2 className="text-2xl sm:text-4xl font-medium text-[#292524] tracking-[-0.025em]">
                Need an instant KRA PIN certificate without logging in first?
              </h2>
              <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed">
                You can launch a direct National ID or KRA PIN lookup right away in our public retrieval workspace or create a free account.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <Link
                href="/retrieval-portal"
                className="w-full sm:w-auto h-13 px-8 rounded-full bg-[#FFB7B2] text-[#292524] text-sm font-medium shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:brightness-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Open KRA retrieval space</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/sign-up"
                className="w-full sm:w-auto h-13 px-8 rounded-full bg-[#292524] text-[#FDFCF8] text-sm font-medium shadow-[0_4px_20px_-2px_rgba(0,0,0,0.08)] hover:scale-105 transition-transform flex items-center justify-center gap-2"
              >
                <span>Create free account</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFB7B2]" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. LIGHT SOFTLY FOOTER */}
      <footer className="border-t border-stone-200/60 bg-[#FDFCF8]">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#78716C]">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="inline-flex items-center hover:opacity-90 transition-opacity" aria-label="Akubrecah Entertainment">
              <Logo width={118} height={34} className="h-7 w-auto" />
            </Link>
            <span className="font-cursive text-xl text-[#78716C] hidden sm:inline">digital living room</span>
            <span>·</span>
            <span>Nairobi, Kenya</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link href="/legal/privacy" className="hover:text-[#292524] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/legal/terms" className="hover:text-[#292524] transition-colors">
              Terms of Service
            </Link>
            <Link href="/legal/disclaimer" className="hover:text-[#292524] transition-colors">
              Statutory Disclaimer
            </Link>
            <Link href="/contact" className="hover:text-[#292524] transition-colors">
              Support Desk
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
