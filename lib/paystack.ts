import { log } from '@/lib/monitoring/logger';
import crypto from 'crypto';

export interface PaystackInitializeOptions {
  email: string;
  amountKes: number; // In KES (e.g. 20 for single certificate download)
  reference?: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
  channels?: string[];
}

export interface PaystackInitializeResult {
  success: boolean;
  authorizationUrl?: string;
  accessCode?: string;
  reference?: string;
  error?: string;
}

export interface PaystackVerifyResult {
  success: boolean;
  status: 'success' | 'failed' | 'abandoned' | 'pending' | 'not_found';
  amountKes: number;
  reference: string;
  paidAt?: string;
  channel?: string;
  customerEmail?: string;
  metadata?: Record<string, any>;
  error?: string;
}

function getPaystackSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY || '';
  if (!key) {
    log.warn('[Paystack] PAYSTACK_SECRET_KEY is not configured in environment variables.');
  }
  return key;
}

/**
 * Initializes a transaction with Paystack.
 * Amounts are converted from KES to subunits (x 100).
 */
export async function initializePaystackTransaction(
  opts: PaystackInitializeOptions
): Promise<PaystackInitializeResult> {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    return {
      success: false,
      error: 'Paystack is not configured. Missing PAYSTACK_SECRET_KEY.',
    };
  }

  const reference = opts.reference || `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const amountSubunits = Math.round(opts.amountKes * 100);

  try {
    const payload = {
      email: opts.email,
      amount: amountSubunits,
      currency: 'KES',
      reference,
      callback_url: opts.callbackUrl,
      channels: opts.channels || ['card', 'mobile_money'],
      metadata: {
        ...opts.metadata,
        amountKes: opts.amountKes,
      },
    };

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data.status) {
      return {
        success: false,
        error: data.message || `Paystack initialization failed with status ${res.status}`,
      };
    }

    return {
      success: true,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
    };
  } catch (error: any) {
    log.error('[Paystack] Error initializing transaction:', error.message);
    return {
      success: false,
      error: error.message || 'Network error connecting to Paystack.',
    };
  }
}

/**
 * Verifies a transaction using the Paystack Reference.
 */
export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResult> {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    return {
      success: false,
      status: 'failed',
      amountKes: 0,
      reference,
      error: 'Paystack is not configured. Missing PAYSTACK_SECRET_KEY.',
    };
  }

  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();

    if (!res.ok || !data.status || !data.data) {
      return {
        success: false,
        status: 'not_found',
        amountKes: 0,
        reference,
        error: data.message || 'Transaction not found on Paystack.',
      };
    }

    const tx = data.data;
    const isSuccess = tx.status === 'success';

    return {
      success: isSuccess,
      status: tx.status,
      amountKes: (tx.amount || 0) / 100,
      reference: tx.reference,
      paidAt: tx.paid_at,
      channel: tx.channel,
      customerEmail: tx.customer?.email,
      metadata: tx.metadata || {},
    };
  } catch (error: any) {
    log.error('[Paystack] Error verifying transaction:', error.message);
    return {
      success: false,
      status: 'failed',
      amountKes: 0,
      reference,
      error: error.message || 'Network error verifying Paystack transaction.',
    };
  }
}

/**
 * Validates the HMAC SHA512 signature from a Paystack webhook request.
 * Uses a constant-time comparison so attackers cannot recover the signature
 * byte-by-byte through timing.
 */
export function verifyPaystackWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secretKey = getPaystackSecretKey();
  if (!secretKey || !signature) return false;

  const expectedSignature = crypto
    .createHmac('sha512', secretKey)
    .update(rawBody)
    .digest('hex');

  const provided = String(signature).trim().toLowerCase();
  const expectedBuf = Buffer.from(expectedSignature);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) {
    crypto.timingSafeEqual(expectedBuf, expectedBuf);
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

/**
 * Normalizes Kenyan mobile numbers to Paystack international format: +2547XXXXXXXX or +2541XXXXXXXX
 */
export function formatPaystackKenyaPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\+\(\)]/g, '');
  if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) {
    return '+254' + cleaned;
  }
  if ((cleaned.startsWith('07') || cleaned.startsWith('01')) && cleaned.length === 10) {
    return '+254' + cleaned.substring(1);
  }
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return '+' + cleaned;
  }
  if (phone.startsWith('+')) {
    return phone.replace(/[\s\-]/g, '');
  }
  return '+' + cleaned;
}

/**
 * Triggers a real-time Safaricom M-Pesa STK Push directly via Paystack's Charge API.
 * The customer receives an immediate prompt on their phone to enter their M-Pesa PIN.
 */
export async function chargePaystackMpesa(opts: {
  phone: string;
  email: string;
  amountKes: number;
  reference?: string;
  metadata?: Record<string, any>;
}): Promise<{
  success: boolean;
  status?: string;
  reference: string;
  displayText?: string;
  error?: string;
}> {
  const secretKey = getPaystackSecretKey();
  const reference = opts.reference || `PSTK-MPESA-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  if (!secretKey) {
    return {
      success: false,
      reference,
      error: 'Paystack is not configured. Missing PAYSTACK_SECRET_KEY.',
    };
  }

  const formattedPhone = formatPaystackKenyaPhone(opts.phone);
  const amountSubunits = Math.round(opts.amountKes * 100);

  try {
    const payload = {
      email: opts.email,
      amount: amountSubunits,
      currency: 'KES',
      reference,
      mobile_money: {
        phone: formattedPhone,
        provider: 'mpesa',
      },
      metadata: {
        ...opts.metadata,
        amountKes: opts.amountKes,
        phone: formattedPhone,
        channel: 'mpesa_stk_charge',
      },
    };

    const res = await fetch('https://api.paystack.co/charge', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data.status) {
      return {
        success: false,
        reference,
        error: data.message || `Paystack M-Pesa charge failed with status ${res.status}`,
      };
    }

    const txData = data.data || {};
    return {
      success: true,
      status: txData.status || 'pay_offline',
      reference: txData.reference || reference,
      displayText: txData.display_text || 'Please complete authorization on your mobile phone',
    };
  } catch (error: any) {
    log.error('[Paystack Charge M-Pesa Error]:', error.message);
    return {
      success: false,
      reference,
      error: error.message || 'Network error triggering M-Pesa STK Push.',
    };
  }
}

