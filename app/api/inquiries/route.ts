import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse, after } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEvolutionTextMessage } from '@/lib/evolution';
import { extractClientIp } from '@/lib/rate-limit/ip';
import { sendAdminNotification } from '@/lib/email/reply';

export const maxDuration = 30;

/**
 * Strip dangerous HTML script tags and excessive control characters.
 */
function sanitizeText(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // Strip non-printable ASCII
    .trim()
    .slice(0, maxLength);
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting is enforced centrally in proxy.ts (Tier 3: 10 req/min);
    // use the verified client IP extractor for audit storage.
    const ipAddress = extractClientIp(req);

    const body = await req.json().catch(() => ({}));

    // 2. Anti-Spam Honeypot Detection
    if (body.honeypot || body._gotcha || body.website_url) {
      // Silently accept to trap bots without polluting database
      return NextResponse.json({
        success: true,
        message: 'Inquiry received successfully.',
        inquiryId: 'spm_' + Date.now(),
      });
    }

    const rawName = body.name;
    const rawEmail = body.email;
    const rawPhone = body.phone;
    const rawCompany = body.company;
    const rawProjectType = body.projectType;
    const rawBudget = body.budget;
    const rawSubject = body.subject;
    const rawMessage = body.message;
    const rawSource = body.source;

    // 3. Robust Input Validation & Sanitization
    const name = sanitizeText(rawName, 100);
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase().slice(0, 254) : '';
    const phone = sanitizeText(rawPhone, 30);
    const company = sanitizeText(rawCompany, 100);
    const projectType = sanitizeText(rawProjectType, 100) || 'Software Engineering';
    const budget = sanitizeText(rawBudget, 100) || 'Flexible';
    const subject = sanitizeText(rawSubject, 200) || `Project Inquiry: ${projectType}`;
    const message = sanitizeText(rawMessage, 10000);
    const source = sanitizeText(rawSource, 100) || 'website_contact';

    if (name.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Full name is required (minimum 2 characters).' },
        { status: 400 }
      );
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    if (message.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Message must be at least 10 characters detailing your requirements.' },
        { status: 400 }
      );
    }

    // 4. Persistent Database Storage
    const inquiry = await prisma.inquiry.create({
      data: {
        name,
        email,
        phone: phone || null,
        company: company || null,
        projectType,
        budget,
        subject,
        message,
        status: 'new',
        source,
        isRead: false,
        ipAddress,
      },
    });

    // 5. Automated Multi-Channel Admin Notifications (scheduled via after() so serverless doesn't drop them)
    const adminPhone = (process.env.SUPER_ADMIN_PHONE || process.env.ADMIN_WHATSAPP_PHONE || '').replace(/[^0-9]/g, '');
    const alertText =
      `*NEW CLIENT INQUIRY RECEIVED*\n\n` +
      `*Client:* ${inquiry.name}\n` +
      `*Email:* ${inquiry.email}\n` +
      `*Phone:* ${inquiry.phone || 'Not provided'}\n` +
      `*Company:* ${inquiry.company || 'Individual / Startup'}\n` +
      `*Project Type:* ${inquiry.projectType}\n` +
      `*Subject:* ${inquiry.subject}\n` +
      `*Budget:* ${inquiry.budget}\n\n` +
      `*Message:*\n"${inquiry.message}"\n\n` +
      `_Status: NEW. View and manage in your Admin Portal at /admin/inquiries_`;

    after(async () => {
      const tasks: Promise<unknown>[] = [
        sendAdminNotification(inquiry).catch((err) => {
          log.warn('[Inquiries Admin Email Alert Error]:', err?.message || err);
        }),
      ];
      if (adminPhone) {
        tasks.push(
          sendEvolutionTextMessage(adminPhone, alertText).catch((err) => {
            log.warn('[Inquiries WhatsApp Alert Error]:', err?.message || err);
          })
        );
      }
      await Promise.allSettled(tasks);
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your inquiry has been received. Our principal engineering team will review and reply within 24 hours.',
      inquiryId: inquiry.id,
    });
  } catch (error: any) {
    log.error('[API Inquiries POST Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit inquiry. Please try again.' },
      { status: 500 }
    );
  }
}
