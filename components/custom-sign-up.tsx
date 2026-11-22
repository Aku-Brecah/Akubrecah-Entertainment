"use client"

import React, { useState } from "react"
import { useSignUp, useSignIn } from "@clerk/nextjs/legacy"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Mail,
  Lock,
  User,
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

export function CustomSignUp({ isKraPortal = false }: { isKraPortal?: boolean }) {
  const { isLoaded, signUp, setActive } = useSignUp()
  const { isLoaded: isSignInLoaded, signIn } = useSignIn()
  const searchParams = useSearchParams()
  const [isKra, setIsKra] = useState(isKraPortal)

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname.toLowerCase()
      setIsKra(
        isKraPortal ||
          host.startsWith("kra.") ||
          host.includes("kra.akubrecah.com") ||
          searchParams.get("portal") === "kra"
      )
    }
  }, [searchParams, isKraPortal])

  const rawRedirect = searchParams.get("redirect_url")
  const redirectUrl = rawRedirect && isSafeRedirectPath(rawRedirect) ? rawRedirect : isKra ? "/" : "/dashboard"

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [emailAddress, setEmailAddress] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verification step state
  const [verifying, setVerifying] = useState(false)
  const [code, setCode] = useState("")
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [resendStatus, setResendStatus] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || !signUp) return

    setLoading(true)
    setError(null)
    setResendStatus(null)

    try {
      await signUp.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: emailAddress.trim(),
        password: password,
      })

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
      setVerifying(true)
    } catch (err: any) {
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Sign up failed. Please check your details."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || !signUp) return

    setVerifyLoading(true)
    setError(null)
    setResendStatus(null)

    try {
      let currentSignUp = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      })

      if (currentSignUp.status === "complete" && currentSignUp.createdSessionId) {
        await setActive({ session: currentSignUp.createdSessionId })
        window.location.href = redirectUrl || "/onboarding"
        return
      }

      if (currentSignUp.status === "missing_requirements") {
        if (currentSignUp.missingFields?.includes("username" as any)) {
          const autoUsername = (
            emailAddress.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") +
            "_" +
            Math.floor(1000 + Math.random() * 9000)
          ).toLowerCase()
          try {
            currentSignUp = await signUp.update({ username: autoUsername })
          } catch (uErr) {
            console.warn("[CustomSignUp] Auto-username update attempt:", uErr)
          }
        }

        if (currentSignUp.missingFields?.includes("legal_accepted" as any)) {
          try {
            currentSignUp = await signUp.update({ legalAccepted: true } as any)
          } catch (lErr) {
            console.warn("[CustomSignUp] Auto-legalAccepted update attempt:", lErr)
          }
        }

        if (currentSignUp.missingFields?.includes("first_name" as any) && firstName) {
          try {
            currentSignUp = await signUp.update({ firstName: firstName.trim() })
          } catch (nErr) {
            console.warn("[CustomSignUp] Name update attempt:", nErr)
          }
        }
        if (currentSignUp.missingFields?.includes("last_name" as any) && lastName) {
          try {
            currentSignUp = await signUp.update({ lastName: lastName.trim() })
          } catch (nErr) {
            console.warn("[CustomSignUp] Name update attempt:", nErr)
          }
        }

        if (currentSignUp.status === "complete" && currentSignUp.createdSessionId) {
          await setActive({ session: currentSignUp.createdSessionId })
          window.location.href = redirectUrl || "/onboarding"
          return
        }
      }

      if (currentSignUp.createdSessionId) {
        await setActive({ session: currentSignUp.createdSessionId })
        window.location.href = redirectUrl || "/onboarding"
        return
      }

      if (isSignInLoaded && signIn) {
        try {
          const signInAttempt = await signIn.create({
            identifier: emailAddress.trim(),
            password: password,
          })
          if (signInAttempt.status === "complete" && signInAttempt.createdSessionId) {
            await setActive({ session: signInAttempt.createdSessionId })
            window.location.href = redirectUrl || "/onboarding"
            return
          }
        } catch (signInErr) {
          console.warn("[CustomSignUp] Fallback sign-in attempt:", signInErr)
        }
      }

      const missing = currentSignUp.missingFields?.length ? currentSignUp.missingFields.join(", ") : null
      const unverified = currentSignUp.unverifiedFields?.length ? currentSignUp.unverifiedFields.join(", ") : null
      const details = [missing ? `Missing fields: ${missing}` : null, unverified ? `Unverified: ${unverified}` : null]
        .filter(Boolean)
        .join(". ")
      setError(
        details
          ? `Account created but additional details are required: ${details}`
          : "Verification was not completed. Please try signing in."
      )
    } catch (err: any) {
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || "Invalid verification code."
      setError(msg)
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!isLoaded || !signUp) return
    setError(null)
    setResendStatus(null)

    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
      setResendStatus("A new verification code was sent to your email.")
    } catch (err: any) {
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Could not resend code. Please wait a moment."
      setError(msg)
    }
  }

  const handleGoogleSignUp = async () => {
    if (!isLoaded || !signUp) return
    setGoogleLoading(true)
    setError(null)

    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: redirectUrl,
      })
    } catch (err: any) {
      setGoogleLoading(false)
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Google sign up failed. Please try again."
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
          {/* LEFT: Circular Coral #FFB7B2 logo with white dot + Outfit Medium brand name */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <span className="w-8 h-8 rounded-full bg-[#FFB7B2] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(255,183,178,0.6)] transition-transform duration-300 group-hover:scale-105">
              <span className="w-2.5 h-2.5 rounded-full bg-white" />
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-medium text-[#292524] tracking-tight">
                Akubrecah
              </span>
              {isKra && (
                <span className="text-xs text-[#78716C] font-normal">
                  · Cyber portal
                </span>
              )}
            </div>
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

          {/* RIGHT: Log in link + dark stone (#292524) pill CTA button */}
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="hidden sm:inline-block px-3 py-1.5 text-[14px] font-medium text-[#292524] hover:text-[#78716C] transition-colors"
            >
              Log in
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

      {/* 2. TWO-COLUMN HERO + SIGNUP SECTION */}
      <section id="signup" className="relative overflow-hidden">
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
              <span>Free to start, no card needed</span>
            </div>

            {/* Big tracking-tight Outfit headline with Reenie Beanie cursive accent & hand-drawn underline */}
            <h1 className="text-[44px] sm:text-[56px] lg:text-[64px] font-medium tracking-[-0.025em] text-[#292524] leading-[1.06]">
              Create your calm digital workspace in one{" "}
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
              Join individuals, cyber cafe operators, and businesses across Kenya using Akubrecah for instant KRA PIN certificate retrieval, M-Pesa Express automation, and custom software engineering.
            </p>

            {/* Three-item Softly Sage check benefit list */}
            <ul className="space-y-3.5 pt-1">
              {[
                "Instant KRA PIN retrieval with zero server PDF storage",
                "Cyber Cafe monthly pass for up to 50 daily lookups",
                "Compliant with the Kenya Data Protection Act 2019",
              ].map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 text-sm sm:text-base font-normal text-[#292524]">
                  <span className="w-6 h-6 rounded-full bg-[#E8EFE8] text-[#292524] flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3.5 h-3.5 stroke-[2.2]" />
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            {/* Stacked-avatar social-proof cluster with 5-star rating */}
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
                  Trusted by taxpayers, cyber cafes &amp; engineering teams across Kenya
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: White rounded-[2.5rem] Account-Creation Card */}
          <div className="w-full max-w-md mx-auto reveal-on-scroll">
            <div className="bg-white rounded-[2.5rem] border border-stone-100 p-7 sm:p-9 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_24px_60px_-22px_rgba(255,183,178,0.32)] space-y-6">
              {/* Card Header */}
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-between">
                  <span className="font-cursive text-2xl sm:text-3xl text-[#78716C]">start softly</span>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8EFE8] text-[#292524] text-[11px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#292524]" />
                    KDPA Aligned
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-medium tracking-[-0.025em] text-[#292524]">
                  {verifying ? "Verify your email" : "Create your account"}
                </h2>
                <p className="text-xs sm:text-sm text-[#78716C]">
                  {verifying
                    ? `We sent a 6-digit confirmation code to ${emailAddress}`
                    : "Continue with Google or sign up with your email and password"}
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

              {!verifying ? (
                <div className="space-y-5">
                  {/* Social Auth Button: Continue with Google */}
                  <button
                    type="button"
                    onClick={handleGoogleSignUp}
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
                      or sign up with email
                    </span>
                    <div className="w-full border-t border-stone-200/80" />
                  </div>

                  {/* Email & Password Registration Form */}
                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label htmlFor="signup-first" className="block text-xs font-medium text-[#292524] pl-1">
                          First name
                        </label>
                        <div className="relative flex items-center rounded-full border border-stone-200 bg-stone-50 auth-input-focus transition-all">
                          <User className="w-4 h-4 text-[#78716C] ml-3.5 shrink-0" />
                          <input
                            id="signup-first"
                            type="text"
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Wanjiku"
                            className="w-full h-11 px-2.5 bg-transparent border-0 rounded-full text-sm text-[#292524] placeholder:text-[#78716C]/70 focus:outline-none focus:ring-0"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="signup-last" className="block text-xs font-medium text-[#292524] pl-1">
                          Last name
                        </label>
                        <div className="relative flex items-center rounded-full border border-stone-200 bg-stone-50 auth-input-focus transition-all">
                          <input
                            id="signup-last"
                            type="text"
                            required
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Mwangi"
                            className="w-full h-11 px-4 bg-transparent border-0 rounded-full text-sm text-[#292524] placeholder:text-[#78716C]/70 focus:outline-none focus:ring-0"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="signup-email" className="block text-xs font-medium text-[#292524] pl-1">
                        Email address
                      </label>
                      <div className="relative flex items-center rounded-full border border-stone-200 bg-stone-50 auth-input-focus transition-all">
                        <Mail className="w-4 h-4 text-[#78716C] ml-4 shrink-0" />
                        <input
                          id="signup-email"
                          type="email"
                          required
                          autoComplete="email"
                          value={emailAddress}
                          onChange={(e) => setEmailAddress(e.target.value)}
                          placeholder="you@company.com"
                          className="w-full h-12 px-3 bg-transparent border-0 rounded-full text-sm text-[#292524] placeholder:text-[#78716C]/70 focus:outline-none focus:ring-0"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="signup-password" className="block text-xs font-medium text-[#292524] pl-1">
                        Password
                      </label>
                      <div className="relative flex items-center rounded-full border border-stone-200 bg-stone-50 auth-input-focus transition-all">
                        <Lock className="w-4 h-4 text-[#78716C] ml-4 shrink-0" />
                        <input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={8}
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create password (8+ characters)"
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
                      disabled={loading || !emailAddress || !password || !firstName || !lastName}
                      className="w-full h-12 rounded-full bg-[#FFB7B2] hover:brightness-95 text-[#292524] font-medium text-sm shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating account...</span>
                        </>
                      ) : (
                        <>
                          <span>Create account</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                /* Email OTP Verification Step */
                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#E8EFE8] border border-stone-200/60 text-xs text-[#292524] font-normal flex items-start gap-2.5">
                    <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Check your email inbox for your 6-digit verification code.</span>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="signup-otp" className="block text-xs font-medium text-[#292524] pl-1">
                      6-digit verification code
                    </label>
                    <div className="relative flex items-center rounded-full border border-stone-200 bg-stone-50 auth-input-focus transition-all">
                      <input
                        id="signup-otp"
                        type="text"
                        required
                        maxLength={6}
                        autoFocus
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
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
                    disabled={verifyLoading || code.length < 6}
                    className="w-full h-12 rounded-full bg-[#FFB7B2] hover:brightness-95 text-[#292524] font-medium text-sm shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {verifyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete registration"}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-2">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      className="text-[#292524] underline underline-offset-4 font-medium cursor-pointer"
                    >
                      Resend code
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerifying(false)}
                      className="text-[#78716C] hover:text-[#292524] ml-auto cursor-pointer"
                    >
                      Edit email address
                    </button>
                  </div>
                </form>
              )}

              {/* Legal Footnote & Log in Footer */}
              <div className="space-y-3 pt-3 border-t border-stone-100">
                <p className="text-[11px] text-[#78716C] leading-relaxed text-center">
                  By creating an account, you agree to our{" "}
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
                  Already have an account?{" "}
                  <Link href="/sign-in" className="font-medium text-[#292524] underline underline-offset-4 hover:text-[#78716C] ml-1">
                    Log in
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
            From creating your account to downloading an official KRA PIN certificate, every step is designed for clarity.
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
              title: "Create your account",
              desc: "Sign up in seconds with Google or your email and password to access your private workspace.",
            },
            {
              step: "02",
              note: "step two",
              icon: Smartphone,
              tone: "bg-[#E8EFE8]/75",
              badge: "bg-white text-[#292524]",
              title: "Verify & settle via M-Pesa",
              desc: "Run individual KES 20 lookups or activate a KES 500 monthly Cyber Cafe pass on the same screen.",
            },
            {
              step: "03",
              note: "step three",
              icon: FileCheck2,
              tone: "bg-[#EFEDF4]/75",
              badge: "bg-white text-[#292524]",
              title: "Download from volatile RAM",
              desc: "Your PDF certificate streams directly from memory to your browser with zero server file retention.",
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
                instant access available
              </p>
              <h2 className="text-2xl sm:text-4xl font-medium text-[#292524] tracking-[-0.025em]">
                Want to retrieve a KRA certificate right away?
              </h2>
              <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed">
                Launch our public retrieval workspace for immediate National ID or KRA PIN verification, or log in to an existing account.
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
                href="/sign-in"
                className="w-full sm:w-auto h-13 px-8 rounded-full bg-[#292524] text-[#FDFCF8] text-sm font-medium shadow-[0_4px_20px_-2px_rgba(0,0,0,0.08)] hover:scale-105 transition-transform flex items-center justify-center gap-2"
              >
                <span>Log in instead</span>
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
            <span className="w-6 h-6 rounded-full bg-[#FFB7B2] flex items-center justify-center shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-white" />
            </span>
            <span className="font-medium text-[#292524]">Akubrecah</span>
            <span className="font-cursive text-xl text-[#78716C]">digital living room</span>
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
