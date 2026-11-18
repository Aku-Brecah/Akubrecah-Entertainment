import { log } from '@/lib/monitoring/logger';
import { z } from 'zod';

/**
 * Universal Environment Variable Schema & Validator
 * Enforces type safety, prevents runtime misconfigurations, and provides safe local defaults.
 */

const envSchema = z.object({
  // Runtime & Environment Tier
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Database Connection (never default to real credentials)
  DATABASE_URL: z.string().default(''),
  DIRECT_URL: z.string().optional(),

  // Authentication (Clerk — never default to a live publishable key)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional().default(''),
  CLERK_SECRET_KEY: z.string().optional(),
  // Fail closed: empty means no admin identity is pre-authorized. Verified at
  // usage sites (must be a non-empty, lowercased email to grant access).
  SUPER_ADMIN_EMAIL: z.string().default(''),
  NEXT_PUBLIC_SUPER_ADMIN_EMAIL: z.string().default(''),

  // Distributed Cache & Rate Limiting (Redis)
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),

  // Observability & Crash Reporting (Sentry)
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),

  // Analytics & Telemetry (PostHog / In-House)
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional().default('https://us.i.posthog.com'),

  // Payments (Safaricom Daraja M-Pesa Live Production)
  DARAJA_ENVIRONMENT: z.enum(['production', 'sandbox']).default('production'),
  DARAJA_CONSUMER_KEY: z.string().optional(),
  DARAJA_CONSUMER_SECRET: z.string().optional(),
  DARAJA_PASSKEY: z.string().optional(),
  DARAJA_SHORTCODE: z.string().optional(),
  DARAJA_PARTYB: z.string().optional(),
  DARAJA_TILL_NUMBER: z.string().optional(),
  DARAJA_TRANSACTION_TYPE: z.enum(['CustomerPayBillOnline', 'CustomerBuyGoodsOnline']).optional(),
  DARAJA_CALLBACK_URL: z.string().optional(),
  MPESA_DOWNLOAD_FEE_KES: z.coerce.number().default(20),
  MPESA_SUBSCRIPTION_AMOUNT_KES: z.coerce.number().default(500),

  // WhatsApp Gateway (Evolution API)
  EVOLUTION_API_URL: z.string().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_INSTANCE_NAME: z.string().default('Akubrecah Entertainment'),

  // Cryptography & Session Tokens
  ENCRYPTION_KEY: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  HMAC_SECRET: z.string().optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

let cachedConfig: AppConfig | null = null;

export function getAppConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const rawEnv: Record<string, any> = {
    NODE_ENV: process.env.NODE_ENV,
    APP_ENV: process.env.APP_ENV || process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL,
    NEXT_PUBLIC_SUPER_ADMIN_EMAIL: process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL,
    REDIS_URL: process.env.REDIS_URL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || process.env.APP_ENV || process.env.NODE_ENV,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    DARAJA_ENVIRONMENT: process.env.DARAJA_ENVIRONMENT || process.env.MPESA_ENV || 'production',
    DARAJA_CONSUMER_KEY: process.env.DARAJA_CONSUMER_KEY || process.env.MPESA_CONSUMER_KEY,
    DARAJA_CONSUMER_SECRET: process.env.DARAJA_CONSUMER_SECRET || process.env.MPESA_CONSUMER_SECRET,
    DARAJA_PASSKEY: process.env.DARAJA_PASSKEY || process.env.MPESA_PASSKEY,
    DARAJA_SHORTCODE: process.env.DARAJA_SHORTCODE || process.env.MPESA_SHORTCODE,
    DARAJA_PARTYB: process.env.DARAJA_PARTYB || process.env.MPESA_PARTYB,
    DARAJA_TILL_NUMBER: process.env.DARAJA_TILL_NUMBER || process.env.MPESA_TILL_NUMBER,
    DARAJA_TRANSACTION_TYPE: process.env.DARAJA_TRANSACTION_TYPE || process.env.MPESA_TRANSACTION_TYPE,
    DARAJA_CALLBACK_URL: process.env.DARAJA_CALLBACK_URL || process.env.MPESA_CALLBACK_URL,
    MPESA_DOWNLOAD_FEE_KES: process.env.MPESA_DOWNLOAD_FEE_KES,
    MPESA_SUBSCRIPTION_AMOUNT_KES: process.env.MPESA_SUBSCRIPTION_AMOUNT_KES,
    EVOLUTION_API_URL: process.env.EVOLUTION_API_URL,
    EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
    EVOLUTION_INSTANCE_NAME: process.env.EVOLUTION_INSTANCE_NAME,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
    HMAC_SECRET: process.env.HMAC_SECRET,
  };

  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    log.error('[Config Error] Invalid environment variables:', parsed.error.format());
    // Strip only the failing keys so valid runtime env vars are preserved instead of wiped
    const failedKeys = new Set(
      parsed.error.issues.map((issue) => String(issue.path[0] || ''))
    );
    const cleanedEnv: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rawEnv)) {
      if (!failedKeys.has(k)) {
        cleanedEnv[k] = v;
      }
    }
    if (process.env.NODE_ENV === 'production') {
      log.warn('[Config Notice] Falling back to defaults only for invalid env keys:', Array.from(failedKeys));
    }
    const reparsed = envSchema.safeParse(cleanedEnv);
    cachedConfig = reparsed.success ? reparsed.data : envSchema.parse({});
    return cachedConfig;
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}

export const isProduction = () => getAppConfig().APP_ENV === 'production';
export const isStaging = () => getAppConfig().APP_ENV === 'staging';
export const isDevelopment = () => getAppConfig().APP_ENV === 'development' || getAppConfig().APP_ENV === 'test';
export const isTest = () => getAppConfig().APP_ENV === 'test';
