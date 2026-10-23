import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateReceiptPdfBuffer } from '@/lib/certificate-fulfillment';
import { verifyAdminCaller } from '@/lib/admin-auth';
import { generateReceiptSchema, firstIssueMessage } from '@/lib/validation/schemas';

export const maxDuration = 30;

/**
 * POST /api/generate-receipt
 *
 * Renders the KES 20 ETR fiscal receipt for a COMPLETED download payment.
 * Server-authoritative: every printed field (PIN, receipt number, amount)
 * is sourced from the matching certificateDownload record — the request body
 * can only point at an existing record. Without admin credentials, an
 * attacker-chosen name/receipt/amount can no longer fabricate "official"
 * fiscal invoices (historically this endpoint was fully unauthenticated).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = generateReceiptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: `Invalid request — ${firstIssueMessage(parsed.error)}` },
        { status: 400 }
      );
    }
    const { downloadId } = parsed.data;

    const db = prisma as any;
    const admin = await verifyAdminCaller(req);

    let downloadRecord: any = null;
    const incomingDownloadId = typeof downloadId === 'string' ? downloadId.trim() : '';
    if (incomingDownloadId) {
      downloadRecord = await db.certificateDownload?.findFirst({
        where: { id: incomingDownloadId },
      });
    }

    if (!admin && !downloadRecord) {
      return NextResponse.json(
        { success: false, error: 'Download authorization required. Receipts can only be issued for confirmed payments.' },
        { status: 403 }
      );
    }

    // Bind the printed receipt number to the actual payment trail.
    const receiptNumber: string =
      downloadRecord?.mpesaReceipt || downloadRecord?.checkoutId || (admin ? 'MANUAL-' + Date.now() : '');

    if (!receiptNumber || (!admin && receiptNumber.startsWith('dl_'))) {
      return NextResponse.json(
        { success: false, error: 'No confirmed payment reference on record for this download.' },
        { status: 403 }
      );
    }

    // Resolve the taxpayer name from the paying user, not from the request.
    let taxpayerName = '';
    try {
      const user = await db.users?.findUnique({ where: { id: downloadRecord.userId } });
      taxpayerName = user?.name || '';
    } catch (nameErr: any) {
      log.warn('[generate-receipt] User lookup notice:', nameErr.message);
    }

    const isAdminRecord = downloadRecord?.downloadType === 'admin' || downloadRecord?.downloadType === 'service_dispatch';
    const resolvedPin = downloadRecord?.pin && isAdminRecord ? downloadRecord.pin.toUpperCase() : (downloadRecord?.pin || '').toUpperCase();

    const pdfBuffer = await generateReceiptPdfBuffer({
      receiptNumber,
      pin: resolvedPin || 'N/A',
      name: taxpayerName || 'Registered Taxpayer',
      amount: Number(downloadRecord?.amountCharged ?? 20),
      phone: undefined,
      paymentMethod: downloadRecord?.checkoutId && !downloadRecord?.mpesaReceipt ? 'PAYSTACK' : 'M-PESA EXPRESS',
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ETR_Receipt_${receiptNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    log.error('[generate-receipt Error]:', error.message);
    return NextResponse.json({ success: false, error: 'Receipt generation failed' }, { status: 500 });
  }
}
