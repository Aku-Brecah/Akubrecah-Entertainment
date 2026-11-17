import prisma from '@/lib/prisma';
import { log } from '@/lib/monitoring/logger';
import { tryResolveKraPin } from '@/lib/masking';
import { getOrCreateDbUser } from '@/lib/subscription';
import { claimOrVerifyRedemptionWindow } from '@/lib/mpesa-redemption';
import {
  queryMpesaStkPushStatus,
  mapDarajaResultCodeToStatus,
  type DarajaQueryStatus,
} from '@/lib/whatsapp/mpesa-dispatch';

export interface MpesaVerificationResult {
  success: boolean;
  verified: boolean;
  status: DarajaQueryStatus;
  checkoutRequestId: string;
  downloadId?: string;
  mpesaReceipt?: string;
  pin?: string;
  amount?: number;
  phone?: string;
  resultCode?: number | null;
  resultDesc?: string;
  httpStatus?: number;
  error?: string;
  redemptionStatus?: string;
  firstClaimedAt?: string;
  expiresAt?: string;
  remainingSeconds?: number;
  downloadCount?: number;
}

const MIN_CERTIFICATE_FEE_KES = Number(process.env.MPESA_DOWNLOAD_FEE_KES || 20);

function resolveExplicitPin(rawPin?: string | null): string {
  if (!rawPin || typeof rawPin !== 'string') return '';
  const unsealed = tryResolveKraPin(rawPin.trim());
  if (unsealed) return unsealed.toUpperCase();
  const upper = rawPin.trim().toUpperCase();
  if (/^[A-Z]\d{9}[A-Z]$/i.test(upper)) return upper;
  return '';
}

/**
 * Extracts a valid 10-character Safaricom M-Pesa transaction code (e.g. UB12XYZ789)
 * from either a raw code input or a full pasted M-Pesa confirmation SMS.
 */
export function extractMpesaReceiptCode(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const upper = input.toUpperCase().trim();
  const matches = upper.match(/\b([A-Z][A-Z0-9]{9})\b/g);
  if (!matches) return null;

  for (const candidate of matches) {
    if (!/\d/.test(candidate)) continue;
    if (/^(.)\1+$/.test(candidate)) continue;
    if (/^(?:TEST|DEMO|FAKE|SAMPLE)/i.test(candidate)) continue;
    return candidate;
  }

  return null;
}

async function safeDbLookup<T>(
  label: string,
  query: (() => Promise<T | null>) | null
): Promise<T | null> {
  if (!query) return null;
  try {
    return await query();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn(`[mpesa-verification] ${label} notice:`, message);
    return null;
  }
}

/**
 * Authoritative server-side verification & idempotent fulfillment for Daraja
 * M-Pesa Express checkouts. Checks durable PostgreSQL records first, then
 * falls back to live Daraja STK Push Query reconciliation.
 */
