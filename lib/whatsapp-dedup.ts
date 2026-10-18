/**
 * In-memory deduplication cache for WhatsApp messages.
 * Prevents double processing and duplicate replies caused by:
 * 1. Dual webhook dispatch (Evolution API global webhook + instance webhook)
 * 2. Rapid network delivery retries from WhatsApp/Evolution
 */

declare global {
  // eslint-disable-next-line no-var
  var __whatsappProcessedMessages: Map<string, number> | undefined;
}

const TTL_MS = 120_000; // 2 minutes retention

function getCache(): Map<string, number> {
  if (!globalThis.__whatsappProcessedMessages) {
    globalThis.__whatsappProcessedMessages = new Map<string, number>();
  }
  return globalThis.__whatsappProcessedMessages;
}

/**
 * Checks whether a message ID has already been recorded within the TTL.
 * If not duplicate, immediately records it so that race conditions (concurrent requests)
 * arriving within milliseconds of each other will be caught.
 *
 * @param messageId Unique message ID from WhatsApp / Evolution (key.id)
 * @returns true if already processed, false if this is the first time seeing it
 */
export function isDuplicateWhatsAppMessage(messageId: string | undefined | null): boolean {
  if (!messageId || typeof messageId !== 'string') {
    return false;
  }

  const cleanId = messageId.trim();
  if (!cleanId) return false;

  const cache = getCache();
  const now = Date.now();

  // Periodic pruning if cache exceeds 1,000 items
  if (cache.size > 1000) {
    for (const [id, timestamp] of cache.entries()) {
      if (now - timestamp > TTL_MS) {
        cache.delete(id);
      }
    }
  }

  const existingTimestamp = cache.get(cleanId);
  if (existingTimestamp && now - existingTimestamp < TTL_MS) {
    return true; // Duplicate!
  }

  // Atomically record this message ID
  cache.set(cleanId, now);
  return false;
}

/**
 * Explicitly mark a message ID as processed
 */
export function markWhatsAppMessageProcessed(messageId: string | undefined | null): void {
  if (!messageId || typeof messageId !== 'string') return;
  const cleanId = messageId.trim();
  if (!cleanId) return;
  getCache().set(cleanId, Date.now());
}
