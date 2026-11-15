import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  claimOrVerifyRedemptionWindow,
  verifyCertificateDownloadEligibility,
  resetGlobalRedemptionRegistry,
  REDEMPTION_WINDOW_SECONDS,
} from '@/lib/mpesa-redemption';
import {
  verifyManualMpesaReceipt,
  verifyAndFulfillMpesaCheckout,
} from '@/lib/mpesa-verification';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: null })),
  clerkClient: vi.fn(async () => ({
    users: {
      getUser: vi.fn(async () => ({
        primaryEmailAddress: { emailAddress: 'taxpayer@example.com' },
      })),
    },
  })),
}));

// Mock System logger & Prisma
vi.mock('@/lib/prisma', () => ({
  createSystemLog: vi.fn(async () => ({})),
  default: {},
}));

describe('Authoritative 5-Minute M-Pesa Transaction Redemption System', () => {
  const PIN_A = 'A001234567B';
  const PIN_B = 'A009999999Z';
  const RECEIPT_1 = 'QWE123XYZ0';
  const RECEIPT_2 = 'QWE456XYZ1';

  beforeEach(() => {
    vi.useRealTimers();
    resetGlobalRedemptionRegistry();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 1: Initial redemption
  // ───────────────────────────────────────────────────────────────────────────
  it('Scenario 1: Initial redemption starts 5-minute timer and allows download', async () => {
    const startTime = new Date('2026-11-15T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(startTime);

    const claim = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: RECEIPT_1,
      requestedPinInput: PIN_A,
      amount: 20,
    });

    expect(claim.allowed).toBe(true);
    expect(claim.verified).toBe(true);
    expect(claim.redemptionStatus).toBe('ACTIVE');
    expect(claim.reason).toBe('FIRST_CLAIM');
    expect(claim.pin).toBe(PIN_A);
    expect(claim.remainingSeconds).toBe(REDEMPTION_WINDOW_SECONDS);
    expect(claim.downloadId).toBeTruthy();

    const expectedExpiry = new Date(startTime.getTime() + 300000).toISOString();
    expect(claim.expiresAt).toBe(expectedExpiry);

    // Verify download eligibility immediately after initial redemption
    const eligibility = await verifyCertificateDownloadEligibility({
      downloadId: claim.downloadId!,
      requestedPinInput: PIN_A,
    });

    expect(eligibility.allowed).toBe(true);
    expect(eligibility.downloadCount).toBe(1);
    expect(eligibility.cleanPin).toBe(PIN_A);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 2: Same PIN within 5 minutes
  // ───────────────────────────────────────────────────────────────────────────
  it('Scenario 2: Same PIN redownload at minute 2 succeeds and reports remaining time', async () => {
    const startTime = new Date('2026-11-15T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(startTime);

    const initial = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: RECEIPT_1,
      requestedPinInput: PIN_A,
    });
    expect(initial.allowed).toBe(true);

    // Advance 2 minutes (120 seconds)
    vi.advanceTimersByTime(120 * 1000);

    const redownload = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: RECEIPT_1,
      requestedPinInput: PIN_A,
    });

    expect(redownload.allowed).toBe(true);
    expect(redownload.redemptionStatus).toBe('ACTIVE');
    expect(redownload.reason).toBe('ACTIVE');
    expect(redownload.remainingSeconds).toBe(180); // 300 - 120 = 180s left

    // Verify download check also succeeds
    const eligibility = await verifyCertificateDownloadEligibility({
      downloadId: initial.downloadId!,
      requestedPinInput: PIN_A,
    });
    expect(eligibility.allowed).toBe(true);
    expect(eligibility.remainingSeconds).toBe(180);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 3: Different PIN within 5 minutes
  // ───────────────────────────────────────────────────────────────────────────
  it('Scenario 3: Different PIN within 5 minutes is rejected with 403 Forbidden', async () => {
    const startTime = new Date('2026-11-15T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(startTime);

    const initial = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: RECEIPT_1,
      requestedPinInput: PIN_A,
    });
    expect(initial.allowed).toBe(true);

    // Advance 2 minutes
    vi.advanceTimersByTime(120 * 1000);

    // Attempt to use receipt for PIN_B
    const crossPinAttempt = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: RECEIPT_1,
      requestedPinInput: PIN_B,
    });

    expect(crossPinAttempt.allowed).toBe(false);
    expect(crossPinAttempt.verified).toBe(false);
    expect(crossPinAttempt.httpStatus).toBe(403);
    expect(crossPinAttempt.reason).toBe('DIFFERENT_PIN');
    expect(crossPinAttempt.error).toBe(
      'This M-Pesa transaction code has already been used for another KRA PIN. Please provide a valid payment transaction code.'
    );

    // Verify download eligibility for PIN_B is also rejected with 403
    const eligibility = await verifyCertificateDownloadEligibility({
      downloadId: initial.downloadId!,
      requestedPinInput: PIN_B,
    });
    expect(eligibility.allowed).toBe(false);
    expect(eligibility.httpStatus).toBe(403);
    expect(eligibility.error).toContain('already been used for another KRA PIN');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 4: Same PIN after 5 minutes
  // ───────────────────────────────────────────────────────────────────────────
  it('Scenario 4: Same PIN after 5 minutes is rejected with 403 Download Window Expired', async () => {
    const startTime = new Date('2026-11-15T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(startTime);

    const initial = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: RECEIPT_1,
      requestedPinInput: PIN_A,
    });
    expect(initial.allowed).toBe(true);

    // Advance 6 minutes (360 seconds) -> Expiration
    vi.advanceTimersByTime(360 * 1000);

    const expiredAttempt = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: RECEIPT_1,
      requestedPinInput: PIN_A,
    });

    expect(expiredAttempt.allowed).toBe(false);
    expect(expiredAttempt.verified).toBe(false);
    expect(expiredAttempt.httpStatus).toBe(403);
    expect(expiredAttempt.redemptionStatus).toBe('EXPIRED');
    expect(expiredAttempt.reason).toBe('EXPIRED');
    expect(expiredAttempt.remainingSeconds).toBe(0);
    expect(expiredAttempt.error).toBe(
      'Your 5-minute certificate download window has expired. This M-Pesa transaction code has already been used and cannot be reused. Please make a new payment to retrieve another certificate.'
    );

    // Direct download API eligibility also strictly fails
    const eligibility = await verifyCertificateDownloadEligibility({
      downloadId: initial.downloadId!,
      requestedPinInput: PIN_A,
    });
    expect(eligibility.allowed).toBe(false);
    expect(eligibility.httpStatus).toBe(403);
    expect(eligibility.remainingSeconds).toBe(0);
    expect(eligibility.error).toContain('5-minute certificate download window has expired');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 5: Different PIN after 5 minutes
  // ───────────────────────────────────────────────────────────────────────────
  it('Scenario 5: Different PIN after 5 minutes is rejected with 403 Forbidden', async () => {
    const startTime = new Date('2026-11-15T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(startTime);

    const initial = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: RECEIPT_1,
      requestedPinInput: PIN_A,
    });
    expect(initial.allowed).toBe(true);

    // Advance 6 minutes
    vi.advanceTimersByTime(360 * 1000);

    // Cross-PIN attempt post-expiration
    const crossPinExpired = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: RECEIPT_1,
      requestedPinInput: PIN_B,
    });

    expect(crossPinExpired.allowed).toBe(false);
    expect(crossPinExpired.httpStatus).toBe(403);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 6: Simultaneous claims (Race-Condition Protection)
  // ───────────────────────────────────────────────────────────────────────────
  it('Scenario 6: Simultaneous concurrent claims for different PINs allow exactly one winner', async () => {
    vi.useRealTimers();

    const SIM_RECEIPT = 'QWESIM9999';

    // Fire two simultaneous claims concurrently
    const [res1, res2] = await Promise.all([
      claimOrVerifyRedemptionWindow({
        mpesaReceipt: SIM_RECEIPT,
        requestedPinInput: PIN_A,
      }),
      claimOrVerifyRedemptionWindow({
        mpesaReceipt: SIM_RECEIPT,
        requestedPinInput: PIN_B,
      }),
    ]);

    const results = [res1, res2];
    const successes = results.filter((r) => r.allowed === true && r.verified === true);
    const failures = results.filter((r) => r.allowed === false && r.httpStatus === 403);

    // Exactly one winner, exactly one rejected
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    expect(failures[0].error).toContain('already been used for another KRA PIN');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 7: Repeated fast downloads
  // ───────────────────────────────────────────────────────────────────────────
  it('Scenario 7: Rapid downloads within 5 minutes increment download counter and remain allowed', async () => {
    const claim = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: RECEIPT_2,
      requestedPinInput: PIN_A,
    });

    expect(claim.allowed).toBe(true);
    const downloadId = claim.downloadId!;

    // Call 4 times in quick succession
    const call1 = await verifyCertificateDownloadEligibility({ downloadId, requestedPinInput: PIN_A });
    const call2 = await verifyCertificateDownloadEligibility({ downloadId, requestedPinInput: PIN_A });
    const call3 = await verifyCertificateDownloadEligibility({ downloadId, requestedPinInput: PIN_A });
    const call4 = await verifyCertificateDownloadEligibility({ downloadId, requestedPinInput: PIN_A });

    expect(call1.allowed).toBe(true);
    expect(call1.downloadCount).toBe(1);

    expect(call2.allowed).toBe(true);
    expect(call2.downloadCount).toBe(2);

    expect(call3.allowed).toBe(true);
    expect(call3.downloadCount).toBe(3);

    expect(call4.allowed).toBe(true);
    expect(call4.downloadCount).toBe(4);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 8: Rapid calls at expiration boundary
  // ───────────────────────────────────────────────────────────────────────────
  it('Scenario 8: Call at minute 4:59 succeeds; call at minute 5:01 is rejected', async () => {
    const startTime = new Date('2026-11-15T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(startTime);

    const claim = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: 'QWEBOUND11',
      requestedPinInput: PIN_A,
    });
    const downloadId = claim.downloadId!;

    // Advance to 4 minutes and 59 seconds (299 seconds)
    vi.advanceTimersByTime(299 * 1000);

    const callAtBoundary = await verifyCertificateDownloadEligibility({
      downloadId,
      requestedPinInput: PIN_A,
    });
    expect(callAtBoundary.allowed).toBe(true);
    expect(callAtBoundary.remainingSeconds).toBe(1);

    // Advance 2 more seconds -> 5 minutes and 1 second (301 seconds)
    vi.advanceTimersByTime(2 * 1000);

    const callPastBoundary = await verifyCertificateDownloadEligibility({
      downloadId,
      requestedPinInput: PIN_A,
    });
    expect(callPastBoundary.allowed).toBe(false);
    expect(callPastBoundary.httpStatus).toBe(403);
    expect(callPastBoundary.remainingSeconds).toBe(0);
    expect(callPastBoundary.error).toContain('5-minute certificate download window has expired');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 9: Page refresh during active window
  // ───────────────────────────────────────────────────────────────────────────
  it('Scenario 9: Page refresh at minute 2 continues countdown accurately from 180s', async () => {
    const startTime = new Date('2026-11-15T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(startTime);

    const initial = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: 'QWEREFRESH',
      requestedPinInput: PIN_A,
    });
    expect(initial.remainingSeconds).toBe(300);

    // Advance 120 seconds
    vi.advanceTimersByTime(120 * 1000);

    // Emulate page reload / re-verification query
    const refreshQuery = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: 'QWEREFRESH',
      requestedPinInput: PIN_A,
    });

    expect(refreshQuery.allowed).toBe(true);
    expect(refreshQuery.remainingSeconds).toBe(180);
    expect(refreshQuery.expiresAt).toBe(initial.expiresAt);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 10: Page refresh after expiration
  // ───────────────────────────────────────────────────────────────────────────
  it('Scenario 10: Page refresh at minute 6 displays expired state and blocks download', async () => {
    const startTime = new Date('2026-11-15T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(startTime);

    await claimOrVerifyRedemptionWindow({
      mpesaReceipt: 'QWEAFTEREX',
      requestedPinInput: PIN_A,
    });

    // Advance 360 seconds
    vi.advanceTimersByTime(360 * 1000);

    const refreshQuery = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: 'QWEAFTEREX',
      requestedPinInput: PIN_A,
    });

    expect(refreshQuery.allowed).toBe(false);
    expect(refreshQuery.redemptionStatus).toBe('EXPIRED');
    expect(refreshQuery.remainingSeconds).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 11: Device change during active window
  // ───────────────────────────────────────────────────────────────────────────
  it('Scenario 11: Device change during active window allows download for same PIN', async () => {
    const startTime = new Date('2026-11-15T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(startTime);

    const initial = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: 'QWEDEV1111',
      requestedPinInput: PIN_A,
    });

    vi.advanceTimersByTime(90 * 1000);

    // Device 2 submits receipt & same PIN
    const device2 = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: 'QWEDEV1111',
      requestedPinInput: PIN_A,
    });

    expect(device2.allowed).toBe(true);
    expect(device2.remainingSeconds).toBe(210);
    expect(device2.downloadId).toBe(initial.downloadId);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 12: Device change after expiration
  // ───────────────────────────────────────────────────────────────────────────
  it('Scenario 12: Device change after expiration is strictly rejected with 403', async () => {
    const startTime = new Date('2026-11-15T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(startTime);

    await claimOrVerifyRedemptionWindow({
      mpesaReceipt: 'QWEDEV2222',
      requestedPinInput: PIN_A,
    });

    vi.advanceTimersByTime(310 * 1000);

    // Device 2 submits receipt after expiry
    const device2 = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: 'QWEDEV2222',
      requestedPinInput: PIN_A,
    });

    expect(device2.allowed).toBe(false);
    expect(device2.httpStatus).toBe(403);
    expect(device2.redemptionStatus).toBe('EXPIRED');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 13: Unverified receipt
  // ───────────────────────────────────────────────────────────────────────────
  it('Scenario 13: Unverified or fabricated receipt code is rejected', async () => {
    // Case 1: Fabricated placeholder code
    const resFake = await verifyManualMpesaReceipt({
      mpesaCodeInput: 'FAKE999999',
      rawPinInput: PIN_A,
    });
    expect(resFake.verified).toBe(false);
    expect(resFake.status).toBe('failed');
    expect(resFake.httpStatus).toBe(400);

    // Case 2: Code with valid format but never paid / not in payment records
    const resUnpaid = await verifyManualMpesaReceipt({
      mpesaCodeInput: 'UNPAID1234',
      rawPinInput: PIN_A,
    });
    expect(resUnpaid.verified).toBe(false);
    expect(resUnpaid.status).toBe('failed');
    expect(resUnpaid.httpStatus).toBe(400);
    expect(resUnpaid.error).toContain('not found in verified payment records');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 14: Callback replay immunity
  // ───────────────────────────────────────────────────────────────────────────
  it('Scenario 14: Callback replay preserves original firstClaimedAt and expiresAt timestamps', async () => {
    const startTime = new Date('2026-11-15T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(startTime);

    const initial = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: 'QWECALLBCK',
      checkoutId: 'ws_CO_REPLAY_TEST',
      requestedPinInput: PIN_A,
    });

    const originalFirstClaimedAt = initial.firstClaimedAt;
    const originalExpiresAt = initial.expiresAt;

    // Advance 100 seconds and simulate a duplicate Daraja callback
    vi.advanceTimersByTime(100 * 1000);

    const replayed = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: 'QWECALLBCK',
      checkoutId: 'ws_CO_REPLAY_TEST',
      requestedPinInput: PIN_A,
    });

    // Timestamps MUST remain immutable
    expect(replayed.firstClaimedAt).toBe(originalFirstClaimedAt);
    expect(replayed.expiresAt).toBe(originalExpiresAt);
    expect(replayed.remainingSeconds).toBe(200);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 15: Direct API bypass protection
  // ───────────────────────────────────────────────────────────────────────────
  it('Scenario 15: Direct call to generate-certificate with expired download token returns HTTP 403', async () => {
    const startTime = new Date('2026-11-15T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(startTime);

    const claim = await claimOrVerifyRedemptionWindow({
      mpesaReceipt: 'QWEDIRECT1',
      requestedPinInput: PIN_A,
    });
    const downloadId = claim.downloadId!;

    // Advance past 5 minutes
    vi.advanceTimersByTime(350 * 1000);

    const { POST } = await import('@/app/api/generate-certificate/route');
    const req = new NextRequest('https://kra.akubrecah.com/api/generate-certificate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pin: PIN_A,
        downloadId,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain('5-minute certificate download window has expired');
  });
});
