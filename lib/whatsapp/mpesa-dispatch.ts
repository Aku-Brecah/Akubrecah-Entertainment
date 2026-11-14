/**
 * Direct in-process Safaricom Daraja M-Pesa Express (STK Push) dispatcher &
 * live transaction status / reconciliation service.
 */
import dns from 'dns';
import net from 'net';
import prisma from '@/lib/prisma';
import { log } from '@/lib/monitoring/logger';
import { tryResolveKraPin } from '@/lib/masking';

// Force IPv4-first DNS and disable Node's 250ms Happy Eyeballs family timer so
// connections to api.safaricom.co.ke do not hit UND_ERR_CONNECT_TIMEOUT on IPv6/DNS64 hosts.
try {
  dns.setDefaultResultOrder('ipv4first');
  if (typeof net.setDefaultAutoSelectFamily === 'function') {
    net.setDefaultAutoSelectFamily(false);
  }
} catch { }

interface DarajaTokenCacheEntry {
  token: string;
  expiresAt: number;
}

function getDarajaTimestamp(): string {
  // Safaricom Daraja expects East Africa Time (EAT = UTC+3) in YYYYMMDDHHmmss format.
  const eat = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return (
    eat.getUTCFullYear().toString() +
    (eat.getUTCMonth() + 1).toString().padStart(2, '0') +
    eat.getUTCDate().toString().padStart(2, '0') +
    eat.getUTCHours().toString().padStart(2, '0') +
    eat.getUTCMinutes().toString().padStart(2, '0') +
    eat.getUTCSeconds().toString().padStart(2, '0')
  );
}

async function darajaFetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 429) {
    // Safaricom Apigee enforces a strict SpikeArrest burst limit (~2.5 req/s).
    await new Promise((resolve) => setTimeout(resolve, 450));
    return fetch(url, init);
  }
  return res;
}

export async function getDarajaAccessToken(
  baseUrl: string,
  consumerKey: string,
  consumerSecret: string,
  forceRefresh = false
): Promise<string | null> {
  const g = global as any;
  g.darajaOAuthCache = g.darajaOAuthCache || ({} as Record<string, DarajaTokenCacheEntry>);
  const cacheKey = `${baseUrl}:${consumerKey}`;
  const cached: DarajaTokenCacheEntry | undefined = g.darajaOAuthCache[cacheKey];

  if (!forceRefresh && cached && cached.token && Date.now() < cached.expiresAt) {
    return cached.token;
  }

  const authString = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const oauthRes = await darajaFetchWithRetry(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: 'GET',
      headers: { Authorization: `Basic ${authString}` },
    }
  );

  if (!oauthRes.ok) {
    const errBody = await oauthRes.text().catch(() => '');
    log.error(`[Daraja OAuth] Failed (${oauthRes.status}): ${errBody.slice(0, 300)}`);
    return null;
  }

  const oauthData = await oauthRes.json();
  const accessToken = oauthData?.access_token;
  if (!accessToken) {
    log.error('[Daraja OAuth] Response missing access_token');
    return null;
  }

  // Cache for 50 minutes (or expires_in - 300s, minimum 60s) to avoid SpikeArrest on back-to-back calls
  const ttlSeconds = Math.max(60, (Number(oauthData.expires_in) || 3599) - 300);
  g.darajaOAuthCache[cacheKey] = {
    token: accessToken,
    expiresAt: Date.now() + ttlSeconds * 1000,
  };

  return accessToken;
}

