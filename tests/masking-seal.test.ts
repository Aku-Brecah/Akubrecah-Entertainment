import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import {
  sealKraPin,
  tryResolveKraPin,
  looksLikeKraPin,
} from '@/lib/masking';

let originalKey: string | undefined;
const TEST_SECRET = 'test-encryption-key-material-0000000000000042';

beforeAll(() => {
  originalKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = TEST_SECRET;
});

afterAll(() => {
  if (originalKey === undefined) delete process.env.ENCRYPTION_KEY;
  else process.env.ENCRYPTION_KEY = originalKey;
});

describe('looksLikeKraPin', () => {
  it('accepts standard letter-digit-letter PINs', () => {
    expect(looksLikeKraPin('A012345678Z')).toBe(true);
    expect(looksLikeKraPin('p051234567x')).toBe(true);
  });

  it('rejects masked, partial or empty values', () => {
    expect(looksLikeKraPin('A01*****78Z')).toBe(false);
    expect(looksLikeKraPin('A01234Z')).toBe(false);
    expect(looksLikeKraPin('')).toBe(false);
    expect(looksLikeKraPin(null)).toBe(false);
  });
});

describe('sealKraPin / tryResolveKraPin round-trip', () => {
  it('hides the plaintext and resolves faithfully', () => {
    const blob = sealKraPin('A012345678Z');
    expect(blob).toBeTruthy();
    expect(blob.startsWith('kraseal1:')).toBe(true);
    expect(blob.includes('A0123456')).toBe(false);
    const out = tryResolveKraPin(blob);
    expect(out).toBe('A012345678Z');
  });

  it('produces a different seal each time (random IV)', () => {
    expect(sealKraPin('A012345678Z')).not.toBe(sealKraPin('A012345678Z'));
  });

  it('still accepts plaintext and compound PINs in resolution', () => {
    expect(tryResolveKraPin('a012345678z')).toBe('A012345678Z');
    expect(tryResolveKraPin('A012345678Z - Individual')).toBe('A012345678Z');
  });

  it('rejects a tampered ciphertext (AES-GCM auth)', () => {
    const blob = sealKraPin('A012345678Z')!;
    const prefix = 'kraseal1:';
    const [ivb, ctb, tagb] = blob.slice(prefix.length).split('.');
    const ct = Buffer.from(ctb, 'base64url');
    ct[0] ^= 0xff;
    const tampered = `${prefix}${ivb}.${ct.toString('base64url')}.${tagb}`;
    expect(tryResolveKraPin(tampered)).toBeNull();
  });

  it('rejects blobs sealed with a different key', () => {
    const blob = sealKraPin('A012345678Z')!;
    process.env.ENCRYPTION_KEY = 'a-totally-different-secret-key-material';
    const result = tryResolveKraPin(blob);
    process.env.ENCRYPTION_KEY = TEST_SECRET;
    expect(result).toBeNull();
  });

  it('returns empty when no key is configured (fail closed)', () => {
    const cached = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    expect(sealKraPin('A012345678Z')).toBe('');
    expect(tryResolveKraPin('kraseal1:whatever')).toBeNull();
    process.env.ENCRYPTION_KEY = cached;
  });

  it('never seals or resolves masked display pins as plaintext', () => {
    expect(tryResolveKraPin('A01*****78Z')).toBeNull();
    expect(sealKraPin('A01*****78Z')).toBe('');
  });

  it('refuses non-PIN garbage', () => {
    expect(tryResolveKraPin('hello world')).toBeNull();
    expect(tryResolveKraPin('12345678')).toBeNull();
  });
});
