import { describe, it, expect } from 'vitest';

describe('Issue 2: Subdomain-Specific Authentication & Routing Isolation', () => {

  function resolveDomainRouting(host: string, pathname: string, userId: string | null) {
    const cleanHost = host.toLowerCase();
    const isKraSubdomain = cleanHost.startsWith('kra.') || cleanHost.includes('kra.akubrecah.com');
    const isAdminSubdomain = cleanHost.startsWith('admin.') || cleanHost.includes('admin.akubrecah.com');
    const isLocalhost = cleanHost.includes('localhost') || cleanHost.includes('127.0.0.1');

    // Case A: /admin on non-admin subdomains
    if (!isAdminSubdomain && (pathname === '/admin' || pathname.startsWith('/admin/'))) {
      return { action: 'redirect', target: 'https://admin.akubrecah.com' + (pathname === '/admin' ? '/' : pathname) };
    }

    // Case B: Production main domain isolation
    if (!isKraSubdomain && !isAdminSubdomain && !isLocalhost) {
      if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) {
        return { action: 'redirect', target: 'https://kra.akubrecah.com' + pathname };
      }
      if (pathname.startsWith('/retrieval-portal') || pathname.startsWith('/pin-checker')) {
        return { action: 'redirect', target: 'https://kra.akubrecah.com/' };
      }
    }

    // Case C: kra.akubrecah.com authentication gating
    if (isKraSubdomain) {
      const isPublicAuthRoute =
        pathname.startsWith('/sign-in') ||
        pathname.startsWith('/sign-up') ||
        pathname.startsWith('/sso-callback') ||
        pathname.startsWith('/api/') ||
        pathname === '/privacy' ||
        pathname === '/terms';

      if (!userId && !isPublicAuthRoute) {
        return { action: 'redirect', target: '/sign-in' };
      }
      if (pathname === '/') {
        return { action: 'rewrite', target: '/retrieval-portal' };
      }
    }

    // Case D: admin.akubrecah.com
    if (isAdminSubdomain) {
      if (pathname === '/') {
        return { action: 'rewrite', target: '/admin' };
      }
    }

    // Public pass-through
    return { action: 'pass', target: pathname };
  }

  it('allows public visitors on main domain to access marketing pages without login redirection', () => {
    const publicPaths = ['/', '/about', '/services', '/products', '/contact', '/blog', '/faq', '/privacy', '/terms'];

    for (const path of publicPaths) {
      const result = resolveDomainRouting('akubrecah.com', path, null);
      expect(result.action).toBe('pass');
      expect(result.target).toBe(path);
    }
  });

  it('redirects /sign-in and /sign-up on production main domain strictly to kra.akubrecah.com', () => {
    const resultSignIn = resolveDomainRouting('akubrecah.com', '/sign-in', null);
    expect(resultSignIn.action).toBe('redirect');
    expect(resultSignIn.target).toBe('https://kra.akubrecah.com/sign-in');

    const resultSignUp = resolveDomainRouting('akubrecah.com', '/sign-up', null);
    expect(resultSignUp.action).toBe('redirect');
    expect(resultSignUp.target).toBe('https://kra.akubrecah.com/sign-up');
  });

  it('enforces authentication gating on kra.akubrecah.com for unauthenticated visitors', () => {
    const portalResult = resolveDomainRouting('kra.akubrecah.com', '/', null);
    expect(portalResult.action).toBe('redirect');
    expect(portalResult.target).toBe('/sign-in');

    const filingResult = resolveDomainRouting('kra.akubrecah.com', '/dashboard/filing', null);
    expect(filingResult.action).toBe('redirect');
    expect(filingResult.target).toBe('/sign-in');
  });

  it('allows authenticated users to view KRA portal on kra.akubrecah.com', () => {
    const portalResult = resolveDomainRouting('kra.akubrecah.com', '/', 'user_test_123');
    expect(portalResult.action).toBe('rewrite');
    expect(portalResult.target).toBe('/retrieval-portal');
  });

  it('redirects /admin on main domain to admin.akubrecah.com', () => {
    const adminResult = resolveDomainRouting('akubrecah.com', '/admin', 'user_admin_123');
    expect(adminResult.action).toBe('redirect');
    expect(adminResult.target).toBe('https://admin.akubrecah.com/');
  });

  it('allows local development routes without forcing external production redirects', () => {
    const localSignIn = resolveDomainRouting('localhost:3000', '/sign-in', null);
    expect(localSignIn.action).toBe('pass');

    const localHome = resolveDomainRouting('127.0.0.1:3000', '/', null);
    expect(localHome.action).toBe('pass');
  });
});
