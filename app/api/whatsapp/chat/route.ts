import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sanitizeWhatsAppPhone, sendEvolutionTextMessage, sendEvolutionDocument } from '@/lib/evolution';
import { fetchTaxpayerById, fetchTaxpayerByPin } from '@/lib/kra-api';
import { maskTaxpayerData } from '@/lib/masking';
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
  getPaystackLiveTransactions,
  findRecentSuccessfulPaystackPayment,
} from '@/lib/paystack';
import { dispatchMpesaStkPush, normalizePhoneNumber } from '@/app/api/mpesa/stkpush/route';
import { createAdminMagicToken } from '@/lib/magic-token';
import { getPublicAppUrl } from '@/lib/utils';
import {
  getCyberCafeStatus,
  activateCyberCafeSubscription,
  incrementCyberCafeDownloadCount,
  deliverCyberInvoiceToWhatsApp,
  generateCyberInvoicePdfBuffer,
  displayPhone,
  formatKenyaPhone,
} from '@/lib/cyber-subscription';
import { isDuplicateWhatsAppMessage } from '@/lib/whatsapp-dedup';

export const maxDuration = 60;

function extractKenyanPhone(text: string): string | null {
  if (!text) return null;
  const cleaned = text.replace(/[\s\-\+\(\)]/g, '');
  const match = cleaned.match(/(?:254|\+254|0)?([71]\d{8})/);
  if (match && match[1]) {
    return '254' + match[1];
  }
  return null;
}

function formatDisplayPhone(phone: string): string {
  if (!phone) return '';
  if (phone.startsWith('254') && phone.length === 12) {
    return '0' + phone.substring(3);
  }
  return phone;
}


async function triggerInAppMpesaPayment({
  targetPhone,
  whatsappUserPhone,
  pin,
  amount,
  taxpayerName,
}: {
  targetPhone: string;
  whatsappUserPhone: string;
  pin: string;
  amount: number;
  taxpayerName?: string;
}): Promise<{
  success: boolean;
  checkoutRequestId?: string;
  gateway?: string;
  normalizedPhone: string;
  error?: string;
}> {
  const normalizedPhone = normalizePhoneNumber(targetPhone);
  const cleanPin = pin.trim().toUpperCase();
  const reference = `CERT-${cleanPin}-${Date.now()}`;

  try {
    const result = await dispatchMpesaStkPush({
      phone: normalizedPhone,
      amount,
      reference,
      description: `KRA Certificate - ${cleanPin}`,
      userClerkId: `wa_${whatsappUserPhone.replace(/[^a-zA-Z0-9]/g, '')}`,
      userEmail: `wa_${whatsappUserPhone.replace(/[^a-zA-Z0-9]/g, '')}@akubrecah.co.ke`,
    });

    return {
      success: result.success,
      checkoutRequestId: result.checkoutRequestId || result.CheckoutRequestID,
      gateway: result.gateway || 'mpesa',
      normalizedPhone,
      error: result.error,
    };
  } catch (err: any) {
    console.error('[WhatsApp triggerInAppMpesaPayment Error]:', err.message);
    return {
      success: false,
      normalizedPhone,
      error: err.message || 'Failed to trigger M-Pesa STK Push',
    };
  }
}

async function triggerCyberCafePayment({
  targetPhone,
  whatsappUserPhone,
  cafeName,
  ownerName,
}: {
  targetPhone: string;
  whatsappUserPhone: string;
  cafeName: string;
  ownerName: string;
}): Promise<{
  success: boolean;
  checkoutRequestId?: string;
  gateway?: string;
  normalizedPhone: string;
  error?: string;
}> {
  const normalizedPhone = normalizePhoneNumber(targetPhone);
  const reference = `CYBER-${Date.now().toString().slice(-6)}`;

  try {
    const result = await dispatchMpesaStkPush({
      phone: normalizedPhone,
      amount: 500,
      reference,
      description: `Cyber Sub - ${cafeName.substring(0, 20)}`,
      userClerkId: `wa_${whatsappUserPhone.replace(/[^a-zA-Z0-9]/g, '')}`,
      userEmail: `cyber_${whatsappUserPhone.replace(/[^a-zA-Z0-9]/g, '')}@akubrecah.co.ke`,
    });

    return {
      success: result.success,
      checkoutRequestId: result.checkoutRequestId || result.CheckoutRequestID,
      gateway: result.gateway || 'mpesa',
      normalizedPhone,
      error: result.error,
    };
  } catch (err: any) {
    console.error('[WhatsApp triggerCyberCafePayment Error]:', err.message);
    return {
      success: false,
      normalizedPhone,
      error: err.message || 'Failed to trigger M-Pesa STK Push',
    };
  }
}

