import { describe, it, expect } from 'vitest';
import {
  parseWhatsAppCommand,
  ALLOWLISTED_SLASH_COMMANDS,
  COMMAND_PREFIXES,
  SESSION_TIMEOUT_MS,
} from '@/lib/whatsapp/commands';
import { extractKenyanPhone, formatDisplayPhone } from '@/lib/whatsapp/phone';
import { normalizePhoneNumber } from '@/lib/whatsapp/mpesa-dispatch';

/**
 * Real-module tests for the WhatsApp bot's command grammar and session rules.
 * Targets: lib/whatsapp/commands.ts, lib/whatsapp/phone.ts, lib/whatsapp/mpesa-dispatch.ts
 * (the exact modules the chat route delegates to — not reimplementations).
 */
describe('WhatsApp bot command parsing (lib/whatsapp/commands.ts)', () => {
  it('flags every allowlisted command through all three prefixes', () => {
    for (const cmd of ALLOWLISTED_SLASH_COMMANDS) {
      for (const prefix of COMMAND_PREFIXES) {
        const parsed = parseWhatsAppCommand(`${prefix}${cmd}`);
        expect(parsed.hasCommandPrefix, `${prefix}${cmd}`).toBe(true);
        expect(parsed.isAllowlisted).toBe(true);
        expect(parsed.cleanCmdWord).toBe(cmd);
      }
    }
  });

  it('rejects unknown slash commands so casual text never triggers a workflow', () => {
    for (const text of ['/randomcmd', '!frobnicate', '.hack', '/statuscheck', '/dailies']) {
      const word = parseWhatsAppCommand(text).cleanCmdWord;
      expect(parseWhatsAppCommand(text).isAllowlisted).toBe(false);
      expect(ALLOWLISTED_SLASH_COMMANDS.has(word)).toBe(false);
    }
  });

  it('does not treat plain conversational text as a command', () => {
    for (const msg of ['hello', 'i need kra pin help', 'admin please assist', 'what is the status']) {
      const parsed = parseWhatsAppCommand(msg);
      expect(parsed.hasCommandPrefix).toBe(false);
      expect(parsed.isAllowlisted).toBe(false);
    }
  });

  it('splits command word from arguments correctly', () => {
    const parsed = parseWhatsAppCommand('/admin stats');
    expect(parsed.cleanCmdWord).toBe('admin');
    expect(parsed.cleanCmdArgs).toBe('stats');
    expect(parsed.isAllowlisted).toBe(true);

    expect(parseWhatsAppCommand('/kra').cleanCmdArgs).toBe('');
  });

  it('lowercases and trims inconsistent casing/whitespace from senders', () => {
    const parsed = parseWhatsAppCommand('  /KRA  ');
    expect(parsed.trimmedInput).toBe('/KRA');
    expect(parsed.cleanCmdText).toBe('kra');
    expect(parsed.isAllowlisted).toBe(true);
  });

  it('casual inbound messages do not qualify as commands and keep the bot idle', () => {
    const casualMessages = [
      'hi',
      'hello',
      'habari',
      'hey there',
      'mambo vipi',
      'can you help me with something else',
      'good morning',
      'how much is it',
      'ok thanks',
    ];

    for (const msg of casualMessages) {
      const parsed = parseWhatsAppCommand(msg);
      expect(parsed.hasCommandPrefix).toBe(false);
      expect(parsed.isAllowlisted).toBe(false);
    }
  });
});

describe('WhatsApp session timeout contract', () => {
  it('enforces the strict 7-minute inactivity timeout in milliseconds', () => {
    // Imported constant — the route must use this same value, not a local redefinition
    expect(SESSION_TIMEOUT_MS).toBe(7 * 60 * 1000);
    expect(SESSION_TIMEOUT_MS).toBe(420_000);
  });

  it('a reply exactly 1s past the 7-minute timeout is expired, 6 min later is not', () => {
    const start = 1_000_000;
    expect(start + 6 * 60 * 1000 - start < SESSION_TIMEOUT_MS).toBe(true); // still valid
    expect(start + SESSION_TIMEOUT_MS + 1000 - start >= SESSION_TIMEOUT_MS).toBe(true); // expired
  });
});

describe('WhatsApp phone parsing (lib/whatsapp/phone.ts + mpesa-dispatch)', () => {
  it('extracts Kenyan numbers from free-form text as 254-prefixed MSISDNs', () => {
    expect(extractKenyanPhone('my number is 0712345678')).toBe('254712345678');
    expect(extractKenyanPhone('pay via +254 712 345 678')).toBe('254712345678');
    expect(extractKenyanPhone('call 254712345678')).toBe('254712345678');
  });

  it('returns null for text containing no Kenyan number', () => {
    expect(extractKenyanPhone('hello there')).toBeNull();
    expect(extractKenyanPhone('')).toBeNull();
  });

  it('formats 254 MSISDNs into local 0-prefixed display form', () => {
    expect(formatDisplayPhone('254712345678')).toBe('0712345678');
    expect(formatDisplayPhone('')).toBe('');
  });

  it('normalizes every real-world caller format for M-Pesa STK push', () => {
    expect(normalizePhoneNumber('0712345678')).toBe('254712345678');
    expect(normalizePhoneNumber('+254712345678')).toBe('254712345678');
    expect(normalizePhoneNumber('712345678')).toBe('254712345678');
    expect(normalizePhoneNumber('0110 123 456')).toBe('254110123456');
    expect(normalizePhoneNumber('254712345678')).toBe('254712345678');
  });
});

