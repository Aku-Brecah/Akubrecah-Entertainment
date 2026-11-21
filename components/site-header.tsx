"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
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
  Lock,
} from "lucide-react"

/* ──────────────────────────────────────────────────────────────
   NAV TYPES & DATA  (parent pages + child sub-routes inside them)
────────────────────────────────────────────────────────────── */
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
    footer: { label: "All Services →", href: "/services" },
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
    footer: { label: "All Engineering Products", href: "/products" },
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
    footer: { label: "All Solutions", href: "/solutions" },
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

/* ──────────────────────────────────────────────────────────────
   DESKTOP MEGA DROPDOWN PANEL
────────────────────────────────────────────────────────────── */
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
      className="absolute left-1/2 -translate-x-1/2 top-full pt-2 z-50"
      style={{ minWidth: 340 }}
      role="menu"
    >
      <div className="bg-surface-container-lowest border border-outline-variant shadow-md rounded-xl overflow-hidden">
        {item.groups.map((group) => (
          <div key={group.heading} className="p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant px-2.5 py-1 mb-1">
              {group.heading}
            </p>
            <div className="space-y-0.5">
              {group.items.map((sub) => {
                return (
                  <Link
                    key={sub.title}
                    href={sub.href}
                    role="menuitem"
                    onClick={onClose}
                    className="block p-2.5 rounded-lg hover:bg-surface-container transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
                        {sub.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">{sub.desc}</p>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {item.footer && (
          <div className="border-t border-outline-variant bg-surface-container-low px-4 py-2.5">
            <Link
              href={item.footer.href}
              onClick={onClose}
              className="flex items-center justify-between text-xs font-semibold text-primary hover:underline"
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

/* ──────────────────────────────────────────────────────────────
   DESKTOP NAV ITEM (hover-bridge + click trigger)
────────────────────────────────────────────────────────────── */
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
        className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
          isActive
            ? "text-primary font-semibold"
            : "text-on-surface-variant hover:text-on-surface"
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
        className={`flex items-center rounded-lg transition-colors ${
          isActive
            ? "text-primary font-semibold"
            : open
            ? "text-on-surface bg-surface-container"
            : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
        }`}
      >
        <Link
          href={item.href}
          className="pl-3 pr-1 py-1.5 text-xs font-medium flex items-center gap-1.5"
        >
          <span>{item.label}</span>
        </Link>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setOpen((v) => !v)
          }}
          className={`pr-2.5 pl-1 py-1.5 focus:outline-none transition-transform duration-150 cursor-pointer ${
            open ? "rotate-180 text-primary" : "text-on-surface-variant hover:text-on-surface"
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

/* ──────────────────────────────────────────────────────────────
   MOBILE ACCORDION SECTION
────────────────────────────────────────────────────────────── */
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
        className="flex items-center justify-between min-h-[44px] px-3.5 py-2.5 rounded-lg hover:bg-surface-container text-sm font-semibold text-on-surface transition-colors"
      >
        <span>{item.label}</span>
        <ChevronRight className="h-4 w-4 text-on-surface-variant" />
      </Link>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden border border-outline-variant bg-surface-container-lowest">
      <div className="flex items-center justify-between min-h-[44px]">
        <Link
          href={item.href}
          onClick={onClose}
          className="flex-1 px-3.5 py-2.5 text-sm font-semibold text-on-surface flex items-center gap-2"
        >
          <span>{item.label}</span>
        </Link>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-on-surface-variant focus:outline-none"
          aria-label={`Toggle ${item.label} submenu`}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-150 ${expanded ? "rotate-180 text-primary" : ""}`}
          />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-outline-variant bg-surface-container-low px-3 py-2 space-y-1">
          {item.groups.map((group) => (
            <div key={group.heading} className="py-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant px-2 py-1">
                {group.heading}
              </p>
              {group.items.map((sub) => {
                return (
                  <Link
                    key={sub.title}
                    href={sub.href}
                    onClick={onClose}
                    className="block p-2 rounded-lg hover:bg-surface-container transition-colors group min-h-[44px]"
                  >
                    <span className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors block">
                      {sub.title}
                    </span>
                    <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">{sub.desc}</p>
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   SITE HEADER
────────────────────────────────────────────────────────────── */
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
  const configAdminEmail = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || '').toLowerCase()
  const isAdmin =
    Boolean(configAdminEmail && userEmail === configAdminEmail) ||
    userRole === "Super Admin" ||
    userRole === "Admin"

  const currentNav = isKra ? kraNavData : navData

  return (
    <>
      <header
        className={`fixed top-0 w-full z-50 transition-colors duration-150 bg-surface-container-lowest border-b border-outline-variant ${
          scrolled ? "shadow-xs" : ""
        } h-16`}
      >
        <div className="w-full max-w-[1360px] mx-auto h-full px-4 sm:px-6 lg:px-10 xl:px-12 flex items-center justify-between gap-4 flex-nowrap min-w-0">

          {/* Brand */}
          {isKra ? (
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <Logo width={130} height={38} className="h-8 w-auto" />
              <div className="flex flex-col border-l border-outline-variant pl-2.5">
                <span className="text-xs font-semibold text-on-surface leading-tight">
                  Cyber Portal
                </span>
                <span className="text-[10px] text-on-surface-variant leading-tight">Independent Facilitation</span>
              </div>
            </Link>
          ) : (
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <Logo width={140} height={42} className="h-8 md:h-9 w-auto" />
              <div className="hidden xl:flex flex-col border-l border-outline-variant pl-2.5 py-0.5">
                <span className="text-[11px] font-semibold text-on-surface leading-tight">Technologies</span>
                <span className="text-[10px] text-on-surface-variant leading-tight">Software Engineering</span>
              </div>
            </Link>
          )}

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 shrink-0" aria-label="Main navigation">
            {currentNav.map((item) => (
              <DesktopNavItem key={item.label} item={item} pathname={pathname} />
            ))}
          </nav>

          {/* Right: Auth + Theme + Hamburger */}
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            <ThemeToggle />

            {isKra ? (
              isLoaded && isSignedIn ? (
                <div className="flex items-center gap-2 flex-nowrap">
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-surface-container text-on-surface border border-outline-variant rounded-lg hover:border-primary/50 transition-colors cursor-pointer shrink-0"
                    >
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      Admin
                    </Link>
                  )}
                  <Button asChild size="sm" className="h-8.5 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5 shrink-0">
                    <Link href="/dashboard">
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Console</span>
                    </Link>
                  </Button>
                  <UserButton
                    appearance={{
                      elements: { avatarBox: "w-8 h-8 rounded-full border border-outline-variant" },
                    }}
                  />
                </div>
              ) : isLoaded && !isSignedIn ? (
                <div className="hidden sm:flex items-center gap-3 flex-nowrap">
                  <div className="hidden md:flex items-center gap-1.5 text-xs text-on-surface-variant">
                    <Lock className="w-3.5 h-3.5 text-on-surface-variant" />
                    <span>Encrypted Session</span>
                  </div>
                  <Button asChild size="sm" className="h-9 px-4 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 shrink-0">
                    <Link href="/sign-in">Sign In</Link>
                  </Button>
                </div>
              ) : null
            ) : (
              isLoaded && isSignedIn ? (
                <div className="flex items-center gap-2 flex-nowrap">
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-surface-container text-on-surface border border-outline-variant rounded-lg hover:border-primary/50 transition-colors cursor-pointer shrink-0"
                    >
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      Admin
                    </Link>
                  )}
                  <Button asChild size="sm" className="h-8.5 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5 shrink-0">
                    <Link href="/dashboard">
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Console</span>
                    </Link>
                  </Button>
                  <UserButton
                    appearance={{
                      elements: { avatarBox: "w-8 h-8 rounded-full border border-outline-variant" },
                    }}
                  />
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2 flex-nowrap">
                  <Button asChild variant="ghost" size="sm" className="h-9 px-3 rounded-lg text-xs font-semibold text-on-surface hover:text-primary shrink-0">
                    <Link href="/sign-in">Sign In</Link>
                  </Button>
                  <Button asChild size="sm" className="h-9 px-4 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5 shrink-0">
                    <Link href="/contact">
                      Start a Project <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              )
            )}

            {/* Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-on-surface hover:bg-surface-container transition-colors focus:outline-none cursor-pointer"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      {mobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="lg:hidden fixed inset-x-0 top-16 z-50 bg-surface-container-lowest max-h-[calc(100vh-4rem)] overflow-y-auto shadow-lg border-b border-outline-variant">
            <div className="p-4 space-y-3">

              {isKra ? (
                isLoaded && isSignedIn ? (
                  <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-on-surface">{user?.fullName || "Signed in"}</p>
                      <p className="text-[11px] text-on-surface-variant truncate max-w-[200px]">{user?.primaryEmailAddress?.emailAddress}</p>
                    </div>
                    <Button asChild size="sm" className="h-8 px-3 rounded-lg text-xs bg-primary text-white font-semibold">
                      <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>Console</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild variant="outline" size="sm" className="w-full h-10 text-xs font-semibold rounded-lg">
                      <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
                    </Button>
                    <Button asChild size="sm" className="w-full h-10 text-xs font-semibold bg-primary text-white rounded-lg">
                      <a href="https://akubrecah.com" onClick={() => setMobileMenuOpen(false)}>Agency Home</a>
                    </Button>
                  </div>
                )
              ) : (
                isLoaded && isSignedIn ? (
                  <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-on-surface">{user?.fullName || "Signed in"}</p>
                      <p className="text-[11px] text-on-surface-variant truncate max-w-[180px]">{user?.primaryEmailAddress?.emailAddress}</p>
                    </div>
                    <Button asChild size="sm" className="h-8 px-3 rounded-lg text-xs bg-primary text-white font-semibold">
                      <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>Console</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild variant="outline" size="sm" className="w-full h-10 text-xs font-semibold rounded-lg">
                      <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
                    </Button>
                    <Button asChild size="sm" className="w-full h-10 text-xs font-semibold bg-primary text-white rounded-lg flex items-center justify-center gap-1.5">
                      <Link href="/contact" onClick={() => setMobileMenuOpen(false)}>
                        Start a Project <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                )
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
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-primary hover:bg-surface-container transition-colors"
                >
                  <Shield className="h-4 w-4" /> Admin Console
                </Link>
              )}

            </div>
          </div>
        </>
      )}
    </>
  )
}