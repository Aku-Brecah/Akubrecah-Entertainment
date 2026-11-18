import { log } from '@/lib/monitoring/logger';
import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient({
    log:
      process.env.PRISMA_LOG_QUERIES === "true"
        ? ["query", "error", "warn"]
        : process.env.NODE_ENV === "development"
          ? ["error", "warn"]
          : ["error"],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
  // eslint-disable-next-line no-var
  var prismaGlobalV2: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Disconnect legacy singleton so HMR immediately switches to quiet logging
if (globalThis.prismaGlobal) {
  void globalThis.prismaGlobal.$disconnect?.().catch(() => {});
  globalThis.prismaGlobal = undefined;
}

const prisma = globalThis.prismaGlobalV2 ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobalV2 = prisma;

// Reusable helper to write audit logs to database
export async function createSystemLog(data: {
  level: "info" | "warning" | "error";
  service: string;
  message: string;
  actor: string;
  ip?: string;
  details?: Record<string, unknown>;
}) {
  try {
    const db = prisma as any;
    if (typeof db.systemLog?.create !== "function") {
      return null;
    }

    // Strict Zero-Storage Privacy Policy:
    // Recursively strip searched IDs, PINs, or taxpayer personal details from SystemLog
    const PII_KEYS = new Set([
      'pin', 'kraPin', 'idNumber', 'id_number', 'name', 'taxpayerName',
      'station', 'county', 'email', 'phoneNumber', 'phone', 'password', 'token',
    ]);
    const scrubValue = (val: unknown, depth = 0): unknown => {
      if (depth > 4 || val === null || val === undefined) return val;
      if (typeof val === 'string') {
        return val
          .replace(/[A-Z]\d{9}[A-Z]/gi, '[PIN-MASKED]')
          .replace(/(\+?254|0)[17]\d{8}/g, '[PHONE-MASKED]');
      }
      if (Array.isArray(val)) {
        return val.slice(0, 50).map((item) => scrubValue(item, depth + 1));
      }
      if (typeof val === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
          if (PII_KEYS.has(k)) continue;
          out[k] = scrubValue(v, depth + 1);
        }
        return out;
      }
      return val;
    };

    const sanitizedDetails = (scrubValue(data.details || {}) as Record<string, unknown>) || {};

    const sanitizeText = (text: string) =>
      text
        .replace(/[A-Z]\d{9}[A-Z]/gi, '[PIN-MASKED]')
        .replace(/\b\d{7,10}\b/g, '[ID-MASKED]')
        .replace(/(\+?254|0)[17]\d{8}/g, '[PHONE-MASKED]');

    const sanitizedMessage = sanitizeText(data.message || '');
    const sanitizedActor = sanitizeText(data.actor || 'System');

    const logRecord = await db.systemLog.create({
      data: {
        level: data.level,
        service: data.service,
        message: sanitizedMessage,
        actor: sanitizedActor,
        ip: data.ip || "127.0.0.1",
        details: sanitizedDetails,
      },
    });
    return logRecord;
  } catch (error: any) {
    // Gracefully handle un-migrated tables or connection timeouts
    if (error?.code !== "P2021") {
      log.warn("[SystemLog notice]:", error?.message || error);
    }
    return null;
  }
}
