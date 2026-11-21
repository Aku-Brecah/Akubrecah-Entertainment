import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { safeJsonLdStringify } from '@/components/seo/site-schema';
import { sanitizeMarkdownHtml } from '@/components/markdown-content';
import { validateCsrfRequest } from '@/lib/security/csrf';
import {
  isPrivateOrMetadataHost,
  isSafeExternalUrl,
  validateProxyUrl,
} from '@/lib/security/ssrf';
import {
  createLocalCaptchaToken,
  verifyAndConsumeLocalCaptchaToken,
} from '@/lib/security/captcha-token';
import { resolveSafeEvolutionInstanceName } from '@/lib/evolution';
import {
  verifyAdminCaller,
  isIpLockedOutFromAdminAuth,
  resetAdminAuthLockoutForTests,
} from '@/lib/admin-auth';
import { cyberSubscribeWebSchema } from '@/lib/validation/schemas';
import { getTierForRoute } from '@/lib/rate-limit/tiers';

describe('Security Audit Hardening Suite', () => {
  describe('SEC-03: XSS Prevention (JSON-LD & Markdown HTML Sanitizer)', () => {
    it('escapes </script> breakout payloads in JSON-LD structured data', () => {
      const maliciousPayload = {
        '@context': 'https://schema.org',
        headline: 'Tax Guide </script><script>window.__xss=1</script>',
        description: 'A & B <img src=x onerror=alert(1)>',
      };
      const serialized = safeJsonLdStringify(maliciousPayload);

      expect(serialized).not.toContain('</script>');
      expect(serialized).not.toContain('<script>');
      expect(serialized).toContain('\\u003c/script\\u003e');
      expect(serialized).toContain('\\u0026');
      expect(JSON.parse(serialized)).toEqual(maliciousPayload);
    });

    it('neutralizes entity-obfuscated javascript:, data:, srcdoc, and CSS expression XSS in markdown HTML', () => {
      const dirty = [
        '<p>Hello</p>',
        '<a href="javascript:alert(1)">Click1</a>',
        '<a href="jav&#x09;ascript:alert(2)">Click2</a>',
        '<a href="&#106;avascript:alert(3)">Click3</a>',
        '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Click4</a>',
        '<img src="https://akubrecah.com/logo.png" onerror="alert(5)" />',
        '<div srcdoc="<script>alert(6)</script>" style="width: expression(alert(7))">Box</div>',
        '<a href="https://kra.akubrecah.com/pin-checker">SafeLink</a>',
      ].join('\n');

      const clean = sanitizeMarkdownHtml(dirty);

      expect(clean).not.toMatch(/javascript:/i);
      expect(clean).not.toContain('&#x09;');
      expect(clean).not.toContain('&#106;');
      expect(clean).not.toContain('data:text/html');
      expect(clean).not.toContain('onerror=');
      expect(clean).not.toContain('srcdoc=');
      expect(clean).not.toContain('expression(');
      expect(clean).toContain('href="https://kra.akubrecah.com/pin-checker"');
    });
  });

  describe('SEC-04: SSRF, Private/Metadata IP Blocking & Evolution Instance Path Guard', () => {
    it('blocks loopback, RFC1918 private networks, AWS/GCP/Alibaba cloud metadata IPs, and integer IP encodings', () => {
      const blockedTargets = [
        'localhost',
        '127.0.0.1',
        '127.0.0.53',
        '0.0.0.0',
        '10.0.0.1',
        '172.16.0.10',
        '172.31.255.255',
        '192.168.1.254',
        '169.254.169.254', // AWS/GCP/Azure IMDS
        '100.100.100.200', // Alibaba Cloud IMDS
        'metadata.google.internal',
        'service.internal',
        '::1',
        '::ffff:169.254.169.254',
        '::ffff:127.0.0.1',
        'fe80::1',
        'fc00::1234',
        '2130706433', // decimal 127.0.0.1
        '0x7f000001', // hex 127.0.0.1
      ];

      for (const target of blockedTargets) {
        expect(isPrivateOrMetadataHost(target)).toBe(true);
        expect(isSafeExternalUrl(`http://${target}/latest/meta-data/`, { allowHttp: true })).toBe(false);
        expect(validateProxyUrl(`http://${target}:8080`)).toBeNull();
      }
    });

    it('allows legitimate external HTTPS endpoints and public proxy hosts', () => {
      expect(isPrivateOrMetadataHost('itax.kra.go.ke')).toBe(false);
      expect(isSafeExternalUrl('https://itax.kra.go.ke/KRA-Portal/')).toBe(true);
      expect(isSafeExternalUrl('http://itax.kra.go.ke/KRA-Portal/', { allowHttp: false })).toBe(false);
      expect(validateProxyUrl('http://proxy.akubrecah.com:8080')).toBe('http://proxy.akubrecah.com:8080');
      expect(validateProxyUrl('file:///etc/passwd')).toBeNull();
    });

    it('prevents path traversal via Evolution WhatsApp instance names', () => {
      expect(resolveSafeEvolutionInstanceName('../../instance/delete/master')).toBe(
        encodeURIComponent(process.env.EVOLUTION_INSTANCE_NAME || 'Akubrecah Entertainment')
      );
      expect(resolveSafeEvolutionInstanceName('akubrecah-prod_01')).toBe('akubrecah-prod_01');
    });
  });

  describe('SEC-06: Single-Use Stateless CAPTCHA Token & Replay Prevention', () => {
    it('verifies a valid arithmetic CAPTCHA token once and rejects any replay attempt', () => {
      const token = createLocalCaptchaToken(42);

      const firstAttempt = verifyAndConsumeLocalCaptchaToken(token, '42');
      expect(firstAttempt.valid).toBe(true);

      const replayAttempt = verifyAndConsumeLocalCaptchaToken(token, '42');
      expect(replayAttempt.valid).toBe(false);
      expect(replayAttempt.error).toMatch(/already been used/i);
    });

    it('invalidates the CAPTCHA token immediately after a wrong answer to block brute-forcing', () => {
      const token = createLocalCaptchaToken(29);

      const wrongAttempt = verifyAndConsumeLocalCaptchaToken(token, '99');
      expect(wrongAttempt.valid).toBe(false);

      const secondAttemptWithCorrectAnswer = verifyAndConsumeLocalCaptchaToken(token, '29');
      expect(secondAttemptWithCorrectAnswer.valid).toBe(false);
      expect(secondAttemptWithCorrectAnswer.error).toMatch(/already been used/i);
    });

    it('rejects tampered or expired CAPTCHA tokens', () => {
      const token = createLocalCaptchaToken(18);
      const tampered = token.slice(0, -4) + 'aaaa';
      expect(verifyAndConsumeLocalCaptchaToken(tampered, '18').valid).toBe(false);

      const expiredToken = createLocalCaptchaToken(18, Date.now() - 15 * 60 * 1000);
      const expiredCheck = verifyAndConsumeLocalCaptchaToken(expiredToken, '18');
      expect(expiredCheck.valid).toBe(false);
      expect(expiredCheck.error).toMatch(/expired/i);
    });
  });

  describe('SEC-07: CSRF Origin & Sec-Fetch-Site Validation', () => {
    it('allows GET requests and trusted same-origin POST requests', () => {
      const getReq = new NextRequest('https://kra.akubrecah.com/api/kra/captcha', {
        method: 'GET',
      });
      expect(validateCsrfRequest(getReq).allowed).toBe(true);

      const postReq = new NextRequest('https://kra.akubrecah.com/api/mpesa/stkpush', {
        method: 'POST',
        headers: {
          origin: 'https://kra.akubrecah.com',
          'sec-fetch-site': 'same-origin',
        },
      });
      expect(validateCsrfRequest(postReq).allowed).toBe(true);
    });

    it('blocks cross-site state-changing POST requests from untrusted origins or null origin', () => {
      const evilOriginReq = new NextRequest('https://kra.akubrecah.com/api/admin/feature-flags', {
        method: 'POST',
        headers: {
          origin: 'https://evil-phishing.example.com',
          'sec-fetch-site': 'cross-site',
        },
      });
      expect(validateCsrfRequest(evilOriginReq).allowed).toBe(false);

      const nullOriginReq = new NextRequest('https://kra.akubrecah.com/api/mpesa/stkpush', {
        method: 'POST',
        headers: {
          origin: 'null',
        },
      });
      expect(validateCsrfRequest(nullOriginReq).allowed).toBe(false);

      const crossSiteNoOriginReq = new NextRequest('https://kra.akubrecah.com/api/inquiries', {
        method: 'POST',
        headers: {
          'sec-fetch-site': 'cross-site',
        },
      });
      expect(validateCsrfRequest(crossSiteNoOriginReq).allowed).toBe(false);
    });

    it('exempts signed server-to-server webhook endpoints from browser Origin checks', () => {
      const mpesaWebhookReq = new NextRequest('https://kra.akubrecah.com/api/mpesa/callback', {
        method: 'POST',
        headers: {
          origin: 'https://api.safaricom.co.ke',
        },
      });
      expect(validateCsrfRequest(mpesaWebhookReq).allowed).toBe(true);
    });
  });

  describe('SEC-08 & SEC-09: Admin Brute-Force Lockout, Zod Schema & Rate-Limit Tiers', () => {
    beforeEach(() => {
      resetAdminAuthLockoutForTests();
      process.env.ADMIN_BOT_PIN = '987654';
    });

    it('locks out an IP after 5 consecutive failed x-admin-pin attempts even if the valid PIN is subsequently sent', async () => {
      const testIp = '203.0.113.77';

      for (let i = 0; i < 5; i++) {
        const badReq = new NextRequest('https://admin.akubrecah.com/api/admin/overview', {
          headers: {
            'x-forwarded-for': testIp,
            'x-admin-pin': `wrong-pin-${i}`,
          },
        });
        const caller = await verifyAdminCaller(badReq);
        expect(caller).toBeNull();
      }

      expect(isIpLockedOutFromAdminAuth(testIp)).toBe(true);

      // Even with the correct PIN, the locked-out IP must be rejected
      const validPinReqFromLockedIp = new NextRequest('https://admin.akubrecah.com/api/admin/overview', {
        headers: {
          'x-forwarded-for': testIp,
          'x-admin-pin': '987654',
        },
      });
      expect(await verifyAdminCaller(validPinReqFromLockedIp)).toBeNull();

      // Another IP with the correct PIN still succeeds
      const validPinReqFromCleanIp = new NextRequest('https://admin.akubrecah.com/api/admin/overview', {
        headers: {
          'x-forwarded-for': '198.51.100.12',
          'x-admin-pin': '987654',
        },
      });
      const validCaller = await verifyAdminCaller(validPinReqFromCleanIp);
      expect(validCaller?.role).toBe('Super Admin');
    });

    it('validates Cyber Cafe web subscription payloads with cyberSubscribeWebSchema', () => {
      const invalid = cyberSubscribeWebSchema.safeParse({
        cafeName: 'A',
        ownerName: '',
        whatsappPhone: 'abc',
        paymentPhone: '123',
      });
      expect(invalid.success).toBe(false);

      const valid = cyberSubscribeWebSchema.safeParse({
        cafeName: 'Nairobi Digital Cyber',
        ownerName: 'Jane Wanjiku',
        whatsappPhone: '0712345678',
        paymentPhone: '0712345678',
      });
      expect(valid.success).toBe(true);
    });

    it('enforces tighter rate-limit tiers on /api/admin/* and /api/certificate/*', () => {
      expect(getTierForRoute('/api/admin/magic-login').tierKey).toBe('strict');
      expect(getTierForRoute('/api/admin/overview').tierKey).toBe('lookup');
      expect(getTierForRoute('/api/certificate/record-download').tierKey).toBe('lookup');
    });
  });
});
