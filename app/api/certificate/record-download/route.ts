import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { getOrCreateDbUser, isAdminUser } from '@/lib/subscription';
import { recordDownloadSchema, firstIssueMessage } from '@/lib/validation/schemas';

export const maxDuration = 10;

/**
 * POST /api/certificate/record-download
 *
 * Records a certificate download after a confirmed payment or via active subscription.
 * Returns a one-time downloadToken that the generate-certificate route validates.
 *
 * Body:
 *   - pin: string           — the KRA PIN being downloaded
 *   - checkoutId?: string   — Daraja CheckoutRequestID (required for pay_per_download)
 *   - subscriptionId?: string — active subscription id (required for subscription type)
 *   - downloadType: 'subscription' | 'pay_per_download'
 */
export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null;
    try {
      const session = await auth();
      userId = session?.userId || null;
    } catch {
      // Guest user
    }

    const body = await req.json();
    const parsed = recordDownloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: `Invalid request — ${firstIssueMessage(parsed.error)}` },
        { status: 400 }
      );
    }
    const { pin, checkoutId, subscriptionId, downloadType } = parsed.data;

    if (!pin || !downloadType) {
      return NextResponse.json({ success: false, error: 'pin and downloadType are required' }, { status: 400 });
    }

    const db = prisma as any;

    // 1. Resolve or auto-provision DB user (guest or authenticated)
    const effectiveClerkId = userId || 'guest_user';
    const dbUser = await getOrCreateDbUser(effectiveClerkId, 'guest@akubrecah.co.ke', 'Guest Taxpayer');
    if (!dbUser) {
      return NextResponse.json({ success: false, error: 'Unable to initialize user account.' }, { status: 500 });
    }

    const now = new Date();
    const isAdmin = userId ? await isAdminUser(userId) : false;

    // 2. Validate access type server-side — never trust client
    if (isAdmin || downloadType === 'subscription') {
      let activeSubId: string | null = null;

      if (!isAdmin) {
        const subDelegate = db.subscription || db.subscriptions;
        const activeSub = await subDelegate?.findFirst({
          where: {
            userId: dbUser.id,
            status: 'active',
            expiresAt: { gt: now },
          },
        });
        if (!activeSub) {
          return NextResponse.json({ success: false, error: 'No active subscription found.' }, { status: 403 });
        }
        activeSubId = activeSub.id;
      }

      // Record the subscription / admin download
      const record = await db.certificateDownload?.create({
        data: {
          userId: dbUser.id,
          clerkId: userId,
          pin: pin.toUpperCase(),
          downloadType: isAdmin ? 'admin' : 'subscription',
          amountCharged: 0,
          currency: 'KES',
          subscriptionId: activeSubId,
        },
      });

      return NextResponse.json({ success: true, downloadId: record.id });

    } else if (downloadType === 'pay_per_download') {
      if (!checkoutId) {
        return NextResponse.json({ success: false, error: 'checkoutId is required for pay_per_download' }, { status: 400 });
      }

      // Prevent duplicate / verify redemption window if this checkoutId was already claimed
      const existing = await db.certificateDownload?.findFirst({
        where: { checkoutId },
      });
      if (existing) {
        const { claimOrVerifyRedemptionWindow } = await import('@/lib/mpesa-redemption');
        const redemption = await claimOrVerifyRedemptionWindow({
          checkoutId,
          mpesaReceipt: existing.mpesaReceipt || checkoutId,
          requestedPinInput: pin,
          clerkId: userId || 'guest_user',
          amount: Number(existing.amountCharged) || 20,
        });

        if (!redemption.allowed) {
          return NextResponse.json(
            { success: false, error: redemption.error || 'Redemption window expired or unauthorized.' },
            { status: redemption.httpStatus || 403 }
          );
        }

        return NextResponse.json({
          success: true,
          downloadId: existing.id,
          alreadyRecorded: true,
          redemptionStatus: redemption.redemptionStatus,
          expiresAt: redemption.expiresAt,
          remainingSeconds: redemption.remainingSeconds,
          downloadCount: redemption.downloadCount,
        });
      }

      // Verify payment was actually successful in durable DB or callback registry
      const txRecord = await db.mpesaTransaction?.findUnique({
        where: { checkoutRequestId: checkoutId },
      });
      const g = global as any;
      const registry: Record<string, any> = g.mpesaCallbacks || {};
      const payment = registry[checkoutId];

      const isPaidInDb = txRecord?.status === 'COMPLETED';
      const isPaidInMem = payment && payment.status === 'success';

      if (!isPaidInDb && !isPaidInMem) {
        return NextResponse.json({ success: false, error: 'Payment not confirmed. Please complete M-Pesa payment first.' }, { status: 402 });
      }

      // SECURITY: payment-for-A must only unlock certificate-A. If the payment
      // proof carries a bound PIN, the requested PIN must match it exactly.
      const paidPin = String(txRecord?.pin || payment?.metadata?.pin || '').toUpperCase();
      if (paidPin && paidPin !== 'KRA_CERT' && paidPin !== pin.toUpperCase()) {
        return NextResponse.json(
          { success: false, error: 'This M-Pesa transaction code has already been used for another KRA PIN. Please provide a valid payment transaction code.' },
          { status: 403 }
        );
      }

      // Authoritative redemption claim: binds PIN, starts 5-minute window
      const { claimOrVerifyRedemptionWindow } = await import('@/lib/mpesa-redemption');
      const redemption = await claimOrVerifyRedemptionWindow({
        checkoutId,
        mpesaReceipt: txRecord?.mpesaReceiptNumber || payment?.metadata?.mpesaReceiptNumber || null,
        requestedPinInput: pin,
        clerkId: userId || 'guest_user',
        amount: Number(txRecord?.amount || payment?.metadata?.amount || 20),
        dbUserId: dbUser.id,
      });

      if (!redemption.allowed) {
        return NextResponse.json(
          { success: false, error: redemption.error || 'Redemption window expired or unauthorized.' },
          { status: redemption.httpStatus || 403 }
        );
      }

      return NextResponse.json({
        success: true,
        downloadId: redemption.downloadId,
        redemptionStatus: redemption.redemptionStatus,
        expiresAt: redemption.expiresAt,
        remainingSeconds: redemption.remainingSeconds,
        downloadCount: redemption.downloadCount,
      });

    } else {
      return NextResponse.json({ success: false, error: 'Invalid downloadType' }, { status: 400 });
    }

  } catch (error: any) {
    log.error('[record-download] Error:', error.message);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
