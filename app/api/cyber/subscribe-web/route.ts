import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import {
  dispatchMpesaStkPush,
  normalizePhoneNumber,
  isValidKenyanMpesaPhone,
} from '@/lib/whatsapp/mpesa-dispatch';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in to subscribe.' },
        { status: 401 }
      );
    }

    const clerkId = session.userId;
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress || 'client@akubrecah.co.ke';

    const body = await req.json().catch(() => ({}));
    const {
      cafeName,
      ownerName,
      whatsappPhone,
      paymentPhone,
    } = body;

    if (!cafeName?.trim() || !ownerName?.trim() || !whatsappPhone?.trim() || !paymentPhone?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please provide Cyber Cafe Name, Owner Name, WhatsApp Number, and M-Pesa Payment Number.',
        },
        { status: 400 }
      );
    }

    if (!isValidKenyanMpesaPhone(paymentPhone)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please enter a valid Safaricom M-Pesa payment number (07XXXXXXXX or 01XXXXXXXX).',
        },
        { status: 400 }
      );
    }

    const cleanWaPhone = normalizePhoneNumber(whatsappPhone);
    const cleanPayPhone = normalizePhoneNumber(paymentPhone);
    const subscriptionFee = Number(process.env.MPESA_SUBSCRIPTION_AMOUNT_KES || 500);

    const db = prisma as any;

    let cafe = await db.cyberCafe.findFirst({
      where: {
        OR: [
          { clerkUserId: clerkId },
          { whatsappPhone: cleanWaPhone },
        ],
      },
    });

    if (cafe && cafe.clerkUserId && cafe.clerkUserId !== clerkId) {
      return NextResponse.json(
        {
          success: false,
          error: 'This Cyber Cafe is already registered to a different account.',
        },
        { status: 403 }
      );
    }

    if (cafe) {
      cafe = await db.cyberCafe.update({
        where: { id: cafe.id },
        data: {
          cafeName: cafeName.trim(),
          ownerName: ownerName.trim(),
          whatsappPhone: cleanWaPhone,
          paymentPhone: cleanPayPhone,
          clerkUserId: clerkId,
          updatedAt: new Date(),
        },
      });
    } else {
      cafe = await db.cyberCafe.create({
        data: {
          cafeName: cafeName.trim(),
          ownerName: ownerName.trim(),
          whatsappPhone: cleanWaPhone,
          paymentPhone: cleanPayPhone,
          status: 'pending',
          clerkUserId: clerkId,
        },
      });
    }

    const stkResult = await dispatchMpesaStkPush({
      phone: cleanPayPhone,
      amount: subscriptionFee,
      reference: `CYBER-${cafe.id.slice(0, 8)}`,
      channel: 'cyber',
      description: `Cyber Cafe Pass`,
      userClerkId: clerkId,
      userEmail,
      metadata: {
        cyberCafeId: cafe.id,
        cafeName: cafe.cafeName,
        whatsappPhone: cleanWaPhone,
      },
    });

    if (!stkResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: stkResult.error || 'Failed to dispatch M-Pesa STK Push.',
        },
        { status: 400 }
      );
    }

    const checkoutId = stkResult.checkoutRequestId || stkResult.CheckoutRequestID;

    if (checkoutId) {
      await db.cyberCafe.update({
        where: { id: cafe.id },
        data: { notes: `CHECKOUT_ID:${checkoutId}` },
      });
    }

    return NextResponse.json({
      success: true,
      gateway: 'daraja',
      status: 'PENDING',
      amount: subscriptionFee,
      phone: cleanPayPhone,
      checkoutRequestId: checkoutId,
      merchantRequestId: stkResult.MerchantRequestID,
      message: `Safaricom M-Pesa STK Push sent to ${cleanPayPhone}. Enter your M-Pesa PIN to complete the KES ${subscriptionFee} Cyber Cafe Pass.`,
    });
  } catch (error: any) {
    log.error('[api/cyber/subscribe-web] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
