/**
 * Taxpayer-found fulfillment pipeline for WhatsApp TSO flows:
 * cyber-cafe instant fulfillment, existing-payment detection, or STK push.
 */
import { log } from '@/lib/monitoring/logger';
import { maskTaxpayerData } from '@/lib/masking';
import { getCyberCafeStatus, incrementCyberCafeDownloadCount } from '@/lib/cyber-subscription';
import { triggerInAppMpesaPayment } from '@/lib/whatsapp/payments';

/**
 * Handles taxpayer fulfillment:
 * If caller is an active Cyber Cafe subscriber, delivers certificate instantly with zero payment prompt!
 * Otherwise, triggers the standard KES 20 M-Pesa STK push.
 */
export async function handleTaxpayerFoundFulfillment({
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
    log.warn('[Fulfillment Existing Payment Check Notice]:', err.message);
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
