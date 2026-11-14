import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { mpesaVerifySchema, firstIssueMessage } from '@/lib/validation/schemas';
import {
  verifyAndFulfillMpesaCheckout,
  verifyManualMpesaReceipt,
} from '@/lib/mpesa-verification';

export const maxDuration = 20;

/**
 * POST /api/mpesa/verify
 *
 * Authoritative verification endpoint for Safaricom Daraja M-Pesa Express
 * and Manual Till fallback receipt verification.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = mpesaVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: `Invalid request — ${firstIssueMessage(parsed.error)}` },
        { status: 400 }
      );
    }

    let clerkId: string | null = null;
    try {
      const session = await auth();
      clerkId = session?.userId || null;
    } catch {
      // Guest portal requester
    }

    const { checkoutRequestId, mpesaCode, pin, phone, force } = parsed.data;

    let result;
    if (mpesaCode && checkoutRequestId) {
      const stkResult = await verifyAndFulfillMpesaCheckout({
        checkoutRequestId,
        rawPinInput: pin,
        clerkId,
        forceQuery: Boolean(force),
      });
      result = stkResult.verified
        ? stkResult
        : await verifyManualMpesaReceipt({
            mpesaCodeInput: mpesaCode,
            rawPinInput: pin,
            phone,
            clerkId,
          });
    } else if (mpesaCode) {
      result = await verifyManualMpesaReceipt({
        mpesaCodeInput: mpesaCode,
        rawPinInput: pin,
        phone,
        clerkId,
      });
    } else {
      result = await verifyAndFulfillMpesaCheckout({
        checkoutRequestId: checkoutRequestId!,
        rawPinInput: pin,
        clerkId,
        forceQuery: Boolean(force),
      });
    }

    if (result.httpStatus && result.httpStatus >= 400) {
      return NextResponse.json(result, { status: result.httpStatus });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    log.error('[M-Pesa Verify Error]:', error.message);
    return NextResponse.json(
      { success: false, verified: false, error: 'Payment verification failed. Please retry.' },
      { status: 500 }
    );
  }
}

