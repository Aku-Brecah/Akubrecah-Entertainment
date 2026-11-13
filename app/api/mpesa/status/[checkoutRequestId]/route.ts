import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { verifyAndFulfillMpesaCheckout } from '@/lib/mpesa-verification';

export const maxDuration = 15;

/**
 * GET /api/mpesa/status/[checkoutRequestId]
 *
 * Returns authoritative Daraja M-Pesa Express transaction status (`pending`,
 * `success`, `cancelled`, `timeout`, or `failed`) from PostgreSQL and live
 * Daraja STK Push Query reconciliation. No mocked or simulated paths.
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ checkoutRequestId: string }> }
) {
  try {
    const params = await props.params;
    const checkoutRequestId = params.checkoutRequestId?.trim();

    if (!checkoutRequestId) {
      return NextResponse.json(
        { success: false, error: 'CheckoutRequestID is required' },
        { status: 400 }
      );
    }

    let clerkId: string | null = null;
    try {
      const session = await auth();
      clerkId = session?.userId || null;
    } catch {
      // Guest status poll
    }

    const pinParam = req.nextUrl.searchParams.get('pin') || undefined;
    const result = await verifyAndFulfillMpesaCheckout({
      checkoutRequestId,
      rawPinInput: pinParam,
      clerkId,
    });

    if (result.httpStatus && result.httpStatus >= 400) {
      return NextResponse.json(result, { status: result.httpStatus });
    }

    return NextResponse.json({
      ...result,
      metadata: {
        amount: result.amount ?? 20,
        mpesaReceiptNumber: result.mpesaReceipt || '',
        phoneNumber: result.phone || '',
        ...(result.pin ? { pin: result.pin } : {}),
      },
    });
  } catch (error: any) {
    log.error('[M-Pesa Status Catch Error]:', error.message);
    return NextResponse.json(
      { success: false, error: 'Payment status lookup failed' },
      { status: 500 }
    );
  }
}
