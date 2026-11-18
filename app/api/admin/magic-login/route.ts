import { NextRequest, NextResponse } from 'next/server';
import { createAdminMagicToken, verifyAdminMagicToken } from '@/lib/magic-token';
import { safeCompare } from '@/lib/admin-auth';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getPublicAppUrl } from '@/lib/utils';

export const maxDuration = 15;

/**
 * GET /api/admin/magic-login
 * 1. If ?token=... is provided, validates cryptographic signature and sets auth cookies, redirecting to /admin.
 * 2. If ?check=1 is provided, checks if current caller is authenticated via magic cookie or Clerk.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const isCheck = searchParams.get('check') === '1';

  // 1. Session check endpoint
  if (isCheck) {
    const magicCookie = req.cookies.get('admin_magic_auth')?.value;
    if (magicCookie) {
      const payload = verifyAdminMagicToken(magicCookie);
      if (payload) {
        return NextResponse.json({ authenticated: true, role: 'Super Admin', phone: payload.phone });
      }
    }

    try {
      const { userId } = await auth();
      if (userId) {
        const client = await clerkClient();
        const currentUser = await client.users.getUser(userId);
        const email = (currentUser.primaryEmailAddress?.emailAddress || '').trim().toLowerCase();
        const role = (currentUser.publicMetadata?.role as string) || '';
        const configAdminEmail = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
        const configPublicAdminEmail = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || '').trim().toLowerCase();

        const isConfiguredSuperAdmin =
          Boolean(email) &&
          ((Boolean(configAdminEmail) && email === configAdminEmail) ||
            (Boolean(configPublicAdminEmail) && email === configPublicAdminEmail));

        if (isConfiguredSuperAdmin || role === 'Super Admin' || role === 'Admin') {
          return NextResponse.json({
            authenticated: true,
            role: isConfiguredSuperAdmin ? 'Super Admin' : role,
            email,
          });
        }
      }
    } catch {
      // Ignored
    }

    return NextResponse.json({ authenticated: false });
  }

  // 2. Token redirect handler
  const appUrl = getPublicAppUrl();

  if (!token) {
    return NextResponse.redirect(`${appUrl}/admin?error=missing_token`);
  }

  const payload = verifyAdminMagicToken(token);
  if (!payload) {
    return NextResponse.redirect(`${appUrl}/admin?error=invalid_or_expired_token`);
  }

  // Create response redirecting to /admin with magic auth cookies
  const response = NextResponse.redirect(`${appUrl}/admin`);

  const host = req.headers.get('host') || '';
  const isProdDomain = host.includes('akubrecah.com');
  const cookieDomain = process.env.NODE_ENV === 'production' && isProdDomain ? '.akubrecah.com' : undefined;

  // Server-side secure token cookie (HTTP-only)
  response.cookies.set('admin_magic_auth', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 14400, // 4 hours — matches magic token TTL
    domain: cookieDomain,
  });

  // Client-accessible indicator cookie
  response.cookies.set('admin_magic_client', '1', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 14400, // 4 hours — matches magic token TTL
    domain: cookieDomain,
  });

  return response;
}

/**
 * POST /api/admin/magic-login
 * PIN login is strictly disabled. Admin access requires email authentication.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'PIN login has been permanently disabled. Administrator authentication is restricted to authorized email credentials only.',
    },
    { status: 403 }
  );
}