interface PaystackCacheEntry<T> {
  data: T;
  timestamp: number;
}
const paystackMemoryCache: Record<string, PaystackCacheEntry<any>> = {};
const PAYSTACK_CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Fetches real-time account balances from Paystack API (in KES) with in-memory caching.
 */
export async function getPaystackBalances(): Promise<{
  success: boolean;
  currency: string;
  balanceKes: number;
  rawBalances?: any[];
  error?: string;
}> {
  const cacheKey = 'balances';
  const cached = paystackMemoryCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < PAYSTACK_CACHE_TTL_MS) {
    return cached.data;
  }

  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    return { success: false, currency: 'KES', balanceKes: 0, error: 'PAYSTACK_SECRET_KEY missing' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://api.paystack.co/balance', {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json();
    if (!res.ok || !data.status) {
      if (cached) return cached.data;
      return { success: false, currency: 'KES', balanceKes: 0, error: data.message };
    }
    const balances = Array.isArray(data.data) ? data.data : [];
    const kesBalance = balances.find((b: any) => b.currency === 'KES');
    const result = {
      success: true,
      currency: 'KES',
      balanceKes: kesBalance ? Number(kesBalance.balance || 0) / 100 : 0,
      rawBalances: balances,
    };
    paystackMemoryCache[cacheKey] = { data: result, timestamp: Date.now() };
    return result;
  } catch (err: any) {
    if (cached) return cached.data;
    return { success: false, currency: 'KES', balanceKes: 0, error: err.message };
  }
}

/**
 * Fetches real-time transaction list from Paystack API with in-memory caching.
 */
