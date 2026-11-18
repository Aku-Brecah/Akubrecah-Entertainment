import { log } from '@/lib/monitoring/logger';
import Redis from 'ioredis';
import { getTierForRoute, RateTier } from './tiers';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSec: number;
  engine: 'redis' | 'memory';
}

// In-Memory Fallback Bounded LRU Cache
interface MemoryBucket {
  count: number;
  resetAt: number;
}

const MAX_BUCKETS = 5000;
const memoryBuckets = new Map<string, MemoryBucket>();

// Redis Client Singleton with Fast Timeout, Offline Protection & Automatic Recovery
let redisClient: Redis | null = null;
let redisFailedUntil = 0;
const REDIS_COOLDOWN_MS = 30_000;

function markRedisFailed() {
  redisFailedUntil = Date.now() + REDIS_COOLDOWN_MS;
}

function isRedisAvailable(): boolean {
  return Date.now() >= redisFailedUntil;
}

function getRedisClient(): Redis | null {
  if (!isRedisAvailable()) return null;
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  try {
    const client = new Redis(redisUrl, {
      connectTimeout: 500,
      commandTimeout: 500,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        if (times > 3) {
          markRedisFailed();
          return null;
        }
        return Math.min(times * 100, 1000);
      },
    });

    client.on('error', (err) => {
      if (isRedisAvailable()) {
        log.warn('[RateLimiter notice] Redis unreachable, falling back to in-memory limiter for 30s:', err.message);
      }
      markRedisFailed();
    });

    redisClient = client;
    return client;
  } catch {
    markRedisFailed();
    return null;
  }
}

/**
 * Memory Limiter Fallback (Sliding Window / Fixed Window LRU)
 */
function checkMemoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  // Periodic pruning of expired entries
  if (memoryBuckets.size > 1000) {
    for (const [k, b] of memoryBuckets.entries()) {
      if (now > b.resetAt) {
        memoryBuckets.delete(k);
      }
    }
  }

  // Bounded LRU eviction
  if (memoryBuckets.size >= MAX_BUCKETS) {
    const oldestKey = memoryBuckets.keys().next().value;
    if (oldestKey) memoryBuckets.delete(oldestKey);
  }

  const bucket = memoryBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    const resetAt = now + windowMs;
    memoryBuckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetSec: Math.ceil(windowMs / 1000),
      engine: 'memory',
    };
  }

  bucket.count++;
  const remaining = Math.max(0, limit - bucket.count);
  const resetSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return {
    allowed: bucket.count <= limit,
    limit,
    remaining,
    resetSec,
    engine: 'memory',
  };
}

/**
 * Universal Rate Limiter: Redis with graceful In-Memory Fallback
 */
export async function checkRateLimit(
  identifier: string,
  pathname: string
): Promise<RateLimitResult> {
  const tier: RateTier = getTierForRoute(pathname);
  const windowSec = Math.ceil(tier.windowMs / 1000);
  const key = `ratelimit:${tier.tierKey}:${identifier}`;

  const redis = getRedisClient();

  if (redis && isRedisAvailable()) {
    try {
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.ttl(key);
      const results = await pipeline.exec();

      if (results && results[0] && !results[0][0]) {
        const count = results[0][1] as number;
        let ttl = (results[1] ? results[1][1] : -1) as number;

        if (ttl === -1 || count === 1) {
          await redis.expire(key, windowSec);
          ttl = windowSec;
        }

        const resetSec = ttl > 0 ? ttl : windowSec;
        const remaining = Math.max(0, tier.limit - count);
        return {
          allowed: count <= tier.limit,
          limit: tier.limit,
          remaining,
          resetSec,
          engine: 'redis',
        };
      }
    } catch {
      markRedisFailed();
    }
  }

  // Fallback to bounded in-memory LRU
  return checkMemoryRateLimit(key, tier.limit, tier.windowMs);
}
