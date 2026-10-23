/**
 * WhatsApp-driven payment dispatchers (M-Pesa STK push + Paystack checkout link).
 */
import { log } from '@/lib/monitoring/logger';
import { dispatchMpesaStkPush, normalizePhoneNumber } from '@/lib/whatsapp/mpesa-dispatch';
import { getPublicAppUrl } from '@/lib/utils';
import { initializePaystackTransaction } from '@/lib/paystack';

export async function triggerInAppMpesaPayment({
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
  const cleanPin = String(pin || '').trim().toUpperCase() || 'PIN';
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
    log.error('[WhatsApp triggerInAppMpesaPayment Error]:', err.message);
    return {
      success: false,
      normalizedPhone,
      error: err.message || 'Failed to trigger M-Pesa STK Push',
    };
  }
}

export async function triggerCyberCafePayment({
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
    log.error('[WhatsApp triggerCyberCafePayment Error]:', err.message);
    return {
      success: false,
      normalizedPhone,
      error: err.message || 'Failed to trigger M-Pesa STK Push',
    };
  }
}

export async function createPaystackLink(userPhone: string, pin: string, amount: number, customerName?: string) {
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
