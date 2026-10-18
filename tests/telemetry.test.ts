import { describe, it, expect } from 'vitest';
import { sanitizeTelemetryPayload } from '@/lib/telemetry/sanitizer';

describe('Telemetry & Privacy Sanitizer', () => {
  it('strips explicitly forbidden secrets, passwords, and tokens', () => {
    const rawPayload = {
      action: 'login_attempt',
      password: 'SuperSecretPassword123!',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      secret: 'sk_live_1234567890',
      authorization: 'Bearer secret_token',
      creditCard: '4111111111111111',
      cvv: '123',
      mpesaReceipt: 'QGH7128912',
      normalField: 'safe_value',
    };

    const sanitized = sanitizeTelemetryPayload(rawPayload);

    expect(sanitized.password).toBeUndefined();
    expect(sanitized.token).toBeUndefined();
    expect(sanitized.secret).toBeUndefined();
    expect(sanitized.authorization).toBeUndefined();
    expect(sanitized.creditCard).toBeUndefined();
    expect(sanitized.cvv).toBeUndefined();
    expect(sanitized.mpesaReceipt).toBeUndefined();
    expect(sanitized.normalField).toBe('safe_value');
  });

  it('masks KRA PINs and phone numbers', () => {
    const rawPayload = {
      pin: 'A012345678Z',
      phoneNumber: '254712345678',
      email: 'john.doe@example.com',
    };

    const sanitized = sanitizeTelemetryPayload(rawPayload);

    // KRA PIN should be partially masked
    expect(sanitized.pin).toBe('A01*****78Z');
    // Phone number should be completely masked
    expect(sanitized.phoneNumber).toBe('••••••••••');
    // Email should be partially masked
    expect(sanitized.email).toContain('***');
    expect(sanitized.email).toContain('@example.com');
  });

  it('sanitizes deeply nested objects and arrays', () => {
    const complexPayload = {
      user: {
        pin: 'P051234567W',
        auth: {
          token: 'sensitive_jwt_token',
        },
      },
      audit: [
        { password: '123', status: 'attempt' },
        { safeField: true },
      ],
    };

    const sanitized = sanitizeTelemetryPayload(complexPayload);

    expect(sanitized.user.pin).toBe('P05*****67W');
    expect(sanitized.user.auth.token).toBeUndefined();
    expect(sanitized.audit[0].password).toBeUndefined();
    expect(sanitized.audit[0].status).toBe('attempt');
    expect(sanitized.audit[1].safeField).toBe(true);
  });
});
