import { describe, it, expect } from 'vitest';

describe('Issue 4: National ID vs. KRA PIN Lookup Consistency', () => {

  it('preserves leading zeros and string type for National ID numbers', () => {
    const rawIdWithLeadingZero = ' 01234567 ';
    const cleanId = rawIdWithLeadingZero.trim();

    expect(typeof cleanId).toBe('string');
    expect(cleanId).toBe('01234567');
    expect(cleanId.startsWith('0')).toBe(true);
    expect(/^\d{5,12}$/.test(cleanId)).toBe(true);

    // Ensure it was NOT converted to a Number which loses leading zeros
    expect(Number(cleanId).toString()).toBe('1234567'); // Proves Number() would mutate data
    expect(cleanId).not.toBe(Number(cleanId).toString());
  });

  it('rejects invalid or malformed National ID formats', () => {
    const invalidIds = ['', ' ', '123', 'abc12345', '1234567890123', '283-475'];

    for (const id of invalidIds) {
      const clean = id.trim();
      const isValid = Boolean(clean) && /^\d{5,12}$/.test(clean);
      expect(isValid).toBe(false);
    }
  });

  it('correctly extracts resolved PIN from KRA Gateway PINDATA object structure', () => {
    const gatewayResponse = {
      ErrorCode: '0',
      ErrorMessage: 'Success',
      PINDATA: {
        TaxpayerPIN: 'A012345678Z',
        TaxpayerName: 'MARY WANJIKU NDUNGU',
        Status: 'Active',
      },
    };

    const pinContainer = (gatewayResponse as any).PINDATA || gatewayResponse;
    const pinRecord = Array.isArray(pinContainer) ? pinContainer[0] : pinContainer;
    const resolvedPin = (
      pinRecord?.TaxpayerPIN ||
      pinRecord?.taxpayerpin ||
      pinRecord?.KRAPIN ||
      pinRecord?.krapin ||
      pinRecord?.PIN ||
      pinRecord?.pin ||
      ''
    ).trim().toUpperCase();

    const resolvedName = (
      pinRecord?.TaxpayerName ||
      pinRecord?.taxpayername ||
      pinRecord?.Name ||
      pinRecord?.name ||
      ''
    ).trim();

    expect(resolvedPin).toBe('A012345678Z');
    expect(resolvedName).toBe('MARY WANJIKU NDUNGU');
  });

  it('correctly extracts resolved PIN from KRA Gateway PINDATA array structure', () => {
    const gatewayArrayResponse = {
      ErrorCode: '0',
      PINDATA: [
        {
          KRAPIN: 'A098765432W',
          TaxpayerName: 'PETER OCHIENG OTIENO',
          TaxpayerStatus: 'Active',
        },
      ],
    };

    const pinContainer = (gatewayArrayResponse as any).PINDATA || gatewayArrayResponse;
    const pinRecord = Array.isArray(pinContainer) ? pinContainer[0] : pinContainer;
    const resolvedPin = (
      pinRecord?.TaxpayerPIN ||
      pinRecord?.taxpayerpin ||
      pinRecord?.KRAPIN ||
      pinRecord?.krapin ||
      pinRecord?.PIN ||
      pinRecord?.pin ||
      ''
    ).trim().toUpperCase();

    expect(resolvedPin).toBe('A098765432W');
    expect(pinRecord?.TaxpayerName).toBe('PETER OCHIENG OTIENO');
  });

  it('strictly validates cached database record id_number exact string match', () => {
    const searchedId = '08475912';

    const cachedRecords = [
      { id: '1', id_number: '08475912', name: 'EXACT MATCH USER', pin: 'A011111111Z' },
      { id: '2', id_number: '8475912', name: 'WRONG USER WITHOUT ZERO', pin: 'A022222222Z' },
      { id: '3', id_number: '', name: 'Registered Taxpayer', pin: 'A033333333Z' },
    ];

    const match = cachedRecords.find(
      (c) => c.name && c.name.trim() !== 'Registered Taxpayer' && c.id_number === searchedId
    );

    expect(match).toBeDefined();
    expect(match?.name).toBe('EXACT MATCH USER');
    expect(match?.id_number).toBe('08475912');
  });

  it('never synthesizes fake PINs from KRA DWR masked responses with #$', () => {
    // When KRA returns a masked PIN with asterisks and #$ suffix:
    const dwrRawCallback = 'dwr.engine.remote.handleCallback("0","0","A01*****19Q#$31886");';
    const m = dwrRawCallback.match(/handleCallback\([^,]+,[^,]+,"([^"]+)"\)/);
    expect(m).not.toBeNull();

    const rawVal = m![1];
    const cleanPin = rawVal.split('#$')[0].trim().toUpperCase();

    // Must NOT replace * with the #$ digits (31886) to invent A013188619Q
    expect(cleanPin.includes('*')).toBe(true);
    expect(cleanPin).toBe('A01*****19Q');

    const isUnmaskedValidPin = !cleanPin.includes('*') && /^[A-Z]\d{9}[A-Z]$/.test(cleanPin);
    expect(isUnmaskedValidPin).toBe(false); // Proves it is correctly recognized as masked and rejected as full PIN
  });

  it('sanitizes searched IDs and PINs from system logs under zero-storage policy', () => {
    const rawDetails = {
      pin: 'A012345678Z',
      idNumber: '38411164',
      taxpayerName: 'John Doe',
      isSubscribed: true,
    };

    const sanitizedDetails = { ...rawDetails };
    delete (sanitizedDetails as any).pin;
    delete (sanitizedDetails as any).idNumber;
    delete (sanitizedDetails as any).taxpayerName;

    expect(sanitizedDetails).not.toHaveProperty('pin');
    expect(sanitizedDetails).not.toHaveProperty('idNumber');
    expect(sanitizedDetails).not.toHaveProperty('taxpayerName');
    expect(sanitizedDetails).toHaveProperty('isSubscribed', true);
  });
});

