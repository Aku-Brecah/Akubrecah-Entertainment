# Task Plan: Stitch Project Alignment & KRA Live Retrieval Integration

**Goal**: Align the KRA Certificate Retrieval portal with the exact Stitch project (`projects/9065784491639079515`) details, steps, layout, and copy while preserving the existing Tuscan Red aesthetic and ensuring live CAPTCHA loads genuinely from KRA without breaking payment, PDF generation, or data protection.

---

## 1. Analysis & Requirements

1. **CAPTCHA Loading**:
   - Must load genuinely from KRA iTax portal (`/KRA-Portal/pinChecker.htm?actionCode=loadPage&viewType=static` and `/KRA-Portal/GenerateCaptchaServlet.do?sourcePage=LOGIN&rand=...`).
   - Remove fake local math SVG generators.
   - If KRA upstream is offline or resetting, gracefully indicate upstream KRA connectivity status with instant reload/retry.

2. **Stitch 4-Step Progressive Stepper**:
   - **Step 1: Identify**:
     - Toggle between National ID and KRA PIN.
     - Single identity input with badge icon and format validation.
     - Live KRA CAPTCHA security stamp image + answer input + refresh button.
     - Mandatory statutory consent checkbox.
     - Primary button: "Verify Security Code" (advances to Step 2 upon verification).
     - Trust badges grid: Instant PDF delivery, M-Pesa KES 20 payment, Zero document storage.
     - Compliance guarantee banner with 256-bit SSL handshake badge.
   - **Step 2: Details**:
     - Identity verified alert banner.
     - Two-column read-only ledger grid: Taxpayer Name (KDPA masked), KRA PIN (masked), Taxpayer Type ("Individual"), Registration Status ("Active"), Tax Station, Obligation ("Income Tax - Resident Individual").
     - Privacy notice regarding unmasked unlock after payment.
     - Action buttons: "Back" to Step 1, "Continue to Address" to Step 3.
   - **Step 3: Address**:
     - Two-column grid: County, Town/City, Postal Address, Postal Code, Masked Email, Masked Mobile.
     - Dedicated Sub-card: "Registered Tax Obligations" table with obligation name, effective date, and compliant/active status.
     - Action buttons: "Back" to Step 2, "Continue to Download" to Step 4.
   - **Step 4: Download & Payment**:
     - Dual-column workspace (7 cols / 5 cols):
       - Left: Taxpayer summary grid + Encrypted document preview with unlock lock icon + State acceptance banner.
       - Right: "Pay via M-Pesa" panel (KES 20.00 fee badge, mobile number input, "Send STK Push" button, live waiting animation, Buy Goods Till 849201 manual entry + code verification).
   - **Step 5: Payment Success & Fulfillment**:
     - Instant certificate PDF download button, thermal receipt preview, WhatsApp delivery confirmation.

3. **Aesthetic Preservation**:
   - Retain Monolithic Modernism from `DESIGN.md` (Tuscan Red `#BA1A1A`, Obsidian Black surfaces, Inter font, WCAG AAA high contrast).
   - Preserve dark mode fidelity and light mode cleanly.

4. **Zero-Breaking-Changes & Security**:
   - Do not break existing Daraja STK push (`/api/mpesa/stkpush`), manual verification (`/api/mpesa/verify`), PDF generation (`/api/generate-certificate`), or Clerk auth.
   - Strictly maintain KDPA data masking pre-payment.

---

## 2. Implementation Vertical Slices

- **Slice 1 (KRA Captcha Endpoint)**: Restore genuine KRA CAPTCHA loading in `app/api/kra/captcha/route.ts` with correct referer, query parameters, proxy support, and clean error reporting.
- **Slice 2 (KRA Retrieval Endpoint)**: Enhance `app/api/kra/retrieve/route.ts` to properly handle live KRA CAPTCHA verification, DWR resolution, and resilient fallback when upstream is in maintenance.
- **Slice 3 (Portal Component UI & Stepper)**: Rebuild `components/kra-portal.tsx` to match the exact 4-step Stitch sequence, typography, cards, and copy with Tuscan Red aesthetic.
- **Slice 4 (Portal Page Container)**: Update `app/retrieval-portal/page.tsx` to host the centered Stitch layout cleanly above the fold.
- **Slice 5 (Verification & Testing)**: Run TypeScript typecheck, test API endpoints, and verify end-to-end user journeys.
