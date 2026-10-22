import { log } from '@/lib/monitoring/logger';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

/**
 * Robust Client IP Extraction & Normalization
 *
 * Trust model:
 * - Headers like cf-connecting-ip / x-real-ip / x-forwarded-for are only
 *   CLIENT-SUPPLIED when requests reach the app directly (origin scan) or via
 *   a pass-through Caddy. Trusting them unconditionally lets an attacker
 *   rotate fake IPs and bypass every rate-limit tier.
 * - We therefore only honour privileged headers when the request carries the
 *   shared secret Caddy injects via `header_up X-Internal-Proxy-Secret`.
 * - When INTERNAL_PROXY_SECRET is not configured at all (dev server, Vercel
 *   edge — where x-forwarded-for is edge-set and non-spoofable), we fall back
 *   to the legacy behaviour so nothing silently collapses into one bucket.
 * - When the secret IS configured but the header is missing/mismatched
 *   (a direct origin hit), all callers share one fallback bucket: rate limits
 *   cannot be bypassed by IP spoofing.
 */

/** Warn once about a missing proxy secret instead of spamming per request. */
let warnedMissingSecret = false;

/** Constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function extractClientIp(req: NextRequest | Request): string {
  const headers = req.headers;

  // Vercel edge sets its own non-spoofable geo headers; XFF there is edge-controlled.
  const onVercel = Boolean(headers.get('x-vercel-ip-country') || headers.get('x-vercel-ip-city'));

  const internalSecret = process.env.INTERNAL_PROXY_SECRET || '';
  const providedSecret = headers.get('x-internal-proxy-secret') || '';

  if (internalSecret) {
    const fromTrustedProxy = providedSecret && safeEqual(providedSecret, internalSecret);

    if (!fromTrustedProxy) {
      // Secret configured but this request didn't traverse the trusted proxy —
      // a direct origin hit. Give every such request one shared identity so
      // headers cannot be used to mint fresh rate-limit identities.
      return 'untrusted-shared-bucket';
    }

    if (onVercel) {
      // Vercel chain: edge already set XFF correctly.
      const vercelForwarded = headers.get('x-forwarded-for');
      const candidate = vercelForwarded?.split(',')[0]?.trim();
      if (candidate && isValidIp(candidate)) return normalizeIp(candidate);
    }
  }
  if (!internalSecret && !onVercel) {
    // Headers like cf-connecting-ip are attacker-controllable here. Fail
    // closed in production: every direct-origin caller shares one bucket so
    // rate limits keep their teeth instead of letting IP rotation mint
    // unlimited identities. Dev keeps legacy header behaviour for DX, and a
    // self-host that explicitly opts in via RATE_LIMIT_TRUST_HEADERS=1
    // preserves the previous behaviour with a loud flag.
    if (process.env.NODE_ENV === 'production' && process.env.RATE_LIMIT_TRUST_HEADERS !== '1') {
      if (!warnedMissingSecret) {
        log.error('[rate-limit] INTERNAL_PROXY_SECRET not set in production — failing closed: proxy headers treated as untrusted. Set INTERNAL_PROXY_SECRET (via Caddy) or RATE_LIMIT_TRUST_HEADERS=1 to opt in explicitly.');
        warnedMissingSecret = true;
      }
      return 'untrusted-shared-bucket';
    }
    if (!warnedMissingSecret && process.env.NODE_ENV === 'production') {
      log.warn('[rate-limit] RATE_LIMIT_TRUST_HEADERS=1 — proxy headers trusted by explicit opt-in (insecure)');
      warnedMissingSecret = true;
    }
  }

  // 1. Cloudflare connecting IP
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp && isValidIp(cfIp)) {
    return normalizeIp(cfIp);
  }

  // 2. Vercel / True-Client-IP
  const trueClientIp = headers.get('true-client-ip');
  if (trueClientIp && isValidIp(trueClientIp)) {
    return normalizeIp(trueClientIp);
  }

  // 3. X-Real-IP
  const realIp = headers.get('x-real-ip');
  if (realIp && isValidIp(realIp)) {
    return normalizeIp(realIp);
  }

  // 4. X-Forwarded-For (take the first client IP)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const candidate = forwardedFor.split(',')[0]?.trim();
    if (candidate && isValidIp(candidate)) {
      return normalizeIp(candidate);
    }
  }

  return '127.0.0.1';
}

function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  // Basic sanity check against path injection or script injection
  if (ip.length > 45 || ip.includes('<') || ip.includes('>') || ip.includes(' ')) return false;
  return true;
}

function normalizeIp(ip: string): string {
  const trimmed = ip.trim();
  // Normalize IPv6 localhost
  if (trimmed === '::1' || trimmed === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  // Strip IPv6-mapped IPv4 prefix
  if (trimmed.startsWith('::ffff:')) {
    return trimmed.substring(7);
  }
  // Strip port if present in IPv4 (e.g. 192.168.1.1:8080)
  if (trimmed.includes('.') && trimmed.includes(':')) {
    return trimmed.split(':')[0];
  }
  return trimmed;
}
