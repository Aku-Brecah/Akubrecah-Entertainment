import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getTierForRoute } from '@/lib/rate-limit/tiers';
import { sendInquiryReply, isSmtpConfigured } from '@/lib/email/reply';

describe('Contact Message Management & Benchmarks Removal', () => {

  describe('Engineering Benchmarks Removal Verification', () => {
    it('confirms Engineering Benchmarks is completely absent from services page', () => {
      const servicesPath = path.resolve(process.cwd(), 'app/services/page.tsx');
      const content = fs.readFileSync(servicesPath, 'utf8');

      // Must NOT contain Engineering Benchmarks
      expect(content).not.toContain('Engineering Benchmarks');
      expect(content.toLowerCase()).not.toContain('engineering benchmarks');

      // Must preserve core engineering capabilities & quality highlights
      expect(content).toContain('Quality Assurance');
      expect(content).toContain('Key Engineering Deliverables');
      expect(content).toContain('Technology Stack');
    });

    it('confirms footer link points directly to /contact instead of #contact anchor', () => {
      const footerPath = path.resolve(process.cwd(), 'components/site-footer.tsx');
      const content = fs.readFileSync(footerPath, 'utf8');

      expect(content).not.toContain('/#contact');
      expect(content).toContain('href="/contact"');
    });
  });

  describe('Form Rate Limiting Tier Protection', () => {
    it('assigns /api/inquiries to strict rate limit tier to prevent spam abuse', () => {
      const tier = getTierForRoute('/api/inquiries');
      expect(tier.tierKey).toBe('strict');
      expect(tier.limit).toBeLessThanOrEqual(10);
    });
  });

  describe('Email Reply Service Security & Validation', () => {
    it('rejects dispatch to an invalid recipient email', async () => {
      const result = await sendInquiryReply({
        inquiryId: 'test_123',
        recipientEmail: 'not-an-email',
        recipientName: 'Test User',
        subject: 'Re: Quotation',
        body: 'Hello, thank you for contacting us.',
      });

      expect(result.success).toBe(false);
      expect(result.deliveryStatus).toBe('failed');
      expect(result.errorMessage).toContain('Invalid recipient email address');
    });

    it('rejects dispatch with an empty reply body', async () => {
      const result = await sendInquiryReply({
        inquiryId: 'test_123',
        recipientEmail: 'client@example.com',
        recipientName: 'Valid Client',
        subject: 'Re: Inquiry',
        body: '   ',
      });

      expect(result.success).toBe(false);
      expect(result.deliveryStatus).toBe('failed');
      expect(result.errorMessage).toContain('Reply message body cannot be empty');
    });

    it('safely handles unconfigured SMTP credentials with clear diagnostic message', async () => {
      // Temporarily ensure SMTP env vars are empty
      const origHost = process.env.SMTP_HOST;
      delete process.env.SMTP_HOST;

      const result = await sendInquiryReply({
        inquiryId: 'test_123',
        recipientEmail: 'client@example.com',
        recipientName: 'Client',
        subject: 'Re: Project Brief',
        body: 'Here is our detailed engineering scoping proposal.',
      });

      expect(result.success).toBe(false);
      expect(result.deliveryStatus).toBe('failed');
      expect(result.errorMessage).toContain('SMTP service is not configured');

      if (origHost) {
        process.env.SMTP_HOST = origHost;
      }
    });

    it('reports isSmtpConfigured() accurately based on environment', () => {
      const origHost = process.env.SMTP_HOST;
      delete process.env.SMTP_HOST;

      expect(isSmtpConfigured()).toBe(false);

      if (origHost) {
        process.env.SMTP_HOST = origHost;
      }
    });
  });
});
