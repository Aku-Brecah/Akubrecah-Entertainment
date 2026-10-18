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
    '/dashboard/',
    '/api/',
    '/checkout/',
    '/onboarding/',
    '/sign-in/',
    '/sign-up/',
    '/sso-callback/',
    '/remotion-demo/',
    '/filing-success/',
    '/session-tasks/',
    '/*?*pin=*',
    '/*?*token=*',
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
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: privateDisallows,
      },
      // OpenAI ChatGPT Search
      {
        userAgent: ['ChatGPT-User', 'OAI-SearchBot'],
        allow: '/',
        disallow: privateDisallows,
      },
      // Anthropic Claude Web Search
      {
        userAgent: 'Claude-Web',
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
