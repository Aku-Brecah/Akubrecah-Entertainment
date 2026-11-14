import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminCaller } from '@/lib/admin-auth';
import { verifyAndFulfillMpesaCheckout } from '@/lib/mpesa-verification';
import {
  getDarajaConfig,
  getDarajaAccessToken,
  dispatchMpesaStkPush,
  queryMpesaStkPushStatus,
  isValidKenyanMpesaPhone,
  normalizePhoneNumber,
} from '@/lib/whatsapp/mpesa-dispatch';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/daraja
 * Returns active Safaricom Daraja gateway configuration (secrets redacted) and
 * all active internal & Safaricom endpoints for the Admin Daraja Console.
 */
export async function GET(req: NextRequest) {
  const admin = await verifyAdminCaller(req);
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Super Admin access required.' },
      { status: 403 }
    );
  }

  const config = getDarajaConfig();

  return NextResponse.json({
    success: true,
    config: {
      environment: config.env,
      baseUrl: config.baseUrl,
      shortCode: config.shortCode,
      partyB: config.partyB,
      transactionType: config.transactionType,
      callbackUrl: config.callbackUrl,
      hasDaraja: config.hasDaraja,
      hasConsumerKey: Boolean(config.consumerKey),
      hasConsumerSecret: Boolean(config.consumerSecret),
      hasPassKey: Boolean(config.passKey),
      hasCallbackToken: Boolean(config.callbackToken),
      downloadFeeKes: Number(process.env.MPESA_DOWNLOAD_FEE_KES || 20),
    },
    endpoints: [
      {
        id: 'internal-stkpush',
        scope: 'Internal API',
        method: 'POST',
        path: '/api/mpesa/stkpush',
        auth: 'Public / App Session',
        purpose: 'Initiate Safaricom Daraja M-Pesa Express STK Push & persist CheckoutRequestID',
      },
      {
        id: 'internal-status',
        scope: 'Internal API',
        method: 'GET',
        path: '/api/mpesa/status/[checkoutRequestId]',
        auth: 'Public / PIN Binding',
        purpose: 'Poll live settlement status with automatic Daraja STK Push Query reconciliation',
      },
      {
        id: 'internal-verify',
        scope: 'Internal API',
        method: 'POST',
        path: '/api/mpesa/verify',
        auth: 'Public / PIN Binding',
        purpose: 'Authoritatively verify & idempotently unlock taxpayer record + mint download token',
      },
      {
        id: 'internal-callback',
        scope: 'Webhook',
        method: 'POST',
        path: '/api/mpesa/callback',
        auth: config.callbackToken ? 'Callback Token Query Secret' : 'Open Webhook',
        purpose: 'Receive asynchronous Lipa na M-Pesa Online STK callback results from Safaricom',
      },
      {
        id: 'internal-admin-daraja',
        scope: 'Admin API',
        method: 'GET / POST',
        path: '/api/admin/daraja',
        auth: 'Super Admin',
        purpose: 'Test Daraja OAuth 2.0, dispatch diagnostic STK Push, and query CheckoutRequestIDs',
      },
      {
        id: 'daraja-oauth',
        scope: 'Safaricom Live',
        method: 'GET',
        path: `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        auth: 'Basic ConsumerKey:ConsumerSecret',
        purpose: 'Generate short-lived Daraja Bearer access token',
      },
      {
        id: 'daraja-stkpush',
        scope: 'Safaricom Live',
        method: 'POST',
        path: `${config.baseUrl}/mpesa/stkpush/v1/processrequest`,
        auth: 'Bearer OAuth Token',
        purpose: 'Dispatch Lipa na M-Pesa Online prompt (CustomerBuyGoodsOnline / CustomerPayBillOnline)',
      },
      {
        id: 'daraja-stkquery',
        scope: 'Safaricom Live',
        method: 'POST',
        path: `${config.baseUrl}/mpesa/stkpushquery/v1/query`,
        auth: 'Bearer OAuth Token',
        purpose: 'Query real-time STK Push result code directly from Safaricom Apigee',
      },
    ],
  });
}

/**
 * POST /api/admin/daraja
 * Interactive admin diagnostic runner for Safaricom Daraja endpoints:
 * - action: "oauth"   -> Tests live OAuth 2.0 token generation & latency
 * - action: "stkpush" -> Sends an actual M-Pesa STK Push to a target phone
 * - action: "query"   -> Queries Daraja / DB for a CheckoutRequestID or M-Pesa Receipt
 */
export async function POST(req: NextRequest) {
  const admin = await verifyAdminCaller(req);
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Super Admin access required.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '').trim().toLowerCase();

    if (action === 'oauth') {
      const config = getDarajaConfig();
      if (!config.hasDaraja) {
        return NextResponse.json(
          {
            success: false,
            action: 'oauth',
            error: 'Daraja credentials are incomplete in server environment variables.',
          },
          { status: 400 }
        );
      }

      const startedAt = Date.now();
      const token = await getDarajaAccessToken(
        config.baseUrl,
        config.consumerKey,
        config.consumerSecret,
        true
      );
      const latencyMs = Date.now() - startedAt;

      if (!token) {
        return NextResponse.json(
          {
            success: false,
            action: 'oauth',
            latencyMs,
            environment: config.env,
            baseUrl: config.baseUrl,
            error: 'Safaricom Daraja OAuth 2.0 authentication failed. Check Consumer Key and Secret.',
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'oauth',
        latencyMs,
        environment: config.env,
        baseUrl: config.baseUrl,
        shortCode: config.shortCode,
        partyB: config.partyB,
        transactionType: config.transactionType,
        tokenPreview: `${token.slice(0, 8)}...${token.slice(-4)}`,
      });
    }

    if (action === 'stkpush') {
      const rawPhone = String(body?.phone || '').trim();
      const normalizedPhone = normalizePhoneNumber(rawPhone);
      if (!isValidKenyanMpesaPhone(normalizedPhone)) {
        return NextResponse.json(
          {
            success: false,
            action: 'stkpush',
            error: 'Valid Kenyan M-Pesa phone number is required (07XXXXXXXX, 01XXXXXXXX, or +2547XXXXXXXX).',
          },
          { status: 400 }
        );
      }

      const amount = Math.max(1, Math.round(Number(body?.amount) || 20));
      const rawPin = typeof body?.pin === 'string' ? body.pin.trim().toUpperCase() : '';
      const validPin = /^[A-Z]\d{9}[A-Z]$/.test(rawPin) ? rawPin : undefined;
      const reference = validPin
        ? `CERT-${validPin}`
        : (rawPin.replace(/[^A-Z0-9-]/gi, '').slice(0, 12) || 'ADMIN-TEST');

      const result = await dispatchMpesaStkPush({
        phone: normalizedPhone,
        amount,
        reference,
        pin: validPin,
        description: 'Admin Daraja',
        userClerkId: admin.userId,
        userEmail: admin.email,
        channel: 'web',
        metadata: {
          source: 'admin_daraja_console',
          triggeredBy: admin.email,
        },
      });

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            action: 'stkpush',
            normalizedPhone: result.normalizedPhone || normalizedPhone,
            error: result.error || 'Daraja STK Push request failed.',
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'stkpush',
        checkoutRequestId: result.checkoutRequestId,
        merchantRequestId: result.MerchantRequestID,
        customerMessage: result.CustomerMessage,
        normalizedPhone: result.normalizedPhone,
        alreadyPending: Boolean(result.alreadyPending),
        amount,
        pin: validPin || null,
      });
    }

    if (action === 'query') {
      const targetId = String(body?.checkoutRequestId || body?.mpesaReceipt || '').trim();
      if (!targetId) {
        return NextResponse.json(
          {
            success: false,
            action: 'query',
            error: 'Please enter a CheckoutRequestID (ws_CO_...) or M-Pesa Receipt number.',
          },
          { status: 400 }
        );
      }

      const db = prisma as any;
      const rawPin = typeof body?.pin === 'string' ? body.pin.trim().toUpperCase() : '';
      const explicitPin = /^[A-Z]\d{9}[A-Z]$/.test(rawPin) ? rawPin : undefined;

      // Resolve by CheckoutRequestID or M-Pesa Receipt Number from PostgreSQL first
      let txRecord: any = null;
      try {
        if (typeof db.mpesaTransaction?.findUnique === 'function' && targetId.startsWith('ws_CO_')) {
          txRecord = await db.mpesaTransaction.findUnique({
            where: { checkoutRequestId: targetId },
          });
        } else if (typeof db.mpesaTransaction?.findFirst === 'function') {
          txRecord = await db.mpesaTransaction.findFirst({
            where: {
              OR: [
                { checkoutRequestId: targetId },
                { mpesaReceiptNumber: targetId },
              ],
            },
            orderBy: { createdAt: 'desc' },
          });
        }
      } catch { }

      const resolvedCheckoutId = txRecord?.checkoutRequestId || targetId;
      const pinForFulfill = explicitPin || txRecord?.pin || undefined;

      if (resolvedCheckoutId.startsWith('ws_CO_') && pinForFulfill) {
        const verified = await verifyAndFulfillMpesaCheckout({
          checkoutRequestId: resolvedCheckoutId,
          rawPinInput: pinForFulfill,
          clerkId: txRecord?.clerkId || admin.userId,
        });

        return NextResponse.json({
          success: true,
          action: 'query',
          checkoutRequestId: resolvedCheckoutId,
          result: verified,
        });
      }

      // Direct Daraja STK Push Query without requiring a KRA PIN (for admin diagnostic pushes)
      if (resolvedCheckoutId.startsWith('ws_CO_')) {
        const liveQuery = await queryMpesaStkPushStatus(resolvedCheckoutId, { force: true });
        return NextResponse.json({
          success: true,
          action: 'query',
          checkoutRequestId: resolvedCheckoutId,
          result: {
            success: liveQuery.status === 'success',
            verified: liveQuery.status === 'success',
            status: liveQuery.status,
            checkoutRequestId: resolvedCheckoutId,
            mpesaReceipt: liveQuery.mpesaReceipt || txRecord?.mpesaReceiptNumber || undefined,
            amount: txRecord?.amount ? Number(txRecord.amount) : undefined,
            phone: txRecord?.phone || undefined,
            resultCode: liveQuery.resultCode ?? txRecord?.resultCode ?? null,
            resultDesc:
              liveQuery.resultDesc ||
              txRecord?.resultDesc ||
              'Queried directly from Safaricom Daraja STK Push Query API.',
          },
        });
      }

      if (txRecord) {
        return NextResponse.json({
          success: true,
          action: 'query',
          checkoutRequestId: txRecord.checkoutRequestId,
          result: {
            success: txRecord.status === 'COMPLETED',
            verified: txRecord.status === 'COMPLETED',
            status: txRecord.status.toLowerCase(),
            checkoutRequestId: txRecord.checkoutRequestId,
            mpesaReceipt: txRecord.mpesaReceiptNumber || txRecord.checkoutRequestId,
            pin: txRecord.pin || undefined,
            amount: Number(txRecord.amount) || undefined,
            phone: txRecord.phone || undefined,
            resultCode: txRecord.resultCode ?? null,
            resultDesc: txRecord.resultDesc || `Matched DB record (${txRecord.status})`,
          },
        });
      }

      return NextResponse.json(
        {
          success: false,
          action: 'query',
          error: `No matching transaction found for "${targetId}". Pass a valid CheckoutRequestID starting with ws_CO_ to query Safaricom live.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Unsupported action. Use "oauth", "stkpush", or "query".',
      },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Admin Daraja diagnostic error.',
      },
      { status: 500 }
    );
  }
}
