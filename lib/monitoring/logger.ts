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
