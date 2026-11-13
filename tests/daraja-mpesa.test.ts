import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { sealKraPin } from '@/lib/masking';

const mocks = vi.hoisted(() => {
  const mpesaTransactions = new Map<string, any>();
  const certificateDownloads = new Map<string, any>();

  return {
    mpesaTransactions,
    certificateDownloads,
    reset() {
      mpesaTransactions.clear();
      certificateDownloads.clear();
    },
    prismaMock: {
      mpesaTransaction: {
        findFirst: vi.fn(async ({ where }: any) => {
          for (const tx of mpesaTransactions.values()) {
            if (where?.phone && tx.phone !== where.phone) continue;
            if (where?.status && tx.status !== where.status) continue;
            if (where?.amount && tx.amount !== where.amount) continue;
            if (where?.pin && tx.pin !== where.pin) continue;
            if (where?.reference && tx.reference !== where.reference) continue;
            return tx;
          }
          return null;
        }),
        findUnique: vi.fn(async ({ where }: any) => {
          if (where?.checkoutRequestId) {
            return mpesaTransactions.get(where.checkoutRequestId) || null;
          }
          return null;
        }),
        upsert: vi.fn(async ({ where, create, update }: any) => {
          const existing = mpesaTransactions.get(where.checkoutRequestId);
          const next = existing
            ? { ...existing, ...update, updatedAt: new Date() }
            : { id: `mtx_${mpesaTransactions.size + 1}`, createdAt: new Date(), updatedAt: new Date(), ...create };
          mpesaTransactions.set(where.checkoutRequestId, next);
          return next;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const existing = mpesaTransactions.get(where.checkoutRequestId);
          if (!existing) throw new Error('Not found');
          const next = { ...existing, ...data, updatedAt: new Date() };
          mpesaTransactions.set(where.checkoutRequestId, next);
          return next;
        }),
        updateMany: vi.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const [key, tx] of mpesaTransactions.entries()) {
            if (!where?.checkoutRequestId || tx.checkoutRequestId === where.checkoutRequestId) {
              mpesaTransactions.set(key, { ...tx, ...data, updatedAt: new Date() });
              count++;
            }
          }
          return { count };
        }),
      },
      certificateDownload: {
        findFirst: vi.fn(async ({ where }: any) => {
          for (const dl of certificateDownloads.values()) {
            if (where?.checkoutId && dl.checkoutId !== where.checkoutId) continue;
            return dl;
          }
          return null;
        }),
        create: vi.fn(async ({ data }: any) => {
          if (data.checkoutId && certificateDownloads.has(data.checkoutId)) {
            const err: any = new Error('Unique constraint failed');
            err.code = 'P2002';
            throw err;
          }
          const rec = { id: `dl_${certificateDownloads.size + 1}`, createdAt: new Date(), ...data };
          certificateDownloads.set(data.checkoutId || rec.id, rec);
          return rec;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          for (const [key, dl] of certificateDownloads.entries()) {
            if (dl.id === where.id) {
              const next = { ...dl, ...data };
              certificateDownloads.set(key, next);
              return next;
            }
          }
          return null;
        }),
      },
      cyberInvoice: {
        findFirst: vi.fn(async () => null),
      },
      cyberCafe: {
        findFirst: vi.fn(async () => null),
      },
      ai_conversations: {
        findMany: vi.fn(async () => []),
      },
    },
  };
});

vi.mock('@/lib/prisma', () => ({
  default: mocks.prismaMock,
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: null })),
  clerkClient: vi.fn(),
}));

vi.mock('@/lib/subscription', () => ({
  getOrCreateDbUser: vi.fn(async (clerkId: string) => ({
    id: `usr_${clerkId}`,
    clerkId,
  })),
  isAdminUser: vi.fn(async () => false),
}));

vi.mock('@/lib/evolution', () => ({
  sendEvolutionTextMessage: vi.fn(async () => undefined),
}));

const originalEnv = { ...process.env };
const originalFetch = global.fetch;

