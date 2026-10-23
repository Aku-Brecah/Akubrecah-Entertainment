/**
 * WhatsApp command parsing (pure, testable).
 * Mirrors the parser inside handleWhatsAppChat exactly — the route delegates to this.
 */

export const ALLOWLISTED_SLASH_COMMANDS = new Set([
  'kra',
  'cyber',
  'status',
  'days',
  'sub',
  'help',
  'menu',
  'start',
  'admin',
  'cancel',
  'reset',
  'stop',
  'exit',
  'abort',
  'stats',
  'revenue',
  'logs',
  'link',
  'lock',
  'logout',
  'recheck',
  'verify',
  'paid',
  'invoice',
  'invoices',
  'receipt',
  'renew',
  '0',
]);

/** Slash/bang/dot command prefixes the bot treats as explicit commands. */
export const COMMAND_PREFIXES = ['/', '!', '.'];

/** Strict inactivity timeout — enforced by the chat state machine (5 minutes). */
export const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

export function parseWhatsAppCommand(text: string): {
  trimmedInput: string;
  hasCommandPrefix: boolean;
  cleanCmdText: string;
  cleanCmdWord: string;
  cleanCmdArgs: string;
  isAllowlisted: boolean;
} {
  const trimmedInput = String(text ?? '').trim();
  const hasCommandPrefix =
    trimmedInput.startsWith('/') || trimmedInput.startsWith('!') || trimmedInput.startsWith('.');
  const cleanCmdText = trimmedInput.replace(/^[!\/.]/, '').trim().toLowerCase();
  const cleanCmdWord = cleanCmdText.split(/\s+/)[0] || '';
  const cleanCmdArgs = trimmedInput.includes(' ')
    ? trimmedInput.substring(trimmedInput.indexOf(' ') + 1).trim()
    : '';
  const isAllowlisted = hasCommandPrefix && ALLOWLISTED_SLASH_COMMANDS.has(cleanCmdWord);
  return { trimmedInput, hasCommandPrefix, cleanCmdText, cleanCmdWord, cleanCmdArgs, isAllowlisted };
}
