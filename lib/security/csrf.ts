import { NextRequest } from 'next/server';

/**
 * State-changing HTTP methods that require Origin / Sec-Fetch-Site CSRF validation
 * when invoked from a browser context.
 */
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Server-to-server webhook endpoints that authenticate via cryptographic signatures,
 * HMAC secrets, or provider callback tokens rather than browser session cookies.
 */
const CSRF_EXEMPT_PATH_PREFIXES = [
  '/api/mpesa/callback',
  '/api/whatsapp/webhook',
  '/api/whatsapp/chat',
  '/api/generate-certificate',
];

/**
 * Builds the set of trusted origins allowed to issue state-changing browser requests.
 */
export function getTrustedOrigins(requestHost?: string | null): Set<string> {
  const origins = new Set<string>([
    'https://akubrecah.com',
    'https://www.akubrecah.com',
    'https://kra.akubrecah.com',
  ]);

  const envUrls = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_KRA_PORTAL_URL,
  ];

  for (const raw of envUrls) {
    if (!raw) continue;
    try {
      origins.add(new URL(raw).origin.toLowerCase());
    } catch {
      // Ignore malformed env URL
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
    origins.add('http://kra.localhost:3000');
  }

  if (requestHost) {
    const cleanHost = requestHost.trim().toLowerCase();
    origins.add(`https://${cleanHost}`);
    if (process.env.NODE_ENV !== 'production' || cleanHost.startsWith('localhost') || cleanHost.startsWith('127.0.0.1')) {
      origins.add(`http://${cleanHost}`);
    }
  }

  return origins;
}

export interface CsrfValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Validates state-changing API requests against Cross-Site Request Forgery (CSRF)
 * using Fetch Metadata (`Sec-Fetch-Site`) and `Origin` header verification.
 */
export function validateCsrfRequest(req: NextRequest): CsrfValidationResult {
  const method = req.method.toUpperCase();
  if (!STATE_CHANGING_METHODS.has(method)) {
    return { allowed: true };
  }

  const pathname = req.nextUrl.pathname;
  if (!pathname.startsWith('/api/')) {
    return { allowed: true };
  }

  for (const prefix of CSRF_EXEMPT_PATH_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return { allowed: true };
    }
  }

  const originHeader = req.headers.get('origin');
  const secFetchSite = req.headers.get('sec-fetch-site')?.toLowerCase();
  const hostHeader = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;

  // 1. Modern browsers send Sec-Fetch-Site on all fetch/XHR/form submissions.
  // Reject explicit cross-site requests unless the Origin is one of our trusted multi-domain origins.
  if (secFetchSite === 'cross-site') {
    if (!originHeader) {
      return {
        allowed: false,
        reason: 'Cross-site state-changing request blocked (Sec-Fetch-Site: cross-site without trusted Origin).',
      };
    }
  }

  // 2. If Origin header is present, verify it matches our trusted origins or the request host.
  if (originHeader) {
    if (originHeader === 'null') {
      return {
        allowed: false,
        reason: 'Sandboxed null Origin rejected on state-changing request.',
      };
    }

    let parsedOrigin: string;
    try {
      parsedOrigin = new URL(originHeader).origin.toLowerCase();
    } catch {
      return {
        allowed: false,
        reason: 'Malformed Origin header on state-changing request.',
      };
    }

    const trustedOrigins = getTrustedOrigins(hostHeader);
    if (!trustedOrigins.has(parsedOrigin)) {
      return {
        allowed: false,
        reason: `Untrusted Origin '${parsedOrigin}' rejected by CSRF policy.`,
      };
    }
  }

  return { allowed: true };
}
