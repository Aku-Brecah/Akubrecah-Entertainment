import dns from 'dns';

export function register() {
  try {
    dns.setDefaultResultOrder('ipv4first');
    console.log('[Instrumentation] DNS default result order set to ipv4first');
  } catch (err: any) {
    console.warn('[Instrumentation] Could not set DNS order:', err.message);
  }

  try {
    const { setGlobalDispatcher, Agent } = require('undici');
    setGlobalDispatcher(new Agent({ connect: { autoSelectFamily: false, family: 4 } }));
    console.log('[Instrumentation] Undici global dispatcher configured for IPv4');
  } catch (err: any) {
    console.warn('[Instrumentation] Undici config notice:', err.message);
  }
}

