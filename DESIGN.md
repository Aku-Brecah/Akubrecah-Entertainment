---
title: "Akubrecah — 'Softly' Digital Wellness & Tactile Living Room Design System"
version: "2.0.0"
status: "Active Production Design Specification (Branch: design/softly-theme)"
brand: "Akubrecah (Softly Digital Wellness Theme)"
colors:
  background: "#FDFCF8"
  sage: "#E8EFE8"
  lavender: "#EFEDF4"
  coral: "#FFB7B2"
  blob_rose: "#FFE4E1"
  blob_lavender: "#E6E6FA"
  dark_text: "#292524"
  muted_text: "#78716C"
  white: "#FFFFFF"
typography:
  font_sans: "Outfit, system-ui, -apple-system, sans-serif"
  font_cursive: "Reenie Beanie, cursive"
  font_mono: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
  scale:
    display_hero: "72px (4.5rem) / line-height 1.05 / letter-spacing -0.025em / weight 500"
    h1: "48px (3rem) / line-height 1.1 / letter-spacing -0.025em / weight 500"
    h2: "36px (2.25rem) / line-height 1.15 / letter-spacing -0.025em / weight 500"
    h3: "22px (1.375rem) / line-height 1.3 / weight 500"
    body_lg: "18px (1.125rem) / line-height 1.65 / weight 400"
    body: "15px (0.9375rem) / line-height 1.65 / weight 400"
    cursive_accent: "24px-84px / Reenie Beanie / weight 400"
rounded:
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px (2rem)"
  2xl: "40px (2.5rem)"
  3xl: "48px (3rem)"
  4xl: "64px (4rem)"
  full: "9999px"
---

# DESIGN.md — 'Softly' Digital Wellness Visual System

## 1. Visual Philosophy & Aesthetic Essence
The **Softly** theme transforms the entire application into a **"digital living room"**—minimalist, tactile, warm, and intentionally calm. It pairs **Digital Minimalism** with **Gen-Z Lifestyle** warmth while preserving 100% of Akubrecah's engineering and GovTech compliance functionality.

## 2. Color System
- **Primary Background (`#FDFCF8`)**: Warm alabaster paper tone that eliminates screen glare.
- **Sage (`#E8EFE8`)**: Desaturated botanical pastel for secondary containers and phone screen previews.
- **Lavender (`#EFEDF4`)**: Calm pastel tone for complementary cards and layered previews.
- **Peach / Coral (`#FFB7B2`)**: Primary accent for pill buttons, circular brand dot indicators, and interactive highlights.
- **Soft-Black Text (`#292524`)**: Warm dark stone for headings, body copy, and high-contrast pill CTAs.
- **Muted Text (`#78716C`)**: Warm stone-500 for descriptions, timestamps, and secondary metadata.

## 3. Typography
- **Primary Sans (`Outfit`)**: Clean, rounded geometric sans-serif used across all headings, navigation (`14px Outfit Medium`), and interface controls. Headings use sentence-case and tight tracking (`-0.025em`).
- **Expressive Cursive (`Reenie Beanie`)**: Handwritten cursive accent used for hero emphasis words, diary testimonial signatures (`24px stone-500` after a `32px` horizontal line), and editorial margin notes.

## 4. Visual Depth, Texture & Motion
- **Global Grain Overlay**: Fixed viewport overlay (`z-index: 50`, `pointer-events: none`, `mix-blend-mode: overlay`, `opacity: 0.35`) powered by an SVG `feTurbulence` filter (`baseFrequency="0.65"`).
- **Container Geometry**: `2rem` to `4rem` (`32px`–`64px`) border-radius on containers and cards, with `0 4px 20px -2px rgba(0,0,0,0.05)` soft shadows.
- **Fluid Low-Velocity Motion**:
  - `reveal-on-scroll`: `translateY(30px)` to `0`, `opacity: 0` to `1`, `duration: 0.8s`.
  - Floating background blobs (`#FFE4E1` and `#E6E6FA` at `60%` opacity): `6s` infinite loop (`translateY(-10px)` to `translateY(10px)`).
