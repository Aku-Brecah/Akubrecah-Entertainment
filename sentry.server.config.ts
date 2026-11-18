import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

// SECURITY: KDPA zero-PII policy — scrub request payloads and extras so
// taxpayer PINs, IDs, phone numbers, and emails never leave the app boundary.
function scrubDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return value
      .replace(/[A-Z]\d{9}[A-Z]/gi, '[PIN-MASKED]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL-MASKED]')
      .replace(/(\+?254|0)[17]\d{8}/g, '[PHONE-MASKED]')
      .replace(/\b\d{7,10}\b/g, '[ID-MASKED]') as unknown as T;
  }
  if (Array.isArray(value)) return value.map(scrubDeep) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/pin|password|secret|token|email|phone|cookie|authorization/i.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = scrubDeep(v);
      }
    }
    return out as unknown as T;
  }
  return value;
}

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.APP_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    beforeSend(event) {
      if (event.message) event.message = scrubDeep(event.message);
      if (event.exception?.values) {
        event.exception.values = event.exception.values.map((ex) => ({
          ...ex,
          value: ex.value ? scrubDeep(ex.value) : ex.value,
        }));
      }
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => ({
          ...b,
          message: b.message ? scrubDeep(b.message) : b.message,
          data: b.data ? (scrubDeep(b.data) as Record<string, unknown>) : b.data,
        }));
      }
      if (event.request) {
        if (event.request.url) event.request.url = scrubDeep(event.request.url);
        if (event.request.query_string) event.request.query_string = scrubDeep(event.request.query_string);
        if (event.request.headers) event.request.headers = scrubDeep(event.request.headers);
        if (event.request.data) event.request.data = scrubDeep(event.request.data);
      }
      if (event.tags) event.tags = scrubDeep(event.tags) as typeof event.tags;
      if (event.extra) event.extra = scrubDeep(event.extra) as typeof event.extra;
      if (event.user) {
        if (event.user.email) delete (event.user as Record<string, unknown>).email;
        if (event.user.ip_address) delete (event.user as Record<string, unknown>).ip_address;
        if (event.user.username) delete (event.user as Record<string, unknown>).username;
      }
      return event;
    },
    debug: false,
  });
}
