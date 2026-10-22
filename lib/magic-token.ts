import crypto from 'crypto';

/**
 * The HMAC secret for admin magic tokens. No hardcoded fallback: if neither
 * JWT_SECRET nor ENCRYPTION_KEY is configured, token creation/verification
 * fails closed instead of accepting forgeries with a public default key.
 */
function getMagicSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET or ENCRYPTION_KEY (>=16 chars) must be configured for admin magic tokens');
  }
  return secret;
}

export interface MagicTokenPayload {
  phone: string;
  role: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Generate a signed, tamper-proof magic token (default validity: 4 hours)
 */
export function createAdminMagicToken(phone: string, durationMinutes = 240): string {
  const payload: MagicTokenPayload = {
    phone,
    role: 'Super Admin',
    createdAt: Date.now(),
    expiresAt: Date.now() + durationMinutes * 60 * 1000,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getMagicSecret())
    .update(payloadBase64)
    .digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/** Constant-time signature comparison. */
function signaturesMatch(provided: string, expected: string): boolean {
  const bufA = Buffer.from(provided);
  const bufB = Buffer.from(expected);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify signature and expiration of an admin magic token
 */
export function verifyAdminMagicToken(token: string): MagicTokenPayload | null {
  try {
    if (!token || !token.includes('.')) return null;
    const [payloadBase64, signature] = token.split('.');

    const expectedSignature = crypto
      .createHmac('sha256', getMagicSecret())
      .update(payloadBase64)
      .digest('base64url');

    if (!signaturesMatch(signature, expectedSignature)) {
      return null;
    }

    const payload: MagicTokenPayload = JSON.parse(
      Buffer.from(payloadBase64, 'base64url').toString('utf-8')
    );

    if (Date.now() > payload.expiresAt) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}
