import { log } from '@/lib/monitoring/logger';
import nodemailer from 'nodemailer';

export interface SendReplyParams {
  inquiryId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  originalMessage?: string;
  adminEmail?: string;
}

export interface SendReplyResult {
  success: boolean;
  deliveryStatus: 'sent' | 'failed' | 'draft';
  providerId?: string;
  errorMessage?: string;
}

/**
 * Sanitize header strings against CRLF Injection (Carriage Return / Line Feed)
 */
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds standard Nodemailer transport using configured SMTP credentials.
 * Supports Akubrecah's Mailcow instance, Postmark, AWS SES, or standard SMTP.
 */
function getSmtpTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
}

/**
 * Checks whether SMTP provider is fully configured in the environment.
 */
export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * Dispatches an email response to a prospective client inquiry.
 */
export async function sendInquiryReply(params: SendReplyParams): Promise<SendReplyResult> {
  const { recipientEmail, recipientName, subject, body, originalMessage, adminEmail } = params;

  // 1. Validate inputs & prevent header injection
  const safeRecipient = sanitizeHeader(recipientEmail);
  const safeSubject = sanitizeHeader(subject || 'Update regarding your inquiry with Akubrecah Technologies');
  const fromAddress = sanitizeHeader(process.env.SMTP_FROM || 'Akubrecah Engineering <engineering@akubrecah.com>');
  const replyTo = sanitizeHeader(adminEmail || process.env.SMTP_REPLY_TO || 'engineering@akubrecah.com');

  if (!safeRecipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeRecipient)) {
    return {
      success: false,
      deliveryStatus: 'failed',
      errorMessage: `Invalid recipient email address: "${safeRecipient}".`,
    };
  }

  if (!body || body.trim().length === 0) {
    return {
      success: false,
      deliveryStatus: 'failed',
      errorMessage: 'Reply message body cannot be empty.',
    };
  }

  // 2. Check transport configuration
  const transport = getSmtpTransport();
  if (!transport) {
    return {
      success: false,
      deliveryStatus: 'failed',
      errorMessage:
        'SMTP service is not configured. Please define SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in the production environment variables.',
    };
  }

  // 3. Compose GovTech Prestige Branded HTML & Plain Text
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #0F172A; background-color: #F8FAFC; margin: 0; padding: 24px; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #BA1A1A; padding: 24px 32px; color: #FFFFFF; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
    .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.9; }
    .content { padding: 32px; }
    .greeting { font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 16px; }
    .message-text { font-size: 14px; color: #334155; white-space: pre-line; line-height: 1.7; }
    .quote-box { margin-top: 24px; padding: 16px; background: #F1F5F9; border-left: 3px solid #BA1A1A; border-radius: 8px; font-size: 12px; color: #64748B; }
    .footer { padding: 20px 32px; background: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Akubrecah Technologies</h1>
      <p>Software Engineering & Digital Innovation • Nairobi, Kenya</p>
    </div>
    <div class="content">
      <div class="greeting">Dear ${escapeHtml(recipientName || 'Valued Client')},</div>
      <div class="message-text">${escapeHtml(body)}</div>
      ${originalMessage
      ? `<div class="quote-box">
              <strong>Your Original Project Brief:</strong><br />
              ${escapeHtml(originalMessage)}
            </div>`
      : ''
    }
    </div>
    <div class="footer">
      <p>This message was sent from Akubrecah Technologies (Nairobi, Kenya). For urgent statutory or engineering support, reply directly to this email or visit <a href="https://akubrecah.com" style="color: #BA1A1A; text-decoration: none;">akubrecah.com</a>.</p>
      <p>&copy; ${new Date().getFullYear()} Akubrecah Technologies. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const info = await transport.sendMail({
      from: fromAddress,
      to: safeRecipient,
      replyTo,
      subject: safeSubject,
      text: `${body}\n\n---\nOriginal Brief:\n${originalMessage || ''}`,
      html: htmlBody,
    });

    return {
      success: true,
      deliveryStatus: 'sent',
      providerId: info.messageId || `msg_${Date.now()}`,
    };
  } catch (err: any) {
    log.error('[sendInquiryReply Error]:', err);
    return {
      success: false,
      deliveryStatus: 'failed',
      errorMessage: err.message || 'SMTP transport failed to deliver message.',
    };
  }
}

/**
 * Sends internal notification to administrators when a new client inquiry arrives.
 */
export async function sendAdminNotification(inquiry: {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  projectType: string;
  budget?: string | null;
  message: string;
}): Promise<void> {
  const adminNotificationEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SUPER_ADMIN_EMAIL;
  if (!adminNotificationEmail || !isSmtpConfigured()) {
    return; // Silently skip if email alerts are not configured
  }

  const transport = getSmtpTransport();
  if (!transport) return;

  try {
    const fromAddress = sanitizeHeader(process.env.SMTP_FROM || 'Akubrecah System <system@akubrecah.com>');
    await transport.sendMail({
      from: fromAddress,
      to: sanitizeHeader(adminNotificationEmail),
      subject: sanitizeHeader(`[New Inquiry] ${inquiry.projectType} from ${inquiry.name}`),
      text: `New Client Inquiry Received:\n\nName: ${inquiry.name}\nEmail: ${inquiry.email}\nPhone: ${inquiry.phone || 'N/A'}\nCompany: ${inquiry.company || 'N/A'}\nProject: ${inquiry.projectType}\nBudget: ${inquiry.budget || 'N/A'}\n\nMessage:\n${inquiry.message}\n\nManage at: https://akubrecah.com/admin/inquiries`,
    });
  } catch (err) {
    log.warn('[Admin Notification Email Error]:', err);
  }
}
