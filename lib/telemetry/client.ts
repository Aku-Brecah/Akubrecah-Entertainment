/**
 * Client-Side Analytics Adapter for Akubrecah KRA Portal
 * Maps legacy {activityType} payloads onto the telemetry engine (lib/telemetry/analytics.ts).
 */

import {
  trackEvent as trackTelemetryEvent,
  getOrCreateSessionId,
  getClientDeviceInfo,
  TelemetryEvent,
} from './analytics';

export interface TrackingPayload {
  activityType:
    | 'page_view'
    | 'search_pin'
    | 'view_masked'
    | 'click_stk_mpesa'
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
