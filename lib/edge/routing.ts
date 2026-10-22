/**
 * Pure edge-routing decisions (host classification + redirect safety).
 * Shared by proxy.ts (clerk middleware) and unit tests.
 */

export interface HostClassification {
  /** Host is a KRA subdomain (kra.* or kra.akubrecah.com). */
  isKraSubdomain: boolean;
  /** Host is the admin subdomain (admin.* or admin.akubrecah.com). */
  isAdminSubdomain: boolean;
  /** Host is local development (localhost / 127.0.0.1). */
  isLocalhost: boolean;
  /** Host is a legacy *.vercel.app preview deployment. */
  isLegacyVercelHost: boolean;
}

export function classifyHost(rawHost: string): HostClassification {
  const host = (rawHost || '').toLowerCase();
  return {
    isKraSubdomain: host.startsWith('kra.') || host.includes('kra.akubrecah.com'),
    isAdminSubdomain: host.startsWith('admin.') || host.includes('admin.akubrecah.com'),
    isLocalhost: host.includes('localhost') || host.includes('127.0.0.1'),
    isLegacyVercelHost: host.includes('.vercel.app'),
  };
}

/**
 * Open-redirect guard: only same-origin relative paths are honoured.
 * Absolute URLs (https://evil.com), protocol-relative (//evil.com),
 * backslash tricks and scheme-containing strings are rejected.
 */
export function isSafeRedirectPath(redirectUrl: string): boolean {
  return (
    redirectUrl.startsWith('/') &&
    !redirectUrl.startsWith('//') &&
    !redirectUrl.includes('\\') &&
    !redirectUrl.includes(':')
  );
}

/**
 * Canonical production target for legacy *.vercel.app traffic:
 * admin hosts → admin.akubrecah.com, KRA/certificate hosts → kra.akubrecah.com,
 * everything else → the primary domain.
 */
export function canonicalTargetForLegacyVercelHost(rawHost: string): string {
  const host = (rawHost || '').toLowerCase();
  if (host.includes('admin')) {
    return 'https://admin.akubrecah.com';
  }
  if (host.includes('kra') || host.includes('certificate')) {
    return 'https://kra.akubrecah.com';
  }
  return 'https://akubrecah.com';
}
