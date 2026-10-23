import { log } from '@/lib/monitoring/logger';
import { safeCompare } from '@/lib/admin-auth';
import { NextRequest, NextResponse, after } from 'next/server';
import { sanitizeWhatsAppPhone, markEvolutionMessageRead } from '@/lib/evolution';
import { maskPhone } from '@/lib/masking';
import { handleWhatsAppChat } from '@/app/api/whatsapp/chat/route';
import { isDuplicateWhatsAppMessage } from '@/lib/whatsapp-dedup';

export const maxDuration = 60;

/**
 * POST /api/whatsapp/webhook
 *
 * Evolution API Webhook Receiver.
 * Receives MESSAGES_UPSERT events from Evolution API and executes
 * state transition in memory without HTTP loopback dependencies.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));

    // Shared secret check: Ensure only authorized Evolution instance can trigger chat events
    // No hardcoded fallback — fails closed when env is unset (all known callers send headers).
    const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET || process.env.EVOLUTION_API_KEY || '';
    // Note: the Evolution instance name is intentionally NOT an auth input —
    // it is public knowledge and can be forged in event bodies.
    const providedHeaderSecret =
      req.headers.get('x-webhook-secret') ||
      req.headers.get('apikey') ||
      req.headers.get('x-api-key') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      req.nextUrl.searchParams.get('secret') ||
      req.nextUrl.searchParams.get('token');

    const providedBodySecret =
      payload.apikey ||
      payload.secret ||
      payload.token ||
      payload.webhook_secret;

    const isSecretValid = Boolean(expectedSecret) && (
      safeCompare(providedHeaderSecret || '', expectedSecret) ||
      safeCompare(providedBodySecret || '', expectedSecret)
    );

    // FAIL CLOSED: the secret is required. An instance-name match is never an
    // acceptable substitute — the instance name is public knowledge, so
    // accepting it alone would let anyone forge webhook events, spook the
    // bot-owner workflow, and mint admin magic links.
    if (!isSecretValid) {
      log.warn(
        `[WhatsApp Webhook] Blocked unauthorized request. Secret provided: ${Boolean(providedHeaderSecret || providedBodySecret)}`
      );
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid Evolution webhook secret.' },
        { status: 401 }
      );
    }

    const rawEvent = String(payload.event || '').toLowerCase().replace(/_/g, '.').replace(/-/g, '.');
    const data = payload.data || payload;

    // Ignore non-upsert events if event name is supplied
    if (rawEvent && !rawEvent.includes('messages.upsert')) {
      return NextResponse.json({ success: true, message: `Ignored event: ${payload.event}` });
    }

    const key = data.key || {};
    const rawRemoteJid = key.remoteJid || data.remoteJid || payload.sender || '';

    if (rawRemoteJid && rawRemoteJid.includes('@g.us')) {
      // Ignore group messages
      return NextResponse.json({ success: true, message: 'Ignored group message' });
    }

    // Message ID for deduplication and read receipts
    const messageId = String(key.id || data.id || payload.id || '').trim();

    // Unwrap message structure (handles standard, ephemeral, viewOnce, and nested wrappers)
    const msg =
      data.message?.ephemeralMessage?.message ||
      data.message?.viewOnceMessage?.message ||
      data.message?.viewOnceMessageV2?.message ||
      data.message ||
      {};

    // Extract incoming message text robustly
    let incomingText = '';
    if (msg.conversation) {
      incomingText = msg.conversation;
    } else if (msg.extendedTextMessage?.text) {
      incomingText = msg.extendedTextMessage.text;
    } else if (msg.text) {
      incomingText = msg.text;
    } else if (msg.imageMessage?.caption) {
      incomingText = msg.imageMessage.caption;
    } else if (msg.documentMessage?.caption) {
      incomingText = msg.documentMessage.caption;
    } else if (typeof data.text === 'string') {
      incomingText = data.text;
    } else if (typeof payload.text === 'string') {
      incomingText = payload.text;
    } else if (msg.buttonsResponseMessage?.selectedButtonId) {
      incomingText = msg.buttonsResponseMessage.selectedButtonId;
    } else if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) {
      incomingText = msg.listResponseMessage.singleSelectReply.selectedRowId;
    } else if (msg.templateButtonReplyMessage?.selectedId) {
      incomingText = msg.templateButtonReplyMessage.selectedId;
    }

    incomingText = incomingText.trim();
    if (!incomingText) {
      return NextResponse.json({ success: true, message: 'Empty text' });
    }

    const trimmed = incomingText.trim();
    const lower = trimmed.toLowerCase();

    // Check if this is an admin trigger or bot command
    const cleanMsg = trimmed.replace(/^[\!\/]/, '').trim().toLowerCase();
    const rawCmd = cleanMsg.split(/\s+/)[0];
    const hasPin = Boolean(process.env.ADMIN_BOT_PIN) && cleanMsg.includes(String(process.env.ADMIN_BOT_PIN));
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

    const hasCommandPrefix = trimmed.startsWith('/') || trimmed.startsWith('!') || trimmed.startsWith('.');
    const isDirectPinOrId = /^[A-Za-z]\d{9}[A-Za-z]$/.test(trimmed) || /^\d{6,9}$/.test(trimmed);
    const isKnownBotCommand = ['kra', 'cyber', 'status', 'days', 'sub', 'help', 'menu', 'start', 'cancel', 'reset', 'stop', 'exit', 'invoice', 'invoices', 'receipt', 'renew', 'recheck', 'verify', 'paid', '0'].includes(rawCmd);
    const isExplicitBotIntent = hasCommandPrefix || isDirectPinOrId || isKnownBotCommand;

    const isAdminTrigger =
      (hasCommandPrefix && (rawCmd === 'admin' || adminCmds.includes(rawCmd))) ||
      hasPin;

    // If message was sent from the bot account (fromMe = true):
    // Only process if it is an explicit admin command, bot command, or direct lookup trigger.
    // Regular automated outbound bot replies without command intent are ignored to prevent loops.
    if (key.fromMe && !isAdminTrigger && !isExplicitBotIntent) {
      return NextResponse.json({ success: true, message: 'Ignored normal outbound message' });
    }

    const BOT_OWNER_NUMBER = '254791497858';

    let userPhone = '';

    if (key.fromMe) {
      // Outbound message or self-chat ("Message Yourself") from the bot instance.
      // If sent to another WhatsApp user, this is an automated outbound reply — ignore to avoid loops.
      if (!rawRemoteJid.includes(BOT_OWNER_NUMBER)) {
        return NextResponse.json({ success: true, message: 'Ignored outbound message to customer' });
      }

      // If sent in self-chat ("Message Yourself"), only process if it is an explicit admin command or bot intent
      if (!isAdminTrigger && !isExplicitBotIntent) {
        return NextResponse.json({ success: true, message: 'Ignored normal outbound message' });
      }

      userPhone = BOT_OWNER_NUMBER;
    } else {
      // Inbound message from a customer/external contact (fromMe = false).
      // In 1-on-1 chats, rawRemoteJid (key.remoteJid) is the customer's WhatsApp JID.
      // NOTE: NEVER use root payload.sender here — in Evolution API, payload.sender is the
      // connected bot instance phone (254791497858), which would hijack customer chats!
      let resolvedJid = rawRemoteJid;

      // If remoteJid is a WhatsApp local identity (@lid), search for the real phone in data fields
      if (resolvedJid.includes('@lid')) {
        const candidatePhone = [
          data.sender,
          data.participant,
          key.participant,
        ].find((s) => s && String(s).includes('@s.whatsapp.net') && !String(s).includes(BOT_OWNER_NUMBER));

        if (candidatePhone) {
          resolvedJid = String(candidatePhone);
        }
      }

      userPhone = sanitizeWhatsAppPhone(resolvedJid);
      if (userPhone.includes('@lid')) {
        userPhone = userPhone.replace(/@lid$/, '');
      }

      if (!userPhone) {
        return NextResponse.json({ success: false, error: 'Could not resolve sender phone' }, { status: 400 });
      }
    }

    // KDPA: neither the phone nor the message body (users send National IDs,
    // KRA PINs, payment references) goes into logs verbatim. Log a masked
    // phone, the message length, and the invoking command token only.
    const commandToken = incomingText.trim().split(/\s+/)[0] || '';
    log.info(
      `[WhatsApp Webhook Inbound] From: ${maskPhone(userPhone)} (fromMe: ${Boolean(key.fromMe)}), Len: ${incomingText.length}, Cmd: ${commandToken.slice(0, 16)}`
    );

    const instanceName = String(payload.instance || data.instance || '').trim() || undefined;

    // Owner identity derives ONLY from the bot owner number when sent via fromMe
    const resolvedOwner = Boolean(userPhone === BOT_OWNER_NUMBER && key.fromMe);

    // Execute state machine directly in-process
    const chatResult = await handleWhatsAppChat({
      phone: userPhone,
      message: incomingText,
      messageId,
      sendDirect: true,
      authorPhone: userPhone,
      isFromBotOwner: resolvedOwner,
      instanceName,
    });

    if ((chatResult as any)?.isDuplicate) {
      log.info(`[WhatsApp Webhook] Duplicate message ${messageId} already handled.`);
      return NextResponse.json({ success: true, message: 'Duplicate message already handled' });
    }

    // Mark message as read (blue ticks) ONLY when the bot actively handled or responded to the message.
    // When the bot remains idle (e.g. casual inbound text with no command trigger), do NOT mark as read.
    if ((chatResult as any)?.shouldReply !== false && (chatResult as any)?.reply) {
      await markEvolutionMessageRead({
        remoteJid: rawRemoteJid || `${userPhone}@s.whatsapp.net`,
        messageId: key.id,
        instanceName,
      });
    }

    const pendingCheckoutId = (chatResult as any)?.metadata?.checkoutId;
    const isAwaitingPayment =
      (chatResult as any)?.step === 'AWAITING_PAYMENT' ||
      (chatResult as any)?.step === 'CYBER_AWAITING_PAYMENT';

    // If an STK push was just dispatched and we are waiting for payment,
    // actively monitor M-Pesa in background so delivery happens AUTOMATICALLY
    // the moment the user enters their PIN on their phone!
    if (isAwaitingPayment && pendingCheckoutId) {
      after(async () => {
        log.info(`[WhatsApp Webhook after] Actively monitoring M-Pesa payment for ${pendingCheckoutId} (${userPhone})`);
        const { fulfillWhatsAppCertificateDelivery } = await import('@/lib/certificate-fulfillment');
        const prismaModule = await import('@/lib/prisma');
        const db = prismaModule.default as any;

        const maxDurationMs = 55000; // 55 seconds active monitoring
        const intervalMs = 2500; // poll every 2.5 seconds
        const startTime = Date.now();

        while (Date.now() - startTime < maxDurationMs) {
          await new Promise((r) => setTimeout(r, intervalMs));
          try {
            const conv = await db.ai_conversations?.findFirst({
              where: {
                channel: 'whatsapp',
                user_phone: userPhone,
              },
            });

            if (conv && conv.metadata?.step === 'COMPLETED') {
              log.info(`[WhatsApp Webhook after] Session already COMPLETED for ${pendingCheckoutId}. Exiting.`);
              break;
            }

            let isPaid = false;
            let mpesaReceipt = '';
            let amountKes = 20;

            // 1. Check if DB recorded certificate download via webhook or callback
            if (typeof db.certificateDownload?.findFirst === 'function') {
              const dl = await db.certificateDownload.findFirst({
                where: {
                  OR: [
                    { mpesaReceipt: pendingCheckoutId },
                    { clerkId: `wa_${userPhone.replace(/[^a-zA-Z0-9]/g, '')}` },
                  ],
                },
                orderBy: { createdAt: 'desc' },
              });
              if (
                dl &&
                (dl.mpesaReceipt === pendingCheckoutId ||
                  (conv?.metadata?.pin && dl.pin === conv.metadata.pin && Date.now() - new Date(dl.createdAt).getTime() < 300000))
              ) {
                isPaid = true;
                mpesaReceipt = dl.mpesaReceipt || pendingCheckoutId;
                amountKes = Number(dl.amountCharged) || 20;
              }
            }

            // 1b. Check if DB recorded cyberInvoice
            if (!isPaid && typeof db.cyberInvoice?.findFirst === 'function') {
              const inv = await db.cyberInvoice.findFirst({
                where: {
                  OR: [
                    { checkoutId: pendingCheckoutId },
                    { mpesaReceipt: pendingCheckoutId },
                  ],
                },
              });
              if (inv) {
                isPaid = true;
                mpesaReceipt = inv.mpesaReceipt || pendingCheckoutId;
                amountKes = 500;
              }
            }

            // 2. Check global in-memory Daraja callback cache
            if (!isPaid && typeof (global as any).mpesaCallbacks !== 'undefined') {
              const cb = (global as any).mpesaCallbacks?.get(pendingCheckoutId);
              if (cb && cb.ResultCode === 0) {
                isPaid = true;
                mpesaReceipt = cb.MpesaReceiptNumber || pendingCheckoutId;
                amountKes = cb.Amount || 500;
              }
            }

            // 3. Check Paystack verification (if checkoutId is PSTK-... or CERT-...)
            if (!isPaid && (pendingCheckoutId.startsWith('PSTK-') || pendingCheckoutId.startsWith('CERT-') || pendingCheckoutId.startsWith('CYBER-'))) {
              try {
                const { verifyPaystackTransaction } = await import('@/lib/paystack');
                const tx = await verifyPaystackTransaction(pendingCheckoutId);
                if (tx && tx.status === 'success') {
                  isPaid = true;
                  mpesaReceipt = tx.reference || `PSTK_${pendingCheckoutId}`;
                  amountKes = tx.amountKes || 20;
                }
              } catch (verifyErr: any) {
                // Ignore transient network errors during polling
              }
            }

            if (isPaid) {
              log.info(`[WhatsApp Webhook after] Payment verified for ${pendingCheckoutId}! Initiating fulfillment.`);

              const isCyberPayment = conv?.metadata?.step === 'CYBER_AWAITING_PAYMENT';

              if (isCyberPayment) {
                log.info(`[WhatsApp Webhook after] Activating Cyber Cafe subscription for ${userPhone} (ref: ${mpesaReceipt})`);
                const { activateCyberCafeSubscription, deliverCyberInvoiceToWhatsApp } = await import('@/lib/cyber-subscription');
                const { sendEvolutionTextMessage } = await import('@/lib/evolution');

                const activation = await activateCyberCafeSubscription({
                  cafeName: conv?.metadata?.cyberCafeName || 'Cyber Cafe',
                  ownerName: conv?.metadata?.cyberOwnerName || 'Cyber Operator',
                  whatsappPhone: conv?.metadata?.cyberWaPhone || userPhone,
                  paymentPhone: conv?.metadata?.paymentPhone || userPhone,
                  mpesaReceipt,
                  checkoutId: pendingCheckoutId,
                  amountKes: 500,
                });

                if (conv && typeof db.ai_conversations?.update === 'function') {
                  await db.ai_conversations
                    .update({
                      where: { id: conv.id },
                      data: {
                        metadata: {
                          ...(conv.metadata || {}),
                          step: 'IDLE',
                          activeSession: false,
                          mpesaReceipt,
                        },
                      },
                    })
                    .catch(() => {});
                }

                if (activation.success && activation.invoice && activation.cafe) {
                  await deliverCyberInvoiceToWhatsApp({
                    whatsappPhone: userPhone,
                    invoice: activation.invoice,
                    cafe: activation.cafe,
                    daysRemaining: activation.daysRemaining,
                  });

                  await sendEvolutionTextMessage(
                    userPhone,
                    `🎉 *CYBER CAFE SUBSCRIPTION ACTIVATED!*\n` +
                    `────────────────────────────────────\n` +
                    `• *Cyber Cafe:* ${activation.cafe.cafeName}\n` +
                    `• *Operator:* ${activation.cafe.ownerName}\n` +
                    `• *Activated WhatsApp:* ${activation.cafe.whatsappPhone}\n` +
                    `• *Package:* 30 Days Unlimited Retrieval\n` +
                    `• *Status:* 🟢 ACTIVE (*${activation.daysRemaining} Days Remaining*)\n` +
                    `• *M-Pesa Receipt:* \`${mpesaReceipt}\`\n` +
                    `• *Official Tax Invoice:* Delivered above as PDF\n\n` +
                    `⚡ *Instant Delivery Active:* Simply enter any client's National ID Number or KRA PIN anytime to receive instant PIN certificates!`
                  );
                }
                break;
              }

              // Update session in DB so it doesn't trigger duplicate delivery
              if (conv && typeof db.ai_conversations?.update === 'function') {
                await db.ai_conversations
                  .update({
                    where: { id: conv.id },
                    data: {
                      metadata: {
                        ...(conv.metadata || {}),
                        step: 'COMPLETED',
                        activeSession: false,
                        mpesaReceipt,
                      },
                    },
                  })
                  .catch(() => {});
              }

              await fulfillWhatsAppCertificateDelivery({
                phone: userPhone,
                pin: conv?.metadata?.pin || (chatResult as any)?.metadata?.pin || 'KRA_CERT',
                checkoutId: pendingCheckoutId,
                mpesaReceipt: mpesaReceipt || `MPESA_${pendingCheckoutId}`,
                amount: amountKes,
                taxpayerName: conv?.metadata?.taxpayerName || (chatResult as any)?.metadata?.taxpayerName,
                taxpayerDetails: conv?.metadata?.taxpayerDetails || (chatResult as any)?.metadata?.taxpayerDetails,
              });
              break;
            }
          } catch (pollErr: any) {
            log.warn('[WhatsApp Webhook after polling notice]:', pollErr.message);
          }
        }
      });
    }

    return NextResponse.json(chatResult);
  } catch (error: any) {
    log.error('[WhatsApp Webhook Handler Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
