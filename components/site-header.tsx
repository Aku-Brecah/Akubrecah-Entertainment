"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Logo } from "@/components/logo"
import { UserButton, useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import {
  ChevronDown,
  Menu,
  X,
  LayoutDashboard,
  Shield,
  ArrowRight,
  ChevronRight,
} from "lucide-react"

interface NavSubItem {
  title: string
  desc: string
  href: string
  badge?: string
}

interface NavGroup {
  heading: string
  items: NavSubItem[]
}

interface NavItem {
  label: string
  href: string
  badge?: string
  groups?: NavGroup[] | null
  footer?: { label: string; href: string }
}

const kraNavData: NavItem[] = [
  {
    label: "Retrieval",
    href: "/retrieval-portal",
    groups: null,
  },
  {
    label: "Articles",
    href: "/articles",
    groups: null,
  },
  {
    label: "Services",
    href: "/services",
    groups: null,
  },
  {
    label: "Contact",
    href: "/contact",
    groups: null,
  },
]

const navData: NavItem[] = [
  {
    label: "About",
    href: "/about",
    groups: null,
  },
  {
    label: "Services",
    href: "/services",
    groups: [
      {
        heading: "Engineering Capabilities",
        items: [
          {
            title: "Web Engineering",
            desc: "High-performance full-stack web platforms & Next.js apps",
            href: "/services#web",
          },
          {
            title: "Mobile App Development",
            desc: "Native iOS & Android, React Native ecosystems",
            href: "/services#mobile",
          },
          {
            title: "Cloud & DevOps",
            desc: "Microservices, CI/CD pipelines & AWS/GCP scaling",
            href: "/services#cloud",
          },
          {
            title: "Enterprise Software",
            desc: "Bespoke internal systems, high-throughput APIs",
            href: "/services#enterprise",
          },
        ],
      },
    ],
    footer: { label: "All services →", href: "/services" },
  },
  {
    label: "Products",
    href: "/products",
    groups: [
      {
        heading: "Enterprise Platforms",
        items: [
          {
            title: "Akubrecah API Gateway",
            desc: "High-throughput microservice routing & event bus",
            href: "/products",
          },
          {
            title: "Client & Engineering Console",
            desc: "Full observability, deployment pipeline & monitoring hub",
            href: "/dashboard",
          },
          {
            title: "Architecture & Cost Estimator",
            desc: "Interactive scope, technology stack & timeline calculator",
            href: "/estimator",
          },
        ],
      },
    ],
    footer: { label: "All engineering products", href: "/products" },
  },
  {
    label: "Solutions",
    href: "/solutions",
    groups: [
      {
        heading: "By Industry",
        items: [
          {
            title: "Financial Technology",
            desc: "M-Pesa, payment gateways & fintech infrastructure",
            href: "/solutions#fintech",
          },
          {
            title: "Government & GovTech",
            desc: "Statutory portals & citizen-facing digital services",
            href: "/solutions#govtech",
          },
          {
            title: "Enterprise Operations",
            desc: "ERP modules, automation & document workflows",
            href: "/solutions#enterprise",
          },
          {
            title: "SaaS Product Engineering",
            desc: "Full-cycle MVP to scale for software startups",
            href: "/solutions#saas",
          },
        ],
      },
    ],
    footer: { label: "All solutions", href: "/solutions" },
  },
  {
    label: "Projects",
    href: "/projects",
    groups: null,
  },
  {
    label: "Retrieval",
    href: "/retrieval-portal",
    groups: null,
  },
  {
    label: "Articles",
    href: "/articles",
    groups: null,
  },
  {
    label: "Contact",
    href: "/contact",
    groups: null,
  },
]

function MegaMenu({
  item,
  open,
  onClose,
}: {
  item: NavItem
  open: boolean
  onClose: () => void
}) {
  if (!item.groups || !open) return null
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50"
      style={{ minWidth: 340 }}
      role="menu"
    >
      <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-[20px] border border-stone-200/70 dark:border-stone-800 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] rounded-[2rem] overflow-hidden p-2">
        {item.groups.map((group) => (
          <div key={group.heading} className="p-3">
            <p className="text-xs font-medium text-[#78716C] px-3 py-1 mb-1">
              {group.heading}
            </p>
            <div className="space-y-1">
              {group.items.map((sub) => (
                <Link
                  key={sub.title}
                  href={sub.href}
                  role="menuitem"
                  onClick={onClose}
                  className="block p-3 rounded-2xl hover:bg-[#E8EFE8]/70 dark:hover:bg-stone-800 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#292524] dark:text-stone-100 group-hover:text-[#292524] transition-colors truncate">
                      {sub.title}
                    </span>
                  </div>
                  <p className="text-xs text-[#78716C] line-clamp-1 mt-0.5">{sub.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {item.footer && (
          <div className="border-t border-stone-100 dark:border-stone-800 bg-[#FDFCF8] dark:bg-stone-900 rounded-b-[1.5rem] px-5 py-3">
            <Link
              href={item.footer.href}
              onClick={onClose}
              className="flex items-center justify-between text-xs font-medium text-[#292524] dark:text-stone-200 hover:text-[#78716C]"
            >
              <span>{item.footer.label}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function DesktopNavItem({
  item,
  pathname,
}: {
  item: NavItem
  pathname: string
}) {
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const isActive =
    pathname === item.href ||
    (item.href !== "/" && pathname.startsWith(item.href))

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (item.groups && item.groups.length > 0) {
      setOpen(true)
    }
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false)
    }, 160)
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function keyHandler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) {
      document.addEventListener("mousedown", handler)
      document.addEventListener("keydown", keyHandler)
    }
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("keydown", keyHandler)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [open])

  if (!item.groups) {
    return (
      <Link
        href={item.href}
        className={`px-3 py-1.5 rounded-full text-[14px] font-medium transition-colors flex items-center gap-1.5 ${isActive
          ? "bg-[#E8EFE8] text-[#292524]"
          : "text-[#292524] dark:text-stone-200 hover:text-[#78716C] hover:bg-stone-100/60 dark:hover:bg-stone-800/50"
          }`}
      >
        <span>{item.label}</span>
      </Link>
    )
  }

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`flex items-center rounded-full transition-colors ${isActive
          ? "bg-[#E8EFE8] text-[#292524]"
          : open
            ? "text-[#292524] bg-stone-100/80 dark:bg-stone-800"
            : "text-[#292524] dark:text-stone-200 hover:text-[#78716C] hover:bg-stone-100/60 dark:hover:bg-stone-800/50"
          }`}
      >
        <Link
          href={item.href}
          className="pl-3 pr-1 py-1.5 text-[14px] font-medium flex items-center gap-1.5"
        >
          <span>{item.label}</span>
        </Link>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setOpen((v) => !v)
          }}
          className={`pr-2.5 pl-1 py-1.5 focus:outline-none transition-transform duration-200 cursor-pointer ${open ? "rotate-180 text-[#292524]" : "text-[#78716C] hover:text-[#292524]"
            }`}
          aria-label={`Toggle ${item.label} menu`}
          aria-expanded={open}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <MegaMenu item={item} open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

function MobileNavSection({
  item,
  onClose,
}: {
  item: NavItem
  onClose: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  if (!item.groups) {
    return (
      <Link
        href={item.href}
        onClick={onClose}
        className="flex items-center justify-between min-h-[44px] px-4 py-2.5 rounded-full hover:bg-[#E8EFE8]/60 text-[14px] font-medium text-[#292524] dark:text-stone-100 transition-colors"
      >
        <span>{item.label}</span>
        <ChevronRight className="h-4 w-4 text-[#78716C]" />
      </Link>
    )
  }

  return (
    <div className="rounded-[1.5rem] overflow-hidden border border-stone-200/70 dark:border-stone-800 bg-white dark:bg-stone-900">
      <div className="flex items-center justify-between min-h-[44px]">
        <Link
          href={item.href}
          onClick={onClose}
          className="flex-1 px-4 py-2.5 text-[14px] font-medium text-[#292524] dark:text-stone-100 flex items-center gap-2"
        >
          <span>{item.label}</span>
        </Link>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#78716C] focus:outline-none"
          aria-label={`Toggle ${item.label} submenu`}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180 text-[#292524]" : ""}`}
          />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-stone-100 dark:border-stone-800 bg-[#FDFCF8] dark:bg-stone-950 px-3 py-2 space-y-1">
          {item.groups.map((group) => (
            <div key={group.heading} className="py-1">
              <p className="text-xs font-medium text-[#78716C] px-2 py-1">
                {group.heading}
              </p>
              {group.items.map((sub) => (
                <Link
                  key={sub.title}
                  href={sub.href}
                  onClick={onClose}
                  className="block p-2.5 rounded-2xl hover:bg-[#E8EFE8]/60 transition-colors group min-h-[44px]"
                >
                  <span className="text-xs font-medium text-[#292524] dark:text-stone-100 block">
                    {sub.title}
                  </span>
                  <p className="text-[11px] text-[#78716C] line-clamp-1 mt-0.5">{sub.desc}</p>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const { isLoaded, isSignedIn, user } = useUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isKra, setIsKra] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname.toLowerCase()
      setIsKra(host.startsWith("kra.") || host.includes("kra.akubrecah.com"))
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileMenuOpen])

  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase()
  const userRole = user?.publicMetadata?.role as string
  const configAdminEmail = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "").toLowerCase()
  const isAdmin =
    Boolean(configAdminEmail && userEmail === configAdminEmail) ||
    userRole === "Super Admin" ||
    userRole === "Admin"

  const currentNav = isKra ? kraNavData : navData

  return (
    <>
      {/* Floating Pill-Shaped Nav Bar: 70% white opacity, 20px backdrop-blur, constrained to 100% - 32px on mobile */}
      <header className="sticky top-3 sm:top-4 z-40 w-full flex justify-center pointer-events-none px-4">
        <div
          className={`pointer-events-auto w-full max-w-[1220px] h-14 sm:h-16 rounded-full bg-white/70 dark:bg-stone-900/75 backdrop-blur-[20px] border border-stone-200/70 dark:border-stone-800 px-4 sm:px-6 flex items-center justify-between gap-3 transition-shadow duration-300 ${scrolled
            ? "shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]"
            : "shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]"
            }`}
        >
          {/* Akubrecah Brand Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group hover:opacity-90 transition-opacity" aria-label="Akubrecah Entertainment">
            <Logo width={132} height={38} className="h-8 sm:h-9 w-auto" />
            {isKra && (
              <span className="hidden sm:inline text-xs text-[#78716C] font-normal">
                · Cyber portal
              </span>
            )}
          </Link>

          {/* Desktop Navigation Links in 14px Outfit Medium */}
          <nav className="hidden lg:flex items-center gap-0.5 shrink-0" aria-label="Main navigation">
            {currentNav.map((item) => (
              <DesktopNavItem key={item.label} item={item} pathname={pathname} />
            ))}
          </nav>

          {/* Right Actions: Dark Stone (#292524) Pill CTA Button + Auth + Theme */}
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            <ThemeToggle />

            {isLoaded && isSignedIn ? (
              <div className="flex items-center gap-2 flex-nowrap">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[#E8EFE8] text-[#292524] rounded-full hover:brightness-95 transition-all cursor-pointer shrink-0"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="h-9 px-4 rounded-full bg-[#292524] text-[#FDFCF8] text-[14px] font-medium hover:bg-[#292524]/90 transition-all inline-flex items-center gap-1.5 shrink-0 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.08)]"
                >
                  <LayoutDashboard className="h-3.5 w-3.5 text-[#FFB7B2]" />
                  <span className="hidden sm:inline">Console</span>
                </Link>
                <UserButton
                  appearance={{
                    elements: { avatarBox: "w-8 h-8 rounded-full border border-stone-200" },
                  }}
                />
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 flex-nowrap">
                <Link
                  href="/sign-in"
                  className="px-3.5 py-1.5 rounded-full text-[14px] font-medium text-[#292524] dark:text-stone-200 hover:text-[#78716C] transition-colors shrink-0"
                >
                  Sign in
                </Link>
                <Link
                  href={isKra ? "/retrieval-portal" : "/contact"}
                  className="h-10 px-5 rounded-full bg-[#292524] text-[#FDFCF8] text-[14px] font-medium hover:scale-[1.02] transition-all inline-flex items-center gap-1.5 shrink-0 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.08)]"
                >
                  <span>{isKra ? "Retrieve PIN" : "Start a project"}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFB7B2]" />
                </Link>
              </div>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-[#292524] dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors focus:outline-none cursor-pointer"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Floating Sheet Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-[#292524]/25 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="lg:hidden fixed inset-x-4 top-20 z-50 rounded-[2rem] bg-white/95 dark:bg-stone-900/95 backdrop-blur-[20px] max-h-[calc(100vh-6rem)] overflow-y-auto shadow-[0_12px_40px_-4px_rgba(0,0,0,0.1)] border border-stone-200/80 dark:border-stone-800 p-5 space-y-4">
            {isLoaded && isSignedIn ? (
              <div className="p-3.5 rounded-2xl bg-[#E8EFE8]/70 dark:bg-stone-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[#292524] dark:text-stone-100">{user?.fullName || "Signed in"}</p>
                  <p className="text-[11px] text-[#78716C] truncate max-w-[180px]">{user?.primaryEmailAddress?.emailAddress}</p>
                </div>
                <Button asChild size="sm" className="h-8 px-4 rounded-full text-xs bg-[#292524] text-[#FDFCF8]">
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>Console</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  href="/sign-in"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full h-11 rounded-full border border-stone-200 bg-white text-[#292524] text-[14px] font-medium flex items-center justify-center"
                >
                  Sign in
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full h-11 rounded-full bg-[#292524] text-[#FDFCF8] text-[14px] font-medium flex items-center justify-center gap-1.5"
                >
                  <span>Start project</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFB7B2]" />
                </Link>
              </div>
            )}

            <div className="space-y-1.5">
              {currentNav.map((item) => (
                <MobileNavSection key={item.label} item={item} onClose={() => setMobileMenuOpen(false)} />
              ))}
            </div>

            {isLoaded && isSignedIn && isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium bg-[#EFEDF4] text-[#292524] transition-colors"
              >
                <Shield className="h-4 w-4" /> Admin Console
              </Link>
            )}
          </div>
        </>
      )}
    </>
  )
}