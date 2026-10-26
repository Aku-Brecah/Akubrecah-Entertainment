/**
 * WhatsApp command parsing and definitions.
 *
 * Enforces the strict rule: The bot remains completely dormant unless an incoming
 * message explicitly begins with '.' or '/' after Unicode-aware whitespace trimming.
 *
 * Delegates pure validation to lib/whatsapp/trigger-validator.ts.
 */

import {
  ACCEPTED_TRIGGER_PREFIXES,
  ALLOWLISTED_SLASH_COMMANDS,
  validateWhatsAppTrigger,
  type WhatsAppTriggerValidation,
  type WhatsAppEventMetadata,
} from './trigger-validator';

export {
  ACCEPTED_TRIGGER_PREFIXES,
  ALLOWLISTED_SLASH_COMMANDS,
  validateWhatsAppTrigger,
  type WhatsAppTriggerValidation,
  type WhatsAppEventMetadata,
};

/**
 * Strict command prefixes accepted by the bot. Only '.' and '/' are supported.
 */
export const COMMAND_PREFIXES = ACCEPTED_TRIGGER_PREFIXES;

/** Strict inactivity timeout — enforced by the chat state machine (7 minutes). */
export const SESSION_TIMEOUT_MS = 7 * 60 * 1000;

export interface ParsedWhatsAppCommand {
  trimmedInput: string;
  hasCommandPrefix: boolean;
  prefix: '.' | '/' | null;
  cleanCmdText: string;
  cleanCmdWord: string;
  cleanCmdArgs: string;
  isAllowlisted: boolean;
  shouldIgnore: boolean;
  ignoreReason?: string;
}

/**
 * Parses a raw WhatsApp message against the strict command prefix rules.
 *
 * Rules:
 * 1. Unicode-aware trimming.
 * 2. Must start with '.' or '/'.
 * 3. Prefix alone (e.g. '.' or '.   ') is ignored.
 * 4. Exactly one prefix character is removed, skipping immediate following whitespace.
 * 5. First non-whitespace token is lowercased as the command name.
 * 6. Remaining text is trimmed of outer whitespace as arguments.
 */
export function parseWhatsAppCommand(
  text: string,
  eventMeta?: WhatsAppEventMetadata
): ParsedWhatsAppCommand {
  const validation = validateWhatsAppTrigger(text, eventMeta);

  if (!validation.isValid) {
    const trimmedInput = typeof text === 'string' ? text.trim() : '';
    return {
      trimmedInput,
      hasCommandPrefix: false,
      prefix: null,
      cleanCmdText: '',
      cleanCmdWord: '',
      cleanCmdArgs: '',
      isAllowlisted: false,
      shouldIgnore: true,
      ignoreReason: validation.reason,
    };
  }

  return {
    trimmedInput: validation.rawText,
    hasCommandPrefix: true,
    prefix: validation.prefix,
    cleanCmdText: validation.args ? `${validation.command} ${validation.args}`.toLowerCase() : validation.command,
    cleanCmdWord: validation.command,
    cleanCmdArgs: validation.args,
    isAllowlisted: validation.isAllowlisted,
    shouldIgnore: false,
  };
}
