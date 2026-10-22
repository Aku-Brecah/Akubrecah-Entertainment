import { NextRequest, NextResponse } from 'next/server';

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
    // Validation activates once MPESA_CALLBACK_TOKEN is configured in the
    // environment AND the Daraja portal callback URL is updated; until then a
    // loud warning is logged so the gate is visible in system health.
    const callbackToken = process.env.MPESA_CALLBACK_TOKEN;
    if (callbackToken) {
      if (req.nextUrl.searchParams.get('token') !== callbackToken) {
        console.error('[M-Pesa Callback] REJECTED: missing/invalid callback token — unauthenticated callback attempt');
        return NextResponse.json({ success: false, error: 'Unauthorized callback' }, { status: 401 });
      }
    } else {
      console.warn('[M-Pesa Callback] WARNING: MPESA_CALLBACK_TOKEN not configured — callback origin is unvalidated');
    }

    const payload = await req.json();
    console.log('[M-Pesa Callback] Received payload:', JSON.stringify(payload));

    const body = payload?.Body;
    if (!body || !body.stkCallback) {
      console.warn('[M-Pesa Callback] Invalid payload structure');
      return NextResponse.json({ success: false, error: 'Invalid payload structure' }, { status: 400 });
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = body.stkCallback;

    if (!CheckoutRequestID) {
      console.warn('[M-Pesa Callback] Missing CheckoutRequestID');
      return NextResponse.json({ success: false, error: 'Missing CheckoutRequestID' }, { status: 400 });
    }

    const registry = getCallbackRegistry();

    // Parse callback metadata first so amount tampering can be validated
    // before anything is marked as paid.
    let amount = 0;
    if (CallbackMetadata && Array.isArray(CallbackMetadata.Item)) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === 'Amount' && typeof item.Value === 'number') amount = item.Value;
      }
    }

    // Check if the payment was successful
    // A "success" callback under the KES 20 certificate price is rejected:
    // the amount tampering must not grant a free download. (amount === 0 means
    // the gateway sent no metadata — treated as unresolved, not rejected.)
    const underpaid = ResultCode === 0 && amount > 0 && amount < 20;

    if (underpaid) {
      console.error(`[M-Pesa Callback] REJECTED underpaid "success" (KES ${amount}) for ${CheckoutRequestID}`);
      registry[CheckoutRequestID] = {
        status: 'failed',
        resultCode: ResultCode,
        resultDesc: `Underpaid amount KES ${amount}`,
        timestamp: Date.now()
      };
      return NextResponse.json({ success: true, message: 'Underpaid callback rejected' });
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

      console.log(`[M-Pesa Callback] Payment Success! Receipt: ${mpesaReceipt}, Amount: ${amount}`);

      registry[CheckoutRequestID] = {
        status: 'success',
        resultCode: ResultCode,
        resultDesc: ResultDesc,
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
            return meta?.checkoutId === CheckoutRequestID || meta?.paymentPhone === phoneNumber;
          });
        } catch (e: any) {
          console.warn('[M-Pesa Callback] Conversation lookup notice:', e.message);
        }

        const resolvedPin = conversation?.metadata?.pin || 'KRA_CERT';
        const targetPhone = conversation?.user_phone || phoneNumber;
        const taxpayerName = conversation?.metadata?.taxpayerName || '';

        // 1b. Check if this payment was for a Cyber Cafe Monthly Subscription
        const isCyber = conversation?.metadata?.step === 'CYBER_AWAITING_PAYMENT';
        if (isCyber) {
          console.log(`[M-Pesa Callback] Activating Cyber Cafe subscription for ${targetPhone} (receipt: ${mpesaReceipt})`);
          const { activateCyberCafeSubscription, deliverCyberInvoiceToWhatsApp } = await import('@/lib/cyber-subscription');
          const { sendEvolutionTextMessage } = await import('@/lib/evolution');

          const activation = await activateCyberCafeSubscription({
            cafeName: conversation?.metadata?.cyberCafeName || 'Cyber Cafe',
            ownerName: conversation?.metadata?.cyberOwnerName || 'Cyber Operator',
            whatsappPhone: conversation?.metadata?.cyberWaPhone || targetPhone,
            paymentPhone: conversation?.metadata?.paymentPhone || phoneNumber || targetPhone,
            mpesaReceipt,
            checkoutId: CheckoutRequestID,
            amountKes: Number(amount || 500),
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
            await deliverCyberInvoiceToWhatsApp({
              whatsappPhone: targetPhone,
              invoice: activation.invoice,
              cafe: activation.cafe,
              daysRemaining: activation.daysRemaining,
            });
          }

          return NextResponse.json({ success: true, message: 'Cyber Cafe subscription callback processed successfully' });
        }

        // 1c. Check if there is a pending CyberCafe subscription (e.g. initiated from web)
        const pendingCafe = await db.cyberCafe?.findFirst({
          where: {
            OR: [
              { notes: { contains: CheckoutRequestID } },
              { paymentPhone: phoneNumber, status: 'pending' },
            ],
          },
        });

        if (pendingCafe && (amount >= 500 || amount === 0)) {
          console.log(`[M-Pesa Callback] Activating Web Cyber Cafe subscription for ${pendingCafe.cafeName}`);
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
              console.warn('[M-Pesa Callback] WhatsApp delivery notice:', err.message);
            }
          }

          return NextResponse.json({ success: true, message: 'Web Cyber Cafe subscription processed successfully' });
        }

        // 2. Create CertificateDownload record safely
        let dbUser: any = null;
        try {
          dbUser = await getOrCreateDbUser(
            'wa_' + targetPhone,
            `wa_${targetPhone}@akubrecah.co.ke`,
            taxpayerName || 'WhatsApp Taxpayer'
          );
        } catch (uErr: any) {
          console.warn('[M-Pesa Callback] User lookup notice:', uErr.message);
        }

        let downloadRecord: any = null;
        if (db.certificateDownload) {
          try {
            downloadRecord = await db.certificateDownload.create({
              data: {
                userId: dbUser?.id || ('wa_' + targetPhone),
                clerkId: 'wa_' + targetPhone,
                pin: resolvedPin.toUpperCase(),
                downloadType: 'pay_per_download',
                amountCharged: Number(amount || 20),
                currency: 'KES',
                mpesaReceipt: mpesaReceipt,
                checkoutId: CheckoutRequestID,
              },
            });
          } catch (dlErr: any) {
            console.warn('[M-Pesa Callback] Download record creation notice:', dlErr.message);
          }
        }

        const downloadId = downloadRecord?.id || 'dl_' + Date.now();

        // 3. Update conversation step to COMPLETED and end active session
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

        // 4. Trigger direct WhatsApp Document Delivery (Certificate + Receipt)
        try {
          const { fulfillWhatsAppCertificateDelivery } = await import('@/lib/certificate-fulfillment');
          await fulfillWhatsAppCertificateDelivery({
            phone: targetPhone,
            pin: resolvedPin,
            checkoutId: CheckoutRequestID,
            mpesaReceipt,
            amount: Number(amount || 20),
            taxpayerName,
            taxpayerDetails: conversation?.metadata?.taxpayerDetails,
          });
        } catch (fulErr: any) {
          console.error('[M-Pesa Callback] Direct fulfillment error:', fulErr.message);
        }

        // Trigger n8n Workflow so executions visibly reflect in n8n
        const n8nWebhookUrl = process.env.N8N_KRA_DELIVERY_WEBHOOK || 'https://n8n.akubrecah.com/webhook/kra-delivery';
        try {
          await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              checkoutId: CheckoutRequestID,
              mpesaReceipt,
              amount: Number(amount || 20),
              phone: targetPhone,
              pin: resolvedPin,
              downloadId,
              taxpayerName,
              appUrl: 'https://kra.akubrecah.com',
              evolutionUrl: process.env.EVOLUTION_API_URL || 'https://wa.akubrecah.com',
              instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'Akubrecah Entertainment',
              serviceSecret: process.env.EVOLUTION_API_KEY || process.env.EVOLUTION_WEBHOOK_SECRET || '',
              apiKey: process.env.EVOLUTION_API_KEY || process.env.EVOLUTION_WEBHOOK_SECRET || '',
            }),
          });
        } catch (n8nErr: any) {
          console.warn('[M-Pesa Callback] n8n delivery webhook notice:', n8nErr.message);
        }
      } catch (dbErr: any) {
        console.error('[M-Pesa Callback DB Handler Error]:', dbErr.message);
      }
    } else {
      console.warn(`[M-Pesa Callback] Payment Failed! Code: ${ResultCode}, Desc: ${ResultDesc}`);

      registry[CheckoutRequestID] = {
        status: 'failed',
        resultCode: ResultCode,
        resultDesc: ResultDesc,
        timestamp: Date.now()
      };

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
          console.warn('[M-Pesa Callback Fail Notify Notice]:', err.message);
        }
      })().catch(() => {});
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
    console.error('[M-Pesa Callback Catch Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
