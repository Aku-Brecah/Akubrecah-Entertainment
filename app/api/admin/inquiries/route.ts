import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminCaller } from '@/lib/admin-auth';
import { sendInquiryReply } from '@/lib/email/reply';

export const maxDuration = 30;

// GET: Retrieve inquiries with search, status filters, unread flags, and pagination
export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdminCaller(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const unreadOnly = searchParams.get('unread') === 'true';
    const awaitingReply = searchParams.get('awaitingReply') === 'true';
    const search = searchParams.get('q')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (unreadOnly) {
      where.isRead = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { projectType: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (awaitingReply) {
      where.replies = { none: {} };
      if (!where.status) {
        where.status = { notIn: ['archived', 'spam', 'lost'] };
      }
    }

    const [inquiries, totalMatching, totalAll, unreadCount, newCount, archivedCount, spamCount] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          notes: {
            orderBy: { createdAt: 'desc' },
          },
          replies: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.inquiry.count({ where }),
      prisma.inquiry.count(),
      prisma.inquiry.count({ where: { isRead: false } }),
      prisma.inquiry.count({ where: { status: 'new' } }),
      prisma.inquiry.count({ where: { status: 'archived' } }),
      prisma.inquiry.count({ where: { status: 'spam' } }),
    ]);

    // Calculate awaiting reply count
    const awaitingCount = await prisma.inquiry.count({
      where: {
        replies: { none: {} },
        status: { notIn: ['archived', 'spam', 'lost'] },
      },
    });

    const stats = {
      total: totalAll,
      unread: unreadCount,
      new: newCount,
      awaitingReply: awaitingCount,
      archived: archivedCount,
      spam: spamCount,
    };

    return NextResponse.json({
      success: true,
      inquiries,
      total: totalMatching,
      page,
      limit,
      totalPages: Math.ceil(totalMatching / limit) || 1,
      stats,
    });
  } catch (error: any) {
    console.error('[API Admin Inquiries GET Error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update inquiry status or read/unread state
export async function PATCH(req: NextRequest) {
  try {
    const admin = await verifyAdminCaller(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, ids, status, isRead } = body;

    // Handle batch update
    if (Array.isArray(ids) && ids.length > 0) {
      const dataToUpdate: any = {};
      if (typeof status === 'string') dataToUpdate.status = status;
      if (typeof isRead === 'boolean') dataToUpdate.isRead = isRead;

      const batchResult = await prisma.inquiry.updateMany({
        where: { id: { in: ids } },
        data: dataToUpdate,
      });

      return NextResponse.json({ success: true, count: batchResult.count });
    }

    // Handle single update
    if (!id) {
      return NextResponse.json({ success: false, error: 'Inquiry ID is required.' }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (typeof status === 'string') dataToUpdate.status = status;
    if (typeof isRead === 'boolean') dataToUpdate.isRead = isRead;

    const updated = await prisma.inquiry.update({
      where: { id },
      data: dataToUpdate,
      include: {
        notes: { orderBy: { createdAt: 'desc' } },
        replies: { orderBy: { createdAt: 'desc' } },
      },
    });

    return NextResponse.json({ success: true, inquiry: updated });
  } catch (error: any) {
    console.error('[API Admin Inquiries PATCH Error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Actions (Dispatch email reply or add internal note)
export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdminCaller(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action = 'note', inquiryId } = body;

    if (!inquiryId) {
      return NextResponse.json({ success: false, error: 'Inquiry ID is required.' }, { status: 400 });
    }

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
    });

    if (!inquiry) {
      return NextResponse.json({ success: false, error: 'Inquiry not found.' }, { status: 404 });
    }

    // Action 1: Dispatch Email Reply
    if (action === 'reply') {
      const { replySubject, replyBody } = body;

      if (!replyBody || !replyBody.trim()) {
        return NextResponse.json({ success: false, error: 'Reply message body is required.' }, { status: 400 });
      }

      const emailSubject = replySubject?.trim() || `Re: ${inquiry.subject || inquiry.projectType}`;

      // Dispatch via SMTP service
      const sendResult = await sendInquiryReply({
        inquiryId: inquiry.id,
        recipientEmail: inquiry.email,
        recipientName: inquiry.name,
        subject: emailSubject,
        body: replyBody.trim(),
        originalMessage: inquiry.message,
        adminEmail: admin.email,
      });

      // Persist reply attempt in database regardless of result to track audit history
      const savedReply = await prisma.inquiryReply.create({
        data: {
          inquiryId: inquiry.id,
          senderEmail: admin.email || 'engineering@akubrecah.com',
          recipientEmail: inquiry.email,
          subject: emailSubject,
          body: replyBody.trim(),
          deliveryStatus: sendResult.deliveryStatus,
          providerId: sendResult.providerId || null,
          errorMessage: sendResult.errorMessage || null,
        },
      });

      // Update inquiry status to contacted if currently new, and mark as read
      const updatedInquiry = await prisma.inquiry.update({
        where: { id: inquiry.id },
        data: {
          isRead: true,
          status: inquiry.status === 'new' ? 'contacted' : inquiry.status,
        },
        include: {
          notes: { orderBy: { createdAt: 'desc' } },
          replies: { orderBy: { createdAt: 'desc' } },
        },
      });

      return NextResponse.json({
        success: sendResult.success,
        reply: savedReply,
        inquiry: updatedInquiry,
        error: sendResult.errorMessage,
      });
    }

    // Action 2: Add Internal Note
    const { content, authorName } = body;
    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: 'Note content is required.' }, { status: 400 });
    }

    const note = await prisma.inquiryNote.create({
      data: {
        inquiryId,
        content: content.trim(),
        authorName: authorName || admin.email || 'Admin',
      },
    });

    return NextResponse.json({ success: true, note });
  } catch (error: any) {
    console.error('[API Admin Inquiries POST Action Error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete an inquiry or batch of inquiries
export async function DELETE(req: NextRequest) {
  try {
    const admin = await verifyAdminCaller(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      await prisma.inquiry.delete({
        where: { id },
      });
      return NextResponse.json({ success: true, message: 'Inquiry deleted successfully.' });
    }

    const body = await req.json().catch(() => ({}));
    const { ids } = body;

    if (Array.isArray(ids) && ids.length > 0) {
      const deleted = await prisma.inquiry.deleteMany({
        where: { id: { in: ids } },
      });
      return NextResponse.json({ success: true, count: deleted.count });
    }

    return NextResponse.json({ success: false, error: 'Inquiry ID or list of IDs is required.' }, { status: 400 });
  } catch (error: any) {
    console.error('[API Admin Inquiries DELETE Error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
