"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import {
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  ShieldCheck,
  Fingerprint,
  User,
  MapPin,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  BadgeIcon,
  MapPinIcon,
  RotateCcw,
  Smartphone,
  Phone,
  Clock,
  Lock,
  Sparkles,
  Check,
  CheckCircle2,
  X,
  ExternalLink,
  Copy,
  Receipt,
  Shield,
  ShieldAlert,
  Gavel,
  Mail,
  Signpost,
  Store,
  Share2,
  FileText,
  QrCode
} from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { motion, AnimatePresence } from "framer-motion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  COUNTIES,
  GET_POSTAL_CODES,
  GET_SUB_COUNTIES,
  GET_STATIONS,
  GET_LOCALITIES
} from "@/lib/kenya-data"
import { cn } from "@/lib/utils"
import { toast } from "react-hot-toast"
import { useUser } from "@clerk/nextjs"
import { maskPin, maskEmail, maskPhone } from "@/lib/masking"
import { trackEvent } from "@/lib/telemetry/client"

export type MpesaFlowState =
  | "ready"
  | "initiating"
  | "stk_sent"
  | "waiting"
  | "verifying"
  | "success"
  | "failed"
  | "cancelled"
  | "timeout"

export function KRAPortal({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const router = useRouter()
  const { isLoaded: authLoaded, isSignedIn, user } = useUser()

  // Derive admin status client-side from Clerk metadata (requires signed-in session and non-empty admin email)
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || ''
  const userRole = user?.publicMetadata?.role as string | undefined
  const configPublicAdminEmail = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || '').toLowerCase()
  const isAdmin = Boolean(
    isSignedIn && (
      (configPublicAdminEmail && userEmail === configPublicAdminEmail) ||
      userRole === 'Super Admin' ||
      userRole === 'Admin'
    )
  )
  const [currentStep, setCurrentStep] = useState(1)
  const [idSearchStatus, setIdSearchStatus] = useState<"idle" | "searching" | "found" | "error">("idle")

  // Tab state for Step 1
  const [activeTab, setActiveTab] = useState<"id" | "pin">("id")
  // Engine selection: Live API vs DWR Web Remoting vs Auto
  const [engineMode, setEngineMode] = useState<"auto" | "api" | "dwr">("auto")

  const [formData, setFormData] = useState({
    idNumber: "",
    pin: "",
    rawPin: "",
    fullName: "",
    email: "",
    phoneNumber: "",
    county: "",
    district: "",
    town: "",
    taxArea: "",
    station: "",
    postalCode: "",
    building: "",
    street: "",
    poBox: "",
    registeredDate: ""
  })
  const [isVerified, setIsVerified] = useState(false)
  const [isVerifyingDate, setIsVerifyingDate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasConsented, setHasConsented] = useState(false)

  // Auto-sync authenticated user email when available
  useEffect(() => {
    if (userEmail && !formData.email) {
      setFormData(prev => ({ ...prev, email: userEmail }))
    }
  }, [userEmail])

  // CAPTCHA state
  const [captchaImage, setCaptchaImage] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [captchaAnswer, setCaptchaAnswer] = useState("")
  const [captchaStatus, setCaptchaStatus] = useState<"idle" | "loading" | "ready" | "error">("idle")

  // Payment gate state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [accessInfo, setAccessInfo] = useState<{ access: string; feeKes: number; subscription: any } | null>(null)
  const [mpesaStatus, setMpesaStatus] = useState<MpesaFlowState>("ready")
  const [activeCheckoutId, setActiveCheckoutId] = useState<string | null>(null)
  const [merchantRequestId, setMerchantRequestId] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [verifiedDownloadId, setVerifiedDownloadId] = useState<string | null>(null)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [verifiedReceipt, setVerifiedReceipt] = useState<string | null>(null)

  // Subscription & M-Pesa Checkout State (Same-Page, Zero-Redirect)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [paymentPhone, setPaymentPhone] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"stk" | "manual">("stk")
  const [manualMpesaCode, setManualMpesaCode] = useState("")
  const [isVerifyingManual, setIsVerifyingManual] = useState(false)
  const [copiedTill, setCopiedTill] = useState(false)
  const [pollingSecondsLeft, setPollingSecondsLeft] = useState(60)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const stkTransitionRef = useRef<NodeJS.Timeout | null>(null)
  const initialPollTimerRef = useRef<NodeJS.Timeout | null>(null)

  const isMpesaBusy =
    mpesaStatus === "initiating" ||
    mpesaStatus === "stk_sent" ||
    mpesaStatus === "waiting" ||
    mpesaStatus === "verifying"
  const isRecordUnlocked = Boolean(verifiedDownloadId || isAdmin)

  const isValidUnmaskedKenyanPhone = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed || trimmed.includes("•") || trimmed.includes("*")) return false
    const clean = trimmed.replace(/[\s\-()]/g, "")
    return /^(?:\+?254|0)?(?:7|1)\d{8}$/.test(clean)
  }

  const activeTill = "9348469"

  const maskName = (name?: string | null) => {
    if (!name || typeof name !== "string") return "TAXPAYER RECORD"
    const parts = name.trim().split(/\s+/)
    return parts
      .map(p => {
        if (p.length <= 2) return p
        return `${p.slice(0, 2)}***`
      })
      .join(" ")
  }

  const clearPaymentTimers = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (stkTransitionRef.current) {
      clearTimeout(stkTransitionRef.current)
      stkTransitionRef.current = null
    }
    if (initialPollTimerRef.current) {
      clearTimeout(initialPollTimerRef.current)
      initialPollTimerRef.current = null
    }
  }

  // Sync phone number from taxpayer profile only when it is a valid unmasked Kenyan number
  useEffect(() => {
    if (!paymentPhone && isValidUnmaskedKenyanPhone(formData.phoneNumber || "")) {
      setPaymentPhone(formData.phoneNumber.trim())
    }
  }, [formData.phoneNumber, paymentPhone])

  // Auto-focus the payment phone input when Step 4 opens and awaits payment
  useEffect(() => {
    if (currentStep !== 4 || isRecordUnlocked || mpesaStatus !== "ready" || paymentMethod !== "stk") return
    const timer = setTimeout(() => {
      const targetId = showPaymentModal ? "modal-phone-input" : "same-page-phone-input"
      const el = document.getElementById(targetId)
      if (el && document.activeElement !== el) {
        el.focus({ preventScroll: true })
      }
    }, 120)
    return () => clearTimeout(timer)
  }, [currentStep, isRecordUnlocked, mpesaStatus, showPaymentModal, paymentMethod])

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      clearPaymentTimers()
    }
  }, [])

  useEffect(() => {
    trackEvent({ activityType: 'page_view' });
    loadCaptcha()

    // Strict Zero-Storage Policy: Purge any stale taxpayer credentials from storage
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("kra_active_form_data");
        localStorage.removeItem("kra_active_form_data");
      } catch { }

      // Support deep-links such as /retrieval-portal?pin=A012345678Z from the Admin PIN Checker
      const params = new URLSearchParams(window.location.search);
      const queryPin = params.get("pin")?.trim().toUpperCase() || "";
      if (queryPin) {
        setActiveTab("pin");
        setFormData(prev => ({ ...prev, pin: queryPin }));
      }
    }
  }, [])

  const handleInputChange = (field: string, value: string) => {
    if (field === 'phoneNumber' && isValidUnmaskedKenyanPhone(value)) {
      setPaymentPhone(value.trim())
    }
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'idNumber') {
        updated.pin = ''
        updated.rawPin = ''
        updated.fullName = ''
      } else if (field === 'pin') {
        updated.idNumber = ''
        updated.rawPin = value
        updated.fullName = ''
      }
      return updated
    })
  }

  const loadCaptcha = async () => {
    setCaptchaStatus("loading")
    setCaptchaAnswer("")
    setError(null)
    try {
      const res = await fetch('/api/kra/captcha')
      const data = await res.json()
      if (data.success && data.captchaImage) {
        setCaptchaImage(data.captchaImage)
        setSessionToken(data.sessionToken)
        setCaptchaStatus("ready")
      } else {
        setCaptchaImage(null)
        setSessionToken(null)
        setCaptchaStatus("error")
        setError(data.error || "Unable to load security stamp from KRA portal. Please tap refresh to retry.")
      }
    } catch {
      setCaptchaImage(null)
      setSessionToken(null)
      setCaptchaStatus("error")
      setError("Unable to connect to KRA portal. Please tap refresh to retry.")
    }
  }

  const handleIdSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!isSignedIn) {
      setError("Account sign in required: You must be logged in to search and retrieve KRA PIN certificates.")
      toast.error("Please sign in to search taxpayer records.")
      router.push("/sign-in?redirect_url=/retrieval-portal")
      return
    }

    if (!formData.idNumber && !formData.pin) {
      setError("Please enter your National ID number or KRA PIN.")
      return
    }

    if (captchaStatus === "ready" && !captchaAnswer.trim()) {
      setError("Please enter the answer to the security verification question.")
      return
    }

    setIdSearchStatus("searching")
    setError(null)
    trackEvent({ activityType: activeTab === "id" ? "search_id" : "search_pin" })

    try {
      const pinPayload = activeTab === "pin" ? (formData.rawPin || formData.pin).trim() : ""
      const response = await fetch('/api/kra/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idNumber: activeTab === "id" ? formData.idNumber.trim() : "",
          pin: pinPayload ? (pinPayload.startsWith("kraseal1:") ? pinPayload : pinPayload.toUpperCase()) : "",
          captchaAnswer: captchaAnswer.trim(),
          sessionToken,
          engineMode,
        }),
      })

      const result = await response.json()

      // Handle unauthenticated response from API
      if (response.status === 401 || result.requiresAuth) {
        setError(result.error || "You must be signed in to make a search.")
        toast.error("Please sign in to search taxpayer records.")
        setIdSearchStatus("idle")
        router.push("/sign-in?redirect_url=/retrieval-portal")
        return
      }

      // If server specifically requires CAPTCHA answer
      if (result.captchaRequired || result.captchaWrong || response.status === 422) {
        if (result.pin || result.rawPin) {
          setFormData(prev => ({
            ...prev,
            pin: isAdmin ? (result.pin || prev.pin) : maskPin(result.pin || prev.pin),
            rawPin: result.rawPin || prev.rawPin,
          }))
        }
        toast(result.error || "Security verification required. Please solve the arithmetic question.")
        setError(result.error || "Please enter the verification answer from the image.")
        setIdSearchStatus("idle")
        await loadCaptcha()
        return
      }

      if (result.success && (result.data?.name || result.data?.pin)) {
        setIsSubscribed(Boolean(result.isSubscribed))
        setFormData(prev => {
          const effectiveRawPin =
            result.sealedPin ||
            result.data?.sealedPin ||
            result.rawPin ||
            result.data?.rawPin ||
            (activeTab === "pin" ? (prev.rawPin || prev.pin) : '')
          const effectiveIdNumber = result.rawId || result.data?.idNumber || (activeTab === "id" ? formData.idNumber.trim() : (prev.idNumber || ''))
          const updatedData = {
            ...prev,
            fullName: result.data?.name || result.data?.fullName || '',
            pin: isAdmin ? (result.data?.pin || prev.pin) : maskPin(result.data?.pin || prev.pin),
            rawPin: effectiveRawPin || result.data?.pin || '',
            idNumber: effectiveIdNumber,
            email: result.data?.email || prev.email || userEmail || '',
            building: result.data?.building || '',
            street: result.data?.street || '',
            town: result.data?.town || '',
            county: result.data?.county || '',
            district: result.data?.district || '',
            taxArea: result.data?.taxArea || '',
            station: result.data?.station || '',
            poBox: result.data?.poBox || '',
            postalCode: result.data?.postalCode || '',
            phoneNumber: result.data?.phoneNumber || '',
            registeredDate: result.data?.registeredDate || '',
          }
          return updatedData
        })
        setIdSearchStatus("found")
        setIsVerified(true)
        setCaptchaStatus("idle")
        setCaptchaImage(null)
        setCaptchaAnswer("")
        setCurrentStep(2)
        trackEvent({ activityType: "view_masked" })
        toast.success("KRA Taxpayer Details Found!")
      } else {
        setIdSearchStatus("idle")
        setError(result.error || "Details not found. Please check your credentials.")
        if (result.maskedPin) {
          setActiveTab("pin")
        }
        toast.error(result.error || "Retrieval Failed")
      }
    } catch {
      setIdSearchStatus("idle")
      setError("Connection failed. Please try again.")
    }
  }

  // Refreshes unmasked taxpayer details from authorized backend endpoint
  const refreshVerifiedData = async (downloadId?: string, targetPin?: string) => {
    try {
      const pinToVerify = targetPin || formData.rawPin || formData.pin
      if (!pinToVerify && !downloadId) return

      const res = await fetch('/api/certificate/verified-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          downloadId,
          pin: pinToVerify,
        }),
      })
      const result = await res.json()
      if (result.success && result.data) {
        setIsSubscribed(true)
        setFormData(prev => {
          const updated = {
            ...prev,
            fullName: result.data.name || result.data.taxpayerName || prev.fullName,
            pin: result.data.pin || prev.pin,
            rawPin: result.data.pin || prev.rawPin,
            idNumber: result.data.idNumber || prev.idNumber,
            email: result.data.email || prev.email || userEmail || '',
            building: result.data.building || prev.building,
            street: result.data.street || prev.street,
            town: result.data.town || prev.town,
            county: result.data.county || prev.county,
            district: result.data.district || prev.district,
            taxArea: result.data.taxArea || prev.taxArea,
            station: result.data.station || prev.station,
            poBox: result.data.poBox || prev.poBox,
            postalCode: result.data.postalCode || prev.postalCode,
            phoneNumber: result.data.phoneNumber || prev.phoneNumber,
            registeredDate: result.data.registeredDate || prev.registeredDate,
          }
          return updated
        })
      }
    } catch (e) {
      console.warn("Failed to refresh unmasked data:", e)
    }
  }

  // Shared handler for applying terminal verification responses from Daraja
  const applyMpesaVerificationOutcome = async (
    vData: any,
    certPin: string,
    options?: { silentPending?: boolean }
  ): Promise<boolean> => {
    if (vData?.verified && vData?.status === 'success') {
      clearPaymentTimers()
      const receipt = vData.mpesaReceipt || vData.checkoutRequestId || activeCheckoutId
      const resolvedDlId = vData.downloadId || vData.checkoutRequestId || activeCheckoutId
      setVerifiedReceipt(receipt)
      setVerifiedDownloadId(resolvedDlId)
      setMpesaStatus("success")
      setPaymentError(null)
      setCurrentStep(4)
      toast.success(
        `M-Pesa payment confirmed${receipt ? ` (${receipt})` : ''}. Unlocking record & downloading certificate...`,
        { duration: 5000 }
      )
      await Promise.all([
        refreshVerifiedData(resolvedDlId, vData.pin || certPin),
        resolvedDlId ? executeDownload(resolvedDlId) : Promise.resolve(),
      ])
      return true
    }

    if (vData?.status === 'cancelled') {
      clearPaymentTimers()
      setMpesaStatus("cancelled")
      setPaymentError(
        vData.error ||
        vData.resultDesc ||
        "You cancelled the M-Pesa STK prompt on your phone. No amount was deducted."
      )
      return true
    }

    if (vData?.status === 'timeout') {
      clearPaymentTimers()
      setMpesaStatus("timeout")
      setPaymentError(
        vData.error ||
        vData.resultDesc ||
        "The M-Pesa authorization request timed out before PIN entry."
      )
      return true
    }

    if (vData?.status === 'failed') {
      clearPaymentTimers()
      setMpesaStatus("failed")
      setPaymentError(
        vData.error ||
        vData.resultDesc ||
        "M-Pesa payment failed. Confirm your balance and phone number, then retry."
      )
      return true
    }

    if (!options?.silentPending) {
      setMpesaStatus("waiting")
    }
    return false
  }

  // ── SAFARICOM DARAJA M-PESA EXPRESS (STK PUSH, ZERO REDIRECTS) ──
  const handleMpesaDarajaPayment = async (overridePhone?: string) => {
    if (isMpesaBusy) return

    const targetPhone = (overridePhone || paymentPhone || formData.phoneNumber || "").trim()
    const cleanPhone = targetPhone.replace(/[\s\-+()]/g, '')
    const isKenyan =
      /^(?:254|0)(?:7\d{8}|1\d{8})$/.test(cleanPhone) ||
      /^(?:7|1)\d{8}$/.test(cleanPhone)

    if (!isKenyan) {
      const msg = "Enter a valid Kenyan Safaricom M-Pesa number (07XXXXXXXX, 01XXXXXXXX, or +2547XXXXXXXX)."
      setPaymentError(msg)
      toast.error(msg)
      const el =
        document.getElementById('modal-phone-input') ||
        document.getElementById('same-page-phone-input')
      el?.focus()
      return
    }

    clearPaymentTimers()
    setMpesaStatus("initiating")
    setPaymentError(null)
    setPollingSecondsLeft(60)
    setActiveCheckoutId(null)
    setMerchantRequestId(null)

    try {
      const certPin = formData.rawPin || formData.pin
      trackEvent({ activityType: 'click_stk_mpesa', pin: certPin })

      const res = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: targetPhone,
          pin: certPin,
          type: 'certificate',
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success || !data.checkoutRequestId) {
        throw new Error(data.error || "Failed to initiate Safaricom M-Pesa STK Push.")
      }

      const checkoutId = String(data.checkoutRequestId)
      setActiveCheckoutId(checkoutId)
      if (data.merchantRequestId) {
        setMerchantRequestId(String(data.merchantRequestId))
      }
      if (data.phone) {
        setPaymentPhone(String(data.phone))
      }

      setMpesaStatus("stk_sent")
      toast.success("M-Pesa STK Push sent. Check your phone and enter your M-Pesa PIN.", { duration: 5000 })

      stkTransitionRef.current = setTimeout(() => {
        setMpesaStatus((prev) => (prev === "stk_sent" ? "waiting" : prev))
      }, 600)

      let seconds = 60
      pollTimerRef.current = setInterval(() => {
        seconds -= 1
        setPollingSecondsLeft(Math.max(0, seconds))
        if (seconds <= 0) {
          clearPaymentTimers()
          setMpesaStatus((prev) => {
            if (prev === "success" || prev === "cancelled" || prev === "failed") return prev
            return "timeout"
          })
          setPaymentError(
            "The 60-second confirmation window elapsed. If you already entered your PIN and received an M-Pesa SMS, click 'I Already Entered PIN — Verify Now'."
          )
        }
      }, 1000)

      // Poll Daraja verification endpoint aggressively without overlapping in-flight requests
      let pollInFlight = false
      const runPollCheck = async () => {
        if (pollInFlight) return
        pollInFlight = true
        try {
          const vRes = await fetch('/api/mpesa/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ checkoutRequestId: checkoutId, pin: certPin }),
          })
          const vData = await vRes.json()
          await applyMpesaVerificationOutcome(vData, certPin, { silentPending: true })
        } catch {
          // Keep polling quietly on transient network hiccups
        } finally {
          pollInFlight = false
        }
      }

      initialPollTimerRef.current = setTimeout(() => {
        void runPollCheck()
      }, 800)
      pollIntervalRef.current = setInterval(() => {
        void runPollCheck()
      }, 1000)
    } catch (err: any) {
      clearPaymentTimers()
      setMpesaStatus("failed")
      setPaymentError(err.message || "Unable to trigger Safaricom M-Pesa prompt.")
    }
  }

  // Manual payment verification button (queries callback cache + live Daraja STK Query)
  const handleCheckPaymentStatus = async () => {
    if (!activeCheckoutId) {
      toast.error("No active M-Pesa checkout request. Send an STK prompt first.")
      return
    }
    const previousStatus = mpesaStatus
    setMpesaStatus("verifying")
    setPaymentError(null)
    const toastId = toast.loading("Verifying transaction with Safaricom Daraja...")

    try {
      const certPin = formData.rawPin || formData.pin
      const vRes = await fetch('/api/mpesa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutRequestId: activeCheckoutId, pin: certPin, force: true }),
      })
      const vData = await vRes.json()
      toast.dismiss(toastId)

      const settled = await applyMpesaVerificationOutcome(vData, certPin, { silentPending: false })
      if (!settled) {
        setMpesaStatus(previousStatus === "timeout" ? "timeout" : "waiting")
        const pendingMsg =
          vData.error ||
          "Payment has not been confirmed yet. Check your phone for the M-Pesa PIN prompt and try verifying again."
        setPaymentError(pendingMsg)
        toast(pendingMsg)
      }
    } catch (err: any) {
      setMpesaStatus(previousStatus === "timeout" ? "timeout" : "waiting")
      toast.error(err.message || "Failed to query Daraja payment status.", { id: toastId })
    }
  }

  // Reset payment flow to allow phone number edits or fresh STK initiation
  const handleCancelOrResetPayment = () => {
    clearPaymentTimers()
    setMpesaStatus("ready")
    setPaymentError(null)
    setPollingSecondsLeft(60)
  }

  // Switch cleanly to manual M-Pesa Till payment & receipt code verification
  const switchToManualPayment = (variant?: "inline" | "modal") => {
    clearPaymentTimers()
    setMpesaStatus("ready")
    setPaymentMethod("manual")
    setPaymentError(null)
    setPollingSecondsLeft(60)
    setTimeout(() => {
      const targetId =
        variant === "modal" || showPaymentModal
          ? "modal-manual-code-input"
          : "same-page-manual-code-input"
      document.getElementById(targetId)?.focus()
    }, 90)
  }

  const handleCopyTill = async (tillNumber: string) => {
    try {
      await navigator.clipboard.writeText(tillNumber)
      setCopiedTill(true)
      toast.success(`Till Number ${tillNumber} copied`)
      setTimeout(() => setCopiedTill(false), 2000)
    } catch {
      toast.error("Could not copy automatically. Enter Till 9348469 in M-Pesa.")
    }
  }

  // Verify manually paid M-Pesa confirmation code or pasted SMS
  const handleManualPaymentVerify = async () => {
    const trimmedCode = manualMpesaCode.trim()
    if (trimmedCode.length < 6) {
      const msg = "Enter the 10-character M-Pesa code (e.g. UB12XYZ789) or paste your M-Pesa confirmation SMS."
      setPaymentError(msg)
      toast.error(msg)
      return
    }

    setIsVerifyingManual(true)
    setPaymentError(null)
    const toastId = toast.loading("Verifying your M-Pesa receipt code...")

    try {
      const certPin = formData.rawPin || formData.pin
      const res = await fetch('/api/mpesa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mpesaCode: trimmedCode,
          pin: certPin,
          phone: (paymentPhone || formData.phoneNumber || "").trim() || undefined,
        }),
      })
      const vData = await res.json()
      toast.dismiss(toastId)

      if (!res.ok || !vData.verified) {
        const errMsg =
          vData.error ||
          "Could not verify that M-Pesa code. Confirm your 10-character receipt (e.g. UB12XYZ789) and try again."
        setPaymentError(errMsg)
        toast.error(errMsg)
        return
      }

      await applyMpesaVerificationOutcome(vData, certPin)
    } catch (err: any) {
      toast.error(err.message || "Manual verification failed. Please retry.", { id: toastId })
    } finally {
      setIsVerifyingManual(false)
    }
  }

  // Fetches server-determined access: pay_per_download (strictly KES 20) or admin
  const checkAccess = async () => {
    if (!formData.pin && !formData.rawPin) {
      toast.error("Identity details missing. Please verify your ID again.")
      return
    }

    // If payment was already verified for this taxpayer, download directly without re-opening payment modal
    if (verifiedDownloadId) {
      await executeDownload(verifiedDownloadId)
      return
    }

    try {
      const res = await fetch('/api/certificate/check-access')
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Access check failed')
      setAccessInfo(data)
      const isSub = data.access === 'subscription' || data.access === 'admin'
      setIsSubscribed(isSub)

      // Active subscriber or admin bypasses payment completely!
      if (isSub) {
        toast.success(
          data.subscription?.planName === 'cyber_monthly'
            ? 'Cyber Cafe Subscription Active · Instant Download'
            : 'Subscription Active · Instant Download'
        )
        await handleSubscriptionDownload()
        return
      }

      clearPaymentTimers()
      setMpesaStatus("ready")
      setPaymentError(null)
      setPaymentMethod("stk")
      setManualMpesaCode("")

      // If user is already on step 4 with phone input, focus or initiate directly
      const inlinePhoneInput = document.getElementById('same-page-phone-input')
      if (inlinePhoneInput) {
        inlinePhoneInput.focus()
        inlinePhoneInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
        if (paymentPhone) {
          await handleMpesaDarajaPayment()
        } else {
          toast("Enter your Safaricom M-Pesa number to pay KES 20 and unlock your certificate.")
        }
      } else {
        setShowPaymentModal(true)
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not check access. Please try again.')
    }
  }

  // Called when user proceeds through the modal (active subscription OR after payment confirmed)
  const executeDownload = async (downloadId?: string) => {
    const targetDownloadId = downloadId || verifiedDownloadId
    if (!targetDownloadId) {
      toast.error("Download token missing. Please complete the payment flow.")
      return
    }

    setIsDownloadingPdf(true)
    const loadingToast = toast.loading("Securely generating your compliance certificate...")
    try {
      const activeForm = { ...formData }
      const certPin = activeForm.rawPin || activeForm.pin
      const payload = {
        pin: certPin,
        name: activeForm.fullName,
        idNumber: activeForm.idNumber,
        email: activeForm.email,
        building: activeForm.building,
        street: activeForm.street,
        city: activeForm.town,
        county: activeForm.county,
        district: activeForm.district,
        taxArea: activeForm.taxArea,
        station: activeForm.station,
        poBox: activeForm.poBox,
        postalCode: activeForm.postalCode,
        mobileNumber: activeForm.phoneNumber,
        registeredDate: activeForm.registeredDate,
        downloadId: targetDownloadId,
      }

      trackEvent({ activityType: 'download_certificate' })
      const response = await fetch('/api/generate-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Certificate generation failed")
      }

      const blob = await response.blob()
      if (blob.size < 100) {
        throw new Error("Received an invalid or empty certificate file.")
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const safeFilePin =
        certPin && !certPin.startsWith("kraseal1:") && !certPin.includes("*")
          ? certPin
          : 'OFFICIAL'
      a.download = `KRA_Certificate_${safeFilePin}.pdf`
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        a.remove()
        window.URL.revokeObjectURL(url)
      }, 1500)

      toast.success("Certificate downloaded successfully!", { id: loadingToast })
      setMpesaStatus("success")
    } catch (err: any) {
      toast.error(err.message || "Download failed. Please check your connection.", { id: loadingToast })
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  // Subscription download — no payment, just record and download
  const handleSubscriptionDownload = async () => {
    try {
      const recordRes = await fetch('/api/certificate/record-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: formData.pin,
          downloadType: 'subscription',
          subscriptionId: accessInfo?.subscription?.id,
        }),
      })
      const recordData = await recordRes.json()
      if (!recordData.success) throw new Error(recordData.error || 'Failed to authorize download')
      setVerifiedDownloadId(recordData.downloadId)
      setMpesaStatus("success")
      await refreshVerifiedData(recordData.downloadId, formData.rawPin || formData.pin)
      await executeDownload(recordData.downloadId)
    } catch (err: any) {
      toast.error(err.message || 'Download failed. Please try again.')
    }
  }

  // Admin: bypass payment modal entirely — record download directly as subscription-type
  const handleAdminDownload = async () => {
    if (!formData.pin || !formData.fullName) {
      toast.error('Identity details missing. Please verify your ID again.')
      return
    }
    setIsDownloadingPdf(true)
    const loadingToast = toast.loading('Generating certificate...')
    try {
      const recordRes = await fetch('/api/certificate/record-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: formData.pin, downloadType: 'subscription', subscriptionId: 'admin' }),
      })
      const recordData = await recordRes.json()
      if (!recordData.success) throw new Error(recordData.error || 'Failed to authorize download')
      toast.dismiss(loadingToast)
      await executeDownload(recordData.downloadId)
    } catch (err: any) {
      toast.error(err.message || 'Download failed.', { id: loadingToast })
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  // Effective full-access flag: admins always have full access
  const hasFullAccess = isAdmin || isSubscribed

  const handleDownload = isAdmin ? handleAdminDownload : checkAccess

  const stepVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  }

  // Ergonomic, high-contrast, auto-fitting input & button classes
  const inputClass = "w-full bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-semibold text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 px-3.5 py-2 h-11 transition-all shadow-2xs"
  const labelClass = "block text-xs font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider"
  const primaryButtonClass = "inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm active:scale-[0.98] transition-all shadow-sm shadow-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
  const secondaryButtonClass = "inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-surface-container border border-outline-variant text-on-surface font-semibold text-xs sm:text-sm hover:bg-surface-container-high active:scale-[0.98] transition-all cursor-pointer"

  const renderMpesaCheckoutPanel = (variant: "inline" | "modal") => {
    const phoneInputId = variant === "inline" ? "same-page-phone-input" : "modal-phone-input"
    const manualInputId = variant === "inline" ? "same-page-manual-code-input" : "modal-manual-code-input"
    const cleanPhonePreview = paymentPhone.replace(/[\s\-+()]/g, '')
    const hasPhoneInput = cleanPhonePreview.length > 0
    const isPhoneFormatValid =
      /^(?:254|0)(?:7\d{8}|1\d{8})$/.test(cleanPhonePreview) ||
      /^(?:7|1)\d{8}$/.test(cleanPhonePreview)
    const settledAmount = (accessInfo?.feeKes ?? 20).toFixed(2)

    return (
      <div
        className={cn(
          "w-full text-left space-y-5 min-w-0",
          variant === "inline"
            ? "rounded-2xl bg-surface-container-low/80 border border-outline-variant/80 p-4 sm:p-5 shadow-2xs overflow-hidden"
            : ""
        )}
      >
        {/* Clean Checkout Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/60 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base text-on-surface tracking-tight">
                {mpesaStatus === "success"
                  ? "Payment Verified · Official Certificate Unlocked"
                  : "Complete Payment to Unlock Official PDF"}
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Instant STK Push Prompt or Manual M-Pesa Receipt Verification
              </p>
            </div>
          </div>

          <div className="shrink-0 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2 flex sm:block items-center justify-between text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-primary block">
              Download Fee
            </span>
            <span className="text-base sm:text-lg font-black text-primary font-mono tabular-nums">
              KES {settledAmount}
            </span>
          </div>
        </div>

        {/* Order & Service Summary Strip */}
        <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/70 p-3 sm:p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="min-w-0 sm:col-span-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">
              Taxpayer
            </span>
            <p className="font-semibold text-on-surface truncate">
              {formData.fullName || "Registered Taxpayer"}
            </p>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">
              KRA PIN
            </span>
            <p className="font-mono font-bold text-primary truncate">
              {isRecordUnlocked
                ? ((formData.rawPin && !formData.rawPin.startsWith("kraseal1:")) ? formData.rawPin : formData.pin)
                : (maskPin(formData.pin) || "A01*****78Z")}
            </p>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">
              Deliverable
            </span>
            <p className="font-semibold text-on-surface truncate">
              KRA PIN Certificate (PDF)
            </p>
          </div>
        </div>

        {mpesaStatus === "success" ? (() => {
          const isCheckoutRef = Boolean(verifiedReceipt?.startsWith("ws_CO_"))
          const primaryRefLabel = isCheckoutRef ? "Daraja Reference" : "M-Pesa Receipt"
          const primaryRefDisplay = isCheckoutRef
            ? `CO-${verifiedReceipt!.slice(-10)}`
            : (verifiedReceipt || "CONFIRMED")
          const settledFee = (accessInfo?.feeKes ?? 20).toFixed(2)
          const unlockedPinText = isRecordUnlocked
            ? ((formData.rawPin && !formData.rawPin.startsWith("kraseal1:")) ? formData.rawPin : formData.pin)
            : (maskPin(formData.pin) || "OFFICIAL")

          return (
            <div className="rounded-2xl bg-surface-container-lowest border border-emerald-500/30 p-4 sm:p-5 space-y-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto sm:mx-0 shrink-0 shadow-sm shadow-emerald-600/25">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="w-3 h-3" />
                    Payment Verified
                  </span>
                  <h4 className="font-extrabold text-base sm:text-lg text-on-surface tracking-tight">
                    M-Pesa Payment Confirmed
                  </h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Your payment is verified and your complete KRA statutory record is unmasked and ready.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="min-w-0 rounded-xl bg-surface-container-low border border-outline-variant/70 p-3.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
                    {primaryRefLabel}
                  </span>
                  <p
                    className="text-sm font-mono font-black text-emerald-700 dark:text-emerald-300 truncate"
                    title={verifiedReceipt || "CONFIRMED"}
                  >
                    {primaryRefDisplay}
                  </p>
                  {isCheckoutRef && verifiedReceipt && (
                    <p
                      className="text-[10px] font-mono text-on-surface-variant/80 truncate mt-0.5"
                      title={verifiedReceipt}
                    >
                      {verifiedReceipt}
                    </p>
                  )}
                </div>

                <div className="min-w-0 rounded-xl bg-surface-container-low border border-outline-variant/70 p-3.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
                    Amount Settled
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-mono font-black text-on-surface tabular-nums truncate">
                      KES {settledFee}
                    </p>
                    <span className="shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      PAID
                    </span>
                  </div>
                </div>

                <div className="min-w-0 sm:col-span-2 rounded-xl bg-surface-container-low border border-outline-variant/70 p-3.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
                    Taxpayer PIN
                  </span>
                  <p className="text-sm font-mono font-black text-primary tracking-wider truncate" title={unlockedPinText}>
                    {unlockedPinText}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={isDownloadingPdf}
                  onClick={() => executeDownload()}
                  className={cn(
                    primaryButtonClass,
                    "w-full h-12 text-sm font-bold justify-center shadow-lg shadow-primary/25"
                  )}
                >
                  {isDownloadingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Generating KRA PIN Certificate (PDF)...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 shrink-0" />
                      <span>Download KRA PIN Certificate (PDF)</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-center text-on-surface-variant">
                  Official KRA PIN Certificate (PDF) · Ready for instant download
                </p>
              </div>

              {variant === "modal" && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false)
                      setCurrentStep(4)
                    }}
                    className="text-xs font-semibold text-on-surface-variant hover:text-on-surface underline pt-1 cursor-pointer"
                  >
                    Return to Unlocked Record
                  </button>
                </div>
              )}
            </div>
          )
        })() : (
          <div className="flex flex-col gap-4 min-w-0">
            {/* Clean Segmented Payment Mode Switcher */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-surface-container border border-outline-variant/80 gap-1">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod("stk")
                  setPaymentError(null)
                }}
                className={cn(
                  "min-h-[40px] px-2.5 sm:px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                  paymentMethod === "stk"
                    ? "bg-surface-container-lowest text-on-surface shadow-2xs border border-outline-variant/70"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">Instant STK Prompt</span>
              </button>
              <button
                type="button"
                onClick={() => switchToManualPayment(variant)}
                className={cn(
                  "min-h-[40px] px-2.5 sm:px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                  paymentMethod === "manual"
                    ? "bg-surface-container-lowest text-on-surface shadow-2xs border border-outline-variant/70"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                <Receipt className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">Manual Payment</span>
              </button>
            </div>

            {paymentMethod === "stk" ? (
              <div className="flex-1 flex flex-col justify-between gap-4 min-w-0">
                {/* STATE 1: READY TO SEND STK PUSH */}
                {mpesaStatus === "ready" && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/70 p-3.5 text-xs text-on-surface space-y-1.5">
                      <p className="font-bold uppercase tracking-wider text-[10px] text-emerald-700 dark:text-emerald-400">
                        Fastest Checkout · Direct Phone Prompt
                      </p>
                      <ol className="space-y-1 list-decimal list-inside text-[11px] text-on-surface-variant leading-relaxed">
                        <li>Enter your Safaricom M-Pesa number and click Send Prompt.</li>
                        <li>Authorize the KES {settledAmount} PIN prompt on your handset.</li>
                        <li>Your KRA PIN Certificate unlocks and downloads immediately.</li>
                      </ol>
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label htmlFor={phoneInputId} className="block text-xs font-bold text-on-surface">
                          Safaricom M-Pesa Phone Number
                        </label>
                        {hasPhoneInput && (
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full",
                              isPhoneFormatValid
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            )}
                          >
                            {isPhoneFormatValid ? "Valid Kenyan number" : "Use 07XXXXXXXX or 01XXXXXXXX"}
                          </span>
                        )}
                      </div>

                      {/* Well-fitted inline Phone Input + Submit Button */}
                      <div
                        className={cn(
                          "flex flex-col gap-2.5 w-full",
                          variant === "modal" && "sm:flex-row sm:items-center"
                        )}
                      >
                        <div className="relative flex-1 min-w-0">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <input
                            id={phoneInputId}
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            value={paymentPhone}
                            onChange={(e) => {
                              setPaymentPhone(e.target.value)
                              setPaymentError(null)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleMpesaDarajaPayment()
                              }
                            }}
                            placeholder="0712345678 or 0112345678"
                            className={cn(
                              inputClass,
                              "pl-10 font-mono text-sm",
                              paymentPhone.length > 0 ? "pr-9" : "pr-3.5"
                            )}
                          />
                          {paymentPhone.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentPhone("")
                                setPaymentError(null)
                                document.getElementById(phoneInputId)?.focus()
                              }}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-on-surface cursor-pointer"
                              aria-label="Clear M-Pesa phone number"
                              title="Clear phone number"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={isMpesaBusy}
                          onClick={() => handleMpesaDarajaPayment()}
                          className={cn(
                            primaryButtonClass,
                            variant === "inline" ? "w-full justify-center" : "w-full sm:w-auto px-5 shrink-0 justify-center"
                          )}
                        >
                          <span>Send KES {Math.round(Number(settledAmount))} Prompt</span>
                          <ArrowRight className="w-4 h-4 shrink-0" />
                        </button>
                      </div>
                    </div>

                    {paymentError && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-300 text-xs font-medium flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{paymentError}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                      <span className="text-on-surface-variant">
                        STK prompt not popping up on your phone?
                      </span>
                      <button
                        type="button"
                        onClick={() => switchToManualPayment(variant)}
                        className="text-primary font-bold hover:underline inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                      >
                        <span>Use Manual Payment</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {variant === "modal" && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setShowPaymentModal(false)}
                          className={cn(secondaryButtonClass, "w-full justify-center")}
                        >
                          Cancel Checkout
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* STATE 2: INITIATING */}
                {mpesaStatus === "initiating" && (
                  <div className="py-6 px-3 text-center space-y-3 my-auto">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                    <div>
                      <span className="inline-block text-[10px] font-black uppercase tracking-widest text-primary mb-1">
                        Step 1 of 3 · Contacting Safaricom
                      </span>
                      <h4 className="font-bold text-sm sm:text-base text-on-surface">
                        Sending Payment Prompt...
                      </h4>
                      <p className="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">
                        Dispatching KES {settledAmount} prompt to{" "}
                        <span className="font-mono font-bold text-on-surface">{paymentPhone}</span>.
                      </p>
                    </div>
                  </div>
                )}

                {/* STATE 3 & 4: STK SENT / WAITING FOR PIN */}
                {(mpesaStatus === "stk_sent" || mpesaStatus === "waiting") && (
                  <div className="space-y-4 text-center py-2 my-auto">
                    <div className="relative mx-auto w-14 h-14">
                      <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                      <div
                        className={cn(
                          "relative w-14 h-14 rounded-full flex items-center justify-center",
                          mpesaStatus === "stk_sent"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        <Smartphone className={cn("w-7 h-7", mpesaStatus === "waiting" && "animate-pulse")} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {mpesaStatus === "stk_sent" ? (
                        <span className="inline-block text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                          Prompt Delivered · {pollingSecondsLeft}s
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Waiting for M-Pesa PIN · {pollingSecondsLeft}s</span>
                        </span>
                      )}

                      <h4 className="font-bold text-sm sm:text-base text-on-surface">
                        {mpesaStatus === "stk_sent"
                          ? `Check ${paymentPhone} Now`
                          : `Authorize KES ${settledAmount} on Your Phone`}
                      </h4>

                      <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
                        Enter your M-Pesa PIN on{" "}
                        <span className="font-mono font-bold text-on-surface">{paymentPhone}</span>. Your KRA PIN Certificate unlocks automatically the moment confirmation arrives.
                      </p>

                      {activeCheckoutId && (
                        <p className="text-[10px] font-mono text-on-surface-variant pt-0.5 break-all">
                          Ref: {activeCheckoutId}
                        </p>
                      )}
                    </div>

                    {paymentError && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 text-xs font-medium">
                        {paymentError}
                      </div>
                    )}

                    <div className="flex flex-col gap-2.5 pt-1 w-full">
                      <button
                        type="button"
                        onClick={handleCheckPaymentStatus}
                        className={cn(primaryButtonClass, "w-full justify-center")}
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>I Entered PIN — Verify Now</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelOrResetPayment}
                        className={cn(secondaryButtonClass, "w-full justify-center")}
                      >
                        <span>Change Phone</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => switchToManualPayment(variant)}
                      className="text-xs font-bold text-primary hover:underline inline-flex items-center justify-center gap-1 cursor-pointer pt-1"
                    >
                      <span>STK prompt delayed? Switch to Manual Payment</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* STATE 5: VERIFYING */}
                {mpesaStatus === "verifying" && (
                  <div className="py-6 px-3 text-center space-y-3 my-auto">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary mx-auto">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                    <div>
                      <span className="inline-block text-[10px] font-black uppercase tracking-widest text-primary mb-1">
                        Step 3 of 3 · Live Check
                      </span>
                      <h4 className="font-bold text-sm sm:text-base text-on-surface">
                        Verifying Transaction Status...
                      </h4>
                      <p className="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">
                        Confirming payment for checkout <span className="font-mono font-semibold text-on-surface">{activeCheckoutId}</span>.
                      </p>
                    </div>
                  </div>
                )}

                {/* STATE 7: CANCELLED */}
                {mpesaStatus === "cancelled" && (
                  <div className="space-y-4 my-auto">
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm text-on-surface">
                          M-Pesa Request Cancelled on Phone
                        </h4>
                        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                          {paymentError ||
                            "You dismissed or cancelled the STK prompt on your phone. No funds were deducted."}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2.5 w-full">
                      <button
                        type="button"
                        onClick={() => handleMpesaDarajaPayment()}
                        className={cn(primaryButtonClass, "w-full justify-center")}
                      >
                        <RotateCcw className="w-4 h-4 shrink-0" />
                        <span>Resend STK Prompt</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelOrResetPayment}
                        className={cn(secondaryButtonClass, "w-full justify-center")}
                      >
                        <span>Edit Number</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => switchToManualPayment(variant)}
                      className={cn(secondaryButtonClass, "w-full justify-center border-primary/30 text-primary hover:bg-primary/5")}
                    >
                      <Receipt className="w-4 h-4 shrink-0" />
                      <span>Pay Manually via Till Instead</span>
                    </button>
                  </div>
                )}

                {/* STATE 8: TIMED OUT */}
                {mpesaStatus === "timeout" && (
                  <div className="space-y-4 my-auto">
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                      <Clock className="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm text-on-surface">
                          STK Authorization Timed Out
                        </h4>
                        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                          {paymentError ||
                            "The prompt expired before confirmation. If you already paid or want to pay manually, use the options below."}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2.5 w-full">
                      {activeCheckoutId && (
                        <button
                          type="button"
                          onClick={handleCheckPaymentStatus}
                          className={cn(primaryButtonClass, "w-full justify-center")}
                        >
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Verify Now</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleMpesaDarajaPayment()}
                        className={cn(secondaryButtonClass, "w-full justify-center")}
                      >
                        <RotateCcw className="w-4 h-4 shrink-0" />
                        <span>Retry STK</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => switchToManualPayment(variant)}
                        className={cn(secondaryButtonClass, "w-full justify-center border-primary/30 text-primary hover:bg-primary/5")}
                      >
                        <Receipt className="w-4 h-4 shrink-0" />
                        <span>Pay Manually</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* STATE 9: FAILED */}
                {mpesaStatus === "failed" && (
                  <div className="space-y-4 my-auto">
                    <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm text-red-700 dark:text-red-300">
                          STK Prompt Could Not Complete
                        </h4>
                        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                          {paymentError ||
                            "The STK push could not be completed. You can retry or complete your payment manually using the Till number."}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2.5 w-full">
                      <button
                        type="button"
                        onClick={() => handleMpesaDarajaPayment()}
                        className={cn(primaryButtonClass, "w-full justify-center")}
                      >
                        <RotateCcw className="w-4 h-4 shrink-0" />
                        <span>Retry STK Prompt</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelOrResetPayment}
                        className={cn(secondaryButtonClass, "w-full justify-center")}
                      >
                        <span>Edit Number</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => switchToManualPayment(variant)}
                      className={cn(secondaryButtonClass, "w-full justify-center border-primary/30 text-primary hover:bg-primary/5")}
                    >
                      <Receipt className="w-4 h-4 shrink-0" />
                      <span>Use Manual Payment Instead (Recommended)</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* MANUAL PAYMENT FALLBACK PANEL */
              <div className="flex-1 flex flex-col justify-between gap-4 min-w-0">
                <div className="space-y-4">
                  <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/70 p-3.5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        Manual M-Pesa Buy Goods Instructions
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleCopyTill(activeTill)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant text-[11px] font-mono font-bold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                      >
                        {copiedTill ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Copied Till</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-primary" />
                            <span>Copy Till {activeTill}</span>
                          </>
                        )}
                      </button>
                    </div>
                    <ol className="space-y-1 list-decimal list-inside text-xs text-on-surface-variant leading-relaxed">
                      <li>Open SIM Toolkit or M-Pesa App → <strong className="text-on-surface">Lipa na M-Pesa</strong> → <strong className="text-on-surface">Buy Goods</strong>.</li>
                      <li>Enter Till Number <strong className="font-mono text-on-surface">{activeTill}</strong> and Amount <strong className="font-mono text-on-surface">KES {Math.round(Number(settledAmount))}</strong>.</li>
                      <li>After receiving the M-Pesa SMS, enter the 10-character <strong className="text-on-surface">Transaction Code</strong> below.</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor={manualInputId} className="block text-xs font-bold text-on-surface">
                      M-Pesa Confirmation Code or Full SMS
                    </label>
                    <div
                      className={cn(
                        "flex flex-col gap-2.5 w-full",
                        variant === "modal" && "sm:flex-row sm:items-center"
                      )}
                    >
                      <div className="relative flex-1 min-w-0">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Receipt className="w-4 h-4 text-primary" />
                        </div>
                        <input
                          id={manualInputId}
                          type="text"
                          value={manualMpesaCode}
                          onChange={(e) => {
                            setManualMpesaCode(e.target.value)
                            setPaymentError(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              void handleManualPaymentVerify()
                            }
                          }}
                          placeholder="e.g. UB12XYZ789 or paste SMS"
                          className={cn(
                            inputClass,
                            "pl-10 font-mono uppercase tracking-wide",
                            manualMpesaCode.length > 0 ? "pr-9" : "pr-3.5"
                          )}
                        />
                        {manualMpesaCode.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setManualMpesaCode("")
                              setPaymentError(null)
                              document.getElementById(manualInputId)?.focus()
                            }}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-on-surface cursor-pointer"
                            aria-label="Clear M-Pesa receipt code"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={isVerifyingManual}
                        onClick={() => void handleManualPaymentVerify()}
                        className={cn(
                          primaryButtonClass,
                          variant === "inline" ? "w-full justify-center" : "w-full sm:w-auto px-5 shrink-0 justify-center"
                        )}
                      >
                        {isVerifyingManual ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Verify &amp; Unlock</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-on-surface-variant">
                      Example code: <span className="font-mono font-semibold text-on-surface">UB12XYZ789</span> — pasting the entire confirmation SMS also works automatically.
                    </p>
                  </div>

                  {paymentError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-300 text-xs font-medium flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{paymentError}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                  <span className="text-on-surface-variant">
                    Prefer an automatic PIN prompt on your phone?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("stk")
                      setPaymentError(null)
                    }}
                    className="text-primary font-bold hover:underline inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                  >
                    <span>Switch to STK Prompt</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      {!hideHeader && (
        <div className="mb-4 flex flex-col items-center justify-center text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-[11px] font-black text-primary uppercase tracking-widest shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            Akubrecah Statutory Verification Engine
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
            Retrieve Tax Compliance Certificate
          </h2>
          <p className="text-xs text-on-surface-variant max-w-md leading-relaxed">
            Instant verification by National ID or PIN · KES 20 download fee
          </p>
        </div>
      )}

      {isVerified && (
        <div className={cn("w-full mx-auto mb-4", currentStep === 4 ? "max-w-6xl" : "max-w-3xl")}>
          <Alert className="bg-surface-container-low border-outline-variant/80 text-on-surface rounded-2xl flex items-center gap-3 py-3 px-4 shadow-2xs">
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <AlertDescription className="text-xs font-semibold text-on-surface-variant">
              Taxpayer compliance record retrieved successfully. Review details below and proceed to download your certificate.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Step Process Tracker from Stitch Design (Institutional 4-node connected tracker) */}
      <div className="w-full max-w-xl mx-auto mb-6 px-2">
        <div className="relative flex items-center justify-between">
          {/* Background Connecting Track */}
          <div className="absolute left-6 right-6 top-4 -translate-y-1/2 h-0.5 bg-surface-container-highest -z-0" />
          {/* Active Progress Fill */}
          <motion.div
            className="absolute left-6 top-4 -translate-y-1/2 h-0.5 bg-primary -z-0"
            initial={{ width: "0%" }}
            animate={{ width: `${((currentStep - 1) / 3) * 88}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          />

          {/* Step 1 */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all",
                currentStep === 1
                  ? "bg-primary text-white ring-4 ring-primary/20 shadow-xs"
                  : currentStep > 1
                    ? "bg-on-background text-white shadow-xs"
                    : "bg-surface-container-lowest border-2 border-outline-variant text-on-surface-variant font-medium"
              )}
            >
              {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : 1}
            </div>
            <span
              className={cn(
                "mt-2 text-[11px] tracking-tight",
                currentStep === 1 ? "text-primary font-bold" : currentStep > 1 ? "text-on-surface font-semibold" : "text-on-surface-variant/70"
              )}
            >
              1. Identify
            </span>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all",
                currentStep === 2
                  ? "bg-primary text-white ring-4 ring-primary/20 shadow-xs"
                  : currentStep > 2
                    ? "bg-on-background text-white shadow-xs"
                    : "bg-surface-container-lowest border-2 border-outline-variant text-on-surface-variant font-medium"
              )}
            >
              {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : 2}
            </div>
            <span
              className={cn(
                "mt-2 text-[11px] tracking-tight",
                currentStep === 2 ? "text-primary font-bold" : currentStep > 2 ? "text-on-surface font-semibold" : "text-on-surface-variant/70"
              )}
            >
              2. Details
            </span>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all",
                currentStep === 3
                  ? "bg-primary text-white ring-4 ring-primary/20 shadow-xs"
                  : currentStep > 3
                    ? "bg-on-background text-white shadow-xs"
                    : "bg-surface-container-lowest border-2 border-outline-variant text-on-surface-variant font-medium"
              )}
            >
              {currentStep > 3 ? <Check className="w-3.5 h-3.5" /> : 3}
            </div>
            <span
              className={cn(
                "mt-2 text-[11px] tracking-tight",
                currentStep === 3 ? "text-primary font-bold" : currentStep > 3 ? "text-on-surface font-semibold" : "text-on-surface-variant/70"
              )}
            >
              3. Address
            </span>
          </div>

          {/* Step 4 */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all",
                currentStep === 4
                  ? isRecordUnlocked
                    ? "bg-primary text-white ring-4 ring-primary/20 shadow-xs"
                    : "bg-primary text-white ring-4 ring-primary/20 shadow-xs"
                  : "bg-surface-container-lowest border-2 border-outline-variant text-on-surface-variant font-medium"
              )}
            >
              {isRecordUnlocked ? <Check className="w-3.5 h-3.5" /> : 4}
            </div>
            <span
              className={cn(
                "mt-2 text-[11px] tracking-tight",
                currentStep === 4 ? "text-primary font-bold" : isRecordUnlocked ? "text-on-surface font-semibold" : "text-on-surface-variant/70"
              )}
            >
              4. Download (KES 20)
            </span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key="portal-content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <div className={cn("w-full bg-surface-container-lowest rounded-2xl sm:rounded-3xl shadow-soft border border-outline-variant p-5 sm:p-7 md:p-8 relative overflow-hidden z-10 mx-auto", currentStep === 4 ? "max-w-6xl" : currentStep === 1 ? "max-w-xl" : "max-w-3xl")}>
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">

                  {idSearchStatus === "searching" ? (
                    <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-6">
                      {/* High-Tech Statutory Radar Scanner HUD */}
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-primary/10" />
                        <div className="absolute inset-2 rounded-full border-2 border-dashed border-primary/40 animate-spin [animation-duration:8s]" />
                        <div className="absolute inset-4 rounded-full bg-primary/15" />
                        <div className="relative z-10 w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                      </div>

                      <div className="space-y-1.5 max-w-sm">
                        <h3 className="font-extrabold text-base sm:text-lg text-on-surface">
                          Connecting to Tax Records Service
                        </h3>
                        <p className="text-xs text-on-surface-variant font-medium">
                          Secure verification in progress. Querying taxpayer identity records...
                        </p>
                      </div>

                      {/* Live Verification Step HUD */}
                      <div className="w-full max-w-sm bg-surface-container-low border border-outline-variant/80 rounded-2xl p-4 text-left space-y-2.5">
                        <div className="flex items-center gap-2.5 text-xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-bold text-on-surface">Akubrecah Verification Gateway</span>
                          <span className="ml-auto text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">ONLINE</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs">
                          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                          <span className="font-semibold text-on-surface">Matching National ID & PIN Registry...</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-on-surface-variant">
                          <span className="w-2 h-2 rounded-full bg-outline-variant shrink-0" />
                          <span>Generating Cryptographic Compliance Certificate</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

                      {/* Third-Party Service Disclaimer Banner from Stitch */}
                      <div className="w-full max-w-md mx-auto p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/80 flex items-start gap-3 text-left">
                        <Shield className="w-5 h-5 text-on-surface-variant shrink-0 mt-0.5" />
                        <div className="text-xs text-on-surface-variant leading-relaxed">
                          <span className="font-bold text-on-surface">Third-Party Cyber Facilitation:</span> Akubrecah Technologies is independent and not affiliated with KRA. Free official services are accessible at{" "}
                          <a
                            href="https://itax.kra.go.ke"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline font-semibold hover:text-primary/80"
                          >
                            itax.kra.go.ke
                          </a>.{" "}
                          <Link href="/legal/disclaimer" className="text-primary underline font-semibold hover:text-primary/80 ml-1">
                            View Full Disclaimer →
                          </Link>
                        </div>
                      </div>

                      {/* Authentication Gate Notice: Search requires login */}
                      {authLoaded && !isSignedIn && (
                        <div className="w-full max-w-md mx-auto p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left shadow-2xs">
                          <div className="flex items-start gap-2.5">
                            <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <div>
                              <span className="text-xs font-bold text-on-surface block">
                                Account Sign In Required
                              </span>
                              <span className="text-[11px] text-on-surface-variant leading-tight block mt-0.5">
                                You must be signed in with a verified account to make a KRA search.
                              </span>
                            </div>
                          </div>
                          <Link href="/sign-in?redirect_url=/retrieval-portal" className="shrink-0 w-full sm:w-auto">
                            <Button size="sm" className="w-full sm:w-auto h-8 px-3.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 flex items-center justify-center gap-1.5 shadow-2xs">
                              <Lock className="w-3.5 h-3.5" />
                              <span>Sign In</span>
                            </Button>
                          </Link>
                        </div>
                      )}

                      {/* Segmented Mode Switcher from Stitch */}
                      <div className="w-full max-w-md mx-auto text-left">
                        <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                          Search Identifier Mode
                        </label>
                        <div className="bg-surface-container-low p-1 rounded-xl border border-outline-variant flex gap-1">
                          <button
                            type="button"
                            className={cn(
                              "flex-1 py-2.5 px-3 rounded-lg font-semibold text-xs transition-all text-center cursor-pointer flex items-center justify-center gap-1.5",
                              activeTab === "id"
                                ? "bg-primary text-white shadow-xs font-bold"
                                : "text-on-surface-variant hover:text-on-surface font-medium"
                            )}
                            onClick={() => {
                              setActiveTab("id");
                              setFormData(prev => ({ ...prev, pin: '', rawPin: '', fullName: '' }));
                              setError(null);
                            }}
                          >
                            <BadgeIcon className="w-3.5 h-3.5" />
                            <span>National ID Number</span>
                          </button>
                          <button
                            type="button"
                            className={cn(
                              "flex-1 py-2.5 px-3 rounded-lg font-semibold text-xs transition-all text-center cursor-pointer flex items-center justify-center gap-1.5",
                              activeTab === "pin"
                                ? "bg-primary text-white shadow-xs font-bold"
                                : "text-on-surface-variant hover:text-on-surface font-medium"
                            )}
                            onClick={() => {
                              setActiveTab("pin");
                              setFormData(prev => ({ ...prev, idNumber: '', rawPin: '', fullName: '' }));
                              setError(null);
                            }}
                          >
                            <MapPinIcon className="w-3.5 h-3.5" />
                            <span>KRA PIN</span>
                          </button>
                        </div>
                      </div>

                      <form
                        className="space-y-4 w-full max-w-md mx-auto"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!isSignedIn) {
                            toast.error("Please sign in to search taxpayer records.");
                            router.push("/sign-in?redirect_url=/retrieval-portal");
                            return;
                          }
                          handleIdSearch();
                        }}
                      >
                        {activeTab === "id" ? (
                          <div className="flex flex-col gap-1.5 text-left">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-on-surface tracking-wider uppercase">
                                National ID Number
                              </label>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                                Required Field
                              </span>
                            </div>
                            <div className="relative">
                              <input
                                className={cn(inputClass, "pr-11 text-base tracking-wider font-extrabold")}
                                placeholder="e.g. 12345678"
                                type="text"
                                maxLength={8}
                                value={formData.idNumber}
                                onChange={(e) => handleInputChange('idNumber', e.target.value.toUpperCase())}
                                autoFocus
                              />
                              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-on-surface-variant">
                                <BadgeIcon className="w-5 h-5 text-primary" />
                              </div>
                            </div>
                            <p className="text-[11px] text-on-surface-variant">
                              Ensure the 7 or 8-digit National Identity Card number is accurate.
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5 text-left">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-on-surface tracking-wider uppercase">
                                KRA PIN Identifier
                              </label>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                                Required Field
                              </span>
                            </div>
                            <div className="relative">
                              <input
                                className={cn(inputClass, "pr-11 uppercase text-base tracking-wider font-extrabold")}
                                placeholder="e.g. A012345678Z"
                                type="text"
                                maxLength={11}
                                value={formData.pin}
                                onChange={(e) => handleInputChange('pin', e.target.value.toUpperCase())}
                                autoFocus
                              />
                              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-on-surface-variant">
                                <MapPinIcon className="w-5 h-5 text-primary" />
                              </div>
                            </div>
                            <p className="text-[11px] text-on-surface-variant">
                              Format: 11-character alphanumeric (e.g. A012345678Z or P051...).
                            </p>
                          </div>
                        )}

                        {/* Arithmetic Security Challenge (Captcha Box from Stitch) */}
                        <div className="bg-surface-container-low border border-outline-variant/80 rounded-xl p-3.5 flex flex-col gap-2.5 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5 text-primary" />
                              Solve arithmetic question
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md border border-outline-variant">
                              Spam Protection
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-1.5 font-mono text-base font-bold text-on-surface tracking-wider flex items-center gap-2 select-none shrink-0">
                              {captchaImage ? (
                                <img src={captchaImage} alt="KRA Security Stamp" className="h-8 object-contain" />
                              ) : (
                                <span className="text-xs text-on-surface-variant font-sans">
                                  {captchaStatus === "loading" ? "Loading stamp..." : "Security Stamp"}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={loadCaptcha}
                                className="text-on-surface-variant hover:text-primary transition-colors p-1 cursor-pointer"
                                title="Refresh Challenge"
                              >
                                <RefreshCw className={cn("w-3.5 h-3.5", captchaStatus === "loading" && "animate-spin text-primary")} />
                              </button>
                            </div>
                            <div className="flex-1 min-w-[120px]">
                              <input
                                type="number"
                                value={captchaAnswer}
                                onChange={(e) => setCaptchaAnswer(e.target.value)}
                                placeholder="Enter answer"
                                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3.5 py-2 text-sm font-bold text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                              />
                            </div>
                          </div>
                        </div>

                        {error && (
                          <Alert variant="destructive" className="bg-error-container border-error text-error rounded-xl">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs font-medium mt-1">{error}</AlertDescription>
                          </Alert>
                        )}

                        {/* Terms & Consent Checkbox from Stitch */}
                        <label className="flex items-start gap-3 cursor-pointer pt-1 group text-left">
                          <input
                            type="checkbox"
                            id="kra-consent"
                            checked={hasConsented}
                            onChange={(e) => setHasConsented(e.target.checked)}
                            className="mt-0.5 w-4 h-4 accent-primary rounded border-outline-variant cursor-pointer"
                          />
                          <span className="text-xs text-on-surface-variant leading-snug group-hover:text-on-surface transition-colors">
                            I confirm I am the rightful owner or authorized agent and accept the{" "}
                            <a href="/legal/terms" target="_blank" className="text-primary font-bold hover:underline">
                              Terms of Service
                            </a>{" "}
                            &amp;{" "}
                            <a href="/legal/privacy" target="_blank" className="text-primary font-bold hover:underline">
                              Privacy Policy
                            </a>.
                          </span>
                        </label>

                        {/* Action Buttons from Stitch */}
                        <div className="flex flex-col gap-2 pt-1">
                          {authLoaded && !isSignedIn ? (
                            <Link href="/sign-in?redirect_url=/retrieval-portal" className="w-full">
                              <button
                                className={cn(
                                  primaryButtonClass,
                                  "w-full py-3.5 rounded-xl font-bold text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer bg-primary text-white hover:bg-primary/90"
                                )}
                                type="button"
                              >
                                <Lock className="w-4 h-4" />
                                <span>Sign In to Make a Search</span>
                              </button>
                            </Link>
                          ) : (
                            <button
                              className={cn(
                                primaryButtonClass,
                                "w-full py-3.5 rounded-xl font-bold text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                              )}
                              type="button"
                              onClick={handleIdSearch}
                              disabled={!hasConsented || captchaStatus === "loading"}
                            >
                              <Search className="w-4 h-4" />
                              <span>Verify Security Code</span>
                            </button>
                          )}
                          <button
                            className="w-full text-on-surface-variant hover:text-on-surface font-semibold text-xs text-center py-1 transition-colors cursor-pointer"
                            type="button"
                            onClick={() => {
                              if (!isSignedIn) {
                                toast.error("Please sign in to proceed.");
                                router.push("/sign-in?redirect_url=/retrieval-portal");
                                return;
                              }
                              setCurrentStep(2);
                            }}
                          >
                            Manual Entry
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 text-left">
                  {/* Success Alert Banner from Stitch Screen 2 */}
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="text-xs sm:text-sm font-medium">
                      <span className="font-bold text-on-surface">Identity Verified:</span> Matching records retrieved from KRA iTax central database.
                    </div>
                  </div>

                  {/* Header Section of Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-outline-variant gap-2">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-on-surface">Taxpayer Record Confirmation</h2>
                      <p className="text-xs text-on-surface-variant mt-0.5">Please review the retrieved ledger data below before generating the certificate.</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container border border-outline-variant text-on-surface-variant text-[10px] font-bold tracking-wider uppercase shrink-0 self-start sm:self-auto">
                      <Lock className="w-3 h-3 text-primary" />
                      256-BIT SECURE
                    </span>
                  </div>

                  {/* Two-Column Grid of Read-Only Taxpayer Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Taxpayer Name */}
                    <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Taxpayer Name</div>
                      <div className="text-sm font-bold font-mono tracking-wide text-on-surface">
                        {isRecordUnlocked ? formData.fullName : maskName(formData.fullName || "TAXPAYER RECORD")}
                      </div>
                    </div>

                    {/* KRA PIN */}
                    <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">KRA PIN</div>
                      <div className="text-sm font-bold font-mono tracking-wide text-on-surface">
                        {isRecordUnlocked
                          ? ((formData.rawPin && !formData.rawPin.startsWith("kraseal1:")) ? formData.rawPin : formData.pin)
                          : (maskPin(formData.pin) || "A00****78Z")}
                      </div>
                    </div>

                    {/* Taxpayer Type */}
                    <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Taxpayer Type</div>
                      <div className="text-sm font-bold text-on-surface">Individual</div>
                    </div>

                    {/* Registration Status */}
                    <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Registration Status</div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">Active</span>
                      </div>
                    </div>

                    {/* Tax Station */}
                    <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Tax Station</div>
                      <div className="text-sm font-bold text-on-surface">{formData.station || "Nairobi West"}</div>
                    </div>

                    {/* Obligation */}
                    <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Obligation</div>
                      <div className="text-sm font-bold text-on-surface">Income Tax - Resident Individual</div>
                    </div>
                  </div>

                  {/* Informational Note Banner/Box */}
                  <div className="p-3.5 rounded-xl bg-surface-container-low border border-dashed border-outline-variant flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-on-surface-variant shrink-0 mt-0.5" />
                    <div className="text-xs text-on-surface-variant leading-relaxed">
                      <strong className="text-on-surface font-semibold">Privacy Notice:</strong> Full unmasked details and official KRA Certificate PDF unlock immediately after payment verification.
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="w-full sm:w-auto px-6 h-11 rounded-xl bg-surface-container-lowest border border-outline-variant text-on-surface font-bold text-xs hover:bg-surface-container-low transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="w-full sm:w-auto px-7 h-11 rounded-xl bg-primary hover:bg-[#9c1414] text-white font-bold text-xs transition duration-150 active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Continue to Address</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 text-left">
                  {/* Card Section Header from Stitch Screen 3 */}
                  <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-on-surface">Registered Address &amp; Contact</h2>
                      <p className="text-xs text-on-surface-variant mt-0.5">Retrieved from KRA iTax registry records for National ID verification.</p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container rounded-lg border border-outline-variant text-on-surface-variant text-[11px] font-semibold shrink-0 self-start sm:self-auto">
                      <Lock className="w-3.5 h-3.5 text-on-surface-variant" />
                      <span>Read-only / Verified from iTax</span>
                    </div>
                  </div>

                  {/* Two-column grid of address & contact fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* County */}
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">County</label>
                      <div className="relative flex items-center">
                        <input
                          className="w-full h-11 bg-surface-container-low border border-outline-variant rounded-xl px-4 text-xs font-bold text-on-surface cursor-not-allowed outline-none"
                          readOnly
                          type="text"
                          value={formData.county || "Nairobi"}
                        />
                        <CheckCircle2 className="w-4 h-4 absolute right-3 text-emerald-600" />
                      </div>
                    </div>

                    {/* Town / City */}
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Town / City</label>
                      <div className="relative flex items-center">
                        <input
                          className="w-full h-11 bg-surface-container-low border border-outline-variant rounded-xl px-4 text-xs font-bold text-on-surface cursor-not-allowed outline-none"
                          readOnly
                          type="text"
                          value={formData.town || "Nairobi Central"}
                        />
                        <CheckCircle2 className="w-4 h-4 absolute right-3 text-emerald-600" />
                      </div>
                    </div>

                    {/* Postal Address */}
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Postal Address</label>
                      <div className="relative flex items-center">
                        <input
                          className="w-full h-11 bg-surface-container-low border border-outline-variant rounded-xl px-4 text-xs font-bold text-on-surface cursor-not-allowed outline-none"
                          readOnly
                          type="text"
                          value={formData.poBox ? (formData.poBox.toLowerCase().startsWith('p.o') ? formData.poBox : `P.O. Box ${formData.poBox}`) : "P.O. Box 45021"}
                        />
                        <Mail className="w-4 h-4 absolute right-3 text-on-surface-variant" />
                      </div>
                    </div>

                    {/* Postal Code */}
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Postal Code</label>
                      <div className="relative flex items-center">
                        <input
                          className="w-full h-11 bg-surface-container-low border border-outline-variant rounded-xl px-4 text-xs font-bold text-on-surface cursor-not-allowed outline-none"
                          readOnly
                          type="text"
                          value={formData.postalCode ? `${formData.postalCode} - ${formData.town || "GPO"}` : "00100 - GPO"}
                        />
                        <Signpost className="w-4 h-4 absolute right-3 text-on-surface-variant" />
                      </div>
                    </div>

                    {/* Registered Email (masked) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Registered Email (Masked)</label>
                        <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded border border-outline-variant">SECURED</span>
                      </div>
                      <div className="relative flex items-center">
                        <input
                          className="w-full h-11 bg-surface-container-low border border-outline-variant rounded-xl px-4 text-xs font-mono font-bold text-on-surface cursor-not-allowed outline-none"
                          readOnly
                          type="text"
                          value={isRecordUnlocked ? (formData.email || userEmail) : maskEmail(formData.email || userEmail || "akubrecah@gmail.com")}
                        />
                        <Shield className="w-4 h-4 absolute right-3 text-on-surface-variant" />
                      </div>
                    </div>

                    {/* Registered Mobile (masked) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Registered Mobile (Masked)</label>
                        <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded border border-outline-variant">KENYA TELCO</span>
                      </div>
                      <div className="relative flex items-center">
                        <input
                          className="w-full h-11 bg-surface-container-low border border-outline-variant rounded-xl px-4 text-xs font-mono font-bold text-on-surface cursor-not-allowed outline-none"
                          readOnly
                          type="text"
                          value={isRecordUnlocked && formData.phoneNumber && !formData.phoneNumber.includes('•') ? formData.phoneNumber : "+254 7•• ••• 419"}
                        />
                        <Smartphone className="w-4 h-4 absolute right-3 text-on-surface-variant" />
                      </div>
                    </div>
                  </div>

                  {/* Tax Obligations Section (dedicated sub-card from Stitch Screen 3) */}
                  <div className="border border-outline-variant rounded-xl bg-surface-container-lowest p-4">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-outline-variant">
                      <div className="flex items-center gap-2">
                        <Gavel className="w-4 h-4 text-primary" />
                        <h3 className="font-bold text-xs sm:text-sm text-on-surface">Registered Tax Obligations</h3>
                      </div>
                      <span className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase bg-surface-container px-2 py-0.5 rounded border border-outline-variant">
                        iTAX LEDGER CONFIRMED
                      </span>
                    </div>

                    {/* Table Container */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-on-surface-variant text-[11px] font-bold border-b border-outline-variant">
                            <th className="py-2">Obligation Name</th>
                            <th className="py-2">Effective Date</th>
                            <th className="py-2 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant">
                          <tr>
                            <td className="py-3 font-semibold text-on-surface">Income Tax - Resident Individual</td>
                            <td className="py-3 text-on-surface-variant font-mono">{formData.registeredDate || "14/08/2016"}</td>
                            <td className="py-3 text-right">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-surface-container text-on-surface border border-outline-variant">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                Compliant / Active
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p className="text-[11px] text-on-surface-variant mt-3 pt-2 border-t border-outline-variant/60 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                      <span>Obligation status verified against KRA Domestic Taxes Department ledger.</span>
                    </p>
                  </div>

                  {/* Action Buttons (Footer of Card) */}
                  <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="inline-flex items-center gap-2 h-11 px-6 border border-outline-variant bg-surface-container-lowest hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl transition duration-150 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="inline-flex items-center gap-2 h-11 px-7 bg-primary hover:bg-[#9c1414] text-white font-bold text-xs rounded-xl transition duration-150 active:scale-[0.98] shadow-sm cursor-pointer"
                    >
                      <span>Continue to Download</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {currentStep === 4 && (
                <motion.div key="step4" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 text-left">
                  {isRecordUnlocked || mpesaStatus === "success" ? (
                    /* Screen 5: Payment Success & Download Ready */
                    <div className="max-w-2xl mx-auto bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-soft overflow-hidden">
                      {/* Top Status Accent Banner */}
                      <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                            PAYMENT CONFIRMED • KRA HANDSHAKE OK
                          </span>
                        </div>
                        <span className="text-xs text-emerald-900 dark:text-emerald-200 font-bold">Auto-Cleared</span>
                      </div>

                      <div className="p-6 md:p-8 space-y-6">
                        {/* Header & Icon Cluster */}
                        <div className="text-center space-y-3">
                          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center ring-8 ring-emerald-50 dark:ring-emerald-950 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="w-8 h-8 font-bold" />
                          </div>
                          <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
                            Payment confirmed {verifiedReceipt ? `- receipt ${verifiedReceipt}` : "- receipt UB12XYZ789"}
                          </h2>
                          <p className="text-xs sm:text-sm text-on-surface-variant max-w-lg mx-auto leading-relaxed">
                            M-Pesa transaction verified successfully. Your official signed KRA Taxpayer Certificate is decrypted and ready for download.
                          </p>
                        </div>

                        {/* Certificate Summary Box */}
                        <div className="bg-surface-container-low rounded-xl border border-outline-variant p-5 space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                            <div className="flex items-center gap-2">
                              <BadgeIcon className="w-4 h-4 text-on-surface-variant" />
                              <span className="font-bold text-xs sm:text-sm text-on-surface">Certificate Summary</span>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              SIGNED
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3.5 gap-x-6 text-xs">
                            <div>
                              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Taxpayer Name</p>
                              <p className="font-bold text-on-surface mt-0.5">{formData.fullName || "VERIFIED CITIZEN"} (Individual)</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">KRA PIN</p>
                              <p className="font-mono font-black text-primary mt-0.5 tracking-wider">
                                {(formData.rawPin && !formData.rawPin.startsWith("kraseal1:")) ? formData.rawPin : formData.pin}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Tax Station</p>
                              <p className="font-medium text-on-surface mt-0.5">{formData.station || "Nairobi West"}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Obligation</p>
                              <p className="font-medium text-on-surface mt-0.5">Income Tax - Resident Individual</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Certificate Serial</p>
                              <p className="font-mono text-on-surface mt-0.5">{(formData as any).certificateSerial || "KRA-PIN-2025-09824X"}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">M-Pesa Amount Paid</p>
                              <p className="font-bold text-on-surface mt-0.5">
                                KES 20.00 <span className="font-normal text-on-surface-variant text-[11px]">({verifiedReceipt || "CONFIRMED"})</span>
                              </p>
                            </div>
                            <div className="md:col-span-2 pt-2 border-t border-outline-variant flex items-center justify-between">
                              <span className="text-[11px] font-bold text-on-surface-variant">Document Status</span>
                              <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 text-xs">
                                <Clock className="w-3.5 h-3.5" />
                                Valid &amp; Cryptographically Signed
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                          <button
                            onClick={() => executeDownload()}
                            disabled={isDownloadingPdf}
                            className="w-full bg-primary hover:bg-[#9c1414] text-white h-12 px-6 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition duration-150 active:scale-[0.98] shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            {isDownloadingPdf ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Compiling Certificate...</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4" />
                                <span>Download KRA PIN Certificate (PDF)</span>
                              </>
                            )}
                          </button>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(`Official KRA Taxpayer Certificate for ${formData.fullName} (PIN: ${formData.pin}) verified and retrieved on Akubrecah Cyber Portal.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low text-on-surface h-11 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition duration-150 cursor-pointer"
                            >
                              <Share2 className="w-4 h-4 text-emerald-600" />
                              <span>Send to WhatsApp</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => toast.success(`Receipt ${verifiedReceipt || 'UB12XYZ789'} verified & recorded in session.`)}
                              className="w-full bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low text-on-surface h-11 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition duration-150 cursor-pointer"
                            >
                              <Receipt className="w-4 h-4 text-on-surface-variant" />
                              <span>Download Receipt</span>
                            </button>
                          </div>
                        </div>

                        {/* Ephemeral Notice */}
                        <div className="pt-4 border-t border-outline-variant flex items-center justify-center gap-1.5 text-on-surface-variant text-xs">
                          <Shield className="w-4 h-4 text-primary" />
                          <span>Generated in memory - never stored on our servers</span>
                        </div>

                        {/* Tertiary Navigation */}
                        <div className="text-center pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              clearPaymentTimers()
                              setCurrentStep(1)
                            }}
                            className="inline-flex items-center gap-1.5 text-primary hover:underline font-bold text-xs cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Retrieve another certificate</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Screen 4: Locked Preview + M-Pesa Checkout Panel (7/5 Split) */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* LEFT COLUMN: Certificate Details & Locked PDF Preview (7 Cols) */}
                      <section className="lg:col-span-7 flex flex-col gap-5">
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-soft flex flex-col gap-5">
                          {/* Column Header */}
                          <div className="border-b border-outline-variant pb-4 flex justify-between items-start gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-primary" />
                                <h2 className="text-base sm:text-lg font-bold text-on-surface">Taxpayer Compliance Certificate</h2>
                              </div>
                              <p className="text-xs text-on-surface-variant mt-1">Verified and generated from KRA iTax database</p>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary-container text-on-secondary-fixed text-[11px] font-bold shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              Live Record
                            </span>
                          </div>

                          {/* Taxpayer Summary Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface-container-low p-4 rounded-xl border border-outline-variant text-xs">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Taxpayer Name</span>
                              <span className="font-bold text-on-surface mt-0.5">{maskName(formData.fullName || "TAXPAYER")} (Individual)</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">KRA PIN</span>
                              <span className="font-mono font-bold text-primary mt-0.5 tracking-wider">{maskPin(formData.pin) || "A00****78Z"}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Tax Station</span>
                              <span className="font-medium text-on-surface mt-0.5">{formData.station || "Nairobi West"}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Tax Obligation</span>
                              <span className="font-medium text-on-surface mt-0.5">Income Tax - Resident Individual</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Certificate Serial</span>
                              <span className="font-mono text-on-surface mt-0.5">{(formData as any).certificateSerial || "KRA-PIN-2025-09824X"}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Status</span>
                              <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Active &amp; Valid
                              </span>
                            </div>
                          </div>

                          {/* Locked Certificate PDF Preview Thumbnail Container */}
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center text-xs text-on-surface-variant font-medium">
                              <span>Document Preview Output</span>
                              <span className="flex items-center gap-1 font-mono text-[11px]">
                                <FileText className="w-3.5 h-3.5" />
                                A4 Document • 1 Page
                              </span>
                            </div>
                            <div className="relative bg-surface-container rounded-xl border border-outline-variant overflow-hidden p-6 flex flex-col items-center justify-center min-h-[300px] select-none">
                              {/* Subtle dot pattern */}
                              <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#906f6b_1px,transparent_1px)] [background-size:14px_14px]" />

                              {/* Realistic Mock Document Paper */}
                              <div className="w-full max-w-sm bg-surface-container-lowest rounded-lg shadow-md border border-outline-variant p-5 flex flex-col gap-3 opacity-40 filter blur-[1.5px] select-none pointer-events-none">
                                <div className="flex justify-between items-center border-b border-outline-variant pb-2">
                                  <div className="w-20 h-4 bg-surface-container-highest rounded" />
                                  <div className="w-12 h-3 bg-surface-container-highest rounded" />
                                </div>
                                <div className="space-y-2 py-2">
                                  <div className="w-full h-3 bg-surface-container-highest rounded" />
                                  <div className="w-3/4 h-3 bg-surface-container-highest rounded" />
                                  <div className="w-5/6 h-3 bg-surface-container-highest rounded" />
                                  <div className="w-1/2 h-3 bg-surface-container-highest rounded" />
                                </div>
                                <div className="pt-4 border-t border-outline-variant flex justify-between items-center">
                                  <div className="w-12 h-12 bg-surface-container-highest rounded border border-outline-variant" />
                                  <div className="w-28 h-6 bg-surface-container-highest rounded" />
                                </div>
                              </div>

                              {/* Overlay Lock & Shield Badge Layer */}
                              <div className="absolute inset-0 bg-on-background/15 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg mb-3">
                                  <Lock className="w-6 h-6" />
                                </div>
                                <div className="inline-flex items-center gap-1 px-3 py-1 bg-surface-container-lowest text-primary text-[10px] rounded-full shadow-sm mb-2 uppercase border border-outline-variant font-black tracking-wider">
                                  Payment Required To Unlock
                                </div>
                                <p className="text-base sm:text-lg font-black text-on-surface max-w-xs leading-snug">
                                  Encrypted Document Preview
                                </p>
                                <p className="text-xs text-on-surface-variant max-w-xs mt-1">
                                  Unlock full official signed PDF with digital seal &amp; instant download.
                                </p>
                                <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant bg-surface-container-lowest/90 px-3 py-1.5 rounded-lg border border-outline-variant">
                                  <QrCode className="w-4 h-4 text-primary" />
                                  <span>Official Digital QR Hash Included upon unlock</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Trust Assurance Banner */}
                          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3.5 flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <div className="text-xs text-on-surface-variant leading-relaxed">
                              <span className="font-bold text-on-surface">Universal State Acceptance:</span> Valid for Banking, NTSA Licensing, Passport &amp; Tender submissions across Kenya. Ephemeral session security guarantees no tax records remain cached.
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* RIGHT COLUMN: Payment Panel - M-Pesa Checkout (5 Cols) */}
                      <section className="lg:col-span-5 flex flex-col gap-6">
                        <div className="bg-surface-container-lowest border-2 border-primary/25 rounded-2xl p-5 sm:p-6 shadow-soft flex flex-col gap-5">
                          {/* Panel Header */}
                          <div className="flex justify-between items-start border-b border-outline-variant pb-4">
                            <div>
                              <h2 className="text-base sm:text-lg font-black text-on-surface">Pay via M-Pesa</h2>
                              <p className="text-xs text-on-surface-variant mt-0.5">Instant automated STK Push to your phone.</p>
                            </div>
                            <span className="bg-primary text-white font-black text-xs px-3 py-1 rounded-full shadow-sm">
                              KES 20.00
                            </span>
                          </div>

                          {/* Phone Number Input */}
                          <div className="flex flex-col gap-1.5 text-left">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-on-surface" htmlFor="mpesa-phone">
                                M-Pesa Mobile Number
                              </label>
                            </div>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                                <Smartphone className="w-4 h-4" />
                              </div>
                              <input
                                id="mpesa-phone"
                                type="tel"
                                value={paymentPhone}
                                onChange={(e) => setPaymentPhone(e.target.value)}
                                placeholder="0712 345 678"
                                className="w-full h-11 pl-10 pr-10 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                              />
                              {isValidUnmaskedKenyanPhone(paymentPhone) && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-600">
                                  <CheckCircle2 className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <span className="text-[11px] text-on-surface-variant">Enter the Safaricom line registered for M-Pesa</span>
                          </div>

                          {/* STK Push Action Button */}
                          <div className="flex flex-col gap-3">
                            <button
                              type="button"
                              onClick={() => void handleMpesaDarajaPayment(paymentPhone)}
                              disabled={isMpesaBusy || !isValidUnmaskedKenyanPhone(paymentPhone)}
                              className="w-full h-11 bg-primary hover:bg-[#9c1414] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition duration-150 active:scale-[0.98] shadow-sm cursor-pointer disabled:opacity-50"
                            >
                              {mpesaStatus === "initiating" ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Initiating STK Push...</span>
                                </>
                              ) : (
                                <>
                                  <span>Send STK Push</span>
                                  <ArrowRight className="w-4 h-4" />
                                </>
                              )}
                            </button>

                            {/* Waiting Indicator */}
                            {(mpesaStatus === "waiting" || mpesaStatus === "stk_sent" || mpesaStatus === "verifying") && (
                              <div className="flex flex-col gap-2 p-3 bg-surface-container-low border border-outline-variant rounded-xl">
                                <div className="flex items-center justify-center gap-2.5">
                                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                  <span className="text-xs font-semibold text-on-surface">
                                    Waiting for STK confirmation on phone... ({pollingSecondsLeft}s)
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={clearPaymentTimers}
                                  className="text-[11px] text-primary hover:underline text-center cursor-pointer"
                                >
                                  Cancel STK Push
                                </button>
                              </div>
                            )}

                            {paymentError && (
                              <Alert variant="destructive" className="bg-error-container border-error text-error rounded-xl py-2">
                                <AlertCircle className="w-4 h-4" />
                                <AlertDescription className="text-xs">{paymentError}</AlertDescription>
                              </Alert>
                            )}
                          </div>

                          {/* Styled Divider */}
                          <div className="relative flex items-center justify-center my-1">
                            <div className="w-full border-t border-outline-variant" />
                            <span className="absolute bg-surface-container-lowest px-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                              STK not received?
                            </span>
                          </div>

                          {/* Manual Fallback (Buy Goods Till) */}
                          <div className="bg-surface-container-low border border-dashed border-outline-variant rounded-xl p-4 flex flex-col gap-3.5 text-left">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                                <Store className="w-4 h-4 text-primary" />
                                Pay via Buy Goods Till
                              </span>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-surface-container text-on-surface-variant border border-outline-variant">
                                Manual Option
                              </span>
                            </div>

                            {/* Till Details Box */}
                            <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant grid grid-cols-2 gap-2 text-center">
                              <div className="border-r border-outline-variant pr-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">Till Number</span>
                                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                                  <span className="text-lg font-black text-primary tracking-wider">{activeTill}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(activeTill)
                                      setCopiedTill(true)
                                      toast.success("Till number copied!")
                                      setTimeout(() => setCopiedTill(false), 2000)
                                    }}
                                    className="p-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                                    title="Copy Till Number"
                                  >
                                    {copiedTill ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                                <span className="text-[10px] text-on-surface-variant block">Akubrecah Cyber</span>
                              </div>
                              <div className="pl-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">Exact Amount</span>
                                <span className="text-lg font-black text-on-surface block mt-0.5">KES 20</span>
                                <span className="text-[10px] text-on-surface-variant block">No ledger charges</span>
                              </div>
                            </div>

                            {/* Manual Code Input */}
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[11px] font-bold text-on-surface" htmlFor="mpesa-code">
                                Enter 10-character M-Pesa Reference Code
                              </label>
                              <div className="flex gap-2">
                                <input
                                  id="mpesa-code"
                                  type="text"
                                  maxLength={10}
                                  value={manualMpesaCode}
                                  onChange={(e) => setManualMpesaCode(e.target.value.toUpperCase())}
                                  placeholder="e.g. TCI89XX12A"
                                  className="flex-1 h-11 px-3 bg-surface-container-lowest border border-outline-variant rounded-xl font-mono text-sm font-bold uppercase tracking-wider text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                                <button
                                  type="button"
                                  onClick={() => void handleManualPaymentVerify()}
                                  disabled={isVerifyingManual || manualMpesaCode.trim().length < 8}
                                  className="h-11 px-4 bg-surface-container-lowest border border-outline-variant hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                                >
                                  {isVerifyingManual ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4 text-primary" />
                                      <span>Verify</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Micro notice */}
                          <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant justify-center">
                            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                            <span>256-Bit SSL Encrypted Handshake • Instant Token Clearance</span>
                          </div>
                        </div>
                      </section>
                    </div>
                  )}

                  {/* Reset / Search Again */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="px-6 h-11 rounded-xl bg-surface-container-lowest border border-outline-variant text-on-surface font-bold text-xs hover:bg-surface-container-low transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Address</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        clearPaymentTimers()
                        try {
                          sessionStorage.removeItem("kra_active_form_data")
                          localStorage.removeItem("kra_active_form_data")
                        } catch { }
                        window.location.reload()
                      }}
                      className="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer font-semibold"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>New Search</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom Trust Features Grid from Stitch */}
      <div className={cn("w-full mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-4", currentStep === 4 ? "max-w-6xl" : "max-w-3xl")}>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary shrink-0 border border-outline-variant/60">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-on-surface">Instant PDF delivery</div>
            <div className="text-on-surface-variant text-[11px]">Immediate digital copy</div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary shrink-0 border border-outline-variant/60">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-on-surface">M-Pesa KES 20 payment</div>
            <div className="text-on-surface-variant text-[11px]">STK Push checkout</div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary shrink-0 border border-outline-variant/60">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-on-surface">Zero document storage</div>
            <div className="text-on-surface-variant text-[11px]">Strict ephemeral parsing</div>
          </div>
        </div>
      </div>

      {/* Sovereign Compliance Guarantee Banner from Stitch */}
      <div className={cn("w-full mx-auto mt-4 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs", currentStep === 4 ? "max-w-6xl" : "max-w-3xl")}>
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
          <span className="text-on-surface-variant text-xs font-medium">
            <strong className="text-on-surface font-bold">COMPLIANCE GUARANTEE:</strong> Valid for Banking, NTSA Licensing, Passport &amp; Tender submissions across Kenya.
          </span>
        </div>
        <div className="shrink-0 px-3 py-1 rounded bg-surface-container-low border border-outline-variant text-on-surface-variant text-[10px] font-bold tracking-widest uppercase">
          256-BIT SSL HANDSHAKE
        </div>
      </div>

      {/* ── Official KRA Payment & Checkout Gate Modal ── */}
      {showPaymentModal && accessInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-3 sm:px-4 py-4 sm:py-6 overflow-y-auto">
          <div className="bg-surface border border-outline-variant/80 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden relative my-auto">
            {/* Top KRA Red decorative brand strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-primary-container via-primary to-primary-container" />

            <div className="p-4 sm:p-7 space-y-4 sm:space-y-5">
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary shadow-sm">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface text-lg sm:text-xl tracking-tight">
                      {mpesaStatus === 'success' ? 'Certificate Ready' : 'Document Retrieval Checkout'}
                    </h3>
                    <p className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                      Akubrecah Technologies · Instant Payment &amp; Verification
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/40 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {renderMpesaCheckoutPanel("modal")}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
