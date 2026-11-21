import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isAdminUser } from '@/lib/subscription';
import prisma from '@/lib/prisma';
import { generateCyberInvoicePdfBuffer } from '@/lib/cyber-subscription';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Invoice ID is required' }, { status: 400 });
    }

    // SECURITY: invoices contain owner names and phone numbers (PII). Access is
    // restricted to the cafe owner (matched by Clerk user or payment phone) and
    // admins — no more unauthenticated access by UUID.
    let clerkId: string | null = null;
    let clerkPhone: string | null = null;
    try {
      const { userId } = await auth();
      if (userId) {
        clerkId = userId;
        const { clerkClient } = await import('@clerk/nextjs/server');
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        clerkPhone = user.phoneNumbers?.find((p: any) => p.id === user.primaryPhoneNumberId)?.phoneNumber || null;
      }
    } catch {}

    const db = prisma as any;
    const invoice = await db.cyberInvoice.findUnique({
      where: { id },
      include: {
        cyberCafe: true,
      },
    });

    if (!invoice || !invoice.cyberCafe) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    const isAdmin = clerkId ? await isAdminUser(clerkId) : false;
    const normalizedClerkPhone = clerkPhone ? clerkPhone.replace(/\D/g, '').replace(/^0/, '254') : '';
    // SECURITY (BOLA/IDOR guard): If the Cyber Cafe record is already bound to a
    // Clerk user ID, ONLY that exact Clerk user (or an admin) may access the invoice.
    // Phone-number fallback is permitted ONLY when the Cyber Cafe was registered via
    // WhatsApp and does not yet have a bound `clerkUserId`.
    const isBoundToAnotherUser =
      Boolean(invoice.cyberCafe.clerkUserId) && invoice.cyberCafe.clerkUserId !== clerkId;
    const ownsCafe =
      Boolean(clerkId) &&
      !isBoundToAnotherUser &&
      (invoice.cyberCafe.clerkUserId === clerkId ||
        (!invoice.cyberCafe.clerkUserId &&
          Boolean(normalizedClerkPhone) &&
          [invoice.cyberCafe.whatsappPhone, invoice.cyberCafe.paymentPhone]
            .map((p: any) => String(p || '').replace(/\D/g, ''))
            .includes(normalizedClerkPhone)));

    if (!isAdmin && !ownsCafe) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: you do not have access to this invoice.' },
        { status: 403 }
      );
    }

    const pdfBuffer = await generateCyberInvoicePdfBuffer({
      invoiceNumber: invoice.invoiceNumber,
      cafeName: invoice.cyberCafe.cafeName,
      ownerName: invoice.cyberCafe.ownerName,
      whatsappPhone: invoice.cyberCafe.whatsappPhone,
      paymentPhone: invoice.cyberCafe.paymentPhone,
      amount: invoice.amount,
      mpesaReceipt: invoice.mpesaReceipt || "CONFIRMED",
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.pdf"`,
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  } catch (error: any) {
    log.error('[api/cyber/invoice/[id]] Error:', error.message);
    return NextResponse.json({ success: false, error: 'Failed to generate invoice PDF' }, { status: 500 });
  }
}
