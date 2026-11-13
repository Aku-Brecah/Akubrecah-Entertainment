import { describe, it, expect, vi } from 'vitest';
import {
  parseWhatsAppCommand,
  validateWhatsAppTrigger,
  ALLOWLISTED_SLASH_COMMANDS,
  COMMAND_PREFIXES,
  SESSION_TIMEOUT_MS,
} from '@/lib/whatsapp/commands';
import { extractKenyanPhone, formatDisplayPhone } from '@/lib/whatsapp/phone';
import { normalizePhoneNumber } from '@/lib/whatsapp/mpesa-dispatch';
import { recordBotSentMessageId, isBotSentMessage } from '@/lib/whatsapp-dedup';

/**
 * Real-module tests for the WhatsApp bot's strict command prefix and session rules.
 * Targets: lib/whatsapp/trigger-validator.ts, lib/whatsapp/commands.ts, lib/whatsapp/phone.ts,
 * lib/whatsapp/mpesa-dispatch.ts, lib/whatsapp-dedup.ts, app/api/whatsapp/chat/route.ts.
 */
describe('WhatsApp bot command parsing (lib/whatsapp/commands.ts)', () => {
  it('flags every allowlisted command strictly through both permitted prefixes (. and /)', () => {
    // Permitted prefixes must be strictly '.' and '/'
    expect(COMMAND_PREFIXES).toEqual(['.', '/']);

    for (const cmd of ALLOWLISTED_SLASH_COMMANDS) {
      for (const prefix of COMMAND_PREFIXES) {
        const parsed = parseWhatsAppCommand(`${prefix}${cmd}`);
        expect(parsed.hasCommandPrefix, `${prefix}${cmd}`).toBe(true);
        expect(parsed.isAllowlisted, `${prefix}${cmd}`).toBe(true);
        expect(parsed.cleanCmdWord, `${prefix}${cmd}`).toBe(cmd);
        expect(parsed.shouldIgnore, `${prefix}${cmd}`).toBe(false);
      }
    }
  });

  it('rejects exclamation prefix (!) because only . and / are accepted prefixes', () => {
    for (const cmd of ['help', 'kra', 'admin', 'status']) {
      const parsed = parseWhatsAppCommand(`!${cmd}`);
      expect(parsed.hasCommandPrefix).toBe(false);
      expect(parsed.shouldIgnore).toBe(true);
      expect(parsed.isAllowlisted).toBe(false);
    }
  });

  it('rejects unknown slash commands with isAllowlisted=false so casual text never triggers a workflow', () => {
    for (const text of ['/randomcmd', '.hack', '/statuscheck', '/dailies', '.foobar']) {
      const parsed = parseWhatsAppCommand(text);
      expect(parsed.hasCommandPrefix).toBe(true);
      expect(parsed.isAllowlisted).toBe(false);
      expect(ALLOWLISTED_SLASH_COMMANDS.has(parsed.cleanCmdWord)).toBe(false);
    }
  });

  it('does not treat plain conversational text as a command (dormant by default)', () => {
    const plainMessages = [
      'hello',
      'Hello, how are you?',
      'Please check this',
      'kra',
      'help',
      'admin',
      'status',
      'paid',
      '11530093',
      'A012345678Z',
      'i need kra pin help',
      'admin please assist',
      'what is the status',
    ];

    for (const msg of plainMessages) {
      const parsed = parseWhatsAppCommand(msg);
      expect(parsed.hasCommandPrefix, msg).toBe(false);
      expect(parsed.isAllowlisted, msg).toBe(false);
      expect(parsed.shouldIgnore, msg).toBe(true);
      expect(parsed.ignoreReason, msg).toBe('NO_PREFIX');
    }
  });

  it('rejects commands when prefix is embedded or not at the exact start', () => {
    const middlePrefixMessages = [
      'Hello, .kra',
      'Hello, /admin',
      'Hello .kra',
      'Hello /help',
      'Please run .help now',
      'Hey /status',
      'Check: .kra',
    ];

    for (const msg of middlePrefixMessages) {
      const parsed = parseWhatsAppCommand(msg);
      expect(parsed.hasCommandPrefix, msg).toBe(false);
      expect(parsed.shouldIgnore, msg).toBe(true);
      expect(parsed.ignoreReason, msg).toBe('NO_PREFIX');
    }
  });

  it('handles multiline messages: ignores if prefix is not at the very start', () => {
    const multiline = 'Hello\n/kra';
    const parsed = parseWhatsAppCommand(multiline);
    expect(parsed.hasCommandPrefix).toBe(false);
    expect(parsed.shouldIgnore).toBe(true);
  });

  it('accepts multiline messages when prefix IS at the very start with leading newlines trimmed', () => {
    const multiline = '\n\n/kra 11530093\n';
    const parsed = parseWhatsAppCommand(multiline);
    expect(parsed.hasCommandPrefix).toBe(true);
    expect(parsed.cleanCmdWord).toBe('kra');
    expect(parsed.cleanCmdArgs).toBe('11530093');
  });

  it('handles Unicode whitespace trimming before prefix detection', () => {
    // Non-breaking space \u00A0 and ideographic space \u3000
    const nbspMsg = '\u00A0.help\u00A0';
    const parsedNbsp = parseWhatsAppCommand(nbspMsg);
    expect(parsedNbsp.hasCommandPrefix).toBe(true);
    expect(parsedNbsp.cleanCmdWord).toBe('help');

    const tabMsg = '\t/kra \t';
    const parsedTab = parseWhatsAppCommand(tabMsg);
    expect(parsedTab.hasCommandPrefix).toBe(true);
    expect(parsedTab.cleanCmdWord).toBe('kra');
  });

  it('supports optional whitespace immediately following the prefix', () => {
    expect(parseWhatsAppCommand('. help').cleanCmdWord).toBe('help');
    expect(parseWhatsAppCommand('. help').hasCommandPrefix).toBe(true);
    expect(parseWhatsAppCommand('.  help').cleanCmdWord).toBe('help');
    expect(parseWhatsAppCommand('/ kra').cleanCmdWord).toBe('kra');
    expect(parseWhatsAppCommand('/   status').cleanCmdWord).toBe('status');
  });

  it('ignores empty, whitespace-only, and prefix-only messages with no command', () => {
    const emptyOrPrefixOnly = [
      '',
      '   ',
      '\t\n  ',
      '.',
      '/',
      '.   ',
      '/   ',
      '  .  ',
      '  /  ',
    ];

    for (const text of emptyOrPrefixOnly) {
      const parsed = parseWhatsAppCommand(text);
      expect(parsed.shouldIgnore, `for "${text}"`).toBe(true);
      expect(parsed.hasCommandPrefix, `for "${text}"`).toBe(false);
    }
  });

  it('rejects double prefixes (..help or //help) as unknown command unless explicitly registered', () => {
    const doubleDot = parseWhatsAppCommand('..help');
    expect(doubleDot.hasCommandPrefix).toBe(true);
    expect(doubleDot.cleanCmdWord).toBe('.help'); // Exactly one prefix stripped
    expect(doubleDot.isAllowlisted).toBe(false);

    const doubleSlash = parseWhatsAppCommand('//help');
    expect(doubleSlash.hasCommandPrefix).toBe(true);
    expect(doubleSlash.cleanCmdWord).toBe('/help'); // Exactly one prefix stripped
    expect(doubleSlash.isAllowlisted).toBe(false);
  });

  it('splits command word from arguments correctly, preserving internal whitespace', () => {
    const parsedAdmin = parseWhatsAppCommand('/admin users list');
    expect(parsedAdmin.cleanCmdWord).toBe('admin');
    expect(parsedAdmin.cleanCmdArgs).toBe('users list');
    expect(parsedAdmin.isAllowlisted).toBe(true);

    const parsedKra = parseWhatsAppCommand('/kra John Doe');
    expect(parsedKra.cleanCmdWord).toBe('kra');
    expect(parsedKra.cleanCmdArgs).toBe('John Doe');

    const parsedSpaced = parseWhatsAppCommand('/help   now');
    expect(parsedSpaced.cleanCmdWord).toBe('help');
    expect(parsedSpaced.cleanCmdArgs).toBe('now');
  });

  it('lowercases command word and preserves arguments casing', () => {
    const parsed = parseWhatsAppCommand('  /KRA A012345678Z  ');
    expect(parsed.trimmedInput).toBe('/KRA A012345678Z');
    expect(parsed.cleanCmdWord).toBe('kra');
    expect(parsed.cleanCmdArgs).toBe('A012345678Z');
    expect(parsed.isAllowlisted).toBe(true);
  });
});

