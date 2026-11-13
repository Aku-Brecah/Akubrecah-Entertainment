/**
 * Central Feature Flag Registry & Default Values
 * Defines all application feature toggles, release variants, and descriptions.
 */

export interface FeatureFlagDefinition {
  key: string;
  name: string;
  description: string;
  defaultValue: boolean;
  category: 'payments' | 'services' | 'bot' | 'system';
}

export const FEATURE_FLAGS: Record<string, FeatureFlagDefinition> = {
  enable_mpesa_stk_push: {
    key: 'enable_mpesa_stk_push',
    name: 'M-Pesa STK Push Express',
    description: 'Enables instant Safaricom Daraja M-Pesa STK push payment prompts.',
    defaultValue: true,
    category: 'payments',
  },
  enable_cyber_cafe_subscription: {
    key: 'enable_cyber_cafe_subscription',
    name: 'Cyber Cafe Monthly Subscription',
    description: 'Allows cyber cafes to subscribe for KES 500 monthly unlimited retrieval packages.',
    defaultValue: true,
    category: 'services',
  },
  enable_nil_tax_filing: {
    key: 'enable_nil_tax_filing',
    name: 'Nil Tax Return Automated Filing',
    description: 'Beta feature allowing automated KRA Nil returns submission.',
    defaultValue: false,
    category: 'services',
  },
  enable_whatsapp_bot_ai: {
    key: 'enable_whatsapp_bot_ai',
    name: 'WhatsApp AI Tax Assistant',
    description: 'Enables Gemini / GPT-4o conversational reasoning in WhatsApp bot.',
    defaultValue: true,
    category: 'bot',
  },
  maintenance_mode: {
    key: 'maintenance_mode',
    name: 'Platform Maintenance Mode',
    description: 'Puts user portal into maintenance mode while leaving admin access operational.',
    defaultValue: false,
    category: 'system',
  },
};

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
