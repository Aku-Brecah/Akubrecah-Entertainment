import { describe, it, expect } from 'vitest';

describe('Issue 3: WhatsApp Bot Command Triggers & 5-Minute Session Timeout', () => {

  const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes (300,000 ms)

  const ALLOWLISTED_SLASH_COMMANDS = new Set([
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
    '0',
  ]);

  interface MockConversation {
    id: string;
    user_phone: string;
    metadata: {
      step: string;
      activeSession: boolean;
      lastActiveAt: number;
      pin?: string | null;
      idNumber?: string | null;
      taxpayerDetails?: any;
      checkoutId?: string | null;
    };
  }

  function simulateIncomingWhatsAppMessage(
    conv: MockConversation,
    messageText: string,
    currentTime: number = Date.now()
  ) {
    const trimmed = messageText.trim();
    const hasCommandPrefix = trimmed.startsWith('/') || trimmed.startsWith('!') || trimmed.startsWith('.');
    const cleanCmdText = trimmed.replace(/^[!\/.]/, '').trim().toLowerCase();
    const cleanCmdWord = cleanCmdText.split(/\s+/)[0] || '';

    const lastActiveAt = conv.metadata.lastActiveAt || 0;
    const isSessionExpired = lastActiveAt > 0 && (currentTime - lastActiveAt) >= SESSION_TIMEOUT_MS;
    const wasSessionActive = Boolean(conv.metadata.activeSession) && conv.metadata.step !== 'IDLE' && conv.metadata.step !== 'COMPLETED';
    let isSessionActive = wasSessionActive;

    // 1. Session Expiry Check
    if (isSessionExpired && wasSessionActive) {
      conv.metadata.step = 'IDLE';
      conv.metadata.activeSession = false;
      conv.metadata.pin = null;
      conv.metadata.idNumber = null;
      conv.metadata.taxpayerDetails = null;
      conv.metadata.checkoutId = null;
      isSessionActive = false;

      // If user sent a message that is not a new command, tell them session expired
      if (!hasCommandPrefix) {
        return {
          action: 'session_expired',
          reply: 'Session timed out after 5 minutes of inactivity.',
          step: 'IDLE',
          shouldReply: true,
        };
      }
    }

    // 2. Unknown Slash Command Check
    if (hasCommandPrefix && !ALLOWLISTED_SLASH_COMMANDS.has(cleanCmdWord)) {
      return {
        action: 'unknown_command',
        reply: `The command ${trimmed.split(/\s+/)[0]} is not recognized.`,
        step: conv.metadata.step,
        shouldReply: true,
      };
    }

    // 3. Strict Trigger Rule: Ignore random text when idle
    if (!isSessionActive && !hasCommandPrefix) {
      return {
        action: 'ignored',
        reply: '',
        step: 'IDLE',
        shouldReply: false,
      };
    }

    // 4. Cancellation Check
    if (['cancel', 'reset', 'stop', 'exit', '0'].includes(cleanCmdWord)) {
      conv.metadata.step = 'IDLE';
      conv.metadata.activeSession = false;
      conv.metadata.pin = null;
      conv.metadata.idNumber = null;
      conv.metadata.taxpayerDetails = null;
      conv.metadata.checkoutId = null;
      return {
        action: 'cancelled',
        reply: 'Session Cancelled.',
        step: 'IDLE',
        shouldReply: true,
      };
    }

    // 5. Allowlisted Command Execution
    if (hasCommandPrefix) {
      conv.metadata.activeSession = true;
      conv.metadata.lastActiveAt = currentTime;
      if (cleanCmdWord === 'kra') {
        conv.metadata.step = 'AWAITING_INPUT';
        return {
          action: 'workflow_started',
          workflow: 'kra',
          reply: 'Please reply with your National ID Number or KRA PIN.',
          step: 'AWAITING_INPUT',
          shouldReply: true,
        };
      }
      if (cleanCmdWord === 'cyber') {
        conv.metadata.step = 'CYBER_REG_NAME';
        return {
          action: 'workflow_started',
          workflow: 'cyber',
          reply: 'What is your Cyber Cafe Business Name?',
          step: 'CYBER_REG_NAME',
          shouldReply: true,
        };
      }
      return {
        action: 'command_handled',
        command: cleanCmdWord,
        step: conv.metadata.step,
        shouldReply: true,
      };
    }

    // 6. Active Session Follow-up Reply
    conv.metadata.lastActiveAt = currentTime;
    return {
      action: 'session_reply_processed',
      input: messageText,
      step: conv.metadata.step,
      shouldReply: true,
    };
  }

  it('ignores casual messages containing kra or admin when idle', () => {
    const conv: MockConversation = {
      id: 'c1',
      user_phone: '254712345678',
      metadata: { step: 'IDLE', activeSession: false, lastActiveAt: 0 },
    };

    const idleInputs = [
      'hello',
      'good morning',
      'i need kra pin help',
      'admin please assist',
      'what is the status',
      'paid yesterday',
    ];

    for (const msg of idleInputs) {
      const res = simulateIncomingWhatsAppMessage(conv, msg);
      expect(res.action).toBe('ignored');
      expect(res.shouldReply).toBe(false);
      expect(conv.metadata.step).toBe('IDLE');
    }
  });

  it('starts intended workflows when explicit slash commands are sent', () => {
    const conv: MockConversation = {
      id: 'c1',
      user_phone: '254712345678',
      metadata: { step: 'IDLE', activeSession: false, lastActiveAt: 0 },
    };

    const resKra = simulateIncomingWhatsAppMessage(conv, '/kra');
    expect(resKra.action).toBe('workflow_started');
    expect(resKra.workflow).toBe('kra');
    expect(conv.metadata.step).toBe('AWAITING_INPUT');
    expect(conv.metadata.activeSession).toBe(true);

    const resCyber = simulateIncomingWhatsAppMessage(conv, '/cyber');
    expect(resCyber.action).toBe('workflow_started');
    expect(resCyber.workflow).toBe('cyber');
    expect(conv.metadata.step).toBe('CYBER_REG_NAME');
  });

  it('rejects unknown slash commands with a safe help response', () => {
    const conv: MockConversation = {
      id: 'c1',
      user_phone: '254712345678',
      metadata: { step: 'IDLE', activeSession: false, lastActiveAt: 0 },
    };

    const res = simulateIncomingWhatsAppMessage(conv, '/randomcmd');
    expect(res.action).toBe('unknown_command');
    expect(res.shouldReply).toBe(true);
    expect(conv.metadata.step).toBe('IDLE');
  });

  it('allows follow-up responses during active sessions when inactivity is under 5 minutes', () => {
    const startTime = 1000000;
    const conv: MockConversation = {
      id: 'c1',
      user_phone: '254712345678',
      metadata: {
        step: 'AWAITING_INPUT',
        activeSession: true,
        lastActiveAt: startTime,
      },
    };

    // User replies 4 minutes later (240,000 ms < 300,000 ms)
    const replyTime = startTime + 4 * 60 * 1000;
    const res = simulateIncomingWhatsAppMessage(conv, '28475912', replyTime);

    expect(res.action).toBe('session_reply_processed');
    expect(res.shouldReply).toBe(true);
    expect(conv.metadata.lastActiveAt).toBe(replyTime);
  });

  it('expires session after 5 minutes of inactivity and clears temporary PII', () => {
    const startTime = 1000000;
    const conv: MockConversation = {
      id: 'c1',
      user_phone: '254712345678',
      metadata: {
        step: 'AWAITING_INPUT',
        activeSession: true,
        lastActiveAt: startTime,
        pin: 'A012345678Z',
        idNumber: '28475912',
        taxpayerDetails: { name: 'JOHN DOE' },
        checkoutId: 'chk_123',
      },
    };

    // User replies exactly 5 minutes and 1 second later (301,000 ms >= 300,000 ms)
    const expiredTime = startTime + 5 * 60 * 1000 + 1000;
    const res = simulateIncomingWhatsAppMessage(conv, 'hello?', expiredTime);

    expect(res.action).toBe('session_expired');
    expect(res.step).toBe('IDLE');
    expect(conv.metadata.activeSession).toBe(false);
    // Sensitive PII must be cleared
    expect(conv.metadata.pin).toBeNull();
    expect(conv.metadata.idNumber).toBeNull();
    expect(conv.metadata.taxpayerDetails).toBeNull();
    expect(conv.metadata.checkoutId).toBeNull();
  });

  it('isolates conversation state between two different phone senders', () => {
    const conv1: MockConversation = {
      id: 'c1',
      user_phone: '254711111111',
      metadata: { step: 'AWAITING_INPUT', activeSession: true, lastActiveAt: Date.now(), idNumber: '11111111' },
    };

    const conv2: MockConversation = {
      id: 'c2',
      user_phone: '254722222222',
      metadata: { step: 'IDLE', activeSession: false, lastActiveAt: 0 },
    };

    simulateIncomingWhatsAppMessage(conv2, 'random message');

    expect(conv2.metadata.step).toBe('IDLE');
    expect(conv1.metadata.idNumber).toBe('11111111');
    expect(conv1.metadata.activeSession).toBe(true);
  });
});