export function getDarajaConfig() {
  const consumerKey =
    process.env.DARAJA_CONSUMER_KEY || process.env.MPESA_CONSUMER_KEY || '';
  const consumerSecret =
    process.env.DARAJA_CONSUMER_SECRET || process.env.MPESA_CONSUMER_SECRET || '';
  const shortCode =
    process.env.DARAJA_SHORTCODE || process.env.MPESA_SHORTCODE || '';
  const partyB = (
    process.env.DARAJA_PARTYB ||
    process.env.DARAJA_TILL_NUMBER ||
    process.env.MPESA_PARTYB ||
    process.env.MPESA_TILL_NUMBER ||
    shortCode
  ).trim();
  const rawTxType = (
    process.env.DARAJA_TRANSACTION_TYPE ||
    process.env.MPESA_TRANSACTION_TYPE ||
    ''
  ).trim();
  const transactionType =
    rawTxType ||
    (partyB && partyB !== shortCode
      ? 'CustomerBuyGoodsOnline'
      : 'CustomerPayBillOnline');
  const passKey =
    process.env.DARAJA_PASSKEY || process.env.MPESA_PASSKEY || '';
  const callbackUrl =
    process.env.DARAJA_CALLBACK_URL ||
    process.env.MPESA_CALLBACK_URL ||
    'https://kra.akubrecah.com/api/mpesa/callback';
  const callbackToken =
    process.env.DARAJA_CALLBACK_TOKEN || process.env.MPESA_CALLBACK_TOKEN || '';
  const env = (
    process.env.DARAJA_ENVIRONMENT ||
    process.env.MPESA_ENV ||
    'production'
  ).toLowerCase();

  const hasDaraja = Boolean(
    consumerKey &&
    consumerSecret &&
    shortCode &&
    passKey &&
    !consumerKey.includes('your-') &&
    !consumerSecret.includes('your-') &&
    !shortCode.includes('your-') &&
    !passKey.includes('your-')
  );

  // Official Safaricom Daraja production endpoint (direct live API only)
  const baseUrl =
    env === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';

  return {
    consumerKey,
    consumerSecret,
    shortCode,
    partyB,
    transactionType,
    passKey,
    callbackUrl,
    callbackToken,
    env,
    hasDaraja,
    baseUrl,
  };
}

export function normalizePhoneNumber(phone: string): string {
  const cleaned = String(phone || '').replace(/[\s\-\+\(\)]/g, '');
  if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) {
    return '254' + cleaned;
  }
  if ((cleaned.startsWith('07') || cleaned.startsWith('01')) && cleaned.length === 10) {
    return '254' + cleaned.substring(1);
  }
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return cleaned;
  }
  return cleaned;
}

export function isValidKenyanMpesaPhone(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  return /^254(7|1)\d{8}$/.test(normalized);
}

/**
 * Direct in-process M-Pesa STK Push dispatcher via Safaricom Daraja API.
 * Used by both HTTP API routes and WhatsApp in-process chat state machine.
 */
