import { describe, it, expect } from 'vitest';
import { getAppConfig, isProduction, isStaging, isDevelopment } from '@/lib/config/env';

describe('Environment Configuration Module', () => {
  it('parses environment configuration with valid defaults', () => {
    const config = getAppConfig();
    expect(config).toBeDefined();
    expect(config.NODE_ENV).toBeDefined();
    expect(config.SUPER_ADMIN_EMAIL).toBe('poweldayck@gmail.com');
    expect(config.PAYSTACK_SUBSCRIPTION_AMOUNT_KES).toBe(499);
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
