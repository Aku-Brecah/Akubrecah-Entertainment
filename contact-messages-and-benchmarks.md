# Implementation Plan: Remove Engineering Benchmarks & Production-Ready Contact Message Management

**Status:** In Progress  
**Branch:** `feature/contact-messages-and-benchmarks`  
**Parent Agent:** `orchestrator`  

## 1. Overview
Remove the "Engineering Benchmarks" section from `/services` while maintaining responsive visual harmony, and build a production-grade Contact Message Management System (Admin Inbox, Message Details, Status Management, Internal Notes, Email Reply Engine, and Multi-form persistence).

## 2. Vertical Slices

- [ ] **Slice 1: Remove "Engineering Benchmarks" Section**
  - [ ] Remove benchmark card and stats in `app/services/page.tsx`.
  - [ ] Rebalance layout to clean 2-column or full-width service presentation.
  - [ ] Fix `/contact` link in `components/site-footer.tsx`.

- [ ] **Slice 2: Database Schema & Backend Extensions**
  - [ ] Extend `Inquiry` in `prisma/schema.prisma` with `subject` and `isRead`.
  - [ ] Add `InquiryReply` model for persistent outgoing responses.
  - [ ] Execute `npx prisma db push` and `npx prisma generate`.

- [ ] **Slice 3: Public Form Integration & Validation**
  - [ ] Upgrade `app/api/inquiries/route.ts` with rate limiting, XSS sanitization, and `subject` support.
  - [ ] Update `app/contact/page.tsx` with enhanced feedback, subject selector, and duplicate submission prevention.

- [ ] **Slice 4: Email Reply Delivery Engine**
  - [ ] Implement `lib/email/reply.ts` with SMTP/Mailcow support, headers sanitization, and fallback error handling.
  - [ ] Connect reply dispatch to `InquiryReply` persistence.

- [ ] **Slice 5: Enterprise Admin Inbox UI & Management**
  - [ ] Update `app/api/admin/inquiries/route.ts` with unread counts, delete, read/unread toggles, and reply history.
  - [ ] Redesign `app/admin/inquiries/page.tsx` with master-detail inbox, unread badges, filter tabs, note threads, and live email reply composer.
  - [ ] Update `app/admin/layout.tsx` navigation to "Messages & Inbox" with live unread counter.

- [ ] **Slice 6: Automated Testing & Verification**
  - [ ] Write unit & integration tests in `tests/messages.test.ts`.
  - [ ] Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