export async function dispatchMpesaStkPush({
  phone,
  amount,
  reference,
  description,
  userClerkId = 'anonymous',
  userEmail = 'customer@akubrecah.co.ke',
  userId,
  pin,
  channel = 'web',
  callbackUrl,
  metadata,
}: {
  phone: string;
  amount: number;
  reference: string;
  description?: string;
  userClerkId?: string;
  userEmail?: string;
  userId?: string | null;
  pin?: string | null;
  channel?: 'web' | 'whatsapp' | 'cyber';
  callbackUrl?: string;
  metadata?: Record<string, any>;
}): Promise<{
  success: boolean;
  checkoutRequestId?: string;
  CheckoutRequestID?: string;
  MerchantRequestID?: string;
  CustomerMessage?: string;
  gateway?: 'daraja' | 'none';
  normalizedPhone?: string;
  alreadyPending?: boolean;
  error?: string;
}> {
  try {
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!isValidKenyanMpesaPhone(normalizedPhone)) {
      return {
        success: false,
        gateway: 'none',
        error: 'Invalid Kenyan M-Pesa phone number. Use format 07XXXXXXXX, 01XXXXXXXX, or +2547XXXXXXXX.',
      };
    }

    const numericAmount = Math.round(Number(amount));
    if (!Number.isFinite(numericAmount) || numericAmount < 1) {
      return {
        success: false,
        gateway: 'none',
        error: 'Invalid payment amount specified.',
      };
    }

    const {
      consumerKey,
      consumerSecret,
      shortCode,
      partyB,
      transactionType,
      passKey,
      callbackUrl: configuredCallbackUrl,
      callbackToken,
      hasDaraja,
      baseUrl,
    } = getDarajaConfig();

    if (!hasDaraja) {
      log.error('[M-Pesa STK] Safaricom Daraja credentials are missing or incomplete.');
      return {
        success: false,
        gateway: 'none',
        normalizedPhone,
        error: 'Safaricom Daraja payment gateway is not configured on the server.',
      };
    }

    // Resolve sealed-PIN blobs (kraseal1:...) passed in pin or reference
    const resolvedRefPin =
      (pin ? tryResolveKraPin(pin) || (/^[A-Z]\d{9}[A-Z]$/i.test(pin.trim()) ? pin.trim().toUpperCase() : null) : null) ||
      tryResolveKraPin(reference) ||
      tryResolveKraPin(reference.replace(/^CERT-/i, ''));
    const cleanBoundPin = resolvedRefPin ? resolvedRefPin.toUpperCase() : null;
    const effectiveReference = cleanBoundPin ? `CERT-${cleanBoundPin}` : reference;

    // Duplicate STK Push guard: reuse active PENDING checkout initiated within the last 25 seconds
    const db = prisma as any;
    try {
      if (typeof db.mpesaTransaction?.findFirst === 'function') {
        const recentPending = await db.mpesaTransaction.findFirst({
          where: {
            phone: normalizedPhone,
            status: 'PENDING',
            amount: numericAmount,
            ...(cleanBoundPin ? { pin: cleanBoundPin } : { reference: effectiveReference }),
            createdAt: { gt: new Date(Date.now() - 25_000) },
          },
          orderBy: { createdAt: 'desc' },
        });
        if (recentPending?.checkoutRequestId) {
          log.info(
            `[M-Pesa STK] Returning existing active prompt ${recentPending.checkoutRequestId} for ***${normalizedPhone.slice(-3)}`
          );
          return {
            success: true,
            checkoutRequestId: recentPending.checkoutRequestId,
            CheckoutRequestID: recentPending.checkoutRequestId,
            MerchantRequestID: recentPending.merchantRequestId || recentPending.checkoutRequestId,
            CustomerMessage: 'An M-Pesa payment prompt was already sent to your phone. Please enter your M-Pesa PIN.',
            gateway: 'daraja',
            normalizedPhone,
            alreadyPending: true,
          };
        }
      }
    } catch (dupErr: any) {
      log.warn('[M-Pesa STK] Duplicate guard lookup notice:', dupErr?.message);
    }

    const rawCallbackUrl = callbackUrl || configuredCallbackUrl || 'https://kra.akubrecah.com/api/mpesa/callback';
    const finalCallbackUrl =
      callbackToken && !rawCallbackUrl.includes('token=')
        ? `${rawCallbackUrl}${rawCallbackUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(callbackToken)}`
        : rawCallbackUrl;

    const accessToken = await getDarajaAccessToken(baseUrl, consumerKey, consumerSecret);
    if (!accessToken) {
      return {
        success: false,
        gateway: 'none',
        normalizedPhone,
        error: 'Unable to authenticate with Safaricom Daraja API. Please try again in a moment.',
      };
    }

    const timestamp = getDarajaTimestamp();
    const rawPassword = shortCode + passKey + timestamp;
    const password = Buffer.from(rawPassword).toString('base64');
    const cleanAccountRef = (cleanBoundPin || reference.replace(/^CERT-/i, '') || 'KRA-PORTAL')
      .replace(/[^A-Za-z0-9\-]/g, '')
      .substring(0, 12) || 'KRA-PORTAL';

    const stkPayload = {
      BusinessShortCode: parseInt(shortCode, 10),
      Password: password,
      Timestamp: timestamp,
      TransactionType: transactionType,
      Amount: numericAmount,
      PartyA: parseInt(normalizedPhone, 10),
      PartyB: parseInt(partyB || shortCode, 10),
      PhoneNumber: parseInt(normalizedPhone, 10),
      CallBackURL: finalCallbackUrl,
      AccountReference: cleanAccountRef,
      TransactionDesc: (description || 'Akubrecah KRA Portal Payment').substring(0, 13),
    };

    log.info('[M-Pesa STK] Dispatching live Daraja STK Push:', {
      BusinessShortCode: stkPayload.BusinessShortCode,
      PartyB: stkPayload.PartyB,
      TransactionType: stkPayload.TransactionType,
      Amount: stkPayload.Amount,
      PhoneNumberMasked: `***${normalizedPhone.slice(-3)}`,
      AccountReference: stkPayload.AccountReference,
      CallBackURL: rawCallbackUrl,
      Password: '***',
    });

    const stkRes = await darajaFetchWithRetry(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPayload),
    });

    const stkData = await stkRes.json().catch(() => ({}));
    const reqId = stkData.CheckoutRequestID || stkData.checkoutRequestId;
    const merchantReqId = stkData.MerchantRequestID || stkData.merchantRequestId || reqId;
    const accepted =
      stkRes.ok &&
      (stkData.ResponseCode === '0' || stkData.ResponseCode === 0) &&
      Boolean(reqId);

    if (accepted && reqId) {
      // SECURITY: bind the paid-for PIN to this checkoutId at dispatch time
      const g = global as any;
      if (cleanBoundPin) {
        g.mpesaStkPinBindings = g.mpesaStkPinBindings || {};
        g.mpesaStkPinBindings[reqId] = cleanBoundPin;
      }
      g.mpesaStkMetaBindings = g.mpesaStkMetaBindings || {};
      g.mpesaStkMetaBindings[reqId] = {
        pin: cleanBoundPin || undefined,
        phone: normalizedPhone,
        amount: numericAmount,
        userClerkId,
        userEmail,
        reference: effectiveReference,
        channel,
        timestamp: Date.now(),
      };

      // Persist durable PENDING transaction record in PostgreSQL
      try {
        if (typeof db.mpesaTransaction?.upsert === 'function') {
          await db.mpesaTransaction.upsert({
            where: { checkoutRequestId: reqId },
            update: {
              merchantRequestId: merchantReqId,
              phone: normalizedPhone,
              amount: numericAmount,
              pin: cleanBoundPin,
              reference: effectiveReference,
              channel,
              clerkId: userClerkId !== 'anonymous' ? userClerkId : null,
              userId: userId || null,
              status: 'PENDING',
              metadata: metadata || { accountReference: cleanAccountRef },
            },
            create: {
              reference: effectiveReference,
              pin: cleanBoundPin,
              phone: normalizedPhone,
              amount: numericAmount,
              currency: 'KES',
              provider: 'daraja',
              merchantRequestId: merchantReqId,
              checkoutRequestId: reqId,
              status: 'PENDING',
              clerkId: userClerkId !== 'anonymous' ? userClerkId : null,
              userId: userId || null,
              channel,
              metadata: metadata || { accountReference: cleanAccountRef },
            },
          });
        }
      } catch (dbErr: any) {
        log.warn('[M-Pesa STK] DB transaction persistence notice:', dbErr?.message);
      }

      return {
        success: true,
        checkoutRequestId: reqId,
        CheckoutRequestID: reqId,
        MerchantRequestID: merchantReqId,
        CustomerMessage:
          stkData.CustomerMessage ||
          stkData.ResponseDescription ||
          'M-Pesa payment prompt sent. Enter your M-Pesa PIN on your phone.',
        gateway: 'daraja',
        normalizedPhone,
      };
    }

    const darajaError =
      stkData.errorMessage ||
      stkData.ResponseDescription ||
      stkData.CustomerMessage ||
      `Safaricom Daraja rejected the STK Push request (HTTP ${stkRes.status})`;
    log.error(
      `[M-Pesa STK] Daraja request rejected (${stkRes.status}):`,
      JSON.stringify(stkData).slice(0, 400)
    );
    return {
      success: false,
      gateway: 'none',
      normalizedPhone,
      error: darajaError,
    };
  } catch (err: any) {
    log.error('[dispatchMpesaStkPush Error]:', err.message);
    return {
      success: false,
      gateway: 'none',
      error: err.message || 'Internal error dispatching M-Pesa payment.',
    };
  }
}

