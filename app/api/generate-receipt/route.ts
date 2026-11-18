import { NextResponse } from 'next/server';

export const maxDuration = 10;

const RECEIPT_DISABLED_RESPONSE = {
  success: false,
  error:
    'Payment receipt downloads are disabled. Only the official KRA PIN Certificate PDF is available after payment.',
};

/**
 * Payment receipt downloads are permanently disabled across all environments.
 * After payment confirmation, only the official KRA PIN Certificate PDF is
 * generated and auto-downloaded via POST /api/generate-certificate.
 */
export async function POST() {
  return NextResponse.json(RECEIPT_DISABLED_RESPONSE, { status: 410 });
}

export async function GET() {
  return NextResponse.json(RECEIPT_DISABLED_RESPONSE, { status: 410 });
}
