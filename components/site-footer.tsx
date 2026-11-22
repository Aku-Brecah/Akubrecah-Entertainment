import Link from "next/link"
import type { JSX } from "react"
import { GooglePreferredSourceButton } from "@/components/google-preferred-source-button"
import { Logo } from "@/components/logo"
import { Mail, MapPin } from "lucide-react"

export function SiteFooter(): JSX.Element {
  const currentYear = new Date().getFullYear()

  const legalLinks = [
    { label: "Terms of Service", href: "/legal/terms", external: false },
    { label: "Privacy Policy", href: "/legal/privacy", external: false },
    { label: "Disclaimer", href: "/legal/disclaimer", external: false },
    { label: "Legal & Compliance", href: "/legal", external: false },
    { label: "Retrieve Certificate", href: "/retrieval-portal", external: false },
    { label: "Official iTax Portal", href: "https://itax.kra.go.ke", external: true },
    { label: "Support Desk", href: "/contact", external: false },
  ]

  return (
    <footer className="w-full bg-[#FDFCF8] dark:bg-surface pt-8 pb-12 px-4 sm:px-6 z-40 relative text-xs text-[#78716C]" role="contentinfo">
      <div className="w-full max-w-[1220px] mx-auto rounded-[2.5rem] bg-white dark:bg-surface-container-lowest border border-stone-100 dark:border-outline-variant shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] p-8 sm:p-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-stone-100 dark:border-outline-variant">
          {/* Col 1 & 2: Brand Information */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group hover:opacity-90 transition-opacity" aria-label="Akubrecah Entertainment">
              <Logo width={150} height={42} className="h-9 w-auto" />
              <span className="font-cursive text-2xl text-[#78716C] hidden sm:inline">
                digital living room
              </span>
            </Link>
            <p className="text-xs text-[#78716C] leading-relaxed max-w-sm">
              Akubrecah Entertainment is a software engineering, statutory GovTech facilitation, and digital infrastructure studio headquartered in Nairobi.
              We craft calm, tactile web platforms, native mobile apps, cloud architectures, and automated compliance tools.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#292524] dark:text-on-surface">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#FFB7B2]" />
                Nairobi, Kenya
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-[#FFB7B2]" />
                engineering@akubrecah.com
              </span>
            </div>

            <div className="pt-1">
              <span className="text-[11px] font-medium text-[#78716C] block mb-1.5">
                Verified on Google:
              </span>
              <GooglePreferredSourceButton />
            </div>
          </div>

          {/* Col 3: Engineering Services */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-[#292524] dark:text-on-surface">
              Engineering services
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/services#web" className="hover:text-[#292524] transition-colors block">
                  Web applications (Next.js / React)
                </Link>
              </li>
              <li>
                <Link href="/services#mobile" className="hover:text-[#292524] transition-colors block">
                  Mobile apps (iOS &amp; Android)
                </Link>
              </li>
              <li>
                <Link href="/services#cloud" className="hover:text-[#292524] transition-colors block">
                  Cloud infrastructure &amp; DevOps
                </Link>
              </li>
              <li>
                <Link href="/services#enterprise" className="hover:text-[#292524] transition-colors block">
                  Custom enterprise architecture
                </Link>
              </li>
              <li>
                <Link href="/solutions" className="hover:text-[#292524] transition-colors block">
                  Industry solutions
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Enterprise Platforms & Tools */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-[#292524] dark:text-on-surface">
              Platforms &amp; tools
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/products" className="hover:text-[#292524] transition-colors block">
                  API gateway &amp; integrations
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#292524] transition-colors block">
                  Client &amp; engineering console
                </Link>
              </li>
              <li>
                <Link href="/services#cloud" className="hover:text-[#292524] transition-colors block">
                  Cloud &amp; infrastructure manager
                </Link>
              </li>
              <li>
                <Link href="/estimator" className="hover:text-[#292524] transition-colors block">
                  Architecture &amp; scope estimator
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Company & Quick Links */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-[#292524] dark:text-on-surface">
              Company
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="hover:text-[#292524] transition-colors">
                  About Akubrecah
                </Link>
              </li>
              <li>
                <Link href="/projects" className="hover:text-[#292524] transition-colors">
                  Projects &amp; case studies
                </Link>
              </li>
              <li>
                <Link href="/articles" className="hover:text-[#292524] transition-colors">
                  Field notes &amp; articles
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#292524] transition-colors font-medium text-[#292524]">
                  Start a project &rarr;
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Sub-bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-[#78716C]">
            &copy; {currentYear} Akubrecah Entertainment. Independent software engineering &amp; cyber facilitation services. Not affiliated with KRA.
          </p>

          <nav aria-label="Legal navigation" className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {legalLinks.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] hover:text-[#292524] transition-colors underline-offset-4 hover:underline"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[11px] hover:text-[#292524] transition-colors underline-offset-4 hover:underline"
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>
        </div>

        {/* Micro Disclaimer */}
        <div className="mt-4 pt-3 border-t border-stone-100 dark:border-outline-variant/60 text-center sm:text-left">
          <p className="text-[11px] text-[#78716C] leading-relaxed">
            Akubrecah Entertainment operates independent software engineering solutions and third-party automated document retrieval facilitation.
            Government services are also accessible directly and free of charge via official public portals such as{" "}
            <a href="https://itax.kra.go.ke" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#292524]">
              itax.kra.go.ke
            </a>.
          </p>
        </div>
      </div>
    </footer>
  )
}