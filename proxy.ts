import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback(.*)',
  '/security',
  '/blog(.*)',
  '/articles(.*)',
  '/projects(.*)',
  '/contact(.*)',
  '/faq',
  '/about',
  '/products(.*)',
  '/retrieval-portal(.*)',
  '/terms(.*)',
  '/privacy(.*)',
  '/careers(.*)',
  '/api/public(.*)',
  '/api/health(.*)',
  '/api/projects(.*)',
  '/api/articles(.*)',
  '/api/kra(.*)',
  '/api/mpesa(.*)',
  '/api/certificate(.*)',
  '/api/generate-certificate(.*)',
  '/api/paystack(.*)',
  '/api/whatsapp(.*)',
  '/api/analytics(.*)',
  '/api/github(.*)',
  '/api/admin/magic-login(.*)'
]);

const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)'
]);

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/pin-checker(.*)',
  '/onboarding(.*)',
  '/checkout(.*)',
  '/filing-success(.*)',
  '/api/user(.*)'
]);

import { checkRateLimit, extractClientIp } from '@/lib/rate-limit';
import {
  classifyHost,
  isSafeRedirectPath,
  canonicalTargetForLegacyVercelHost,
} from '@/lib/edge/routing';

const BLOCKED_SCANNERS = [/sqlmap/i, /nikto/i, /nessus/i, /dirbuster/i, /acunetix/i, /havij/i];
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || '';

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;
  const isTaskRoute = pathname.startsWith('/session-tasks');

  // 1. Clerk Authentication Protection
  if (isProtectedRoute(request) && !isTaskRoute) {
    await auth.protect();
  }

  const { userId } = await auth();

  // 2. Redirect signed-in users away from auth pages
  if (userId && (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up'))) {
    const redirectUrl = request.nextUrl.searchParams.get('redirect_url');
    if (redirectUrl) {
      // Open-redirect guard: only same-origin relative paths are honoured —
      // absolute URLs (https://evil.com) and protocol-relative (//evil.com)
      // are rejected and fall back to home.
      const isSafeRelativePath = isSafeRedirectPath(redirectUrl);
      if (isSafeRelativePath) {
        try {
          return NextResponse.redirect(new URL(redirectUrl, request.url));
        } catch {
          // Fallback to home
        }
      }
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  const ip = extractClientIp(request);
  const userAgent = request.headers.get('user-agent') || '';

  // 3. Block known vulnerability scanners
  if (BLOCKED_SCANNERS.some(p => p.test(userAgent))) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // 4. Rate limiting for API routes with standard headers
  let rateLimitHeaders: Record<string, string> | null = null;
  if (pathname.startsWith('/api/')) {
    const rate = await checkRateLimit(ip, pathname);
    rateLimitHeaders = {
      'X-RateLimit-Limit': String(rate.limit),
      'X-RateLimit-Remaining': String(rate.remaining),
      'X-RateLimit-Reset': String(rate.resetSec),
      'X-RateLimit-Engine': rate.engine,
    };

    if (!rate.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests. Please slow down and try again later.',
          retryAfterSeconds: rate.resetSec,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rate.resetSec),
            ...rateLimitHeaders,
          },
        }
      );
    }
  }

  // 5. Path traversal protection
  if (pathname.includes('..') || pathname.includes('%2e')) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  // 6. Subdomain routing & Strict Domain Isolation
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').toLowerCase();
  const { isKraSubdomain, isAdminSubdomain } = classifyHost(host);

  // Case 0: Canonical Domain Enforcement — Permanently redirect legacy *.vercel.app traffic to custom domains
  if (host.includes('.vercel.app')) {
    const targetBase = canonicalTargetForLegacyVercelHost(host);

    const redirectUrl = new URL(pathname + request.nextUrl.search, targetBase);
    const redirectResponse = NextResponse.redirect(redirectUrl, 301);
    redirectResponse.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return redirectResponse;
  }

  // Case A: Accessing /admin routes on main domain or KRA domain -> redirect to admin.akubrecah.com
  if (!isAdminSubdomain) {
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      const targetAdminUrl = new URL(pathname === '/admin' ? '/' : pathname, 'https://admin.akubrecah.com');
      targetAdminUrl.search = request.nextUrl.search;
      return NextResponse.redirect(targetAdminUrl, 307);
    }
  }

  // Case B: In production, redirect sign-in, sign-up, and KRA portal routes from main domain to kra.akubrecah.com
  const { isLocalhost } = classifyHost(host);
  if (!isKraSubdomain && !isAdminSubdomain && !isLocalhost) {
    if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) {
      const kraAuthUrl = new URL(pathname, 'https://kra.akubrecah.com');
      kraAuthUrl.search = request.nextUrl.search;
      return NextResponse.redirect(kraAuthUrl, 307);
    }
    if (pathname.startsWith('/retrieval-portal') || pathname.startsWith('/pin-checker')) {
      const kraPortalUrl = new URL('/', 'https://kra.akubrecah.com');
      kraPortalUrl.search = request.nextUrl.search;
      return NextResponse.redirect(kraPortalUrl, 307);
    }
  }

  // Case C: Accessing on admin.akubrecah.com
  let response: NextResponse;
  if (isAdminSubdomain) {
    // 1. Root '/' rewrites to the executive admin dashboard
    if (pathname === '/') {
      response = NextResponse.rewrite(new URL('/admin', request.url));
    }
    // 2. Clean URL: redirect '/admin' to root '/' on admin subdomain
    else if (pathname === '/admin' || pathname === '/admin/' || pathname === '/dashboard' || pathname === '/dashboard/') {
      const cleanUrl = new URL('/', request.url);
      cleanUrl.search = request.nextUrl.search;
      return NextResponse.redirect(cleanUrl, 307);
    }
    // 3. Clean sub-paths: allow accessing /articles, /projects, /system-health directly
    else if (
      pathname === '/articles' || pathname.startsWith('/articles/') ||
      pathname === '/projects' || pathname.startsWith('/projects/') ||
      pathname === '/inquiries' || pathname.startsWith('/inquiries/') ||
      pathname === '/system-health' || pathname.startsWith('/system-health/') ||
      pathname === '/system-logs' || pathname.startsWith('/system-logs/') ||
      pathname === '/user-management' || pathname.startsWith('/user-management/') ||
      pathname === '/role-access' || pathname.startsWith('/role-access/') ||
      pathname === '/settings' || pathname.startsWith('/settings/') ||
      pathname === '/kra-retrievals' || pathname.startsWith('/kra-retrievals/')
    ) {
      response = NextResponse.rewrite(new URL('/admin' + pathname, request.url));
    }
    // 4. Redirect marketing & agency routes back to the main domain
    else if (
      pathname.startsWith('/about') ||
      pathname.startsWith('/services') ||
      pathname.startsWith('/careers') ||
      pathname.startsWith('/products') ||
      pathname === '/faq' ||
      pathname === '/contact'
    ) {
      const agencyUrl = new URL(pathname + request.nextUrl.search, 'https://akubrecah.com');
      return NextResponse.redirect(agencyUrl, 307);
    } else {
      response = NextResponse.next();
    }
  }
  // Case D: Accessing on kra.akubrecah.com
  else if (isKraSubdomain) {
    // 1. Root '/' rewrites to the flagship portal hub for all visitors (public access for SEO and users)
    if (pathname === '/') {
      response = NextResponse.rewrite(new URL('/retrieval-portal', request.url));
    }
    // 2. Clean URL: redirect '/retrieval-portal' to root '/' on the subdomain
    else if (pathname === '/retrieval-portal' || pathname === '/retrieval-portal/') {
      const cleanUrl = new URL('/', request.url);
      cleanUrl.search = request.nextUrl.search;
      return NextResponse.redirect(cleanUrl, 307);
    }
    // 3. Filing shortcut: redirect '/dashboard/filing' to root with filing view
    else if (pathname === '/dashboard/filing' || pathname === '/dashboard/filing/') {
      const filingUrl = new URL('/?view=filing', request.url);
      return NextResponse.redirect(filingUrl, 307);
    }
    // 4. Redirect marketing & agency routes back to the main domain
    else if (
      pathname.startsWith('/about') ||
      pathname.startsWith('/projects') ||
      pathname.startsWith('/articles') ||
      pathname.startsWith('/services') ||
      pathname.startsWith('/careers') ||
      pathname.startsWith('/products')
    ) {
      const agencyUrl = new URL(pathname + request.nextUrl.search, 'https://akubrecah.com');
      return NextResponse.redirect(agencyUrl, 307);
    } else {
      response = NextResponse.next();
    }
  } else {
    response = NextResponse.next();
  }

  if (rateLimitHeaders) {
    for (const [headerKey, headerVal] of Object.entries(rateLimitHeaders)) {
      response.headers.set(headerKey, headerVal);
    }
  }
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Accelerate public marketing and portal homepage on Edge CDN with stale-while-revalidate
  if (!userId && pathname === '/' && !isAdminSubdomain) {
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  }

  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
};