const TERMINAL_DARAJA_FAILURE_CODES = new Set([
  '1',    // Insufficient Funds
  '1001', // Unable to lock subscriber (ongoing transaction)
  '1019', // Transaction expired
  '1032', // Request cancelled by user
  '1037', // DS timeout user cannot be reached
  '2001', // Wrong PIN / Invalid initiator information
  '1025', // An error occurred while sending a push request
  '1036', // SMS / USSD notification failure
  '9999', // Error occurred while sending push request
]);

export type DarajaQueryStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'timeout';

export function mapDarajaResultCodeToStatus(codeStr: string): {
  status: DarajaQueryStatus;
  dbStatus: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'TIMED_OUT' | 'FAILED';
} {
  if (codeStr === '0') {
    return { status: 'success', dbStatus: 'COMPLETED' };
  }
  if (codeStr === '1032') {
    return { status: 'cancelled', dbStatus: 'CANCELLED' };
  }
  if (codeStr === '1037' || codeStr === '1019') {
    return { status: 'timeout', dbStatus: 'TIMED_OUT' };
  }
  if (TERMINAL_DARAJA_FAILURE_CODES.has(codeStr) || (/^\d+$/.test(codeStr) && codeStr !== '4999')) {
    return { status: 'failed', dbStatus: 'FAILED' };
  }
  return { status: 'pending', dbStatus: 'PENDING' };
}

