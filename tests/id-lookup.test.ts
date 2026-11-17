import { describe, it, expect } from 'vitest';
import { cachedRecordToProfile, normalizeKraTaxpayerResponse, reconstructDwrPin } from '@/lib/kra-api';
import { looksLikeKraPin, maskPin } from '@/lib/masking';

/**
 * Real-module tests for National ID → KRA PIN lookup data handling.
 * Targets the actual normalization code path (lib/kra-api.ts) and the
 * masked-PIN / zero-storage guards (lib/masking.ts) — no reimplementations.
 */
describe('National ID & KRA PIN lookup normalization (lib/kra-api.ts)', () => {
  it('preserves leading zeros and string type for National ID numbers', () => {
    const cached = { id: '1', id_number: ' 08475912 ', name: 'MARY WANJIKU NDUNGU', pin: 'A012345678Z' };
    const profile = cachedRecordToProfile(cached);

    // Exact string match is preserved — never Number()-coerced
    expect(profile.idNumber).toBe(' 08475912 ');
    expect(profile.pin).toBe('A012345678Z');
  });

  it('uses the searched fallback ID verbatim when the cached record has none', () => {
    const profile = cachedRecordToProfile(
      { id: '3', id_number: '', name: 'Registered Taxpayer', pin: 'A033333333Z' },
      '08475912'
    );
    expect(profile.idNumber).toBe('08475912');
    expect(profile.taxpayerName).toBe('Registered Taxpayer');
  });

  it('marks cached profiles with gateway_cached source (zero-storage, ephemerally resolved)', () => {
    const profile = cachedRecordToProfile({ id: '1', id_number: '08475912', name: 'X', pin: 'A012345678Z' });
    expect(profile.source).toBe('gateway_cached');
  });

  it('extracts PIN and taxpayer name from a KRA Gateway PINDATA object structure', () => {
    const profile = normalizeKraTaxpayerResponse(
      {
        ErrorCode: '0',
        ErrorMessage: 'Success',
        PINDATA: {
          TaxpayerPIN: 'A012345678Z',
          TaxpayerName: 'MARY WANJIKU NDUNGU',
          Status: 'Active',
        },
      },
      '',
      'itax_live'
    );
    expect(profile.pin).toBe('A012345678Z');
    expect(profile.taxpayerName).toBe('MARY WANJIKU NDUNGU');
    expect(profile.status).toBe('Active');
  });

  it('handles PINDATA array structures with alternate KRAPIN key casing', () => {
    const profile = normalizeKraTaxpayerResponse(
      {
        ErrorCode: '0',
        PINDATA: [
          {
            KRAPIN: 'A098765432W',
            TaxpayerName: 'PETER OCHIENG OTIENO',
            TaxpayerStatus: 'Active',
          },
        ],
      },
      '',
      'itax_live'
    );
    expect(profile.pin).toBe('A098765432W');
    expect(profile.taxpayerName).toBe('PETER OCHIENG OTIENO');
  });

  it('falls back to the searched PIN when the payload contains no PIN field', () => {
    const profile = normalizeKraTaxpayerResponse(
      { ErrorCode: '0', taxpayers: [{ name: 'JANE DOE', nationality: 'KE' }] },
      'A011111111Z',
      'live_api'
    );
    expect(profile.pin).toBe('A011111111Z');
  });
});

describe('Authentic DWR PIN Reconstitution (lib/kra-api.ts)', () => {
  it('correctly reconstructs authentic KRA PIN by reversing the 5-digit carrier after #$ (KRA validateId spec)', () => {
    // KRA iTax validateId(): const mNum = prts[1].split('').reverse().join('');
    expect(reconstructDwrPin('A00*****36D#$79435')).toBe('A005349736D');
    expect(reconstructDwrPin('A02*****31K#$65314')).toBe('A024135631K');
    expect(reconstructDwrPin('A01*****19Q#$31886')).toBe('A016881319Q');
    expect(reconstructDwrPin('A01*****77I#$22104')).toBe('A014012277I');
    expect(reconstructDwrPin('P051234567X')).toBe('P051234567X');
    expect(reconstructDwrPin('invalid')).toBeNull();
    expect(reconstructDwrPin(null)).toBeNull();
  });

  it('recognizes that raw un-reconstructed masked strings are NOT usable full PINs', () => {
    const rawMasked = 'A01*****19Q';
    expect(looksLikeKraPin(rawMasked)).toBe(false);
  });

  it('accepts only authentic unmasked 11-char PIN shells', () => {
    expect(looksLikeKraPin('A012345678Z')).toBe(true);
    expect(looksLikeKraPin('a012345678z')).toBe(true); // case-normalized ingest
    expect(looksLikeKraPin('A012345678')).toBe(false); // missing check digit
    expect(looksLikeKraPin('')).toBe(false);
    expect(looksLikeKraPin(null)).toBe(false);
  });
});

describe('Zero-storage PII handling (lib/masking.ts)', () => {
  it('masks the KRA PIN for any logged or returned taxpayer data', () => {
    expect(maskPin('A012345678Z')).not.toBe('A012345678Z');
    expect(maskPin('A012345678Z')).toContain('*');
    expect(maskPin(null)).toBe('');
  });
});
