import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { maskTaxpayerData, maskPin, sealKraPin, tryResolveKraPin } from '@/lib/masking';

const TEST_SECRET = 'test-encryption-key-material-0000000000000042';
let originalKey: string | undefined;

beforeAll(() => {
  originalKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = TEST_SECRET;
});

afterAll(() => {
  if (originalKey === undefined) delete process.env.ENCRYPTION_KEY;
  else process.env.ENCRYPTION_KEY = originalKey;
});

describe('National ID and PIN masked retrieval behavior', () => {
  it('masks sensitive fields for preview while keeping full name and ID visible', () => {
    const rawTaxpayer = {
      pin: 'A001234567Z',
      idNumber: '11530093',
      name: 'POWEL DAYCK',
      taxpayerName: 'POWEL DAYCK',
      station: 'Eldoret TSO',
      registeredDate: '31/12/2012',
      town: 'KAPENGURIA',
      county: 'West Pokot',
      email: 'powel@example.com',
      phoneNumber: '0712345678',
    };

    const masked = maskTaxpayerData(rawTaxpayer, false, false);

    // Full name and National ID remain visible
    expect(masked.name).toBe('POWEL DAYCK');
    expect(masked.idNumber).toBe('11530093');
    expect(masked.fullName).toBe('POWEL DAYCK');

    // Sensitive contact details are masked
    expect(masked.email).toBe('p***l@example.com');
    expect(masked.phoneNumber).toBe('••••••••••');
    expect(masked.pin).toBe('A00*****67Z');
    expect(masked.isSubscribed).toBe(false);
  });

  it('safely handles masked PIN hints returned by KRA ID resolution', () => {
    const maskedHint = 'A00*****93Z';
    const rawTaxpayer = {
      pin: maskedHint,
      idNumber: '11530093',
      name: 'REGISTERED TAXPAYER',
      station: 'Eldoret TSO',
    };

    const masked = maskTaxpayerData(rawTaxpayer, false, false);
    expect(masked.name).toBe('REGISTERED TAXPAYER');
    expect(masked.idNumber).toBe('11530093');
    expect(masked.pin).toBe('A00*****93Z');
  });

  it('unmasks all fields when user has unlocked or subscribed', () => {
    const rawTaxpayer = {
      pin: 'A001234567Z',
      idNumber: '11530093',
      name: 'POWEL DAYCK',
      station: 'Eldoret TSO',
      registeredDate: '31/12/2012',
      email: 'powel@example.com',
      phoneNumber: '0712345678',
    };

    const unlocked = maskTaxpayerData(rawTaxpayer, true, false);
    expect(unlocked.pin).toBe('A001234567Z');
    expect(unlocked.email).toBe('powel@example.com');
    expect(unlocked.phoneNumber).toBe('0712345678');
    expect(unlocked.isSubscribed).toBe(true);
  });

  it('enforces that anonymous pre-payment captchaRequired payloads never contain plaintext PIN', () => {
    const fullPin = 'A012345678Z';
    const callerKnowsPin = false;

    const maskedPin = maskPin(fullPin);
    const sealedPin = sealKraPin(fullPin);

    const prePaymentResponse = {
      success: false,
      captchaRequired: true,
      pin: callerKnowsPin ? fullPin : maskedPin,
      rawPin: callerKnowsPin ? fullPin : sealedPin,
      error: `Taxpayer PIN (${maskedPin}) identified. Please solve the security stamp to retrieve your official registration date and station.`
    };

    // Plaintext PIN must not appear anywhere in display pin or error message
    expect(prePaymentResponse.pin).toBe('A01*****78Z');
    expect(prePaymentResponse.pin).not.toBe(fullPin);
    expect(prePaymentResponse.error).not.toContain(fullPin);
    expect(prePaymentResponse.error).toContain('A01*****78Z');

    // rawPin must be an opaque sealed blob that decrypts back to original PIN only server-side
    expect(prePaymentResponse.rawPin.startsWith('kraseal1:')).toBe(true);
    expect(prePaymentResponse.rawPin).not.toContain(fullPin);
    expect(tryResolveKraPin(prePaymentResponse.rawPin)).toBe(fullPin);
  });
});
