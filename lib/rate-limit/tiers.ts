/**
 * Rate Limiting Tiers & Route Matchers
 * Defines request budgets per window based on endpoint abuse risk and criticality.
 */

export interface RateTier {
  limit: number;
  windowMs: number;
  tierKey: string;
}

export function getTierForRoute(pathname: string): RateTier {
  const windowMs = 60 * 1000; // 1 minute window

  // Tier 1: Internal Health & Liveness probes (1200 req/min)
  if (pathname.startsWith('/api/health')) {
    const limit = Number(process.env.RATE_LIMIT_HEALTH) || 1200;
    return { limit, windowMs, tierKey: 'health' };
  }

  // Tier 2: M-Pesa Payment Verification & Status Polling (180 req/min so 1s STK polling never hits 429)
  if (
    pathname.startsWith('/api/mpesa/verify') ||
    pathname.startsWith('/api/mpesa/status')
  ) {
    const limit = Number(process.env.RATE_LIMIT_MPESA_POLL) || 180;
    return { limit, windowMs, tierKey: 'mpesa_poll' };
  }

  // Tier 3: Financial STK Push triggers, file uploads, and browser automation (10 req/min)
  if (
    pathname.startsWith('/api/mpesa/stkpush') ||
    pathname.startsWith('/api/cyber/subscribe-web') ||
    pathname.startsWith('/api/kra/nil-return') ||
    pathname.startsWith('/api/kra/upload-id') ||
    pathname.startsWith('/api/admin/magic-login') ||
    pathname.startsWith('/api/inquiries')
  ) {
    const limit = Number(process.env.RATE_LIMIT_STRICT) || 10;
    return { limit, windowMs, tierKey: 'strict' };
  }

  // Tier 3: KRA Registry Lookups, Live Verification, and CAPTCHA Generation (30 req/min)
  if (
    pathname.startsWith('/api/kra/retrieve') ||
    pathname.startsWith('/api/kra/live-verify') ||
    pathname.startsWith('/api/kra/captcha') ||
    pathname.startsWith('/api/certificate/') ||
    pathname.startsWith('/api/admin/')
  ) {
    const limit = Number(process.env.RATE_LIMIT_LOOKUP) || 30;
    return { limit, windowMs, tierKey: 'lookup' };
  }

  // Tier 4: General API Routes (100 req/min)
  const limit = Number(process.env.RATE_LIMIT_GENERAL) || 100;
  return { limit, windowMs, tierKey: 'general' };
}
