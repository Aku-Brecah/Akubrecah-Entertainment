import { describe, it, expect, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  Inter: () => ({
    variable: '--font-inter',
    className: 'font-inter',
  }),
}));

vi.mock('@/lib/cms', () => ({
  getPublishedArticles: vi.fn().mockResolvedValue([
    { slug: 'sample-article', updatedAt: new Date() }
  ]),
  getPublishedProjects: vi.fn().mockResolvedValue([
    { slug: 'sample-project', updatedAt: new Date() }
  ]),
}));

import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { submitToIndexNow } from '@/lib/seo/indexnow';
import { metadata as rootMetadata } from '@/app/layout';
import { metadata as homeMetadata } from '@/app/page';
import { metadata as retrievalMetadata } from '@/app/retrieval-portal/layout';
import { metadata as servicesMetadata } from '@/app/services/page';
import { metadata as solutionsMetadata } from '@/app/solutions/page';
import { metadata as productsMetadata } from '@/app/products/page';
import { metadata as projectsMetadata } from '@/app/projects/page';
import { metadata as articlesMetadata } from '@/app/articles/page';
import { metadata as aboutMetadata } from '@/app/about/page';
import { metadata as contactMetadata } from '@/app/contact/layout';
import { metadata as legalMetadata } from '@/app/legal/page';
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
      expect(userAgents).toContain('Perplexity-User');
      expect(userAgents).toContain('ChatGPT-User');
      expect(userAgents).toContain('OAI-SearchBot');
      expect(userAgents).toContain('GPTBot');
      expect(userAgents).toContain('Claude-Web');
      expect(userAgents).toContain('ClaudeBot');
      expect(userAgents).toContain('Google-Extended');
      expect(userAgents).toContain('Meta-ExternalAgent');
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
      expect(urls).toContain('https://akubrecah.com/articles/kra-pin-retrieval-online-using-id-number-itax-login-guide');
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

  describe('Canonical URL & Page Independence Verification', () => {
    it('ensures root layout does NOT leak canonical: "/" to child routes', () => {
      expect((rootMetadata as any)?.alternates?.canonical).toBeUndefined();
    });

    it('ensures every public page defines its own distinct, absolute canonical URL', () => {
      expect((homeMetadata as any)?.alternates?.canonical).toBe('https://akubrecah.com');
      expect((retrievalMetadata as any)?.alternates?.canonical).toBe('https://akubrecah.com/retrieval-portal');
      expect((servicesMetadata as any)?.alternates?.canonical).toBe('https://akubrecah.com/services');
      expect((solutionsMetadata as any)?.alternates?.canonical).toBe('https://akubrecah.com/solutions');
      expect((productsMetadata as any)?.alternates?.canonical).toBe('https://akubrecah.com/products');
      expect((projectsMetadata as any)?.alternates?.canonical).toBe('https://akubrecah.com/projects');
      expect((articlesMetadata as any)?.alternates?.canonical).toBe('https://akubrecah.com/articles');
      expect((aboutMetadata as any)?.alternates?.canonical).toBe('https://akubrecah.com/about');
      expect((contactMetadata as any)?.alternates?.canonical).toBe('https://akubrecah.com/contact');
      expect((legalMetadata as any)?.alternates?.canonical).toBe('https://akubrecah.com/legal');
    });

    it('ensures every public page has distinct title and description for search ranking', () => {
      const titles = [
        homeMetadata.title,
        retrievalMetadata.title,
        servicesMetadata.title,
        solutionsMetadata.title,
        productsMetadata.title,
        projectsMetadata.title,
        articlesMetadata.title,
        aboutMetadata.title,
        contactMetadata.title,
        legalMetadata.title,
      ];

      // Verify no duplicate titles exist among public pages
      const uniqueTitles = new Set(titles.map((t) => (typeof t === 'string' ? t : JSON.stringify(t))));
      expect(uniqueTitles.size).toBe(titles.length);
    });
  });

  describe('KRA PIN Retrieval & iTax Guide Article Verification', () => {
    it('indexes the KRA PIN retrieval guide first and targets all People Also Search For queries', async () => {
      const prismaModule = await import('@/lib/prisma');
      const findManySpy = vi.spyOn(prismaModule.default.article, 'findMany').mockResolvedValue([]);
      const findUniqueSpy = vi.spyOn(prismaModule.default.article, 'findUnique').mockResolvedValue(null);

      try {
        const cms = await vi.importActual<typeof import('@/lib/cms')>('@/lib/cms');
        const articles = await cms.getPublishedArticles();
        expect(articles.length).toBeGreaterThan(0);
        expect(articles[0].slug).toBe('kra-pin-retrieval-online-using-id-number-itax-login-guide');

        const article = await cms.getArticleBySlug('kra-pin-retrieval-online-using-id-number-itax-login-guide');
        expect(article).not.toBeNull();
        expect(article.isPublished).toBe(true);
        expect(article.publishedAt).toBeInstanceOf(Date);
        expect(article.featuredImage).toBe('/blog/kra-pin-retrieval-portal.png');
        expect(fs.existsSync(path.join(process.cwd(), 'public', 'blog', 'kra-pin-retrieval-portal.png'))).toBe(true);
        expect(article.content).toContain('/blog/kra-pin-retrieval-portal.png');
        expect(article.content).toContain('/retrieval-portal');
        expect(article.content).toContain('KES 20');
        expect(Array.isArray(article.faqs)).toBe(true);
        expect(article.faqs.length).toBeGreaterThanOrEqual(6);

        const targetKeywords = [
          'retrieve kra pin',
          'KRA portal',
          'KRA PIN Retrieval using ID number',
          'KRA PIN login',
          'KRA PIN forgot password',
          'KRA PIN Certificate download',
          'KRA iTax portal Login',
          'iTax - KRA PIN',
          'KRA PIN Retrieval online',
        ];

        const normalizedContent = `${article.title}\n${article.excerpt}\n${article.content}`.toLowerCase();
        for (const keyword of targetKeywords) {
          expect(article.tags).toContain(keyword);
          expect(normalizedContent).toContain(keyword.toLowerCase());
        }
      } finally {
        findManySpy.mockRestore();
        findUniqueSpy.mockRestore();
      }
    });
  });
});
