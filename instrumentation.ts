import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const dns = await import('dns');
      dns.setDefaultResultOrder?.('ipv4first');
      console.log('[Instrumentation] DNS default result order set to ipv4first');
    } catch (err: any) {
      console.warn('[Instrumentation] Could not set DNS order:', err.message);
    }


    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
