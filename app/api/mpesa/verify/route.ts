import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { mpesaVerifySchema, firstIssueMessage } from '@/lib/validation/schemas';
import { verifyAndFulfillMpesaCheckout } from '@/lib/mpesa-verification';

export const maxDuration = 20;

/**
 * POST /api/mpesa/verify
 *
 * Authoritative verification endpoint for Safaricom Daraja M-Pesa Express.
 * Checks durable PostgreSQL records (`certificate_downloads`, `mpesa_transactions`)
 * and reconciles via Daraja STK Push Query when callback delivery is pending.
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

    const result = await verifyAndFulfillMpesaCheckout({
      checkoutRequestId: parsed.data.checkoutRequestId,
      rawPinInput: parsed.data.pin,
      clerkId,
    });

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

