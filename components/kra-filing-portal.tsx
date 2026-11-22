"use client"

import React, { useState } from "react"
import {
  FileSpreadsheet,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Calculator,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface KRAFilingPortalProps {
  onBackToSelection: () => void
}

type FilingTab = "nil" | "income"

export function KRAFilingPortal({ onBackToSelection }: KRAFilingPortalProps) {
  const [activeTab, setActiveTab] = useState<FilingTab>("income")

  // -------------------------------------------------------------
  // INCOME TAX ESTIMATOR STATE (P9 Computation Reference)
  // -------------------------------------------------------------
  const [incomeForm, setIncomeForm] = useState({
    basicSalary: "",
    housingAllowance: "",
    otherAllowances: "",
    pensionNssf: "",
    nhifShif: "",
    payeDeducted: "",
  })

  // Annual Kenyan Income Tax Bands (KRA Finance Act 2023/2024 statutory reference)
  const basic = Math.max(0, parseFloat(incomeForm.basicSalary) || 0)
  const housing = Math.max(0, parseFloat(incomeForm.housingAllowance) || 0)
  const other = Math.max(0, parseFloat(incomeForm.otherAllowances) || 0)
  const grossIncome = basic + housing + other

  // Statutory pension/NSSF annual deduction cap: KES 20,000/month = KES 240,000/year
  const nssf = Math.min(Math.max(0, parseFloat(incomeForm.pensionNssf) || 0), 240000)
  const taxablePay = Math.max(0, grossIncome - nssf)

  let calculatedTax = 0
  if (taxablePay > 0) {
    if (taxablePay <= 288000) {
      calculatedTax = taxablePay * 0.10
    } else if (taxablePay <= 388000) {
      calculatedTax = 28800 + (taxablePay - 288000) * 0.25
    } else if (taxablePay <= 6000000) {
      calculatedTax = 28800 + 25000 + (taxablePay - 388000) * 0.30
    } else if (taxablePay <= 9600000) {
      calculatedTax = 28800 + 25000 + (6000000 - 388000) * 0.30 + (taxablePay - 6000000) * 0.325
    } else {
      calculatedTax =
        28800 +
        25000 +
        (6000000 - 388000) * 0.30 +
        (9600000 - 6000000) * 0.325 +
        (taxablePay - 9600000) * 0.35
    }
  }

  const personalRelief = grossIncome > 0 ? 28800 : 0 // KES 28,800/yr personal relief
  const nhifVal = Math.max(0, parseFloat(incomeForm.nhifShif) || 0)
  const insuranceRelief = Math.min(nhifVal * 0.15, 60000) // 15% capped at KES 60,000/yr
  const netTaxPayable = Math.max(0, calculatedTax - personalRelief - insuranceRelief)
  const payeDeducted = Math.max(0, parseFloat(incomeForm.payeDeducted) || 0)
  const balanceTax = netTaxPayable - payeDeducted

  return (
    <div className="w-full max-w-none mx-auto space-y-5">
      {/* Top Header Navigation Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-lowest text-on-surface p-4 rounded-xl border border-outline-variant">
        <Button
          onClick={onBackToSelection}
          variant="outline"
          size="sm"
          className="border-outline-variant hover:bg-surface-container text-on-surface font-semibold text-xs rounded-lg flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4 text-primary" />
          <span>Back to Retrieval</span>
        </Button>

        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            Reference Tax Calculator &amp; Official iTax Guide
          </span>
        </div>
      </div>

      {/* Main Filing Container */}
      <div className="bg-surface-container-lowest text-on-surface rounded-xl border border-outline-variant p-5 sm:p-6 md:p-8 space-y-6">
        {/* Title & Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-outline-variant">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Calculator className="w-3.5 h-3.5" />
              <span>Tax Computation Tool &amp; iTax Filing Guide</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
              Kenya Income Tax Calculator &amp; Nil Returns Guide
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant">
              Compute your annual PAYE / IT1 liability from your P9 form before filing directly on the official KRA iTax portal.
            </p>
          </div>

          <div className="flex items-center bg-surface-container-low p-1 rounded-lg border border-outline-variant w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("income")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "income"
                  ? "bg-surface-container-lowest text-on-surface border border-outline-variant"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              P9 Tax Calculator
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("nil")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "nil"
                  ? "bg-surface-container-lowest text-on-surface border border-outline-variant"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Nil Returns Info
            </button>
          </div>
        </div>

        {/* Official Filing Notice */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs leading-relaxed space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-bold text-foreground">Direct iTax Submission Unavailable</span>
          </div>
          <p>
            Automated tax return submission is not enabled in this portal so that no unverified or simulated receipts are ever issued. Use the calculator below to verify your figures, then submit your official return directly on{" "}
            <a
              href="https://itax.kra.go.ke"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-bold text-amber-900 dark:text-amber-100 hover:text-foreground inline-flex items-center gap-0.5"
            >
              itax.kra.go.ke <ExternalLink className="w-3 h-3" />
            </a>.
          </p>
        </div>

        {activeTab === "nil" ? (
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-muted/40 border border-border space-y-3 text-sm text-foreground">
              <h3 className="font-bold text-base">Who qualifies for KRA Nil Returns?</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Individuals with zero employment, business, or rental income during the calendar tax year (such as students, unemployed citizens, or inactive PIN holders) are required to file an annual Nil Return on KRA iTax between 1 January and 30 June to avoid late-filing penalties.
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm text-muted-foreground pt-2">
                <li>Open the official KRA iTax portal and sign in with your KRA PIN and password.</li>
                <li>Navigate to <strong className="text-foreground">Returns &rarr; File Nil Return</strong>.</li>
                <li>Select your Tax Obligation (e.g. <em>Income Tax - Resident Individual</em>) and click Next.</li>
                <li>Confirm the return period, submit, and download your official KRA e-Return Acknowledgment Receipt.</li>
              </ol>
            </div>

            <a
              href="https://itax.kra.go.ke/KRA-Portal/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>File Official Nil Return on KRA iTax</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="inc-basic" className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Basic Salary (Annual KES)
                </Label>
                <Input
                  id="inc-basic"
                  type="number"
                  min={0}
                  placeholder="e.g. 600000"
                  value={incomeForm.basicSalary}
                  onChange={(e) => setIncomeForm({ ...incomeForm, basicSalary: e.target.value })}
                  className="h-11 bg-background border-input text-foreground text-sm rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inc-house" className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Housing / Other Allowances (Annual KES)
                </Label>
                <Input
                  id="inc-house"
                  type="number"
                  min={0}
                  placeholder="e.g. 120000"
                  value={incomeForm.housingAllowance}
                  onChange={(e) => setIncomeForm({ ...incomeForm, housingAllowance: e.target.value })}
                  className="h-11 bg-background border-input text-foreground text-sm rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inc-nssf" className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Pension / NSSF Contribution (Annual KES, capped at 240,000)
                </Label>
                <Input
                  id="inc-nssf"
                  type="number"
                  min={0}
                  placeholder="e.g. 24000"
                  value={incomeForm.pensionNssf}
                  onChange={(e) => setIncomeForm({ ...incomeForm, pensionNssf: e.target.value })}
                  className="h-11 bg-background border-input text-foreground text-sm rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inc-nhif" className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Insurance / NHIF / SHIF Premiums (Annual KES)
                </Label>
                <Input
                  id="inc-nhif"
                  type="number"
                  min={0}
                  placeholder="e.g. 18000"
                  value={incomeForm.nhifShif}
                  onChange={(e) => setIncomeForm({ ...incomeForm, nhifShif: e.target.value })}
                  className="h-11 bg-background border-input text-foreground text-sm rounded-xl"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="inc-paye" className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Total PAYE Already Deducted by Employer (Annual KES)
                </Label>
                <Input
                  id="inc-paye"
                  type="number"
                  min={0}
                  placeholder="e.g. 85000"
                  value={incomeForm.payeDeducted}
                  onChange={(e) => setIncomeForm({ ...incomeForm, payeDeducted: e.target.value })}
                  className="h-11 bg-background border-input text-foreground text-sm rounded-xl"
                />
              </div>
            </div>

            {/* Live Calculation Preview Card */}
            <div className="p-5 rounded-2xl bg-muted/50 border border-border space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Estimated Annual Tax Computation (Reference Only)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-card border border-border">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Gross Income</p>
                  <p className="font-mono text-sm font-black text-foreground">
                    KES {Math.round(grossIncome).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Taxable Pay</p>
                  <p className="font-mono text-sm font-black text-foreground">
                    KES {Math.round(taxablePay).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Net Tax Payable</p>
                  <p className="font-mono text-sm font-black text-primary">
                    KES {Math.round(netTaxPayable).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Balance / (Refund)</p>
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

            <a
              href="https://itax.kra.go.ke/KRA-Portal/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>File Official IT1 Return on KRA iTax</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
