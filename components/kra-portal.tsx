"use client"

import Link from "next/link"
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
  FileText,
  Mail,
  ExternalLink
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
  const { isLoaded: authLoaded, isSignedIn, user } = useUser()

  // Derive admin status client-side from Clerk metadata
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || ''
  const userRole = user?.publicMetadata?.role as string | undefined
  const configPublicAdminEmail = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || '').toLowerCase()
  const isAdmin = (
    userEmail === configPublicAdminEmail ||
    userRole === 'Super Admin' ||
    userRole === 'Admin'
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
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false)
  const [verifiedReceipt, setVerifiedReceipt] = useState<string | null>(null)

  // Subscription & Safaricom Daraja M-Pesa Express state (Same-Page, Zero-Redirect)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [paymentPhone, setPaymentPhone] = useState("")
  const [pollingSecondsLeft, setPollingSecondsLeft] = useState(60)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const stkTransitionRef = useRef<NodeJS.Timeout | null>(null)

  const isMpesaBusy =
    mpesaStatus === "initiating" ||
    mpesaStatus === "stk_sent" ||
    mpesaStatus === "waiting" ||
    mpesaStatus === "verifying"
  const isRecordUnlocked = Boolean(verifiedDownloadId || isAdmin)

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
  }

  // Sync phone number from taxpayer profile if available
  useEffect(() => {
    if (formData.phoneNumber && !paymentPhone) {
      setPaymentPhone(formData.phoneNumber)
    }
  }, [formData.phoneNumber, paymentPhone])

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
      } catch {}
    }
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'idNumber') {
        updated.pin = ''
        updated.rawPin = ''
        updated.fullName = ''
      } else if (field === 'pin') {
        updated.idNumber = ''
        updated.rawPin = ''
        updated.fullName = ''
      }
      return updated
    })
  }

  const loadCaptcha = async () => {
    setCaptchaStatus("loading")
    setCaptchaAnswer("")
    setCaptchaImage(null)
    try {
      const res = await fetch('/api/kra/captcha')
      const data = await res.json()
      if (data.success) {
        setCaptchaImage(data.captchaImage)
        setSessionToken(data.sessionToken)
        setCaptchaStatus("ready")
      } else {
        setCaptchaStatus("error")
        setError("Failed to load verification image. Please try again.")
      }
    } catch {
      setCaptchaStatus("error")
      setError("Cannot connect to KRA server. Please try again.")
    }
  }

  const handleIdSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
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
      const response = await fetch('/api/kra/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idNumber: activeTab === "id" ? formData.idNumber.trim() : "",
          pin: activeTab === "pin" ? formData.pin.trim().toUpperCase() : "",
          captchaAnswer: captchaAnswer.trim(),
          sessionToken,
          engineMode,
        }),
      })

      const result = await response.json()

      // If server specifically requires CAPTCHA answer
      if (result.captchaRequired || result.captchaWrong || response.status === 422) {
        if (result.pin) {
          setFormData(prev => ({ ...prev, pin: result.pin }))
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
            pin: result.data?.pin || (activeTab === "pin" ? prev.pin : ''),
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
      setCurrentStep(4)
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
    if (vData?.verified && vData?.status === 'success' && vData?.downloadId) {
      clearPaymentTimers()
      const receipt = vData.mpesaReceipt || vData.checkoutRequestId || activeCheckoutId
      setVerifiedReceipt(receipt)
      setVerifiedDownloadId(vData.downloadId)
      setMpesaStatus("success")
      setPaymentError(null)
      setCurrentStep(4)
      toast.success(
        `M-Pesa payment confirmed${receipt ? ` (${receipt})` : ''}. Compiling your certificate...`,
        { duration: 5000 }
      )
      await refreshVerifiedData(vData.downloadId, vData.pin || certPin)
      await executeDownload(vData.downloadId)
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
      }, 1800)

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

      // Poll Daraja verification endpoint every 3 seconds until terminal state
      pollIntervalRef.current = setInterval(async () => {
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
        }
      }, 3000)
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
        body: JSON.stringify({ checkoutRequestId: activeCheckoutId, pin: certPin }),
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
      a.download = `KRA_Certificate_${certPin || 'OFFICIAL'}.pdf`
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

  // Generates and downloads the official ETR fiscal tax invoice matching the on-screen preview
  const handleDownloadReceipt = async () => {
    setIsDownloadingReceipt(true)
    const toastId = toast.loading("Generating your official fiscal ETR receipt...")
    try {
      const activeForm = { ...formData }
      const certPin = activeForm.rawPin || activeForm.pin
      const res = await fetch('/api/generate-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          downloadId: verifiedDownloadId,
          mpesaReceipt: verifiedReceipt || 'REC-' + (certPin ? certPin.slice(0, 4) : '2026') + '-ETR',
          pin: certPin,
          name: activeForm.fullName,
          amount: accessInfo?.feeKes || 20,
          phone: activeForm.phoneNumber,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to generate receipt PDF")
      }

      const blob = await res.blob()
      if (blob.size < 100) {
        throw new Error("Received an invalid or empty receipt file.")
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ETR_Receipt_${verifiedReceipt || 'OFFICIAL'}.pdf`
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        a.remove()
        window.URL.revokeObjectURL(url)
      }, 1500)
      toast.success("Official ETR receipt downloaded!", { id: toastId })
    } catch (err: any) {
      toast.error(err.message || "Failed to download receipt", { id: toastId })
    } finally {
      setIsDownloadingReceipt(false)
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

  // Ergonomic, high-contrast, auto-fitting input & button classes (WCAG AAA compliant, zero obscured fonts)
  const inputClass = "w-full bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-red-600 dark:focus:border-red-500 focus:ring-2 focus:ring-red-600/20 px-4 py-2.5 h-12 transition-all shadow-2xs"
  const labelClass = "block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5 uppercase tracking-wider"
  const primaryButtonClass = "inline-flex items-center justify-center gap-2 px-6 py-2.5 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm active:scale-[0.98] transition-all shadow-md shadow-red-600/20 cursor-pointer whitespace-nowrap"
  const secondaryButtonClass = "inline-flex items-center justify-center gap-2 px-5 py-2.5 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"

  const renderMpesaCheckoutPanel = (variant: "inline" | "modal") => {
    const phoneInputId = variant === "inline" ? "same-page-phone-input" : "modal-phone-input"
    const cleanPhonePreview = paymentPhone.replace(/[\s\-+()]/g, '')
    const hasPhoneInput = cleanPhonePreview.length > 0
    const isPhoneFormatValid =
      /^(?:254|0)(?:7\d{8}|1\d{8})$/.test(cleanPhonePreview) ||
      /^(?:7|1)\d{8}$/.test(cleanPhonePreview)

    return (
      <div
        className={cn(
          "w-full text-left space-y-4",
          variant === "inline"
            ? "max-w-2xl mx-auto rounded-2xl bg-surface-container-lowest dark:bg-zinc-900/95 border border-outline-variant p-4 sm:p-6 shadow-sm my-2"
            : ""
        )}
      >
        {/* Native Safaricom Daraja M-Pesa Express Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/60 pb-3.5">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-on-surface tracking-tight">
                  Safaricom M-Pesa Express
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                  Sole Active Gateway
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Lipa na M-Pesa Online STK Push · Paybill <span className="font-mono font-bold text-on-surface">9914132</span>
              </p>
            </div>
          </div>

          <div className="shrink-0 bg-primary/5 border border-primary/20 rounded-xl px-3.5 py-2 flex sm:block items-center justify-between text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-primary block">
              One-Time Fee
            </span>
            <span className="text-base sm:text-lg font-black text-primary font-mono tabular-nums">
              KES 20.00
            </span>
          </div>
        </div>

        {/* Order & Service Summary */}
        <div className="rounded-xl bg-surface-container/70 dark:bg-zinc-800/50 border border-outline-variant/70 p-3 sm:p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">
              Taxpayer
            </span>
            <p className="font-semibold text-on-surface truncate">
              {formData.fullName || "Registered Taxpayer"}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">
              KRA PIN
            </span>
            <p className="font-mono font-bold text-primary">
              {formData.pin || "Protected"}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">
              Deliverable
            </span>
            <p className="font-semibold text-on-surface">
              PIN Certificate + ETR Receipt
            </p>
          </div>
        </div>

        {/* STATE 1: READY TO PAY */}
        {mpesaStatus === "ready" && (
          <div className="space-y-4">
            {/* Clear 3-Step M-Pesa STK Instructions */}
            <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-3 text-[11px] text-emerald-900 dark:text-emerald-200 space-y-1.5">
              <p className="font-bold uppercase tracking-wider text-[10px] text-emerald-700 dark:text-emerald-300">
                How Instant M-Pesa Express Works
              </p>
              <ol className="space-y-1 list-decimal list-inside text-xs">
                <li>Confirm your Safaricom M-Pesa mobile number below and request the prompt.</li>
                <li>When the M-Pesa STK dialog pops up on your phone, enter your M-Pesa PIN for KES 20.00.</li>
                <li>Wait a few seconds for Safaricom verification — your official PDF unlocks automatically.</li>
              </ol>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
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
                    {isPhoneFormatValid ? "Valid Safaricom format" : "Use 07XXXXXXXX or 01XXXXXXXX"}
                  </span>
                )}
              </div>
              <div className="relative">
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
                  placeholder="0712345678 or 0112345678"
                  className="w-full h-12 pl-10 pr-4 py-2.5 rounded-xl border-2 border-outline-variant bg-surface dark:bg-zinc-800 text-on-surface text-sm font-mono font-semibold placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                />
              </div>
              <p className="text-[11px] text-on-surface-variant mt-1">
                Supported Kenyan M-Pesa formats: <span className="font-mono">07XXXXXXXX</span>, <span className="font-mono">01XXXXXXXX</span>, or <span className="font-mono">+2547XXXXXXXX</span>.
              </p>
            </div>

            {variant === "inline" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="same-page-email-input" className="block text-xs font-bold text-on-surface">
                    Certificate Delivery Email Address
                  </label>
                  <span className="text-[10px] text-on-surface-variant font-medium">
                    {formData.email || userEmail ? "Embedded on PDF" : "Optional"}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-on-surface-variant" />
                  </div>
                  <input
                    id="same-page-email-input"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      handleInputChange('email', e.target.value.toLowerCase().trim())
                    }}
                    placeholder={userEmail || "taxpayer@example.com"}
                    className="w-full h-11 pl-10 pr-4 py-2 rounded-xl border border-outline-variant bg-surface dark:bg-zinc-800 text-on-surface text-sm font-mono placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                  />
                </div>
              </div>
            )}

            {paymentError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-300 text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{paymentError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              {variant === "modal" && (
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className={cn(secondaryButtonClass, "w-full sm:w-auto sm:min-w-[120px] justify-center")}
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                disabled={isMpesaBusy}
                onClick={() => handleMpesaDarajaPayment()}
                className={cn(
                  primaryButtonClass,
                  "w-full flex-1 h-12 text-xs sm:text-sm font-extrabold shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                )}
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>Pay KES 20.00 via M-Pesa Express</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* STATE 2: INITIATING PAYMENT */}
        {mpesaStatus === "initiating" && (
          <div className="py-6 px-4 rounded-2xl bg-surface-container/60 border border-outline-variant/60 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <span className="inline-block text-[10px] font-black uppercase tracking-widest text-primary mb-1">
                Step 1 of 3 · Contacting Safaricom Daraja
              </span>
              <h4 className="font-bold text-sm sm:text-base text-on-surface">
                Initiating M-Pesa STK Push Request...
              </h4>
              <p className="text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
                Authenticating secure Daraja OAuth session and sending payment prompt to{" "}
                <span className="font-mono font-bold text-on-surface">{paymentPhone}</span>.
              </p>
            </div>
          </div>
        )}

        {/* STATE 3: STK PUSH SENT */}
        {mpesaStatus === "stk_sent" && (
          <div className="py-5 px-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/30 text-center space-y-3">
            <div className="relative mx-auto w-14 h-14">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="relative w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <Smartphone className="w-7 h-7" />
              </div>
            </div>
            <div>
              <span className="inline-block text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 mb-1">
                Step 2 of 3 · STK Prompt Delivered
              </span>
              <h4 className="font-bold text-sm sm:text-base text-on-surface">
                M-Pesa Prompt Sent to {paymentPhone}
              </h4>
              <p className="text-xs text-on-surface-variant mt-1 max-w-md mx-auto leading-relaxed">
                Look at your phone screen now. An M-Pesa payment prompt for{" "}
                <span className="font-mono font-bold text-on-surface">KES 20.00</span> (Paybill{" "}
                <span className="font-mono font-bold text-on-surface">9914132</span>) is opening.
              </p>
              {activeCheckoutId && (
                <p className="text-[10px] font-mono text-on-surface-variant mt-2">
                  Request ID: {activeCheckoutId}
                </p>
              )}
            </div>
          </div>
        )}

        {/* STATE 4: WAITING FOR CUSTOMER AUTHORIZATION */}
        {mpesaStatus === "waiting" && (
          <div className="py-4 px-3 sm:px-4 rounded-2xl bg-surface-container/70 border border-outline-variant text-center space-y-4">
            <div className="relative mx-auto w-14 h-14">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="relative w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Smartphone className="w-7 h-7 animate-pulse" />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                <Clock className="w-3.5 h-3.5" />
                <span>Awaiting M-Pesa PIN · {pollingSecondsLeft}s</span>
              </span>
              <h4 className="font-bold text-sm sm:text-base text-on-surface">
                Authorize KES 20.00 on Your Phone
              </h4>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
                Enter your 4-digit M-Pesa PIN on{" "}
                <span className="font-mono font-bold text-on-surface">{paymentPhone}</span>. Payment is not complete until Safaricom confirms your transaction — this page updates automatically without refreshing.
              </p>
              {activeCheckoutId && (
                <p className="text-[10px] font-mono text-on-surface-variant pt-1 break-all">
                  CheckoutRef: {activeCheckoutId}
                  {merchantRequestId ? ` · MerchantRef: ${merchantRequestId}` : ""}
                </p>
              )}
            </div>

            {paymentError && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 text-xs font-medium max-w-md mx-auto">
                {paymentError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 max-w-lg mx-auto pt-1">
              <button
                type="button"
                onClick={handleCheckPaymentStatus}
                className={cn(primaryButtonClass, "flex-1 h-11 text-xs font-bold justify-center")}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>I Have Entered My PIN — Verify Now</span>
              </button>
              <button
                type="button"
                onClick={handleCancelOrResetPayment}
                className={cn(secondaryButtonClass, "h-11 text-xs font-semibold justify-center")}
              >
                <span>Change Phone Number</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE 5: PAYMENT VERIFICATION IN PROGRESS */}
        {mpesaStatus === "verifying" && (
          <div className="py-6 px-4 rounded-2xl bg-surface-container/70 border border-primary/25 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary mx-auto">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <span className="inline-block text-[10px] font-black uppercase tracking-widest text-primary mb-1">
                Step 3 of 3 · Live Reconciliation
              </span>
              <h4 className="font-bold text-sm sm:text-base text-on-surface">
                Verifying Transaction with Safaricom Daraja...
              </h4>
              <p className="text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
                Checking M-Pesa callback confirmation and querying STK Push settlement status for{" "}
                <span className="font-mono font-semibold text-on-surface">{activeCheckoutId}</span>.
              </p>
            </div>
          </div>
        )}

        {/* STATE 6: PAYMENT SUCCESSFUL */}
        {mpesaStatus === "success" && (
          <div className="py-4 px-3 sm:px-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-500/35 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-base sm:text-lg text-on-surface">
                M-Pesa Payment Confirmed
              </h4>
              <p className="text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
                Safaricom verified your payment and unlocked your complete KRA statutory record.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 rounded-xl bg-surface-container-lowest dark:bg-zinc-900 border border-emerald-500/25 p-3 text-left text-xs max-w-lg mx-auto">
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                  M-Pesa Receipt
                </span>
                <span className="font-mono font-black text-emerald-700 dark:text-emerald-300">
                  {verifiedReceipt || "CONFIRMED"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                  Amount Settled
                </span>
                <span className="font-mono font-bold text-on-surface tabular-nums">
                  KES 20.00
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                  Taxpayer PIN
                </span>
                <span className="font-mono font-bold text-primary">
                  {formData.pin || "OFFICIAL"}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 max-w-lg mx-auto pt-1">
              <button
                type="button"
                disabled={isDownloadingPdf}
                onClick={() => executeDownload()}
                className={cn(primaryButtonClass, "flex-1 h-11 text-xs font-bold justify-center")}
              >
                {isDownloadingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Certificate PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Download Certificate (PDF)</span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={isDownloadingReceipt}
                onClick={handleDownloadReceipt}
                className={cn(secondaryButtonClass, "h-11 text-xs font-semibold justify-center")}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Download ETR Receipt (PDF)</span>
              </button>
            </div>

            {variant === "modal" && (
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
            )}
          </div>
        )}

        {/* STATE 7: PAYMENT CANCELLED */}
        {mpesaStatus === "cancelled" && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-on-surface">
                  M-Pesa Request Cancelled on Your Phone
                </h4>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  {paymentError ||
                    "You dismissed or cancelled the STK PIN prompt on your phone (ResultCode 1032). No funds were deducted from your M-Pesa account."}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleMpesaDarajaPayment()}
                className={cn(primaryButtonClass, "flex-1 h-11 text-xs font-bold justify-center")}
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>Resend M-Pesa STK Prompt</span>
              </button>
              <button
                type="button"
                onClick={handleCancelOrResetPayment}
                className={cn(secondaryButtonClass, "h-11 text-xs font-semibold justify-center")}
              >
                <span>Edit Phone Number</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE 8: PAYMENT TIMED OUT */}
        {mpesaStatus === "timeout" && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <div className="flex items-start gap-2.5">
              <Clock className="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-on-surface">
                  M-Pesa Authorization Timed Out
                </h4>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  {paymentError ||
                    "The M-Pesa prompt expired before confirmation was received. If you already entered your PIN and received an M-Pesa confirmation SMS, click Verify Now."}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {activeCheckoutId && (
                <button
                  type="button"
                  onClick={handleCheckPaymentStatus}
                  className={cn(primaryButtonClass, "flex-1 h-11 text-xs font-bold justify-center")}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>I Already Entered PIN — Verify Now</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleMpesaDarajaPayment()}
                className={cn(secondaryButtonClass, "h-11 text-xs font-bold justify-center")}
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>Send New STK Prompt</span>
              </button>
              <button
                type="button"
                onClick={handleCancelOrResetPayment}
                className={cn(secondaryButtonClass, "h-11 text-xs font-semibold justify-center")}
              >
                <span>Change Number</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE 9: PAYMENT FAILED */}
        {mpesaStatus === "failed" && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-red-700 dark:text-red-300">
                  M-Pesa Payment Failed
                </h4>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  {paymentError ||
                    "The transaction was declined (for example, insufficient M-Pesa balance, wrong PIN, or invalid subscriber line)."}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleMpesaDarajaPayment()}
                className={cn(primaryButtonClass, "flex-1 h-11 text-xs font-bold justify-center")}
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>Retry M-Pesa Payment</span>
              </button>
              <button
                type="button"
                onClick={handleCancelOrResetPayment}
                className={cn(secondaryButtonClass, "h-11 text-xs font-semibold justify-center")}
              >
                <span>Change Phone Number</span>
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      {!hideHeader && (
        <div className="mb-4 flex flex-col items-center justify-center text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-[11px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
            Akubrecah Statutory Verification Engine
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            Retrieve Tax Compliance Certificate
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md leading-relaxed">
            Instant verification by National ID or PIN · KES 20 download fee or Unlimited Cyber Plan
          </p>
        </div>
      )}

      {isVerified && (
        <div className="w-full max-w-2xl mx-auto mb-4">
          <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-2xl flex items-center gap-3 py-3 px-4 shadow-sm">
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <AlertDescription className="text-xs font-semibold">
              Taxpayer compliance record retrieved successfully. Review details below and proceed to download your certificate.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Eye-Catching Step Progress Bar */}
      <div className="w-full max-w-lg mx-auto mb-4 sm:mb-5 px-1 sm:px-3">
        <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-black tracking-wide mb-2">
          <span className={cn(currentStep >= 1 ? "text-red-600 dark:text-red-400 font-black" : "text-zinc-400")}>
            1. <span className="hidden sm:inline">Identify</span><span className="sm:hidden">ID</span>
          </span>
          <span className={cn(currentStep >= 2 ? "text-red-600 dark:text-red-400 font-black" : "text-zinc-400")}>2. Details</span>
          <span className={cn(currentStep >= 3 ? "text-red-600 dark:text-red-400 font-black" : "text-zinc-400")}>3. Address</span>
          <span className={cn(currentStep >= 4 ? "text-red-600 dark:text-red-400 font-black" : "text-zinc-400")}>
            4. Download<span className="hidden sm:inline"> (KES 20)</span>
          </span>
        </div>
        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden relative border border-zinc-200 dark:border-zinc-700">
          <motion.div 
            className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-red-600 rounded-full shadow-xs"
            initial={{ width: "25%" }}
            animate={{ width: `${(currentStep / 4) * 100}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key="portal-content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl shadow-sm border-2 border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 md:p-7 relative overflow-hidden z-10 max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                  
                  {idSearchStatus === "searching" ? (
                    <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-6">
                      {/* High-Tech Statutory Radar Scanner HUD */}
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-red-600/10" />
                        <div className="absolute inset-2 rounded-full border-2 border-dashed border-red-600/40 animate-spin [animation-duration:8s]" />
                        <div className="absolute inset-4 rounded-full bg-red-600/15" />
                        <div className="relative z-10 w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                      </div>

                      <div className="space-y-1.5 max-w-sm">
                        <h3 className="font-extrabold text-base sm:text-lg text-zinc-900 dark:text-zinc-50">
                          Connecting to Tax Records Service
                        </h3>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                          Secure verification in progress. Querying taxpayer identity records...
                        </p>
                      </div>

                      {/* Live Verification Step HUD */}
                      <div className="w-full max-w-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-2xl p-4 text-left space-y-2.5">
                        <div className="flex items-center gap-2.5 text-xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">Akubrecah Verification Gateway</span>
                          <span className="ml-auto text-[10px] font-mono font-bold text-emerald-600">ONLINE</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs">
                          <Loader2 className="w-3.5 h-3.5 text-red-600 animate-spin shrink-0" />
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">Matching National ID & PIN Registry...</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600 shrink-0" />
                          <span>Generating Cryptographic Compliance Certificate</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                      
                      {/* Third-Party Service Disclaimer Banner */}
                      <div className="max-w-md mx-auto p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed text-center">
                        <span className="font-bold">Third-Party Cyber Facilitation:</span> Akubrecah Technologies is an independent digital service provider and is not affiliated with the Kenya Revenue Authority (KRA). Free official services are available at{" "}
                        <a href="https://itax.kra.go.ke" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-amber-950 dark:hover:text-white">
                          itax.kra.go.ke
                        </a>.{" "}
                        <Link href="/legal/disclaimer" className="underline font-bold text-primary dark:text-red-400 hover:text-primary/80 ml-1">
                          View Full Disclaimer →
                        </Link>
                      </div>

                      {/* Lookup Type Segmented Switcher */}
                      <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl sm:rounded-2xl mb-4 border border-zinc-200 dark:border-zinc-700 max-w-sm mx-auto shadow-2xs">
                          <button 
                            type="button"
                            className={cn(
                              "flex-1 py-2 sm:py-2.5 text-xs rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap", 
                              activeTab === "id" 
                                ? "bg-red-600 text-white font-extrabold shadow-xs" 
                                : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white font-bold"
                            )}
                            onClick={() => {
                              setActiveTab("id");
                              setFormData(prev => ({ ...prev, pin: '', rawPin: '', fullName: '' }));
                              setError(null);
                            }}
                          >
                              <BadgeIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>National ID<span className="hidden sm:inline"> Number</span></span>
                          </button>
                          <button 
                            type="button"
                            className={cn(
                              "flex-1 py-2 sm:py-2.5 text-xs rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap", 
                              activeTab === "pin" 
                                ? "bg-red-600 text-white font-extrabold shadow-xs" 
                                : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white font-bold"
                            )}
                            onClick={() => {
                              setActiveTab("pin");
                              setFormData(prev => ({ ...prev, idNumber: '', rawPin: '', fullName: '' }));
                              setError(null);
                            }}
                          >
                              <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>KRA PIN</span>
                          </button>
                      </div>

                      <form className="space-y-4 max-w-sm mx-auto" onSubmit={(e) => { e.preventDefault(); handleIdSearch(); }}>
                          {activeTab === "id" ? (
                            <div>
                                <label className={labelClass}>National ID Number</label>
                                <div className="relative">
                                    <BadgeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-600 w-5 h-5" />
                                    <input 
                                      className={cn(inputClass, "pl-11 text-base tracking-wider font-extrabold")}
                                      placeholder="e.g. 12345678" 
                                      type="text" 
                                      value={formData.idNumber}
                                      onChange={(e) => handleInputChange('idNumber', e.target.value.toUpperCase())}
                                      autoFocus
                                    />
                                </div>
                            </div>
                          ) : (
                            <div>
                                <label className={labelClass}>KRA PIN</label>
                                <div className="relative">
                                    <MapPinIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-600 w-5 h-5" />
                                    <input 
                                      className={cn(inputClass, "pl-11 uppercase text-base tracking-wider font-extrabold")}
                                      placeholder="e.g. A012345678Z" 
                                      type="text" 
                                      value={formData.pin}
                                      onChange={(e) => handleInputChange('pin', e.target.value.toUpperCase())}
                                      autoFocus
                                    />
                                </div>
                            </div>
                          )}

                          {/* CAPTCHA section — shown after first click */}
                          <AnimatePresence>
                            {captchaStatus === "loading" && (
                              <motion.div key="captcha-loading" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-col items-center gap-2 py-2">
                                <Loader2 className="w-5 h-5 animate-spin text-red-600" />
                                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Loading security stamp...</span>
                              </motion.div>
                            )}
                            {captchaStatus === "ready" && captchaImage && (
                              <motion.div key="captcha-ready" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="flex flex-col items-center gap-3 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-700">
                                <label className={labelClass}>Solve Arithmetic Question</label>
                                <div className="relative">
                                  <img src={captchaImage} alt="KRA CAPTCHA" className="rounded-xl border-2 border-zinc-300 dark:border-zinc-600 h-14 mx-auto object-contain bg-white shadow-xs p-1" />
                                  <button
                                    type="button"
                                    onClick={loadCaptcha}
                                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center transition-all border border-zinc-300 dark:border-zinc-600 shadow-xs"
                                    title="Refresh CAPTCHA"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5 text-red-600" />
                                  </button>
                                </div>
                                <input 
                                  value={captchaAnswer}
                                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                                  placeholder="Enter answer"
                                  className={cn(inputClass, "text-center max-w-[170px] text-base font-extrabold")}
                                  autoFocus
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {error && (
                            <Alert variant="destructive" className="bg-error-container border-error text-error rounded-lg">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="text-xs font-medium mt-1">{error}</AlertDescription>
                            </Alert>
                          )}
                          
                          {/* Consent checkbox — legally required */}
                          <div className="flex items-start gap-2.5 text-left py-2 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
                            <input
                              type="checkbox"
                              id="kra-consent"
                              checked={hasConsented}
                              onChange={(e) => setHasConsented(e.target.checked)}
                              className="mt-0.5 w-4 h-4 accent-red-600 rounded border-zinc-300 cursor-pointer"
                            />
                            <label htmlFor="kra-consent" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer leading-snug">
                              I confirm I am the rightful owner or authorized agent for these credentials and I accept the{" "}
                              <a href="/legal/terms" target="_blank" className="text-red-600 dark:text-red-400 font-bold hover:underline">Terms of Service</a>.
                            </label>
                          </div>
                          
                          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                              <button 
                                className={cn(primaryButtonClass, "w-full sm:w-auto min-w-[200px] disabled:opacity-50")}
                                type="button"
                                onClick={handleIdSearch}
                                disabled={!hasConsented || captchaStatus === "loading"}
                              >
                                  <Search className="w-4 h-4" />
                                  {captchaStatus === "ready" ? "Verify Security Code" : "Retrieve Certificate"}
                              </button>
                              <button 
                                className="w-full sm:w-auto h-12 px-4 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-bold text-xs rounded-xl transition-all inline-flex justify-center items-center gap-1.5 cursor-pointer"
                                type="button"
                                onClick={() => setCurrentStep(2)}
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
                <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                  <div className="mb-stack-lg flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <User className="text-primary w-6 h-6" />
                    </div>
                    <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Personal Information</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Review and edit your certificate identity details.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    <div>
                      <label className={labelClass}>KRA PIN</label>
                      <input 
                        value={formData.pin} 
                        onChange={(e) => handleInputChange('pin', e.target.value.toUpperCase())} 
                        placeholder="e.g. A012345678Z" 
                        className={inputClass} 
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Full Legal Name</label>
                      <input 
                        value={formData.fullName} 
                        onChange={(e) => handleInputChange('fullName', e.target.value.toUpperCase())} 
                        placeholder="e.g. JOHN DOE" 
                        className={inputClass} 
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Email Address</label>
                      <input 
                        value={formData.email} 
                        onChange={(e) => handleInputChange('email', e.target.value.toLowerCase())} 
                        placeholder="email@example.com" 
                        type="email"
                        className={inputClass} 
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Mobile Phone Number</label>
                      <input 
                        value={formData.phoneNumber} 
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)} 
                        placeholder="e.g. 0712345678" 
                        type="tel"
                        className={inputClass} 
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Exact Registration Date</label>
                      <input 
                        value={formData.registeredDate} 
                        onChange={(e) => handleInputChange('registeredDate', e.target.value)} 
                        placeholder="DD/MM/YYYY" 
                        className={inputClass} 
                      />
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-3 pt-6 w-full max-w-md mx-auto">
                    <button className={cn(secondaryButtonClass, "w-full sm:w-auto sm:min-w-[100px]")} onClick={() => setCurrentStep(1)}>
                      Back
                    </button>
                    <button className={cn(primaryButtonClass, "w-full sm:w-auto sm:min-w-[140px]")} onClick={() => setCurrentStep(3)}>
                      Continue <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                  <div className="mb-stack-lg flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <MapPin className="text-primary w-6 h-6" />
                    </div>
                    <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Address & Location Details</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Review and edit your certificate address information.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    <div>
                      <label className={labelClass}>County</label>
                      <Select value={formData.county} onValueChange={(v) => { handleInputChange('county', v); handleInputChange('district', '') }}>
                        <SelectTrigger className={cn(inputClass, "h-12")}>
                          <SelectValue placeholder="Select County" />
                        </SelectTrigger>
                        <SelectContent className="bg-surface-container-lowest border-outline-muted rounded-lg">
                          {COUNTIES.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className={labelClass}>City / Town</label>
                      <input 
                        value={formData.town} 
                        onChange={(e) => handleInputChange('town', e.target.value)} 
                        placeholder="e.g. Nairobi" 
                        className={inputClass} 
                      />
                    </div>
                    <div>
                      <label className={labelClass}>District / Sub County</label>
                      <Select value={formData.district || ""} onValueChange={(v) => handleInputChange('district', v)}>
                        <SelectTrigger className={cn(inputClass, "h-12")}>
                          <SelectValue placeholder="Select District" />
                        </SelectTrigger>
                        <SelectContent className="bg-surface-container-lowest border-outline-muted rounded-lg">
                          {formData.county && GET_SUB_COUNTIES(formData.county).map(sc => (<SelectItem key={sc} value={sc}>{sc}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className={labelClass}>Tax Area Locality</label>
                      <Select value={formData.taxArea || ""} onValueChange={(v) => handleInputChange('taxArea', v)}>
                        <SelectTrigger className={cn(inputClass, "h-12")}>
                          <SelectValue placeholder="Select Locality" />
                        </SelectTrigger>
                        <SelectContent className="bg-surface-container-lowest border-outline-muted rounded-lg">
                          {formData.county && GET_LOCALITIES(formData.county, formData.district || "").map(l => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className={labelClass}>Tax Station</label>
                      <Select value={formData.station || ""} onValueChange={(v) => handleInputChange('station', v)}>
                        <SelectTrigger className={cn(inputClass, "h-12")}>
                          <SelectValue placeholder="Select Station" />
                        </SelectTrigger>
                        <SelectContent className="bg-surface-container-lowest border-outline-muted rounded-lg">
                          {formData.county && GET_STATIONS(formData.county).map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className={labelClass}>Building Name</label>
                      <input 
                        value={formData.building} 
                        onChange={(e) => handleInputChange('building', e.target.value)} 
                        placeholder="e.g. Commercial Plaza" 
                        className={inputClass} 
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Street / Road</label>
                      <input 
                        value={formData.street} 
                        onChange={(e) => handleInputChange('street', e.target.value)} 
                        placeholder="e.g. Harambee Avenue" 
                        className={inputClass} 
                      />
                    </div>
                    <div>
                      <label className={labelClass}>P.O. Box</label>
                      <input 
                        value={formData.poBox} 
                        onChange={(e) => handleInputChange('poBox', e.target.value)} 
                        placeholder="e.g. P.O. Box 40001" 
                        className={inputClass} 
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Postal Code</label>
                      <Select value={formData.postalCode} onValueChange={(v) => { const found = GET_POSTAL_CODES(formData.county).find(p => p.code === v); handleInputChange('postalCode', v); if (found) handleInputChange('town', found.town) }}>
                        <SelectTrigger className={cn(inputClass, "h-12")}>
                          <SelectValue placeholder="Select Postal Code" />
                        </SelectTrigger>
                        <SelectContent className="bg-surface-container-lowest border-outline-muted rounded-lg">
                          {formData.county && GET_POSTAL_CODES(formData.county).map(p => (<SelectItem key={p.code} value={p.code}>{p.code}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-3 pt-6 w-full max-w-md mx-auto">
                    <button className={cn(secondaryButtonClass, "w-full sm:w-auto sm:min-w-[100px]")} onClick={() => setCurrentStep(2)}>
                      Back
                    </button>
                    <button className={cn(primaryButtonClass, "w-full sm:w-auto sm:min-w-[170px]")} onClick={() => setCurrentStep(4)}>
                      Review Certificate <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {currentStep === 4 && (
                <motion.div key="step4" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                  <div className="flex flex-col items-center justify-center text-center mb-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="text-primary w-5 h-5" />
                      <h2 className="text-base sm:text-lg font-bold text-on-surface">Verified Taxpayer Record</h2>
                    </div>
                    <p className="text-[11px] sm:text-xs text-on-surface-variant">
                      Official Kenya Data Protection Act (KDPA) Privacy Protected Preview.
                    </p>
                  </div>

                  {/* Official Verification Success Badge & KES 20 Notice */}
                  {(() => {
                    const isRecordUnlocked = Boolean(verifiedDownloadId || isAdmin || isSubscribed);
                    return (
                      <>
                        <div className="w-full max-w-2xl mx-auto bg-gradient-to-r from-emerald-500/10 via-red-500/5 to-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left shadow-xs">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                                {isRecordUnlocked ? "Compliance Certificate Ready" : "Official Compliance Record Ready"}
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                                  {isRecordUnlocked ? "Paid & Unmasked" : "100% Verified"}
                                </span>
                              </p>
                              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed font-medium">
                                {isRecordUnlocked 
                                  ? "Payment verified. Your certificate is compiled and full taxpayer details are unmasked below." 
                                  : <>Taxpayer record matched directly with government registries. Confidential fields remain masked until you pay strictly <strong>KES 20 (20 bob)</strong> to unmask and download your official tamper-proof PDF.</>}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl px-3.5 py-2 text-center w-full sm:w-auto">
                            <span className="block text-[10px] uppercase font-black text-red-600 dark:text-red-400 tracking-wider">Download Fee</span>
                            <span className="text-sm sm:text-base font-black text-red-600 dark:text-red-400">
                              {isRecordUnlocked ? "PAID" : "KES 20 only"}
                            </span>
                          </div>
                        </div>

                        {/* Taxpayer Preview Data Grid */}
                        <div className="w-full max-w-2xl mx-auto bg-surface-variant/30 rounded-2xl p-4 sm:p-6 border border-outline-variant space-y-4 shadow-sm my-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                              
                              {/* 1. Taxpayer Legal Name (Unmasked) */}
                              <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/80">
                                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-on-surface-variant mb-1">
                                  <span>Taxpayer Legal Name</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded">Verified Citizen</span>
                                </div>
                                <p className="text-xs sm:text-sm font-bold text-on-surface uppercase truncate">
                                  {formData.fullName || "REGISTERED TAXPAYER"}
                                </p>
                              </div>

                              {/* 2. National ID (Unmasked - Fully Visible) */}
                              <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/80">
                                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-on-surface-variant mb-1">
                                  <span>National ID Number</span>
                                  <span className="text-primary font-semibold text-[9px] bg-primary/10 px-1.5 py-0.5 rounded">Official ID</span>
                                </div>
                                <p className="text-xs sm:text-sm font-mono font-bold text-on-surface">
                                  {formData.idNumber || "On File"}
                                </p>
                              </div>

                              {/* 3. KRA PIN (Masked until paid) */}
                              <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/80">
                                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-on-surface-variant mb-1">
                                  <span>KRA PIN</span>
                                  <span className={cn(
                                    "font-semibold text-[9px] px-1.5 py-0.5 rounded",
                                    isRecordUnlocked ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  )}>
                                    {isRecordUnlocked ? "Verified & Paid" : "Protected PIN"}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm font-mono font-black text-primary tracking-wider">
                                  {isRecordUnlocked 
                                    ? (formData.rawPin || formData.pin) 
                                    : (maskPin(formData.pin || formData.rawPin) || "A01*****78Z")}
                                </p>
                              </div>

                              {/* 4. Tax Station (Masked until paid) */}
                              <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/80">
                                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-on-surface-variant mb-1">
                                  <span>Tax Station</span>
                                  <span className={cn(
                                    "font-semibold text-[9px] px-1.5 py-0.5 rounded",
                                    isRecordUnlocked ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  )}>
                                    {isRecordUnlocked ? "Station Match" : "Protected Station"}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm font-bold text-on-surface truncate">
                                  {isRecordUnlocked ? (
                                    formData.station || "Kitale TSO"
                                  ) : (
                                    <span className="blur-xs select-none font-mono text-on-surface-variant flex items-center gap-1.5">
                                      <Lock className="w-3.5 h-3.5 text-primary inline shrink-0" />
                                      •••••••••• (Protected)
                                    </span>
                                  )}
                                </p>
                              </div>

                              {/* 5. Email Address (Masked until paid) */}
                              <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/80">
                                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-on-surface-variant mb-1">
                                  <span>Email Address</span>
                                  <span className={cn(
                                    "font-semibold text-[9px] px-1.5 py-0.5 rounded",
                                    isRecordUnlocked ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-surface-variant text-on-surface-variant"
                                  )}>
                                    {isRecordUnlocked ? "Unmasked" : "Partial Mask"}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm font-mono text-on-surface truncate">
                                  {isRecordUnlocked 
                                    ? (formData.email || userEmail || "Official Email on File") 
                                    : ((formData.email || userEmail) 
                                        ? maskEmail(formData.email || userEmail) 
                                        : "••••••••@••••• (Confidential on KRA Registry)")}
                                </p>
                              </div>

                              {/* 6. Phone Number (Completely Masked until paid) */}
                              <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/80">
                                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-on-surface-variant mb-1">
                                  <span>Mobile Phone</span>
                                  <span className={cn(
                                    "font-semibold text-[9px] px-1.5 py-0.5 rounded",
                                    isRecordUnlocked ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
                                  )}>
                                    {isRecordUnlocked ? "Unmasked" : "Protected Phone"}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm font-mono font-bold text-on-surface tracking-wider">
                                  {isRecordUnlocked && formData.phoneNumber && !formData.phoneNumber.includes('•')
                                    ? formData.phoneNumber 
                                    : "••••••••••"}
                                </p>
                              </div>

                              {/* 7. Region & City (Location - Masked until paid) */}
                              <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/80">
                                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-on-surface-variant mb-1">
                                  <span>Location</span>
                                  <span className={cn(
                                    "font-semibold text-[9px] px-1.5 py-0.5 rounded",
                                    isRecordUnlocked ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  )}>
                                    {isRecordUnlocked ? "Verified Location" : "Protected Location"}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm font-medium text-on-surface truncate">
                                  {isRecordUnlocked ? (
                                    formData.county ? `${formData.county} · ${formData.town || formData.county}` : (formData.town || "Nairobi")
                                  ) : (
                                    <span className="blur-xs select-none font-mono text-on-surface-variant flex items-center gap-1.5">
                                      <Lock className="w-3.5 h-3.5 text-primary inline shrink-0" />
                                      •••••••••••• (Protected)
                                    </span>
                                  )}
                                </p>
                              </div>

                              {/* 8. Registration Date (Date Issued - Masked until paid) */}
                              <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/80">
                                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-on-surface-variant mb-1">
                                  <span>Date Issued</span>
                                  <span className={cn(
                                    "font-semibold text-[9px] px-1.5 py-0.5 rounded",
                                    isRecordUnlocked ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  )}>
                                    {isRecordUnlocked ? "Statutory Match" : "Protected Date"}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm font-medium text-on-surface">
                                  {isRecordUnlocked ? (
                                    formData.registeredDate || "On Official File"
                                  ) : (
                                    <span className="blur-xs select-none font-mono text-on-surface-variant flex items-center gap-1.5">
                                      <Lock className="w-3.5 h-3.5 text-primary inline shrink-0" />
                                      ••/••/•••• (Protected)
                                    </span>
                                  )}
                                </p>
                              </div>

                              {/* 9. Physical Building & Street Address (Protected until paid) */}
                              <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/80 sm:col-span-2">
                                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-on-surface-variant mb-1">
                                  <span>Physical Address & Postal Records</span>
                                  <span className={cn(
                                    "font-semibold text-[9px] px-1.5 py-0.5 rounded",
                                    isRecordUnlocked ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-surface-variant text-on-surface-variant"
                                  )}>
                                    {isRecordUnlocked ? "Unmasked" : "KDPA Protected"}
                                  </span>
                                </div>
                                <p className="text-xs font-mono text-on-surface flex items-center gap-1.5">
                                  {isRecordUnlocked ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                      {[formData.building, formData.street, formData.poBox ? `P.O. Box ${formData.poBox}` : '', formData.postalCode].filter(Boolean).join(', ') || "Official Address Records on File"}
                                    </span>
                                  ) : (
                                    <>
                                      <Lock className="w-3.5 h-3.5 text-primary" />
                                      <span className="text-on-surface-variant">•••••••••••• (Secured — Pay KES 20 to unmask and download certificate)</span>
                                    </>
                                  )}
                                </p>
                              </div>

                            </div>

                            {/* Privacy Assurance Banner */}
                            <div className="rounded-xl bg-surface-container p-3 border border-outline-variant/60 flex items-start gap-2.5 text-[11px] text-on-surface-variant">
                              <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <p className="leading-relaxed">
                                {isRecordUnlocked 
                                  ? "Payment verified. Your complete, unmasked statutory record is shown and included in your downloaded certificate."
                                  : <>To protect citizen privacy under the Kenya Data Protection Act, contact details and identification numbers are partially masked during web preview. The full unmasked official record is embedded into your official PDF certificate upon payment of <strong>KES 20</strong>.</>}
                              </p>
                            </div>
                          </div>
                      </>
                    );
                  })()}



                  {/* ── SAFARICOM DARAJA M-PESA EXPRESS CHECKOUT & STATUS ── */}
                  {(!isRecordUnlocked || mpesaStatus === "success") &&
                    renderMpesaCheckoutPanel("inline")}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-2xl mx-auto pt-2">
                    <button
                      className={cn(secondaryButtonClass, "w-full sm:w-auto justify-center")}
                      onClick={() => {
                        clearPaymentTimers()
                        setCurrentStep(1)
                        setIdSearchStatus("idle")
                        setIsVerified(false)
                        setVerifiedDownloadId(null)
                        setVerifiedReceipt(null)
                        setActiveCheckoutId(null)
                        setMerchantRequestId(null)
                        setMpesaStatus("ready")
                        setPaymentError(null)
                        setFormData(prev => ({ ...prev, idNumber: "", pin: "", rawPin: "" }))
                      }}
                    >
                      <RefreshCw className="w-4 h-4 shrink-0" /> New Search
                    </button>
                    {isRecordUnlocked && (
                      <button 
                        className={cn(primaryButtonClass, "w-full sm:w-auto justify-center shadow-lg shadow-primary/25 h-12 px-6 sm:px-8 text-xs sm:text-sm font-bold flex items-center gap-2")} 
                        onClick={() => executeDownload()}
                        disabled={isDownloadingPdf}
                      >
                        <Download className="w-4 h-4 shrink-0" /> 
                        <span>{isDownloadingPdf ? "Compiling PDF..." : "Download Certificate (PDF)"}</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Official KRA Payment & Checkout Gate Modal ── */}
      {showPaymentModal && accessInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-3 sm:px-4 py-4 sm:py-6 overflow-y-auto">
          <div className="bg-surface border border-outline-variant/80 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative my-auto">
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
                      Akubrecah Technologies · Safaricom Daraja M-Pesa Express
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
