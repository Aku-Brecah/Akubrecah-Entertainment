import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma, { createSystemLog } from '@/lib/prisma';
import { verifyPaystackTransaction } from '@/lib/paystack';
import { getOrCreateDbUser } from '@/lib/subscription';
import { paystackVerifySchema, firstIssueMessage } from '@/lib/validation/schemas';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    let authClerkId: string | null = null;
    try {
      const session = await auth();
      authClerkId = session?.userId || null;
    } catch {
      // Guest
    }

    const body = await req.json();
    const parsedVerify = paystackVerifySchema.safeParse(body);
    if (!parsedVerify.success) {
      return NextResponse.json(
        { success: false, error: `Invalid request — ${firstIssueMessage(parsedVerify.error)}` },
        { status: 400 }
      );
    }
    const { reference } = parsedVerify.data;

    // Verify with Paystack API
    const verification = await verifyPaystackTransaction(reference);

    if (!verification.success || verification.status !== 'success') {
      return NextResponse.json({
        success: false,
        verified: false,
        status: verification.status,
        error: verification.error || 'Payment has not been confirmed by Paystack.',
      }, { status: 402 });
    }

    const metadata = verification.metadata || {};
    const clerkId = authClerkId || metadata.clerkId || 'guest_user';

    const db = prisma as any;
    let dbUser = await getOrCreateDbUser(clerkId, verification.customerEmail);
    if (!dbUser) {
      dbUser = await db.users?.findFirst({
        where: {
          OR: [
            { clerkId },
            { id: clerkId },
            { id: 'guest_user' },
          ],
        },
      }) || await db.users?.findFirst();
    }

    const type = metadata.type || 'pay_per_download';
    const pin = metadata.pin ? String(metadata.pin).toUpperCase().trim() : '';

    if (type === 'subscription') {
      // Check if already recorded to avoid duplicate entry
      const existingSub = await db.subscription?.findFirst({
        where: {
          mpesaReceipt: `PAYSTACK_${reference}`,
        },
      });

      if (existingSub) {
        return NextResponse.json({
          success: true,
          verified: true,
          type: 'subscription',
          subscriptionId: existingSub.id,
          expiresAt: existingSub.expiresAt,
          alreadyRecorded: true,
        });
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30-day validity

      let subRecord: any;
      try {
        subRecord = await db.subscription?.create({
          data: {
            userId: dbUser.id,
            clerkId: dbUser.clerkId,
            status: 'active',
            planName: 'monthly',
            amountPaid: verification.amountKes,
            currency: 'KES',
            mpesaReceipt: `PAYSTACK_${reference}`,
            startsAt: now,
            expiresAt,
          },
        });
      } catch (subErr: any) {
        // Concurrent webhook+verify delivery for the same reference is a
        // duplicate mint attempt — the DB unique constraint on mpesaReceipt
        // backstops it. Treat P2002 as idempotent success.
        if (subErr?.code !== 'P2002') {
          throw subErr;
        }
        subRecord = await db.subscription?.findFirst({
          where: { mpesaReceipt: `PAYSTACK_${reference}` },
        });
      }

      await createSystemLog({
        level: 'info',
        service: 'Paystack-Subscription',
        message: `Monthly subscription activated for user ${dbUser.email} via Paystack`,
        actor: dbUser.email,
        details: { reference, amount: verification.amountKes, expiresAt },
      });

      return NextResponse.json({
        success: true,
        verified: true,
        type: 'subscription',
        subscriptionId: subRecord?.id,
        expiresAt,
      });

    } else {
      // Pay-per-download flow
      const existingDownload = await db.certificateDownload?.findFirst({
        where: {
          checkoutId: reference,
        },
      });

      if (existingDownload) {
        return NextResponse.json({
          success: true,
          verified: true,
          type: 'pay_per_download',
          downloadId: existingDownload.id,
          pin: existingDownload.pin,
          alreadyRecorded: true,
        });
      }

      // Fail closed on underpayment: the KES 20 floor is enforced here too,
      // not just on the M-Pesa path, so a modified-checkout transaction can
      // never mint a full-price certificate.
      const floorKes = Number(process.env.PAYSTACK_DOWNLOAD_FEE_KES) || 20;
      if (verification.amountKes + 1e-9 < floorKes) {
        log.error(`[Paystack Verify] REJECTED underpaid success (KES ${verification.amountKes} < ${floorKes}) for ${reference}`);
        return NextResponse.json({
          success: false,
          verified: true,
          error: `Payment amount (KES ${verification.amountKes}) is below the required certificate fee (KES ${floorKes}).`,
        }, { status: 402 });
      }

      // Fail closed: without server-side PIN metadata no certificate can be
      // issued (the placeholder 'KRA_CERT' previously unlocked any PIN).
      if (!pin) {
        log.error(`[Paystack Verify] REJECTED: success for ${reference} without PIN metadata — no download record minted`);
        return NextResponse.json({
          success: false,
          verified: true,
          error: 'Payment is missing KRA PIN details on the server side. Contact support with your reference to be issued manually.',
        }, { status: 400 });
      }

      const downloadRecord = await db.certificateDownload?.create({
        data: {
          userId: dbUser?.id || 'guest_user',
          clerkId: dbUser?.clerkId || clerkId,
          pin,
          downloadType: 'pay_per_download',
          amountCharged: verification.amountKes,
          currency: 'KES',
          mpesaReceipt: `PAYSTACK_${reference}`,
          checkoutId: reference,
        },
      });

      await createSystemLog({
        level: 'info',
        service: 'Paystack-Download',
        message: `Certificate download authorized for PIN ${pin} via Paystack`,
        actor: dbUser?.email || verification.customerEmail || 'Taxpayer',
        details: { reference, pin, amount: verification.amountKes },
      });

      return NextResponse.json({
        success: true,
        verified: true,
        type: 'pay_per_download',
        downloadId: downloadRecord?.id,
        pin,
      });
    }

  } catch (error: any) {
    log.error('[Paystack Verify] Error:', error?.stack || error?.message);
    return NextResponse.json(
      { success: false, error: 'Internal server error verifying payment.' },
      { status: 500 }
    );
  }
}
