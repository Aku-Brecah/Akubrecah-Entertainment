---
name: govtech-ui-refinement
description: End-to-end GovTech portal & admin UI refinement workflow covering surface-token color blending, responsive full-width stretched action controls, zero-storage compliance UI, emoji hygiene, and build verification.
when_to_use: "When fixing layout overlap/wrapping inside narrow checkout columns or portal cards, harmonizing light/dark background & card color blending in globals.css, enforcing zero-PDF-storage admin UIs, or cleaning decorative emojis across Next.js Tailwind UIs. NOT for greenfield app scaffolding (use app-builder) or backend-only API changes."
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
version: 1.0.0
effort: medium
---

# GovTech UI Refinement — Blending, Responsive Stretch & Portal Hygiene

> Harmonize surface elevation first, stretch constrained interactive controls across their container width, and eliminate visual clutter before shipping.

## Overview

This skill captures the repeatable workflow for refining multi-column transactional portals and admin consoles built with Tailwind CSS and custom CSS surface tokens (`surface`, `surface-container-*`, `outline-variant`). It resolves background-to-card blending issues, button border overlaps in split panes, and UI policy/emoji hygiene regressions.

## When to Use

- Good for: Color blending mismatches between page canvas and nested cards (`globals.css` `:root` / `.dark` surface tokens), `"Change Phone"` or secondary CTA buttons wrapping/overlapping borders inside split-column checkout cards, full-width header/workspace alignment, zero-storage admin audit views, and decorative emoji removal.
- Not for: New page creation from scratch (use `frontend-design` / `app-builder`) or database migrations.

## Protocol

### Step 1: Audit Surface Tokens & Blending (`app/globals.css`)

1. Ensure the light and dark surface scales form a clear monotonic tonal ladder from page background to elevated cards and recessed wells:
   - `:root`: keep `--surface` softly off-white (`#f8fafc`), `--surface-container-lowest` pure white (`#ffffff`) for primary cards, and `--surface-container-low` / `--surface-container` for nested inset containers with soft `--outline-variant` (`#e2e8f0`).
   - `.dark`: keep `--surface`, `--surface-container-lowest`, `--surface-container-low`, `--surface-container`, and `--outline-variant` on one unified dark slate/graphite hue family (never mix warm neutral `zinc` hexes with cool `slate` hexes across adjacent layers).
2. Remove raw `bg-white dark:bg-zinc-900`, `bg-zinc-100 dark:bg-zinc-800`, and stark tinted boxes inside semantic cards in favor of `bg-surface-container-lowest` and `bg-surface-container-low/80` with `border-outline-variant/80`.

### Step 2: Fix Constrained Column Wrapping & Border Overlap

1. Never place two `whitespace-nowrap` action buttons side-by-side inside a narrow split-column card (`lg:col-span-5` or similar) where long labels exceed half the container width.
2. Stack action groups vertically inside split panes (`flex flex-col gap-2.5 w-full`) and give each primary/secondary CTA `w-full justify-center min-h-[44px]` so controls stretch evenly across the view without clipping or overlapping card borders.
3. Flatten double-nested borders (`border` inside `border` + extra `p-4 sm:p-5`) inside checkout sub-panels to recover horizontal breathing room (`min-w-0` on flex/grid children, `sm:grid-cols-2` on summary strips).
4. Stretch navigation `<header>` inner wrappers (`w-full max-w-none px-4 sm:px-6 lg:px-10`) when full-bleed portal/admin bars are requested.

### Step 3: Enforce Zero-Storage & Clean UI Hygiene

1. On admin audit dashboards where documents must never be stored, remove cached-registry download tabs/columns/buttons and display only immutable order/payment telemetry.
2. Scan UI components and API alert strings (`app/`, `components/`, `lib/` excluding intentional chat bot payloads if tested) for stray decorative emojis or `✕` glyphs and replace UI icons with crisp Lucide or inline SVG icons.

### Step 4: Verify Before Shipping

Run the full verification gate after edits:
1. `npm run typecheck`
2. `npm run lint -- --quiet`
3. `npm test`
4. `npm run build`

## Verification Checklist

- [ ] Light and dark tokens in `app/globals.css` share a monotonic palette with zero hue clash.
- [ ] All CTAs in constrained checkout columns stretch cleanly (`w-full justify-center`) with `overflow-hidden` / `min-w-0` guards and never cross container borders.
- [ ] Typecheck, lint, test suite, and Next.js production build all exit with status `0`.
