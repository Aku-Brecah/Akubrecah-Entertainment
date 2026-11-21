"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Send, MapPin, Mail, Clock, MessageSquare, ArrowRight, CheckCircle2, Shield, Lock, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type FormState = "idle" | "submitting" | "success" | "error"

const projectTypes = [
  "Web Application / Scalable SaaS",
  "Mobile App (iOS / Android / React Native)",
  "Cloud Infrastructure & DevOps",
  "Enterprise & Internal System",
  "Government / GovTech Compliance Portal",
  "Fintech & M-Pesa / Card Gateway Integration",
  "Custom In-House Product Licensing",
  "Other Engineering Consultation",
]

const budgetRanges = [
  "Under KES 500,000",
  "KES 500,000 – KES 2,000,000",
  "KES 2,000,000 – KES 5,000,000",
  "KES 5,000,000 – KES 15,000,000",
  "KES 15,000,000+",
  "Flexible / Not Yet Determined",
]

const engagementHighlights = [
  {
    icon: Shield,
    title: "Non-Disclosure by Default",
    desc: "Every discussion is protected under our standard enterprise NDA. Your proprietary requirements and data remain strictly confidential.",
  },
  {
    icon: MessageSquare,
    title: "Direct Engineer Access",
    desc: "No sales commission runarounds. You converse directly with senior architects who will be designing and building your product.",
  },
  {
    icon: Zap,
    title: "Transparent Scoping",
    desc: "We provide itemized deliverables, defined milestones, fixed timelines, and measurable success criteria upfront.",
  },
]

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    projectType: "",
    subject: "",
    budget: "",
    message: "",
    _gotcha: "",
  })
  const [formState, setFormState] = useState<FormState>("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")

  // UX: prefill form context from CTA links (?service=, ?solution=, ?scale=)
  // used by the estimator, services and solutions pages.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const service = (params.get('service') || params.get('solution') || '').toLowerCase();
    const scale = (params.get('scale') || '').toLowerCase();
    if (!service && !scale) return;

    const serviceMap: Record<string, string> = {
      web: 'Web Application / Scalable SaaS',
      saas: 'Web Application / Scalable SaaS',
      mobile: 'Mobile App (iOS / Android / React Native)',
      mobility: 'Mobile App (iOS / Android / React Native)',
      cloud: 'Cloud Infrastructure & DevOps',
      enterprise: 'Enterprise & Internal System',
      govtech: 'Government / GovTech Compliance Portal',
      fintech: 'Fintech & M-Pesa / Card Gateway Integration',
      brand: 'Other Engineering Consultation',
    };
    const scaleMap: Record<string, string> = {
      starter: 'KES 500,000 – KES 2,000,000',
      mvp: 'KES 500,000 – KES 2,000,000',
      growth: 'KES 2,000,000 – KES 5,000,000',
      enterprise: 'KES 5,000,000 – KES 15,000,000',
    };

    const mappedService = serviceMap[service] || '';
    const mappedBudget = scaleMap[scale] || '';

    setForm((prev) => ({
      ...prev,
      projectType: mappedService || prev.projectType,
      budget: mappedBudget || prev.budget,
      message:
        prev.message ||
        `I'm interested in discussing a ${service || 'software engineering'} project${scale ? ` (${scale} scale)` : ''}.`,
    }));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (formState === "error") {
      setFormState("idle")
      setErrorMessage("")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormState("submitting")
    setErrorMessage("")

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit project brief. Please try again.")
      }

      setFormState("success")
    } catch (err: any) {
      setErrorMessage(err.message || "A network error occurred while submitting. Please try again.")
      setFormState("error")
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-background">

      {/* Page Hero */}
      <div className="bg-surface-container-lowest border-b border-outline-variant">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-10 md:py-12 space-y-4">
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <span className="text-on-surface font-medium">Contact &amp; Engagement</span>
          </nav>
          <div className="max-w-4xl space-y-3">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Project Scoping &amp; Support</span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-on-surface tracking-tight leading-tight">
              Discuss your project with our engineering team.
            </h1>
            <p className="text-base sm:text-lg text-on-surface-variant max-w-3xl leading-relaxed">
              Submit your requirements for web platforms, mobile applications, payment integrations, or statutory compliance tools. Our engineers review every inquiry and respond within one business day.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-10 md:py-14 space-y-12">

        {/* Main Contact Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

          {/* Left Column: Contact Info & Value Prop (5 cols) */}
          <div className="lg:col-span-5 space-y-6">

            {/* Office & Direct Info Card */}
            <div className="p-6 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Direct Contact Channels</h2>
              
              <div className="divide-y divide-outline-variant text-xs">
                {[
                  { icon: MapPin, label: "Headquarters", value: "Nairobi, Kenya" },
                  { icon: Mail, label: "Engineering Desk", value: "engineering@akubrecah.com", isLink: true, href: "mailto:engineering@akubrecah.com" },
                  { icon: Clock, label: "Operating Hours", value: "Monday – Friday, 08:00 – 18:00 EAT" },
                  { icon: MessageSquare, label: "Architecture Review", value: "30-minute technical scoping session" },
                ].map(({ icon: Icon, label, value, isLink, href }) => (
                  <div key={label} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-medium text-on-surface-variant block">{label}</span>
                      {isLink && href ? (
                        <a href={href} className="text-xs font-semibold text-primary hover:underline mt-0.5 block">
                          {value}
                        </a>
                      ) : (
                        <p className="text-xs font-semibold text-on-surface mt-0.5">{value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* What Happens Next Card */}
            <div className="p-6 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Engagement Process</h2>
              <div className="space-y-3">
                {[
                  { num: "01", text: "Technical review of your project brief within 24 hours" },
                  { num: "02", text: "Discovery call to clarify architecture and integration scope" },
                  { num: "03", text: "Itemized engineering proposal with timeline and deliverables" },
                  { num: "04", text: "Sprint kickoff with repository and staging environment setup" },
                ].map((step) => (
                  <div key={step.num} className="flex items-start gap-3 text-xs text-on-surface">
                    <span className="font-mono font-semibold text-primary shrink-0">
                      {step.num}
                    </span>
                    <span className="text-on-surface-variant">{step.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Link to In-House Tools */}
            <div className="p-6 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Self-Service Portals</h2>
              <div className="space-y-2">
                {[
                  { name: "KRA Certificate Retrieval Portal", href: "/retrieval-portal" },
                  { name: "Kenya P9 Tax Calculator & Filing Guide", href: "/retrieval-portal?view=filing" },
                ].map((tool) => (
                  <Link
                    key={tool.name}
                    href={tool.href}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low border border-outline-variant hover:border-primary/40 transition-colors text-xs font-semibold text-on-surface group"
                  >
                    <span>{tool.name}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-primary" />
                  </Link>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Brief Form (7 cols) */}
          <div className="lg:col-span-7">
            {formState === "success" ? (
              <div className="p-10 rounded-xl bg-surface-container-lowest border border-outline-variant text-center space-y-5">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-on-surface">Project Brief Received</h3>
                  <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto leading-relaxed">
                    Thank you for contacting Akubrecah Technologies. Our engineering team has received your inquiry and will respond within 24 business hours.
                  </p>
                </div>
                <Button
                  className="h-10 px-6 rounded-lg bg-primary text-white font-semibold text-xs"
                  onClick={() => {
                    setFormState("idle")
                    setForm({ name: "", email: "", company: "", phone: "", projectType: "", subject: "", budget: "", message: "", _gotcha: "" })
                  }}
                >
                  Submit Another Inquiry
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-5">
                <div className="border-b border-outline-variant pb-4">
                  <h2 className="text-xl font-bold text-on-surface">Submit Project Brief</h2>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Outline your technical requirements, timeline, and target integrations.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: "name", label: "Full Name *", placeholder: "e.g. Brian Ochieng", type: "text", required: true },
                    { id: "email", label: "Work Email *", placeholder: "brian@company.com", type: "email", required: true },
                    { id: "company", label: "Organization / Company", placeholder: "Acme Enterprises Ltd", type: "text", required: false },
                    { id: "phone", label: "Phone Number", placeholder: "+254 7XX XXX XXX", type: "tel", required: false },
                  ].map((field) => (
                    <div key={field.id} className="space-y-1.5">
                      <label htmlFor={field.id} className="text-xs font-semibold text-on-surface">
                        {field.label}
                      </label>
                      <Input
                        id={field.id}
                        name={field.id}
                        type={field.type}
                        value={form[field.id as keyof typeof form]}
                        onChange={handleChange}
                        required={field.required}
                        placeholder={field.placeholder}
                        className="h-10 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus-visible:ring-primary"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="projectType" className="text-xs font-semibold text-on-surface">
                      Project Category *
                    </label>
                    <select
                      id="projectType"
                      name="projectType"
                      value={form.projectType}
                      onChange={handleChange}
                      required
                      className="w-full h-10 px-3 border border-outline-variant bg-surface-container-low rounded-lg text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="" disabled>Select category...</option>
                      {projectTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="budget" className="text-xs font-semibold text-on-surface">
                      Estimated Budget
                    </label>
                    <select
                      id="budget"
                      name="budget"
                      value={form.budget}
                      onChange={handleChange}
                      className="w-full h-10 px-3 border border-outline-variant bg-surface-container-low rounded-lg text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="" disabled>Select budget bracket...</option>
                      {budgetRanges.map((range) => (
                        <option key={range} value={range}>{range}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Hidden Honeypot for Bot Abuse Detection */}
                <input
                  type="text"
                  name="_gotcha"
                  value={form._gotcha}
                  onChange={handleChange}
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden="true"
                />

                <div className="space-y-1.5">
                  <label htmlFor="subject" className="text-xs font-semibold text-on-surface">
                    Inquiry Subject / Topic
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    type="text"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="e.g. Payment Gateway Integration & Portal Deployment"
                    className="h-10 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="message" className="text-xs font-semibold text-on-surface">
                    Project Brief &amp; Objectives *
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    placeholder="Describe the core objectives, target users, required integrations (M-Pesa, KRA, ERP), and target timeline."
                    className="rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface resize-none focus-visible:ring-primary leading-relaxed"
                  />
                </div>

                {formState === "error" && errorMessage && (
                  <div role="alert" className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-start gap-2">
                    <span className="font-bold shrink-0">[Error]</span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={formState === "submitting"}
                  className="w-full h-11 rounded-lg bg-primary text-white font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {formState === "submitting" ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Submitting Brief...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Project Brief</span>
                      <Send className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-on-surface-variant text-center">
                  All submissions are treated as confidential under our standard mutual non-disclosure terms.
                </p>
              </form>
            )}
          </div>

        </div>

        {/* Highlights Section */}
        <div className="space-y-6 pt-4 border-t border-outline-variant">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {engagementHighlights.map((item) => (
              <div key={item.title} className="space-y-1.5">
                <h3 className="text-sm font-bold text-on-surface">{item.title}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
