import { log } from '@/lib/monitoring/logger';
import { safeCompare } from '@/lib/admin-auth';
import { NextRequest, NextResponse, after } from 'next/server';
import { sanitizeWhatsAppPhone, markEvolutionMessageRead } from '@/lib/evolution';
import { maskPhone } from '@/lib/masking';
import { handleWhatsAppChat } from '@/app/api/whatsapp/chat/route';
import { isDuplicateWhatsAppMessage } from '@/lib/whatsapp-dedup';
import { validateWhatsAppTrigger } from '@/lib/whatsapp/commands';

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

    const BOT_OWNER_NUMBER = (process.env.ADMIN_WHATSAPP_PHONE || '254791497858').replace(/[^0-9]/g, '');

    // Central Trigger Validation: Must begin with '.' or '/'; rejects outbound messages to contacts and bot echoes
    const triggerValidation = validateWhatsAppTrigger(incomingText, {
      fromMe: Boolean(key.fromMe),
      remoteJid: rawRemoteJid,
      messageId,
      botPhone: BOT_OWNER_NUMBER,
    });

    if (triggerValidation.shouldIgnore) {
      log.info(`[WhatsApp Webhook] Dormant - message ignored (${triggerValidation.reason})`);
      return NextResponse.json({ success: true, message: `Ignored: ${triggerValidation.reason}` });
    }

    let userPhone = '';

    if (key.fromMe) {
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
        log.info(`[WhatsApp Webhook after] Actively monitoring M-Pesa payment for ${pendingCheckoutId} (phone ***${userPhone.slice(-3)})`);
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
            let amountKes = 0;
            const isCyberFlow = conv?.metadata?.step === 'CYBER_AWAITING_PAYMENT';

            // 1. Check if DB recorded certificate download via webhook or callback (non-cyber flows only)
            if (!isCyberFlow && typeof db.certificateDownload?.findFirst === 'function') {
              const dl = await db.certificateDownload.findFirst({
                where: {
                  OR: [
                    { checkoutId: pendingCheckoutId },
                    { mpesaReceipt: pendingCheckoutId },
                  ],
                },
                orderBy: { createdAt: 'desc' },
              });
              if (dl && (!conv?.metadata?.pin || dl.pin === conv.metadata.pin)) {
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

            // 2. Check global in-memory Daraja callback cache (and active Daraja STK query fallback)
            if (!isPaid && typeof (global as any).mpesaCallbacks !== 'undefined') {
              const rawCb = (global as any).mpesaCallbacks;
              const cb =
                rawCb?.[pendingCheckoutId] ||
                (typeof rawCb?.get === 'function' ? rawCb.get(pendingCheckoutId) : undefined);
              if (cb && (cb.status === 'success' || cb.resultCode === 0 || cb.ResultCode === 0)) {
                isPaid = true;
                mpesaReceipt = cb.metadata?.mpesaReceiptNumber || cb.MpesaReceiptNumber || pendingCheckoutId;
                amountKes = cb.metadata?.amount || cb.Amount || (conv?.metadata?.step === 'CYBER_AWAITING_PAYMENT' ? 500 : 20);
              }
            }

            if (!isPaid && pendingCheckoutId.startsWith('ws_CO_')) {
              try {
                const { queryMpesaStkPushStatus } = await import('@/lib/whatsapp/mpesa-dispatch');
                const darajaStatus = await queryMpesaStkPushStatus(pendingCheckoutId);
                if (darajaStatus.status === 'success') {
                  const cb = (global as any).mpesaCallbacks?.[pendingCheckoutId];
                  isPaid = true;
                  mpesaReceipt = cb?.metadata?.mpesaReceiptNumber || cb?.MpesaReceiptNumber || pendingCheckoutId;
                  amountKes = cb?.metadata?.amount || cb?.Amount || (conv?.metadata?.step === 'CYBER_AWAITING_PAYMENT' ? 500 : 20);
                }
              } catch {
                // Ignore transient query errors during polling
              }
            }

            // 3. Check durable MpesaTransaction table in case callback was recorded on another instance
            if (!isPaid && typeof db.mpesaTransaction?.findUnique === 'function') {
              try {
                const tx = await db.mpesaTransaction.findUnique({
                  where: { checkoutRequestId: pendingCheckoutId },
                });
                if (tx && tx.status === 'COMPLETED') {
                  isPaid = true;
                  mpesaReceipt = tx.mpesaReceiptNumber || pendingCheckoutId;
                  amountKes = Number(tx.amount) || (conv?.metadata?.step === 'CYBER_AWAITING_PAYMENT' ? 500 : 20);
                }
              } catch {
                // Ignore transient DB lookup errors during polling
              }
            }

            if (isPaid) {
              log.info(`[WhatsApp Webhook after] Payment verified for ${pendingCheckoutId}! Initiating fulfillment.`);

              const isCyberPayment = conv?.metadata?.step === 'CYBER_AWAITING_PAYMENT';
              const minCyberFee = Number(process.env.MPESA_SUBSCRIPTION_AMOUNT_KES || 500);

              if (isCyberPayment) {
                if (amountKes < minCyberFee) {
                  log.warn(`[WhatsApp Webhook after] Rejected underpaid cyber activation (KES ${amountKes} < KES ${minCyberFee}) for ${pendingCheckoutId}`);
                  break;
                }
                log.info(`[WhatsApp Webhook after] Activating Cyber Cafe subscription for phone ***${userPhone.slice(-3)} (ref: ${mpesaReceipt})`);
                const { activateCyberCafeSubscription, deliverCyberInvoiceToWhatsApp } = await import('@/lib/cyber-subscription');
                const { sendEvolutionTextMessage } = await import('@/lib/evolution');

                const activation = await activateCyberCafeSubscription({
                  cafeName: conv?.metadata?.cyberCafeName || 'Cyber Cafe',
                  ownerName: conv?.metadata?.cyberOwnerName || 'Cyber Operator',
                  whatsappPhone: conv?.metadata?.cyberWaPhone || userPhone,
                  paymentPhone: conv?.metadata?.paymentPhone || userPhone,
                  mpesaReceipt,
                  checkoutId: pendingCheckoutId,
                  amountKes,
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
                    .catch(() => { });
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
                  .catch(() => { });
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
    return NextResponse.json({ success: false, error: 'Internal webhook processing error.' }, { status: 500 });
  }
}