export function formatDarajaResultDesc(codeStr: string, rawDesc?: string): string {
  const code = String(codeStr || '').trim();
  if (code === '2029') {
    return 'Safaricom Daraja error 2029 (Unresolved Reason Type): ShortCode 9914132 is a Buy Goods Store Number, not a Paybill. Set DARAJA_TRANSACTION_TYPE=CustomerBuyGoodsOnline and DARAJA_TILL_NUMBER=<your_till_number> in .env.';
  }
  if (code === '2002') {
    return 'Safaricom Daraja error 2002 (Store/Till Mismatch): BusinessShortCode (9914132) is the Store Number, so PartyB must be your Buy Goods Till Number. Set DARAJA_TILL_NUMBER=<your_till_number> in .env.';
  }
  return rawDesc || 'Payment was not completed.';
}

/**
 * Query Safaricom Daraja STK Push status (/mpesa/stkpushquery/v1/query) as a
 * live reconciliation fallback when the async callback has not arrived yet.
 */
export async function queryMpesaStkPushStatus(
  checkoutRequestId: string,
  opts?: { force?: boolean }
): Promise<{
  status: DarajaQueryStatus;
  resultCode?: number;
  resultDesc?: string;
  mpesaReceipt?: string;
}> {
  if (!checkoutRequestId || !checkoutRequestId.startsWith('ws_CO_')) {
    return { status: 'pending' };
  }

  const g = global as any;
  g.mpesaCallbacks = g.mpesaCallbacks || {};
  const existing = g.mpesaCallbacks[checkoutRequestId];
  if (existing && existing.status && existing.status !== 'pending') {
    return {
      status: existing.status,
      resultCode: existing.resultCode ?? existing.ResultCode,
      resultDesc: existing.resultDesc,
      mpesaReceipt: existing.metadata?.mpesaReceiptNumber || existing.MpesaReceiptNumber,
    };
  }

  // Rate-protect per checkoutRequestId (minimum 3s between active Daraja queries)
  g.darajaQueryLastAt = g.darajaQueryLastAt || ({} as Record<string, number>);
  const lastQueriedAt = g.darajaQueryLastAt[checkoutRequestId] || 0;
  if (!opts?.force && Date.now() - lastQueriedAt < 3000) {
    return { status: 'pending' };
  }
  g.darajaQueryLastAt[checkoutRequestId] = Date.now();

  const { consumerKey, consumerSecret, shortCode, passKey, hasDaraja, baseUrl } = getDarajaConfig();
  if (!hasDaraja) {
    return { status: 'pending' };
  }

  try {
    const accessToken = await getDarajaAccessToken(baseUrl, consumerKey, consumerSecret);
    if (!accessToken) {
      return { status: 'pending' };
    }

    const timestamp = getDarajaTimestamp();
    const password = Buffer.from(shortCode + passKey + timestamp).toString('base64');

    const queryRes = await darajaFetchWithRetry(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: Number(shortCode),
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    });

    const data = await queryRes.json().catch(() => ({}));
    if (!queryRes.ok) {
      // 500.001.1001 ("The transaction is being processed") is normal while user has prompt open
      return {
        status: 'pending',
        resultDesc: data?.errorMessage || data?.ResultDesc || 'The transaction is being processed by Safaricom.',
      };
    }

    const rawCode =
      data?.ResultCode !== undefined && data?.ResultCode !== null ? String(data.ResultCode) : '';
    const resultDesc = data?.ResultDesc || data?.ResponseDescription || '';

    if (!rawCode) {
      return { status: 'pending' };
    }

    const { status, dbStatus } = mapDarajaResultCodeToStatus(rawCode);
    const numericCode = Number(rawCode);
    const db = prisma as any;

    if (status === 'success') {
      const metaBinding = g.mpesaStkMetaBindings?.[checkoutRequestId];
      const boundPin = metaBinding?.pin || g.mpesaStkPinBindings?.[checkoutRequestId];
      const amount = metaBinding?.amount || 20;
      const phoneNumber = metaBinding?.phone || '';
      const receiptFromQuery = data?.MpesaReceiptNumber || checkoutRequestId;

      g.mpesaCallbacks[checkoutRequestId] = {
        status: 'success',
        resultCode: 0,
        ResultCode: 0,
        resultDesc: resultDesc || 'The service request is processed successfully.',
        MpesaReceiptNumber: receiptFromQuery,
        Amount: amount,
        metadata: {
          amount,
          mpesaReceiptNumber: receiptFromQuery,
          transactionDate: timestamp,
          phoneNumber,
          ...(boundPin ? { pin: boundPin } : {}),
        },
        timestamp: Date.now(),
      };

      try {
        if (typeof db.mpesaTransaction?.updateMany === 'function') {
          await db.mpesaTransaction.updateMany({
            where: { checkoutRequestId, status: 'PENDING' },
            data: {
              status: 'COMPLETED',
              resultCode: 0,
              resultDesc: resultDesc || 'The service request is processed successfully.',
              ...(data?.MpesaReceiptNumber ? { mpesaReceiptNumber: data.MpesaReceiptNumber } : {}),
            },
          });
        }
      } catch { }

      return { status: 'success', resultCode: 0, resultDesc, mpesaReceipt: receiptFromQuery };
    }

    if (status !== 'pending') {
      const formattedDesc = formatDarajaResultDesc(rawCode, resultDesc);
      g.mpesaCallbacks[checkoutRequestId] = {
        status,
        resultCode: numericCode,
        ResultCode: numericCode,
        resultDesc: formattedDesc,
        timestamp: Date.now(),
      };

      try {
        if (typeof db.mpesaTransaction?.updateMany === 'function') {
          await db.mpesaTransaction.updateMany({
            where: { checkoutRequestId, status: 'PENDING' },
            data: {
              status: dbStatus,
              resultCode: Number.isFinite(numericCode) ? numericCode : null,
              resultDesc: formattedDesc,
            },
          });
        }
      } catch { }

      return { status, resultCode: numericCode, resultDesc: formattedDesc };
    }

    return { status: 'pending', resultDesc };
  } catch (err: any) {
    log.warn('[queryMpesaStkPushStatus Notice]:', err?.message || err);
    return { status: 'pending' };
  }
}

