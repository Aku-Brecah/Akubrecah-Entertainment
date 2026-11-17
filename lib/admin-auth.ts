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

export async function verifyAdminCaller(req?: NextRequest): Promise<AdminCaller | null> {
  // 1. Check direct PIN header (no query params — headers only)
  if (req) {
    const providedPin = req.headers.get("x-admin-pin");
    const expectedPin = process.env.ADMIN_BOT_PIN || "";
    if (providedPin && expectedPin && safeCompare(providedPin, expectedPin)) {
      return { userId: "admin_pin_user", email: "admin@akubrecah.co.ke", role: "Super Admin" };
    }

    // 2. Check service secret (headers only, env-configured, timing-safe)
    // SECURITY: only the dedicated webhook secret may act as a service
    // credential. EVOLUTION_API_KEY is a low-trust integration key and must
    // never grant Super Admin access to the site.
    const serviceSecret = req.headers.get("x-service-secret");
    const expectedServiceSecret = process.env.EVOLUTION_WEBHOOK_SECRET || "";
    if (serviceSecret && expectedServiceSecret && safeCompare(serviceSecret, expectedServiceSecret)) {
      return { userId: "service_admin", email: "admin@akubrecah.co.ke", role: "Super Admin" };
    }

    // 3. Check WhatsApp / Passcode Magic Cookie
    const magicCookie = req.cookies.get("admin_magic_auth")?.value;
    if (magicCookie) {
      const verified = verifyAdminMagicToken(magicCookie);
      if (verified) {
        return { userId: "wa_admin_" + verified.phone, email: "admin@akubrecah.co.ke", role: "Super Admin" };
      }
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
