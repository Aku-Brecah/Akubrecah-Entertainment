import { sanitizeTelemetryPayload } from './sanitizer';

/**
 * Universal Privacy-Conscious Telemetry & Analytics Facade
 * Provides vendor-agnostic tracking across In-House Database (Postgres) and PostHog.
 */

export interface TelemetryEvent {
  eventName:
    | 'page_view'
    | 'search_pin'
    | 'view_masked_details'
    | 'click_stk_mpesa'
    | 'click_paystack'
    | 'download_certificate'
    | 'cyber_subscription_checkout'
    | 'cyber_invoice_download'
    | 'tax_filing_initiated'
    | string;
  category?: 'conversion' | 'navigation' | 'retrieval' | 'billing' | 'system';
  pin?: string;
  metadata?: Record<string, any>;
  userId?: string;
}

const SESSION_STORAGE_KEY = 'kra_portal_session_id';

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export function getClientDeviceInfo() {
  if (typeof window === 'undefined') {
    return { isMobile: false, deviceType: 'desktop', os: 'unknown', browser: 'unknown' };
  }

  const ua = navigator.userAgent;
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk)/i.test(ua);
  const isMobile = !isTablet && /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

  let os = 'Unknown';
  if (/Windows/i.test(ua)) os = 'Windows PC';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS Mac';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS Apple';
  else if (/Linux/i.test(ua)) os = 'Linux PC';

  let browser = 'Unknown';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/MSIE|Trident/i.test(ua)) browser = 'Internet Explorer';

  return {
    isMobile: isMobile || isTablet,
    isDesktopPC: deviceType === 'desktop',
    deviceType,
    os,
    browser,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    referrer: document.referrer || 'direct',
  };
}

/**
 * Track an application event with automatic PII scrubbing and environment isolation.
 */
export async function trackEvent(event: TelemetryEvent): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const sessionId = getOrCreateSessionId();
    const deviceInfo = getClientDeviceInfo();
    const sanitizedMetadata = sanitizeTelemetryPayload(event.metadata || {});
    const appEnv = process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development';

    const payload = {
      sessionId,
      activityType: event.eventName,
      category: event.category || 'system',
      description: event.eventName,
      pin: event.pin || null,
      metadata: {
        ...sanitizedMetadata,
        environment: appEnv,
      },
      isMobile: deviceInfo.isMobile,
      deviceInfo,
      userId: event.userId || undefined,
      timestamp: new Date().toISOString(),
    };

    const body = JSON.stringify(payload);

    // 1. Dispatch to In-House Database API endpoint (/api/analytics/track)
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/track', blob);
    } else {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {
        // Safe non-blocking degradation
      });
    }

    // 2. Dispatch to PostHog client if loaded
    const posthog = (window as any).posthog;
    if (posthog && typeof posthog.capture === 'function') {
      posthog.capture(event.eventName, {
        category: event.category,
        ...sanitizedMetadata,
        environment: appEnv,
      });
    }
  } catch {
    // Analytics failure must never impact the user experience
  }
}

/**
 * Track page or route views
 */
export function trackPageView(path: string, title?: string): void {
  trackEvent({
    eventName: 'page_view',
    category: 'navigation',
    metadata: {
      path,
      title: title || (typeof document !== 'undefined' ? document.title : ''),
    },
  });
}

/**
 * Identify signed-in user without logging sensitive PII
 */
export function identifyUser(userId: string, traits: Record<string, any> = {}): void {
  if (typeof window === 'undefined') return;

  try {
    const sanitizedTraits = sanitizeTelemetryPayload(traits);
    const posthog = (window as any).posthog;
    if (posthog && typeof posthog.identify === 'function') {
      posthog.identify(userId, sanitizedTraits);
    }
  } catch {
    // Ignore
  }
}
