---
version: 1.2.0
name: Akubrecah Entertainment - Architectural Editorial & Institutional Systems
description: "Single source of truth design system for Akubrecah Entertainment, KRA statutory compliance portal, and enterprise digital systems."
brand: "Akubrecah Entertainment (Design | Print | Brand | Tech)"
colors:
  # Official Brand Book Colors
  primary: "#BA1A1A"                 # Tuscan Red (Authority, Legal Precision, Action)
  primary-hover: "#9C1414"           # Deep Tuscan Crimson
  primary-muted: "#FDE8E8"           # Light red tint
  primary-container: "#FFDAD6"       # Soft container background
  on-primary: "#FFFFFF"              # Pure White contrast
  on-primary-container: "#410002"    # High-contrast deep maroon
  
  # Solid Architectural Surfaces & Backdrops
  surface: "#F8FAFC"                 # Crisp Slate Light Canvas
  surface-card: "#FFFFFF"            # High-contrast white card
  surface-card-subtle: "#F1F5F9"     # Subtle container fill
  surface-dark: "#0C0D12"            # Deep Obsidian Canvas
  surface-dark-card: "#12141C"       # Elevated Obsidian Card
  surface-dark-elevated: "#171A24"   # Secondary elevated surface
  neutral: "#0F172A"                 # Obsidian Black
  neutral-muted: "#334155"           # Slate Gray
  neutral-subtle: "#64748B"          # Muted Gray
  border: "#E2E8F0"                  # Border Light
  border-dark: "#262B38"             # Border Obsidian
  
  # Logo Accent Hues (Design | Print | Brand)
  accent-design: "#BA1A1A"           # Tuscan Red ("Design")
  accent-print: "#0284C7"            # Structured Technical Blue ("Print")
  accent-brand: "#15803D"            # Institutional Emerald ("Brand")
  
  # Status Hues
  success: "#15803D"
  success-bg: "#DCFCE7"
  warning: "#B45309"
  warning-bg: "#FEF3C7"
  error: "#BA1A1A"
  error-bg: "#FEE2E2"

typography:
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  headline-2xl: { fontSize: "44px", fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.025em" }
  headline-xl: { fontSize: "34px", fontWeight: 700, lineHeight: 1.18, letterSpacing: "-0.02em" }
  headline-lg: { fontSize: "26px", fontWeight: 600, lineHeight: 1.24, letterSpacing: "-0.015em" }
  headline-md: { fontSize: "20px", fontWeight: 600, lineHeight: 1.32, letterSpacing: "-0.01em" }
  body-lg: { fontSize: "16px", fontWeight: 400, lineHeight: 1.6 }
  body-md: { fontSize: "14px", fontWeight: 400, lineHeight: 1.55 }
  body-sm: { fontSize: "12px", fontWeight: 400, lineHeight: 1.45 }
  label-md: { fontSize: "12px", fontWeight: 600, letterSpacing: "0.02em" }
  label-sm: { fontSize: "11px", fontWeight: 600, letterSpacing: "0.02em" }

rounded:
  sharp: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "10px"
  xxl: "12px"
  pill: "9999px"

spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"

components:
  card:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.xl}"
    border: "1px solid {colors.border}"
  input:
    rounded: "{rounded.lg}"
    border: "1px solid {colors.border}"
    height: "42px"
    fontSize: "14px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    height: "42px"
---

# Akubrecah Entertainment - Brand Specification & Design System

## Overview
**Akubrecah Entertainment** delivers software engineering, statutory GovTech facilitation, and corporate brand infrastructure.
Guided by an editorial, human-crafted engineering aesthetic, this specification enforces visual restraint, typographic clarity, and high-trust institutional ergonomics across all marketing, portal, and operations surfaces.

## Brand Book Alignment & Color Hierarchy
1. **Tuscan Red (`#BA1A1A`)**: Primary brand accent. Reserved for primary calls to action, active focus states, and key structural markers.
2. **Obsidian (`#0F172A` / `#0C0D12`)**: Primary ink in light mode and primary canvas in dark mode.
3. **Slate & Chalk (`#F8FAFC` / `#F1F5F9`)**: Neutral surface hierarchy providing subtle separation without glassmorphism or decorative gradients.
4. **Pure White (`#FFFFFF`)**: Primary card and document surface in light mode.
5. **Semantic Status Accents**:
   - **Institutional Emerald (`#15803D`)**: Verified status, successful payments, and healthy service checks.
   - **Amber (`#B45309`)**: Pending states and advisory notices.
6. **Strict Purple Ban**: Violet, purple, indigo, and magenta hues are strictly forbidden across all touchpoints.

## Typography
- Primary Typeface: **Inter** (weights: 400, 500, 600, 700).
- **No `font-black` Overuse**: Headings rely on proportion, spacing, and 600–700 weight rather than heavy 900-weight all-caps blocks.
- **Natural Case Hierarchy**: Headings use sentence or title case. Uppercase is reserved strictly for compact table headers, keyboard shortcuts, and short specification codes.
- **Monospace Tabular Figures**: Used for KRA PINs, M-Pesa receipt codes, timestamps, and monetary figures.

## Layout & Interaction Principles
1. **Editorial & Functional Structure**:
   - Each page uses a layout suited to its content: asymmetric editorial grids for case studies and corporate overview, specification tables for services and products, high-density workbenches for GovTech portals, and clean operations tables for the admin console.
2. **Restrained Radii & Solid Borders**:
   - Cards and containers use crisp `8px`–`12px` corners (`rounded-lg` to `rounded-xl`) with `1px solid` semantic borders (`border-outline-variant`).
   - Avoid oversized `32px`–`40px` pill containers or floating glassmorphic panels.
3. **Purposeful Motion Only**:
   - Transitions are fast (`150ms`–`200ms`) and limited to color, border, opacity, and accordion disclosure.
   - No decorative blinking dots, no continuous marquee tickers, no floating background blobs, and no card hover elevation jumps (`-translate-y-1`).

## Prohibitions
- NO decorative blinking or pulsing dots beside headings, badges, or navigation links.
- NO `Sparkles` or decorative icon spam beside every heading or badge.
- NO decorative emoji usage across website UI, toasts, badges, or buttons.
- NO fabricated stats, star ratings, review counts, or false certification claims.
- NO gradient-clipped text headlines, neon glows, or background blur blobs.
- NO fake macOS window traffic-light dots or radar scanner HUD animations.
- NO purple/indigo SaaS colors.


