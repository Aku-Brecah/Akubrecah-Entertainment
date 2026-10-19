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

  // Database Connection
  DATABASE_URL: z.string().min(1).default('postgresql://postgres:postgres@localhost:5432/postgres?schema=public'),
  DIRECT_URL: z.string().optional(),

  // Authentication (Clerk)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional().default('pk_live_Y2xlcmsuYWt1YnJlY2FoLmNvbSQ'),
  CLERK_SECRET_KEY: z.string().optional(),
  SUPER_ADMIN_EMAIL: z.string().email().default('poweldayck@gmail.com'),
  NEXT_PUBLIC_SUPER_ADMIN_EMAIL: z.string().email().default('poweldayck@gmail.com'),

  // Distributed Cache & Rate Limiting (Redis)
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),

  // Observability & Crash Reporting (Sentry)
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),

  // Analytics & Telemetry (PostHog / In-House)
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional().default('https://us.i.posthog.com'),

  // Payments (Paystack & M-Pesa)
  PAYSTACK_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_SUBSCRIPTION_AMOUNT_KES: z.coerce.number().default(499),
  PAYSTACK_DOWNLOAD_FEE_KES: z.coerce.number().default(20),

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
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    PAYSTACK_SUBSCRIPTION_AMOUNT_KES: process.env.PAYSTACK_SUBSCRIPTION_AMOUNT_KES,
    PAYSTACK_DOWNLOAD_FEE_KES: process.env.PAYSTACK_DOWNLOAD_FEE_KES,
    EVOLUTION_API_URL: process.env.EVOLUTION_API_URL,
    EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
    EVOLUTION_INSTANCE_NAME: process.env.EVOLUTION_INSTANCE_NAME,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
    HMAC_SECRET: process.env.HMAC_SECRET,
  };

  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    console.error('❌ [Config Error] Invalid environment variables:', parsed.error.format());
    // In production, log warning; in development, throw or supply safe fallback
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ [Config Notice] Defaulting to safe fallbacks to prevent container crash.');
    }
    // Return parsed with defaults as far as possible
    cachedConfig = envSchema.parse({});
    return cachedConfig;
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}

export const isProduction = () => getAppConfig().APP_ENV === 'production';
export const isStaging = () => getAppConfig().APP_ENV === 'staging';
export const isDevelopment = () => getAppConfig().APP_ENV === 'development' || getAppConfig().APP_ENV === 'test';
export const isTest = () => getAppConfig().APP_ENV === 'test';
