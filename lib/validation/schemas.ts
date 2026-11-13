import { z } from 'zod';

/**
 * Request-body schemas for the payment & fulfillment API surface.
 *
 * The API layer previously destructured bodies ad-hoc (zod was only used for
 * env validation). These schemas enforce bounds/format at the boundary so
 * fuzzable fields (PINs, phones, references, ids) cannot reach the payment
 * logic or Prisma as malformed values.
 */

/** Shared error response helper: first issue message, never the raw body. */
export function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Invalid request.';
  const path = issue.path.join('.');
  return path ? `${path}: ${issue.message}` : issue.message;
}

// PIN may arrive masked (A01***78Z), in transit as a sealed kraseal1: blob,
// or as plaintext — format is verified after server-side resolution, so only
// bounds are enforced here (blocks unbounded strings into the payment flow).
const pinField = z.string().min(4).max(160);

/** POST /api/mpesa/stkpush */
export const mpesaStkPushSchema = z.object({
  phone: z
    .string()
    .min(9)
    .max(16)
    .regex(/^[0-9+\s()-]+$/, 'Invalid phone number format'),
  reference: z.string().min(1).max(160).optional(),
  pin: pinField.optional(),
  type: z.enum(['certificate', 'cyber']).optional().default('certificate'),
  description: z.string().max(100).optional(),
});

/** POST /api/mpesa/verify */
export const mpesaVerifySchema = z.object({
  checkoutRequestId: z
    .string()
    .min(8)
    .max(120)
    .regex(/^[A-Za-z0-9_-]+$/, 'checkoutRequestId contains invalid characters'),
  pin: pinField.optional(),
});

/** POST /api/certificate/record-download */
export const recordDownloadSchema = z.object({
  pin: z
    .string()
    .min(4)
    .max(20)
    .regex(/^[A-Z0-9*]+$/, 'pin may only contain A–Z, 0–9 and *'),
  checkoutId: z.string().max(80).optional(),
  subscriptionId: z.string().max(80).optional(),
  downloadType: z.string().max(40),
});

/** POST /api/generate-receipt */
export const generateReceiptSchema = z.object({
  downloadId: z.string().uuid().optional(),
});
