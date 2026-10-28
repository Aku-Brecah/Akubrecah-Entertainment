import pino from 'pino';

/**
 * Enterprise Structured JSON Logger with Automatic Sensitive Data Redaction
 * Strictly prevents leaking PII, KRA PINs, National IDs, passwords, or secrets to stdout.
 */

const REDACTED_PATHS = [
  'pin',
  'kraPin',
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'idNumber',
  'phoneNumber',
  'phone',
  'email',
  'nationalId',
  'creditCard',
  'cvv',
  'mpesaReceipt',
  // Console-API-shaped adapter nests call args under `data.*` — redact there too
  // (e.g. log.info('msg', { pin: 'A123...' }) lands at data.pin).
  'data.pin',
  'data.kraPin',
  'data.password',
  'data.token',
  'data.secret',
  'data.authorization',
  'data.cookie',
  'data.idNumber',
  'data.phoneNumber',
  'data.phone',
  'data.email',
  'data.nationalId',
  'data.creditCard',
  'data.cvv',
  'data.mpesaReceipt',
  'headers.authorization',
  'headers.cookie',
  'headers["x-admin-pin"]',
  'headers["x-service-secret"]',
];

const env = process.env.APP_ENV || process.env.NODE_ENV || 'development';
const isDev = env === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  redact: {
    paths: REDACTED_PATHS,
    censor: '[REDACTED]',
  },
  base: {
    service: 'akubrecah-portal',
    env,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;

/**
 * Console-API-shaped adapter over pino.
 * Call sites were converted mechanically from console.* and commonly use the
 * `('text', data)` form. pino's raw methods reject that shape (and would drop
 * the data at runtime), so this wrapper routes string-first calls with extra
 * arguments through an object-first form, preserving every argument.
 */
type LogMethod = (msg: string, ...args: unknown[]) => void;

function makeLogMethod(
  level: 'info' | 'warn' | 'error' | 'debug' | 'fatal',
  emit: (obj: object, msg: string) => void,
): LogMethod {
  return (msg: string, ...args: unknown[]) => {
    if (args.length === 0) {
      if (typeof msg === 'string') emit({ msg }, msg);
      else logger[level](msg as object);
      return;
    }
    const data = args.length === 1 ? args[0] : args;
    if (typeof msg === 'string') {
      emit({ data, msg }, msg);
    } else {
      logger[level](msg as object);
    }
  };
}

const emitFor = (level: 'info' | 'warn' | 'error' | 'debug' | 'fatal') => (obj: object, msg: string) =>
  logger[level](obj, msg);

export const log = {
  info: makeLogMethod('info', emitFor('info')),
  warn: makeLogMethod('warn', emitFor('warn')),
  error: makeLogMethod('error', emitFor('error')),
  debug: makeLogMethod('debug', emitFor('debug')),
  fatal: makeLogMethod('fatal', emitFor('fatal')),
} as const;
