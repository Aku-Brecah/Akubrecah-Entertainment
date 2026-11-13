import { describe, it, expect } from 'vitest';
import { getAppConfig, isProduction, isStaging, isDevelopment } from '@/lib/config/env';

describe('Environment Configuration Module', () => {
  it('parses environment configuration with valid defaults', () => {
    const config = getAppConfig();
    expect(config).toBeDefined();
    expect(config.NODE_ENV).toBeDefined();
    // No hardcoded fallback identity: unset env means empty (fail closed).
    expect(config.SUPER_ADMIN_EMAIL).toBe('');
    expect(config.MPESA_DOWNLOAD_FEE_KES).toBe(20);
    expect(config.MPESA_SUBSCRIPTION_AMOUNT_KES).toBe(500);
    expect(config.DARAJA_ENVIRONMENT).toBeDefined();
    expect(config.REDIS_URL).toBeDefined();
  });

  it('determines active environment tier correctly', () => {
    const config = getAppConfig();
    if (config.APP_ENV === 'production') {
      expect(isProduction()).toBe(true);
      expect(isDevelopment()).toBe(false);
    } else {
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
    }
  });
});
