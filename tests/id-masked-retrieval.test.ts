import { describe, it, expect } from 'vitest';
import { maskTaxpayerData, maskPin } from '@/lib/masking';

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
});
