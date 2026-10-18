import { maskPin, maskEmail, maskPhone } from '@/lib/masking';

/**
 * Privacy & PII Sanitizer for Analytics Telemetry
 * Compliant with the Kenya Data Protection Act (KDPA).
 * Recursively redacts passwords, authentication tokens, payment details, and full PII from analytics payloads.
 */

const FORBIDDEN_KEYS = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'creditcard',
  'cvv',
  'nationalid',
  'idnumber',
  'mpesareceipt',
  'adminpin',
]);

export function sanitizeTelemetryPayload(data: Record<string, any>): Record<string, any> {
  if (!data || typeof data !== 'object') return {};

  const sanitized: Record<string, any> = {};

  for (const [key, val] of Object.entries(data)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, '');

    // 1. Drop explicitly forbidden sensitive keys
    if (FORBIDDEN_KEYS.has(lowerKey)) {
      continue;
    }

    // 2. Mask KRA PIN if present
    if (lowerKey === 'pin' || lowerKey === 'krapin') {
      if (typeof val === 'string') {
        sanitized[key] = maskPin(val);
      }
      continue;
    }

    // 3. Mask Email if present
    if (lowerKey === 'email') {
      if (typeof val === 'string') {
        sanitized[key] = maskEmail(val);
      }
      continue;
    }

    // 4. Mask Phone Number if present
    if (lowerKey === 'phone' || lowerKey === 'phonenumber' || lowerKey === 'whatsappphone') {
      if (typeof val === 'string') {
        sanitized[key] = maskPhone(val);
      }
      continue;
    }

    // 5. Recursively sanitize nested objects
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      sanitized[key] = sanitizeTelemetryPayload(val);
      continue;
    }

    // 6. Sanitize arrays
    if (Array.isArray(val)) {
      sanitized[key] = val.map((item) =>
        item && typeof item === 'object' ? sanitizeTelemetryPayload(item) : item
      );
      continue;
    }

    sanitized[key] = val;
  }

  return sanitized;
}
