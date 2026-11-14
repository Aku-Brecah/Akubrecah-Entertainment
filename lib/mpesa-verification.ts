import prisma from '@/lib/prisma';
import { log } from '@/lib/monitoring/logger';
import { tryResolveKraPin } from '@/lib/masking';
import { getOrCreateDbUser } from '@/lib/subscription';
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
}

const MIN_CERTIFICATE_FEE_KES = Number(process.env.MPESA_DOWNLOAD_FEE_KES || 20);

function resolveExplicitPin(rawPin?: string | null): string {
  if (!rawPin || typeof rawPin !== 'string') return '';
  const unsealed = tryResolveKraPin(rawPin.trim());
  if (unsealed) return unsealed.toUpperCase();
  const upper = rawPin.trim().toUpperCase();
  if (/^[A-Z]\d{9}[A-Z]$/.test(upper)) return upper;
  return '';
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
}: {
  checkoutRequestId: string;
  rawPinInput?: string | null;
  clerkId?: string | null;
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

  const safeLookup = async <T>(
    label: string,
    query: (() => Promise<T | null>) | null
  ): Promise<T | null> => {
    if (!query) return null;
    try {
      return await query();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      log.warn(`[mpesa-verification] ${label} notice:`, message);
      return null;
    }
  };

  // 1-3. Query durable CertificateDownload, CyberInvoice, and MpesaTransaction concurrently
  // while preserving priority order (CertificateDownload > CyberInvoice > MpesaTransaction).
  const [existingDownload, cyberInvoice, txRecord] = await Promise.all([
    safeLookup<DownloadLookupRecord>(
      'Download lookup',
      typeof db.certificateDownload?.findFirst === 'function'
        ? () => db.certificateDownload.findFirst({ where: { checkoutId: checkoutRequestId } })
        : null
    ),
    safeLookup<CyberInvoiceLookupRecord>(
      'Cyber invoice lookup',
      typeof db.cyberInvoice?.findFirst === 'function'
        ? () => db.cyberInvoice.findFirst({ where: { checkoutId: checkoutRequestId } })
        : null
    ),
    safeLookup<MpesaTxLookupRecord>(
      'MpesaTransaction lookup',
      typeof db.mpesaTransaction?.findUnique === 'function'
        ? () => db.mpesaTransaction.findUnique({ where: { checkoutRequestId } })
        : null
    ),
  ]);

  if (existingDownload) {
    const recordPin = resolveExplicitPin(existingDownload.pin);
    if (requestedPin && recordPin && requestedPin !== recordPin) {
      return {
        success: false,
        verified: false,
        status: 'failed',
        checkoutRequestId,
        httpStatus: 403,
        error: 'This payment is bound to a different KRA PIN.',
      };
    }

    return {
      success: true,
      verified: true,
      status: 'success',
      checkoutRequestId,
      downloadId: existingDownload.id,
      mpesaReceipt: existingDownload.mpesaReceipt || checkoutRequestId,
      pin: recordPin || existingDownload.pin,
      amount: Number(existingDownload.amountCharged) || MIN_CERTIFICATE_FEE_KES,
      resultCode: 0,
      resultDesc: 'Payment verified successfully.',
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
    const queryResult = await queryMpesaStkPushStatus(checkoutRequestId);
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

  let downloadRecord: any = null;
  try {
    if (typeof db.certificateDownload?.create === 'function') {
      downloadRecord = await db.certificateDownload.create({
        data: {
          userId: dbUser.id,
          clerkId: effectiveClerkId,
          pin: finalPin,
          downloadType: 'pay_per_download',
          amountCharged: paidAmount,
          currency: 'KES',
          mpesaReceipt: finalReceipt,
          checkoutId: checkoutRequestId,
        },
      });
    }
  } catch (createErr: any) {
    // Handle concurrent callback vs. verify race condition idempotently (P2002 unique checkoutId)
    if (createErr?.code === 'P2002' && typeof db.certificateDownload?.findFirst === 'function') {
      downloadRecord = await db.certificateDownload.findFirst({
        where: { checkoutId: checkoutRequestId },
      });
    } else {
      log.warn('[mpesa-verification] Record creation notice:', createErr?.message);
    }
  }

  try {
    if (typeof db.mpesaTransaction?.updateMany === 'function') {
      await db.mpesaTransaction.updateMany({
        where: { checkoutRequestId },
        data: {
          status: 'COMPLETED',
          resultCode: 0,
          resultDesc: liveDesc || 'The service request is processed successfully.',
          ...(finalReceipt && finalReceipt !== checkoutRequestId
            ? { mpesaReceiptNumber: finalReceipt }
            : {}),
        },
      });
    }
  } catch { }

  return {
    success: true,
    verified: true,
    status: 'success',
    checkoutRequestId,
    downloadId: downloadRecord?.id,
    mpesaReceipt: finalReceipt,
    pin: finalPin,
    amount: paidAmount,
    phone: txRecord?.phone || cb?.metadata?.phoneNumber,
    resultCode: 0,
    resultDesc: liveDesc || 'Payment confirmed via Safaricom Daraja.',
  };
}