describe('Outbound, Admin, and Echo Message Safeguards (lib/whatsapp/trigger-validator.ts)', () => {
  const BOT_NUMBER = '254791497858';

  it('ignores normal outgoing messages sent by admin or bot to another contact', () => {
    const validation = validateWhatsAppTrigger('Hello Alice, how are you?', {
      fromMe: true,
      remoteJid: '254711111111@s.whatsapp.net',
      botPhone: BOT_NUMBER,
    });

    expect(validation.isValid).toBe(false);
    expect(validation.shouldIgnore).toBe(true);
    if (!validation.isValid) {
      expect(validation.reason).toBe('OUTGOING_MESSAGE');
    }
  });

  it('ignores outgoing messages sent by admin to contacts even if they contain prefixes or keywords', () => {
    const validation = validateWhatsAppTrigger('.kra 11530093', {
      fromMe: true,
      remoteJid: '254711111111@s.whatsapp.net',
      botPhone: BOT_NUMBER,
    });

    expect(validation.isValid).toBe(false);
    expect(validation.shouldIgnore).toBe(true);
    if (!validation.isValid) {
      expect(validation.reason).toBe('OUTGOING_MESSAGE');
    }
  });

  it('detects and rejects echoed messages authored by the bot itself', () => {
    const testMessageId = `bot_echo_test_${Date.now()}`;
    // Simulate recording the outgoing message when the bot sends a reply
    recordBotSentMessageId(testMessageId);
    expect(isBotSentMessage(testMessageId)).toBe(true);

    // Now simulate Evolution API sending back the upsert webhook for the bot's own reply
    const validation = validateWhatsAppTrigger('.help', {
      fromMe: true,
      remoteJid: `${BOT_NUMBER}@s.whatsapp.net`,
      messageId: testMessageId,
      botPhone: BOT_NUMBER,
    });

    expect(validation.isValid).toBe(false);
    expect(validation.shouldIgnore).toBe(true);
    if (!validation.isValid) {
      expect(validation.reason).toBe('BOT_AUTHORED_ECHO');
    }
  });

  it('permits valid prefixed commands in admin self-chat when not an echo', () => {
    const freshSelfMsgId = `human_self_msg_${Date.now()}`;
    const validation = validateWhatsAppTrigger('.admin stats', {
      fromMe: true,
      remoteJid: `${BOT_NUMBER}@s.whatsapp.net`,
      messageId: freshSelfMsgId,
      botPhone: BOT_NUMBER,
    });

    expect(validation.isValid).toBe(true);
    expect(validation.shouldIgnore).toBe(false);
    if (validation.isValid) {
      expect(validation.command).toBe('admin');
      expect(validation.args).toBe('stats');
    }
  });

  it('ignores casual non-prefixed notes in self-chat', () => {
    const freshSelfMsgId = `human_self_note_${Date.now()}`;
    const validation = validateWhatsAppTrigger('Remember to buy milk tomorrow', {
      fromMe: true,
      remoteJid: `${BOT_NUMBER}@s.whatsapp.net`,
      messageId: freshSelfMsgId,
      botPhone: BOT_NUMBER,
    });

    expect(validation.isValid).toBe(false);
    expect(validation.shouldIgnore).toBe(true);
    if (!validation.isValid) {
      expect(validation.reason).toBe('NO_PREFIX');
    }
  });
});