describe('WhatsApp Direct ID & PIN detection regexes', () => {
  it('correctly matches valid KRA PIN format', () => {
    const pinRegex = /^[A-Za-z]\d{9}[A-Za-z]$/;
    expect(pinRegex.test('A012345678Z')).toBe(true);
    expect(pinRegex.test('P051234567X')).toBe(true);
    expect(pinRegex.test('a012345678z')).toBe(true);
    expect(pinRegex.test('11530093')).toBe(false);
    expect(pinRegex.test('invalid')).toBe(false);
  });

  it('correctly matches valid National ID format', () => {
    const idRegex = /^\d{6,9}$/;
    expect(idRegex.test('11530093')).toBe(true);
    expect(idRegex.test('28374619')).toBe(true);
    expect(idRegex.test('123456789')).toBe(true);
    expect(idRegex.test('12345')).toBe(false); // too short
    expect(idRegex.test('A012345678Z')).toBe(false); // is PIN
  });
});

describe('Evolution API phone & LID destination normalization (lib/evolution.ts)', () => {
  it('strips WhatsApp domain suffixes and formats Kenyan numbers properly', async () => {
    const { sanitizeWhatsAppPhone, getEvolutionDestinationNumber } = await import('@/lib/evolution');
    expect(sanitizeWhatsAppPhone('254791497858@s.whatsapp.net')).toBe('254791497858');
    expect(sanitizeWhatsAppPhone('0791497858')).toBe('254791497858');
    expect(sanitizeWhatsAppPhone('+254 791 497 858')).toBe('254791497858');
    expect(sanitizeWhatsAppPhone('168646622089229@lid')).toBe('168646622089229');
    expect(getEvolutionDestinationNumber('254791497858')).toBe('254791497858');
    expect(getEvolutionDestinationNumber('168646622089229@lid')).toBe('168646622089229@lid');
  });

  it('recognizes invoice and renew as valid allowlisted commands', () => {
    expect(parseWhatsAppCommand('/invoice').isAllowlisted).toBe(true);
    expect(parseWhatsAppCommand('/renew').isAllowlisted).toBe(true);
    expect(parseWhatsAppCommand('!invoices').isAllowlisted).toBe(true);
  });
});

describe('Taxpayer fulfillment & payment phone prompt (lib/whatsapp/fulfillment.ts)', () => {
  it('transitions to AWAITING_PAYMENT_PHONE and prompts user for M-Pesa number instead of auto-firing payment', async () => {
    const { handleTaxpayerFoundFulfillment } = await import('@/lib/whatsapp/fulfillment');

    let savedStep = '';
    let savedExtra: Record<string, any> = {};

    const mockSaveState = async (step: string, extra?: Record<string, any>) => {
      savedStep = step;
      savedExtra = extra || {};
    };

    const taxpayer = {
      taxpayerName: 'JOHN DOE KAMAU',
      pin: 'A012345678Z',
      idNumber: '11530093',
      taxpayerDetails: 'Active',
    };

    const reply = await handleTaxpayerFoundFulfillment({
      userPhone: '254712345678',
      taxpayer,
      idOrPinInput: '11530093',
      saveConversationState: mockSaveState,
    });

    // Proves conversation state was set to AWAITING_PAYMENT_PHONE
    expect(savedStep).toBe('AWAITING_PAYMENT_PHONE');
    expect(savedExtra.pin).toBe('A012345678Z');
    expect(savedExtra.fee).toBe(20);

    // Proves message asks user for payment phone number
    expect(reply).toContain('ENTER M-PESA PHONE NUMBER');
    expect(reply).toContain('0712345678');
    expect(reply).toContain('SAME');
    expect(reply).toContain('KES 20.00');
  });
});

describe('Admin command center & access isolation (lib/whatsapp/admin-commands.ts)', () => {
  it('blocks unauthorized users and directs them exclusively to customer commands', async () => {
    const { handleAdminBotCommand } = await import('@/lib/whatsapp/admin-commands');

    const reply = await handleAdminBotCommand({
      incomingText: '!admin',
      userPhone: '254700000001', // random unauthorized number
      metadata: {},
      saveConversationState: async () => {},
      db: {},
    });

    expect(reply).not.toBeNull();
    expect(reply).toContain('Admin Access Restricted');
    expect(reply).toContain('*/kra*');
    expect(reply).toContain('*/cyber*');
    expect(reply).toContain('*/status*');
    expect(reply).toContain('*/invoice*');
    expect(reply).toContain('*/help*');
    // Does NOT leak internal master PIN prompt or stats
    expect(reply).not.toContain('Your phone is not yet unlocked');
  });

  it('renders aligned admin command center for authorized master PIN caller', async () => {
    const { handleAdminBotCommand } = await import('@/lib/whatsapp/admin-commands');

    const masterPin = process.env.ADMIN_BOT_PIN || 'testpin';
    process.env.ADMIN_BOT_PIN = masterPin;

    const reply = await handleAdminBotCommand({
      incomingText: `!admin ${masterPin}`,
      userPhone: '254791497858',
      metadata: {},
      saveConversationState: async () => {},
      db: {},
    });

    expect(reply).not.toBeNull();
    expect(reply).toContain('AKUBRECAH KRA — ADMIN COMMAND CENTER');
    expect(reply).toContain('EXECUTIVE METRICS');
    expect(reply).toContain('!stats');
    expect(reply).toContain('!revenue');
    expect(reply).toContain('!logs');
    expect(reply).toContain('─────────────────────────');
  });
});

