---
version: 1.1.0
name: Akubrecah Entertainment - Monolithic Modernism
description: "Single source of truth design system for Akubrecah Entertainment, KRA statutory compliance portal, and high-conversion interactive digital platforms."
brand: "Akubrecah Entertainment (Design | Print | Brand | Tech)"
colors:
  # Official Brand Book Colors
  primary: "#BA1A1A"                 # Tuscan Red (Authority, Legal Precision, Action)
  primary-hover: "#9C1414"           # Deep Tuscan Crimson
  primary-muted: "#FDE8E8"           # Light red tint
  primary-container: "#FFDAD6"       # Soft container background
  on-primary: "#FFFFFF"              # Pure White contrast
  on-primary-container: "#410002"    # High-contrast deep maroon
  
  # Monolithic Surfaces & Backdrops
  surface: "#FFFFFF"                 # Pure White
  surface-card: "#FFFFFF"            # High-contrast white card
  surface-card-subtle: "#F4F4F5"     # Chalk White (#F4F4F5 from Brand Book)
  surface-dark: "#0F172A"            # Obsidian Black (#0F172A from Brand Book)
  surface-dark-card: "#1E293B"       # Slate Obsidian Card
  surface-dark-elevated: "#161F36"   # Deep elevated monolith
  neutral: "#0F172A"                 # Obsidian Black
  neutral-muted: "#475569"           # Slate Gray
  neutral-subtle: "#94A3B8"          # Cool Gray
  border: "#E2E8F0"                  # Border Light
  border-dark: "#334155"             # Border Obsidian
  
  # Logo Accent Hues (Design | Print | Brand)
  accent-design: "#BA1A1A"           # Tuscan Red ("Design")
  accent-print: "#00C2FF"            # Cyan High-Voltage ("Print")
  accent-brand: "#10B981"            # Emerald Verification ("Brand")
  
  # Status Hues
  success: "#16A34A"
  success-bg: "#DCFCE7"
  warning: "#D97706"
  warning-bg: "#FEF3C7"
  error: "#DC2626"
  error-bg: "#FEE2E2"

typography:
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  headline-2xl: { fontSize: "48px", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.04em" }
  headline-xl: { fontSize: "36px", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.03em" }
  headline-lg: { fontSize: "28px", fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.025em" }
  headline-md: { fontSize: "20px", fontWeight: 700, lineHeight: 1.3, letterSpacing: "-0.02em" }
  body-lg: { fontSize: "16px", fontWeight: 500, lineHeight: 1.5 }
  body-md: { fontSize: "14px", fontWeight: 400, lineHeight: 1.5 }
  body-sm: { fontSize: "12px", fontWeight: 400, lineHeight: 1.4 }
  label-md: { fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em" }
  label-sm: { fontSize: "11px", fontWeight: 600, letterSpacing: "0.02em" }

rounded:
  sharp: "2px"
  sm: "6px"
  md: "10px"
  lg: "16px"
  xl: "24px"
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
    rounded: "{rounded.md}"
    border: "1px solid {colors.border}"
    height: "44px"
    fontSize: "14px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    height: "44px"
---

# Akubrecah Entertainment - Brand Specification & Design System

## Overview
**Akubrecah Entertainment** bridges high-precision digital engineering, statutory GovTech automation, and bold creative brand production.
Guided by the brand ethos: *"Engineering digital products that scale — Design · Print · Brand · Tech"*, this design specification defines our visual language, interactive behaviors, social proof credibility, and conversion mechanics.

## Brand Book Alignment & Color Hierarchy
1. **Tuscan Red (`#BA1A1A`)**: Primary brand color. Expresses statutory authority, decisive energy, and tactile call-to-action power.
2. **Obsidian Black (`#0F172A`)**: Primary dark-mode backdrop and monolithic ground. Creates high-contrast depth, inspired by Page 1 server monoliths.
3. **Chalk White (`#F4F4F5`)**: Soft neutral light surface providing high legibility without harsh glare.
4. **Pure White (`#FFFFFF`)**: High-contrast foreground and bright card base.
5. **Logo Kinetic Accents**:
   - **Print Cyan (`#00C2FF`)**: Digital conduits, circuit telemetry pulses, live latency indicators.
   - **Brand Emerald (`#10B981`)**: Verified badges, 5-star ratings, active M-Pesa STK push success states.
6. **Strict Purple Ban**: Violet, purple, and magenta gradients are strictly forbidden across all touchpoints.

## Typography
- Primary Typeface: **Inter** (weights: 400, 500, 600, 700, 800, 900).
- Monospace Tabular Figures: Used for PIN numbers, M-Pesa receipts, and real-time live telemetry metrics.
- High Contrast Ratio: Exceeds WCAG AAA (7:1) for body copy and WCAG AA (4.5:1) for secondary metadata.

## Interactive Philosophy & Conversion Drivers
1. **Monolithic Solidity & Circuit Depth**:
   - Multi-layered layout: deep dark backdrop, illuminated geometric traces, subtle glowing conduits.
   - Tangible hardware-like controls: tactile feedback on buttons, active scale transforms, and border highlights.
2. **Interactive System Sandbox (Scope Estimator)**:
   - Dynamic real-time configurator allowing visitors to select services, project scales, and infrastructure features to receive instant architecture estimates.
   - Increases user dwell time, click depth, and warm lead qualification.
3. **Dynamic Social Proof & Review Engine**:
   - High-visibility 4.9★ rating aggregate with verified client testimonials across GovTech, Cyber Cafes, and Enterprise clients.
   - Real-time "Write a Review" interactive modal enabling visitors to rate their experience, reinforcing brand community and social trust.
4. **Frictionless Magnetic CTAs**:
   - Fitts' law compliant 48px+ touch targets.
   - 1-click KRA certificate search shortcuts, direct WhatsApp bot access, and project consultation triggers.

## Minimalist Aesthetics & Iconography Standards
1. **Restrained Functional Iconography**:
   - Icons must be functional signposts (e.g. directional arrows `ArrowRight`, search `Search`, external links `ExternalLink`, download `Download`).
   - Strictly prohibit decorative icon spamming beside every single bullet point, card heading, or dropdown menu item.
   - Text should carry visual hierarchy, supported by whitespace and typography scale rather than iconography crutches.
2. **Strict Emoji Ban in UI**:
   - Zero decorative emojis in toasts, alerts, badges, headers, or buttons.
   - Professional, sober, and authoritative GovTech and enterprise product language.
3. **Authentic Metric Governance**:
   - Never fabricate customer review counts, star ratings, certificate totals, or uptime stats.
   - Ground all statements in real product capabilities, factual service descriptions, and verified system behavior.
4. **Solid High-Contrast Typography**:
   - Solid `#0F172A` / `#FFFFFF` headlines; strictly avoid decorative text-gradient masks and low-contrast faded copy.
   - Clean, uncluttered backgrounds without floating glowing blur circles or decorative circuit lines behind text.

## Prohibitions
- NO decorative emoji usage across website UI, toasts, badges, or buttons.
- NO icon spam (do not place an icon on every single list item or card header).
- NO fabricated stats, star ratings, review counts, or false certification claims.
- NO gradient-clipped text headlines or distracting background blur blobs.
- NO generic AI "hero split" (Left text / right stock image).
- NO purple/indigo SaaS gradient clichés.
- NO static, unresponsive buttons without active states.
- NO hidden or washed-out typography with contrast under 4.5:1.