describe('Safaricom Daraja M-Pesa Express Integration', () => {
  beforeEach(() => {
    mocks.reset();
    vi.clearAllMocks();
    process.env.ENCRYPTION_KEY = 'test-encryption-key-material-0000000000000042';
    process.env.DARAJA_ENVIRONMENT = 'production';
    process.env.DARAJA_CONSUMER_KEY = 'live_consumer_key_test';
    process.env.DARAJA_CONSUMER_SECRET = 'live_consumer_secret_test';
    process.env.DARAJA_SHORTCODE = '9914132';
    process.env.DARAJA_PASSKEY = 'live_passkey_test';
    process.env.DARAJA_CALLBACK_URL = 'https://kra.akubrecah.com/api/mpesa/callback';
    process.env.DARAJA_CALLBACK_TOKEN = 'test_daraja_callback_secret_token';
    process.env.MPESA_DOWNLOAD_FEE_KES = '20';
    process.env.MPESA_SUBSCRIPTION_AMOUNT_KES = '500';

    const g = global as any;
    g.mpesaCallbacks = {};
    g.darajaOAuthCache = {};
    g.darajaQueryLastAt = {};
    g.mpesaStkPinBindings = {};
    g.mpesaStkMetaBindings = {};
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  describe('Phone validation & normalization', () => {
    it('validates and normalizes Safaricom & Kenyan mobile formats (07/01/+254)', async () => {
      const { isValidKenyanMpesaPhone, normalizePhoneNumber } = await import('@/lib/whatsapp/mpesa-dispatch');

      expect(normalizePhoneNumber('0712 345 678')).toBe('254712345678');
      expect(normalizePhoneNumber('0112345678')).toBe('254112345678');
      expect(normalizePhoneNumber('+254798765432')).toBe('254798765432');
      expect(normalizePhoneNumber('712345678')).toBe('254712345678');

      expect(isValidKenyanMpesaPhone('0712345678')).toBe(true);
      expect(isValidKenyanMpesaPhone('0112345678')).toBe(true);
      expect(isValidKenyanMpesaPhone('+254712345678')).toBe(true);
      expect(isValidKenyanMpesaPhone('254110000000')).toBe(true);

      expect(isValidKenyanMpesaPhone('0201234567')).toBe(false);
      expect(isValidKenyanMpesaPhone('07123')).toBe(false);
      expect(isValidKenyanMpesaPhone('+14155551234')).toBe(false);
      expect(isValidKenyanMpesaPhone('')).toBe(false);
    });
  });

  describe('Daraja ResultCode mapping', () => {
    it('maps Daraja result codes to explicit UI and database states', async () => {
      const { mapDarajaResultCodeToStatus } = await import('@/lib/whatsapp/mpesa-dispatch');

      expect(mapDarajaResultCodeToStatus('0')).toEqual({ status: 'success', dbStatus: 'COMPLETED' });
      expect(mapDarajaResultCodeToStatus('1032')).toEqual({ status: 'cancelled', dbStatus: 'CANCELLED' });
      expect(mapDarajaResultCodeToStatus('1037')).toEqual({ status: 'timeout', dbStatus: 'TIMED_OUT' });
      expect(mapDarajaResultCodeToStatus('1019')).toEqual({ status: 'timeout', dbStatus: 'TIMED_OUT' });
      expect(mapDarajaResultCodeToStatus('1')).toEqual({ status: 'failed', dbStatus: 'FAILED' });
      expect(mapDarajaResultCodeToStatus('2001')).toEqual({ status: 'failed', dbStatus: 'FAILED' });
    });
  });

  describe('POST /api/mpesa/stkpush', () => {
    it('rejects invalid Kenyan phone numbers with HTTP 400', async () => {
      const { POST } = await import('@/app/api/mpesa/stkpush/route');
      const req = new NextRequest('https://kra.akubrecah.com/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '0201234567',
          pin: 'A012345678Z',
          type: 'certificate',
        }),
      });

      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('enforces server pricing (KES 20), unseals encrypted PIN, and dispatches Daraja production STK Push', async () => {
      const fetchCalls: Array<{ url: string; body?: any }> = [];
      global.fetch = vi.fn(async (input: any, init?: RequestInit) => {
        const url = String(input);
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        fetchCalls.push({ url, body });

        if (url.includes('/oauth/v1/generate')) {
          return new Response(
            JSON.stringify({ access_token: 'daraja_oauth_token_123', expires_in: '3599' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (url.includes('/mpesa/stkpush/v1/processrequest')) {
          return new Response(
            JSON.stringify({
              MerchantRequestID: '29115-34620561-1',
              CheckoutRequestID: 'ws_CO_13112026_1001',
              ResponseCode: '0',
              ResponseDescription: 'Success. Request accepted for processing',
              CustomerMessage: 'Success. Request accepted for processing',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Unexpected fetch URL: ${url}`);
      }) as any;

      const sealed = sealKraPin('A012345678Z');
      const { POST } = await import('@/app/api/mpesa/stkpush/route');
      const req = new NextRequest('https://kra.akubrecah.com/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '0712345678',
          pin: sealed,
          amount: 1, // Tampered amount must be ignored by server
          type: 'certificate',
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.gateway).toBe('daraja');
      expect(data.status).toBe('PENDING');
      expect(data.amount).toBe(20);
      expect(data.phone).toBe('254712345678');
      expect(data.checkoutRequestId).toBe('ws_CO_13112026_1001');

      const oauthCall = fetchCalls.find((c) => c.url.includes('/oauth/v1/generate'));
      const stkCall = fetchCalls.find((c) => c.url.includes('/mpesa/stkpush/v1/processrequest'));
      expect(oauthCall?.url).toBe('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials');
      expect(stkCall?.url).toBe('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest');
      expect(stkCall?.body.Amount).toBe(20);
      expect(stkCall?.body.BusinessShortCode).toBe(9914132);
      expect(stkCall?.body.PartyA).toBe(254712345678);
      expect(stkCall?.body.AccountReference).toBe('A012345678Z');
      expect(stkCall?.body.CallBackURL).toContain('token=test_daraja_callback_secret_token');

      const persisted = mocks.mpesaTransactions.get('ws_CO_13112026_1001');
      expect(persisted?.status).toBe('PENDING');
      expect(persisted?.pin).toBe('A012345678Z');
      expect(persisted?.amount).toBe(20);
    });
  });

  describe('POST /api/mpesa/callback', () => {
    it('fails closed when callback token is missing or invalid', async () => {
      const { POST } = await import('@/app/api/mpesa/callback/route');

      const unauthReq = new NextRequest('https://kra.akubrecah.com/api/mpesa/callback', {
        method: 'POST',
        body: JSON.stringify({ Body: { stkCallback: { CheckoutRequestID: 'ws_CO_UNAUTH' } } }),
      });
      const unauthRes = await POST(unauthReq);
      expect(unauthRes.status).toBe(401);

      const wrongReq = new NextRequest('https://kra.akubrecah.com/api/mpesa/callback?token=wrong_token', {
        method: 'POST',
        body: JSON.stringify({ Body: { stkCallback: { CheckoutRequestID: 'ws_CO_WRONG' } } }),
      });
      const wrongRes = await POST(wrongReq);
      expect(wrongRes.status).toBe(401);

      delete process.env.DARAJA_CALLBACK_TOKEN;
      delete process.env.MPESA_CALLBACK_TOKEN;
      const unsetRes = await POST(unauthReq);
      expect(unsetRes.status).toBe(503);
    });

    it('rejects underpaid callbacks without unlocking a certificate', async () => {
      mocks.mpesaTransactions.set('ws_CO_UNDERPAID', {
        id: 'mtx_u1',
        checkoutRequestId: 'ws_CO_UNDERPAID',
        merchantRequestId: 'mr_u1',
        pin: 'A012345678Z',
        phone: '254712345678',
        amount: 20,
        status: 'PENDING',
        channel: 'web',
      });

      const { POST } = await import('@/app/api/mpesa/callback/route');
      const req = new NextRequest(
        'https://kra.akubrecah.com/api/mpesa/callback?token=test_daraja_callback_secret_token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Body: {
              stkCallback: {
                MerchantRequestID: 'mr_u1',
                CheckoutRequestID: 'ws_CO_UNDERPAID',
                ResultCode: 0,
                ResultDesc: 'The service request is processed successfully.',
                CallbackMetadata: {
                  Item: [
                    { Name: 'Amount', Value: 5 },
                    { Name: 'MpesaReceiptNumber', Value: 'FAKE5KES' },
                    { Name: 'PhoneNumber', Value: 254712345678 },
                  ],
                },
              },
            },
          }),
        }
      );

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mocks.certificateDownloads.size).toBe(0);
      expect(mocks.mpesaTransactions.get('ws_CO_UNDERPAID')?.status).toBe('FAILED');
    });

    it('processes successful callback once, records M-Pesa receipt, and deduplicates repeat callbacks', async () => {
      mocks.mpesaTransactions.set('ws_CO_PAID_1', {
        id: 'mtx_p1',
        checkoutRequestId: 'ws_CO_PAID_1',
        merchantRequestId: 'mr_p1',
        pin: 'A012345678Z',
        phone: '254712345678',
        amount: 20,
        status: 'PENDING',
        channel: 'web',
      });

      const payload = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'mr_p1',
            CheckoutRequestID: 'ws_CO_PAID_1',
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 20 },
                { Name: 'MpesaReceiptNumber', Value: 'UB12XYZ789' },
                { Name: 'TransactionDate', Value: 20261113213000 },
                { Name: 'PhoneNumber', Value: 254712345678 },
              ],
            },
          },
        },
      };

      const { POST } = await import('@/app/api/mpesa/callback/route');
      const res1 = await POST(
        new NextRequest(
          'https://kra.akubrecah.com/api/mpesa/callback?token=test_daraja_callback_secret_token',
          { method: 'POST', body: JSON.stringify(payload) }
        )
      );
      expect(res1.status).toBe(200);
      expect(mocks.certificateDownloads.size).toBe(1);

      const dl = mocks.certificateDownloads.get('ws_CO_PAID_1');
      expect(dl.pin).toBe('A012345678Z');
      expect(dl.mpesaReceipt).toBe('UB12XYZ789');
      expect(dl.amountCharged).toBe(20);
      expect(mocks.mpesaTransactions.get('ws_CO_PAID_1')?.status).toBe('COMPLETED');

      // Second duplicate Safaricom callback must be idempotent
      const res2 = await POST(
        new NextRequest(
          'https://kra.akubrecah.com/api/mpesa/callback?token=test_daraja_callback_secret_token',
          { method: 'POST', body: JSON.stringify(payload) }
        )
      );
      const data2 = await res2.json();
      expect(res2.status).toBe(200);
      expect(data2.duplicate).toBe(true);
      expect(mocks.certificateDownloads.size).toBe(1);
    });

    it('persists CANCELLED (1032) and TIMED_OUT (1037) statuses correctly', async () => {
      mocks.mpesaTransactions.set('ws_CO_CANCEL_1', {
        id: 'mtx_c1',
        checkoutRequestId: 'ws_CO_CANCEL_1',
        status: 'PENDING',
        channel: 'web',
      });
      mocks.mpesaTransactions.set('ws_CO_TIMEOUT_1', {
        id: 'mtx_t1',
        checkoutRequestId: 'ws_CO_TIMEOUT_1',
        status: 'PENDING',
        channel: 'web',
      });

      const { POST } = await import('@/app/api/mpesa/callback/route');
      await POST(
        new NextRequest(
          'https://kra.akubrecah.com/api/mpesa/callback?token=test_daraja_callback_secret_token',
          {
            method: 'POST',
            body: JSON.stringify({
              Body: {
                stkCallback: {
                  MerchantRequestID: 'mr_c1',
                  CheckoutRequestID: 'ws_CO_CANCEL_1',
                  ResultCode: 1032,
                  ResultDesc: 'Request cancelled by user',
                },
              },
            }),
          }
        )
      );
      expect(mocks.mpesaTransactions.get('ws_CO_CANCEL_1')?.status).toBe('CANCELLED');

      await POST(
        new NextRequest(
          'https://kra.akubrecah.com/api/mpesa/callback?token=test_daraja_callback_secret_token',
          {
            method: 'POST',
            body: JSON.stringify({
              Body: {
                stkCallback: {
                  MerchantRequestID: 'mr_t1',
                  CheckoutRequestID: 'ws_CO_TIMEOUT_1',
                  ResultCode: 1037,
                  ResultDesc: 'DS timeout user cannot be reached',
                },
              },
            }),
          }
        )
      );
      expect(mocks.mpesaTransactions.get('ws_CO_TIMEOUT_1')?.status).toBe('TIMED_OUT');
    });
  });

  describe('POST /api/mpesa/verify & GET /api/mpesa/status/[checkoutRequestId]', () => {
    it('reconciles via Daraja STK Query when callback is delayed and enforces PIN binding', async () => {
      mocks.mpesaTransactions.set('ws_CO_QUERY_1', {
        id: 'mtx_q1',
        checkoutRequestId: 'ws_CO_QUERY_1',
        merchantRequestId: 'mr_q1',
        pin: 'A012345678Z',
        phone: '254712345678',
        amount: 20,
        status: 'PENDING',
        channel: 'web',
      });

      global.fetch = vi.fn(async (input: any) => {
        const url = String(input);
        if (url.includes('/oauth/v1/generate')) {
          return new Response(
            JSON.stringify({ access_token: 'daraja_query_token', expires_in: '3599' }),
            { status: 200 }
          );
        }
        if (url.includes('/mpesa/stkpushquery/v1/query')) {
          return new Response(
            JSON.stringify({
              ResponseCode: '0',
              ResultCode: '0',
              ResultDesc: 'The service request is processed successfully.',
              CheckoutRequestID: 'ws_CO_QUERY_1',
            }),
            { status: 200 }
          );
        }
        throw new Error(`Unexpected fetch URL: ${url}`);
      }) as any;

      const { POST } = await import('@/app/api/mpesa/verify/route');
      const verifyReq = new NextRequest('https://kra.akubrecah.com/api/mpesa/verify', {
        method: 'POST',
        body: JSON.stringify({
          checkoutRequestId: 'ws_CO_QUERY_1',
          pin: sealKraPin('A012345678Z'),
        }),
      });
      const verifyRes = await POST(verifyReq);
      const verifyData = await verifyRes.json();

      expect(verifyRes.status).toBe(200);
      expect(verifyData.success).toBe(true);
      expect(verifyData.verified).toBe(true);
      expect(verifyData.status).toBe('success');
      expect(verifyData.downloadId).toBeDefined();
      expect(mocks.mpesaTransactions.get('ws_CO_QUERY_1')?.status).toBe('COMPLETED');

      // PIN-lock check via GET /api/mpesa/status/[checkoutRequestId]: mismatched PIN must return 403
      const { GET } = await import('@/app/api/mpesa/status/[checkoutRequestId]/route');
      const mismatchRes = await GET(
        new NextRequest('https://kra.akubrecah.com/api/mpesa/status/ws_CO_QUERY_1?pin=A099999999X'),
        { params: Promise.resolve({ checkoutRequestId: 'ws_CO_QUERY_1' }) }
      );
      expect(mismatchRes.status).toBe(403);
    });

    it('never marks a pending or cancelled transaction as verified', async () => {
      mocks.mpesaTransactions.set('ws_CO_PENDING_1', {
        id: 'mtx_pend',
        checkoutRequestId: 'ws_CO_PENDING_1',
        pin: 'A012345678Z',
        phone: '254712345678',
        amount: 20,
        status: 'PENDING',
        channel: 'web',
      });
      mocks.mpesaTransactions.set('ws_CO_CANCELLED_2', {
        id: 'mtx_canc',
        checkoutRequestId: 'ws_CO_CANCELLED_2',
        pin: 'A012345678Z',
        phone: '254712345678',
        amount: 20,
        status: 'CANCELLED',
        resultCode: 1032,
        resultDesc: 'Request cancelled by user',
        channel: 'web',
      });

      global.fetch = vi.fn(async (input: any) => {
        const url = String(input);
        if (url.includes('/oauth/v1/generate')) {
          return new Response(JSON.stringify({ access_token: 'tok', expires_in: '3599' }), { status: 200 });
        }
        return new Response(JSON.stringify({ errorCode: '500.001.1001' }), { status: 500 });
      }) as any;

      const { GET } = await import('@/app/api/mpesa/status/[checkoutRequestId]/route');

      const pendRes = await GET(
        new NextRequest('https://kra.akubrecah.com/api/mpesa/status/ws_CO_PENDING_1'),
        { params: Promise.resolve({ checkoutRequestId: 'ws_CO_PENDING_1' }) }
      );
      const pendData = await pendRes.json();
      expect(pendRes.status).toBe(200);
      expect(pendData.verified).toBe(false);
      expect(pendData.status).toBe('pending');
      expect(pendData.downloadId).toBeUndefined();

      const cancRes = await GET(
        new NextRequest('https://kra.akubrecah.com/api/mpesa/status/ws_CO_CANCELLED_2'),
        { params: Promise.resolve({ checkoutRequestId: 'ws_CO_CANCELLED_2' }) }
      );
      const cancData = await cancRes.json();
      expect(cancData.verified).toBe(false);
      expect(cancData.status).toBe('cancelled');
      expect(cancData.downloadId).toBeUndefined();
    });
  });
});