export async function verifyAndFulfillMpesaCheckout({
  checkoutRequestId,
  rawPinInput,
  clerkId,
  forceQuery,
}: {
  checkoutRequestId: string;
  rawPinInput?: string | null;
  clerkId?: string | null;
  forceQuery?: boolean;
}): Promise<MpesaVerificationResult> {
  const db = prisma as any;
  const requestedPin = resolveExplicitPin(rawPinInput);

  interface DownloadLookupRecord {
    id: string;
    pin: string;
    mpesaReceipt?: string | null;
    amountCharged?: number | null;
  }
  interface CyberInvoiceLookupRecord {
    mpesaReceipt?: string | null;
    amount?: number | null;
  }
  interface MpesaTxLookupRecord {
    status: string;
    resultCode?: number | null;
    resultDesc?: string | null;
    mpesaReceiptNumber?: string | null;
    amount?: number | null;
    pin?: string | null;
    clerkId?: string | null;
    phone?: string | null;
  }

  // 1-3. Query durable CertificateDownload, CyberInvoice, and MpesaTransaction concurrently
  // while preserving priority order (CertificateDownload > CyberInvoice > MpesaTransaction).
  const [existingDownload, cyberInvoice, txRecord] = await Promise.all([
    safeDbLookup<DownloadLookupRecord>(
      'Download lookup',
      typeof db.certificateDownload?.findFirst === 'function'
        ? () => db.certificateDownload.findFirst({ where: { checkoutId: checkoutRequestId } })
        : null
    ),
    safeDbLookup<CyberInvoiceLookupRecord>(
      'Cyber invoice lookup',
      typeof db.cyberInvoice?.findFirst === 'function'
        ? () => db.cyberInvoice.findFirst({ where: { checkoutId: checkoutRequestId } })
        : null
    ),
    safeDbLookup<MpesaTxLookupRecord>(
      'MpesaTransaction lookup',
      typeof db.mpesaTransaction?.findUnique === 'function'
        ? () => db.mpesaTransaction.findUnique({ where: { checkoutRequestId } })
        : null
    ),
  ]);

  if (existingDownload) {
    const recordPin = resolveExplicitPin(existingDownload.pin);
    const redemption = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: existingDownload.mpesaReceipt || checkoutRequestId,
      checkoutId: checkoutRequestId,
      requestedPinInput: requestedPin || recordPin,
      clerkId,
      amount: Number(existingDownload.amountCharged) || MIN_CERTIFICATE_FEE_KES,
    });

    if (!redemption.allowed) {
      return {
        success: false,
        verified: false,
        status: 'failed',
        checkoutRequestId,
        httpStatus: redemption.httpStatus || 403,
        error: redemption.error || 'Redemption window expired or unauthorized.',
        redemptionStatus: redemption.redemptionStatus,
        expiresAt: redemption.expiresAt,
        remainingSeconds: redemption.remainingSeconds,
        pin: redemption.pin || recordPin,
      };
    }

    return {
      success: true,
      verified: true,
      status: 'success',
      checkoutRequestId,
      downloadId: existingDownload.id,
      mpesaReceipt: existingDownload.mpesaReceipt || checkoutRequestId,
      pin: redemption.pin || recordPin || existingDownload.pin,
      amount: Number(existingDownload.amountCharged) || MIN_CERTIFICATE_FEE_KES,
      resultCode: 0,
      resultDesc: 'Payment verified successfully.',
      redemptionStatus: redemption.redemptionStatus,
      firstClaimedAt: redemption.firstClaimedAt,
      expiresAt: redemption.expiresAt,
      remainingSeconds: redemption.remainingSeconds,
      downloadCount: redemption.downloadCount,
    };
  }

  if (cyberInvoice) {
    return {
      success: true,
      verified: true,
      status: 'success',
      checkoutRequestId,
      mpesaReceipt: cyberInvoice.mpesaReceipt || checkoutRequestId,
      amount: Number(cyberInvoice.amount) || 500,
      resultCode: 0,
      resultDesc: 'Cyber Cafe subscription verified.',
    };
  }

  if (txRecord) {
    if (txRecord.status === 'CANCELLED') {
      return {
        success: false,
        verified: false,
        status: 'cancelled',
        checkoutRequestId,
        resultCode: txRecord.resultCode ?? 1032,
        resultDesc: txRecord.resultDesc || 'Payment request was cancelled on your M-Pesa phone.',
      };
    }
    if (txRecord.status === 'TIMED_OUT') {
      return {
        success: false,
        verified: false,
        status: 'timeout',
        checkoutRequestId,
        resultCode: txRecord.resultCode ?? 1037,
        resultDesc: txRecord.resultDesc || 'M-Pesa prompt timed out before PIN authorization.',
      };
    }
    if (txRecord.status === 'FAILED') {
      return {
        success: false,
        verified: false,
        status: 'failed',
        checkoutRequestId,
        resultCode: txRecord.resultCode ?? 1,
        resultDesc: txRecord.resultDesc || 'M-Pesa transaction could not be completed.',
      };
    }
  }

  // 4. Inspect callback memory registry or query live Daraja STK Push Query
  const g = global as any;
  g.mpesaCallbacks = g.mpesaCallbacks || {};
  let cb = g.mpesaCallbacks[checkoutRequestId];

  let liveStatus: DarajaQueryStatus = 'pending';
  let liveCode: number | null = null;
  let liveDesc = '';
  let liveReceipt = '';

  if (txRecord?.status === 'COMPLETED') {
    liveStatus = 'success';
    liveCode = 0;
    liveDesc = txRecord.resultDesc || 'Payment completed successfully.';
    liveReceipt = txRecord.mpesaReceiptNumber || checkoutRequestId;
  } else if (cb && cb.status && cb.status !== 'pending') {
    const mapped =
      cb.resultCode !== undefined && cb.resultCode !== null
        ? mapDarajaResultCodeToStatus(String(cb.resultCode)).status
        : (cb.status as DarajaQueryStatus);
    liveStatus = mapped;
    liveCode = cb.resultCode ?? cb.ResultCode ?? null;
    liveDesc = cb.resultDesc || '';
    liveReceipt = cb.metadata?.mpesaReceiptNumber || cb.MpesaReceiptNumber || checkoutRequestId;
  } else {
    const queryResult = await queryMpesaStkPushStatus(checkoutRequestId, { force: forceQuery });
    liveStatus = queryResult.status;
    liveCode = queryResult.resultCode ?? null;
    liveDesc = queryResult.resultDesc || '';
    liveReceipt = queryResult.mpesaReceipt || checkoutRequestId;
    cb = g.mpesaCallbacks[checkoutRequestId];
  }

  if (liveStatus === 'pending') {
    return {
      success: true,
      verified: false,
      status: 'pending',
      checkoutRequestId,
      resultCode: liveCode,
      resultDesc: liveDesc || 'Waiting for M-Pesa PIN authorization on your handset.',
    };
  }

  if (liveStatus !== 'success') {
    return {
      success: false,
      verified: false,
      status: liveStatus,
      checkoutRequestId,
      resultCode: liveCode,
      resultDesc: liveDesc || 'M-Pesa payment was not completed.',
    };
  }

  // 5. Payment confirmed! Enforce amount floor & PIN lock, then mint CertificateDownload idempotently.
  const paidAmount = Number(
    cb?.metadata?.amount || cb?.Amount || txRecord?.amount || MIN_CERTIFICATE_FEE_KES
  );
  if (paidAmount < MIN_CERTIFICATE_FEE_KES) {
    return {
      success: false,
      verified: false,
      status: 'failed',
      checkoutRequestId,
      httpStatus: 400,
      resultDesc: `Paid amount (KES ${paidAmount}) is below required KES ${MIN_CERTIFICATE_FEE_KES}.`,
      error: `Paid amount (KES ${paidAmount}) is below required KES ${MIN_CERTIFICATE_FEE_KES}.`,
    };
  }

  const boundPin = resolveExplicitPin(txRecord?.pin || cb?.metadata?.pin || g.mpesaStkPinBindings?.[checkoutRequestId]);
  if (requestedPin && boundPin && requestedPin !== boundPin) {
    return {
      success: false,
      verified: false,
      status: 'failed',
      checkoutRequestId,
      httpStatus: 403,
      error: 'This payment is bound to a different KRA PIN.',
    };
  }

  const finalPin = boundPin || requestedPin;
  if (!finalPin) {
    return {
      success: false,
      verified: false,
      status: 'failed',
      checkoutRequestId,
      httpStatus: 400,
      error: 'Unable to resolve the target KRA PIN for this transaction.',
    };
  }

  const finalReceipt =
    liveReceipt ||
    txRecord?.mpesaReceiptNumber ||
    cb?.metadata?.mpesaReceiptNumber ||
    checkoutRequestId;
  const effectiveClerkId = clerkId || txRecord?.clerkId || 'guest_user';
  const dbUser = await getOrCreateDbUser(
    effectiveClerkId,
    `${effectiveClerkId}@akubrecah.co.ke`,
    'KRA Portal Taxpayer'
  );

  const redemption = await claimOrVerifyRedemptionWindow({
    mpesaReceipt: finalReceipt,
    checkoutId: checkoutRequestId,
    requestedPinInput: finalPin,
    clerkId: effectiveClerkId,
    amount: paidAmount,
    phone: txRecord?.phone || cb?.metadata?.phoneNumber,
    dbUserId: dbUser.id,
  });

  if (!redemption.allowed) {
    return {
      success: false,
      verified: false,
      status: 'failed',
      checkoutRequestId,
      httpStatus: redemption.httpStatus || 403,
      error: redemption.error || 'Redemption window expired or unauthorized.',
      redemptionStatus: redemption.redemptionStatus,
      expiresAt: redemption.expiresAt,
      remainingSeconds: redemption.remainingSeconds,
      pin: redemption.pin || finalPin,
    };
  }

  return {
    success: true,
    verified: true,
    status: 'success',
    checkoutRequestId,
    downloadId: redemption.downloadId,
    mpesaReceipt: redemption.mpesaReceipt || finalReceipt,
    pin: redemption.pin || finalPin,
    amount: paidAmount,
    phone: txRecord?.phone || cb?.metadata?.phoneNumber,
    resultCode: 0,
    resultDesc: liveDesc || 'Payment confirmed via Safaricom Daraja.',
    redemptionStatus: redemption.redemptionStatus,
    firstClaimedAt: redemption.firstClaimedAt,
    expiresAt: redemption.expiresAt,
    remainingSeconds: redemption.remainingSeconds,
    downloadCount: redemption.downloadCount,
  };
}

