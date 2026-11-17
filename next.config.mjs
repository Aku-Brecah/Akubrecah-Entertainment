import path from 'path';
import { fileURLToPath } from 'url';
// Real dependency — if the build-time source-map upload can't be wired, the
// build should fail loudly rather than silently shipping untested maps.
// (@sentry packages are CommonJS: destructure from the default export.)
import sentryPkg from '@sentry/nextjs/config';
const { withSentryConfig } = sentryPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  // Allow isolated CI/AI verification builds without racing other builds on .next
  distDir: process.env.BUILD_DIST_DIR || '.next',
  turbopack: {
    root: __dirname,
  },
  outputFileTracingRoot: __dirname,
  compress: true,
  experimental: {
    agentUpgrade: 'security',
    optimizePackageImports: [
      'lucide-react',
      '@clerk/nextjs',
      'date-fns',
    ],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      {
        protocol: 'https',
        hostname: '*.clerk.com',
      },
    ],
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    return [
      ...(isProd
        ? [
            {
              // Immutable cache for static Next.js assets in production only
              source: '/_next/static/:path*',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable',
                },
              ],
            },
          ]
        : [
            {
              // Evict any poisoned dev HTTP cache on localhost reload
              source: '/retrieval-portal',
              headers: [
                {
                  key: 'Clear-Site-Data',
                  value: '"cache"',
                },
                {
                  key: 'Cache-Control',
                  value: 'no-store, must-revalidate',
                },
              ],
            },
          ]),
      {
        // Long-lived cache for brand image assets & icons
        source: '/(akubrecah-logo.*|logo-circle.*|favicon.*|icon.*|og-image.*|apple-icon.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Global baseline security headers
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            // Introduced as Report-Only so violations surface (devtools/Sentry)
            // without breaking the Clerk/Daraja allowlist; enforce by
            // switching the key to `Content-Security-Policy` after tuning.
            key: 'Content-Security-Policy-Report-Only',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https: wss:",
              "frame-src 'self' https:",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self' 'unsafe-inline'",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
      {
        // Shield private admin and internal utility routes from indexing
        source: '/admin/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
        ],
      },
      {
        // Shield private client dashboards from indexing
        source: '/dashboard/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
        ],
      },
      {
        // Shield raw API endpoints from direct SERP indexing
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/services/kra-retrieval',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
  disableLogger: true,
});
