import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const maxDuration = 10;

// Initialize global in-memory registry if it doesn't exist.
// This is used to store payment statuses for client-side polling.
const getCallbackRegistry = (): Record<string, any> => {
  const g = global as any;
  if (!g.mpesaCallbacks) {
    g.mpesaCallbacks = {};
  }
  return g.mpesaCallbacks;
};

export async function POST(req: NextRequest) {
  try {
    // Security: validate the Daraja callback with the secret token embedded in
    // the registered callback URL (.../api/mpesa/callback?token=<secret>).
    // FAIL CLOSED: without a configured token the callback origin cannot be
    // authenticated, so every request is rejected.
    const callbackToken =
      process.env.DARAJA_CALLBACK_TOKEN || process.env.MPESA_CALLBACK_TOKEN;
    if (!callbackToken) {
      log.error('[M-Pesa Callback] REJECTED: DARAJA_CALLBACK_TOKEN / MPESA_CALLBACK_TOKEN is not configured — callbacks are fail-closed');
      return NextResponse.json(
        { success: false, error: 'Callback token not configured server-side' },
        { status: 503 }
      );
    }
    {
      // Timing-safe compare so the token cannot be probed character-wise.
      const providedToken = req.nextUrl.searchParams.get('token') || '';
      const providedBuf = Buffer.from(providedToken);
      const expectedBuf = Buffer.from(callbackToken);
      const mismatch = providedBuf.length !== expectedBuf.length
        || !crypto.timingSafeEqual(providedBuf, expectedBuf);
      if (mismatch) {
        log.error('[M-Pesa Callback] REJECTED: missing/invalid callback token — unauthenticated callback attempt');
        return NextResponse.json({ success: false, error: 'Unauthorized callback' }, { status: 401 });
      }
    }

    const payload = await req.json();
    // Daraja payloads carry the payer's phone number — log an operational
    // summary instead of the raw body (KDPA).
    const bodyScrub = payload?.Body?.stkCallback || {};
    log.info(
      '[M-Pesa Callback] Received callback:',
      JSON.stringify({
        checkoutId: bodyScrub.CheckoutRequestID,
        resultCode: bodyScrub.ResultCode,
        resultDesc: bodyScrub.ResultDesc,
        hasMetadata: Boolean(bodyScrub.CallbackMetadata),
      })
    );

    const body = payload?.Body;
    if (!body || !body.stkCallback) {
      log.warn('[M-Pesa Callback] Invalid payload structure');
      return NextResponse.json({ success: false, error: 'Invalid payload structure' }, { status: 400 });
    }

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = body.stkCallback;

    if (!CheckoutRequestID) {
      log.warn('[M-Pesa Callback] Missing CheckoutRequestID');
      return NextResponse.json({ success: false, error: 'Missing CheckoutRequestID' }, { status: 400 });
    }

    const registry = getCallbackRegistry();
    const { mapDarajaResultCodeToStatus, formatDarajaResultDesc } = await import('@/lib/whatsapp/mpesa-dispatch');

    // Parse callback metadata first so amount tampering can be validated
    // before anything is marked as paid.
    let amount = 0;
    if (CallbackMetadata && Array.isArray(CallbackMetadata.Item)) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === 'Amount' && typeof item.Value === 'number') amount = item.Value;
      }
    }

    const minCertFee = Number(process.env.MPESA_DOWNLOAD_FEE_KES || 20);
    const underpaid = ResultCode === 0 && amount > 0 && amount < minCertFee;

    if (underpaid) {
      log.error(`[M-Pesa Callback] REJECTED underpaid "success" (KES ${amount}) for ${CheckoutRequestID}`);
      registry[CheckoutRequestID] = {
        status: 'failed',
        resultCode: ResultCode,
        resultDesc: `Underpaid amount KES ${amount}`,
        timestamp: Date.now()
      };
      try {
        const prismaModule = await import('@/lib/prisma');
        const db = prismaModule.default as any;
        await db.mpesaTransaction?.updateMany({
          where: { checkoutRequestId: CheckoutRequestID },
          data: {
            status: 'FAILED',
            resultCode: Number(ResultCode),
            resultDesc: `Underpaid amount KES ${amount}`,
          },
        });
      } catch { }
      return NextResponse.json({ success: true, message: 'Underpaid callback rejected' });
    }

    // Fail closed on stripped metadata: a "success" callback with no amount
    // cannot be verified against the KES 20 price, so it must never mint a
    // paid entitlement.
    if (ResultCode === 0 && amount <= 0) {
      log.error(`[M-Pesa Callback] REJECTED "success" with no amount metadata for ${CheckoutRequestID}`);
      registry[CheckoutRequestID] = {
        status: 'failed',
        resultCode: ResultCode,
        resultDesc: 'Payment not verifiable: no amount in callback metadata',
        timestamp: Date.now()
      };
      try {
        const prismaModule = await import('@/lib/prisma');
        const db = prismaModule.default as any;
        await db.mpesaTransaction?.updateMany({
          where: { checkoutRequestId: CheckoutRequestID },
          data: {
            status: 'FAILED',
            resultCode: Number(ResultCode),
            resultDesc: 'Payment not verifiable: no amount in callback metadata',
          },
        });
      } catch { }
      return NextResponse.json(
        { success: false, error: 'Payment callback failed verification' },
        { status: 400 }
      );
    }

    if (ResultCode === 0) {
      let mpesaReceipt = '';
      let transactionDate = '';
      let phoneNumber = '';

      if (CallbackMetadata && Array.isArray(CallbackMetadata.Item)) {
        for (const item of CallbackMetadata.Item) {
          switch (item.Name) {
            case 'MpesaReceiptNumber':
              mpesaReceipt = item.Value;
              break;
            case 'TransactionDate':
              transactionDate = String(item.Value);
              break;
            case 'PhoneNumber':
              phoneNumber = String(item.Value);
              break;
          }
        }
      }

      log.info(`[M-Pesa Callback] Payment Success! Receipt: ${mpesaReceipt}, Amount: ${amount}`);

      registry[CheckoutRequestID] = {
        status: 'success',
        resultCode: ResultCode,
        ResultCode: ResultCode,
        resultDesc: ResultDesc,
        MpesaReceiptNumber: mpesaReceipt,
        Amount: amount,
        metadata: {
          amount,
          mpesaReceiptNumber: mpesaReceipt,
          transactionDate,
          phoneNumber
        },
        timestamp: Date.now()
      };

      // Process database record and deliver WhatsApp documents
      try {
        const prismaModule = await import('@/lib/prisma');
        const db = prismaModule.default as any;
        const { getOrCreateDbUser } = await import('@/lib/subscription');

        // 0. Lookup durable MpesaTransaction record (carries PIN & channel for both Web and WhatsApp)
        let txRecord: any = null;
        try {
          txRecord = await db.mpesaTransaction?.findUnique({
            where: { checkoutRequestId: CheckoutRequestID },
          });
          if (txRecord) {
            await db.mpesaTransaction.update({
              where: { checkoutRequestId: CheckoutRequestID },
              data: {
                status: 'COMPLETED',
                resultCode: 0,
                resultDesc: ResultDesc || 'The service request is processed successfully.',
                mpesaReceiptNumber: mpesaReceipt || txRecord.mpesaReceiptNumber || CheckoutRequestID,
                ...(MerchantRequestID ? { merchantRequestId: MerchantRequestID } : {}),
              },
            });
          }
        } catch (txErr: any) {
          log.warn('[M-Pesa Callback] MpesaTransaction update notice:', txErr?.message);
        }

        // 1. Look up any WhatsApp conversation awaiting payment with this checkoutId
        let conversation: any = null;
        try {
          const conversations = await db.ai_conversations?.findMany({
            where: {
              channel: 'whatsapp',
              status: 'active',
            },
          });
          conversation = conversations?.find((c: any) => {
            const meta = c.metadata as any;
            return meta?.checkoutId === CheckoutRequestID || (phoneNumber && meta?.paymentPhone === phoneNumber);
          });
        } catch (e: any) {
          log.warn('[M-Pesa Callback] Conversation lookup notice:', e.message);
        }

        const resolvedPin =
          txRecord?.pin ||
          conversation?.metadata?.pin ||
          (global as any).mpesaStkPinBindings?.[CheckoutRequestID] ||
          'KRA_CERT';
        if (resolvedPin && resolvedPin !== 'KRA_CERT') {
          registry[CheckoutRequestID].metadata.pin = resolvedPin.toUpperCase();
        }
        const isWebOrigin = txRecord?.channel === 'web' && !conversation;
        const targetPhone = conversation?.user_phone || txRecord?.phone || phoneNumber;
        const taxpayerName = conversation?.metadata?.taxpayerName || '';

        // 1b. Check if this payment was for a Cyber Cafe Monthly Subscription
        const isCyber =
          conversation?.metadata?.step === 'CYBER_AWAITING_PAYMENT' ||
          txRecord?.channel === 'cyber';
        if (isCyber) {
          log.info(`[M-Pesa Callback] Activating Cyber Cafe subscription for ${targetPhone} (receipt: ${mpesaReceipt})`);
          const { activateCyberCafeSubscription, deliverCyberInvoiceToWhatsApp } = await import('@/lib/cyber-subscription');

          const existingCyberInv = await db.cyberInvoice?.findFirst({
            where: { checkoutId: CheckoutRequestID },
          });
          if (existingCyberInv) {
            return NextResponse.json({ success: true, duplicate: true, message: 'Cyber invoice already processed' });
          }

          let pendingCafe: any = null;
          if (!conversation) {
            pendingCafe = await db.cyberCafe?.findFirst({
              where: {
                OR: [
                  { notes: { contains: CheckoutRequestID } },
                  ...(phoneNumber ? [{ paymentPhone: phoneNumber, status: 'pending' }] : []),
                ],
              },
            });
          }

          if ((conversation || pendingCafe) && Number(amount) >= 500) {
            const activation = await activateCyberCafeSubscription({
              cafeName: conversation?.metadata?.cyberCafeName || pendingCafe?.cafeName || 'Cyber Cafe',
              ownerName: conversation?.metadata?.cyberOwnerName || pendingCafe?.ownerName || 'Cyber Operator',
              whatsappPhone: conversation?.metadata?.cyberWaPhone || pendingCafe?.whatsappPhone || targetPhone,
              paymentPhone: conversation?.metadata?.paymentPhone || pendingCafe?.paymentPhone || phoneNumber || targetPhone,
              mpesaReceipt,
              checkoutId: CheckoutRequestID,
              amountKes: Number(amount || 500),
              clerkUserId: pendingCafe?.clerkUserId || txRecord?.clerkId || undefined,
            });

            if (conversation) {
              const meta = (conversation.metadata as any) || {};
              meta.step = 'IDLE';
              meta.activeSession = false;
              meta.mpesaReceipt = mpesaReceipt;
              await db.ai_conversations?.update({
                where: { id: conversation.id },
                data: {
                  metadata: meta,
                  updated_at: new Date(),
                },
              });
            }

            if (activation.success && activation.invoice && activation.cafe) {
              try {
                await deliverCyberInvoiceToWhatsApp({
                  whatsappPhone: conversation ? targetPhone : activation.cafe.whatsappPhone,
                  invoice: activation.invoice,
                  cafe: activation.cafe,
                  daysRemaining: activation.daysRemaining,
                });
              } catch (err: any) {
                log.warn('[M-Pesa Callback] WhatsApp invoice delivery notice:', err.message);
              }
            }

            return NextResponse.json({ success: true, message: 'Cyber Cafe subscription callback processed successfully' });
          }
        }

        // 1c. Fallback check: pending Web CyberCafe even if channel wasn't tagged 'cyber'
        const pendingCafe = await db.cyberCafe?.findFirst({
          where: {
            OR: [
              { notes: { contains: CheckoutRequestID } },
              ...(phoneNumber ? [{ paymentPhone: phoneNumber, status: 'pending' }] : []),
            ],
          },
        });

        if (pendingCafe && amount >= 500) {
          log.info(`[M-Pesa Callback] Activating Web Cyber Cafe subscription for ${pendingCafe.cafeName}`);
          const { activateCyberCafeSubscription, deliverCyberInvoiceToWhatsApp } = await import('@/lib/cyber-subscription');
          const activation = await activateCyberCafeSubscription({
            cafeName: pendingCafe.cafeName,
            ownerName: pendingCafe.ownerName,
            whatsappPhone: pendingCafe.whatsappPhone,
            paymentPhone: pendingCafe.paymentPhone,
            mpesaReceipt,
            checkoutId: CheckoutRequestID,
            amountKes: Number(amount || 500),
            clerkUserId: pendingCafe.clerkUserId,
          });

          if (activation.success && activation.invoice && activation.cafe) {
            try {
              await deliverCyberInvoiceToWhatsApp({
                whatsappPhone: activation.cafe.whatsappPhone,
                invoice: activation.invoice,
                cafe: activation.cafe,
                daysRemaining: activation.daysRemaining,
              });
            } catch (err: any) {
              log.warn('[M-Pesa Callback] WhatsApp delivery notice:', err.message);
            }
          }

          return NextResponse.json({ success: true, message: 'Web Cyber Cafe subscription processed successfully' });
        }

        // 2. Idempotent CertificateDownload creation — Safaricom routinely
        // retries callbacks, and STK Push Query may also create the download row
        // first with checkoutId as temporary mpesaReceipt. Update the receipt if needed.
        try {
          const existingDownload = await db.certificateDownload?.findFirst({
            where: { checkoutId: CheckoutRequestID },
          });
          if (existingDownload) {
            if (mpesaReceipt && existingDownload.mpesaReceipt !== mpesaReceipt) {
              await db.certificateDownload?.update({
                where: { id: existingDownload.id },
                data: { mpesaReceipt },
              }).catch(() => { });
            }
            log.info(`[M-Pesa Callback] Duplicate/already-issued callback for ${CheckoutRequestID} — ack only`);
            return NextResponse.json({ success: true, duplicate: true, message: 'Already processed' });
          }
        } catch (idemErr: any) {
          log.warn('[M-Pesa Callback] Idempotency lookup notice:', idemErr.message);
        }

        // 2b. Create CertificateDownload record safely
        const effectiveClerkId =
          txRecord?.channel === 'web'
            ? (txRecord?.clerkId || 'guest_user')
            : (txRecord?.clerkId || (targetPhone ? `wa_${targetPhone}` : 'guest_user'));
        let dbUser: any = null;
        try {
          dbUser = await getOrCreateDbUser(
            effectiveClerkId,
            `${effectiveClerkId}@akubrecah.co.ke`,
            taxpayerName || 'Taxpayer'
          );
        } catch (uErr: any) {
          log.warn('[M-Pesa Callback] User lookup notice:', uErr.message);
        }

        let downloadRecord: any = null;
        if (db.certificateDownload) {
          try {
            downloadRecord = await db.certificateDownload.create({
              data: {
                userId: dbUser?.id || effectiveClerkId,
                clerkId: effectiveClerkId,
                pin: resolvedPin.toUpperCase(),
                downloadType: 'pay_per_download',
                amountCharged: Number(amount || minCertFee),
                currency: 'KES',
                mpesaReceipt: mpesaReceipt,
                checkoutId: CheckoutRequestID,
              },
            });
          } catch (dlErr: any) {
            log.warn('[M-Pesa Callback] Download record creation notice:', dlErr.message);
          }
        }

        const downloadId = downloadRecord?.id || 'dl_' + Date.now();

        // 3. For WhatsApp-originated payments, update conversation & deliver certificate PDF
        if (!isWebOrigin && targetPhone) {
          if (conversation) {
            const meta = (conversation.metadata as any) || {};
            meta.step = 'COMPLETED';
            meta.activeSession = false;
            meta.mpesaReceipt = mpesaReceipt;
            meta.downloadId = downloadId;
            await db.ai_conversations?.update({
              where: { id: conversation.id },
              data: {
                metadata: meta,
                updated_at: new Date(),
              },
            });
          }

          try {
            const { fulfillWhatsAppCertificateDelivery } = await import('@/lib/certificate-fulfillment');
            await fulfillWhatsAppCertificateDelivery({
              phone: targetPhone,
              pin: resolvedPin,
              checkoutId: CheckoutRequestID,
              mpesaReceipt,
              amount: Number(amount || minCertFee),
              taxpayerName,
              taxpayerDetails: conversation?.metadata?.taxpayerDetails,
            });
          } catch (fulErr: any) {
            log.error('[M-Pesa Callback] Direct fulfillment error:', fulErr.message);
          }

          const n8nWebhookUrl = process.env.N8N_KRA_DELIVERY_WEBHOOK || 'https://n8n.akubrecah.com/webhook/kra-delivery';
          try {
            await fetch(n8nWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                checkoutId: CheckoutRequestID,
                mpesaReceipt,
                amount: Number(amount || minCertFee),
                phone: targetPhone,
                pin: resolvedPin,
                downloadId,
                taxpayerName,
                appUrl: 'https://kra.akubrecah.com',
                evolutionUrl: process.env.EVOLUTION_API_URL || 'https://wa.akubrecah.com',
                instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'Akubrecah Entertainment',
                serviceSecret: process.env.N8N_DISPATCH_SECRET || process.env.EVOLUTION_API_KEY || process.env.EVOLUTION_WEBHOOK_SECRET || '',
                apiKey: process.env.EVOLUTION_API_KEY || process.env.EVOLUTION_WEBHOOK_SECRET || '',
              }),
            });
          } catch (n8nErr: any) {
            log.warn('[M-Pesa Callback] n8n delivery webhook notice:', n8nErr.message);
          }
        }
      } catch (dbErr: any) {
        log.error('[M-Pesa Callback DB Handler Error]:', dbErr.message);
      }
    } else {
      const codeStr = String(ResultCode ?? '1');
      const { status: mappedStatus, dbStatus } = mapDarajaResultCodeToStatus(codeStr);
      const formattedDesc = formatDarajaResultDesc(codeStr, ResultDesc || 'Transaction not completed');
      log.warn(`[M-Pesa Callback] Payment Not Completed! Code: ${ResultCode} (${mappedStatus}), Desc: ${formattedDesc}`);

      registry[CheckoutRequestID] = {
        status: mappedStatus === 'pending' ? 'failed' : mappedStatus,
        resultCode: ResultCode,
        ResultCode: ResultCode,
        resultDesc: formattedDesc,
        timestamp: Date.now()
      };

      try {
        const prismaModule = await import('@/lib/prisma');
        const db = prismaModule.default as any;
        await db.mpesaTransaction?.updateMany({
          where: { checkoutRequestId: CheckoutRequestID },
          data: {
            status: dbStatus === 'PENDING' ? 'FAILED' : dbStatus,
            resultCode: Number.isFinite(Number(ResultCode)) ? Number(ResultCode) : null,
            resultDesc: formattedDesc,
          },
        });
      } catch (txErr: any) {
        log.warn('[M-Pesa Callback] Failure status persist notice:', txErr?.message);
      }

      // If associated with a WhatsApp conversation, notify user and allow retry without slashes
      (async () => {
        try {
          const prismaModule = await import('@/lib/prisma');
          const db = prismaModule.default as any;
          const conversations = await db.ai_conversations?.findMany({
            where: {
              channel: 'whatsapp',
              status: 'active',
            },
          });
          const conversation = conversations?.find((c: any) => {
            const meta = c.metadata as any;
            return meta?.checkoutId === CheckoutRequestID;
          });

          if (conversation && conversation.metadata?.activeSession) {
            const targetPhone = conversation.user_phone;
            const failMsg =
              `⚠️ M-Pesa payment not completed (${ResultDesc || 'timed out'}).\n` +
              `Reply 1 to resend prompt, or 0 to cancel.`;

            const { sendEvolutionTextMessage } = await import('@/lib/evolution');
            await sendEvolutionTextMessage(targetPhone, failMsg);
          }
        } catch (err: any) {
          log.warn('[M-Pesa Callback Fail Notify Notice]:', err.message);
        }
      })().catch(() => { });
    }

    // Optional: Prune older callbacks from memory to prevent leaks (keeps last 500 records)
    const keys = Object.keys(registry);
    if (keys.length > 500) {
      // Sort keys by timestamp and delete the oldest 100 entries
      const sortedKeys = keys.sort((a, b) => (registry[a].timestamp || 0) - (registry[b].timestamp || 0));
      for (let i = 0; i < 100; i++) {
        delete registry[sortedKeys[i]];
      }
    }

    return NextResponse.json({ success: true, message: 'Callback received successfully' });

  } catch (error: any) {
    log.error('[M-Pesa Callback Catch Error]:', error.message);
    return NextResponse.json({ success: false, error: 'Callback processing failed' }, { status: 500 });
  }
}
