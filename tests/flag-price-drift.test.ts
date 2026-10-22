import { describe, it, expect } from 'vitest';
import { FEATURE_FLAGS } from '@/lib/feature-flags/flags';

/**
 * Price-drift regression guard:
 * Billing copy embedded in flag descriptions must never disagree with the
 * amounts actually charged in code (cyber-subscription.ts, schema, callbacks).
 */
describe('feature flag billing copy', () => {
  it('matches the implemented KES 500 cyber cafe package', () => {
    const flag = FEATURE_FLAGS.enable_cyber_cafe_subscription;
    expect(flag.description).toContain('KES 500');
    expect(flag.description).not.toContain('KES 300');
  });

  it('certificate download copy matches the KES 20 fee', () => {
    // Guard against future copy drift on the core pay-per-download fee
    for (const flag of Object.values(FEATURE_FLAGS)) {
      if (/pay.?per.?download|certificate/i.test(flag.description)) {
        expect(flag.description).not.toMatch(/KES (1[0-9]|2[1-9]|[3-9]\d)\b(?!\d)/);
      }
    }
  });
});
