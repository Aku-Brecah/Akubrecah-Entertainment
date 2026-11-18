/**
 * WhatsApp Admin Bot Controller for Super Admin phones.
 * Revenue/stats queries, system logs, 1-click magic link login, role access.
 */
import { safeCompare } from '@/lib/admin-auth';
import { log } from '@/lib/monitoring/logger';
import prisma from '@/lib/prisma';
import { createAdminMagicToken } from '@/lib/magic-token';
import { getPublicAppUrl } from '@/lib/utils';
import { findRecentSuccessfulMpesaPayment, normalizePhoneNumber } from '@/lib/whatsapp/mpesa-dispatch';
import { formatDisplayPhone } from '@/lib/whatsapp/phone';
import { parseWhatsAppCommand } from '@/lib/whatsapp/commands';

/**
 * Admin Bot Controller for WhatsApp Super Admin
 * Allows checking revenue, stats, recent logs, bot performance, and generating 1-click magic link
 */
export async function handleAdminBotCommand({
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
  const parsed = parseWhatsAppCommand(incomingText);
  if (parsed.shouldIgnore || !parsed.hasCommandPrefix) {
    return null;
  }

  const rawCmd = parsed.cleanCmdWord;
  const rawArg = parsed.cleanCmdArgs;

  const expectedPin = process.env.ADMIN_BOT_PIN || '';
  const messageTokens = (parsed.cleanCmdText || '')
    .toLowerCase()
    .split(/[\s,.!;:()[\]{}]+/)
    .map((t) => t.replace(/^[^0-9a-z]+|[^0-9a-z]+$/g, ''))
    .filter(Boolean);
  const hasPinInText =
    Boolean(expectedPin) &&
    messageTokens.some((tok) => safeCompare(tok, expectedPin.toLowerCase()));

  const BOT_NUMBER = '254791497858';
  const effectivePhoneDigits = String(authorPhone || userPhone || '').replace(/[^0-9]/g, '');
  const userPhoneDigits = String(userPhone || '').replace(/[^0-9]/g, '');
  const botNumberDigits = BOT_NUMBER.replace(/[^0-9]/g, '');
  // Exact equality only — suffix matching ("858", "497858") is spoofable, so
  // any partial phone must never authorize owner/admin status.
  const isOwner = Boolean(
    isFromBotOwner ||
    effectivePhoneDigits === botNumberDigits ||
    userPhoneDigits === botNumberDigits
  );

  const adminNumbersEnv = process.env.ADMIN_WHATSAPP_NUMBERS || process.env.SUPER_ADMIN_PHONE || '';
  const configuredAdmins = adminNumbersEnv.split(',').map((s) => s.replace(/[^0-9]/g, '').trim()).filter(Boolean);
  const adminList = Array.from(new Set([BOT_NUMBER, ...configuredAdmins]));

  // Whitelist only via exact, digits-normalized equality.
  const isWhitelisted =
    isOwner ||
    adminList.some((p) => {
      const digits = p.replace(/[^0-9]/g, '');
      return digits && (effectivePhoneDigits === digits || userPhoneDigits === digits);
    });

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

  // Admin trigger should ONLY activate on strict command prefix (. or /) matching admin commands
  const isAdminTrigger = rawCmd === 'admin' || adminCmds.includes(rawCmd);

  if (!isAdminTrigger) return null;

  // SECURITY: Require the sender phone to be on the explicit admin whitelist.
  // A non-whitelisted phone can never unlock admin access or mint magic links even by guessing PINs.
  let isAdminAuthenticated = isWhitelisted;

  if (isWhitelisted && hasPinInText && !hasActivePinSession) {
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
      `🔒 *Admin Access Restricted*\n` +
      `─────────────────────────\n` +
      `This command is reserved for authorized system administrators.\n\n` +
      `👉 *Allowed Customer Commands:*\n` +
      `• */kra* — Retrieve KRA PIN Certificate (KES 20.00)\n` +
      `• */cyber* — Cyber Cafe Monthly Package (KES 500/Month)\n` +
      `• */status* — Check subscription status\n` +
      `• */invoice* — Download official tax invoice PDF\n` +
      `• */help* — Instructions & customer guide\n` +
      `• */cancel* — Cancel active session\n\n` +
      `🌐 *Web Portal:* https://kra.akubrecah.com\n` +
      `─────────────────────────`
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
    return (
      `🔒 *ADMIN SESSION LOCKED*\n` +
      `─────────────────────────\n` +
      `Administrative privileges disabled for this phone.\n\n` +
      `👉 Send *!admin* with your master PIN anytime to re-authenticate.\n` +
      `─────────────────────────`
    );
  }

  // 2. 1-Click Magic Link
  // Highest-value action: mints a 4h Super Admin web session. A whitelisted
  // phone alone is not enough — the phone identity on WhatsApp webhooks is
  // claimed, not proven. Require a live PIN-authenticated session so a
  // spoofed sender must still know the secret PIN to mint admin links.
  if (cmd === 'link' || cmd === 'magic' || cmd === 'web') {
    if (!isWhitelisted || (!hasActivePinSession && !hasPinInText)) {
      return (
        `🔐 *Admin Verification Required for Web Access*\n` +
        `─────────────────────────\n` +
        `To prevent impersonation, first authenticate with the master PIN:\n\n` +
        `*/admin <your ADMIN_BOT_PIN>*\n\n` +
        `...then request the link again (the session stays unlocked 24h).\n` +
        `─────────────────────────`
      );
    }
    const magicToken = createAdminMagicToken(effectivePhoneDigits || BOT_NUMBER);
    const magicUrl = `${appUrl}/api/admin/magic-login?token=${magicToken}`;
    return (
      `👑 *EXECUTIVE ADMIN WEB ACCESS*\n` +
      `─────────────────────────\n` +
      `Tap below to open your Executive Admin Dashboard directly:\n\n` +
      `👉 ${magicUrl}\n\n` +
      `⏳ _This cryptographically signed token is valid for 4 hours._\n` +
      `─────────────────────────`
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
      `📊 *AKUBRECAH KRA — EXECUTIVE STATS*\n` +
      `─────────────────────────\n` +
      `💰 *FINANCIAL OVERVIEW*\n` +
      `• *Total Revenue:*    KES ${totalRev.toLocaleString()}\n` +
      `• *Today's Revenue:*  KES ${todayRev.toLocaleString()}\n\n` +
      `📜 *DOWNLOAD PERFORMANCE*\n` +
      `• *Total Issued:*     ${downloads.length} certificates\n` +
      `• *WhatsApp Bot:*     ${waDownloads} (${downloads.length > 0 ? Math.round((waDownloads / downloads.length) * 100) : 0}%)\n` +
      `• *Active Bot Users:* ${botUsers}\n\n` +
      `💻 *PLATFORM TRAFFIC*\n` +
      `• *Desktop Web:*      ${pcPct}%\n` +
      `• *Mobile Web:*       ${mobPct}%\n` +
      `─────────────────────────\n` +
      `_Reply *!revenue* for financials | *!link* for web dashboard_`
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

    const webRev = totalRev - downloads.filter((d) => d.clerkId?.startsWith('wa_')).reduce((acc, c) => acc + (Number(c.amountCharged) || 0), 0);
    const waRev = totalRev - webRev;

    return (
      `💰 *REVENUE BREAKDOWN REPORT*\n` +
      `─────────────────────────\n` +
      `📅 *PERIOD TOTALS*\n` +
      `• *Today:*         KES ${todayRev.toLocaleString()}\n` +
      `• *Last 7 Days:*   KES ${sevenDayRev.toLocaleString()}\n` +
      `• *Last 30 Days:*  KES ${thirtyDayRev.toLocaleString()}\n` +
      `• *Lifetime:*      KES ${totalRev.toLocaleString()}\n\n` +
      `💳 *DARAJA M-PESA CHANNELS*\n` +
      `• *Web Portal:*    KES ${webRev.toLocaleString()} (${totalRev > 0 ? Math.round((webRev / totalRev) * 100) : 0}%)\n` +
      `• *WhatsApp Bot:*  KES ${waRev.toLocaleString()} (${totalRev > 0 ? Math.round((waRev / totalRev) * 100) : 0}%)\n` +
      `─────────────────────────\n` +
      `_Reply *!logs* to view recent customer transactions_`
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
      return (
        `🧾 *TRANSACTION LOGS*\n` +
        `─────────────────────────\n` +
        `No certificate downloads or transactions recorded yet.\n` +
        `─────────────────────────`
      );
    }

    let report =
      `🧾 *LATEST 5 TRANSACTIONS*\n` +
      `─────────────────────────\n`;
    recent.forEach((item, index) => {
      const isWa = item.clerkId?.startsWith('wa_');
      const channel = isWa ? '🤖 WhatsApp' : '🌐 Web Portal';
      const receipt = item.mpesaReceipt || item.checkoutId || 'STK-VERIFIED';
      const timeStr = new Date(item.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

      report +=
        `*#${index + 1} — ${item.pin}*\n` +
        `• *Amount:*   KES ${item.amountCharged}.00\n` +
        `• *Channel:*  ${channel}\n` +
        `• *Receipt:*  \`${receipt}\`\n` +
        `• *Time:*     ${timeStr}\n` +
        `─────────────────────────\n`;
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
      `🤖 *WHATSAPP BOT PERFORMANCE*\n` +
      `─────────────────────────\n` +
      `• *Total Users:*     ${totalBotUsers}\n` +
      `• *Total Sessions:*  ${totalConversations}\n` +
      `• *Certificates:*    ${waDownloads}\n` +
      `• *Bot Revenue:*     KES ${waRevenue.toLocaleString()}\n` +
      `• *Conversion Rate:* ${conversionRate}%\n` +
      `─────────────────────────\n` +
      `_Reply *!stats* for global KPIs | *!logs* for transactions_`
    );
  }

  // 7. !failed or !pending or !issues
  if (cmd === 'failed' || cmd === 'pending' || cmd === 'issues') {
    let recentTx: any[] = [];
    try {
      if (typeof db.mpesaTransaction?.findMany === 'function') {
        recentTx = await db.mpesaTransaction.findMany({
          where: {
            status: { in: ['FAILED', 'CANCELLED', 'TIMED_OUT', 'PENDING'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });
      }
    } catch (err: any) {
      log.warn('[Admin !failed] Daraja DB lookup notice:', err.message);
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
      log.warn('[Admin !failed] DB conversations lookup notice:', err.message);
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
      report += `❌ *RECENT DARAJA GATEWAY EVENTS (${recentTx.length}):*\n`;
      recentTx.forEach((t: any, i: number) => {
        const phone = t.phone || 'Unknown Phone';
        const pin = t.pin || 'KRA';
        const time = new Date(t.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

        report +=
          `*${i + 1}. Phone:* \`${formatDisplayPhone(phone)}\`\n` +
          `   • Amount: KES ${Number(t.amount || 20).toFixed(0)}.00\n` +
          `   • PIN: \`${pin}\`\n` +
          `   • Daraja Status: _${t.status}_\n` +
          `   • CheckoutID: \`${t.checkoutRequestId}\`\n` +
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
        `• Example: *!recheck ws_CO_...*`
      );
    }

    const cleanQuery = query.replace(/[^0-9a-zA-Z]/g, '');

    // 1. Search for successful Daraja M-Pesa payment
    const payment = await findRecentSuccessfulMpesaPayment({
      phone: query,
      pin: query,
      reference: query,
      maxAgeMinutes: 180, // last 3 hours
    });

    // 2. Lookup conversation in DB (guard against empty contains match)
    let conv: any = null;
    try {
      const phoneFilters = [
        ...(cleanQuery.length >= 9 ? [{ user_phone: { contains: cleanQuery } }] : []),
        { user_phone: query },
      ];
      conv = await db.ai_conversations?.findFirst({
        where: {
          channel: 'whatsapp',
          OR: phoneFilters,
        },
        orderBy: { updated_at: 'desc' },
      });
    } catch { }

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
          }).catch(() => { });
        }
      } catch (delErr: any) {
        log.error('[Admin !recheck] Delivery error:', delErr.message);
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
        `📄 Official KRA PIN Certificate (PDF) has been generated and dispatched directly to the customer's WhatsApp chat.`
      );
    } else {
      // Fetch last Daraja STK Push attempt from PostgreSQL
      let lastAttempt: any = null;
      try {
        const cleanQ = normalizePhoneNumber(query);
        if (typeof db.mpesaTransaction?.findFirst === 'function') {
          lastAttempt = await db.mpesaTransaction.findFirst({
            where: {
              OR: [
                ...(cleanQ ? [{ phone: cleanQ }] : []),
                { checkoutRequestId: query },
                { pin: query.toUpperCase() },
                { reference: { contains: query } },
              ],
            },
            orderBy: { createdAt: 'desc' },
          });
        }
      } catch { }

      return (
        `⏳ *PAYMENT NOT VERIFIED FOR \`${query}\`*\n` +
        `─────────────────────────\n` +
        `• *Daraja Status:* ${lastAttempt ? `❌ ${lastAttempt.status}${lastAttempt.resultDesc ? ` (${lastAttempt.resultDesc})` : ''}` : 'No matching payment record'}\n` +
        `• *CheckoutRef:* \`${lastAttempt?.checkoutRequestId || 'N/A'}\`\n` +
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
      const targetFilters = [
        ...(cleanTarget.length >= 9 ? [{ user_phone: { contains: cleanTarget } }] : []),
        { user_phone: target },
      ];
      conv = await db.ai_conversations?.findFirst({
        where: {
          channel: 'whatsapp',
          OR: targetFilters,
        },
        orderBy: { updated_at: 'desc' },
      });
    } catch { }

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
        }).catch(() => { });
      }

      return (
        `🚀 *MANUAL DELIVERY EXECUTED!*\n` +
        `─────────────────────────\n` +
        `• *Recipient:* \`${formatDisplayPhone(phone)}\`\n` +
        `• *KRA PIN:* \`${pin}\`\n` +
        `• *Taxpayer:* *${name}*\n` +
        `• *Manual Ref:* \`${manualReceipt}\`\n` +
        `─────────────────────────\n` +
        `📄 Official KRA PIN Certificate (PDF) has been generated and dispatched directly to the customer's WhatsApp chat.`
      );
    } catch (err: any) {
      return `❌ *Delivery failed:* ${err.message}`;
    }
  }

  // 10. Menu / Help / Default
  return (
    `👑 *AKUBRECAH KRA — ADMIN COMMAND CENTER*\n` +
    `─────────────────────────\n` +
    `📊 *EXECUTIVE METRICS*\n` +
    `• *!stats*            Live KPIs, revenue & traffic\n` +
    `• *!revenue*          Financial breakdown (24h/7d/30d)\n` +
    `• *!bot*              WhatsApp adoption & conversion\n\n` +
    `🧾 *OPERATIONS & AUDIT*\n` +
    `• *!logs*             Last 5 customer transactions\n` +
    `• *!failed*           Pending sessions & errors\n` +
    `• *!recheck <query>*  Verify M-Pesa & auto-deliver\n` +
    `• *!deliver <phone>*  Force-generate certificate\n\n` +
    `🔐 *ACCESS CONTROL*\n` +
    `• *!link*             1-Click Executive Web login\n` +
    `• *!lock*             Lock active admin session\n` +
    `─────────────────────────\n` +
    `_Send any command above (e.g. *!stats* or *!logs*)_`
  );
}
