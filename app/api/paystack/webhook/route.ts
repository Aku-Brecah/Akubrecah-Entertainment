import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import prisma, { createSystemLog } from '@/lib/prisma';
import { verifyPaystackWebhookSignature } from '@/lib/paystack';
import { getOrCreateDbUser } from '@/lib/subscription';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    const isValid = verifyPaystackWebhookSignature(rawBody, signature);
    if (!isValid) {
      log.warn('[Paystack Webhook] Invalid webhook signature detected.');
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'charge.success') {
      const data = event.data;
      const reference = data.reference;
      const amountKes = (data.amount || 0) / 100;
      const metadata = data.metadata || {};
      const clerkId = metadata.clerkId;
      const type = metadata.type || 'pay_per_download';
      const pin = metadata.pin ? String(metadata.pin).toUpperCase().trim() : '';

      // SECURITY: a non-KES transaction's amount/100 would be misread as
      // KES. Fail closed on anything that is not KES.
      if (data.currency && data.currency !== 'KES') {
        log.warn(`[Paystack Webhook] Non-KES charge.success ignored (currency: ${data.currency}, ref: ${reference})`);
        return NextResponse.json({ success: true, message: 'Non-KES transaction skipped' });
      }

      // Fulfilment for Cyber Cafe monthly web subscriptions. Previously this
      // metadata type fell through every branch: money was collected via
      // Paystack but the subscription was never activated server-side.
      if (type === 'cyber_monthly' && metadata.cyberCafeId) {
        try {
          const db = prisma as any;
          const cafe = await db.cyberCafe.findUnique({ where: { id: metadata.cyberCafeId } });
          if (!cafe) {
            log.error(`[Paystack Webhook] cyber_monthly payment for unknown cafe ${metadata.cyberCafeId} (ref: ${reference})`);
          } else if (amountKes + 1e-9 < 500) {
            log.error(`[Paystack Webhook] REJECTED underpaid cyber_monthly "success" (KES ${amountKes} < 500) for ${reference}`);
          } else {
            const { activateCyberCafeSubscription } = await import('@/lib/cyber-subscription');
            const activation = await activateCyberCafeSubscription({
              cafeName: cafe.cafeName,
              ownerName: cafe.ownerName,
              whatsappPhone: cafe.whatsappPhone,
              paymentPhone: cafe.paymentPhone,
              mpesaReceipt: `PAYSTACK_${reference}`,
              checkoutId: reference,
              amountKes,
              clerkUserId: cafe.clerkUserId || metadata.clerkUserId,
            });
            if (activation.success) {
              log.info(`[Paystack Webhook] Cyber Cafe subscription activated for ${cafe.cafeName} (ref: ${reference})`);
            } else {
              log.error(`[Paystack Webhook] Cyber activation failed for ${cafe.cafeName}: ${activation.error}`);
            }
          }
        } catch (cyberErr: any) {
          log.error('[Paystack Webhook] Cyber fulfilment error:', cyberErr.message);
        }
        return NextResponse.json({ success: true });
      }

      if (clerkId) {
        const db = prisma as any;
        let dbUser = await getOrCreateDbUser(clerkId, data.customer?.email);
        if (!dbUser) {
          dbUser = await db.users?.findFirst({
            where: {
              OR: [
                { clerkId },
                { id: clerkId },
                { id: 'guest_user' },
              ],
            },
          }) || await db.users?.findFirst();
        }

        if (type === 'subscription') {
          const existingSub = await db.subscription?.findFirst({
            where: { mpesaReceipt: `PAYSTACK_${reference}` },
          });

          if (!existingSub) {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            try {
              await db.subscription?.create({
                data: {
                  userId: dbUser.id,
                  clerkId: dbUser.clerkId,
                  status: 'active',
                  planName: 'monthly',
                  amountPaid: amountKes,
                  currency: 'KES',
                  mpesaReceipt: `PAYSTACK_${reference}`,
                  startsAt: now,
                  expiresAt,
                },
              });
              log.info(`[Paystack Webhook] Subscription activated for ${dbUser.email}`);
            } catch (subErr: any) {
              // Concurrent webhook+verify delivery for the same reference is a
              // duplicate mint attempt — the DB unique constraint on
              // mpesaReceipt backstops it. Treat P2002 as idempotent success.
              if (subErr?.code !== 'P2002') {
                throw subErr;
              }
              log.info(`[Paystack Webhook] Subscription already exists for ${reference} (concurrent delivery)`);
            }
          }
        } else if (type === 'pay_per_download') {
          // Fail closed: an underpaid "success" must never mint a download.
          const floorKes = Number(process.env.PAYSTACK_DOWNLOAD_FEE_KES) || 20;
          if (amountKes + 1e-9 < floorKes) {
            log.error(`[Paystack Webhook] REJECTED underpaid "success" (KES ${amountKes} < ${floorKes}) for ${reference}`);
            return NextResponse.json({ success: true, message: 'Underpaid transaction skipped' });
          }
          // Fail closed: without PIN metadata the record cannot be pinned to a
          // specific certificate (the legacy 'KRA_CERT' placeholder enabled
          // cross-PIN unlocks). Initialize always sets PIN metadata, so this
          // only triggers for externally-forged/malformed transactions.
          if (!pin) {
            log.error(`[Paystack Webhook] REJECTED: pay_per_download success for ${reference} without PIN metadata — no download record minted`);
            return NextResponse.json({ success: true, message: 'Missing PIN metadata — no download record created' });
          }
          const existingDownload = await db.certificateDownload?.findFirst({
            where: { checkoutId: reference },
          });

          if (!existingDownload) {
            await db.certificateDownload?.create({
              data: {
                userId: dbUser?.id || 'guest_user',
                clerkId: dbUser?.clerkId || clerkId,
                pin,
                downloadType: 'pay_per_download',
                amountCharged: amountKes,
                currency: 'KES',
                mpesaReceipt: `PAYSTACK_${reference}`,
                checkoutId: reference,
              },
            });
            log.info(`[Paystack Webhook] Download recorded for PIN ${(pin || '').slice(0, 1)}***${(pin || '').slice(-1)}`);

            // Dispatch to WhatsApp if paid by a WhatsApp user
            let waTargetPhone: string | null = null;
            let taxpayerName = metadata.customerName || 'WhatsApp Customer';
            let taxpayerDetails: any = null;
            let targetPin = pin;

            try {
              const conversations = await db.ai_conversations?.findMany({
                where: {
                  channel: 'whatsapp',
                  status: 'active',
                },
              });
              const conversation = conversations?.find((c: any) => {
                const meta = c.metadata as any;
                return meta?.checkoutId === reference;
              });

              if (conversation) {
                waTargetPhone = conversation.user_phone;
                targetPin = conversation.metadata?.pin || targetPin;
                taxpayerName = conversation.metadata?.taxpayerName || taxpayerName;
                taxpayerDetails = conversation.metadata?.taxpayerDetails;
              } else if (clerkId && clerkId.startsWith('wa_')) {
                waTargetPhone = clerkId.replace(/^wa_/, '');
              }
            } catch (convErr: any) {
              log.warn('[Paystack Webhook] Conversation lookup notice:', convErr.message);
              if (clerkId && clerkId.startsWith('wa_')) {
                waTargetPhone = clerkId.replace(/^wa_/, '');
              }
            }

            if (waTargetPhone) {
              try {
                const { fulfillWhatsAppCertificateDelivery } = await import('@/lib/certificate-fulfillment');
                await fulfillWhatsAppCertificateDelivery({
                  phone: waTargetPhone,
                  pin: targetPin,
                  checkoutId: reference,
                  mpesaReceipt: `PAYSTACK_${reference}`,
                  amount: amountKes,
                  taxpayerName,
                  taxpayerDetails,
                });
              } catch (fulErr: any) {
                log.error('[Paystack Webhook] Direct fulfillment error:', fulErr.message);
              }
              // Secondary n8n trigger to reflect in workflow
              const n8nWebhookUrl = process.env.N8N_KRA_DELIVERY_WEBHOOK || 'https://n8n.akubrecah.com/webhook/kra-delivery';
              try {
                await fetch(n8nWebhookUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    checkoutId: reference,
                    mpesaReceipt: `PAYSTACK_${reference}`,
                    amount: amountKes || 20,
                    phone: waTargetPhone,
                    pin: targetPin,
                    downloadId: existingDownload?.id || 'dl_' + Date.now(),
                    taxpayerName,
                    appUrl: 'https://kra.akubrecah.com',
                    evolutionUrl: process.env.EVOLUTION_API_URL || 'https://wa.akubrecah.com',
                    instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'Akubrecah Entertainment',
                    serviceSecret: process.env.N8N_DISPATCH_SECRET || process.env.EVOLUTION_API_KEY || process.env.EVOLUTION_WEBHOOK_SECRET || '',
                    apiKey: process.env.EVOLUTION_API_KEY || process.env.EVOLUTION_WEBHOOK_SECRET || '',
                  }),
                });
              } catch (n8nErr: any) {
                log.warn('[Paystack Webhook] n8n delivery notice:', n8nErr.message);
              }
            }
          }
        }

        await createSystemLog({
          level: 'info',
          service: 'Paystack-Webhook',
          message: `Webhook processed charge.success for ref ${reference}`,
          actor: data.customer?.email || 'Paystack',
          details: { reference, amountKes, type, pin },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    log.error('[Paystack Webhook] Error:', error.message);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
