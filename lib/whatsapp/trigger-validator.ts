/**
 * Pure, isolated WhatsApp trigger validation module.
 *
 * Enforces the strict rule: The bot remains completely dormant unless an incoming
 * message explicitly begins with '.' or '/' after Unicode-aware whitespace trimming.
 *
 * Separates validation responsibilities from command execution and business logic.
 */

import { isBotSentMessage } from '@/lib/whatsapp-dedup';

/** Exactly two command prefixes are permitted: '.' and '/' */
export const ACCEPTED_TRIGGER_PREFIXES = ['.', '/'] as const;
export type TriggerPrefix = (typeof ACCEPTED_TRIGGER_PREFIXES)[number];

export const ALLOWLISTED_SLASH_COMMANDS = new Set([
  // Core Customer Commands
  'kra',
  'pin',
  'certificate',
  'cyber',
  'subscribe',
  'package',
  'status',
  'days',
  'sub',
  'help',
  'menu',
  'start',
  'commands',
  'assist',
  'huduma',
  'invoice',
  'invoices',
  'receipt',
  'renew',
  'cancel',
  'reset',
  'stop',
  'exit',
  'abort',
  '0',
  'paid',
  'recheck',
  'verify',
  'confirm',
  'lipa',
  'done',
  'pay',
  'phone',
  'same',

  // Administrative Commands (protected by authorization checks)
  'admin',
  'stats',
  'kpi',
  'revenue',
  'rev',
  'logs',
  'tx',
  'transactions',
  'bot',
  'link',
  'magic',
  'lock',
  'logout',
  'failed',
  'pending',
  'issues',
  'deliver',
  'fulfill',
  'send',
  'check',
]);

export interface WhatsAppEventMetadata {
  fromMe?: boolean;
  remoteJid?: string;
  sender?: string;
  participant?: string;
  messageId?: string;
  instanceName?: string;
  botPhone?: string;
}

export type WhatsAppTriggerValidation =
  | {
      isValid: false;
      shouldIgnore: true;
      reason:
        | 'OUTGOING_MESSAGE'
        | 'BOT_AUTHORED_ECHO'
        | 'NON_TEXT'
        | 'EMPTY_MESSAGE'
        | 'NO_PREFIX'
        | 'PREFIX_ONLY'
        | 'GROUP_MESSAGE';
      details?: string;
      rawText?: string;
    }
  | {
      isValid: true;
      shouldIgnore: false;
      prefix: TriggerPrefix;
      command: string; // Lowercased command name
      args: string; // Trimmed argument string, preserving internal whitespace
      rawText: string; // Original trimmed text
      isAllowlisted: boolean;
    };

/**
 * Validates whether an incoming WhatsApp message satisfies the strict command prefix trigger.
 *
 * Rules:
 * 1. Outgoing messages sent to other contacts and bot-authored echo events are rejected.
 * 2. Group messages are rejected.
 * 3. Leading and trailing Unicode whitespace is trimmed.
 * 4. First character MUST be exactly '.' or '/'.
 * 5. Prefix alone without a command token (e.g. '.' or '.   ') is rejected.
 * 6. Exactly one prefix character is stripped, skipping immediately following whitespace.
 * 7. First non-whitespace token is lowercased and matched against registered commands.
 * 8. Remaining text is trimmed of outer whitespace as arguments.
 */
export function validateWhatsAppTrigger(
  rawText: unknown,
  eventMeta?: WhatsAppEventMetadata
): WhatsAppTriggerValidation {
  // 1. Group message guard
  const remoteJid = String(eventMeta?.remoteJid || '');
  if (remoteJid.includes('@g.us')) {
    return {
      isValid: false,
      shouldIgnore: true,
      reason: 'GROUP_MESSAGE',
      details: 'Group messages are ignored',
    };
  }

  // 2. Reject bot-authored echo events
  const messageId = eventMeta?.messageId;
  if (messageId && isBotSentMessage(messageId)) {
    return {
      isValid: false,
      shouldIgnore: true,
      reason: 'BOT_AUTHORED_ECHO',
      details: 'Echo of bot-authored message',
    };
  }

  // 3. Reject outgoing messages sent to other contacts
  // In Baileys/Evolution API, fromMe=true indicates an outbound message from the connected account.
  const isFromMe = Boolean(eventMeta?.fromMe);
  const botPhone = (eventMeta?.botPhone || process.env.ADMIN_WHATSAPP_PHONE || '254791497858').replace(/[^0-9]/g, '');

  if (isFromMe) {
    // If the recipient is not self-chat ("Message Yourself"), this is an outbound message to a contact
    const isSelfChat = remoteJid && (remoteJid.includes(botPhone) || remoteJid.includes('@lid'));
    if (!isSelfChat) {
      return {
        isValid: false,
        shouldIgnore: true,
        reason: 'OUTGOING_MESSAGE',
        details: 'Outbound message sent to external contact',
      };
    }
  }

  // 4. Accept only supported text-message content
  if (typeof rawText !== 'string') {
    return {
      isValid: false,
      shouldIgnore: true,
      reason: 'NON_TEXT',
      details: 'Payload does not contain valid text content',
    };
  }

  // 5. Standard Unicode-aware whitespace trimming
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      isValid: false,
      shouldIgnore: true,
      reason: 'EMPTY_MESSAGE',
      details: 'Message is empty or whitespace-only',
      rawText: trimmed,
    };
  }

  // 6. Check first character: MUST BE '.' OR '/'
  const firstChar = trimmed[0];
  if (firstChar !== '.' && firstChar !== '/') {
    return {
      isValid: false,
      shouldIgnore: true,
      reason: 'NO_PREFIX',
      details: 'Message does not start with . or /',
      rawText: trimmed,
    };
  }

  const prefix = firstChar as TriggerPrefix;

  // 7. Remove exactly one leading prefix character
  const afterPrefix = trimmed.slice(1);

  // 8. Skip any whitespace immediately following the prefix (e.g. '. help')
  const afterPrefixTrimmedLeading = afterPrefix.replace(/^\s+/, '');

  if (!afterPrefixTrimmedLeading) {
    // Prefix present with no command token (e.g. '.' alone or '.   ')
    return {
      isValid: false,
      shouldIgnore: true,
      reason: 'PREFIX_ONLY',
      details: 'Message contains prefix but no command name',
      rawText: trimmed,
    };
  }

  // 9. Extract command name as first non-whitespace token
  const firstSpaceIndex = afterPrefixTrimmedLeading.search(/\s/);
  let commandToken = '';
  let argsText = '';

  if (firstSpaceIndex === -1) {
    commandToken = afterPrefixTrimmedLeading;
    argsText = '';
  } else {
    commandToken = afterPrefixTrimmedLeading.slice(0, firstSpaceIndex);
    argsText = afterPrefixTrimmedLeading.slice(firstSpaceIndex).trim();
  }

  const command = commandToken.toLowerCase();

  // 10. Check allowlist
  const isAllowlisted = ALLOWLISTED_SLASH_COMMANDS.has(command);

  return {
    isValid: true,
    shouldIgnore: false,
    prefix,
    command,
    args: argsText,
    rawText: trimmed,
    isAllowlisted,
  };
}
