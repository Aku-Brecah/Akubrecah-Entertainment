import prisma from '@/lib/prisma';
import { log } from '@/lib/monitoring/logger';
import { maskPin, tryResolveKraPin } from '@/lib/masking';

export const REDEMPTION_WINDOW_SECONDS = 300; // Strictly 5 minutes
export const REDEMPTION_WINDOW_MS = REDEMPTION_WINDOW_SECONDS * 1000;

export type RedemptionStatus = 'UNUSED' | 'ACTIVE' | 'EXPIRED' | 'REJECTED';

export interface RedemptionRecordData {
  id: string;
  mpesaReceipt: string;
  checkoutId?: string | null;
  pin: string;
  redemptionStatus: RedemptionStatus;
  firstClaimedAt: Date;
  expiresAt: Date;
  downloadCount: number;
  lastDownloadedAt?: Date | null;
  amountCharged?: number;
}

export interface RedemptionValidationResult {
  allowed: boolean;
  verified: boolean;
  status: 'success' | 'failed';
  redemptionStatus: RedemptionStatus;
  reason?: 'FIRST_CLAIM' | 'ACTIVE' | 'EXPIRED' | 'DIFFERENT_PIN' | 'INVALID_RECORD';
  error?: string;
  httpStatus?: number;
  downloadId?: string;
  mpesaReceipt?: string;
  checkoutRequestId?: string;
  pin?: string;
  firstClaimedAt?: string;
  expiresAt?: string;
  remainingSeconds?: number;
  downloadCount?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Concurrency Mutex (Protects simultaneous claims of the same receipt)
// ─────────────────────────────────────────────────────────────────────────────

const receiptMutexMap = new Map<string, Promise<unknown>>();

export async function withReceiptLock<T>(
  receiptCode: string,
  task: () => Promise<T>
): Promise<T> {
  const normalizedKey = (receiptCode || 'DEFAULT').toUpperCase().trim();
  const currentTask = receiptMutexMap.get(normalizedKey) || Promise.resolve();

  let resolver: () => void = () => {};
  const nextTask = new Promise<void>((resolve) => {
    resolver = resolve;
  });

  const chained = currentTask.then(() => nextTask);
  receiptMutexMap.set(normalizedKey, chained);

  try {
    await currentTask;
    return await task();
  } finally {
    resolver();
    if (receiptMutexMap.get(normalizedKey) === chained) {
      receiptMutexMap.delete(normalizedKey);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback In-Memory Registry (Guarantees atomic protection if DB is offline or in unit tests)
// ─────────────────────────────────────────────────────────────────────────────

interface GlobalRedemptionRegistry {
  records: Map<string, RedemptionRecordData>;
}

function getGlobalRegistry(): GlobalRedemptionRegistry {
  const g = global as any;
  if (!g.__mpesaRedemptionRegistry) {
    g.__mpesaRedemptionRegistry = {
      records: new Map<string, RedemptionRecordData>(),
    };
  }
  return g.__mpesaRedemptionRegistry;
}

export function resetGlobalRedemptionRegistry(): void {
  const reg = getGlobalRegistry();
  reg.records.clear();
}

function normalizePin(rawPin?: string | null): string {
  if (!rawPin || typeof rawPin !== 'string') return '';
  const unsealed = tryResolveKraPin(rawPin.trim());
  if (unsealed) return unsealed.toUpperCase().trim();
  const upper = rawPin.trim().toUpperCase();
  if (/^[A-Z]\d{9}[A-Z]$/i.test(upper)) return upper;
  return upper.replace(/[^A-Z0-9]/g, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Redemption Logic: Claim or Verify Existing Window
// ─────────────────────────────────────────────────────────────────────────────

export async function claimOrVerifyRedemptionWindow({
  mpesaReceipt,
  checkoutId,
  requestedPinInput,
  clerkId,
  amount = 20,
  phone,
  dbUserId,
}: {
  mpesaReceipt?: string | null;
  checkoutId?: string | null;
  requestedPinInput?: string | null;
  clerkId?: string | null;
  amount?: number;
  phone?: string | null;
  dbUserId?: string | null;
}): Promise<RedemptionValidationResult> {
  const normalizedReceipt = (mpesaReceipt || '').toUpperCase().trim();
  const normalizedCheckoutId = (checkoutId || '').trim();
  const requestedPin = normalizePin(requestedPinInput);

  if (!normalizedReceipt && !normalizedCheckoutId) {
    return {
      allowed: false,
      verified: false,
      status: 'failed',
      redemptionStatus: 'REJECTED',
      reason: 'INVALID_RECORD',
      httpStatus: 400,
      error: 'M-Pesa transaction reference or receipt code is required.',
    };
  }

  const lockKey = normalizedReceipt || normalizedCheckoutId;

  return await withReceiptLock(lockKey, async () => {
    const db = prisma as any;
    const now = new Date();
    const globalReg = getGlobalRegistry();

    // 1. Locate existing record in PostgreSQL or fallback registry
    let existingDownload: any = null;
    let existingTx: any = null;

    try {
      if (typeof db.certificateDownload?.findFirst === 'function') {
        existingDownload = await db.certificateDownload.findFirst({
          where: {
            OR: [
              ...(normalizedReceipt ? [{ mpesaReceipt: normalizedReceipt }] : []),
              ...(normalizedCheckoutId ? [{ checkoutId: normalizedCheckoutId }] : []),
            ],
          },
        });
      }
    } catch (err: any) {
      log.warn('[mpesa-redemption] CertificateDownload lookup notice:', err.message);
    }

    try {
      if (!existingDownload && typeof db.mpesaTransaction?.findFirst === 'function') {
        existingTx = await db.mpesaTransaction.findFirst({
          where: {
            OR: [
              ...(normalizedCheckoutId ? [{ checkoutRequestId: normalizedCheckoutId }] : []),
              ...(normalizedReceipt ? [{ mpesaReceiptNumber: normalizedReceipt }] : []),
            ],
          },
        });
      }
    } catch (err: any) {
      log.warn('[mpesa-redemption] MpesaTransaction lookup notice:', err.message);
    }

    // Check in-memory fallback if DB record not found
    const memRecord =
      globalReg.records.get(normalizedReceipt) ||
      (normalizedCheckoutId ? globalReg.records.get(normalizedCheckoutId) : null);

    // 2. Case: Record ALREADY claimed
    const candidateRecord = existingDownload || memRecord;

    if (candidateRecord) {
      const boundPin = normalizePin(candidateRecord.pin);

      // Rule: Strict ONE-TRANSACTION-ONE-KRA-PIN
      if (requestedPin && boundPin && requestedPin !== boundPin) {
        log.warn(
          `[mpesa-redemption] Rejected cross-PIN reuse. Receipt: ${normalizedReceipt || normalizedCheckoutId}, Bound: ${maskPin(boundPin)}, Attempted: ${maskPin(requestedPin)}`
        );
        return {
          allowed: false,
          verified: false,
          status: 'failed',
          redemptionStatus: 'REJECTED',
          reason: 'DIFFERENT_PIN',
          httpStatus: 403,
          error:
            'This M-Pesa transaction code has already been used for another KRA PIN. Please provide a valid payment transaction code.',
          pin: boundPin,
          downloadId: candidateRecord.id,
          mpesaReceipt: candidateRecord.mpesaReceipt || normalizedReceipt,
          checkoutRequestId: candidateRecord.checkoutId || normalizedCheckoutId,
        };
      }

      // Calculate authoritative expiration
      const firstClaimedAt = new Date(
        candidateRecord.firstClaimedAt || candidateRecord.createdAt || now
      );
      const expiresAt = new Date(
        candidateRecord.expiresAt || new Date(firstClaimedAt.getTime() + REDEMPTION_WINDOW_MS)
      );

      const hasElapsed = now.getTime() >= expiresAt.getTime();
      const isAlreadyExpired = candidateRecord.redemptionStatus === 'EXPIRED' || hasElapsed;

      if (isAlreadyExpired) {
        // Transition to EXPIRED in database and memory
        try {
          if (existingDownload?.id && typeof db.certificateDownload?.update === 'function') {
            await db.certificateDownload.update({
              where: { id: existingDownload.id },
              data: {
                redemptionStatus: 'EXPIRED',
                expiresAt,
              },
            }).catch(() => {});
          }
        } catch {}

        if (memRecord) {
          memRecord.redemptionStatus = 'EXPIRED';
        }

        log.info(
          `[mpesa-redemption] Expired transaction blocked. Receipt: ${normalizedReceipt || normalizedCheckoutId}, ExpiredAt: ${expiresAt.toISOString()}`
        );

        return {
          allowed: false,
          verified: false,
          status: 'failed',
          redemptionStatus: 'EXPIRED',
          reason: 'EXPIRED',
          httpStatus: 403,
          error:
            'Your 5-minute certificate download window has expired. This M-Pesa transaction code has already been used and cannot be reused. Please make a new payment to retrieve another certificate.',
          downloadId: candidateRecord.id,
          mpesaReceipt: candidateRecord.mpesaReceipt || normalizedReceipt,
          checkoutRequestId: candidateRecord.checkoutId || normalizedCheckoutId,
          pin: boundPin,
          firstClaimedAt: firstClaimedAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          remainingSeconds: 0,
        };
      }

      // Active 5-minute window!
      const remainingSeconds = Math.max(
        0,
        Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
      );

      return {
        allowed: true,
        verified: true,
        status: 'success',
        redemptionStatus: 'ACTIVE',
        reason: 'ACTIVE',
        downloadId: candidateRecord.id,
        mpesaReceipt: candidateRecord.mpesaReceipt || normalizedReceipt,
        checkoutRequestId: candidateRecord.checkoutId || normalizedCheckoutId,
        pin: boundPin || requestedPin,
        firstClaimedAt: firstClaimedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        remainingSeconds,
        downloadCount: candidateRecord.downloadCount || 0,
      };
    }

    // 3. Case: FIRST SUCCESSFUL CLAIM
    const targetPin = requestedPin || normalizePin(existingTx?.pin);
    if (!targetPin) {
      return {
        allowed: false,
        verified: false,
        status: 'failed',
        redemptionStatus: 'REJECTED',
        reason: 'INVALID_RECORD',
        httpStatus: 400,
        error: 'Target KRA PIN is required to claim this payment.',
      };
    }

    const firstClaimedAt = now;
    const expiresAt = new Date(now.getTime() + REDEMPTION_WINDOW_MS);
    const effectiveCheckoutId = normalizedCheckoutId || `MANUAL-${normalizedReceipt}`;
    const effectiveReceipt = normalizedReceipt || existingTx?.mpesaReceiptNumber || effectiveCheckoutId;

    let createdRecord: any = null;

    // Persist to PostgreSQL if available
    try {
      if (typeof db.certificateDownload?.create === 'function') {
        createdRecord = await db.certificateDownload.create({
          data: {
            userId: dbUserId || clerkId || 'guest_user',
            clerkId: clerkId || 'guest_user',
            pin: targetPin,
            downloadType: 'pay_per_download',
            amountCharged: amount,
            currency: 'KES',
            mpesaReceipt: effectiveReceipt,
            checkoutId: effectiveCheckoutId,
            redemptionStatus: 'ACTIVE',
            firstClaimedAt,
            expiresAt,
            downloadCount: 0,
          },
        });
      }
    } catch (createErr: any) {
      // Handle unique constraint race condition
      if (createErr?.code === 'P2002' && typeof db.certificateDownload?.findFirst === 'function') {
        createdRecord = await db.certificateDownload.findFirst({
          where: {
            OR: [
              { checkoutId: effectiveCheckoutId },
              { mpesaReceipt: effectiveReceipt },
            ],
          },
        });
      } else {
        log.warn('[mpesa-redemption] DB insert notice:', createErr?.message);
      }
    }

    // Update MpesaTransaction if present
    try {
      if (typeof db.mpesaTransaction?.updateMany === 'function') {
        await db.mpesaTransaction.updateMany({
          where: {
            OR: [
              { checkoutRequestId: effectiveCheckoutId },
              { mpesaReceiptNumber: effectiveReceipt },
            ],
          },
          data: {
            status: 'COMPLETED',
            redemptionStatus: 'ACTIVE',
            firstClaimedAt,
            expiresAt,
            pin: targetPin,
          },
        });
      }
    } catch {}

    const downloadId = createdRecord?.id || `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Store in global memory registry
    const memData: RedemptionRecordData = {
      id: downloadId,
      mpesaReceipt: effectiveReceipt,
      checkoutId: effectiveCheckoutId,
      pin: targetPin,
      redemptionStatus: 'ACTIVE',
      firstClaimedAt,
      expiresAt,
      downloadCount: 0,
      amountCharged: amount,
    };
    if (effectiveReceipt) globalReg.records.set(effectiveReceipt, memData);
    if (effectiveCheckoutId) globalReg.records.set(effectiveCheckoutId, memData);

    log.info(
      `[mpesa-redemption] Started 5-minute redemption window for PIN ${maskPin(targetPin)}. Receipt: ${effectiveReceipt}, ExpiresAt: ${expiresAt.toISOString()}`
    );

    return {
      allowed: true,
      verified: true,
      status: 'success',
      redemptionStatus: 'ACTIVE',
      reason: 'FIRST_CLAIM',
      downloadId,
      mpesaReceipt: effectiveReceipt,
      checkoutRequestId: effectiveCheckoutId,
      pin: targetPin,
      firstClaimedAt: firstClaimedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      remainingSeconds: REDEMPTION_WINDOW_SECONDS,
      downloadCount: 0,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Certificate Download Authorization Check
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyCertificateDownloadEligibility({
  downloadId,
  requestedPinInput,
  isServiceAuthorized = false,
  isAdmin = false,
}: {
  downloadId: string;
  requestedPinInput?: string | null;
  isServiceAuthorized?: boolean;
  isAdmin?: boolean;
}): Promise<{
  allowed: boolean;
  cleanPin?: string;
  error?: string;
  httpStatus?: number;
  expiresAt?: string;
  remainingSeconds?: number;
  downloadCount?: number;
}> {
  if (isAdmin || isServiceAuthorized) {
    return { allowed: true, cleanPin: normalizePin(requestedPinInput) };
  }

  if (!downloadId) {
    return {
      allowed: false,
      error: 'Download token required. Please complete M-Pesa payment.',
      httpStatus: 403,
    };
  }

  const db = prisma as any;
  const now = new Date();
  const globalReg = getGlobalRegistry();

  let record: any = null;

  try {
    if (typeof db.certificateDownload?.findFirst === 'function') {
      record = await db.certificateDownload.findFirst({
        where: { id: downloadId },
      });
    }
  } catch (err: any) {
    log.warn('[mpesa-redemption] CertificateDownload verify notice:', err.message);
  }

  // Fallback to in-memory store
  if (!record) {
    for (const r of globalReg.records.values()) {
      if (r.id === downloadId) {
        record = r;
        break;
      }
    }
  }

  if (!record) {
    return {
      allowed: false,
      error: 'Invalid or unrecognized download token. Please verify your payment.',
      httpStatus: 403,
    };
  }

  // Active subscription or admin bypasses the 5-minute pay-per-download constraint
  if (record.downloadType === 'subscription' || record.downloadType === 'admin') {
    return { allowed: true, cleanPin: normalizePin(record.pin) };
  }

  const boundPin = normalizePin(record.pin);
  const requestedPin = normalizePin(requestedPinInput);

  // 1. PIN Lock
  if (requestedPin && boundPin && requestedPin !== boundPin) {
    return {
      allowed: false,
      error:
        'This M-Pesa transaction code has already been used for another KRA PIN. Please provide a valid payment transaction code.',
      httpStatus: 403,
    };
  }

  // 2. 5-Minute Window Check
  const firstClaimedAt = new Date(record.firstClaimedAt || record.createdAt || now);
  const expiresAt = new Date(
    record.expiresAt || new Date(firstClaimedAt.getTime() + REDEMPTION_WINDOW_MS)
  );

  const isExpired = now.getTime() >= expiresAt.getTime() || record.redemptionStatus === 'EXPIRED';

  if (isExpired) {
    // Permanently mark EXPIRED
    try {
      if (record.id && typeof db.certificateDownload?.update === 'function') {
        await db.certificateDownload.update({
          where: { id: record.id },
          data: { redemptionStatus: 'EXPIRED', expiresAt },
        }).catch(() => {});
      }
    } catch {}

    record.redemptionStatus = 'EXPIRED';

    return {
      allowed: false,
      error:
        'Your 5-minute certificate download window has expired. This M-Pesa transaction code has already been used and cannot be reused. Please make a new payment to retrieve another certificate.',
      httpStatus: 403,
      expiresAt: expiresAt.toISOString(),
      remainingSeconds: 0,
    };
  }

  // 3. Increment download counter & update lastDownloadedAt
  const newCount = (record.downloadCount || 0) + 1;
  try {
    if (record.id && typeof db.certificateDownload?.update === 'function') {
      await db.certificateDownload.update({
        where: { id: record.id },
        data: {
          downloadCount: newCount,
          lastDownloadedAt: now,
          updatedAt: now,
        },
      }).catch(() => {});
    }
  } catch {}

  record.downloadCount = newCount;
  record.lastDownloadedAt = now;

  const remainingSeconds = Math.max(
    0,
    Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
  );

  return {
    allowed: true,
    cleanPin: boundPin || requestedPin,
    expiresAt: expiresAt.toISOString(),
    remainingSeconds,
    downloadCount: newCount,
  };
}
