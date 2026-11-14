import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { tryResolveKraPin } from '@/lib/masking';
import { mpesaStkPushSchema, firstIssueMessage } from '@/lib/validation/schemas';
import {
  normalizePhoneNumber,
  isValidKenyanMpesaPhone,
  dispatchMpesaStkPush,
} from '@/lib/whatsapp/mpesa-dispatch';

export const maxDuration = 30;

export { normalizePhoneNumber, dispatchMpesaStkPush };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsedPush = mpesaStkPushSchema.safeParse(body);
    if (!parsedPush.success) {
      return NextResponse.json(
        { success: false, error: `Invalid request — ${firstIssueMessage(parsedPush.error)}` },
        { status: 400 }
      );
    }

    const { phone, reference, pin, type, description } = parsedPush.data;

    if (!isValidKenyanMpesaPhone(phone)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please enter a valid Safaricom M-Pesa number (07XXXXXXXX or 01XXXXXXXX).',
        },
        { status: 400 }
      );
    }

    // Resolve plain or sealed (kraseal1:) PIN strictly server-side
    const resolvedPin =
      (pin ? tryResolveKraPin(pin.trim()) || (/^[A-Z]\d{9}[A-Z]$/i.test(pin.trim()) ? pin.trim().toUpperCase() : '') : '') ||
      (reference ? tryResolveKraPin(reference.replace(/^CERT-/i, '').trim()) || '' : '');

    if (type === 'certificate' && !resolvedPin && !reference) {
      return NextResponse.json(
        { success: false, error: 'A valid KRA PIN or transaction reference is required.' },
        { status: 400 }
      );
    }

    // Server-authoritative pricing: never trust client-submitted amounts.
    const certFee = Number(process.env.MPESA_DOWNLOAD_FEE_KES || 20);
    const cyberFee = Number(process.env.MPESA_SUBSCRIPTION_AMOUNT_KES || 500);
    const effectiveAmount = type === 'cyber' ? cyberFee : certFee;

    let userClerkId = 'anonymous';
    let userEmail = 'customer@akubrecah.co.ke';
    try {
      const { userId } = await auth();
      if (userId) {
        userClerkId = userId;
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        userEmail = clerkUser.primaryEmailAddress?.emailAddress || userEmail;
      }
    } catch {
      // Guest / public portal retrieval checkout
    }

    const effectiveReference = resolvedPin
      ? `CERT-${resolvedPin}`
      : reference || `KRA-${Date.now()}`;

    const result = await dispatchMpesaStkPush({
      phone,
      amount: effectiveAmount,
      reference: effectiveReference,
      pin: resolvedPin || null,
      channel: type === 'cyber' ? 'cyber' : 'web',
      description:
        description ||
        (type === 'cyber' ? 'Cyber Cafe Pass' : 'KRA Certificate'),
      userClerkId,
      userEmail,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          gateway: result.gateway || 'none',
          error: result.error || 'Failed to initiate M-Pesa STK Push.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      gateway: 'daraja',
      status: 'PENDING',
      checkoutRequestId: result.checkoutRequestId,
      merchantRequestId: result.MerchantRequestID,
      amount: effectiveAmount,
      phone: result.normalizedPhone || normalizePhoneNumber(phone),
      alreadyPending: Boolean(result.alreadyPending),
      message:
        result.CustomerMessage ||
        'M-Pesa prompt sent to your phone. Enter your M-Pesa PIN to authorize payment.',
    });
  } catch (error: any) {
    log.error('[M-Pesa STK Catch Error]:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to process the M-Pesa STK Push right now. Please try again shortly.',
      },
      { status: 500 }
    );
  }
}
