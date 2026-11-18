import { log } from '@/lib/monitoring/logger';
import prisma from '@/lib/prisma';
import { FEATURE_FLAGS, FeatureFlagKey } from './flags';

interface CachedFlag {
  isActive: boolean;
  source: 'env' | 'db' | 'default';
  cachedAt: number;
}

const FLAG_CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL cache
const flagCache = new Map<string, CachedFlag>();

export function clearFeatureFlagCache(): void {
  flagCache.clear();
}

/**
 * Server-side Feature Flag Evaluation
 * Checks Environment -> TTL Cache -> PostgreSQL service_settings -> Default
 */
export async function isFeatureEnabled(
  flagKey: FeatureFlagKey | string,
  userIdentifier?: string
): Promise<boolean> {
  const definition = Object.prototype.hasOwnProperty.call(FEATURE_FLAGS, flagKey)
    ? FEATURE_FLAGS[flagKey]
    : undefined;
  const defaultValue = definition ? definition.defaultValue : false;

  // 1. Environment Variable Override (highest precedence)
  const envVarKey = `FEATURE_FLAG_${flagKey.toUpperCase()}`;
  const envVal = process.env[envVarKey];
  if (envVal !== undefined) {
    if (envVal.toLowerCase() === 'true' || envVal === '1') {
      flagCache.set(flagKey, { isActive: true, source: 'env', cachedAt: Date.now() });
      return true;
    }
    if (envVal.toLowerCase() === 'false' || envVal === '0') {
      flagCache.set(flagKey, { isActive: false, source: 'env', cachedAt: Date.now() });
      return false;
    }
  }

  // 2. In-Memory TTL Cache Check
  const now = Date.now();
  const cached = flagCache.get(flagKey);
  if (cached && now - cached.cachedAt < FLAG_CACHE_TTL_MS) {
    return cached.isActive;
  }

  // 3. Database Check (service_settings model in Prisma)
  try {
    const db = prisma as any;
    if (typeof db.service_settings?.findUnique === 'function') {
      const record = await db.service_settings.findUnique({
        where: { service_key: flagKey },
      });

      if (record) {
        flagCache.set(flagKey, {
          isActive: Boolean(record.is_active),
          source: 'db',
          cachedAt: now,
        });
        return Boolean(record.is_active);
      }
    }
  } catch {
    // Database lookup failure gracefully falls back to default
  }

  // 4. Default Fallback
  flagCache.set(flagKey, {
    isActive: defaultValue,
    source: 'default',
    cachedAt: now,
  });

  return defaultValue;
}

/**
 * Mutate a feature flag state in database and invalidate cache immediately
 */
export async function setFeatureFlag(
  flagKey: string,
  isActive: boolean,
  description?: string
): Promise<boolean> {
  try {
    const db = prisma as any;
    if (typeof db.service_settings?.upsert === 'function') {
      await db.service_settings.upsert({
        where: { service_key: flagKey },
        update: {
          is_active: isActive,
          description: description || undefined,
          updated_at: new Date(),
        },
        create: {
          id: 'flag_' + flagKey,
          service_key: flagKey,
          service_name: FEATURE_FLAGS[flagKey]?.name || flagKey,
          is_active: isActive,
          description: description || FEATURE_FLAGS[flagKey]?.description || null,
        },
      });

      // Clear cache so all instances immediately see the change
      flagCache.delete(flagKey);
      return true;
    }
  } catch (err: any) {
    log.error('[FeatureFlag set error]:', err.message);
  }

  return false;
}

/**
 * List all feature flags with evaluated status for Admin Control Panel
 */
export async function getAllFeatureFlags(): Promise<
  Array<{
    key: string;
    name: string;
    description: string;
    isActive: boolean;
    category: string;
    source: 'env' | 'db' | 'default';
  }>
> {
  const dbMap = new Map<string, boolean>();
  try {
    const db = prisma as any;
    if (typeof db.service_settings?.findMany === 'function') {
      const records = await db.service_settings.findMany({
        where: { service_key: { in: Object.keys(FEATURE_FLAGS) } },
      });
      for (const rec of records || []) {
        dbMap.set(rec.service_key, Boolean(rec.is_active));
      }
    }
  } catch {
    // Fallback to env/default
  }

  const now = Date.now();
  const results = [];

  for (const [key, def] of Object.entries(FEATURE_FLAGS)) {
    const envVal = process.env[`FEATURE_FLAG_${key.toUpperCase()}`];
    if (envVal !== undefined && ['true', '1', 'false', '0'].includes(envVal.toLowerCase())) {
      const isActive = envVal.toLowerCase() === 'true' || envVal === '1';
      flagCache.set(key, { isActive, source: 'env', cachedAt: now });
      results.push({ key, name: def.name, description: def.description, isActive, category: def.category, source: 'env' as const });
    } else if (dbMap.has(key)) {
      const isActive = dbMap.get(key)!;
      flagCache.set(key, { isActive, source: 'db', cachedAt: now });
      results.push({ key, name: def.name, description: def.description, isActive, category: def.category, source: 'db' as const });
    } else {
      flagCache.set(key, { isActive: def.defaultValue, source: 'default', cachedAt: now });
      results.push({ key, name: def.name, description: def.description, isActive: def.defaultValue, category: def.category, source: 'default' as const });
    }
  }

  return results;
}
