/**
 * Client-Side Analytics Tracker for Akubrecah KRA Portal
 * Backward-compatible wrapper over the centralized lib/telemetry engine.
 */

import {
  trackEvent as trackTelemetryEvent,
  getOrCreateSessionId,
  getClientDeviceInfo,
  TelemetryEvent,
} from './telemetry';

export interface TrackingPayload {
  activityType:
    | 'page_view'
    | 'search_pin'
    | 'view_masked'
    | 'click_stk_mpesa'
    | 'click_paystack'
    | 'download_certificate'
    | string;
  description?: string;
  pin?: string;
  metadata?: Record<string, any>;
}

export { getOrCreateSessionId, getClientDeviceInfo };

/**
 * Track an activity or click event with PII protection
 */
export async function trackEvent(payload: TrackingPayload): Promise<void> {
  return trackTelemetryEvent({
    eventName: payload.activityType,
    pin: payload.pin,
    metadata: {
      ...payload.metadata,
      description: payload.description,
    },
  });
}
