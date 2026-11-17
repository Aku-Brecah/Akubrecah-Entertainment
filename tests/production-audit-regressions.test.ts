import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { isSafeRedirectPath } from '@/lib/edge/routing';
import { sanitizeMarkdownHtml } from '@/components/markdown-content';
import { isSuperAdminCaller, safeCompare } from '@/lib/admin-auth';
import { GET as adminLogoutGet } from '@/app/api/admin/logout/route';

describe('Production Readiness Audit — Security & Integrity Regressions', () => {
  describe('Open Redirect Protection (isSafeRedirectPath)', () => {
    it('blocks external URLs, protocol-relative URLs, backslashes, and javascript URIs', () => {
      expect(isSafeRedirectPath('https://evil.example/phish')).toBe(false);
      expect(isSafeRedirectPath('http://evil.example')).toBe(false);
      expect(isSafeRedirectPath('//evil.example/dashboard')).toBe(false);
      expect(isSafeRedirectPath('/\\evil.example')).toBe(false);
      expect(isSafeRedirectPath('javascript:alert(1)')).toBe(false);
      expect(isSafeRedirectPath('')).toBe(false);
    });

    it('allows safe same-origin relative paths', () => {
      expect(isSafeRedirectPath('/dashboard')).toBe(true);
      expect(isSafeRedirectPath('/retrieval-portal?view=filing')).toBe(true);
      expect(isSafeRedirectPath('/admin/user-management?page=2')).toBe(true);
    });
  });

  describe('SSR & Initial-Paint Markdown XSS Sanitization', () => {
    it('strips scripts, inline event handlers, svg/iframe tags, and javascript links', () => {
      const malicious = [
        '<h1>Report</h1>',
        '<script>alert("xss")</script>',
        '<img src="https://example.com/a.png" onerror="alert(1)" />',
        '<svg onload=alert(2)><circle /></svg>',
        '<iframe src="https://evil.com"></iframe>',
        '<a href="javascript:alert(3)">Click</a>',
        '<a href="https://akubrecah.com">Safe Link</a>',
      ].join('\n');

      const sanitized = sanitizeMarkdownHtml(malicious);

      expect(sanitized).toContain('<h1>Report</h1>');
      expect(sanitized).toContain('https://akubrecah.com');
      expect(sanitized).not.toMatch(/<script/i);
      expect(sanitized).not.toMatch(/<svg/i);
      expect(sanitized).not.toMatch(/<iframe/i);
      expect(sanitized).not.toMatch(/onerror\s*=/i);
      expect(sanitized).not.toMatch(/onload\s*=/i);
      expect(sanitized).not.toMatch(/javascript:/i);
    });
  });

  describe('Admin Auth & RBAC Helpers', () => {
    it('enforces strict Super Admin role check (fails closed for Admin, User, null)', () => {
      expect(isSuperAdminCaller(null)).toBe(false);
      expect(isSuperAdminCaller(undefined)).toBe(false);
      expect(isSuperAdminCaller({ userId: 'u1', email: 'a@b.com', role: 'User' })).toBe(false);
      expect(isSuperAdminCaller({ userId: 'u2', email: 'a@b.com', role: 'Admin' })).toBe(false);
      expect(isSuperAdminCaller({ userId: 'u3', email: 'a@b.com', role: '' })).toBe(false);
      expect(isSuperAdminCaller({ userId: 'u4', email: 'a@b.com', role: 'Super Admin' })).toBe(true);
    });

    it('performs constant-time secret comparison safely across mismatched lengths', () => {
      expect(safeCompare('secret-123', 'secret-123')).toBe(true);
      expect(safeCompare('secret-123', 'secret-124')).toBe(false);
      expect(safeCompare('short', 'much-longer-secret')).toBe(false);
      expect(safeCompare('', '')).toBe(true);
    });
  });

  describe('CSRF-Safe Admin Logout Endpoint', () => {
    it('rejects GET /api/admin/logout with 405 Method Not Allowed', async () => {
      const res = await adminLogoutGet();
      expect(res.status).toBe(405);
      expect(res.headers.get('Allow')).toBe('POST');
    });
  });

  describe('Host-Header Spoofing Guard on /api/kra/retrieve', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
      vi.resetModules();
    });

    afterEach(() => {
      vi.stubEnv('NODE_ENV', originalNodeEnv || 'test');
      vi.restoreAllMocks();
    });

    it('rejects unauthenticated requests with spoofed Host: localhost:3000 in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.doMock('@clerk/nextjs/server', () => ({
        auth: vi.fn().mockResolvedValue({ userId: null }),
        clerkClient: vi.fn(),
      }));

      const { POST } = await import('@/app/api/kra/retrieve/route');
      const req = new NextRequest('https://kra.akubrecah.com/api/kra/retrieve', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify({ idNumber: '12345678', captcha: '1234', captchaToken: 'abc' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toMatch(/Authentication required/i);
    });
  });

  describe('Zero Fabricated Taxpayer Data on /api/certificate/verified-data', () => {
    it('never returns fabricated JOHN KAMAU KARIUKI fallback when upstream fails', async () => {
      vi.resetModules();
      vi.doMock('@clerk/nextjs/server', () => ({
        auth: vi.fn().mockResolvedValue({ userId: 'user_test_sub' }),
      }));
      vi.doMock('@/lib/subscription', () => ({
        isAdminUser: vi.fn().mockResolvedValue(true),
        getUserSubscriptionStatus: vi.fn().mockResolvedValue({ isSubscribed: true }),
      }));
      vi.doMock('@/lib/kra-api', () => ({
        fetchTaxpayerByPin: vi.fn().mockRejectedValue(new Error('KRA upstream offline')),
        fetchTaxpayerById: vi.fn().mockRejectedValue(new Error('KRA upstream offline')),
      }));
      vi.doMock('@/lib/prisma', () => ({
        default: {
          kra_pin_cache: { findUnique: vi.fn().mockResolvedValue(null), findFirst: vi.fn().mockResolvedValue(null) },
          certificateDownload: { findFirst: vi.fn().mockResolvedValue(null) },
        },
      }));

      const { POST } = await import('@/app/api/certificate/verified-data/route');
      const req = new NextRequest('https://kra.akubrecah.com/api/certificate/verified-data', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin: 'A001234567B' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(503);
      const text = await res.text();
      expect(text).not.toContain('JOHN KAMAU KARIUKI');
      expect(text).not.toContain('P.O. Box 12345');
    });
  });

  describe('Google Reviews Honest Fallback (Zero Fabricated Ratings)', () => {
    it('returns null rating and empty reviews instead of hardcoded 4.9 when unconfigured', async () => {
      vi.resetModules();
      vi.doMock('@/lib/prisma', () => ({
        default: {
          siteSetting: { findMany: vi.fn().mockResolvedValue([]) },
        },
      }));
      const prevKey = process.env.GOOGLE_PLACES_API_KEY;
      const prevPlace = process.env.GOOGLE_PLACE_ID;
      delete process.env.GOOGLE_PLACES_API_KEY;
      delete process.env.GOOGLE_PLACE_ID;

      try {
        const { GET } = await import('@/app/api/google-reviews/route');
        const req = new NextRequest('https://akubrecah.com/api/google-reviews');
        const res = await GET(req);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.rating).toBeNull();
        expect(body.totalReviews).toBe(0);
        expect(body.reviews).toEqual([]);
        expect(body.source).toBe('pending_sync');
      } finally {
        if (prevKey !== undefined) process.env.GOOGLE_PLACES_API_KEY = prevKey;
        if (prevPlace !== undefined) process.env.GOOGLE_PLACE_ID = prevPlace;
      }
    });
  });
});
