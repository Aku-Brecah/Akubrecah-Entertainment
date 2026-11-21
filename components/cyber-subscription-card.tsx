"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Phone,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Zap,
  ArrowRight,
  ExternalLink,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";

interface CyberCafeData {
  id: string;
  cafeName: string;
  ownerName: string;
  whatsappPhone: string;
  paymentPhone: string;
  status: string;
  expiresAt: string;
  totalDownloads: number;
  dailyDownloads: number;
}

interface CyberInvoiceData {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  mpesaReceipt: string | null;
  status: string;
  createdAt: string;
  periodStart: string;
  periodEnd: string;
}

type CyberMpesaStatus =
  | "ready"
  | "initiating"
  | "stk_sent"
  | "waiting"
  | "verifying"
  | "success"
  | "failed"
  | "cancelled"
  | "timeout";

export function CyberSubscriptionCard({ compact = false }: { compact?: boolean }) {
  const { isSignedIn, isLoaded, user } = useUser();
  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [cafe, setCafe] = useState<CyberCafeData | null>(null);
  const [invoices, setInvoices] = useState<CyberInvoiceData[]>([]);

  // Modal & Safaricom Daraja M-Pesa Express State
  const [showModal, setShowModal] = useState(false);
  const [mpesaStatus, setMpesaStatus] = useState<CyberMpesaStatus>("ready");
  const [pollingCheckoutId, setPollingCheckoutId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [confirmedReceipt, setConfirmedReceipt] = useState<string | null>(null);
  const stkTransitionRef = useRef<NodeJS.Timeout | null>(null);

  const isBusy =
    mpesaStatus === "initiating" ||
    mpesaStatus === "stk_sent" ||
    mpesaStatus === "waiting" ||
    mpesaStatus === "verifying";

  // Form State
  const [formData, setFormData] = useState({
    cafeName: "",
    ownerName: "",
    whatsappPhone: "",
    paymentPhone: "",
  });

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchStatus = async () => {
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    setFetchError(null);
    try {
      const res = await fetch("/api/cyber/user-status");
      if (!res.ok) {
        throw new Error(`Unable to load subscription status (${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setHasSubscription(data.hasSubscription);
        setIsActive(data.isActive);
        setDaysRemaining(data.daysRemaining || 0);
        setCafe(data.cafe);
        setInvoices(data.invoices || []);
        if (data.cafe) {
          setFormData((prev) => ({
            ...prev,
            cafeName: data.cafe.cafeName || "",
            ownerName: data.cafe.ownerName || "",
            whatsappPhone: data.cafe.whatsappPhone || "",
            paymentPhone: data.cafe.paymentPhone || "",
          }));
        }
      } else {
        setFetchError(data.error || "Unable to load subscription details.");
      }
    } catch (e: any) {
      setFetchError(e?.message || "Failed to load subscription status. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchStatus();
      // Pre-fill owner name and phone from Clerk profile if empty
      if (user) {
        setFormData((prev) => ({
          ...prev,
          ownerName: prev.ownerName || user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "",
          whatsappPhone: prev.whatsappPhone || user.phoneNumbers?.[0]?.phoneNumber || "",
          paymentPhone: prev.paymentPhone || user.phoneNumbers?.[0]?.phoneNumber || "",
        }));
      }
    } else if (isLoaded && !isSignedIn) {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, user]);

  const applyCyberStatusOutcome = async (data: any): Promise<boolean> => {
    if (data?.status === "success" || data?.verified || data?.resultCode === 0) {
      setConfirmedReceipt(data?.mpesaReceipt || pollingCheckoutId || "CONFIRMED");
      setMpesaStatus("success");
      setStatusError(null);
      setPollingCheckoutId(null);
      toast.success("Cyber Cafe Subscription Activated Successfully!");
      await fetchStatus();
      return true;
    }
    if (data?.status === "cancelled" || data?.resultCode === 1032) {
      setMpesaStatus("cancelled");
      setStatusError(
        data?.error ||
        data?.resultDesc ||
        "You cancelled the M-Pesa prompt on your phone (ResultCode 1032). No funds were deducted."
      );
      setPollingCheckoutId(null);
      return true;
    }
    if (data?.status === "timeout" || data?.resultCode === 1037) {
      setMpesaStatus("timeout");
      setStatusError(
        data?.error ||
        data?.resultDesc ||
        "The M-Pesa authorization request timed out on your handset."
      );
      setPollingCheckoutId(null);
      return true;
    }
    if (data?.status === "failed" || (typeof data?.resultCode === "number" && data.resultCode !== 0)) {
      setMpesaStatus("failed");
      setStatusError(
        data?.error ||
        data?.resultDesc ||
        "M-Pesa payment could not be completed. Confirm your balance and phone number."
      );
      setPollingCheckoutId(null);
      return true;
    }
    return false;
  };

  // Cleanup STK transition timeout on unmount
  useEffect(() => {
    return () => {
      if (stkTransitionRef.current) clearTimeout(stkTransitionRef.current);
    };
  }, []);

  // Handle Safaricom Daraja M-Pesa polling & countdown when waiting for STK confirmation
  useEffect(() => {
    if (!pollingCheckoutId) return;

    let remaining = 60;
    setSecondsLeft(60);

    const countdown = setInterval(() => {
      remaining -= 1;
      setSecondsLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(countdown);
        clearInterval(poller);
        setMpesaStatus((prev) => {
          if (prev === "success" || prev === "cancelled" || prev === "failed") return prev;
          return "timeout";
        });
        setStatusError(
          "Authorization timed out after 60 seconds. If you already entered your PIN and received an M-Pesa SMS, click Verify Now below."
        );
      }
    }, 1000);

    let pollInFlight = false;
    const poller = setInterval(async () => {
      if (pollInFlight) return;
      pollInFlight = true;
      try {
        const res = await fetch(`/api/mpesa/status/${pollingCheckoutId}`);
        const data = await res.json();
        await applyCyberStatusOutcome(data);
      } catch {
        // Continue polling on transient network error
      } finally {
        pollInFlight = false;
      }
    }, 1500);

    return () => {
      clearInterval(countdown);
      clearInterval(poller);
    };
  }, [pollingCheckoutId]);

  const handleManualVerify = async () => {
    if (!pollingCheckoutId) {
      toast.error("No active checkout request found.");
      return;
    }
    const previousState = mpesaStatus;
    setMpesaStatus("verifying");
    setStatusError(null);
    const toastId = toast.loading("Verifying payment with Safaricom Daraja...");
    try {
      const res = await fetch(`/api/mpesa/status/${pollingCheckoutId}`);
      const data = await res.json();
      toast.dismiss(toastId);
      const settled = await applyCyberStatusOutcome(data);
      if (!settled) {
        setMpesaStatus(previousState === "timeout" ? "timeout" : "waiting");
        const pendingMsg =
          data?.error ||
          "Payment has not settled yet. Confirm the M-Pesa PIN prompt on your phone and retry verification.";
        setStatusError(pendingMsg);
        toast(pendingMsg);
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      setMpesaStatus(previousState === "timeout" ? "timeout" : "waiting");
      toast.error(err?.message || "Failed to verify Daraja transaction.");
    }
  };

  const handleResetToForm = () => {
    if (stkTransitionRef.current) {
      clearTimeout(stkTransitionRef.current);
      stkTransitionRef.current = null;
    }
    setPollingCheckoutId(null);
    setMpesaStatus("ready");
    setStatusError(null);
    setSecondsLeft(60);
  };

  const handleSubscribeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isBusy) return;

    if (!formData.cafeName.trim() || !formData.ownerName.trim() || !formData.whatsappPhone.trim() || !formData.paymentPhone.trim()) {
      const msg = "Please fill in all cyber cafe registration fields.";
      setStatusError(msg);
      toast.error(msg);
      return;
    }

    const cleanPhone = formData.paymentPhone.replace(/[\s\-+()]/g, "");
    const validKenyan =
      /^(?:254|0)(?:7\d{8}|1\d{8})$/.test(cleanPhone) ||
      /^(?:7|1)\d{8}$/.test(cleanPhone);
    if (!validKenyan) {
      const msg = "Enter a valid Kenyan M-Pesa payment number (07XXXXXXXX or 01XXXXXXXX).";
      setStatusError(msg);
      toast.error(msg);
      return;
    }

    setMpesaStatus("initiating");
    setStatusError(null);
    setConfirmedReceipt(null);
    setPollingCheckoutId(null);

    try {
      const res = await fetch("/api/cyber/subscribe-web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Subscription STK initiation failed");
      }

      if ((data.gateway === "daraja" || data.gateway === "mpesa") && data.checkoutRequestId) {
        setPollingCheckoutId(data.checkoutRequestId);
        setMpesaStatus("stk_sent");
        toast.success("Safaricom M-Pesa STK Push sent. Enter your PIN on your phone.", { duration: 5000 });
        if (stkTransitionRef.current) clearTimeout(stkTransitionRef.current);
        stkTransitionRef.current = setTimeout(() => {
          setMpesaStatus((prev) => (prev === "stk_sent" ? "waiting" : prev));
        }, 1800);
      } else {
        throw new Error("Missing Safaricom Daraja CheckoutRequestID from server response.");
      }
    } catch (err: any) {
      setMpesaStatus("failed");
      setStatusError(err.message || "Failed to initiate Safaricom M-Pesa subscription.");
      toast.error(err.message || "Failed to initiate subscription.");
    }
  };

  // Only render for signed-in users per requirement
  if (!isLoaded || !isSignedIn) {
    return null;
  }

  if (loading) {
    return (
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-pulse flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="space-y-1 flex-1">
          <div className="h-4 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-3 w-1/2 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
        </div>
      </div>
    );
  }

  // Compact variant for above-the-fold embedding
  if (compact) {
    if (isActive && cafe) {
      return (
        <div className="w-full bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/40 rounded-2xl p-4 text-zinc-900 dark:text-zinc-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50">{cafe.cafeName}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white">
                  Active
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                  {daysRemaining} {daysRemaining === 1 ? "Day" : "Days"} Remaining
                </span>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-0.5 font-medium">
                Unlimited Instant Lookups Active · Zero download fees applied
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowModal(true)}
              className="h-8.5 px-3 text-xs font-bold border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Renew (+30 Days)
            </Button>
            {invoices.length > 0 && (
              <a
                href={`/api/cyber/invoice/${invoices[0].id}`}
                target="_blank"
                rel="noreferrer"
                className="h-8.5 px-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                title="Download Fiscal Tax Invoice PDF"
              >
                <FileText className="w-3.5 h-3.5 mr-1 text-red-600" />
                Invoice
              </a>
            )}
          </div>
          {renderSubscribeModal()}
        </div>
      );
    }

    return (
      <div className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-on-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-on-surface">Cyber Cafe Monthly Pass</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-primary/10 text-primary border border-primary/20">
                KES 500/mo
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Up to 50 daily downloads, instant ID lookups with zero per-retrieval fees, and official Tax Invoices.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setShowModal(true)}
          className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold shrink-0 flex items-center gap-1.5"
        >
          <span>Activate Plan</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
        {renderSubscribeModal()}
      </div>
    );
  }

  // Full Dashboard card variant
  return (
    <div className="w-full rounded-xl bg-surface-container-lowest border border-outline-variant overflow-hidden">
      {/* Top Banner Header */}
      <div className="p-5 sm:p-6 border-b border-outline-variant bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-primary text-white shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-bold text-base sm:text-lg text-on-surface">
                {cafe ? cafe.cafeName : "Cyber Cafe Monthly Subscription"}
              </h3>
              {isActive ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-600 text-white">
                  Active
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-surface-container text-on-surface-variant border border-outline-variant">
                  Not Subscribed
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              KES 500 / Month · Up to 50 daily KRA PIN lookups, zero per-certificate fees &amp; WhatsApp integration
            </p>
          </div>
        </div>

        <Button
          onClick={() => setShowModal(true)}
          className="h-10 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold shrink-0 flex items-center gap-2 self-start sm:self-auto"
        >
          {isActive ? (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Renew Subscription</span>
            </>
          ) : (
            <>
              <span>Subscribe for KES 500</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </Button>
      </div>

      {/* Main Content Body */}
      <div className="p-5 sm:p-6 space-y-6">
        {isActive && cafe ? (
          <>
            {/* Days Remaining Highlight Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Days Remaining</span>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="text-3xl font-black text-emerald-900 dark:text-emerald-100">
                  {daysRemaining} <span className="text-sm font-semibold">days</span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                  Expires on: {new Date(cafe.expiresAt).toLocaleDateString()}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">WhatsApp Line</span>
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-black text-zinc-900 dark:text-zinc-100 font-mono">
                  {cafe.whatsappPhone}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Authorized for zero-click lookups
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Certificates</span>
                  <ShieldCheck className="w-4 h-4 text-red-600" />
                </div>
                <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                  {cafe.totalDownloads}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Today: {cafe.dailyDownloads} / 100 quota
                </p>
              </div>
            </div>

            {/* Invoices List */}
            {invoices.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Official Fiscal Tax Invoices (16% VAT)
                  </h4>
                  <span className="text-xs text-zinc-500">{invoices.length} Issued</span>
                </div>
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                  {invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 sm:px-4 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-red-600 shrink-0" />
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono block">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            {new Date(inv.createdAt).toLocaleDateString()} · Receipt: {inv.mpesaReceipt || "M-PESA"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">KES {inv.amount}</span>
                        <a
                          href={`/api/cyber/invoice/${inv.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-red-50 hover:text-red-600 transition-colors font-medium flex items-center gap-1"
                        >
                          <span>PDF</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Feature Callout when Not Subscribed */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-wider">
                  <Zap className="w-4 h-4" />
                  <span>Unlimited Lookups</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Retrieve hundreds of KRA PIN certificates every month without paying KES 20 each time.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                  <Smartphone className="w-4 h-4" />
                  <span>Dual Web + WhatsApp</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Simply text client ID numbers on WhatsApp or use this website portal for instant PDFs.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
                  <FileText className="w-4 h-4" />
                  <span>Official Fiscal Invoices</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Receive verifiable KRA-compliant 16% VAT Tax Invoices for business expense filing.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Button
                onClick={() => setShowModal(true)}
                className="w-full sm:w-auto h-11 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2"
              >
                <span>Activate Cyber Cafe Plan (KES 500)</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
              <span className="text-xs text-zinc-500">
                Instant activation · Direct Safaricom M-Pesa Express (STK Push)
              </span>
            </div>
          </div>
        )}
      </div>

      {renderSubscribeModal()}
    </div>
  );

  function renderSubscribeModal() {
    if (!showModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
        <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 sm:p-7 space-y-5 text-zinc-900 dark:text-zinc-100 my-auto">
          {/* Close button */}
          <button
            type="button"
            onClick={() => {
              if (!isBusy) {
                setShowModal(false);
                handleResetToForm();
              }
            }}
            disabled={isBusy}
            aria-label="Close subscription modal"
            className="absolute top-5 right-5 p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="space-y-1.5 pr-8">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 text-[10px] font-black uppercase tracking-wider">
              <Building2 className="w-3 h-3" />
              Cyber Cafe 30-Day Pass
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {isActive ? "Renew Cyber Subscription" : "Register Cyber Cafe Subscription"}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">KES 500.00</span> for 30 Days of Unlimited Certificate Downloads · Official 16% VAT Invoice included
            </p>
          </div>

          {/* Sole Payment Gateway Banner */}
          <div className="rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-500/30 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">
                  Safaricom M-Pesa Express (STK Push)
                </p>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Sole Active Gateway · Paybill <span className="font-mono font-bold">9914132</span>
                </p>
              </div>
            </div>
            <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-300 shrink-0 tabular-nums">
              KES 500.00
            </span>
          </div>

          {/* STATE: READY FORM */}
          {mpesaStatus === "ready" && (
            <form onSubmit={handleSubscribeSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Cyber Cafe Business Name</Label>
                <Input
                  value={formData.cafeName}
                  onChange={(e) => setFormData({ ...formData, cafeName: e.target.value })}
                  placeholder="e.g. SpeedNet Cyber Services"
                  required
                  className="h-11 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Owner / Manager Name</Label>
                <Input
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  placeholder="e.g. John Mwangi"
                  required
                  className="h-11 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    WhatsApp Number (Lookups)
                  </Label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={formData.whatsappPhone}
                    onChange={(e) => setFormData({ ...formData, whatsappPhone: e.target.value })}
                    placeholder="e.g. 0712345678"
                    required
                    className="h-11 text-xs font-mono rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    M-Pesa Payment Number
                  </Label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={formData.paymentPhone}
                    onChange={(e) => {
                      setFormData({ ...formData, paymentPhone: e.target.value });
                      setStatusError(null);
                    }}
                    placeholder="07XXXXXXXX or 01XXXXXXXX"
                    required
                    className="h-11 text-xs font-mono rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 p-3 text-[11px] text-zinc-600 dark:text-zinc-400">
                An M-Pesa STK Push for <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">KES 500.00</span> will be sent directly to your phone. Enter your M-Pesa PIN to activate instant unlimited access.
              </div>

              {statusError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-300 text-xs font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{statusError}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isBusy}
                className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>Send KES 500 M-Pesa STK Prompt</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          {/* STATE: INITIATING */}
          {mpesaStatus === "initiating" && (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-red-600/10 text-red-600 flex items-center justify-center mx-auto">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
                  Connecting to Safaricom Daraja Gateway...
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Dispatching KES 500.00 STK Push to <span className="font-mono font-bold">{formData.paymentPhone}</span>.
                </p>
              </div>
            </div>
          )}

          {/* STATE: STK SENT */}
          {mpesaStatus === "stk_sent" && (
            <div className="py-5 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
                  M-Pesa STK Prompt Sent to {formData.paymentPhone}
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Check your handset screen now for the Lipa na M-Pesa dialog.
                </p>
              </div>
            </div>
          )}

          {/* STATE: WAITING FOR PIN AUTHORIZATION */}
          {mpesaStatus === "waiting" && (
            <div className="py-4 px-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-center space-y-4">
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Awaiting M-Pesa PIN · {secondsLeft}s</span>
                </span>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
                  Enter Your M-Pesa PIN on {formData.paymentPhone}
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Authorize <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">KES 500.00</span> (Paybill <span className="font-mono font-bold">9914132</span>). Your subscription activates automatically once Safaricom confirms settlement.
                </p>
              </div>

              {statusError && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs">
                  {statusError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  onClick={handleManualVerify}
                  className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Verify Payment Now
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetToForm}
                  className="h-11 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Change Number
                </Button>
              </div>
            </div>
          )}

          {/* STATE: VERIFYING */}
          {mpesaStatus === "verifying" && (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-red-600/10 text-red-600 flex items-center justify-center mx-auto">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
                  Verifying Transaction with Safaricom Daraja...
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Checking callback confirmation for Checkout ID{" "}
                  <span className="font-mono">{pollingCheckoutId}</span>.
                </p>
              </div>
            </div>
          )}

          {/* STATE: SUCCESS */}
          {mpesaStatus === "success" && (
            <div className="py-4 px-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-50">
                  Cyber Cafe Subscription Active
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Receipt <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{confirmedReceipt}</span> verified. Unlimited 30-day KRA PIN lookups are now unlocked.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  handleResetToForm();
                }}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
              >
                Done
              </Button>
            </div>
          )}

          {/* STATE: CANCELLED */}
          {mpesaStatus === "cancelled" && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
                    M-Pesa Prompt Cancelled
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                    {statusError || "You dismissed the M-Pesa prompt on your handset. No funds were deducted."}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  onClick={() => handleSubscribeSubmit()}
                  className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Resend STK Prompt
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetToForm}
                  className="h-11 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Edit Details
                </Button>
              </div>
            </div>
          )}

          {/* STATE: TIMEOUT */}
          {mpesaStatus === "timeout" && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-start gap-2.5">
                <Clock className="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
                    M-Pesa Authorization Timed Out
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                    {statusError || "The M-Pesa prompt expired before confirmation. If you entered your PIN, click Verify Now."}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {pollingCheckoutId && (
                  <Button
                    type="button"
                    onClick={handleManualVerify}
                    className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Verify Now
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => handleSubscribeSubmit()}
                  className="flex-1 h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Resend STK Prompt
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetToForm}
                  className="h-11 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Edit Phone
                </Button>
              </div>
            </div>
          )}

          {/* STATE: FAILED */}
          {mpesaStatus === "failed" && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-red-700 dark:text-red-300">
                    M-Pesa Payment Failed
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                    {statusError || "Unable to complete payment. Please verify your M-Pesa balance and phone number."}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  onClick={() => handleSubscribeSubmit()}
                  className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Retry Payment
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetToForm}
                  className="h-11 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Edit Details
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}
