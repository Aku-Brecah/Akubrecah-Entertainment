import { describe, it, expect, beforeEach } from 'vitest';
import { getTierForRoute } from '@/lib/rate-limit/tiers';
import { extractClientIp } from '@/lib/rate-limit/ip';
import { checkRateLimit } from '@/lib/rate-limit/limiter';

describe('Rate Limiter Module', () => {
  describe('Tier Determination', () => {
    it('assigns strict tier to financial and upload endpoints', () => {
      const tier1 = getTierForRoute('/api/mpesa/stkpush');
      expect(tier1.tierKey).toBe('strict');
      expect(tier1.limit).toBe(10);

      const tier2 = getTierForRoute('/api/mpesa/verify');
      expect(tier2.tierKey).toBe('mpesa_poll');
      expect(tier2.limit).toBe(180);

      const tier3 = getTierForRoute('/api/kra/nil-return');
      expect(tier3.tierKey).toBe('strict');
    });

    it('assigns lookup tier to KRA verification routes', () => {
      const tier = getTierForRoute('/api/kra/retrieve');
      expect(tier.tierKey).toBe('lookup');
      expect(tier.limit).toBe(30);
    });

    it('assigns health tier to liveness probes', () => {
      const tier = getTierForRoute('/api/health');
      expect(tier.tierKey).toBe('health');
      expect(tier.limit).toBe(1200);
    });

    it('defaults to general tier for other API endpoints', () => {
      const tier = getTierForRoute('/api/articles');
      expect(tier.tierKey).toBe('general');
      expect(tier.limit).toBe(100);
    });
  });

  describe('Client IP Extraction', () => {
    it('extracts IP from Cloudflare header', () => {
      const req = new Request('https://akubrecah.com', {
        headers: { 'cf-connecting-ip': '102.219.210.5' },
      });
      expect(extractClientIp(req)).toBe('102.219.210.5');
    });

    it('extracts IP from X-Forwarded-For taking the first hop', () => {
      const req = new Request('https://akubrecah.com', {
        headers: { 'x-forwarded-for': '197.232.14.88, 10.0.0.1' },
      });
      expect(extractClientIp(req)).toBe('197.232.14.88');
    });

    it('normalizes IPv6 loopback to 127.0.0.1', () => {
      const req = new Request('https://akubrecah.com', {
        headers: { 'x-real-ip': '::1' },
      });
      expect(extractClientIp(req)).toBe('127.0.0.1');
    });

    it('strips port from IPv4 address', () => {
      const req = new Request('https://akubrecah.com', {
        headers: { 'x-real-ip': '192.168.1.50:4321' },
      });
      expect(extractClientIp(req)).toBe('192.168.1.50');
    });
  });

  describe('Rate Limit Enforcement', () => {
    it('allows initial requests and decreases remaining count', async () => {
      const testIp = 'test-ip-' + Date.now();
      const route = '/api/kra/retrieve';

      const res1 = await checkRateLimit(testIp, route);
      expect(res1.allowed).toBe(true);
      expect(res1.limit).toBe(30);
      expect(res1.remaining).toBe(29);

      const res2 = await checkRateLimit(testIp, route);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(28);
    });

    it('blocks requests when tier limit is exceeded', async () => {
      const testIp = 'strict-test-ip-' + Date.now();
      const route = '/api/mpesa/stkpush'; // Limit is 10

      // Exhaust budget of 10
      for (let i = 0; i < 10; i++) {
        const res = await checkRateLimit(testIp, route);
        expect(res.allowed).toBe(true);
      }

      // 11th request must be blocked
      const blockedRes = await checkRateLimit(testIp, route);
      expect(blockedRes.allowed).toBe(false);
      expect(blockedRes.remaining).toBe(0);
      expect(blockedRes.resetSec).toBeGreaterThan(0);
    });
  });
});
