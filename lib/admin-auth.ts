import { log } from '@/lib/monitoring/logger';
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { verifyAdminMagicToken } from "./magic-token";

export interface AdminCaller {
  userId: string;
  email: string;
  role: string;
}

/**
 * Universal Admin Authentication Verifier
 * Supports:
 * 1. Master PIN header (x-admin-pin) — value MUST come from ADMIN_BOT_PIN env
 * 2. Service secret (x-service-secret) — value MUST come from env
 * 3. WhatsApp / Passcode magic cookie (admin_magic_auth)
 * 4. Clerk session (Super Admin email / role metadata)
 *
 * Security notes:
 * - Secrets are accepted via headers ONLY (never query parameters — they leak
 *   into access logs, browser history and referrers).
 * - No hardcoded fallback secrets: if the env vars are unset, auth fails closed.
 * - Comparisons are timing-safe.
 */
import crypto from 'crypto';

/** Constant-time string comparison (safe for secrets of differing length). */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // Still burn comparable time before returning false.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export { safeCompare };

export function isSuperAdminCaller(admin: AdminCaller | null | undefined): boolean {
  if (!admin) return false;
  return admin.role === "Super Admin";
}

const MAX_FAILED_ADMIN_ATTEMPTS = 5;
const ADMIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

interface AdminAttemptEntry {
  failures: number;
  lockedUntil: number;
}

const failedAdminAuthByIp = new Map<string, AdminAttemptEntry>();

function getRequestIpKey(req: NextRequest): string {
  const cf = req.headers.get("cf-connecting-ip");
  const realIp = req.headers.get("x-real-ip");
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (cf || realIp || xff || "unknown").trim();
}

export function isIpLockedOutFromAdminAuth(ipKey: string, now = Date.now()): boolean {
  const entry = failedAdminAuthByIp.get(ipKey);
  if (!entry) return false;
  if (entry.lockedUntil > now) return true;
  if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
    failedAdminAuthByIp.delete(ipKey);
  }
  return false;
}

function recordFailedAdminAuthAttempt(ipKey: string, now = Date.now()): void {
  const existing = failedAdminAuthByIp.get(ipKey) || { failures: 0, lockedUntil: 0 };
  const failures = existing.failures + 1;
  const lockedUntil = failures >= MAX_FAILED_ADMIN_ATTEMPTS ? now + ADMIN_LOCKOUT_MS : 0;
  failedAdminAuthByIp.set(ipKey, { failures, lockedUntil });
}

function clearFailedAdminAuthAttempts(ipKey: string): void {
  failedAdminAuthByIp.delete(ipKey);
}

export function resetAdminAuthLockoutForTests(): void {
  failedAdminAuthByIp.clear();
}

export async function verifyAdminCaller(req?: NextRequest): Promise<AdminCaller | null> {
  // 1. Check direct PIN header (no query params — headers only)
  if (req) {
    const ipKey = getRequestIpKey(req);
    if (isIpLockedOutFromAdminAuth(ipKey)) {
      log.warn("[verifyAdminCaller] Blocked admin auth attempt from locked-out IP", { ipKey });
      return null;
    }

    let attemptedHeaderOrCookieCred = false;

    const providedPin = req.headers.get("x-admin-pin");
    const expectedPin = process.env.ADMIN_BOT_PIN || "";
    if (providedPin) {
      attemptedHeaderOrCookieCred = true;
      if (expectedPin && safeCompare(providedPin, expectedPin)) {
        clearFailedAdminAuthAttempts(ipKey);
        return { userId: "admin_pin_user", email: "admin@akubrecah.co.ke", role: "Super Admin" };
      }
    }

    // 2. Check service secret (headers only, env-configured, timing-safe)
    // SECURITY: only the dedicated webhook secret may act as a service
    // credential. EVOLUTION_API_KEY is a low-trust integration key and must
    // never grant Super Admin access to the site.
    const serviceSecret = req.headers.get("x-service-secret");
    const expectedServiceSecret = process.env.EVOLUTION_WEBHOOK_SECRET || "";
    if (serviceSecret) {
      attemptedHeaderOrCookieCred = true;
      if (expectedServiceSecret && safeCompare(serviceSecret, expectedServiceSecret)) {
        clearFailedAdminAuthAttempts(ipKey);
        return { userId: "service_admin", email: "admin@akubrecah.co.ke", role: "Super Admin" };
      }
    }

    // 3. Check WhatsApp / Passcode Magic Cookie
    const magicCookie = req.cookies.get("admin_magic_auth")?.value;
    if (magicCookie) {
      attemptedHeaderOrCookieCred = true;
      const verified = verifyAdminMagicToken(magicCookie);
      if (verified) {
        clearFailedAdminAuthAttempts(ipKey);
        return { userId: "wa_admin_" + verified.phone, email: "admin@akubrecah.co.ke", role: "Super Admin" };
      }
    }

    if (attemptedHeaderOrCookieCred) {
      recordFailedAdminAuthAttempt(ipKey);
    }
  }

  // 4. Check Clerk authentication
  try {
    const { userId } = await auth();
    if (userId) {
      const client = await clerkClient();
      const currentUser = await client.users.getUser(userId);
      const email = currentUser.primaryEmailAddress?.emailAddress?.toLowerCase() || "";
      // SECURITY: no default role. A user without explicit role metadata is a
      // normal taxpayer and must never be granted admin access.
      const role = (currentUser.publicMetadata?.role as string) || "";
      const configAdminEmail = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
      const configPublicAdminEmail = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || '').trim().toLowerCase();

      const isConfiguredSuperAdmin =
        Boolean(email) &&
        ((Boolean(configAdminEmail) && email === configAdminEmail) ||
          (Boolean(configPublicAdminEmail) && email === configPublicAdminEmail));

      if (isConfiguredSuperAdmin || role === "Super Admin" || role === "Admin") {
        return {
          userId,
          email: email || "admin@akubrecah.co.ke",
          role: isConfiguredSuperAdmin ? "Super Admin" : role,
        };
      }
    }
  } catch (err: any) {
    log.error("[verifyAdminCaller] Clerk check error:", err?.message);
  }

  return null;
}
