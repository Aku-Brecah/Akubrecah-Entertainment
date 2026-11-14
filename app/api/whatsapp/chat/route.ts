import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { safeCompare } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';
import { sanitizeWhatsAppPhone, sendEvolutionTextMessage, sendEvolutionDocument } from '@/lib/evolution';
import { fetchTaxpayerById, fetchTaxpayerByPin } from '@/lib/kra-api';
import { maskTaxpayerData } from '@/lib/masking';
import {
  dispatchMpesaStkPush,
  normalizePhoneNumber,
  queryMpesaStkPushStatus,
  findRecentSuccessfulMpesaPayment,
} from '@/lib/whatsapp/mpesa-dispatch';
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
import { extractKenyanPhone, formatDisplayPhone } from '@/lib/whatsapp/phone';
import { triggerInAppMpesaPayment, triggerCyberCafePayment } from '@/lib/whatsapp/payments';
import { handleAdminBotCommand } from '@/lib/whatsapp/admin-commands';
import { handleTaxpayerFoundFulfillment } from '@/lib/whatsapp/fulfillment';
import { parseWhatsAppCommand, validateWhatsAppTrigger, SESSION_TIMEOUT_MS } from '@/lib/whatsapp/commands';

export const maxDuration = 60;

export async function handleWhatsAppChat(params: {
  phone: string;
  message: string;
  messageId?: string;
  sendDirect?: boolean;
  authorPhone?: string;
  isFromBotOwner?: boolean;
  instanceName?: string;
}) {
  const { phone: rawPhone, message: rawMessage, messageId, sendDirect = true, authorPhone, isFromBotOwner, instanceName } = params;

  if (!rawPhone || !rawMessage) {
    return { success: false, error: 'Both phone and message are required.' };
  }

  try {
    const userPhone = sanitizeWhatsAppPhone(rawPhone);
    const incomingText = String(rawMessage).trim();
    const lowerText = incomingText.toLowerCase();
    const db = prisma as any;

    // Strict trigger validation: only activate on leading '.' or '/'
    const triggerValidation = validateWhatsAppTrigger(incomingText, {
      messageId,
    });

    if (triggerValidation.shouldIgnore) {
      log.info(`[WhatsApp Chat] Dormant - message ignored (${triggerValidation.reason}) for phone ***${userPhone.slice(-3)}`);
      return {
        success: true,
        userPhone,
        step: 'IDLE',
        reply: '',
        shouldReply: false,
        metadata: { step: 'IDLE' },
        sendResult: null,
      };
    }

    // Deduplication check: If this exact message ID was already processed, ignore to prevent duplicate responses
    if (messageId && isDuplicateWhatsAppMessage(messageId)) {
      log.info(`[WhatsApp Chat] Duplicate message ${messageId} from phone ***${userPhone.slice(-3)} ignored.`);
      return {
        success: true,
        userPhone,
        step: 'DUPLICATE',
        reply: '',
        isDuplicate: true,
      };
    }

    // 1. Fetch or initialize conversation state in Prisma (with in-memory fallback when DB is unavailable)
    let conversation: any = null;
    try {
      conversation = await db.ai_conversations?.findFirst({
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
    } catch (dbErr: any) {
      log.warn('[WhatsApp Chat] DB conversation lookup unavailable, using transient session:', dbErr?.message || dbErr);
    }

    if (!conversation) {
      conversation = {
        id: 'wa_' + userPhone + '_' + Date.now(),
        channel: 'whatsapp',
        user_phone: userPhone,
        status: 'active',
        metadata: { step: 'IDLE' },
      };
    }

    const metadata: Record<string, any> = (conversation.metadata as Record<string, any>) || { step: 'IDLE' };
    let replyText = '';
    let nextStep = metadata.step || 'IDLE';

    async function saveConversationState(newStep: string, extraMeta: Record<string, any> = {}) {
      metadata.step = newStep;
      metadata.lastActiveAt = Date.now();
      metadata.activeSession = newStep !== 'IDLE' && newStep !== 'COMPLETED';
      Object.assign(metadata, extraMeta);

      try {
        await db.ai_conversations?.update({
          where: { id: conversation.id },
          data: {
            metadata,
            updated_at: new Date(),
          },
        });
      } catch (saveErr: any) {
        log.warn('[WhatsApp Chat] DB state save unavailable, continuing with in-memory state:', saveErr?.message || saveErr);
      }
      nextStep = newStep;
    }

    const lastActiveAt = Number(metadata.lastActiveAt || (conversation.updated_at ? new Date(conversation.updated_at).getTime() : 0));
    // Strict 7-minute inactivity timeout (TTL) from lib/whatsapp/commands
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
    const { hasCommandPrefix, cleanCmdText, cleanCmdWord, cleanCmdArgs, isAllowlisted } =
      parseWhatsAppCommand(incomingText);

    // If session just expired and user sent a follow-up answer (not a fresh command), inform them of expiry
    if (isSessionExpired && wasSessionActive && !hasCommandPrefix) {
      const expiredReply =
        `⏱️ *Session Expired*\n` +
        `─────────────────────────\n` +
        `Your previous session timed out after 7 minutes of inactivity for your privacy.\n\n` +
        `To start again, please send a supported command:\n` +
        `• */kra* - KRA PIN retrieval & certificate\n` +
        `• */cyber* - Cyber Cafe monthly subscription (KES 500)\n` +
        `• */status* - Check subscription status\n` +
        `• */help* - View all commands\n\n` +
        `🌐 *Web Portal:* https://kra.akubrecah.com`;

      let sendResult = null;
      if (sendDirect) {
        sendResult = await sendEvolutionTextMessage(userPhone, expiredReply, instanceName);
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
    if (!isAllowlisted) {
      const unknownCmdReply =
        `❓ *Unknown Command*\n` +
        `─────────────────────────\n` +
        `The command \`${cleanCmdWord}\` is not recognized.\n\n` +
        `*Supported Commands:*\n` +
        `• *.kra* or */kra* - KRA PIN retrieval & certificate\n` +
        `• *.cyber* or */cyber* - Cyber Cafe monthly subscription (KES 500)\n` +
        `• *.status* or */status* - Check subscription status\n` +
        `• *.invoice* or */invoice* - Download official tax invoice PDF\n` +
        `• *.help* or */help* - Instructions & support\n` +
        `• *.cancel* or */cancel* - Cancel active session\n\n` +
        `🌐 *Web Portal:* https://kra.akubrecah.com`;

      let sendResult = null;
      if (sendDirect) {
        sendResult = await sendEvolutionTextMessage(userPhone, unknownCmdReply, instanceName);
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
        sendResult = await sendEvolutionTextMessage(userPhone, adminReply, instanceName);
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

    // Direct National ID or KRA PIN detection (e.g. .11530093 or .A012345678Z)
    const isDirectPin = /^[A-Za-z]\d{9}[A-Za-z]$/.test(cleanCmdWord) || /^[A-Za-z]\d{9}[A-Za-z]$/.test(cleanCmdArgs);
    const isDirectId = /^\d{6,9}$/.test(cleanCmdWord) || /^\d{6,9}$/.test(cleanCmdArgs);
    const isStandaloneHelp =
      ['help', 'menu', 'start', 'commands', 'assist', 'huduma'].includes(cleanCmdWord);
    const isStandaloneKra =
      cleanCmdWord === 'kra' ||
      cleanCmdWord === 'pin' ||
      cleanCmdWord === 'certificate';
    const isStandaloneCyber = ['cyber', 'subscribe', 'package'].includes(cleanCmdWord);
    const isStandaloneStatus = ['status', 'days', 'sub'].includes(cleanCmdWord);

    // Universal Cancellation: .cancel, /cancel, .exit, /exit, .stop, /stop, .reset, /reset, .0, /0
    const isCancelRequest =
      ['cancel', 'exit', 'stop', 'reset', 'abort', '0'].includes(cleanCmdWord);

    const isMpesaReceipt =
      /^[A-Z]{2}[A-Z0-9]{8}$/i.test(cleanCmdArgs || cleanCmdWord) &&
      !isDirectPin &&
      !/^(07|01|254|\d)/.test(cleanCmdArgs || cleanCmdWord);

    // Universal Payment Recheck Trigger: .paid, .recheck, .confirm, .verify
    const isPaymentRecheckTrigger =
      ['paid', 'nimepay', 'nimelipa', 'confirm', 'recheck', 'verify', 'payment', 'lipa', 'done'].includes(cleanCmdWord) ||
      cleanCmdText.startsWith('paid ') ||
      cleanCmdText.startsWith('recheck ') ||
      /^PSTK-[A-Z0-9\-]+$/i.test(cleanCmdArgs) ||
      isMpesaReceipt;

    const isBotTrigger = hasCommandPrefix;

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
        sendResult = await sendEvolutionTextMessage(userPhone, cancelReply, instanceName);
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

    const isPhoneInputStep =
      currentStep === 'AWAITING_PAYMENT_PHONE' ||
      currentStep === 'AWAITING_PHONE_NUMBER' ||
      currentStep === 'CYBER_REG_PHONE' ||
      currentStep === 'CYBER_REG_PAYMENT_PHONE';

    if (
      isPaymentRecheckTrigger &&
      !isPhoneInputStep &&
      currentStep !== 'AWAITING_PAYMENT' &&
      currentStep !== 'CYBER_AWAITING_PAYMENT'
    ) {
      const targetArg = cleanCmdArgs || trimmedInput.split(/\s+/).slice(1).join(' ').trim();
      const extractedPhone = extractKenyanPhone(targetArg);
      const queryPhone = extractedPhone || metadata.paymentPhone || userPhone;

      const isPinArg = /^[A-Z]\d{9}[A-Z]$/i.test(targetArg);
      const isRefArg =
        targetArg.startsWith('ws_CO_') ||
        (/^[A-Z]{2}[A-Z0-9]{8}$/i.test(targetArg) && !isDirectPin && !/^(07|01|254|\d)/.test(targetArg));
      const queryPin = (isPinArg ? targetArg.toUpperCase() : null) || metadata.pin;
      const queryRef = (isRefArg ? targetArg : null) || metadata.checkoutId;

      const payment = await findRecentSuccessfulMpesaPayment({
        phone: queryPhone,
        pin: queryPin,
        reference: queryRef,
        maxAgeMinutes: 180,
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
        log.warn('[Payment Recheck Trigger] DB lookup notice:', err.message);
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
            sendRes = await sendEvolutionTextMessage(userPhone, successReply, instanceName);
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
            sendRes = await sendEvolutionTextMessage(userPhone, needPinReply, instanceName);
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
          sendRes = await sendEvolutionTextMessage(userPhone, notFoundReply, instanceName);
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

    // 3. Process Bot Commands (triggered exclusively with strict . or / prefix)
    if (isBotTrigger) {
      let cmdWord = cleanCmdWord;
      let cmdArgs = cleanCmdArgs;

      if (isDirectPin || isDirectId) {
        cmdWord = 'kra';
        cmdArgs = cleanCmdArgs || cleanCmdWord;
      }

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
        // Direct search: /kra <ID_OR_PIN> or /pin <ID_OR_PIN> [optional phone]
        if (cmdArgs) {
          const rawTokens = cmdArgs.trim().split(/\s+/);
          const firstToken = rawTokens[0] ? rawTokens[0].replace(/^(id|national\s*id|pin|kra\s*pin)[\s:]+/i, '').trim() : '';
          const secondToken = rawTokens[1] ? rawTokens[1].trim() : '';
          const explicitPhone = extractKenyanPhone(secondToken);

          const cleanArg = firstToken;
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
              log.warn('[WhatsApp KRA Direct Lookup Notice]:', kraError.message);
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
              // Fulfill instantly if Cyber Cafe subscriber, else trigger STK push
              replyText = await handleTaxpayerFoundFulfillment({
                userPhone,
                taxpayer,
                idOrPinInput: cleanArg,
                saveConversationState,
                explicitPaymentPhone: explicitPhone || undefined,
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
      const rawTokens = incomingText.trim().split(/\s+/);
      const firstToken = rawTokens[0] ? rawTokens[0].replace(/^(id|national\s*id|pin|kra\s*pin)[\s:]+/i, '').trim() : '';
      const secondToken = rawTokens[1] ? rawTokens[1].trim() : '';
      const explicitPhone = extractKenyanPhone(secondToken);

      const cleanInput = firstToken;
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
          log.warn('[WhatsApp KRA Lookup Notice]:', kraError.message);
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
          // Fulfill instantly if Cyber Cafe subscriber, else trigger STK push
          replyText = await handleTaxpayerFoundFulfillment({
            userPhone,
            taxpayer,
            idOrPinInput: cleanInput,
            saveConversationState,
            explicitPaymentPhone: explicitPhone || undefined,
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
              sendResult: sendDirect ? await sendEvolutionTextMessage(userPhone, replyText, instanceName) : null,
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
              sendResult: sendDirect ? await sendEvolutionTextMessage(userPhone, replyText, instanceName) : null,
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
            if (cb && (cb.status === 'success' || cb.resultCode === 0 || cb.ResultCode === 0)) {
              isPaid = true;
              verifiedReceipt = cb.metadata?.mpesaReceiptNumber || cb.MpesaReceiptNumber || metadata.checkoutId;
            }
          }

          if (!isPaid && metadata.checkoutId.startsWith('ws_CO_')) {
            const darajaStatus = await queryMpesaStkPushStatus(metadata.checkoutId);
            if (darajaStatus.status === 'success') {
              const cb = (global as any).mpesaCallbacks?.[metadata.checkoutId];
              isPaid = true;
              verifiedReceipt = cb?.metadata?.mpesaReceiptNumber || cb?.MpesaReceiptNumber || metadata.checkoutId;
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

        // Check durable Daraja MpesaTransaction table for Cyber Cafe subscription payment
        if (!isPaid) {
          try {
            const foundMpesa = await findRecentSuccessfulMpesaPayment({
              phone: activePayPhone || userPhone,
              reference: metadata.checkoutId,
              minAmountKes: 500,
              maxAgeMinutes: 90,
            });
            if (foundMpesa.found && (foundMpesa.amountKes || 0) >= 500) {
              isPaid = true;
              verifiedReceipt = foundMpesa.reference || metadata.checkoutId;
            }
          } catch (err: any) {
            log.warn('[Cyber Daraja Verify Notice]:', err.message);
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
    // 6. Step AWAITING_PAYMENT_PHONE / AWAITING_PHONE_NUMBER: User confirmed record and must enter payment phone number
    else if (currentStep === 'AWAITING_PAYMENT_PHONE' || currentStep === 'AWAITING_PHONE_NUMBER') {
      const pinToDownload = metadata.pin;
      const downloadFee = Number(metadata.fee || process.env.MPESA_DOWNLOAD_FEE_KES || 20);

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
        });
        replyText =
          `✅ *Operation Cancelled*\n` +
          `─────────────────────────\n` +
          `The KRA assistant is now idle.\n\n` +
          `Send *.kra* or */kra* whenever you want to start again.\n` +
          `🌐 *Web Portal:* https://kra.akubrecah.com`;
      } else {
        let targetPay = userPhone;
        const isSame = lowerText === 'same' || lowerText === 'this' || lowerText === 'here';

        if (isSame) {
          const extractedSame = extractKenyanPhone(userPhone);
          if (!extractedSame) {
            replyText =
              `⚠️ *Safaricom Number Required*\n` +
              `─────────────────────────\n` +
              `Your WhatsApp account is connected via a private link. Please reply with your 10-digit M-Pesa phone number to receive the prompt:\n\n` +
              `👉 Example: *0712345678* or *0112345678*\n\n` +
              `─────────────────────────\n` +
              `_(Reply *0* to cancel)_`;

            let sendResult = null;
            if (sendDirect) {
              sendResult = await sendEvolutionTextMessage(userPhone, replyText, instanceName);
            }
            return {
              success: true,
              userPhone,
              step: currentStep,
              reply: replyText,
              metadata,
              sendResult,
            };
          }
          targetPay = extractedSame;
        } else {
          const extracted = extractKenyanPhone(incomingText);
          if (!extracted) {
            const display = formatDisplayPhone(userPhone);
            replyText =
              `⚠️ *Invalid Phone Number*\n` +
              `─────────────────────────\n` +
              `Please reply with a valid 10-digit Kenyan Safaricom phone number to receive the payment prompt:\n\n` +
              `👉 Example: *0712345678* or *0112345678*\n` +
              (display ? `👉 Or reply *SAME* to use this WhatsApp number (\`${display}\`)\n\n` : `\n`) +
              `─────────────────────────\n` +
              `_(Reply *0* to cancel)_`;

            let sendResult = null;
            if (sendDirect) {
              sendResult = await sendEvolutionTextMessage(userPhone, replyText, instanceName);
            }
            return {
              success: true,
              userPhone,
              step: currentStep,
              reply: replyText,
              metadata,
              sendResult,
            };
          }
          targetPay = extracted;
        }

        const stkRes = await triggerInAppMpesaPayment({
          targetPhone: targetPay,
          whatsappUserPhone: userPhone,
          pin: pinToDownload,
          amount: downloadFee,
          taxpayerName: metadata.taxpayerName,
        });

        await saveConversationState('AWAITING_PAYMENT', {
          activeSession: true,
          pin: pinToDownload,
          idNumber: metadata.idNumber,
          taxpayerName: metadata.taxpayerName,
          taxpayerDetails: metadata.taxpayerDetails,
          checkoutId: stkRes.checkoutRequestId || '',
          paymentPhone: stkRes.normalizedPhone,
          stkGateway: stkRes.gateway,
          pushedAt: Date.now(),
        });

        if (stkRes.success) {
          replyText =
            `📲 *M-PESA PAYMENT PROMPT SENT*\n` +
            `─────────────────────────\n` +
            `💰 *Amount:* KES ${downloadFee}.00\n` +
            `📱 *Payment Handset:* \`${stkRes.normalizedPhone}\`\n` +
            `🆔 *KRA PIN:* \`${pinToDownload}\`\n` +
            `─────────────────────────\n` +
            `👉 *Enter your M-Pesa PIN* on \`${stkRes.normalizedPhone}\` to complete retrieval.\n\n` +
            `Your official KRA PIN Certificate and fiscal receipt will be delivered right here in this chat.\n\n` +
            `─────────────────────────\n` +
            `_Reply 1 to resend prompt | Send another number | Reply 0 to cancel_`;
        } else {
          replyText =
            `⚠️ *Could not send M-Pesa prompt:* ${stkRes.error || 'Network error'}.\n\n` +
            `👉 Send another Safaricom phone number (e.g. *0712345678*) or reply *0* to cancel.\n\n` +
            `🌐 Prefer web download? Visit:\n` +
            `🔗 https://kra.akubrecah.com`;
        }
      }
    }
    // 7. Step AWAITING_PAYMENT / AWAITING_PAYMENT_METHOD / AWAITING_CONFIRMATION (Per-download)
    else if (
      currentStep === 'AWAITING_PAYMENT' ||
      currentStep === 'AWAITING_PAYMENT_METHOD' ||
      currentStep === 'AWAITING_CONFIRMATION'
    ) {
      const pinToDownload = metadata.pin;
      const downloadFee = Number(process.env.MPESA_DOWNLOAD_FEE_KES || 20);
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
          log.warn('[WhatsApp Chat] DB payment check notice:', dbErr.message);
        }

        // 2. Check global mpesaCallbacks (Daraja in-memory safe access) + active STK query
        if (!isPaid && metadata.checkoutId && typeof (global as any).mpesaCallbacks !== 'undefined') {
          const rawCb = (global as any).mpesaCallbacks;
          const cb = rawCb?.[metadata.checkoutId] || (typeof rawCb?.get === 'function' ? rawCb.get(metadata.checkoutId) : undefined);
          if (cb && (cb.status === 'success' || cb.resultCode === 0 || cb.ResultCode === 0)) {
            isPaid = true;
            verifiedReceipt = cb.metadata?.mpesaReceiptNumber || cb.MpesaReceiptNumber || metadata.checkoutId;
          }
        }

        if (!isPaid && metadata.checkoutId?.startsWith('ws_CO_')) {
          const darajaStatus = await queryMpesaStkPushStatus(metadata.checkoutId);
          if (darajaStatus.status === 'success') {
            const cb = (global as any).mpesaCallbacks?.[metadata.checkoutId];
            isPaid = true;
            verifiedReceipt = cb?.metadata?.mpesaReceiptNumber || cb?.MpesaReceiptNumber || metadata.checkoutId;
          }
        }

        // 3. Check durable MpesaTransaction ledger in PostgreSQL
        if (!isPaid) {
          try {
            const foundMpesa = await findRecentSuccessfulMpesaPayment({
              phone: activePayPhone || userPhone,
              pin: pinToDownload,
              reference: metadata.checkoutId,
              minAmountKes: downloadFee,
              maxAgeMinutes: 90,
            });
            if (foundMpesa.found && foundMpesa.reference) {
              isPaid = true;
              verifiedReceipt = foundMpesa.reference;
            }
          } catch (err: any) {
            log.warn('[WhatsApp Chat] Daraja DB verify notice:', err.message);
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
      sendResult = await sendEvolutionTextMessage(userPhone, replyText, instanceName);
    }

    return {
      success: true,
      userPhone,
      step: nextStep,
      reply: replyText,
      shouldReply: Boolean(replyText),
      metadata,
      sendResult,
    };
  } catch (error: any) {
    log.error('[WhatsApp Chat Route Error]:', error);
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

    if (!providedSecret || !expectedSecret || !safeCompare(providedSecret, expectedSecret)) {
      log.warn('[WhatsApp Chat] Blocked unauthorized chat trigger request. Missing or invalid secret.');
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid Evolution webhook secret.' },
        { status: 401 }
      );
    }

    const result = await handleWhatsAppChat(body);
    const status = result.success ? 200 : 400;
    return NextResponse.json(result, { status });
  } catch (error: any) {
    log.error('[WhatsApp Chat POST Handler Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
