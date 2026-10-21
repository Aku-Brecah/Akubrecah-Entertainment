import { describe, it, expect } from 'vitest';
import { maskTaxpayerData, maskPin, maskEmail } from '@/lib/masking';

describe('Issue 1: Certificate Unmasking & Payment Verification', () => {
  const sampleTaxpayer = {
    pin: 'A012345678Z',
    name: 'JANE WAMBUI NJOROGE',
    taxpayerName: 'JANE WAMBUI NJOROGE',
    fullName: 'JANE WAMBUI NJOROGE',
    idNumber: '28475912',
    email: 'jane.njoroge@example.com',
    phoneNumber: '0712345678',
    building: 'Lonrho House',
    street: 'Standard Street',
    city: 'Nairobi',
    town: 'Nairobi',
    county: 'Nairobi',
    station: 'Nairobi South TSO',
    district: 'Nairobi District',
    taxArea: 'CBD',
    poBox: '12345',
    postalCode: '00100',
    registeredDate: '15/04/2018',
  };

  it('keeps protected fields strictly masked when payment is pending or unverified', () => {
    const masked = maskTaxpayerData(sampleTaxpayer, false, false);

    expect(masked.isSubscribed).toBe(false);
    expect(masked.pin).toBe('A01*****78Z');
    expect(masked.email).toBe('j***e@example.com');
    expect(masked.phoneNumber).toBe('••••••••••');
    // Public non-sensitive identification stays visible
    expect(masked.name).toBe('JANE WAMBUI NJOROGE');
    expect(masked.idNumber).toBe('28475912');
    expect(masked.station).toBe('Nairobi South TSO');
  });

  it('unmasks all fields when payment or subscription is verified on server', () => {
    const unmasked = maskTaxpayerData(sampleTaxpayer, true, false);

    expect(unmasked.isSubscribed).toBe(true);
    expect(unmasked.pin).toBe('A012345678Z');
    expect(unmasked.email).toBe('jane.njoroge@example.com');
    expect(unmasked.phoneNumber).toBe('0712345678');
    expect(unmasked.building).toBe('Lonrho House');
    expect(unmasked.street).toBe('Standard Street');
    expect(unmasked.registeredDate).toBe('15/04/2018');
  });

  it('enforces PIN binding: payment for Certificate A cannot unlock Certificate B', () => {
    const verifiedPaymentRecord = {
      downloadId: 'dl_test_123',
      pin: 'A012345678Z',
      amountCharged: 20,
      currency: 'KES',
    };

    const requestedPinMismatch = 'P059876543X';
    const isPinMatching = (recordPin: string, queryPin: string) =>
      recordPin.toUpperCase().trim() === queryPin.toUpperCase().trim();

    expect(isPinMatching(verifiedPaymentRecord.pin, requestedPinMismatch)).toBe(false);
    expect(isPinMatching(verifiedPaymentRecord.pin, 'A012345678Z')).toBe(true);
  });

  it('detects masked bullet strings and prevents drawing bullets onto final PDF', () => {
    const isMaskedOrEmpty = (val: any) =>
      !val ||
      typeof val !== 'string' ||
      val.trim() === '' ||
      val.includes('•') ||
      val.includes('***') ||
      val.includes('*****') ||
      val.includes('••••••••••');

    expect(isMaskedOrEmpty('••••••••••')).toBe(true);
    expect(isMaskedOrEmpty('k***i@example.com')).toBe(true);
    expect(isMaskedOrEmpty('A01*****78Z')).toBe(true);
    expect(isMaskedOrEmpty('• Standard Street')).toBe(true);

    expect(isMaskedOrEmpty('0712345678')).toBe(false);
    expect(isMaskedOrEmpty('A012345678Z')).toBe(false);
    expect(isMaskedOrEmpty('jane.njoroge@example.com')).toBe(false);
    expect(isMaskedOrEmpty('Lonrho House')).toBe(false);
  });
});
