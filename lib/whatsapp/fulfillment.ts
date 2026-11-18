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
  explicitPaymentPhone,
}: {
  userPhone: string;
  taxpayer: any;
  idOrPinInput: string;
  saveConversationState: (step: string, extra?: Record<string, any>) => Promise<string | void>;
  explicitPaymentPhone?: string;
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

  // 2. Regular pay-per-download flow (KES 20 Daraja STK push)
  const downloadFee = Number(process.env.MPESA_DOWNLOAD_FEE_KES || 20);

  // Check if client already paid via Daraja recently (e.g. delayed callback or retry)
  try {
    const { findRecentSuccessfulMpesaPayment } = await import('@/lib/whatsapp/mpesa-dispatch');
    const existingPayment = await findRecentSuccessfulMpesaPayment({
      phone: userPhone,
      pin: cleanPin,
      minAmountKes: downloadFee,
      maxAgeMinutes: 90,
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
        `📄 Your official KRA PIN Certificate (PDF) has been generated and sent above!\n\n` +
        `🌐 *Web Portal:* https://kra.akubrecah.com`
      );
    }
  } catch (err: any) {
    log.warn('[Fulfillment Existing Payment Check Notice]:', err.message);
  }

  // If caller provided an explicit payment phone (e.g. /kra <ID> <PHONE>), fire STK push immediately!
  if (explicitPaymentPhone) {
    const stkRes = await triggerInAppMpesaPayment({
      targetPhone: explicitPaymentPhone,
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
      taxpayerDetails: taxpayer,
      checkoutId: stkRes.checkoutRequestId || '',
      paymentPhone: stkRes.normalizedPhone,
      stkGateway: stkRes.gateway,
      pushedAt: Date.now(),
    });

    if (stkRes.success) {
      return (
        `🇰🇪 *KRA TAXPAYER RECORD FOUND*\n` +
        `─────────────────────────\n` +
        `👤 *Taxpayer:* *${masked.taxpayerName}*\n` +
        `🆔 *KRA PIN:* \`${masked.pin}\`\n` +
        `💰 *Certificate Fee:* KES ${downloadFee}.00\n` +
        `─────────────────────────\n` +
        `📲 *M-PESA PAYMENT PROMPT SENT*\n` +
        `👉 *Enter your M-Pesa PIN* on \`${stkRes.normalizedPhone}\` to complete retrieval.\n\n` +
        `Your official KRA PIN Certificate (PDF) will be delivered right here in this chat.\n\n` +
        `─────────────────────────\n` +
        `_(Reply 1 to resend prompt | Send another number | Reply 0 to cancel)_`
      );
    } else {
      return (
        `🇰🇪 *KRA TAXPAYER RECORD FOUND*\n` +
        `─────────────────────────\n` +
        `👤 *Taxpayer:* *${masked.taxpayerName}*\n` +
        `🆔 *KRA PIN:* \`${masked.pin}\`\n` +
        `💰 *Certificate Fee:* KES ${downloadFee}.00\n` +
        `─────────────────────────\n` +
        `⚠️ *Could not send payment prompt:* ${stkRes.error || 'Network error'}.\n\n` +
        `👉 Send another Safaricom phone number (e.g. *0712345678*) or reply *0* to cancel.`
      );
    }
  }

  // Otherwise ask user for payment phone number
  await saveConversationState('AWAITING_PAYMENT_PHONE', {
    activeSession: true,
    pin: cleanPin,
    idNumber: taxpayer.idNumber || idOrPinInput,
    taxpayerName: taxpayer.taxpayerName,
    taxpayerDetails: taxpayer,
    fee: downloadFee,
  });

  const { formatDisplayPhone } = await import('@/lib/whatsapp/phone');
  const formattedWhatsAppPhone = formatDisplayPhone(userPhone);

  return (
    `🇰🇪 *KRA TAXPAYER RECORD FOUND*\n` +
    `─────────────────────────\n` +
    `👤 *Taxpayer:* *${masked.taxpayerName}*\n` +
    `🆔 *KRA PIN:* \`${masked.pin}\`\n` +
    `💰 *Certificate Fee:* KES ${downloadFee}.00\n` +
    `─────────────────────────\n` +
    `📲 *ENTER M-PESA PHONE NUMBER*\n` +
    `Please reply with your Safaricom M-Pesa phone number to receive the payment prompt:\n\n` +
    `👉 Send number (e.g. *0712345678* or *0112345678*)\n` +
    (formattedWhatsAppPhone ? `👉 Or reply *SAME* to use \`${formattedWhatsAppPhone}\`\n\n` : `\n`) +
    `Once payment is confirmed, your official KRA PIN Certificate (PDF) will be delivered right here in this chat.\n\n` +
    `🌐 *Web Portal:* https://kra.akubrecah.com\n` +
    `─────────────────────────\n` +
    `_(Reply *0* to cancel)_`
  );
}
