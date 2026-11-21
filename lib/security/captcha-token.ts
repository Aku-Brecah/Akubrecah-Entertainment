import crypto from 'crypto';

/**
 * TTL for stateless local arithmetic CAPTCHA challenges (10 minutes).
 */
const CAPTCHA_TTL_MS = 10 * 60 * 1000;

/**
 * Maximum tracked consumed nonces in memory before oldest entries are pruned.
 */
const MAX_CONSUMED_NONCES = 10_000;

interface GlobalCaptchaState {
  __akubrecahCaptchaRuntimeSecret?: string;
  __akubrecahConsumedCaptchaNonces?: Map<string, number>;
}

const globalState = globalThis as unknown as GlobalCaptchaState;

/**
 * Resolves the HMAC secret used to sign and verify stateless CAPTCHA tokens.
 * Never falls back to a static hardcoded literal: if environment secrets are
 * omitted in an ephemeral test/dev process, a per-process 256-bit CSPRNG secret
 * is generated once and cached in memory.
 */
function getCaptchaHmacSecret(): string {
  const configuredSecret =
    process.env.JWT_SECRET ||
    process.env.ENCRYPTION_KEY ||
    process.env.CLERK_SECRET_KEY;

  if (configuredSecret && configuredSecret.trim().length >= 16) {
    return configuredSecret.trim();
  }

  if (!globalState.__akubrecahCaptchaRuntimeSecret) {
    globalState.__akubrecahCaptchaRuntimeSecret = crypto.randomBytes(32).toString('hex');
  }

  return globalState.__akubrecahCaptchaRuntimeSecret;
}

function getConsumedNonceMap(): Map<string, number> {
  if (!globalState.__akubrecahConsumedCaptchaNonces) {
    globalState.__akubrecahConsumedCaptchaNonces = new Map<string, number>();
  }
  return globalState.__akubrecahConsumedCaptchaNonces;
}

function pruneExpiredNonces(now: number): void {
  const store = getConsumedNonceMap();
  for (const [nonce, expiresAt] of store.entries()) {
    if (expiresAt <= now) {
      store.delete(nonce);
    }
  }
  if (store.size > MAX_CONSUMED_NONCES) {
    const excess = store.size - MAX_CONSUMED_NONCES;
    let removed = 0;
    for (const key of store.keys()) {
      store.delete(key);
      removed += 1;
      if (removed >= excess) break;
    }
  }
}

/**
 * Signs a single-use arithmetic CAPTCHA token with HMAC-SHA256.
 * Format: `local_<base64url(answer:timestamp:nonce)>.<hmac_hex>`
 */
export function createLocalCaptchaToken(expectedAnswer: string | number, timestampMs = Date.now()): string {
  const nonce = crypto.randomBytes(12).toString('hex');
  const rawPayload = `${String(expectedAnswer).trim()}:${timestampMs}:${nonce}`;
  const encodedPayload = Buffer.from(rawPayload, 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getCaptchaHmacSecret())
    .update(encodedPayload)
    .digest('hex');

  return `local_${encodedPayload}.${signature}`;
}

export interface CaptchaVerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Verifies a `local_<payload>.<signature>` CAPTCHA token in constant time,
 * checks its expiration window, verifies the user-supplied answer, and marks
 * the token's cryptographic nonce as consumed so it cannot be replayed.
 */
export function verifyAndConsumeLocalCaptchaToken(
  sessionToken: string,
  userCaptchaAnswer: string
): CaptchaVerificationResult {
  if (!sessionToken || !sessionToken.startsWith('local_')) {
    return { valid: false, error: 'Invalid CAPTCHA session token format.' };
  }

  const tokenPart = sessionToken.slice('local_'.length);
  const dotIndex = tokenPart.indexOf('.');
  if (dotIndex <= 0 || dotIndex === tokenPart.length - 1) {
    return { valid: false, error: 'Malformed CAPTCHA session token.' };
  }

  const encodedPayload = tokenPart.slice(0, dotIndex);
  const providedSig = tokenPart.slice(dotIndex + 1);

  const expectedSig = crypto
    .createHmac('sha256', getCaptchaHmacSecret())
    .update(encodedPayload)
    .digest('hex');

  const providedBuf = Buffer.from(providedSig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return { valid: false, error: 'Invalid security challenge token. Please refresh CAPTCHA.' };
  }

  let decoded: string;
  try {
    decoded = Buffer.from(encodedPayload, 'base64url').toString('utf8');
  } catch {
    return { valid: false, error: 'Invalid CAPTCHA payload encoding.' };
  }

  const [expectedAnswer, timestampStr, nonce] = decoded.split(':');
  const issuedAt = Number(timestampStr);
  const now = Date.now();

  if (!expectedAnswer || !nonce || Number.isNaN(issuedAt)) {
    return { valid: false, error: 'Corrupted CAPTCHA challenge token.' };
  }

  if (now - issuedAt > CAPTCHA_TTL_MS || issuedAt > now + 60_000) {
    return { valid: false, error: 'Security challenge expired. Please refresh CAPTCHA.' };
  }

  pruneExpiredNonces(now);
  const consumedStore = getConsumedNonceMap();
  if (consumedStore.has(nonce)) {
    return {
      valid: false,
      error: 'This CAPTCHA challenge has already been used. Please refresh CAPTCHA.',
    };
  }

  if (String(userCaptchaAnswer).trim() !== expectedAnswer.trim()) {
    // Still consume the nonce on a wrong answer so an attacker cannot brute-force the same token
    consumedStore.set(nonce, issuedAt + CAPTCHA_TTL_MS);
    return {
      valid: false,
      error: 'Incorrect arithmetic result. Please solve the math challenge again.',
    };
  }

  consumedStore.set(nonce, issuedAt + CAPTCHA_TTL_MS);
  return { valid: true };
}
