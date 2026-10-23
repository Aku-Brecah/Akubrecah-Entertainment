import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { chargePaystackMpesa, formatPaystackKenyaPhone } from '@/lib/paystack';
import { tryResolveKraPin } from '@/lib/masking';
import { mpesaStkPushSchema, firstIssueMessage } from '@/lib/validation/schemas';

export const maxDuration = 30;

// Helper to normalize phone numbers to Safaricom Daraja format: 2547XXXXXXXX or 2541XXXXXXXX
// Shared helpers now live in lib/whatsapp/mpesa-dispatch.ts
import { normalizePhoneNumber, dispatchMpesaStkPush } from '@/lib/whatsapp/mpesa-dispatch';
export { normalizePhoneNumber, dispatchMpesaStkPush };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsedPush = mpesaStkPushSchema.safeParse(body);
    if (!parsedPush.success) {
      return NextResponse.json(
        { success: false, error: `Invalid request — ${firstIssueMessage(parsedPush.error)}` },
        { status: 400 }
      );
    }
    const { phone, reference, description } = parsedPush.data;

    // Official KRA Certificate download fee is strictly KES 20.
    // Enforce server-side pricing to prevent client-side price tampering.
    const FIXED_CERTIFICATE_FEE_KES = 20;
    const effectiveAmount = FIXED_CERTIFICATE_FEE_KES;

    let userClerkId = 'anonymous';
    let userEmail = 'customer@akubrecah.co.ke';
    try {
      const { userId } = await auth();
      if (userId) {
        userClerkId = userId;
        const { isAdminUser } = await import('@/lib/subscription');
        if (await isAdminUser(userId)) {
          return NextResponse.json(
            { success: false, error: 'Admin accounts have full access and do not require payment.' },
            { status: 403 }
          );
        }
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        userEmail = clerkUser.primaryEmailAddress?.emailAddress || userEmail;
      }
    } catch {}

    const result = await dispatchMpesaStkPush({
      phone,
      amount: effectiveAmount,
      reference,
      description: description || `KRA Certificate Payment - KES ${effectiveAmount}`,
      userClerkId,
      userEmail,
    });

    const status = result.success ? 200 : 400;
    return NextResponse.json(result, { status });
  } catch (error: any) {
    log.error('[M-Pesa STK Catch Error]:', error.message);
    return NextResponse.json({
      success: false,
      error: 'Unable to process the M-Pesa STK Push right now. Please try again shortly.',
    }, { status: 500 });
  }
}
