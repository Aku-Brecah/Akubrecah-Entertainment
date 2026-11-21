import net from 'net';

/**
 * Maximum upstream response size (5 MB) for external HTTP/HTTPS fetches
 * to prevent memory-exhaustion DoS from unbounded upstream streams.
 */
export const MAX_UPSTREAM_RESPONSE_BYTES = 5 * 1024 * 1024;

/**
 * Cloud metadata hostnames and internal service domains that must never
 * be reachable from outbound server requests or proxy configurations.
 */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata',
  'instance-data',
  'kube-dns',
  'kubernetes.default',
  'kubernetes.default.svc',
]);

/**
 * Checks whether an IPv4 address belongs to a loopback, private, link-local,
 * carrier-grade NAT / Alibaba metadata, multicast, or unspecified range.
 */
function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network / unspecified)
  if (a === 0) return true;
  // 10.0.0.0/8 (RFC 1918 private)
  if (a === 10) return true;
  // 100.64.0.0/10 (Carrier-grade NAT & Alibaba Cloud metadata 100.100.100.200)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (Link-local & AWS/GCP/Azure/DigitalOcean IMDS 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 (RFC 1918 private)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.0.0.0/24 (IETF protocol assignments)
  if (a === 192 && b === 0 && parts[2] === 0) return true;
  // 192.168.0.0/16 (RFC 1918 private)
  if (a === 192 && b === 168) return true;
  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 224.0.0.0/4 (Multicast) and 240.0.0.0/4 (Reserved / broadcast)
  if (a >= 224) return true;

  return false;
}

/**
 * Checks whether an IPv6 address is loopback, unspecified, link-local,
 * unique-local (fc00::/7), or IPv4-mapped private/metadata.
 */
function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, '');

  if (normalized === '::1' || normalized === '::' || normalized === '0:0:0:0:0:0:0:1') {
    return true;
  }

  // IPv4-mapped IPv6 addresses (e.g., ::ffff:169.254.169.254 or ::ffff:127.0.0.1)
  if (normalized.startsWith('::ffff:')) {
    const ipv4Part = normalized.slice('::ffff:'.length);
    if (net.isIPv4(ipv4Part)) {
      return isBlockedIpv4(ipv4Part);
    }
  }

  // Unique local addresses (fc00::/7 -> fc00..fdff)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  // Link-local addresses (fe80::/10 -> fe8, fe9, fea, feb)
  if (/^fe[89ab]/i.test(normalized)) {
    return true;
  }

  // Multicast (ff00::/8)
  if (normalized.startsWith('ff')) {
    return true;
  }

  return false;
}

/**
 * Returns true if the given IP or hostname targets loopback, RFC1918 private
 * networks, link-local / cloud metadata endpoints (169.254.169.254), or
 * internal cluster domains.
 */
export function isPrivateOrMetadataHost(hostInput: string): boolean {
  if (!hostInput || typeof hostInput !== 'string') return true;

  const host = hostInput.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!host) return true;

  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    return true;
  }

  // Reject decimal/octal/hex integer IP encodings (e.g. 2130706433 or 0x7f000001)
  if (/^(?:0x[0-9a-f]+|\d+)$/i.test(host)) {
    return true;
  }

  const ipVersion = net.isIP(host);
  if (ipVersion === 4) {
    return isBlockedIpv4(host);
  }
  if (ipVersion === 6) {
    return isBlockedIpv6(host);
  }

  return false;
}

export interface SafeUrlOptions {
  /** Allow http: in addition to https: (default: false for webhooks, true for proxies) */
  allowHttp?: boolean;
  /** Optional explicit hostname allowlist */
  allowedHosts?: string[];
}

/**
 * Validates that a URL is well-formed, uses an explicitly permitted protocol,
 * does not contain embedded credentials (unless explicitly permitted for proxy use),
 * and does not target private networks, localhost, or cloud metadata services.
 */
export function isSafeExternalUrl(rawUrl: string, options: SafeUrlOptions = {}): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  const allowedProtocols = options.allowHttp ? ['https:', 'http:'] : ['https:'];
  if (!allowedProtocols.includes(parsed.protocol)) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!hostname) return false;

  if (isPrivateOrMetadataHost(hostname)) {
    return false;
  }

  if (options.allowedHosts && options.allowedHosts.length > 0) {
    const normalizedAllowed = options.allowedHosts.map((h) => h.toLowerCase());
    if (!normalizedAllowed.includes(hostname)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates an outbound HTTP/HTTPS proxy URL (e.g. KRA_PROXY_URL / PROXY_URL).
 * Rejects file:, gopher:, ws:, or private/loopback/cloud-metadata proxy targets.
 * Returns the validated URL string or null if unsafe/invalid.
 */
export function validateProxyUrl(rawProxyUrl: string | undefined): string | null {
  if (!rawProxyUrl || typeof rawProxyUrl !== 'string') return null;
  const trimmed = rawProxyUrl.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (isPrivateOrMetadataHost(hostname)) {
    return null;
  }

  return trimmed;
}