/**
 * Finds a recent successful Daraja M-Pesa payment from PostgreSQL (`mpesa_transactions`
 * or `certificate_downloads`) for WhatsApp bot reconciliation & retry recovery.
 */
export async function findRecentSuccessfulMpesaPayment(opts: {
  phone?: string;
  pin?: string;
  reference?: string;
  minAmountKes?: number;
  maxAgeMinutes?: number;
}): Promise<{
  found: boolean;
  reference?: string;
  checkoutRequestId?: string;
  mpesaReceipt?: string;
  pin?: string;
  amountKes?: number;
  customerPhone?: string;
}> {
  const { phone, pin, reference, minAmountKes = 20, maxAgeMinutes = 90 } = opts;
  const db = prisma as any;
  const since = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
  const normalizedPhone = phone ? normalizePhoneNumber(phone) : '';
  const cleanPin = pin ? pin.trim().toUpperCase() : '';

  try {
    if (typeof db.mpesaTransaction?.findMany === 'function') {
      const txs = await db.mpesaTransaction.findMany({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: since },
          ...(reference
            ? {
              OR: [
                { checkoutRequestId: reference },
                { mpesaReceiptNumber: reference },
                { reference: { contains: reference } },
              ],
            }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 25,
      });

      for (const tx of txs) {
        const txAmount = Number(tx.amount) || 0;
        if (txAmount < minAmountKes) continue;
        const phoneMatch = normalizedPhone && tx.phone === normalizedPhone;
        const pinMatch = cleanPin && tx.pin && tx.pin.toUpperCase() === cleanPin;
        const refMatch =
          reference &&
          (tx.checkoutRequestId === reference ||
            tx.mpesaReceiptNumber === reference ||
            tx.reference === reference);

        if (refMatch || (pinMatch && phoneMatch) || pinMatch || phoneMatch) {
          return {
            found: true,
            reference: tx.mpesaReceiptNumber || tx.checkoutRequestId,
            checkoutRequestId: tx.checkoutRequestId,
            mpesaReceipt: tx.mpesaReceiptNumber || tx.checkoutRequestId,
            pin: tx.pin || undefined,
            amountKes: txAmount,
            customerPhone: tx.phone,
          };
        }
      }
    }

    if (typeof db.certificateDownload?.findFirst === 'function' && (cleanPin || reference)) {
      const dl = await db.certificateDownload.findFirst({
        where: {
          createdAt: { gte: since },
          OR: [
            ...(reference ? [{ mpesaReceipt: reference }, { checkoutId: reference }] : []),
            ...(cleanPin ? [{ pin: cleanPin }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      if (dl && (Number(dl.amountCharged) || 0) >= minAmountKes) {
        return {
          found: true,
          reference: dl.mpesaReceipt || dl.checkoutId || dl.id,
          checkoutRequestId: dl.checkoutId || undefined,
          mpesaReceipt: dl.mpesaReceipt || undefined,
          pin: dl.pin,
          amountKes: Number(dl.amountCharged) || minAmountKes,
          customerPhone: dl.clerkId?.startsWith('wa_') ? dl.clerkId.replace(/^wa_/, '') : undefined,
        };
      }
    }
  } catch (err: any) {
    log.warn('[findRecentSuccessfulMpesaPayment Notice]:', err?.message);
  }

  return { found: false };
}
