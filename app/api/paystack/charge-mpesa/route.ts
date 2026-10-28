import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { chargePaystackMpesa, formatPaystackKenyaPhone } from '@/lib/paystack';
import { getOrCreateDbUser, isAdminUser } from '@/lib/subscription';
import { tryResolveKraPin } from '@/lib/masking';
import { normalizePhoneNumber } from '@/lib/whatsapp/mpesa-dispatch';
import { paystackMpesaChargeSchema, firstIssueMessage } from '@/lib/validation/schemas';

export const maxDuration = 30;

const FIXED_DOWNLOAD_FEE_KES = 20;

export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null;
    try {
      const session = await auth();
      userId = session?.userId || null;
    } catch {
      // Guest
    }

    // Admin users have full unrestricted access and bypass payment
    if (userId) {
      const adminCheck = await isAdminUser(userId);
      if (adminCheck) {
        return NextResponse.json(
          { success: false, error: 'Admin accounts have full access and do not require payment.' },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const parsed = paystackMpesaChargeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: `Invalid request — ${firstIssueMessage(parsed.error)}` },
        { status: 400 }
      );
    }

    const { phone: rawPhone, pin: incomingPin, email: inputEmail } = parsed.data;
    const cleanPin = tryResolveKraPin(incomingPin) || (incomingPin ? String(incomingPin).toUpperCase().trim() : '');

    if (!cleanPin) {
      return NextResponse.json(
        { success: false, error: 'KRA PIN is required for certificate download payment.' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhoneNumber(rawPhone);
    if (!/^254(7|1)\d{8}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid Safaricom M-Pesa number (e.g. 07XXXXXXXX or 01XXXXXXXX).' },
        { status: 400 }
      );
    }

    let userEmail = inputEmail || `${normalizedPhone}@akubrecah.co.ke`;
    let userName = 'Customer';
    if (userId) {
      try {
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        userEmail = clerkUser.primaryEmailAddress?.emailAddress || userEmail;
        userName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || userName;
      } catch (e: any) {
        log.warn('[Paystack Charge M-Pesa] Clerk fetch fallback:', e.message);
      }
    }

    const effectiveClerkId = userId || 'guest_user';
    const dbUser = await getOrCreateDbUser(effectiveClerkId, userEmail, userName);

    const reference = `PSTK-MPESA-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    log.info(`[Paystack M-Pesa STK] Triggering KES ${FIXED_DOWNLOAD_FEE_KES} prompt to masked phone ending ${normalizedPhone.slice(-3)} for PIN ${cleanPin.slice(0, 1)}****`);

    const result = await chargePaystackMpesa({
      phone: formatPaystackKenyaPhone(normalizedPhone),
      email: userEmail,
      amountKes: FIXED_DOWNLOAD_FEE_KES,
      reference,
      metadata: {
        userId: dbUser?.id || userId,
        clerkId: userId || 'guest_user',
        type: 'pay_per_download',
        pin: cleanPin,
        phone: normalizedPhone,
        description: `KRA Certificate Download - ${cleanPin}`,
      },
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        reference,
        error: result.error || 'Failed to trigger M-Pesa STK prompt on your phone.',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      reference: result.reference || reference,
      status: result.status || 'pay_offline',
      displayText: result.displayText || 'STK Push sent! Please check your phone and enter your M-Pesa PIN.',
    });
  } catch (error: any) {
    log.error('[Paystack Charge M-Pesa] Catch error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Internal server error triggering Paystack M-Pesa payment.' },
      { status: 500 }
    );
  }
}