/**
 * Authoritative verification & idempotent fulfillment for Manual Till / QR M-Pesa receipts
 * (10-character code e.g. UB12XYZ789 or full M-Pesa confirmation SMS) when STK Push is bypassed.
 */
export async function verifyManualMpesaReceipt({
  mpesaCodeInput,
  rawPinInput,
  phone,
  clerkId,
}: {
  mpesaCodeInput: string;
  rawPinInput?: string | null;
  phone?: string | null;
  clerkId?: string | null;
}): Promise<MpesaVerificationResult> {
  const receiptCode = extractMpesaReceiptCode(mpesaCodeInput);
  if (!receiptCode) {
    return {
      success: false,
      verified: false,
      status: 'failed',
      checkoutRequestId: '',
      httpStatus: 400,
      error:
        'Please enter a valid 10-character M-Pesa Transaction Code (e.g. UB12XYZ789) or paste your M-Pesa confirmation SMS.',
    };
  }

  // If the user pasted a full confirmation SMS mentioning Ksh/KES, verify the amount meets KES 20
  const amountMatch = mpesaCodeInput.match(/(?:ksh|kes)\.?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (amountMatch?.[1]) {
    const parsedSmsAmount = Number(amountMatch[1].replace(/,/g, ''));
    if (Number.isFinite(parsedSmsAmount) && parsedSmsAmount < MIN_CERTIFICATE_FEE_KES) {
      return {
        success: false,
        verified: false,
        status: 'failed',
        checkoutRequestId: `MANUAL-${receiptCode}`,
        httpStatus: 400,
        error: `Paid amount (KES ${parsedSmsAmount}) is below required KES ${MIN_CERTIFICATE_FEE_KES}.`,
      };
    }
  }

  const db = prisma as any;
  const requestedPin = resolveExplicitPin(rawPinInput);

  interface ManualDownloadRecord {
    id: string;
    pin: string;
    checkoutId?: string | null;
    mpesaReceipt?: string | null;
    amountCharged?: number | null;
  }
  interface ManualTxRecord {
    checkoutRequestId: string;
    pin?: string | null;
    amount?: number | null;
    phone?: string | null;
    clerkId?: string | null;
    status?: string | null;
  }

  const [existingDownload, matchingTx] = await Promise.all([
    safeDbLookup<ManualDownloadRecord>(
      'Manual Download lookup',
      typeof db.certificateDownload?.findFirst === 'function'
        ? () => db.certificateDownload.findFirst({ where: { mpesaReceipt: receiptCode } })
        : null
    ),
    safeDbLookup<ManualTxRecord>(
      'Manual MpesaTransaction lookup',
      typeof db.mpesaTransaction?.findFirst === 'function'
        ? () => db.mpesaTransaction.findFirst({ where: { mpesaReceiptNumber: receiptCode } })
        : null
    ),
  ]);

  const existingDownloadPin = existingDownload ? resolveExplicitPin(existingDownload.pin) : '';
  const txPin = matchingTx ? resolveExplicitPin(matchingTx.pin) : '';

  if (matchingTx?.amount != null && Number(matchingTx.amount) < MIN_CERTIFICATE_FEE_KES) {
    return {
      success: false,
      verified: false,
      status: 'failed',
      checkoutRequestId: matchingTx.checkoutRequestId,
      httpStatus: 400,
      error: `Paid amount (KES ${Number(matchingTx.amount)}) is below required KES ${MIN_CERTIFICATE_FEE_KES}.`,
    };
  }

  if (matchingTx && matchingTx.status && matchingTx.status !== 'COMPLETED') {
    return {
      success: false,
      verified: false,
      status: 'failed',
      checkoutRequestId: matchingTx.checkoutRequestId,
      httpStatus: 400,
      error: 'M-Pesa payment verification failed: transaction was not completed.',
    };
  }

  // SECURITY: Never accept unverified free-text SMS strings as payment proof.
  // A valid server-verified Daraja MpesaTransaction or CertificateDownload record MUST exist.
  if (!matchingTx && !existingDownload) {
    return {
      success: false,
      verified: false,
      status: 'failed',
      checkoutRequestId: `MANUAL-${receiptCode}`,
      httpStatus: 400,
      error:
        'This M-Pesa transaction code was not found in verified payment records. Please complete payment via M-Pesa STK Push or contact support with your receipt.',
    };
  }

  const finalPin = requestedPin || txPin || existingDownloadPin;
  if (!finalPin) {
    return {
      success: false,
      verified: false,
      status: 'failed',
      checkoutRequestId: `MANUAL-${receiptCode}`,
      httpStatus: 400,
      error: 'Unable to resolve the target KRA PIN for this verification.',
    };
  }

  const effectiveCheckoutId = matchingTx?.checkoutRequestId || existingDownload?.checkoutId || `MANUAL-${receiptCode}`;
  const effectiveClerkId = clerkId || matchingTx?.clerkId || 'guest_user';
  const dbUser = await getOrCreateDbUser(
    effectiveClerkId,
    `${effectiveClerkId}@akubrecah.co.ke`,
    'KRA Portal Taxpayer'
  );

  const redemption = await claimOrVerifyRedemptionWindow({
    mpesaReceipt: receiptCode,
    checkoutId: effectiveCheckoutId,
    requestedPinInput: finalPin,
    clerkId: effectiveClerkId,
    amount: Number(existingDownload?.amountCharged) || MIN_CERTIFICATE_FEE_KES,
    phone: phone || matchingTx?.phone || undefined,
    dbUserId: dbUser.id,
  });

  if (!redemption.allowed) {
    return {
      success: false,
      verified: false,
      status: 'failed',
      checkoutRequestId: effectiveCheckoutId,
      httpStatus: redemption.httpStatus || 403,
      error: redemption.error || 'Redemption window expired or unauthorized.',
      redemptionStatus: redemption.redemptionStatus,
      expiresAt: redemption.expiresAt,
      remainingSeconds: redemption.remainingSeconds,
      pin: redemption.pin || finalPin,
    };
  }

  return {
    success: true,
    verified: true,
    status: 'success',
    checkoutRequestId: effectiveCheckoutId,
    downloadId: redemption.downloadId || existingDownload?.id,
    mpesaReceipt: receiptCode,
    pin: redemption.pin || finalPin,
    amount: Number(existingDownload?.amountCharged) || MIN_CERTIFICATE_FEE_KES,
    phone: phone || matchingTx?.phone || undefined,
    resultCode: 0,
    resultDesc: 'Manual M-Pesa payment verified.',
    redemptionStatus: redemption.redemptionStatus,
    firstClaimedAt: redemption.firstClaimedAt,
    expiresAt: redemption.expiresAt,
    remainingSeconds: redemption.remainingSeconds,
    downloadCount: redemption.downloadCount,
  };
}

