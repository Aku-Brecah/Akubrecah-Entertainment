import { NextRequest } from 'next/server';

/**
 * Robust Client IP Extraction & Normalization
 * Supports Cloudflare, Vercel, Nginx, Caddy, and direct reverse proxy headers.
 */

export function extractClientIp(req: NextRequest | Request): string {
  const headers = req.headers;

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
