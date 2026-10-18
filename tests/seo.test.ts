import { describe, it, expect, vi } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { submitToIndexNow } from '@/lib/seo/indexnow';
import fs from 'fs';
import path from 'path';

describe('Search Engine Optimization (SEO) & Indexing Suite', () => {
  describe('Robots.txt Directive Verification', () => {
    it('generates compliant crawler policies for search engines and AI bots', () => {
      const robotsConfig = robots();
      expect(robotsConfig).toBeDefined();
      expect(Array.isArray(robotsConfig.rules)).toBe(true);

      const rules = robotsConfig.rules as Array<{
        userAgent: string | string[];
        allow?: string | string[];
        disallow?: string | string[];
      }>;

      // Ensure universal and targeted bots are present
      const userAgents = rules.flatMap((r) =>
        Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]
      );

      expect(userAgents).toContain('Googlebot');
      expect(userAgents).toContain('Bingbot');
      expect(userAgents).toContain('PerplexityBot');
      expect(userAgents).toContain('ChatGPT-User');
      expect(userAgents).toContain('Claude-Web');
      expect(userAgents).toContain('Applebot');
      expect(userAgents).toContain('*');

      // Ensure private routes are strictly disallowed across all bots
      for (const rule of rules) {
        if (rule.disallow) {
          const disallowed = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
          expect(disallowed).toContain('/admin/');
          expect(disallowed).toContain('/dashboard/');
          expect(disallowed).toContain('/api/');
        }
      }

      // Ensure sitemap reference is canonical HTTPS
      expect(robotsConfig.sitemap).toMatch(/^https:\/\/.*\/sitemap\.xml$/);
    });
  });

  describe('XML Sitemap Route Integrity', () => {
    it('generates canonical public URLs with appropriate frequencies and priorities', async () => {
      const siteUrls = await sitemap();
      expect(Array.isArray(siteUrls)).toBe(true);
      expect(siteUrls.length).toBeGreaterThan(5);

      const urls = siteUrls.map((entry) => entry.url);

      // Verify all canonical public pages are present
      expect(urls.some((u) => u.endsWith('akubrecah.com') || u.endsWith('akubrecah.com/'))).toBe(true);
      expect(urls.some((u) => u.includes('/retrieval-portal'))).toBe(true);
      expect(urls.some((u) => u.includes('/services'))).toBe(true);
      expect(urls.some((u) => u.includes('/solutions'))).toBe(true);
      expect(urls.some((u) => u.includes('/products'))).toBe(true);
      expect(urls.some((u) => u.includes('/about'))).toBe(true);
      expect(urls.some((u) => u.includes('/contact'))).toBe(true);
      expect(urls.some((u) => u.includes('/legal/privacy'))).toBe(true);

      // Verify private and internal admin utility routes are NEVER exposed in sitemap
      expect(urls.some((u) => u.includes('/admin'))).toBe(false);
      expect(urls.some((u) => u.includes('/dashboard'))).toBe(false);
      expect(urls.some((u) => u.includes('/pin-checker'))).toBe(false);
      expect(urls.some((u) => u.includes('/api/'))).toBe(false);

      // Verify priority bounds (0.0 to 1.0)
      for (const entry of siteUrls) {
        expect(entry.priority).toBeGreaterThanOrEqual(0.1);
        expect(entry.priority).toBeLessThanOrEqual(1.0);
      }
    });
  });

  describe('IndexNow Protocol Client', () => {
    it('normalizes relative URLs to fully qualified HTTPS URLs', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve({
          status: 200,
          statusText: 'OK',
        } as Response)
      );

      const result = await submitToIndexNow(['/retrieval-portal', '/services']);
      expect(result.success).toBe(true);
      expect(result.submittedUrls).toEqual([
        'https://akubrecah.com/retrieval-portal',
        'https://akubrecah.com/services',
      ]);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.indexnow.org/indexnow',
        expect.objectContaining({
          method: 'POST',
        })
      );

      fetchSpy.mockRestore();
    });

    it('gracefully handles empty URL inputs', async () => {
      const result = await submitToIndexNow([]);
      expect(result.success).toBe(false);
      expect(result.submittedUrls).toHaveLength(0);
    });
  });

  describe('AI Discovery Files & Key Verification', () => {
    it('serves valid llms.txt and llms-full.txt in public directory', () => {
      const llmsPath = path.join(process.cwd(), 'public', 'llms.txt');
      const llmsFullPath = path.join(process.cwd(), 'public', 'llms-full.txt');
      const indexNowKeyPath = path.join(process.cwd(), 'public', 'c95843a0d5c040d6832dbff09ce6a213.txt');

      expect(fs.existsSync(llmsPath)).toBe(true);
      expect(fs.existsSync(llmsFullPath)).toBe(true);
      expect(fs.existsSync(indexNowKeyPath)).toBe(true);

      const llmsContent = fs.readFileSync(llmsPath, 'utf-8');
      expect(llmsContent).toContain('# Akubrecah Technologies');
      expect(llmsContent).toContain('/retrieval-portal');
      expect(llmsContent).toContain('/services');

      const indexNowKeyContent = fs.readFileSync(indexNowKeyPath, 'utf-8').trim();
      expect(indexNowKeyContent).toBe('c95843a0d5c040d6832dbff09ce6a213');
    });
  });
});
