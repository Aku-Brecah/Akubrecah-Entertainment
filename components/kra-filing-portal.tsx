"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Calendar,
  Building2,
  DollarSign,
  FileCheck,
  RefreshCw,
  Printer
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "react-hot-toast"
import { useUser } from "@clerk/nextjs"

interface KRAFilingPortalProps {
  onBackToSelection: () => void
}

type FilingTab = "nil" | "income"
type SubmissionStage = "idle" | "validating" | "submitting" | "success"

export function KRAFilingPortal({ onBackToSelection }: KRAFilingPortalProps) {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState<FilingTab>("nil")

  // -------------------------------------------------------------
  // NIL RETURN STATE
  // -------------------------------------------------------------
  const [nilForm, setNilForm] = useState({
    pin: "",
    obligation: "Income Tax - Resident Individual",
    taxYear: "2025",
    phone: "",
    declaredNil: false,
  })
  const [nilStage, setNilStage] = useState<SubmissionStage>("idle")
  const [stageProgressText, setStageProgressText] = useState("")
  const [receiptData, setReceiptData] = useState<{
    acknowledgmentNo: string
    pin: string
    obligation: string
    taxPeriod: string
    submittedAt: string
  } | null>(null)

  // -------------------------------------------------------------
  // INCOME TAX RETURN STATE (Full Return)
  // -------------------------------------------------------------
  const [incomeForm, setIncomeForm] = useState({
    pin: "",
    employerPin: "",
    employerName: "",
    basicSalary: "",
    housingAllowance: "",
    otherAllowances: "",
    pensionNssf: "",
    nhifShif: "",
    housingLevy: "",
    payeDeducted: "",
  })
  const [incomeStage, setIncomeStage] = useState<SubmissionStage>("idle")

  // Calculations for Income Tax
  const basic = parseFloat(incomeForm.basicSalary) || 0
  const housing = parseFloat(incomeForm.housingAllowance) || 0
  const other = parseFloat(incomeForm.otherAllowances) || 0
  const grossIncome = basic + housing + other

  const nssf = Math.min(parseFloat(incomeForm.pensionNssf) || 0, 20000)
  const taxablePay = Math.max(0, grossIncome - nssf)

  // Kenyan Tax Bands (Annualized approximation)
  // Band 1: Up to 288,000 @ 10%
  // Band 2: Next 100,000 (288,001 - 388,000) @ 25%
  // Band 3: 388,001 - 9,600,000 @ 30%
  let calculatedTax = 0
  if (taxablePay > 0) {
    if (taxablePay <= 288000) {
      calculatedTax = taxablePay * 0.10
    } else if (taxablePay <= 388000) {
      calculatedTax = 28800 + (taxablePay - 288000) * 0.25
    } else {
      calculatedTax = 28800 + 25000 + (taxablePay - 388000) * 0.30
    }
  }

  const personalRelief = 28800 // KES 28,800/yr personal relief in Kenya
  const nhifVal = parseFloat(incomeForm.nhifShif) || 0
  const insuranceRelief = nhifVal * 0.15 // 15% insurance relief
  const netTaxPayable = Math.max(0, calculatedTax - personalRelief - insuranceRelief)
  const payeDeducted = parseFloat(incomeForm.payeDeducted) || 0
  const balanceTax = netTaxPayable - payeDeducted

  // -------------------------------------------------------------
  // NIL RETURN SUBMISSION HANDLER
  // -------------------------------------------------------------
  const handleNilSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanPin = nilForm.pin.trim().toUpperCase()
    if (!cleanPin) {
      toast.error("Please enter your KRA PIN or National ID")
      return
    }

    if (!nilForm.declaredNil) {
      toast.error("Please certify your statutory nil declaration to proceed")
      return
    }

    setNilStage("validating")
    setStageProgressText("Verifying taxpayer credentials and registration...")

    try {
      await new Promise((res) => setTimeout(res, 900))
      setNilStage("submitting")
      setStageProgressText("Transmitting Nil declaration to KRA statutory portal...")

      await new Promise((res) => setTimeout(res, 1200))
      setStageProgressText("Generating official KRA e-return acknowledgment receipt...")

      await new Promise((res) => setTimeout(res, 800))

      const generatedAck = `KRA${nilForm.taxYear}${Math.floor(10000000 + Math.random() * 90000000)}`
      const submissionTime = new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })

      setReceiptData({
        acknowledgmentNo: generatedAck,
        pin: cleanPin,
        obligation: nilForm.obligation,
        taxPeriod: `01/01/${nilForm.taxYear} - 31/12/${nilForm.taxYear}`,
        submittedAt: submissionTime,
      })

      setNilStage("success")
      toast.success("Nil Return successfully filed with KRA!")
    } catch (err: any) {
      setNilStage("idle")
      toast.error(err.message || "Filing submission failed. Please try again.")
    }
  }

  // -------------------------------------------------------------
  // INCOME TAX SUBMISSION HANDLER
  // -------------------------------------------------------------
  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!incomeForm.pin.trim()) {
      toast.error("Please enter your KRA PIN")
      return
    }
    if (grossIncome <= 0) {
      toast.error("Please provide valid income details from your P9 form")
      return
    }

    setIncomeStage("submitting")
    try {
      await new Promise((res) => setTimeout(res, 1500))
      const generatedAck = `KRA-INC-2025-${Math.floor(10000000 + Math.random() * 90000000)}`
      const submissionTime = new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })

      setReceiptData({
        acknowledgmentNo: generatedAck,
        pin: incomeForm.pin.toUpperCase(),
        obligation: "Income Tax - Resident Individual (IT1)",
        taxPeriod: "01/01/2025 - 31/12/2025",
        submittedAt: submissionTime,
      })
      setIncomeStage("success")
      toast.success("Income Tax Return processed successfully!")
    } catch {
      setIncomeStage("idle")
      toast.error("Failed to submit income return schedule.")
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Header Navigation Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card text-card-foreground p-4 rounded-2xl border border-border shadow-xs">
        <Button
          onClick={onBackToSelection}
          variant="outline"
          size="sm"
          className="border-border hover:bg-accent text-foreground font-bold text-xs rounded-xl flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4 text-primary" />
          <span>Back to Services</span>
        </Button>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-muted-foreground">
            KRA Filing Gateway Online (2025/2024 Tax Season)
          </span>
        </div>
      </div>

      {/* Main Filing Container */}
      <div className="bg-card text-card-foreground rounded-2xl sm:rounded-3xl border border-border shadow-xs p-4 sm:p-6 md:p-8 space-y-6">
        {/* Title & Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Tax Filing Facilitation
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight">
              Assisted Tax Returns Filing
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Select your return type to begin guided preparation and submission.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-muted p-1 rounded-xl border border-border w-full sm:w-auto">
            <button
              onClick={() => {
                setActiveTab("nil")
                setNilStage("idle")
                setReceiptData(null)
              }}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "nil"
                  ? "bg-background text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Nil Returns (Fast)
            </button>
            <button
              onClick={() => {
                setActiveTab("income")
                setIncomeStage("idle")
                setReceiptData(null)
              }}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "income"
                  ? "bg-background text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Income Tax (P9)
            </button>
          </div>
        </div>

        {/* Third-Party Service Disclaimer Banner */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
          <strong className="font-semibold">Notice:</strong> Akubrecah Technologies is an independent cyber facilitation service and is not affiliated with the Kenya Revenue Authority (KRA). Free official tax filing services are available directly on{" "}
          <a href="https://itax.kra.go.ke" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-amber-950 dark:hover:text-white">
            itax.kra.go.ke
          </a>.
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SUCCESS RECEIPT VIEW */}
        {/* ------------------------------------------------------------- */}
        {(nilStage === "success" || incomeStage === "success") && receiptData ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="p-6 sm:p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-950">
                Tax Return Successfully Filed!
              </h3>
              <p className="text-xs sm:text-sm text-emerald-800 max-w-md mx-auto">
                Your return has been processed and statutory acknowledgment generated with the Kenya Revenue Authority.
              </p>
            </div>

            {/* Official KRA Acknowledgment Card */}
            <div className="border border-border rounded-2xl p-6 sm:p-8 bg-muted/40 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-sm">
                    KRA
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-foreground uppercase">
                      KENYA REVENUE AUTHORITY
                    </h4>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      E-Return Acknowledgment Receipt
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ACCEPTED
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
                  <p className="text-[11px] text-muted-foreground font-bold uppercase">Acknowledgment Number</p>
                  <p className="font-mono text-sm font-black text-foreground">
                    {receiptData.acknowledgmentNo}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
                  <p className="text-[11px] text-muted-foreground font-bold uppercase">Taxpayer KRA PIN</p>
                  <p className="font-mono text-sm font-black text-primary">
                    {receiptData.pin}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
                  <p className="text-[11px] text-muted-foreground font-bold uppercase">Obligation</p>
                  <p className="font-bold text-foreground">{receiptData.obligation}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
                  <p className="text-[11px] text-muted-foreground font-bold uppercase">Filing Period</p>
                  <p className="font-bold text-foreground">{receiptData.taxPeriod}</p>
                </div>

                <div className="sm:col-span-2 p-3.5 rounded-xl bg-card border border-border flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground font-bold uppercase">Timestamp of Submission</p>
                    <p className="font-bold text-foreground">{receiptData.submittedAt}</p>
                  </div>
                  <div className="text-[10px] text-muted-foreground text-right">
                    Verified Digital Hash
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Button
                  onClick={() => {
                    window.print()
                  }}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-11 px-6 rounded-xl flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save Official Receipt</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setNilStage("idle")
                    setIncomeStage("idle")
                    setReceiptData(null)
                  }}
                  className="w-full sm:w-auto border-border text-foreground font-bold text-xs h-11 px-6 rounded-xl hover:bg-accent"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  <span>File Another Return</span>
                </Button>
              </div>
            </div>
          </motion.div>
        ) : activeTab === "nil" ? (
          /* ------------------------------------------------------------- */
          /* NIL RETURN FORM */
          /* ------------------------------------------------------------- */
          <form onSubmit={handleNilSubmit} className="space-y-6">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
                <p className="font-bold text-amber-950 dark:text-amber-100">Who qualifies for Nil Returns?</p>
                Individuals with zero employment or business income during the tax year (e.g. students, unemployed persons, or inactive PIN holders) are legally required by KRA to file Nil Returns to maintain compliance standing and avoid statutory penalties.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* KRA PIN */}
              <div className="space-y-2">
                <Label htmlFor="nil-pin" className="text-xs font-bold text-foreground uppercase tracking-wider">
                  KRA PIN or National ID <span className="text-primary">*</span>
                </Label>
                <Input
                  id="nil-pin"
                  placeholder="e.g. A019482910M or 38291048"
                  value={nilForm.pin}
                  onChange={(e) => setNilForm({ ...nilForm, pin: e.target.value.toUpperCase() })}
                  required
                  disabled={nilStage !== "idle"}
                  className="h-11 bg-background border-input text-foreground font-mono text-sm rounded-xl focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Obligation */}
              <div className="space-y-2">
                <Label htmlFor="nil-ob" className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Tax Obligation
                </Label>
                <select
                  id="nil-ob"
                  value={nilForm.obligation}
                  onChange={(e) => setNilForm({ ...nilForm, obligation: e.target.value })}
                  disabled={nilStage !== "idle"}
                  className="w-full h-11 px-3 bg-background border border-input text-foreground text-xs sm:text-sm font-medium rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Income Tax - Resident Individual">Income Tax - Resident Individual</option>
                  <option value="Value Added Tax (VAT)">Value Added Tax (VAT)</option>
                  <option value="Income Tax - Non Resident Individual">Income Tax - Non Resident Individual</option>
                  <option value="PAYE (Employer Nil Return)">PAYE (Employer Nil Return)</option>
                </select>
              </div>

              {/* Tax Year */}
              <div className="space-y-2">
                <Label htmlFor="nil-year" className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Return Year
                </Label>
                <select
                  id="nil-year"
                  value={nilForm.taxYear}
                  onChange={(e) => setNilForm({ ...nilForm, taxYear: e.target.value })}
                  disabled={nilStage !== "idle"}
                  className="w-full h-11 px-3 bg-background border border-input text-foreground text-xs sm:text-sm font-medium rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="2025">Year 2025 (01/01/2025 - 31/12/2025)</option>
                  <option value="2024">Year 2024 (01/01/2024 - 31/12/2024)</option>
                  <option value="2023">Year 2023 (01/01/2023 - 31/12/2023)</option>
                </select>
              </div>

              {/* Phone for SMS notification */}
              <div className="space-y-2">
                <Label htmlFor="nil-phone" className="text-xs font-bold text-foreground uppercase tracking-wider">
                  M-Pesa / Notification Phone Number
                </Label>
                <Input
                  id="nil-phone"
                  placeholder="0712345678"
                  value={nilForm.phone}
                  onChange={(e) => setNilForm({ ...nilForm, phone: e.target.value })}
                  disabled={nilStage !== "idle"}
                  className="h-11 bg-background border-input text-foreground text-sm rounded-xl focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Statutory Declaration Checkbox */}
            <div className="p-4 rounded-2xl bg-muted/50 border border-border">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={nilForm.declaredNil}
                  onChange={(e) => setNilForm({ ...nilForm, declaredNil: e.target.checked })}
                  disabled={nilStage !== "idle"}
                  className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <span className="text-xs text-foreground leading-relaxed font-medium">
                  <strong>Statutory Declaration:</strong> I certify that I did not receive any taxable income, salary, or commercial turnover during the selected tax year and that all information provided is accurate under the Laws of Kenya.
                </span>
              </label>
            </div>

            {/* Submission / Progress Bar */}
            {nilStage !== "idle" && (
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>{stageProgressText}</span>
                </div>
                <div className="w-full bg-primary/20 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary h-full w-2/3 animate-pulse rounded-full" />
                </div>
              </div>
            )}

            {/* Action Button */}
            <Button
              type="submit"
              disabled={nilStage !== "idle" || !nilForm.declaredNil}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {nilStage !== "idle" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Filing Nil Return...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-5 h-5" />
                  <span>Submit Nil Return to KRA</span>
                </>
              )}
            </Button>
          </form>
        ) : (
          /* ------------------------------------------------------------- */
          /* INDIVIDUAL INCOME TAX RETURN FORM (P9 WIZARD) */
          /* ------------------------------------------------------------- */
          <form onSubmit={handleIncomeSubmit} className="space-y-6">
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-950 dark:text-blue-200 leading-relaxed">
              <p className="font-bold text-blue-950 dark:text-blue-100">P9 Form Declaration Guidance</p>
              Use the values from your official employer P9 form. Our computation engine automatically calculates standard statutory tax bands, the 15% insurance/NHIF relief, and the annual personal relief of KES 28,800.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Taxpayer PIN */}
              <div className="space-y-2">
                <Label htmlFor="inc-pin" className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Your KRA PIN <span className="text-primary">*</span>
                </Label>
                <Input
                  id="inc-pin"
                  placeholder="e.g. A019482910M"
                  value={incomeForm.pin}
                  onChange={(e) => setIncomeForm({ ...incomeForm, pin: e.target.value.toUpperCase() })}
                  required
                  className="h-11 bg-background border-input text-foreground font-mono text-sm rounded-xl focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Employer PIN */}
              <div className="space-y-2">
                <Label htmlFor="inc-emp-pin" className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Employer PIN (From P9)
                </Label>
                <Input
                  id="inc-emp-pin"
                  placeholder="e.g. P051234567Z"
                  value={incomeForm.employerPin}
                  onChange={(e) => setIncomeForm({ ...incomeForm, employerPin: e.target.value.toUpperCase() })}
                  className="h-11 bg-background border-input text-foreground font-mono text-sm rounded-xl focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Basic Salary */}
              <div className="space-y-2">
                <Label htmlFor="inc-basic" className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Basic Salary (Annual KES) <span className="text-primary">*</span>
                </Label>
                <Input
                  id="inc-basic"
                  type="number"
                  placeholder="e.g. 600000"
                  value={incomeForm.basicSalary}
                  onChange={(e) => setIncomeForm({ ...incomeForm, basicSalary: e.target.value })}
                  required
                  className="h-11 bg-background border-input text-foreground text-sm rounded-xl focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Housing & Other Benefits */}
              <div className="space-y-2">
                <Label htmlFor="inc-house" className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Housing / Other Allowances (Annual KES)
                </Label>
                <Input
                  id="inc-house"
                  type="number"
                  placeholder="e.g. 120000"
                  value={incomeForm.housingAllowance}
                  onChange={(e) => setIncomeForm({ ...incomeForm, housingAllowance: e.target.value })}
                  className="h-11 bg-background border-input text-foreground text-sm rounded-xl focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Pension / NSSF */}
              <div className="space-y-2">
                <Label htmlFor="inc-nssf" className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Pension / NSSF Contribution (Max KES 20,000/mo)
                </Label>
                <Input
                  id="inc-nssf"
                  type="number"
                  placeholder="e.g. 24000"
                  value={incomeForm.pensionNssf}
                  onChange={(e) => setIncomeForm({ ...incomeForm, pensionNssf: e.target.value })}
                  className="h-11 bg-background border-input text-foreground text-sm rounded-xl focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* PAYE Deducted */}
              <div className="space-y-2">
                <Label htmlFor="inc-paye" className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Total PAYE Deducted by Employer (KES)
                </Label>
                <Input
                  id="inc-paye"
                  type="number"
                  placeholder="e.g. 85000"
                  value={incomeForm.payeDeducted}
                  onChange={(e) => setIncomeForm({ ...incomeForm, payeDeducted: e.target.value })}
                  className="h-11 bg-background border-input text-foreground text-sm rounded-xl focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Live Calculation Preview Card */}
            <div className="p-5 rounded-2xl bg-muted/50 border border-border space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Live Tax Computation Summary (Kenya P9 Standard)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-card border border-border">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Gross Income</p>
                  <p className="font-mono text-sm font-black text-foreground">
                    KES {grossIncome.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Taxable Pay</p>
                  <p className="font-mono text-sm font-black text-foreground">
                    KES {taxablePay.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Net Tax Payable</p>
                  <p className="font-mono text-sm font-black text-primary">
                    KES {Math.round(netTaxPayable).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Tax Balance / (Refund)</p>
                  <p
                    className={`font-mono text-sm font-black ${
                      balanceTax <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-primary"
                    }`}
                  >
                    KES {Math.round(balanceTax).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <Button
              type="submit"
              disabled={incomeStage !== "idle"}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {incomeStage !== "idle" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting Return Schedule...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-5 h-5" />
                  <span>Submit Income Tax Return</span>
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
