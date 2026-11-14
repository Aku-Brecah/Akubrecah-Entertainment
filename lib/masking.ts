import { log } from '@/lib/monitoring/logger';
import crypto from 'crypto';

/**
 * Privacy and Data Protection Masking Utilities
 * Strictly compliant with Kenya Data Protection Act (KDPA).
 *
 * Rules:
 * - Phone: completely masked ("••••••••••")
 * - Email: partial email (e.g. "j***e@gmail.com")
 * - Station name: unmasked, fully visible (e.g. "Kitale TSO", "West of Nairobi")
 * - National ID: unmasked, fully visible (e.g. "28475912")
 * - KRA PIN: partial PIN (e.g. "A01*****78Z")
 * - Street / Building / Box: protected ("••••••••")
 * - Certificate Download: strictly KES 20 ("20 bob")
 */

export interface TaxpayerData {
  pin?: string;
  name?: string;
  taxpayerName?: string;
  fullName?: string;
  idNumber?: string;
  email?: string;
  phoneNumber?: string;
  building?: string;
  street?: string;
  town?: string;
  county?: string;
  district?: string;
  taxArea?: string;
  station?: string;
  poBox?: string;
  postalCode?: string;
  registrationDate?: string;
  registeredDate?: string;
  status?: string;
  [key: string]: any;
}

/**
 * Partially masks a KRA PIN (e.g., "A012345678Z" -> "A01*****78Z")
 */
export function maskPin(pin?: string | null): string {
  if (!pin || typeof pin !== 'string') return '';
  const trimmed = pin.trim().toUpperCase();
  if (trimmed.length < 6) return trimmed;
  return `${trimmed.slice(0, 3)}*****${trimmed.slice(-3)}`;
}

/**
 * Partially masks an email address (e.g., "john.doe@gmail.com" -> "j***e@gmail.com")
 */
export function maskEmail(email?: string | null): string {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.indexOf('@');
  if (atIndex < 2) return trimmed;
  
  const user = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex);
  const maskedUser = user.length > 2 
    ? `${user[0]}***${user[user.length - 1]}`
    : `${user[0]}*`;
  return `${maskedUser}${domain}`;
}

/**
 * Completely masks a phone number (e.g., "0712345678" -> "••••••••••")
 */
export function maskPhone(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') return '';
  return '••••••••••';
}

/**
 * Formats date string cleanly
 */
export function maskDate(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  return dateStr.trim();
}

/**
 * Returns taxpayer data masked for preview and public query:
 * - Phone completely masked
 * - Email partially masked
 * - Station name fully shown
 * - National ID fully shown
 * - PIN partially masked
 * - Full legal name visible for identity verification
 * - Building, street, poBox secured
 */
export function maskTaxpayerData<T extends TaxpayerData>(
  data: T,
  isSubscribed: boolean = false,
  isAdmin: boolean = false
): T & { isSubscribed: boolean; fullName: string } {
  if (isAdmin || isSubscribed) {
    const name = data.name || data.taxpayerName || data.fullName || '';
    return {
      ...data,
      name,
      taxpayerName: name,
      fullName: name,
      isSubscribed: true,
    };
  }

  const name = data.name || data.taxpayerName || data.fullName || '';

  return {
    ...data,
    pin: maskPin(data.pin),
    phoneNumber: maskPhone(data.phoneNumber),
    email: maskEmail(data.email),
    ...(data.certificate_url !== undefined ? { certificate_url: '' } : {}),
    station: data.station || '', // Fully visible
    idNumber: data.idNumber || '', // Fully visible
    name,
    taxpayerName: name,
    fullName: name,
    building: data.building ? '••••••••' : '',
    street: data.street ? '••••••••' : '',
    poBox: data.poBox ? '••••••' : '',
    postalCode: data.postalCode ? '•••••' : '',
    isSubscribed: false,
  };
}

/* ───────────────────────────────────────────────────────────────────────────
 * Sealed KRA PIN transport (server-side only)
 *
 * When an anonymous user searches by National ID, the full PIN must NOT be
 * returned as plaintext (KDPA). Instead we return an opaque AES-256-GCM
 * sealed blob that the legitimate client passes through unchanged to the
 * payment/fulfilment endpoints. Those endpoints resolve it server-side:
 *
 *   sealKraPin(fullPin)      → opaque blob for client transport
 *   tryResolveKraPin(input)  → plaintext PIN (from plaintext or sealed blob)
 *
 * Users who search by their own PIN, subscribers and admins still receive
 * the plaintext PIN, since they already know it / are entitled to it.
 * ─────────────────────────────────────────────────────────────────────────── */

const PIN_SEAL_PREFIX = 'kraseal1:';

/** KRA PIN shape: letter + 9 digits + letter/suffix char (e.g. A012345678Z). */
export function looksLikeKraPin(value?: string | null): boolean {
  if (!value || typeof value !== 'string') return false;
  return /^[A-Z]\d{9}[A-Z\d]$/.test(value.toUpperCase());
}

function getPinSealKey(): Buffer | null {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret || secret.length < 16) return null;
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Seals a full KRA PIN into an opaque, client-safe transport blob.
 * Returns '' (fail closed) if no server secrecy is configured — in that case
 * the PIN must simply not be sent to the client.
 */
export function sealKraPin(pin?: string | null): string {
  if (!pin || typeof pin !== 'string') return '';
  const value = pin.trim().toUpperCase();
  if (!looksLikeKraPin(value)) return '';
  const key = getPinSealKey();
  if (!key) {
    log.warn('[masking] sealKraPin: ENCRYPTION_KEY/JWT_SECRET not configured — PIN withheld from client');
    return '';
  }
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PIN_SEAL_PREFIX}${iv.toString('base64url')}.${ciphertext.toString('base64url')}.${tag.toString('base64url')}`;
  } catch (e: any) {
    log.warn('[masking] sealKraPin failed:', e.message);
    return '';
  }
}

/**
 * Resolves a request-supplied PIN back to plaintext.
 * Accepts a plaintext PIN (unchanged, validated/uppercased) or a sealed blob
 * from sealKraPin(). Returns null when the value cannot be resolved.
 */
export function tryResolveKraPin(input?: string | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const value = input.trim();
  if (!value) return null;

  // Sealed blob → decrypt server-side
  if (value.startsWith(PIN_SEAL_PREFIX)) {
    const key = getPinSealKey();
    if (!key) {
      log.warn('[masking] tryResolveKraPin: sealed PIN received but no server secrecy configured');
      return null;
    }
    try {
      const [ivB64, ctB64, tagB64] = value.slice(PIN_SEAL_PREFIX.length).split('.');
      if (!ivB64 || !ctB64 || !tagB64) return null;
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64url'));
      decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(ctB64, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
      const clean = plaintext.trim().toUpperCase();
      return looksLikeKraPin(clean) ? clean : null;
    } catch {
      return null;
    }
  }

  // Compound forms like "A012345678Z - INDIVIDUAL" or "PIN#suffix"
  const stripped = value.split(/[-#]/)[0].trim().toUpperCase();
  if (looksLikeKraPin(stripped)) return stripped;
  if (looksLikeKraPin(value)) return value.toUpperCase();
  return null;
}
