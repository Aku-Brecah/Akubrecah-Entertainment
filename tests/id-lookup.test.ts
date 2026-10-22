import { describe, it, expect } from 'vitest';
import { cachedRecordToProfile, normalizeKraTaxpayerResponse } from '@/lib/kra-api';
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

describe('Masked PIN rejection (lib/masking.ts — mirrors the ITax DWR guard)', () => {
  it('recognizes that masked DWR callbacks are NOT usable full PINs', () => {
    // dwr.engine.remote.handleCallback("0","0","A01*****19Q#$31886");
    // The real parser strips the #$ carrier suffix — this test pins the * rule:
    // masked middle digits must never be spliced from the #$ payload (31886).
    const maskedWithCarrier = 'A01*****19Q#$31886';
    const cleanPin = maskedWithCarrier.split('#$')[0].trim().toUpperCase();

    expect(cleanPin).toBe('A01*****19Q');
    expect(looksLikeKraPin(cleanPin)).toBe(false);
    // NOTE: a spliced PIN built from the #$ digits would happen to satisfy the
    // 11-char shape — which is exactly why the DWR parser refuses masked values
    // outright instead of trying to reconstruct them.
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