async function createPaystackLink(userPhone: string, pin: string, amount: number, customerName?: string) {
  const appUrl = getPublicAppUrl();
  const reference = `PSTK-CERT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  return await initializePaystackTransaction({
    email: `wa_${userPhone.replace(/[^a-zA-Z0-9]/g, '')}@akubrecah.co.ke`,
    amountKes: amount,
    reference,
    callbackUrl: `${appUrl}/checkout/success?ref=${reference}&pin=${pin}`,
    metadata: {
      clerkId: 'wa_' + userPhone,
      type: 'pay_per_download',
      pin,
      amountKes: amount,
      phone: userPhone,
      customerName: customerName || 'WhatsApp Customer',
    },
  });
}

/**
 * Admin Bot Controller for WhatsApp Super Admin
 * Allows checking revenue, stats, recent logs, bot performance, and generating 1-click magic link
 */
async function handleAdminBotCommand({
  incomingText,
  userPhone,
  metadata,
  saveConversationState,
  db,
  authorPhone,
  isFromBotOwner,
}: {
  incomingText: string;
  userPhone: string;
  metadata: Record<string, any>;
  saveConversationState: (step: string, extra?: Record<string, any>) => Promise<void>;
  db: any;
  authorPhone?: string;
  isFromBotOwner?: boolean;
}): Promise<string | null> {
  const trimmed = incomingText.trim();

  // Strip leading ! or /
  const clean = trimmed.replace(/^[\!\/]/, '').trim();
  const parts = clean.split(/\s+/);
  const rawCmd = parts[0]?.toLowerCase() || '';
  const rawArg = parts.slice(1).join(' ').trim();

  const expectedPin = process.env.ADMIN_BOT_PIN || '';
  const hasPinInText = Boolean(expectedPin) && clean.includes(expectedPin);

  const BOT_NUMBER = '254791497858';
  const effectivePhone = authorPhone || userPhone;
  const isOwner = Boolean(
    isFromBotOwner ||
    effectivePhone === BOT_NUMBER ||
    userPhone === BOT_NUMBER ||
    effectivePhone.endsWith(BOT_NUMBER) ||
    BOT_NUMBER.endsWith(effectivePhone)
  );

  const adminNumbersEnv = process.env.ADMIN_WHATSAPP_NUMBERS || process.env.SUPER_ADMIN_PHONE || '';
  const configuredAdmins = adminNumbersEnv.split(',').map((s) => s.replace(/[^0-9]/g, '').trim()).filter(Boolean);
  const adminList = Array.from(new Set([BOT_NUMBER, ...configuredAdmins]));

  const isWhitelisted =
    isOwner ||
    adminList.includes(effectivePhone) ||
    adminList.some((p) => effectivePhone.endsWith(p) || p.endsWith(effectivePhone));

  const hasActivePinSession = Boolean(
    metadata.isAdminAuthenticated && metadata.adminAuthExpiry && Date.now() < metadata.adminAuthExpiry
  );

  // Check if this message is intended for admin bot
  const adminCmds = [
    'admin',
    'stats',
    'kpi',
    'revenue',
    'rev',
    'logs',
    'tx',
    'transactions',
    'bot',
    'link',
    'magic',
    'lock',
    'logout',
    'failed',
    'pending',
    'issues',
    'recheck',
    'check',
    'verify',
    'deliver',
    'fulfill',
    'send',
  ];

  // Admin trigger should ONLY activate if:
  // 1. Explicit command prefix / or ! (e.g. /admin, !admin, /stats, !stats, /revenue, /link, /lock)
  // 2. Message contains the secret admin PIN (e.g. '8426')
  // 3. User already has an authenticated active admin session and issues an explicit command
  const isCommandPrefixed = trimmed.startsWith('/') || trimmed.startsWith('!') || trimmed.startsWith('.');
  const isAdminTrigger =
    (isCommandPrefixed && (rawCmd === 'admin' || adminCmds.includes(rawCmd))) ||
    hasPinInText ||
    (hasActivePinSession && isCommandPrefixed && adminCmds.includes(rawCmd));

  if (!isAdminTrigger) return null;

  // Authenticate if owner, whitelisted, active session, OR if message contains the master PIN!
  let isAdminAuthenticated = isWhitelisted || hasActivePinSession || hasPinInText;

  if (hasPinInText && !hasActivePinSession) {
    await saveConversationState(metadata.step || 'IDLE', {
      isAdminAuthenticated: true,
      adminAuthExpiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });
    isAdminAuthenticated = true;
  }

  // Handle nested sub-commands like "admin stats", "admin revenue", "admin logs", "admin link"
  let cmd = rawCmd;
  let arg = rawArg;
  if (cmd === 'admin' && arg && adminCmds.includes(arg.toLowerCase())) {
    cmd = arg.toLowerCase();
    arg = '';
  }

  // If user entered admin command without authentication and without PIN
  if (!isAdminAuthenticated) {
    return (
      `🔐 *Akubrecah KRA — Admin Verification Required*\n\n` +
      `Your phone is not yet unlocked for admin operations.\n\n` +
      `To unlock, reply:\n` +
      `*!admin* followed by the master PIN\n\n` +
      `_(Master PIN is required — ask the system owner if you do not have it)_`
    );
  }

  // From here on, caller is fully authenticated!
  const appUrl = getPublicAppUrl();

  // 1. Lock command
  if (cmd === 'lock' || cmd === 'logout') {
    await saveConversationState(metadata.step || 'IDLE', {
      isAdminAuthenticated: false,
      adminAuthExpiry: 0,
    });
    return `🔒 *Admin Session Locked.*\nSend *!admin* plus your master PIN anytime to re-authenticate.`;
  }

  // 2. 1-Click Magic Link
  if (cmd === 'link' || cmd === 'magic' || cmd === 'web') {
    const magicToken = createAdminMagicToken(effectivePhone || BOT_NUMBER);
    const magicUrl = `${appUrl}/api/admin/magic-login?token=${magicToken}`;
    return (
      `👑 *1-Click Admin Web Access*\n\n` +
      `Tap the link below to open your Executive Admin Dashboard directly without entering any password:\n\n` +
      `👉 ${magicUrl}\n\n` +
      `⏳ _This cryptographically signed token is valid for 4 hours._`
    );
  }

  // 3. !stats
  if (cmd === 'stats' || cmd === 'kpi') {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let downloads: any[] = [];
    if (typeof db.certificateDownload?.findMany === 'function') {
      downloads = await db.certificateDownload.findMany({ take: 1000, orderBy: { createdAt: 'desc' } });
    }

    const totalRev = downloads.reduce((acc, c) => acc + (Number(c.amountCharged) || 0), 0);
    const todayRev = downloads
      .filter((d) => new Date(d.createdAt) >= startOfToday)
      .reduce((acc, c) => acc + (Number(c.amountCharged) || 0), 0);

    const waDownloads = downloads.filter((d) => d.clerkId?.startsWith('wa_')).length;

    let totalSessions = 0;
    let pcSessions = 0;
    if (typeof db.sessions?.findMany === 'function') {
      const s = await db.sessions.findMany({ take: 500 });
      totalSessions = s.length;
      pcSessions = s.filter((sess: any) => !sess.is_mobile).length;
    }
    const pcPct = totalSessions > 0 ? Math.round((pcSessions / totalSessions) * 100) : 65;
    const mobPct = 100 - pcPct;

    let botUsers = 0;
    if (typeof db.ai_conversations?.count === 'function') {
      botUsers = await db.ai_conversations.count({ where: { channel: 'whatsapp' } });
    }

    return (
      `📊 *AKUBRECAH KRA — LIVE EXECUTIVE STATS*\n\n` +
      `💰 *Total Revenue:* KES ${totalRev.toLocaleString()}\n` +
      `📈 *Today's Revenue:* KES ${todayRev.toLocaleString()}\n` +
      `📜 *Total Downloads:* ${downloads.length}\n` +
      `🤖 *WhatsApp Bot Downloads:* ${waDownloads} (${downloads.length > 0 ? Math.round((waDownloads / downloads.length) * 100) : 0}%)\n` +
      `💬 *WhatsApp Bot Users:* ${botUsers}\n` +
      `💻 *Web Traffic:* ${pcPct}% PC (Desktop) / ${mobPct}% Mobile\n\n` +
      `_Reply *!revenue* for financial details or *!link* for web dashboard._`
    );
  }

  // 4. !revenue
  if (cmd === 'revenue' || cmd === 'rev') {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let downloads: any[] = [];
    if (typeof db.certificateDownload?.findMany === 'function') {
      downloads = await db.certificateDownload.findMany({ take: 1000 });
    }

    const totalRev = downloads.reduce((acc, c) => acc + (Number(c.amountCharged) || 0), 0);
    const todayRev = downloads.filter((d) => new Date(d.createdAt) >= startOfToday).reduce((acc, c) => acc + (Number(c.amountCharged) || 0), 0);
    const sevenDayRev = downloads.filter((d) => new Date(d.createdAt) >= sevenDaysAgo).reduce((acc, c) => acc + (Number(c.amountCharged) || 0), 0);
    const thirtyDayRev = downloads.filter((d) => new Date(d.createdAt) >= thirtyDaysAgo).reduce((acc, c) => acc + (Number(c.amountCharged) || 0), 0);

    const mpesaRev = downloads.filter((d) => Boolean(d.mpesaReceipt)).reduce((acc, c) => acc + (Number(c.amountCharged) || 0), 0);
    const paystackRev = totalRev - mpesaRev;

    return (
      `💰 *REVENUE BREAKDOWN REPORT*\n\n` +
      `• *Total Lifetime:* KES ${totalRev.toLocaleString()}\n` +
      `• *Today:* KES ${todayRev.toLocaleString()}\n` +
      `• *Last 7 Days:* KES ${sevenDayRev.toLocaleString()}\n` +
      `• *Last 30 Days:* KES ${thirtyDayRev.toLocaleString()}\n\n` +
      `💳 *By Payment Gateway:*\n` +
      `• *M-Pesa STK:* KES ${mpesaRev.toLocaleString()} (${totalRev > 0 ? Math.round((mpesaRev / totalRev) * 100) : 0}%)\n` +
      `• *Paystack Card/Bank:* KES ${paystackRev.toLocaleString()} (${totalRev > 0 ? Math.round((paystackRev / totalRev) * 100) : 0}%)\n\n` +
      `_Reply *!logs* to view recent transaction receipts._`
    );
  }

  // 5. !logs
  if (cmd === 'logs' || cmd === 'transactions' || cmd === 'tx') {
    let recent: any[] = [];
    if (typeof db.certificateDownload?.findMany === 'function') {
      recent = await db.certificateDownload.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
    }

    if (recent.length === 0) {
      return `🧾 *TRANSACTION LOGS*\n\nNo certificate downloads or transactions recorded yet.`;
    }

    let report = `🧾 *LATEST 5 TRANSACTIONS*\n\n`;
    recent.forEach((item, index) => {
      const isWa = item.clerkId?.startsWith('wa_');
      const channel = isWa ? '🤖 WhatsApp' : '🌐 Web Portal';
      const receipt = item.mpesaReceipt || item.checkoutId || 'STK-VERIFIED';
      const timeStr = new Date(item.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

      report +=
        `*${index + 1}. PIN:* ${item.pin}\n` +
        `   • Amount: *KES ${item.amountCharged}.00*\n` +
        `   • Channel: ${channel}\n` +
        `   • Receipt: \`${receipt}\`\n` +
        `   • Time: ${timeStr}\n\n`;
    });

    report += `_Reply *!link* for full searchable transaction table on web._`;
    return report;
  }

  // 6. !bot
  if (cmd === 'bot' || cmd === 'whatsapp') {
    let totalBotUsers = 0;
    let totalConversations = 0;
    if (typeof db.ai_conversations?.findMany === 'function') {
      const chats = await db.ai_conversations.findMany({ where: { channel: 'whatsapp' } });
      totalConversations = chats.length;
      totalBotUsers = new Set(chats.map((c: any) => c.user_phone).filter(Boolean)).size;
    }

    let waDownloads = 0;
    let waRevenue = 0;
    if (typeof db.certificateDownload?.findMany === 'function') {
      const dl = await db.certificateDownload.findMany({ where: { clerkId: { startsWith: 'wa_' } } });
      waDownloads = dl.length;
      waRevenue = dl.reduce((acc: number, c: any) => acc + (Number(c.amountCharged) || 0), 0);
    }

    const conversionRate = totalBotUsers > 0 ? ((waDownloads / totalBotUsers) * 100).toFixed(1) : '0.0';

    return (
      `🤖 *WHATSAPP BOT ADOPTION & PERFORMANCE*\n\n` +
      `• *Unique Users:* ${totalBotUsers}\n` +
      `• *Total Conversations:* ${totalConversations}\n` +
      `• *Certificates Delivered via Bot:* ${waDownloads}\n` +
      `• *Bot Revenue Generated:* KES ${waRevenue.toLocaleString()}\n` +
      `• *Conversion Rate:* ${conversionRate}%\n\n` +
      `_Reply *!stats* for global metrics or *!logs* for recent receipts._`
    );
  }

  // 7. !failed or !pending or !issues
  if (cmd === 'failed' || cmd === 'pending' || cmd === 'issues') {
    let recentTx: any[] = [];
    try {
      const txRes = await getPaystackLiveTransactions(30, 1);
      if (txRes.success && Array.isArray(txRes.items)) {
        recentTx = txRes.items.filter((t: any) => t.status !== 'success').slice(0, 5);
      }
    } catch (err: any) {
      console.warn('[Admin !failed] Paystack live fetch notice:', err.message);
    }

    let awaitingConvs: any[] = [];
    try {
      const convs = await db.ai_conversations?.findMany({
        where: {
          channel: 'whatsapp',
          status: 'active',
        },
        orderBy: { updated_at: 'desc' },
        take: 10,
      });
      awaitingConvs = (convs || []).filter((c: any) => {
        const step = c.metadata?.step;
        return step === 'AWAITING_PAYMENT' || step === 'CYBER_AWAITING_PAYMENT';
      }).slice(0, 5);
    } catch (err: any) {
      console.warn('[Admin !failed] DB conversations lookup notice:', err.message);
    }

    let report = `⚠️ *DIAGNOSTIC: FAILED & PENDING SESSIONS*\n─────────────────────────\n`;

    if (awaitingConvs.length > 0) {
      report += `⏳ *ACTIVE SESSIONS AWAITING PAYMENT (${awaitingConvs.length}):*\n`;
      awaitingConvs.forEach((c: any, i: number) => {
        const m = c.metadata || {};
        const phone = c.user_phone;
        const payPhone = m.paymentPhone || phone;
        const pin = m.pin || 'Unknown PIN';
        const ref = m.checkoutId || 'None';
        const time = new Date(c.updated_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

        report +=
          `*${i + 1}. Phone:* \`${formatDisplayPhone(payPhone)}\`\n` +
          `   • PIN: \`${pin}\`\n` +
          `   • Ref: \`${ref}\`\n` +
          `   • Updated: ${time}\n` +
          `   • 👉 *!recheck ${payPhone}* or *!deliver ${payPhone}*\n\n`;
      });
    }

    if (recentTx.length > 0) {
      report += `❌ *RECENT GATEWAY FAILURES (${recentTx.length}):*\n`;
      recentTx.forEach((t: any, i: number) => {
        const phone = t.customerPhone || 'Unknown Phone';
        const pin = t.pin || 'KRA';
        const time = new Date(t.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

        report +=
          `*${i + 1}. Phone:* \`${formatDisplayPhone(phone)}\`\n` +
          `   • Amount: KES ${t.amountKes}.00\n` +
          `   • PIN: \`${pin}\`\n` +
          `   • Gateway Status: _${t.status}_\n` +
          `   • Ref: \`${t.reference}\`\n` +
          `   • Time: ${time}\n\n`;
      });
    }

    if (awaitingConvs.length === 0 && recentTx.length === 0) {
      report += `✅ All systems green! No pending sessions or gateway failures in the last 24 hours.\n\n`;
    }

    report += `─────────────────────────\n_Commands: *!recheck <phone/PIN>* | *!deliver <phone>*_`;
    return report;
  }

  // 8. !recheck <phone, PIN, or reference>
  if (cmd === 'recheck' || cmd === 'check' || cmd === 'verify') {
    const query = (arg || '').trim();
    if (!query) {
      return (
        `⚠️ *Please provide a target to recheck:*\n` +
        `• Example: *!recheck 0719299900*\n` +
        `• Example: *!recheck A016881319Q*\n` +
        `• Example: *!recheck PSTK-MPESA-...*`
      );
    }

    const cleanQuery = query.replace(/[^0-9a-zA-Z]/g, '');

    // 1. Search for successful payment on Paystack
    const payment = await findRecentSuccessfulPaystackPayment({
      phone: query,
      pin: query,
      reference: query,
      maxAgeMinutes: 180, // last 3 hours
      skipCache: true,
    });

    // 2. Lookup conversation in DB
    let conv: any = null;
    try {
      conv = await db.ai_conversations?.findFirst({
        where: {
          channel: 'whatsapp',
          OR: [
            { user_phone: { contains: cleanQuery } },
            { user_phone: query },
          ],
        },
        orderBy: { updated_at: 'desc' },
      });
    } catch {}

    if (payment.found && payment.reference) {
      const rawPin = payment.pin || conv?.metadata?.pin || 'KRA_CERT';
      const pin = /^[A-Z]\d{9}[A-Z]/i.test(rawPin)
        ? rawPin.match(/^[A-Z]\d{9}[A-Z]/i)![0].toUpperCase()
        : rawPin.split('-')[0].trim().toUpperCase();
      const phone = conv?.user_phone || payment.customerPhone || query;
      const name = conv?.metadata?.taxpayerName || 'Registered Taxpayer';

      // Auto-trigger delivery!
      try {
        const { fulfillWhatsAppCertificateDelivery } = await import('@/lib/certificate-fulfillment');
        await fulfillWhatsAppCertificateDelivery({
          phone,
          pin,
          checkoutId: payment.reference,
          mpesaReceipt: payment.reference,
          amount: payment.amountKes || 20,
          taxpayerName: name,
          skipDirectWhatsAppDocument: false,
        });

        if (conv) {
          const meta = conv.metadata || {};
          meta.step = 'COMPLETED';
          meta.activeSession = false;
          meta.mpesaReceipt = payment.reference;
          await db.ai_conversations.update({
            where: { id: conv.id },
            data: { metadata: meta },
          }).catch(() => {});
        }
      } catch (delErr: any) {
        console.error('[Admin !recheck] Delivery error:', delErr.message);
      }

      return (
        `✅ *PAYMENT CONFIRMED & AUTO-DELIVERED!*\n` +
        `─────────────────────────\n` +
        `• *Customer Handset:* \`${formatDisplayPhone(phone)}\`\n` +
        `• *Taxpayer:* *${name}*\n` +
        `• *KRA PIN:* \`${pin}\`\n` +
        `• *Amount Paid:* KES ${payment.amountKes || 20}.00\n` +
        `• *Receipt Reference:* \`${payment.reference}\`\n` +
        `• *Fulfillment Status:* 🟢 DELIVERED\n` +
        `─────────────────────────\n` +
        `📄 Certificate PDF and fiscal receipt have been generated and dispatched directly to the customer's WhatsApp chat.`
      );
    } else {
      // Fetch last attempt from Paystack
      let lastAttempt: any = null;
      try {
        const txList = await getPaystackLiveTransactions(30, 1);
        lastAttempt = (txList.items || []).find((t: any) => {
          const ph = String(t.customerPhone || '').replace(/[^0-9]/g, '');
          const cleanQ = query.replace(/[^0-9]/g, '');
          return (cleanQ && ph.includes(cleanQ)) || (t.reference && t.reference.includes(query)) || (t.pin && t.pin.includes(query.toUpperCase()));
        });
      } catch {}

      return (
        `⏳ *PAYMENT NOT VERIFIED FOR \`${query}\`*\n` +
        `─────────────────────────\n` +
        `• *Gateway Status:* ${lastAttempt ? `❌ ${lastAttempt.status}` : 'No matching payment record'}\n` +
        `• *Last Reference:* \`${lastAttempt?.reference || 'N/A'}\`\n` +
        `• *Time:* ${lastAttempt?.createdAt ? new Date(lastAttempt.createdAt).toLocaleTimeString('en-KE') : 'N/A'}\n` +
        `─────────────────────────\n` +
        `👉 If client claims they paid, reply *!deliver ${query}* to force-fulfill.`
      );
    }
  }

  // 9. !deliver <phone or PIN>
  if (cmd === 'deliver' || cmd === 'fulfill' || cmd === 'send') {
    const target = (arg || '').trim();
    if (!target) {
      return (
        `⚠️ *Please specify phone or PIN to deliver to:*\n` +
        `• Example: *!deliver 0719299900*\n` +
        `• Example: *!deliver A016881319Q*`
      );
    }

    const cleanTarget = target.replace(/[^0-9]/g, '');
    let conv: any = null;
    try {
      conv = await db.ai_conversations?.findFirst({
        where: {
          channel: 'whatsapp',
          OR: [
            { user_phone: { contains: cleanTarget } },
            { user_phone: target },
          ],
        },
        orderBy: { updated_at: 'desc' },
      });
    } catch {}

    const isPinArg = /^[A-Z]\d{9}[A-Z]$/i.test(target);
    const pin = conv?.metadata?.pin || (isPinArg ? target.toUpperCase() : null);
    const phone = conv?.user_phone || target;
    const name = conv?.metadata?.taxpayerName || 'Registered Taxpayer';

    if (!pin) {
      return `⚠️ Could not resolve KRA PIN for *${target}*. Please ensure the customer has initiated a lookup or specify their PIN.`;
    }

    const manualReceipt = `ADMIN-MANUAL-${Date.now().toString(36).toUpperCase()}`;
    try {
      const { fulfillWhatsAppCertificateDelivery } = await import('@/lib/certificate-fulfillment');
      await fulfillWhatsAppCertificateDelivery({
        phone,
        pin,
        checkoutId: manualReceipt,
        mpesaReceipt: manualReceipt,
        amount: 20,
        taxpayerName: name,
        taxpayerDetails: conv?.metadata?.taxpayerDetails,
        skipDirectWhatsAppDocument: false,
      });

      if (conv) {
        const meta = conv.metadata || {};
        meta.step = 'COMPLETED';
        meta.activeSession = false;
        meta.mpesaReceipt = manualReceipt;
        await db.ai_conversations.update({
          where: { id: conv.id },
          data: { metadata: meta },
        }).catch(() => {});
      }

      return (
        `🚀 *MANUAL DELIVERY EXECUTED!*\n` +
        `─────────────────────────\n` +
        `• *Recipient:* \`${formatDisplayPhone(phone)}\`\n` +
        `• *KRA PIN:* \`${pin}\`\n` +
        `• *Taxpayer:* *${name}*\n` +
        `• *Manual Ref:* \`${manualReceipt}\`\n` +
        `─────────────────────────\n` +
        `📄 Official KRA PIN Certificate and fiscal receipt have been generated and dispatched directly to the customer's WhatsApp chat.`
      );
    } catch (err: any) {
      return `❌ *Delivery failed:* ${err.message}`;
    }
  }

  // 10. Menu / Help / Default
  return (
    `👑 *AKUBRECAH KRA — ADMIN COMMAND CENTER*\n\n` +
    `• *!stats* — Real-time Executive KPIs (Revenue, Users, PC vs Mobile)\n` +
    `• *!revenue* — Revenue Breakdown (Today, 7d, Gateways)\n` +
    `• *!logs* — Last 5 Transactions & Receipts\n` +
    `• *!failed* — View Failed/Pending Client Sessions & Gateway Errors\n` +
    `• *!recheck <target>* — Verify Client Payment & Auto-Deliver\n` +
    `• *!deliver <phone>* — Force-Deliver KRA Certificate to Client\n` +
    `• *!bot* — WhatsApp Bot Adoption & Stats\n` +
    `• *!link* — 1-Click Web Dashboard Login Link\n` +
    `• *!lock* — Lock session\n\n` +
    `_Reply with any command (e.g. *!failed* or *!recheck 0719299900*) to run immediately._`
  );
}

/**
 * Handles taxpayer fulfillment:
 * If caller is an active Cyber Cafe subscriber, delivers certificate instantly with zero payment prompt!
 * Otherwise, triggers the standard KES 20 M-Pesa STK push.
 */
async function handleTaxpayerFoundFulfillment({
  userPhone,
  taxpayer,
  idOrPinInput,
  saveConversationState,
}: {
  userPhone: string;
  taxpayer: any;
  idOrPinInput: string;
  saveConversationState: (step: string, extra?: Record<string, any>) => Promise<string | void>;
}): Promise<string> {
  const cleanPin = taxpayer.pin ? taxpayer.pin.toUpperCase().trim() : '';
  const masked = maskTaxpayerData(taxpayer);

  // 1. Check if user belongs to an active Cyber Cafe subscription
  const cyberStatus = await getCyberCafeStatus(userPhone);

  if (cyberStatus.isActive && cyberStatus.cafe) {
    if (cyberStatus.dailyQuotaExceeded) {
      await saveConversationState('IDLE', { activeSession: false });
      return (
        `⚠️ *Daily Fair-Use Limit Reached (100/100)*\n\n` +
        `Your cyber cafe (*${cyberStatus.cafe.cafeName}*) has reached today's limit of 100 certificate downloads. It automatically resets at midnight.\n\n` +
        `_Days remaining on package: ${cyberStatus.daysRemaining} days_`
      );
    }

    // Fulfill instantly without payment prompt!
    await incrementCyberCafeDownloadCount(cyberStatus.cafe.id);
    const { fulfillWhatsAppCertificateDelivery } = await import('@/lib/certificate-fulfillment');
    await fulfillWhatsAppCertificateDelivery({
      phone: userPhone,
      pin: cleanPin,
      checkoutId: `CYBER_${Date.now()}`,
      mpesaReceipt: 'CYBER_SUB_ACTIVE',
      amount: 0,
      taxpayerName: taxpayer.taxpayerName,
      taxpayerDetails: taxpayer,
      isCyberSubscription: true,
      daysRemaining: cyberStatus.daysRemaining,
    });

    await saveConversationState('IDLE', {
      activeSession: false,
      lastPin: cleanPin,
      pin: null,
      taxpayerDetails: null,
    });

    return '';
  }

  // 2. Regular pay-per-download flow (KES 20 STK push)
  const downloadFee = Number(process.env.PAYSTACK_DOWNLOAD_FEE_KES || 20);

  // Check if client already paid (e.g. recent approved payment or retry)
  try {
    const { findRecentSuccessfulPaystackPayment } = await import('@/lib/paystack');
    const existingPayment = await findRecentSuccessfulPaystackPayment({
      phone: userPhone,
      pin: cleanPin,
      maxAgeMinutes: 90,
      skipCache: true,
    });

    if (existingPayment.found && existingPayment.reference) {
      const { fulfillWhatsAppCertificateDelivery } = await import('@/lib/certificate-fulfillment');
      await fulfillWhatsAppCertificateDelivery({
        phone: userPhone,
        pin: cleanPin,
        checkoutId: existingPayment.reference,
        mpesaReceipt: existingPayment.reference,
        amount: existingPayment.amountKes || downloadFee,
        taxpayerName: taxpayer.taxpayerName,
        taxpayerDetails: taxpayer,
        skipDirectWhatsAppDocument: false,
      });

      await saveConversationState('COMPLETED', {
        activeSession: false,
        mpesaReceipt: existingPayment.reference,
      });

      return (
        `✅ *PAYMENT CONFIRMED & CERTIFICATE DELIVERED!* 🎉\n` +
        `─────────────────────────\n` +
        `👤 *Taxpayer:* *${masked.taxpayerName}*\n` +
        `🆔 *KRA PIN:* \`${masked.pin}\`\n` +
        `🧾 *Receipt / Ref:* \`${existingPayment.reference}\`\n` +
        `💰 *Amount Paid:* KES ${(existingPayment.amountKes || downloadFee).toFixed(2)}\n\n` +
        `📄 Official KRA PIN Certificate and fiscal receipt have been generated and sent above!\n\n` +
        `🌐 *Web Portal:* https://kra.akubrecah.com`
      );
    }
  } catch (err: any) {
    console.warn('[Fulfillment Existing Payment Check Notice]:', err.message);
  }

  const stkRes = await triggerInAppMpesaPayment({
    targetPhone: userPhone,
    whatsappUserPhone: userPhone,
    pin: cleanPin,
    amount: downloadFee,
    taxpayerName: taxpayer.taxpayerName,
  });

  await saveConversationState('AWAITING_PAYMENT', {
    activeSession: true,
    pin: cleanPin,
    idNumber: taxpayer.idNumber || idOrPinInput,
    taxpayerName: taxpayer.taxpayerName,
    checkoutId: stkRes.checkoutRequestId || '',
    paymentPhone: stkRes.normalizedPhone,
    stkGateway: stkRes.gateway,
    taxpayerDetails: taxpayer,
    pushedAt: Date.now(),
  });

  if (stkRes.success) {
    return (
      `🇰🇪 *TAX COMPLIANCE RECORD FOUND*\n` +
      `─────────────────────────\n` +
      `👤 *Taxpayer:* *${masked.taxpayerName}*\n` +
      `🆔 *KRA PIN:* \`${masked.pin}\`\n` +
      `💰 *Certificate Fee:* KES ${downloadFee}.00\n` +
      `─────────────────────────\n` +
      `📲 *M-PESA PAYMENT PROMPT SENT*\n` +
      `A prompt for *KES ${downloadFee}.00* has been sent to \`${stkRes.normalizedPhone}\`.\n` +
      `👉 *Enter your M-Pesa PIN* on your phone to complete retrieval.\n\n` +
      `Your official KRA PIN Certificate and ETR Tax Receipt will be delivered right here.\n\n` +
      `🌐 *Web Portal:* https://kra.akubrecah.com\n` +
      `─────────────────────────\n` +
      `_Reply 1 to resend prompt | Send another number | Reply 0 to cancel_`
    );
  } else {
    return (
      `🇰🇪 *TAX COMPLIANCE RECORD FOUND*\n` +
      `─────────────────────────\n` +
      `👤 *Taxpayer:* *${masked.taxpayerName}*\n` +
      `🆔 *KRA PIN:* \`${masked.pin}\`\n` +
      `💰 *Certificate Fee:* KES ${downloadFee}.00\n` +
      `─────────────────────────\n` +
      `⚠️ *Could not send M-Pesa prompt:* ${stkRes.error || 'Network error'}.\n\n` +
      `👉 Send another Safaricom phone number (e.g. *0712345678*) or reply *0* to cancel.\n\n` +
      `🌐 Prefer web download? Visit:\n` +
      `🔗 https://kra.akubrecah.com`
    );
  }
}

export async function handleWhatsAppChat(params: {
  phone: string;
  message: string;
  messageId?: string;
  sendDirect?: boolean;
  authorPhone?: string;
  isFromBotOwner?: boolean;
}) {
  const { phone: rawPhone, message: rawMessage, messageId, sendDirect = true, authorPhone, isFromBotOwner } = params;

  if (!rawPhone || !rawMessage) {
    return { success: false, error: 'Both phone and message are required.' };
  }

  try {
    const userPhone = sanitizeWhatsAppPhone(rawPhone);
    const incomingText = String(rawMessage).trim();
    const lowerText = incomingText.toLowerCase();
    const db = prisma as any;

    // Deduplication check: If this exact message ID was already processed, ignore to prevent duplicate responses
    if (messageId && isDuplicateWhatsAppMessage(messageId)) {
      console.log(`[WhatsApp Chat] Duplicate message ${messageId} from ${userPhone} ignored.`);
      return {
        success: true,
        userPhone,
        step: 'DUPLICATE',
        reply: '',
        isDuplicate: true,
      };
    }

    // 1. Fetch or initialize conversation state in Prisma
    let conversation = await db.ai_conversations?.findFirst({
      where: {
        channel: 'whatsapp',
        user_phone: userPhone,
        status: 'active',
      },
    });

    if (!conversation) {
      const convId = 'wa_' + userPhone + '_' + Date.now();
      conversation = await db.ai_conversations?.create({
        data: {
          id: convId,
          channel: 'whatsapp',
          user_phone: userPhone,
          status: 'active',
          metadata: { step: 'IDLE' },
        },
      });
    }

    const metadata: Record<string, any> = (conversation.metadata as Record<string, any>) || { step: 'IDLE' };
    let replyText = '';
    let nextStep = metadata.step || 'IDLE';

    async function saveConversationState(newStep: string, extraMeta: Record<string, any> = {}) {
      metadata.step = newStep;
      metadata.lastActiveAt = Date.now();
      metadata.activeSession = newStep !== 'IDLE' && newStep !== 'COMPLETED';
      Object.assign(metadata, extraMeta);

      await db.ai_conversations?.update({
        where: { id: conversation.id },
        data: {
          metadata,
          updated_at: new Date(),
        },
      });
      nextStep = newStep;
    }

    const lastActiveAt = Number(metadata.lastActiveAt || (conversation.updated_at ? new Date(conversation.updated_at).getTime() : 0));
    const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // Strict 5-minute inactivity timeout (TTL)
    const isSessionExpired = lastActiveAt > 0 && (Date.now() - lastActiveAt) >= SESSION_TIMEOUT_MS;

    let currentStep = metadata.step || 'IDLE';
    const wasSessionActive = Boolean(metadata.activeSession) && currentStep !== 'IDLE' && currentStep !== 'COMPLETED';
    let isSessionActive = wasSessionActive;

    if (isSessionExpired && wasSessionActive) {
      currentStep = 'IDLE';
      isSessionActive = false;
      await saveConversationState('IDLE', {
        activeSession: false,
        pin: null,
        idNumber: null,
        taxpayerDetails: null,
        paymentPhone: null,
        suggestedPhone: null,
        checkoutId: null,
        mpesaReceipt: null,
      });
    }

    const trimmedInput = incomingText.trim();
    const hasCommandPrefix = trimmedInput.startsWith('/') || trimmedInput.startsWith('!') || trimmedInput.startsWith('.');
    let cleanCmdText = trimmedInput.replace(/^[!\/.]/, '').trim().toLowerCase();
    let cleanCmdWord = cleanCmdText.split(/\s+/)[0] || '';
    let cleanCmdArgs = trimmedInput.trim().includes(' ')
      ? trimmedInput.trim().substring(trimmedInput.trim().indexOf(' ') + 1).trim()
      : '';

    const ALLOWLISTED_SLASH_COMMANDS = new Set([
      'kra',
      'cyber',
      'status',
      'days',
      'sub',
      'help',
      'menu',
      'start',
      'admin',
      'cancel',
      'reset',
      'stop',
      'exit',
      'abort',
      'stats',
      'revenue',
      'logs',
      'link',
      'lock',
      'logout',
      'recheck',
      'verify',
      'paid',
      '0',
    ]);

    // If session just expired and user sent a follow-up answer (not a fresh command), inform them of expiry
    if (isSessionExpired && wasSessionActive && !hasCommandPrefix) {
      const expiredReply =
        `⏱️ *Session Expired*\n` +
        `─────────────────────────\n` +
        `Your previous session timed out after 5 minutes of inactivity for your privacy.\n\n` +
        `To start again, please send a supported command:\n` +
        `• */kra* - KRA PIN retrieval & certificate\n` +
        `• */cyber* - Cyber Cafe monthly subscription (KES 500)\n` +
        `• */status* - Check subscription status\n` +
        `• */help* - View all commands\n\n` +
        `🌐 *Web Portal:* https://kra.akubrecah.com`;

      let sendResult = null;
      if (sendDirect) {
        sendResult = await sendEvolutionTextMessage(userPhone, expiredReply);
      }
      return {
        success: true,
        userPhone,
        step: 'IDLE',
        reply: expiredReply,
        metadata,
        sendResult,
      };
    }

    // Reject unknown slash commands with a safe help message instead of falling into workflows
    if (hasCommandPrefix && !ALLOWLISTED_SLASH_COMMANDS.has(cleanCmdWord)) {
      const unknownCmdReply =
        `❓ *Unknown Command*\n` +
        `─────────────────────────\n` +
        `The command \`${trimmedInput.split(/\s+/)[0]}\` is not recognized.\n\n` +
        `*Supported Commands:*\n` +
        `• */kra* - KRA PIN retrieval & certificate\n` +
        `• */cyber* - Cyber Cafe monthly subscription (KES 500)\n` +
        `• */status* - Check subscription status\n` +
        `• */help* - Instructions & support\n` +
        `• */cancel* - Cancel active session\n\n` +
        `🌐 *Web Portal:* https://kra.akubrecah.com`;

      let sendResult = null;
      if (sendDirect) {
        sendResult = await sendEvolutionTextMessage(userPhone, unknownCmdReply);
      }
      return {
        success: true,
        userPhone,
        step: metadata.step || 'IDLE',
        reply: unknownCmdReply,
        metadata,
        sendResult,
      };
    }

    // STRICT TRIGGER RULE:
    // If not in an active session and no valid command prefix was provided:
    // Completely ignore random, casual messages (e.g. "kra", "admin", "hello", "good morning")
    if (!isSessionActive && !hasCommandPrefix) {
      return {
        success: true,
        userPhone,
        step: 'IDLE',
        reply: '',
        shouldReply: false,
        metadata,
        sendResult: null,
      };
    }

    // 0. Check for Admin Bot Commands (/admin, !admin, /stats, /revenue, /logs, /link, /lock, /logout)
    const adminReply = await handleAdminBotCommand({
      incomingText,
      userPhone,
      metadata,
      saveConversationState,
      db,
      authorPhone,
      isFromBotOwner,
    });

    if (adminReply) {
      let sendResult = null;
      if (sendDirect) {
        sendResult = await sendEvolutionTextMessage(userPhone, adminReply);
      }
      return {
        success: true,
        userPhone,
        step: metadata.step || 'IDLE',
        reply: adminReply,
        metadata,
        sendResult,
      };
    }

    const isBotTrigger = hasCommandPrefix;

    // Universal Cancellation: cancel, .cancel, /cancel, exit, .exit, /exit, stop, reset, 0
    const isCancelRequest =
      ['cancel', 'exit', 'stop', 'reset', 'abort', '0'].includes(cleanCmdWord) ||
      ['cancel', 'exit', 'stop', 'reset', 'abort', '0'].includes(lowerText);

    if (isCancelRequest) {
      await saveConversationState('IDLE', {
        activeSession: false,
        pin: null,
        idNumber: null,
        taxpayerDetails: null,
        paymentPhone: null,
        suggestedPhone: null,
        checkoutId: null,
      });

      const cancelReply =
        `✅ *Session Cancelled*\n` +
        `─────────────────────────\n` +
        `The KRA assistant is now idle.\n\n` +
        `Send *.kra* or */kra* whenever you want to start again.\n` +
        `🌐 *Web Portal:* https://kra.akubrecah.com`;
      let sendResult = null;
      if (sendDirect) {
        sendResult = await sendEvolutionTextMessage(userPhone, cancelReply);
      }
      return {
        success: true,
        userPhone,
        step: 'IDLE',
        reply: cancelReply,
        metadata,
        sendResult,
      };
    }

    // Universal Payment Recheck Trigger: "paid", "nimepay", "confirm", "recheck", or pasting M-Pesa receipt / Paystack ref
    const isPaymentRecheckTrigger =
      ['paid', 'nimepay', 'nimelipa', 'confirm', 'recheck', 'verify', 'payment', 'lipa', 'done'].includes(cleanCmdWord) ||
      ['paid', 'nimepay', 'nimelipa', 'confirm', 'recheck', 'verify', 'payment', 'lipa', 'done'].includes(lowerText) ||
      lowerText.startsWith('paid') ||
      lowerText.startsWith('nimepay') ||
      lowerText.startsWith('recheck') ||
      cleanCmdText.startsWith('paid') ||
      cleanCmdText.startsWith('recheck') ||
      /^PSTK-[A-Z0-9\-]+$/i.test(trimmedInput) ||
      /^[A-Z0-9]{10}$/.test(trimmedInput);

    if (isPaymentRecheckTrigger && currentStep !== 'AWAITING_PAYMENT' && currentStep !== 'CYBER_AWAITING_PAYMENT') {
      const targetArg = cleanCmdArgs || trimmedInput.split(/\s+/).slice(1).join(' ').trim();
      const extractedPhone = extractKenyanPhone(targetArg);
      const queryPhone = extractedPhone || metadata.paymentPhone || userPhone;

      const isPinArg = /^[A-Z]\d{9}[A-Z]$/i.test(targetArg);
      const isRefArg = targetArg.startsWith('PSTK-') || /^[A-Z0-9]{10}$/.test(targetArg);
      const queryPin = (isPinArg ? targetArg.toUpperCase() : null) || metadata.pin;
      const queryRef = (isRefArg ? targetArg : null) || metadata.checkoutId;

      const { findRecentSuccessfulPaystackPayment } = await import('@/lib/paystack');
      const payment = await findRecentSuccessfulPaystackPayment({
        phone: queryPhone,
        pin: queryPin,
        reference: queryRef,
        maxAgeMinutes: 180,
        skipCache: true,
      });

      // Also check DB for recent download record or pin lookup
      let dlRecord: any = null;
      try {
        if (typeof db.certificateDownload?.findFirst === 'function') {
          dlRecord = await db.certificateDownload.findFirst({
            where: {
              OR: [
                ...(payment.reference ? [{ mpesaReceipt: payment.reference }, { checkoutId: payment.reference }] : []),
                { clerkId: `wa_${userPhone.replace(/[^a-zA-Z0-9]/g, '')}` },
              ],
            },
            orderBy: { createdAt: 'desc' },
          });
        }
      } catch (err: any) {
        console.warn('[Payment Recheck Trigger] DB lookup notice:', err.message);
      }

      if (payment.found && payment.reference) {
        const rawPin = payment.pin || queryPin || dlRecord?.pin || metadata.pin;
        const resolvedPin = rawPin
          ? (/^[A-Z]\d{9}[A-Z]/i.test(rawPin)
              ? rawPin.match(/^[A-Z]\d{9}[A-Z]/i)![0].toUpperCase()
              : rawPin.split('-')[0].trim().toUpperCase())
          : null;
        const resolvedFee = payment.amountKes || 20;

        if (resolvedPin) {
          const { fulfillWhatsAppCertificateDelivery } = await import('@/lib/certificate-fulfillment');
          await fulfillWhatsAppCertificateDelivery({
            phone: userPhone,
            pin: resolvedPin,
            checkoutId: payment.reference,
            mpesaReceipt: payment.reference,
            amount: resolvedFee,
            taxpayerName: metadata.taxpayerName,
            taxpayerDetails: metadata.taxpayerDetails,
            skipDirectWhatsAppDocument: false,
          });

          await saveConversationState('COMPLETED', {
            activeSession: false,
            mpesaReceipt: payment.reference,
          });

          const successReply =
            `✅ *PAYMENT CONFIRMED & DELIVERED!* 🎉\n` +
            `─────────────────────────\n` +
            `• *Receipt / Ref:* \`${payment.reference}\`\n` +
            `• *KRA PIN:* \`${resolvedPin}\`\n` +
            `• *Amount Paid:* KES ${resolvedFee}.00\n\n` +
            `📄 Official KRA PIN Certificate and fiscal receipt have been generated and dispatched above!\n\n` +
            `🌐 *Self-Service Web Portal:* https://kra.akubrecah.com`;

          let sendRes = null;
          if (sendDirect) {
            sendRes = await sendEvolutionTextMessage(userPhone, successReply);
          }
          return {
            success: true,
            userPhone,
            step: 'COMPLETED',
            reply: successReply,
            metadata,
            sendResult: sendRes,
          };
        } else {
          // Payment found but we don't know which PIN they want yet!
          await saveConversationState('AWAITING_INPUT', {
            activeSession: true,
            isPrepaid: true,
            checkoutId: payment.reference,
            mpesaReceipt: payment.reference,
          });

          const needPinReply =
            `✅ *Payment Confirmed!* (Ref: \`${payment.reference}\`)\n` +
            `─────────────────────────\n` +
            `We verified your payment of *KES ${resolvedFee}.00*.\n\n` +
            `👉 Reply with your *National ID Number* or *KRA PIN* (e.g. *A012345678Z*) to generate and download your certificate immediately!`;

          let sendRes = null;
          if (sendDirect) {
            sendRes = await sendEvolutionTextMessage(userPhone, needPinReply);
          }
          return {
            success: true,
            userPhone,
            step: 'AWAITING_INPUT',
            reply: needPinReply,
            metadata,
            sendResult: sendRes,
          };
        }
      } else {
        const notFoundReply =
          `⏳ *No Approved Payment Found Yet*\n` +
          `─────────────────────────\n` +
          `We checked recent payments for \`${formatDisplayPhone(queryPhone)}\`, but did not find an approved transaction in the last 2 hours.\n\n` +
          `• *Just paid on your phone?* Wait 5–10 seconds and reply *PAID* again.\n` +
          `• *Paid with another number?* Reply *PAID <phone>* (e.g. *PAID 0712345678*).\n` +
          `• *Need to start a new lookup?* Send *.kra <ID or PIN>* to begin.\n\n` +
          `🌐 *Self-Service Web Portal:* https://kra.akubrecah.com`;

        let sendRes = null;
        if (sendDirect) {
          sendRes = await sendEvolutionTextMessage(userPhone, notFoundReply);
        }
        return {
          success: true,
          userPhone,
          step: metadata.step || 'IDLE',
          reply: notFoundReply,
          metadata,
          sendResult: sendRes,
        };
      }
    }

    // If NO trigger prefix (not starting with '.' or '/') AND NO active session:
    // Do not trigger or spam casual conversations!
    if (!isBotTrigger && !isSessionActive) {
      return {
        success: true,
        userPhone,
        step: 'IDLE',
        reply: '',
        shouldReply: false,
        metadata,
        sendResult: null,
      };
    }

    // 3. Process Bot Commands (when triggered with '.' or '/')
    if (isBotTrigger) {
      const cmdWord = cleanCmdWord;
      const cmdArgs = cleanCmdArgs;

      // A. Cancellation / Exit / Reset (handled by universal cancel above, safety fallback)
      if (['cancel', 'exit', 'stop', 'reset'].includes(cmdWord)) {
        await saveConversationState('IDLE', {
          activeSession: false,
          pin: null,
          idNumber: null,
          taxpayerDetails: null,
          paymentPhone: null,
          suggestedPhone: null,
        });

        replyText =
          `✅ *Session Cancelled*\n` +
          `─────────────────────────\n` +
          `The KRA bot is now idle.\n\n` +
          `Send *.kra* or */kra* anytime you want to start again.\n` +
          `🌐 *Web Portal:* https://kra.akubrecah.com`;
      }
      // B. Cyber Cafe Subscription / Registration: .cyber, /cyber, .subscribe, /subscribe
      else if (['cyber', 'subscribe', 'package'].includes(cmdWord)) {
        const cyberCheck = await getCyberCafeStatus(userPhone);

        if (cyberCheck.isActive && cyberCheck.cafe) {
          replyText =
            `🏢 *${cyberCheck.cafe.cafeName}* — 🟢 ACTIVE\n` +
            `• ${cyberCheck.daysRemaining} days left | Today: ${cyberCheck.cafe.dailyDownloads}/100 lookups\n` +
            `_Send National ID or PIN for instant certificate._`;
        } else {
          await saveConversationState('CYBER_REG_NAME', {
            activeSession: true,
            cyberCafeName: null,
            cyberOwnerName: null,
            cyberWaPhone: null,
            cyberPaymentPhone: null,
          });

          replyText =
            `🏢 *Cyber Cafe Package (KES 500/Month)*\n` +
            `Step 1/4: What is your *Cyber Cafe Business Name*?\n` +
            `_(Reply 0 to cancel)_`;
        }
      }
      // C. Status & Days Remaining: /status, /days, /sub
      else if (['status', 'days', 'sub'].includes(cmdWord)) {
        const cyberCheck = await getCyberCafeStatus(userPhone);

        if (cyberCheck.isActive && cyberCheck.cafe) {
          replyText =
            `🏢 *${cyberCheck.cafe.cafeName}* — 🟢 ACTIVE\n` +
            `• ${cyberCheck.daysRemaining} days left | Today: ${cyberCheck.cafe.dailyDownloads}/100 lookups\n` +
            `_Send National ID or PIN for instant certificate._`;
        } else if (cyberCheck.isRegistered && cyberCheck.cafe) {
          replyText =
            `⚠️ *Cyber Cafe Expired (${cyberCheck.cafe.cafeName})*\n` +
            `Reply *RENEW* to reactivate 30 days unlimited for KES 500.`;
        } else {
          replyText =
            `ℹ️ No active Cyber Cafe subscription.\n` +
            `Send */cyber* to register for KES 500/Month unlimited package.`;
        }
      }
      // D. Send Latest Tax Invoice PDF: /invoice
      else if (['invoice', 'invoices', 'receipt'].includes(cmdWord)) {
        const cyberCheck = await getCyberCafeStatus(userPhone);

        if (cyberCheck.isRegistered && cyberCheck.cafe) {
          const latestInv = await db.cyberInvoice?.findFirst({
            where: { cyberCafeId: cyberCheck.cafe.id },
            orderBy: { createdAt: 'desc' },
          });

          if (latestInv) {
            const pdfBuf = await generateCyberInvoicePdfBuffer({
              invoiceNumber: latestInv.invoiceNumber,
              cafeName: cyberCheck.cafe.cafeName,
              ownerName: cyberCheck.cafe.ownerName,
              whatsappPhone: cyberCheck.cafe.whatsappPhone,
              paymentPhone: cyberCheck.cafe.paymentPhone,
              amount: latestInv.amount,
              mpesaReceipt: latestInv.mpesaReceipt || 'MPESA-PAID',
              periodStart: latestInv.periodStart,
              periodEnd: latestInv.periodEnd,
            });

            await sendEvolutionDocument({
              phone: userPhone,
              pdfBuffer: pdfBuf,
              fileName: `Tax_Invoice_${latestInv.invoiceNumber}.pdf`,
              caption: `🧾 *Official Fiscal Tax Invoice (${latestInv.invoiceNumber})*\n• Cyber Cafe: *${cyberCheck.cafe.cafeName}*\n• Amount: *KES ${Number(latestInv.amount).toFixed(2)}*\n• Days Remaining: *${cyberCheck.daysRemaining} Days*`,
            });

            replyText =
              `🧾 *Official Tax Invoice Delivered Above!*\n\n` +
              `• *Invoice No:* ${latestInv.invoiceNumber}\n` +
              `• *Cyber Cafe:* ${cyberCheck.cafe.cafeName}\n` +
              `• *Amount Paid:* KES ${Number(latestInv.amount).toFixed(2)}\n` +
              `• *Days Remaining:* ⚡ *${cyberCheck.daysRemaining} Days*\n\n` +
              `_The PDF document is attached above for your business accounting and tax records._`;
          } else {
            replyText = `⚠️ No invoice records found for ${cyberCheck.cafe.cafeName}. Send */cyber* to renew your subscription.`;
          }
        } else {
          replyText = `ℹ️ You are not registered under a Cyber Cafe package yet. Send */cyber* to subscribe for KES 500/Month.`;
        }
      }
      // E. Early Renewal: renew / /renew
      else if (cmdWord === 'renew') {
        const cyberCheck = await getCyberCafeStatus(userPhone);

        if (cyberCheck.isRegistered && cyberCheck.cafe) {
          const stkRes = await triggerCyberCafePayment({
            targetPhone: cyberCheck.cafe.paymentPhone,
            whatsappUserPhone: userPhone,
            cafeName: cyberCheck.cafe.cafeName,
            ownerName: cyberCheck.cafe.ownerName,
          });

          await saveConversationState('CYBER_AWAITING_PAYMENT', {
            activeSession: true,
            checkoutId: stkRes.checkoutRequestId || '',
            paymentPhone: stkRes.normalizedPhone,
            cyberCafeName: cyberCheck.cafe.cafeName,
            cyberOwnerName: cyberCheck.cafe.ownerName,
            cyberWaPhone: cyberCheck.cafe.whatsappPhone,
            isRenewal: true,
            pushedAt: Date.now(),
          });

          if (stkRes.success) {
            replyText =
              `📲 *M-PESA RENEWAL PROMPT SENT (KES 500.00)*\n` +
              `─────────────────────────────────────────\n` +
              `• *Cyber Cafe:* ${cyberCheck.cafe.cafeName}\n` +
              `• *Payment Handset:* \`${stkRes.normalizedPhone}\`\n` +
              `• *Stacking Renewal:* +30 Days will be added to your expiry date!\n` +
              `• *Current Remaining:* ${cyberCheck.daysRemaining} Days\n\n` +
              `👉 Enter your M-Pesa PIN on that handset to complete renewal.\n\n` +
              `_Options:_\n` +
              `• Didn't see prompt? Reply *1* or *RESEND*\n` +
              `• Different number? Send your Safaricom number (e.g. *0712345678*)\n` +
              `• Reply *0* to cancel`;
          } else {
            replyText =
              `⚠️ *Could not send renewal prompt:* ${stkRes.error || 'Network error'}.\n\n` +
              `👉 Send another Safaricom phone number (e.g. *0712345678*) or reply *0* to cancel.`;
          }
        } else {
          await saveConversationState('CYBER_REG_NAME', {
            activeSession: true,
            cyberCafeName: null,
            cyberOwnerName: null,
            cyberWaPhone: null,
            cyberPaymentPhone: null,
          });

          replyText =
            `🏢 *CYBER CAFE SUBSCRIPTION (KES 500 / Month)*\n\n` +
            `👉 *Step 1 of 4:* What is your *Cyber Cafe Business Name*? (e.g. *Apex Cyber Services*)\n\n` +
            `_(Reply 0 to cancel)_`;
        }
      }
      // F. Menu or Direct Lookup: /kra, /menu, /start, /help, /pin
      else if (['kra', 'menu', 'start', 'help', 'pin'].includes(cmdWord)) {
        // Direct search: /kra <ID_OR_PIN> or /pin <ID_OR_PIN>
        if (cmdArgs) {
          const cleanArg = cmdArgs.replace(/^(id|national\s*id|pin|kra\s*pin)[\s:]+/i, '').replace(/\s+/g, '').trim();
          const isPin = /^[A-Za-z]\d{9}[A-Za-z]$/.test(cleanArg);
          const isId = /^\d{5,12}$/.test(cleanArg);

          if (!isPin && !isId) {
            await saveConversationState('AWAITING_INPUT', { activeSession: true });
            replyText =
              `⚠️ *Invalid Identification Format*\n` +
              `─────────────────────────\n` +
              `Please send a valid Kenyan ID or KRA PIN:\n` +
              `• *National ID Number* (6 to 9 digits, e.g. *28374619*)\n` +
              `• *KRA PIN* (Format: Letter + 9 digits + Letter, e.g. *A012345678Z*)\n\n` +
              `🌐 *Self-Service Web Portal:*\n` +
              `🔗 https://kra.akubrecah.com\n` +
              `─────────────────────────\n` +
              `_(Reply *0* to cancel)_`;
          } else {
            let taxpayer: any = null;
            try {
              if (isPin) {
                taxpayer = await fetchTaxpayerByPin(cleanArg.toUpperCase());
              } else {
                taxpayer = await fetchTaxpayerById(cleanArg);
              }
            } catch (kraError: any) {
              console.warn('[WhatsApp KRA Direct Lookup Notice]:', kraError.message);
            }

            if (!taxpayer || !taxpayer.taxpayerName) {
              await saveConversationState('AWAITING_INPUT', { activeSession: true });
              replyText =
                `❌ *No Record Found on KRA Database*\n` +
                `─────────────────────────\n` +
                `Could not locate tax records matching: \`${cleanArg}\`.\n\n` +
                `👉 *Suggestions:*\n` +
                `• Double-check your National ID or PIN for any typo.\n` +
                `• Search directly on our online web portal:\n` +
                `  🔗 https://kra.akubrecah.com\n` +
                `• Send another ID/PIN to try again.\n` +
                `─────────────────────────\n` +
                `_(Reply *0* to cancel)_`;
            } else {
              // Fulfill instantly if Cyber Cafe subscriber, else prompt KES 20
              replyText = await handleTaxpayerFoundFulfillment({
                userPhone,
                taxpayer,
                idOrPinInput: cleanArg,
                saveConversationState,
              });
            }
          }
        } else {
          // Standard menu trigger without args (.kra or /kra)
          const cyberCheck = await getCyberCafeStatus(userPhone);

          await saveConversationState('AWAITING_INPUT', {
            activeSession: true,
            pin: null,
            idNumber: null,
            taxpayerDetails: null,
            paymentPhone: null,
            suggestedPhone: null,
          });

          replyText =
            `🇰🇪 *AKUBRECAH KRA COMPLIANCE PORTAL*${cyberCheck.isActive ? `\n🏢 *${cyberCheck.cafe?.cafeName}* (${cyberCheck.daysRemaining} days active package)` : ''}\n` +
            `─────────────────────────\n` +
            `Instant KRA PIN & Tax Compliance Certificate Retrieval.\n\n` +
            `👉 *How to Proceed:*\n` +
            `Send your *National ID Number* (6–9 digits) or *KRA PIN* (e.g. *A012345678Z*) directly in this chat.\n\n` +
            `🌐 *Self-Service Web Portal:*\n` +
            `Prefer downloading directly from your browser?\n` +
            `🔗 https://kra.akubrecah.com\n\n` +
            `💰 *Cost:* Strictly KES 20.00 per certificate.\n` +
            `─────────────────────────\n` +
            `_Available Commands:_\n` +
            `• *.kra <ID or PIN>* — Instant lookup\n` +
            `• *.cyber* — Cyber Cafe Package (KES 500/Month unlimited)\n` +
            `• *.status* — Check subscription status\n` +
            `• *.invoice* — Download official tax invoice\n` +
            `• *.cancel* or *0* — Cancel active session`;
        }
      }
      // G. Other/Unknown bot commands
      else {
        replyText =
          `🇰🇪 *AKUBRECAH KRA ASSISTANT COMMANDS*\n` +
          `─────────────────────────\n` +
          `• *.kra* or */kra* — Start Certificate lookup\n` +
          `• *.kra <ID or PIN>* — Instant lookup\n` +
          `• *.cyber* or */cyber* — Cyber Cafe Package (KES 500/Month unlimited)\n` +
          `• *.status* or */status* — Check subscription status\n` +
          `• *.invoice* or */invoice* — Get official tax invoice PDF\n` +
          `• *.cancel* or *0* — Cancel active session\n\n` +
          `🌐 *Web Portal:* https://kra.akubrecah.com\n` +
          `💰 *Download Fee:* Strictly KES 20.00 per certificate\n` +
          `─────────────────────────`;
      }
    }
    // 4. Step AWAITING_INPUT: User entered bot mode and sends their National ID or PIN
    else if (currentStep === 'AWAITING_INPUT') {
      const cleanInput = incomingText.replace(/^(id|national\s*id|pin|kra\s*pin)[\s:]+/i, '').replace(/\s+/g, '').trim();
      const isPin = /^[A-Za-z]\d{9}[A-Za-z]$/.test(cleanInput);
      const isId = /^\d{5,12}$/.test(cleanInput);

      if (lowerText === '0' || lowerText === 'cancel' || lowerText === 'exit') {
        await saveConversationState('IDLE', {
          activeSession: false,
          pin: null,
          idNumber: null,
          taxpayerDetails: null,
          paymentPhone: null,
          suggestedPhone: null,
        });
        replyText =
          `✅ *Session Cancelled*\n` +
          `─────────────────────────\n` +
          `The KRA assistant is now idle.\n\n` +
          `Send *.kra* or */kra* whenever you want to start again.\n` +
          `🌐 *Web Portal:* https://kra.akubrecah.com`;
      } else if (['hi', 'hello', 'hey', 'habari', 'mambo', 'menu', 'help', 'start', 'kra'].includes(cleanCmdWord)) {
        const cyberCheck = await getCyberCafeStatus(userPhone);
        replyText =
          `🇰🇪 *AKUBRECAH KRA COMPLIANCE PORTAL*${cyberCheck.isActive ? `\n🏢 *${cyberCheck.cafe?.cafeName}* (${cyberCheck.daysRemaining} days active)` : ''}\n` +
          `─────────────────────────\n` +
          `• Send your *National ID Number* or *KRA PIN* to retrieve certificate.\n` +
          `• Or download directly via self-service web:\n` +
          `  🔗 https://kra.akubrecah.com\n\n` +
          `💰 *Download Fee:* Strictly KES 20.00\n` +
          `─────────────────────────\n` +
          `_Other Commands:_\n` +
          `• Reply */cyber* for Cyber Cafe package (KES 500/Month unlimited)\n` +
          `• Reply */status* to check subscription status\n` +
          `• Reply */invoice* to get official tax invoice PDF\n` +
          `• Reply *0* to cancel`;
      } else if (!isPin && !isId) {
        await saveConversationState('AWAITING_INPUT', { activeSession: true });
        replyText =
          `⚠️ *Invalid Identification Format*\n` +
          `─────────────────────────\n` +
          `Please provide a valid Kenyan ID or KRA PIN:\n` +
          `• *National ID Number* (6 to 9 digits, e.g. *28374619*)\n` +
          `• *KRA PIN* (Format: Letter + 9 digits + Letter, e.g. *A012345678Z*)\n\n` +
          `🌐 Self-service web access:\n` +
          `🔗 https://kra.akubrecah.com\n` +
          `─────────────────────────\n` +
          `_(Reply *0* to cancel)_`;
      } else {
        let taxpayer: any = null;
        try {
          if (isPin) {
            taxpayer = await fetchTaxpayerByPin(cleanInput.toUpperCase());
          } else {
            taxpayer = await fetchTaxpayerById(cleanInput);
          }
        } catch (kraError: any) {
          console.warn('[WhatsApp KRA Lookup Notice]:', kraError.message);
        }

        if (!taxpayer || !taxpayer.taxpayerName) {
          await saveConversationState('AWAITING_INPUT', { activeSession: true });
          replyText =
            `❌ *No Record Found on KRA Database*\n` +
            `─────────────────────────\n` +
            `Could not find tax records matching: \`${cleanInput}\`.\n\n` +
            `👉 *Suggestions:*\n` +
            `• Check your input for any typos and try again.\n` +
            `• You can also search online at:\n` +
            `  🔗 https://kra.akubrecah.com\n` +
            `• Send another ID or PIN to proceed.\n` +
            `─────────────────────────\n` +
            `_(Reply *0* to cancel)_`;
        } else {
          // Fulfill instantly if Cyber Cafe subscriber, else prompt KES 20
          replyText = await handleTaxpayerFoundFulfillment({
            userPhone,
            taxpayer,
            idOrPinInput: cleanInput,
            saveConversationState,
          });
        }
      }
    }
    // 5. Cyber Cafe Registration Steps
    else if (currentStep === 'CYBER_REG_NAME') {
      if (lowerText === '0' || lowerText === 'cancel' || lowerText === 'exit') {
        await saveConversationState('IDLE', { activeSession: false });
        replyText = `✅ *Registration Cancelled*\n\nSend */cyber* or */menu* anytime to start again.`;
      } else {
        const cafeName = incomingText.trim();
        await saveConversationState('CYBER_REG_OWNER', {
          activeSession: true,
          cyberCafeName: cafeName,
        });
        replyText =
          `🏢 *Cyber Cafe:* ${cafeName}\n\n` +
          `👉 *Step 2 of 4:* What is the *Owner or Attendant Name*? (e.g. *John Kamau*)\n\n` +
          `_(Reply *0* to cancel)_`;
      }
    }
    else if (currentStep === 'CYBER_REG_OWNER') {
      if (lowerText === '0' || lowerText === 'cancel' || lowerText === 'exit') {
        await saveConversationState('IDLE', { activeSession: false });
        replyText = `✅ *Registration Cancelled*\n\nSend */cyber* anytime to start again.`;
      } else {
        const ownerName = incomingText.trim();
        await saveConversationState('CYBER_REG_WHATSAPP', {
          activeSession: true,
          cyberOwnerName: ownerName,
        });
        replyText =
          `👤 *Operator:* ${ownerName}\n` +
          `Step 3/4: WhatsApp number to activate? (Reply *SAME* for ${formatDisplayPhone(userPhone)} or send number)\n` +
          `_(Reply 0 to cancel)_`;
      }
    }
    else if (currentStep === 'CYBER_REG_WHATSAPP') {
      if (lowerText === '0' || lowerText === 'cancel' || lowerText === 'exit') {
        await saveConversationState('IDLE', { activeSession: false });
        replyText = `✅ *Registration Cancelled*\n\nSend */cyber* anytime to start again.`;
      } else {
        let targetWa = userPhone;
        if (lowerText !== 'same' && lowerText !== 'this' && lowerText !== 'here') {
          const extracted = extractKenyanPhone(incomingText);
          if (!extracted) {
            replyText =
              `⚠️ Invalid phone number. Reply *SAME* or enter Safaricom number (e.g. *0712345678*).\n_(Reply 0 to cancel)_`;
            return {
              success: true,
              userPhone,
              step: currentStep,
              reply: replyText,
              metadata,
              sendResult: sendDirect ? await sendEvolutionTextMessage(userPhone, replyText) : null,
            };
          }
          targetWa = extracted;
        }

        await saveConversationState('CYBER_REG_PAYMENT', {
          activeSession: true,
          cyberWaPhone: targetWa,
        });

        replyText =
          `📱 *Activated Line:* \`${formatDisplayPhone(targetWa)}\`\n` +
          `Step 4/4: Safaricom M-Pesa number to pay KES 500? (Reply *SAME* for ${formatDisplayPhone(userPhone)} or send number)\n` +
          `_(Reply 0 to cancel)_`;
      }
    }
    else if (currentStep === 'CYBER_REG_PAYMENT') {
      if (lowerText === '0' || lowerText === 'cancel' || lowerText === 'exit') {
        await saveConversationState('IDLE', { activeSession: false });
        replyText = `✅ *Registration Cancelled*\n\nSend */cyber* anytime to start again.`;
      } else {
        let targetPay = userPhone;
        if (lowerText !== 'same' && lowerText !== 'this' && lowerText !== 'here') {
          const extracted = extractKenyanPhone(incomingText);
          if (!extracted) {
            replyText =
              `⚠️ Invalid phone number. Reply *SAME* or enter Safaricom number (e.g. *0712345678*).\n_(Reply 0 to cancel)_`;
            return {
              success: true,
              userPhone,
              step: currentStep,
              reply: replyText,
              metadata,
              sendResult: sendDirect ? await sendEvolutionTextMessage(userPhone, replyText) : null,
            };
          }
          targetPay = extracted;
        }

        const cafeName = metadata.cyberCafeName || 'Cyber Cafe';
        const ownerName = metadata.cyberOwnerName || 'Cyber Operator';
        const waPhone = metadata.cyberWaPhone || userPhone;

        const stkRes = await triggerCyberCafePayment({
          targetPhone: targetPay,
          whatsappUserPhone: userPhone,
          cafeName,
          ownerName,
        });

        await saveConversationState('CYBER_AWAITING_PAYMENT', {
          activeSession: true,
          checkoutId: stkRes.checkoutRequestId || '',
          paymentPhone: stkRes.normalizedPhone,
          cyberCafeName: cafeName,
          cyberOwnerName: ownerName,
          cyberWaPhone: waPhone,
          stkGateway: stkRes.gateway,
          pushedAt: Date.now(),
        });

        if (stkRes.success) {
          replyText =
            `📲 M-Pesa prompt (KES 500) sent to \`${stkRes.normalizedPhone}\` for *${cafeName}*.\n` +
            `Enter PIN to activate. Reply 1 to resend, 0 to cancel.`;
        } else {
          replyText =
            `⚠️ Could not send prompt to ${stkRes.normalizedPhone}: ${stkRes.error || 'Network error'}.\n` +
            `Reply with another Safaricom number or 0 to cancel.`;
        }
      }
    }
    else if (currentStep === 'CYBER_AWAITING_PAYMENT') {
      const activePayPhone = metadata.paymentPhone || userPhone;
      const cafeName = metadata.cyberCafeName || 'Cyber Cafe';
      const ownerName = metadata.cyberOwnerName || 'Cyber Operator';
      const waPhone = metadata.cyberWaPhone || userPhone;

      if (lowerText === '0' || lowerText === 'cancel' || lowerText === 'exit') {
        await saveConversationState('IDLE', {
          activeSession: false,
          checkoutId: null,
          paymentPhone: null,
        });
        replyText = `✅ *Payment Cancelled*\n\nSend */cyber* anytime to subscribe.`;
      } else if (/^(?:254|\+254|0)?(7|1)\d{8}$/.test(incomingText.replace(/[\s\-\+\(\)]/g, ''))) {
        // User provides alternate payment phone
        const newTarget = incomingText.replace(/[\s\-\+\(\)]/g, '');
        const stkRes = await triggerCyberCafePayment({
          targetPhone: newTarget,
          whatsappUserPhone: userPhone,
          cafeName,
          ownerName,
        });

        await saveConversationState('CYBER_AWAITING_PAYMENT', {
          activeSession: true,
          checkoutId: stkRes.checkoutRequestId || metadata.checkoutId,
          paymentPhone: stkRes.normalizedPhone,
          stkGateway: stkRes.gateway,
          pushedAt: Date.now(),
        });

        if (stkRes.success) {
          replyText =
            `📲 *M-PESA PAYMENT PROMPT RESENT!*\n\n` +
            `• *Amount:* KES 500.00\n` +
            `• *Target Handset:* \`${stkRes.normalizedPhone}\`\n\n` +
            `👉 Enter your M-Pesa PIN on that phone to complete payment.`;
        } else {
          replyText = `⚠️ *Could not send prompt:* ${stkRes.error || 'Network error'}.\n\n👉 Send another number or reply *0* to cancel.`;
        }
      } else if (lowerText === '1' || lowerText === 'resend' || lowerText === 'retry') {
        // Resend prompt to current payment phone
        const stkRes = await triggerCyberCafePayment({
          targetPhone: activePayPhone,
          whatsappUserPhone: userPhone,
          cafeName,
          ownerName,
        });

        await saveConversationState('CYBER_AWAITING_PAYMENT', {
          activeSession: true,
          checkoutId: stkRes.checkoutRequestId || metadata.checkoutId,
          paymentPhone: stkRes.normalizedPhone,
          stkGateway: stkRes.gateway,
          pushedAt: Date.now(),
        });

        if (stkRes.success) {
          replyText =
            `📲 *M-PESA PROMPT RESENT!*\n\n` +
            `A fresh payment prompt for *KES 500.00* was sent to \`${stkRes.normalizedPhone}\`.\n\n` +
            `👉 Enter your M-Pesa PIN to complete payment.`;
        } else {
          replyText = `⚠️ *Could not resend prompt:* ${stkRes.error || 'Network error'}.\n\n👉 Send another number or reply *0* to cancel.`;
        }
      } else {
        // Verification check
        let isPaid = false;
        let verifiedReceipt = '';

        if (metadata.checkoutId) {
          // Check global mpesaCallbacks (safe object/map check)
          if (typeof (global as any).mpesaCallbacks !== 'undefined') {
            const rawCb = (global as any).mpesaCallbacks;
            const cb = rawCb?.[metadata.checkoutId] || (typeof rawCb?.get === 'function' ? rawCb.get(metadata.checkoutId) : undefined);
            if (cb && cb.ResultCode === 0) {
              isPaid = true;
              verifiedReceipt = cb.MpesaReceiptNumber || metadata.checkoutId;
            }
          }

          // Check DB cyberInvoice
          if (!isPaid && typeof db.cyberInvoice?.findFirst === 'function') {
            const inv = await db.cyberInvoice.findFirst({
              where: {
                OR: [
                  { checkoutId: metadata.checkoutId },
                  { mpesaReceipt: metadata.checkoutId },
                ],
              },
            });
            if (inv) {
              isPaid = true;
              verifiedReceipt = inv.mpesaReceipt || metadata.checkoutId;
            }
          }
        }

        // Check Paystack for Cyber Cafe subscription payment
        if (!isPaid) {
          try {
            const { findRecentSuccessfulPaystackPayment } = await import('@/lib/paystack');
            const foundPaystack = await findRecentSuccessfulPaystackPayment({
              phone: activePayPhone || userPhone,
              reference: metadata.checkoutId,
              maxAgeMinutes: 90,
              skipCache: true,
            });
            if (foundPaystack.found && (foundPaystack.amountKes || 0) >= 490) {
              isPaid = true;
              verifiedReceipt = foundPaystack.reference || metadata.checkoutId;
            }
          } catch (err: any) {
            console.warn('[Cyber Paystack Verify Notice]:', err.message);
          }
        }

        if (isPaid) {
          const activation = await activateCyberCafeSubscription({
            cafeName,
            ownerName,
            whatsappPhone: waPhone,
            paymentPhone: activePayPhone,
            mpesaReceipt: verifiedReceipt,
            checkoutId: metadata.checkoutId,
            amountKes: 500,
          });

          await saveConversationState('IDLE', {
            activeSession: false,
            cyberSubActive: true,
            mpesaReceipt: verifiedReceipt,
          });

          if (activation.success && activation.invoice && activation.cafe) {
            await deliverCyberInvoiceToWhatsApp({
              whatsappPhone: userPhone,
              invoice: activation.invoice,
              cafe: activation.cafe,
              daysRemaining: activation.daysRemaining,
            });
          }

          replyText =
            `🎉 *CYBER CAFE PACKAGE ACTIVATED!*\n` +
            `─────────────────────────\n` +
            `• *Cyber Cafe:* *${cafeName}*\n` +
            `• *M-Pesa Receipt:* \`${verifiedReceipt}\`\n` +
            `• *Package:* Unlimited 30-Day Pass (KES 500.00)\n\n` +
            `📄 Official Tax Invoice has been delivered directly to your chat above!\n` +
            `⚡ You can now retrieve unlimited KRA PIN Certificates with zero payment prompts.\n\n` +
            `👉 Try sending a National ID (e.g. *28374619*) or KRA PIN anytime.`;
        } else {
          await saveConversationState('CYBER_AWAITING_PAYMENT', { activeSession: true });
          replyText =
            `⏳ *Waiting for M-Pesa PIN (KES 500) on \`${formatDisplayPhone(activePayPhone)}\`*\n` +
            `• Entered PIN? Wait 3–5 seconds then reply *PAID*.\n` +
            `• No prompt received? Reply *1* to resend, or send another number.\n` +
            `• Reply *0* to cancel.`;
        }
      }
    }
    // 6. Step AWAITING_PAYMENT / AWAITING_PAYMENT_METHOD / AWAITING_CONFIRMATION / AWAITING_PHONE_NUMBER (Per-download)
    else if (
      currentStep === 'AWAITING_PAYMENT' ||
      currentStep === 'AWAITING_PAYMENT_METHOD' ||
      currentStep === 'AWAITING_CONFIRMATION' ||
      currentStep === 'AWAITING_PHONE_NUMBER'
    ) {
      const pinToDownload = metadata.pin;
      const downloadFee = Number(process.env.PAYSTACK_DOWNLOAD_FEE_KES || 20);
      const activePayPhone = metadata.paymentPhone || userPhone;

      // A. Cancellation
      if (lowerText === '0' || lowerText === 'cancel' || lowerText === 'exit' || lowerText === 'reset') {
        await saveConversationState('IDLE', {
          activeSession: false,
          pin: null,
          idNumber: null,
          taxpayerDetails: null,
          paymentPhone: null,
          suggestedPhone: null,
          checkoutId: null,
          checkoutUrl: null,
        });
        replyText =
          `✅ *Operation Cancelled*\n` +
          `─────────────────────────\n` +
          `The KRA assistant is now idle.\n\n` +
          `Send *.kra* or */kra* whenever you want to start again.\n` +
          `🌐 *Web Portal:* https://kra.akubrecah.com`;
      }
      // B. User supplies an alternate phone number (e.g. 0712345678, 254712345678, 0112345678)
      else if (/^(?:254|\+254|0)?(7|1)\d{8}$/.test(incomingText.replace(/[\s\-\+\(\)]/g, ''))) {
        const targetPhone = incomingText.replace(/[\s\-\+\(\)]/g, '');
        const stkRes = await triggerInAppMpesaPayment({
          targetPhone,
          whatsappUserPhone: userPhone,
          pin: pinToDownload,
          amount: downloadFee,
          taxpayerName: metadata.taxpayerName,
        });

        await saveConversationState('AWAITING_PAYMENT', {
          activeSession: true,
          checkoutId: stkRes.checkoutRequestId || metadata.checkoutId,
          paymentPhone: stkRes.normalizedPhone,
          stkGateway: stkRes.gateway,
          pushedAt: Date.now(),
        });

        if (stkRes.success) {
          replyText =
            `📲 *M-PESA PAYMENT PROMPT SENT*\n` +
            `─────────────────────────\n` +
            `• *Amount:* KES ${downloadFee}.00\n` +
            `• *Handset:* \`${stkRes.normalizedPhone}\`\n\n` +
            `👉 *Enter your M-Pesa PIN* on your phone to complete your order.\n\n` +
            `🌐 *Portal:* https://kra.akubrecah.com\n` +
            `─────────────────────────\n` +
            `_Reply 1 to resend | Reply 0 to cancel_`;
        } else {
          replyText =
            `⚠️ *Could not send prompt to \`${stkRes.normalizedPhone}\`:* ${stkRes.error || 'Network error'}.\n\n` +
            `👉 Send another Safaricom phone number or reply *0* to cancel.\n` +
            `🌐 Or visit: https://kra.akubrecah.com`;
        }
      }
      // C. User requests resending the STK Push
      else if (lowerText === '1' || lowerText === 'resend' || lowerText === 'retry' || lowerText === 'prompt' || lowerText === 'push') {
        const stkRes = await triggerInAppMpesaPayment({
          targetPhone: activePayPhone,
          whatsappUserPhone: userPhone,
          pin: pinToDownload,
          amount: downloadFee,
          taxpayerName: metadata.taxpayerName,
        });

        await saveConversationState('AWAITING_PAYMENT', {
          activeSession: true,
          checkoutId: stkRes.checkoutRequestId || metadata.checkoutId,
          paymentPhone: stkRes.normalizedPhone,
          stkGateway: stkRes.gateway,
          pushedAt: Date.now(),
        });

        if (stkRes.success) {
          replyText =
            `📲 *M-PESA PAYMENT PROMPT RESENT*\n` +
            `─────────────────────────\n` +
            `• *Amount:* KES ${downloadFee}.00\n` +
            `• *Handset:* \`${stkRes.normalizedPhone}\`\n\n` +
            `👉 *Enter your M-Pesa PIN* on your phone to complete your order.\n\n` +
            `🌐 *Portal:* https://kra.akubrecah.com\n` +
            `─────────────────────────\n` +
            `_Reply 1 to resend | Reply 0 to cancel_`;
        } else {
          replyText =
            `⚠️ *Could not resend prompt:* ${stkRes.error || 'Network error'}.\n\n` +
            `👉 Send another Safaricom number (e.g. *0712345678*) or reply *0* to cancel.\n` +
            `🌐 Or visit: https://kra.akubrecah.com`;
        }
      }
      // D. Verification check (e.g. "PAID", or general text)
      else {
        let isPaid = false;
        let verifiedReceipt = '';

        // 1. Check DB for recorded download
        try {
          if (typeof db.certificateDownload?.findFirst === 'function') {
            const dl = await db.certificateDownload.findFirst({
              where: {
                OR: [
                  ...(metadata.checkoutId ? [{ mpesaReceipt: metadata.checkoutId }, { checkoutId: metadata.checkoutId }] : []),
                  { clerkId: `wa_${userPhone.replace(/[^a-zA-Z0-9]/g, '')}` },
                ],
              },
              orderBy: { createdAt: 'desc' },
            });
            if (
              dl &&
              (dl.mpesaReceipt === metadata.checkoutId ||
                dl.checkoutId === metadata.checkoutId ||
                (dl.pin === pinToDownload && Date.now() - new Date(dl.createdAt).getTime() < 3600000))
            ) {
              isPaid = true;
              verifiedReceipt = dl.mpesaReceipt || dl.checkoutId || metadata.checkoutId;
            }
          }
        } catch (dbErr: any) {
          console.warn('[WhatsApp Chat] DB payment check notice:', dbErr.message);
        }

        // 2. Check global mpesaCallbacks (Daraja in-memory safe access)
        if (!isPaid && metadata.checkoutId && typeof (global as any).mpesaCallbacks !== 'undefined') {
          const rawCb = (global as any).mpesaCallbacks;
          const cb = rawCb?.[metadata.checkoutId] || (typeof rawCb?.get === 'function' ? rawCb.get(metadata.checkoutId) : undefined);
          if (cb && cb.ResultCode === 0) {
            isPaid = true;
            verifiedReceipt = cb.MpesaReceiptNumber || metadata.checkoutId;
          }
        }

        // 3. Check Paystack: verify direct checkoutId or search recent successful payment for phone/PIN
        if (!isPaid) {
          try {
            const { findRecentSuccessfulPaystackPayment } = await import('@/lib/paystack');
            const foundPaystack = await findRecentSuccessfulPaystackPayment({
              phone: activePayPhone || userPhone,
              pin: pinToDownload,
              reference: metadata.checkoutId,
              maxAgeMinutes: 90,
              skipCache: true,
            });
            if (foundPaystack.found && foundPaystack.reference) {
              isPaid = true;
              verifiedReceipt = foundPaystack.reference;
            }
          } catch (err: any) {
            console.warn('[WhatsApp Chat] Paystack verify notice:', err.message);
          }
        }

        if (isPaid) {
          await saveConversationState('COMPLETED', {
            activeSession: false,
            mpesaReceipt: verifiedReceipt,
          });

          const { fulfillWhatsAppCertificateDelivery } = await import('@/lib/certificate-fulfillment');
          await fulfillWhatsAppCertificateDelivery({
            phone: userPhone,
            pin: pinToDownload,
            checkoutId: metadata.checkoutId || verifiedReceipt,
            mpesaReceipt: verifiedReceipt || `REC-${Date.now()}`,
            amount: downloadFee,
            taxpayerName: metadata.taxpayerName,
            taxpayerDetails: metadata.taxpayerDetails,
            skipDirectWhatsAppDocument: false, // Ensure direct document dispatch + n8n webhook redundancy
          });

          replyText =
            `✅ *PAYMENT CONFIRMED!* 🎉\n` +
            `─────────────────────────\n` +
            `• *Receipt / Ref:* \`${verifiedReceipt || metadata.checkoutId || 'APPROVED'}\`\n` +
            `• *KRA PIN:* \`${pinToDownload}\`\n` +
            `• *Amount Paid:* KES ${downloadFee}.00\n\n` +
            `📄 Official KRA PIN Certificate and fiscal receipt are being delivered directly to your chat below...\n\n` +
            `🌐 *Web Portal:* https://kra.akubrecah.com`;
        } else {
          await saveConversationState('AWAITING_PAYMENT', { activeSession: true });

          const isExplicitPaid =
            ['paid', 'nimepay', 'nimelipa', 'done', 'confirm', 'verify', 'yes', 'check'].includes(lowerText) ||
            lowerText.includes('paid');

          replyText =
            `⏳ *${isExplicitPaid ? 'Payment Not Yet Detected' : 'Awaiting Payment Confirmation'}*\n` +
            `─────────────────────────\n` +
            `• *Amount:* KES ${downloadFee}.00\n` +
            `• *Target Number:* \`${formatDisplayPhone(activePayPhone)}\`\n` +
            (metadata.checkoutId ? `• *Last Checkout Ref:* \`${metadata.checkoutId}\`\n\n` : `\n`) +
            `• *Already paid on your phone?* Wait 5–10 seconds and reply *PAID* again.\n` +
            `• *No M-Pesa prompt on your phone?* Reply *1* to resend prompt immediately.\n` +
            `• *Paying with another number?* Send that phone number (e.g. *0712345678*).\n` +
            `• *Cancel:* Reply *0* to cancel.\n\n` +
            `🌐 *Self-Service Web Portal:* https://kra.akubrecah.com`;
        }
      }
    }
    // 6. Step COMPLETED: Silently idle unless a new slash command is issued
    else if (currentStep === 'COMPLETED') {
      // Intentionally silent: Do not spam user after certificate is delivered
      replyText = '';
    }

    // 7. Optional Direct Dispatch to Evolution API
    let sendResult: any = null;
    if (sendDirect && replyText) {
      sendResult = await sendEvolutionTextMessage(userPhone, replyText);
    }

    return {
      success: true,
      userPhone,
      step: nextStep,
      reply: replyText,
      metadata,
      sendResult,
    };
  } catch (error: any) {
    console.error('[WhatsApp Chat Route Error]:', error);
    return { success: false, error: error.message };
  }
}

/**
 * POST /api/whatsapp/chat
 * Standard HTTP POST endpoint protected by shared secret
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    // Shared secret check: Ensure only authorized Evolution instance can trigger chat events
    // No hardcoded fallback — fails closed when env is unset.
    const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET || process.env.EVOLUTION_API_KEY || '';
    const providedSecret =
      req.headers.get('x-webhook-secret') ||
      req.headers.get('apikey') ||
      req.headers.get('x-api-key') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      req.nextUrl.searchParams.get('secret') ||
      req.nextUrl.searchParams.get('token') ||
      body.apikey ||
      body.secret;

    if (!providedSecret || !expectedSecret || providedSecret !== expectedSecret) {
      console.warn('[WhatsApp Chat] Blocked unauthorized chat trigger request. Missing or invalid secret.');
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid Evolution webhook secret.' },
        { status: 401 }
      );
    }

    const result = await handleWhatsAppChat(body);
    const status = result.success ? 200 : 400;
    return NextResponse.json(result, { status });
  } catch (error: any) {
    console.error('[WhatsApp Chat POST Handler Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
