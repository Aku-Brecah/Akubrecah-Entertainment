import Link from "next/link"
import type { JSX } from "react"
import { Logo } from "@/components/logo"
import { GooglePreferredSourceButton } from "@/components/google-preferred-source-button"
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
    <footer className="w-full border-t border-outline-variant bg-surface-container-lowest pt-10 pb-8 z-40 relative text-xs text-on-surface-variant" role="contentinfo">
      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-outline-variant">
          
          {/* Col 1 & 2: Brand Information */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-block hover:opacity-90 transition-opacity" aria-label="Akubrecah Entertainment">
              <Logo width={150} height={42} />
            </Link>
            <p className="text-xs text-on-surface-variant leading-relaxed max-w-sm">
              Akubrecah Entertainment is a software engineering, statutory GovTech facilitation, and digital infrastructure firm headquartered in Nairobi. 
              We build web platforms, native mobile applications, cloud architectures, and automated compliance tools for East African enterprises and citizens.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-on-surface">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Nairobi, Kenya
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" />
                engineering@akubrecah.com
              </span>
            </div>

            <div className="pt-1">
              <span className="text-[11px] font-medium text-on-surface-variant block mb-1.5">
                Verified on Google:
              </span>
              <GooglePreferredSourceButton />
            </div>
          </div>

          {/* Col 3: Engineering Services */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-on-surface uppercase tracking-wider">
              Engineering Services
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/services#web" className="hover:text-primary transition-colors block">
                  Web Applications (Next.js / React)
                </Link>
              </li>
              <li>
                <Link href="/services#mobile" className="hover:text-primary transition-colors block">
                  Mobile Apps (iOS &amp; Android)
                </Link>
              </li>
              <li>
                <Link href="/services#cloud" className="hover:text-primary transition-colors block">
                  Cloud Infrastructure &amp; DevOps
                </Link>
              </li>
              <li>
                <Link href="/services#enterprise" className="hover:text-primary transition-colors block">
                  Custom Enterprise Architecture
                </Link>
              </li>
              <li>
                <Link href="/solutions" className="hover:text-primary transition-colors block">
                  Industry Solutions
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Enterprise Platforms & Tools */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-on-surface uppercase tracking-wider">
              Platforms &amp; Tools
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/products" className="hover:text-primary transition-colors block">
                  API Gateway &amp; Integrations
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-primary transition-colors block">
                  Client &amp; Engineering Console
                </Link>
              </li>
              <li>
                <Link href="/services#cloud" className="hover:text-primary transition-colors block">
                  Cloud &amp; Infrastructure Manager
                </Link>
              </li>
              <li>
                <Link href="/estimator" className="hover:text-primary transition-colors block">
                  Architecture &amp; Scope Estimator
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Company & Quick Links */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-on-surface uppercase tracking-wider">
              Company
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="hover:text-primary transition-colors">
                  About Akubrecah
                </Link>
              </li>
              <li>
                <Link href="/projects" className="hover:text-primary transition-colors">
                  Projects &amp; Case Studies
                </Link>
              </li>
              <li>
                <Link href="/articles" className="hover:text-primary transition-colors">
                  Field Notes &amp; Articles
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary transition-colors font-semibold text-primary">
                  Start a Project &rarr;
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Sub-bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-on-surface-variant">
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
                  className="text-[11px] hover:text-primary transition-colors underline-offset-4 hover:underline"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[11px] hover:text-primary transition-colors underline-offset-4 hover:underline"
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>
        </div>

        {/* Micro Disclaimer */}
        <div className="mt-4 pt-3 border-t border-outline-variant/60 text-center sm:text-left">
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Akubrecah Entertainment operates independent software engineering solutions and third-party automated document retrieval facilitation. 
            Government services are also accessible directly and free of charge via official public portals such as <a href="https://itax.kra.go.ke" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">itax.kra.go.ke</a>.
          </p>
        </div>

      </div>
    </footer>
  )
}