describe('Dormant-by-Default Chat Handler (app/api/whatsapp/chat/route.ts)', () => {
  it('remains completely dormant on non-prefixed messages without creating sessions or replying', async () => {
    const { handleWhatsAppChat } = await import('@/app/api/whatsapp/chat/route');

    const casualInputs = [
      'Hello, how are you?',
      'Please check this',
      'kra',
      'help',
      'admin',
      'status',
      '11530093',
      'paid',
    ];

    for (const msg of casualInputs) {
      const res = await handleWhatsAppChat({
        phone: '254700000099',
        message: msg,
        sendDirect: false, // do not make live network calls during tests
      });

      expect(res.success, msg).toBe(true);
      expect((res as any).shouldReply, msg).toBe(false);
      expect((res as any).reply, msg).toBe('');
      expect((res as any).step, msg).toBe('IDLE');
    }
  });

  it('responds with safe unknown-command message on unsupported prefixed commands without invoking AI', async () => {
    const { handleWhatsAppChat } = await import('@/app/api/whatsapp/chat/route');

    const res = await handleWhatsAppChat({
      phone: '254700000099',
      message: '.unknown_command_xyz',
      sendDirect: false,
    });

    expect(res.success).toBe(true);
    expect((res as any).reply).toContain('Unknown Command');
    expect((res as any).reply).toContain('unknown_command_xyz');
    expect((res as any).reply).toContain('*.kra* or */kra*');
  });

  it('executes help command when prefixed with . or /', async () => {
    const { handleWhatsAppChat } = await import('@/app/api/whatsapp/chat/route');

    const dotHelp = await handleWhatsAppChat({
      phone: '254700000099',
      message: '.help',
      sendDirect: false,
    });

    expect(dotHelp.success).toBe(true);
    expect((dotHelp as any).reply).toContain('AKUBRECAH KRA COMPLIANCE PORTAL');
    expect((dotHelp as any).reply).toContain('.kra');

    const slashHelp = await handleWhatsAppChat({
      phone: '254700000099',
      message: '/help',
      sendDirect: false,
    });

    expect(slashHelp.success).toBe(true);
    expect((slashHelp as any).reply).toContain('AKUBRECAH KRA COMPLIANCE PORTAL');
  });
});

