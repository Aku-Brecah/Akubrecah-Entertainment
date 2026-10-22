import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isFeatureEnabled, clearFeatureFlagCache } from '@/lib/feature-flags/engine';
import { FEATURE_FLAGS } from '@/lib/feature-flags/flags';

vi.mock('@/lib/prisma', () => ({
  default: {
    service_settings: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

describe('Feature Flags Engine', () => {
  beforeEach(() => {
    clearFeatureFlagCache();
  });

  afterEach(() => {
    delete process.env.FEATURE_FLAG_ENABLE_NIL_TAX_FILING;
    delete process.env.FEATURE_FLAG_ENABLE_PAYSTACK_GATEWAY;
    clearFeatureFlagCache();
  });

  it('evaluates defined flags to their safe default values', async () => {
    const paystackEnabled = await isFeatureEnabled('enable_paystack_gateway');
    expect(paystackEnabled).toBe(true);

    const mpesaEnabled = await isFeatureEnabled('enable_mpesa_stk_push');
    expect(mpesaEnabled).toBe(true);

    const nilFilingEnabled = await isFeatureEnabled('enable_nil_tax_filing');
    expect(nilFilingEnabled).toBe(false); // Beta feature defaults to false
  });

  it('honors environment variable overrides with highest priority', async () => {
    // Override default false to true via env
    process.env.FEATURE_FLAG_ENABLE_NIL_TAX_FILING = 'true';
    clearFeatureFlagCache();

    const result = await isFeatureEnabled('enable_nil_tax_filing');
    expect(result).toBe(true);

    // Override default true to false via env
    process.env.FEATURE_FLAG_ENABLE_PAYSTACK_GATEWAY = 'false';
    clearFeatureFlagCache();

    const disabledResult = await isFeatureEnabled('enable_paystack_gateway');
    expect(disabledResult).toBe(false);
  });

  it('defaults to false for unknown or unregistered feature flag keys', async () => {
    const unknownFlag = await isFeatureEnabled('non_existent_feature_xyz');
    expect(unknownFlag).toBe(false);
  });
});
