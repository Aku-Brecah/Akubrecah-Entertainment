import { describe, it, expect } from 'vitest';
import { maskTaxpayerData, maskPin, maskEmail, maskPhone } from '@/lib/masking';

describe('National ID Verification & KRA PIN Decoder Suite', () => {

  describe('DWR Obfuscated Digits Decoding Logic', () => {
    it('correctly decodes the obfuscated 5 middle digits in exact forward order from KRA DWR response', () => {
      // Live KRA DWR callback response where middle digits "55372" are sent directly in natural order (e.g. for ID 23812094)
      const rawDwrVal = 'A01*****12N#$55372';
      const [masked, digits] = rawDwrVal.split('#$');
      const actualDigits = digits ? digits.trim() : '';
      const decodedPin = masked.replace(/\*+/g, actualDigits).trim().toUpperCase();

      expect(actualDigits).toBe('55372');
      expect(decodedPin).toBe('A015537212N');
      expect(/^[A-Z]\d{9}[A-Z]$/.test(decodedPin)).toBe(true);
    });

    it('correctly handles direct unmasked PIN callback responses', () => {
      const rawDwrVal = 'P051234567X';
      const cleanPin = rawDwrVal.trim().toUpperCase();

      expect(/^[A-Z]\d{9}[A-Z]$/.test(cleanPin)).toBe(true);
      expect(cleanPin).toBe('P051234567X');
    });

    it('parses both DWR handleCallback and string assignment s0 regex formats', () => {
      const callbackPayload = 'dwr.engine.remote.handleCallback("0","0","A01*****78Z#$76543");';
      const s0Payload = 's0="A01*****78Z#$76543";';

      const matchCallback = callbackPayload.match(/handleCallback\([^,]+,[^,]+,"([^"]+)"\)/) || callbackPayload.match(/s\d+="([^"]+)"/);
      const matchS0 = s0Payload.match(/handleCallback\([^,]+,[^,]+,"([^"]+)"\)/) || s0Payload.match(/s\d+="([^"]+)"/);

      expect(matchCallback).not.toBeNull();
      expect(matchCallback![1]).toBe('A01*****78Z#$76543');

      expect(matchS0).not.toBeNull();
      expect(matchS0![1]).toBe('A01*****78Z#$76543');
    });
  });

  describe('KDPA Masking & Identity Data Preservation', () => {
    it('strictly preserves the National ID number unmasked in client taxpayer preview', () => {
      const sampleTaxpayer = {
        pin: 'A01345678Z',
        idNumber: '28475912',
        name: 'JOHN KAMAU MWANGI',
        taxpayerName: 'JOHN KAMAU MWANGI',
        email: 'kamau.mwangi@example.com',
        phoneNumber: '0712345678',
        station: 'Kitale TSO',
        county: 'Trans Nzoia',
        town: 'Kitale',
      };

      const masked = maskTaxpayerData(sampleTaxpayer, false, false);

      // National ID must remain fully visible and exact
      expect(masked.idNumber).toBe('28475912');
      // Full legal name visible for identity verification
      expect(masked.taxpayerName).toBe('JOHN KAMAU MWANGI');
      // Station visible
      expect(masked.station).toBe('Kitale TSO');
      // PIN partially masked
      expect(masked.pin).toBe('A01*****78Z');
      // Email partially masked
      expect(masked.email).toBe('k***i@example.com');
      // Phone completely masked
      expect(masked.phoneNumber).toBe('••••••••••');
    });

    it('unmasks all fields when user has active subscription or admin access', () => {
      const sampleTaxpayer = {
        pin: 'A01345678Z',
        idNumber: '28475912',
        name: 'JOHN KAMAU MWANGI',
        email: 'kamau.mwangi@example.com',
        phoneNumber: '0712345678',
        station: 'Kitale TSO',
      };

      const adminView = maskTaxpayerData(sampleTaxpayer, true, true);
      expect(adminView.pin).toBe('A01345678Z');
      expect(adminView.email).toBe('kamau.mwangi@example.com');
      expect(adminView.phoneNumber).toBe('0712345678');
      expect(adminView.idNumber).toBe('28475912');
    });
  });

});
