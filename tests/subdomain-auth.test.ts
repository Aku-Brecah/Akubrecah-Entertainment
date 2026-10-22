import { describe, it, expect } from 'vitest';
import {
  classifyHost,
  isSafeRedirectPath,
  canonicalTargetForLegacyVercelHost,
} from '@/lib/edge/routing';

/**
 * Real-module tests for subdomain routing & auth isolation decisions.
 * Targets lib/edge/routing.ts — the exact helpers proxy.ts (clerk middleware)
 * uses, not a reimplementation.
 */
describe('Subdomain classification (lib/edge/routing.ts)', () => {
  it('classifies kra.* hosts as the KRA subdomain', () => {
    const c1 = classifyHost('kra.akubrecah.com');
    expect(c1.isKraSubdomain).toBe(true);
    expect(c1.isAdminSubdomain).toBe(false);

    const c2 = classifyHost('kra-betasite.akubrecah.com'.replace('kra-betasite', 'kra')); // kra.* prefix form
    expect(c2.isKraSubdomain).toBe(true);
  });

  it('classifies admin.* hosts as the admin subdomain', () => {
    const c = classifyHost('admin.akubrecah.com');
    expect(c.isAdminSubdomain).toBe(true);
    expect(c.isKraSubdomain).toBe(false);
  });

  it('treats the primary domain and local dev as neutral hosts', () => {
    for (const host of ['akubrecah.com', 'www.akubrecah.com', 'localhost:3000', '127.0.0.1:3000']) {
      const c = classifyHost(host);
      expect(c.isKraSubdomain, host).toBe(false);
      expect(c.isAdminSubdomain, host).toBe(false);
    }
    expect(classifyHost('localhost:3000').isLocalhost).toBe(true);
    expect(classifyHost('127.0.0.1').isLocalhost).toBe(true);
    expect(classifyHost('akubrecah.com').isLocalhost).toBe(false);
  });

  it('flags legacy vercel preview hosts for canonical redirection', () => {
    expect(classifyHost('akubrecah.vercel.app').isLegacyVercelHost).toBe(true);
    expect(classifyHost('kra.akubrecah.com').isLegacyVercelHost).toBe(false);
  });
});

describe('Canonical domain enforcement (*.vercel.app → production targets)', () => {
  it('sends KRA/certificate preview traffic to kra.akubrecah.com', () => {
    expect(canonicalTargetForLegacyVercelHost('akubrecah-kra.vercel.app')).toBe('https://kra.akubrecah.com');
    expect(canonicalTargetForLegacyVercelHost('certificate-portal.vercel.app')).toBe('https://kra.akubrecah.com');
  });

  it('sends admin preview traffic to admin.akubrecah.com', () => {
    expect(canonicalTargetForLegacyVercelHost('akubrecah-admin.vercel.app')).toBe('https://admin.akubrecah.com');
  });

  it('sends everything else to the primary domain', () => {
    expect(canonicalTargetForLegacyVercelHost('akubrecah.vercel.app')).toBe('https://akubrecah.com');
  });
});

describe('Open-redirect guard on post-auth redirect_url (lib/edge/routing.ts)', () => {
  it('accepts same-origin relative paths only', () => {
    expect(isSafeRedirectPath('/dashboard')).toBe(true);
    expect(isSafeRedirectPath('/pin-checker?x=1')).toBe(true);
  });

  it('rejects absolute and protocol-relative attacker URLs', () => {
    expect(isSafeRedirectPath('https://evil.com')).toBe(false); // ':' rejected
    expect(isSafeRedirectPath('//evil.com')).toBe(false); // protocol-relative
  });

  it('rejects backslash and scheme tricks', () => {
    expect(isSafeRedirectPath('/\\evil.com')).toBe(false);
    expect(isSafeRedirectPath('javascript:alert(1)')).toBe(false);
    expect(isSafeRedirectPath('/redirect:https://evil.com')).toBe(false);
  });
});
