import { MetadataRoute } from 'next';

/**
 * Enterprise Robots.txt Configuration
 * Optimized for:
 * 1. Primary search crawlers: Googlebot, Bingbot, DuckDuckBot, Baiduspider, YandexBot, Slurp.
 * 2. AI search and retrieval agents: PerplexityBot, ChatGPT-User, OAI-SearchBot, Claude-Web, Applebot.
 * 3. Strict protection of private admin consoles, user dashboards, and authentication routes.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://akubrecah.com';

  const privateDisallows = [
    '/admin/',
    '/admin',
    '/admin/*',
    '/dashboard/',
    '/dashboard',
    '/dashboard/*',
    '/api/',
    '/api',
    '/api/*',
    '/onboarding/',
    '/onboarding',
    '/onboarding/*',
    '/sign-in/',
    '/sign-in',
    '/sign-in/*',
    '/sign-up/',
    '/sign-up',
    '/sign-up/*',
    '/sso-callback/',
    '/sso-callback',
    '/sso-callback/*',
    '/remotion-demo/',
    '/remotion-demo',
    '/remotion-demo/*',
    '/session-tasks/',
    '/session-tasks',
    '/session-tasks/*',
    '/pin-checker/',
    '/pin-checker',
    '/pin-checker/*',
    '/*?*pin=*',
    '/*?*token=*',
    '/*?*session=*',
  ];

  return {
    rules: [
      // General Crawlers
      {
        userAgent: '*',
        allow: '/',
        disallow: privateDisallows,
      },
      // Google Search Crawler
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: privateDisallows,
      },
      // Bing Search Crawler
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: privateDisallows,
      },
      // Perplexity AI Search Crawler
      {
        userAgent: ['PerplexityBot', 'Perplexity-User'],
        allow: '/',
        disallow: privateDisallows,
      },
      // OpenAI ChatGPT & SearchGPT Crawlers
      {
        userAgent: ['ChatGPT-User', 'OAI-SearchBot', 'GPTBot'],
        allow: '/',
        disallow: privateDisallows,
      },
      // Anthropic Claude Web & Search Crawlers
      {
        userAgent: ['Claude-Web', 'ClaudeBot', 'anthropic-ai'],
        allow: '/',
        disallow: privateDisallows,
      },
      // Google Gemini / AI Overviews Training & Grounding Crawler
      {
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: privateDisallows,
      },
      // Meta AI Search Crawler
      {
        userAgent: 'Meta-ExternalAgent',
        allow: '/',
        disallow: privateDisallows,
      },
      // Apple Siri & Search
      {
        userAgent: 'Applebot',
        allow: '/',
        disallow: privateDisallows,
      },
      // Baidu Search Crawler
      {
        userAgent: 'Baiduspider',
        allow: '/',
        disallow: privateDisallows,
      },
      // Yandex Search Crawler
      {
        userAgent: 'YandexBot',
        allow: '/',
        disallow: privateDisallows,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