export async function getPaystackLiveTransactions(limit = 50, page = 1, skipCache = false): Promise<{
  success: boolean;
  total: number;
  items: any[];
  error?: string;
}> {
  const cacheKey = `transactions_${limit}_${page}`;
  const cached = paystackMemoryCache[cacheKey];
  if (!skipCache && cached && Date.now() - cached.timestamp < PAYSTACK_CACHE_TTL_MS) {
    return cached.data;
  }

  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    return { success: false, total: 0, items: [], error: 'PAYSTACK_SECRET_KEY missing' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`https://api.paystack.co/transaction?perPage=${limit}&page=${page}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json();
    if (!res.ok || !data.status) {
      if (cached) return cached.data;
      return { success: false, total: 0, items: [], error: data.message };
    }
    const items = (data.data || []).map((t: any) => ({
      id: t.id,
      reference: t.reference,
      amountKes: (Number(t.amount) || 0) / 100,
      feesKes: (Number(t.fees) || 0) / 100,
      netKes: ((Number(t.amount) || 0) - (Number(t.fees) || 0)) / 100,
      status: t.status,
      channel: t.channel,
      currency: t.currency,
      customerEmail: t.customer?.email,
      customerPhone: t.customer?.phone || t.metadata?.phone || null,
      pin: t.metadata?.pin || null,
      paidAt: t.paid_at || t.createdAt,
      createdAt: t.createdAt,
    }));
    const result = {
      success: true,
      total: data.meta?.total || items.length,
      items,
    };
    paystackMemoryCache[cacheKey] = { data: result, timestamp: Date.now() };
    return result;
  } catch (err: any) {
    if (cached) return cached.data;
    return { success: false, total: 0, items: [], error: err.message };
  }
}

/**
 * Fetches real-time payout/transfer history from Paystack API with in-memory caching.
 */
export async function getPaystackPayouts(limit = 50, page = 1): Promise<{
  success: boolean;
  total: number;
  items: any[];
  error?: string;
}> {
  const cacheKey = `payouts_${limit}_${page}`;
  const cached = paystackMemoryCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < PAYSTACK_CACHE_TTL_MS) {
    return cached.data;
  }

  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    return { success: false, total: 0, items: [], error: 'PAYSTACK_SECRET_KEY missing' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    // 1. Fetch official merchant settlements (automated bank/m-pesa payouts)
    const settlementRes = await fetch(`https://api.paystack.co/settlement?perPage=${limit}&page=${page}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    const settlementData = await settlementRes.json();
    clearTimeout(timeoutId);

    if (settlementRes.ok && settlementData.status && Array.isArray(settlementData.data) && settlementData.data.length > 0) {
      const items = settlementData.data.map((s: any) => ({
        id: s.id,
        transferCode: `SETTLE-${s.id}`,
        amountKes: (Number(s.total_amount || s.effective_amount || 0)) / 100,
        currency: s.currency || 'KES',
        status: s.status || 'success',
        reason: 'Automated settlement to merchant account',
        recipientName: 'Registered Bank / M-Pesa Account',
        createdAt: s.settlement_date || s.createdAt,
      }));
      const result = {
        success: true,
        total: settlementData.meta?.total || items.length,
        items,
      };
      paystackMemoryCache[cacheKey] = { data: result, timestamp: Date.now() };
      return result;
    }

    // 2. Fallback to transfer endpoint
    const transferController = new AbortController();
    const transferTimeoutId = setTimeout(() => transferController.abort(), 4000);

    const res = await fetch(`https://api.paystack.co/transfer?perPage=${limit}&page=${page}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      signal: transferController.signal,
    });
    clearTimeout(transferTimeoutId);

    const data = await res.json();
    if (!res.ok || !data.status) {
      if (cached) return cached.data;
      return { success: false, total: 0, items: [], error: data.message };
    }
    const items = (data.data || []).map((tr: any) => ({
      id: tr.id,
      transferCode: tr.transfer_code,
      amountKes: (Number(tr.amount) || 0) / 100,
      currency: tr.currency,
      status: tr.status,
      reason: tr.reason || 'Payout to settlement account',
      recipientName: tr.recipient?.name || 'Bank/M-Pesa Account',
      createdAt: tr.createdAt,
    }));
    const result = {
      success: true,
      total: data.meta?.total || items.length,
      items,
    };
    paystackMemoryCache[cacheKey] = { data: result, timestamp: Date.now() };
    return result;
  } catch (err: any) {
    if (cached) return cached.data;
    return { success: false, total: 0, items: [], error: err.message };
  }
}

/**
 * Searches recent Paystack transactions for a successful payment by phone or KRA PIN.
 * Useful for self-healing payment verification when checkout ID might have changed or been replaced.
 */
export async function findRecentSuccessfulPaystackPayment(opts: {
  phone?: string;
  pin?: string;
  reference?: string;
  maxAgeMinutes?: number;
  skipCache?: boolean;
}): Promise<{
  found: boolean;
  reference?: string;
  amountKes?: number;
  paidAt?: string;
  pin?: string;
  customerPhone?: string;
  rawTransaction?: any;
}> {
  const maxAge = (opts.maxAgeMinutes || 30) * 60 * 1000;
  const now = Date.now();

  // 1. If explicit reference provided, verify it first
  if (opts.reference) {
    try {
      const direct = await verifyPaystackTransaction(opts.reference);
      if (direct.success && direct.status === 'success') {
        return {
          found: true,
          reference: direct.reference,
          amountKes: direct.amountKes,
          paidAt: direct.paidAt,
          pin: direct.metadata?.pin,
          customerPhone: direct.metadata?.phone,
        };
      }
    } catch {}
  }

  // 2. Fetch recent transactions
  const txList = await getPaystackLiveTransactions(40, 1, Boolean(opts.skipCache));
  if (!txList.success || !Array.isArray(txList.items)) {
    return { found: false };
  }

  const cleanPhone = opts.phone ? opts.phone.replace(/[^0-9]/g, '') : '';
  const cleanPin = opts.pin ? opts.pin.trim().toUpperCase() : '';

  for (const item of txList.items) {
    if (item.status !== 'success') continue;

    const itemTime = new Date(item.paidAt || item.createdAt).getTime();
    if (now - itemTime > maxAge) continue;

    const itemPhone = String(item.customerPhone || '').replace(/[^0-9]/g, '');
    const itemEmail = String(item.customerEmail || '').toLowerCase();
    const itemPin = String(item.pin || '').trim().toUpperCase();

    const matchesPhone = Boolean(
      cleanPhone &&
      (itemPhone.includes(cleanPhone) ||
        cleanPhone.includes(itemPhone) ||
        itemEmail.includes(cleanPhone) ||
        (cleanPhone.length >= 9 && itemPhone.endsWith(cleanPhone.slice(-9))))
    );

    const matchesPin = Boolean(
      cleanPin &&
      (itemPin.includes(cleanPin) || cleanPin.includes(itemPin))
    );

    if (matchesPhone || matchesPin) {
      return {
        found: true,
        reference: item.reference,
        amountKes: item.amountKes,
        paidAt: item.paidAt,
        pin: item.pin,
        customerPhone: item.customerPhone,
        rawTransaction: item,
      };
    }
  }

  return { found: false };
}

