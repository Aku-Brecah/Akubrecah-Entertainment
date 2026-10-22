/**
 * WhatsApp phone-number parsing / display helpers (pure, testable).
 */

export function extractKenyanPhone(text: string): string | null {
  if (!text) return null;
  const cleaned = text.replace(/[\s\-\+\(\)]/g, '');
  const match = cleaned.match(/(?:254|\+254|0)?([71]\d{8})/);
  if (match && match[1]) {
    return '254' + match[1];
  }
  return null;
}

export function formatDisplayPhone(phone: string): string {
  if (!phone) return '';
  if (phone.startsWith('254') && phone.length === 12) {
    return '0' + phone.substring(3);
  }
  return phone;
}