describe('WhatsApp session timeout contract', () => {
  it('enforces the strict 7-minute inactivity timeout in milliseconds', () => {
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

describe('Evolution API phone & LID destination normalization (lib/evolution.ts)', () => {
  it('strips WhatsApp domain suffixes and formats Kenyan numbers properly', async () => {
    const { sanitizeWhatsAppPhone, getEvolutionDestinationNumber } = await import('@/lib/evolution');
    expect(sanitizeWhatsAppPhone('254791497858@s.whatsapp.net')).toBe('254791497858');
    expect(sanitizeWhatsAppPhone('0791497858')).toBe('254791497858');
    expect(sanitizeWhatsAppPhone('+254 791 497 858')).toBe('254791497858');
    expect(sanitizeWhatsAppPhone('168646622089229@lid')).toBe('168646622089229');
    expect(getEvolutionDestinationNumber('254791497858')).toBe('254791497858');
    expect(getEvolutionDestinationNumber('168646622089229@lid')).toBe('168646622089229@lid');
    expect(getEvolutionDestinationNumber('168646622089229')).toBe('168646622089229@lid');
  });

  it('recognizes invoice and renew as valid allowlisted commands and handles spaced prefixes', () => {
    expect(parseWhatsAppCommand('/invoice').isAllowlisted).toBe(true);
    expect(parseWhatsAppCommand('/renew').isAllowlisted).toBe(true);
    expect(parseWhatsAppCommand('.invoices').isAllowlisted).toBe(true);
    expect(parseWhatsAppCommand('. Kra').cleanCmdWord).toBe('kra');
    expect(parseWhatsAppCommand('. Kra').cleanCmdArgs).toBe('');
    expect(parseWhatsAppCommand('.kra 12345678').cleanCmdArgs).toBe('12345678');
  });

  it('formatDisplayPhone only formats valid Kenyan mobiles and returns empty string for LIDs', async () => {
    const { formatDisplayPhone } = await import('@/lib/whatsapp/phone');
    expect(formatDisplayPhone('254791497858')).toBe('0791497858');
    expect(formatDisplayPhone('168646622089229')).toBe('');
    expect(formatDisplayPhone('168646622089229@lid')).toBe('');
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

    const testPin = `A99999991X`;
    const taxpayer = {
      taxpayerName: 'JOHN DOE KAMAU',
      pin: testPin,
      idNumber: '11530093',
      taxpayerDetails: 'Active',
    };

    const reply = await handleTaxpayerFoundFulfillment({
      userPhone: '254799999991',
      taxpayer,
      idOrPinInput: '11530093',
      saveConversationState: mockSaveState,
    });

    expect(savedStep).toBe('AWAITING_PAYMENT_PHONE');
    expect(savedExtra.pin).toBe(testPin);
    expect(savedExtra.fee).toBe(20);

    expect(reply).toContain('ENTER M-PESA PHONE NUMBER');
    expect(reply).toContain('0799999991');
    expect(reply).toContain('SAME');
    expect(reply).toContain('KES 20.00');
  });

  it('triggers STK push immediately when explicitPaymentPhone is supplied', async () => {
    const payments = await import('@/lib/whatsapp/payments');
    const spy = vi.spyOn(payments, 'triggerInAppMpesaPayment').mockResolvedValueOnce({
      success: true,
      checkoutRequestId: 'ws_CO_TEST_123',
      gateway: 'daraja',
      normalizedPhone: '254712345678',
    });

    const { handleTaxpayerFoundFulfillment } = await import('@/lib/whatsapp/fulfillment');

    let savedStep = '';
    let savedExtra: Record<string, any> = {};

    const mockSaveState = async (step: string, extra?: Record<string, any>) => {
      savedStep = step;
      savedExtra = extra || {};
    };

    const testPin2 = `A99999992Y`;
    const taxpayer = {
      taxpayerName: 'JANE WANJIKU',
      pin: testPin2,
      idNumber: '28374619',
      taxpayerDetails: 'Active',
    };

    const reply = await handleTaxpayerFoundFulfillment({
      userPhone: '254799999992',
      taxpayer,
      idOrPinInput: '28374619',
      saveConversationState: mockSaveState,
      explicitPaymentPhone: '0712345678',
    });

    expect(spy).toHaveBeenCalled();
    expect(savedStep).toBe('AWAITING_PAYMENT');
    expect(savedExtra.paymentPhone).toBe('254712345678');
    expect(savedExtra.pin).toBe(testPin2);
    expect(reply).toContain('M-PESA PAYMENT PROMPT SENT');

    spy.mockRestore();
  });
});

describe('Admin command center & access isolation (lib/whatsapp/admin-commands.ts)', () => {
  it('blocks unauthorized users and directs them exclusively to customer commands', async () => {
    const { handleAdminBotCommand } = await import('@/lib/whatsapp/admin-commands');

    const reply = await handleAdminBotCommand({
      incomingText: '.admin',
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
    expect(reply).not.toContain('Your phone is not yet unlocked');
  });

  it('renders aligned admin command center for authorized master PIN caller', async () => {
    const { handleAdminBotCommand } = await import('@/lib/whatsapp/admin-commands');

    const masterPin = process.env.ADMIN_BOT_PIN || 'testpin';
    process.env.ADMIN_BOT_PIN = masterPin;

    const reply = await handleAdminBotCommand({
      incomingText: `.admin ${masterPin}`,
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
