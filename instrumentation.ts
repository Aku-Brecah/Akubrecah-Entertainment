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

    try {
      // Optional IPv4 dispatcher tuning
      // @ts-ignore: undici is available in Node.js runtime environment
      const undiciModule = await import('undici').catch(() => null);
      if (undiciModule?.setGlobalDispatcher && undiciModule?.Agent) {
        undiciModule.setGlobalDispatcher(
          new undiciModule.Agent({ connect: { autoSelectFamily: false, family: 4 } })
        );
        console.log('[Instrumentation] Undici global dispatcher configured for IPv4');
      }
    } catch (err: any) {
      console.warn('[Instrumentation] Undici config notice:', err.message);
    }

    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
