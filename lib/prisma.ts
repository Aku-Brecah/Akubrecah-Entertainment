import { log } from '@/lib/monitoring/logger';
import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;

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
    // Never persist searched IDs, PINs, or taxpayer personal details in SystemLog
    const sanitizedDetails = { ...(data.details || {}) };
    delete (sanitizedDetails as any).pin;
    delete (sanitizedDetails as any).idNumber;
    delete (sanitizedDetails as any).id_number;
    delete (sanitizedDetails as any).name;
    delete (sanitizedDetails as any).taxpayerName;
    delete (sanitizedDetails as any).station;
    delete (sanitizedDetails as any).county;
    delete (sanitizedDetails as any).email;
    delete (sanitizedDetails as any).phoneNumber;

    const sanitizedMessage = (data.message || '')
      .replace(/[A-Z]\d{9}[A-Z]/gi, '[PIN-MASKED]')
      .replace(/\b\d{7,10}\b/g, '[ID-MASKED]')
      // Phone numbers (2547XXXXXXXX / 2541XXXXXXXX / 07XX / +254…) are PII too —
      // the numeric regex above cannot match them, so mask them explicitly.
      .replace(/(\+?254|0)[17]\d{8}/g, '[PHONE-MASKED]');

    const log = await db.systemLog.create({
      data: {
        level: data.level,
        service: data.service,
        message: sanitizedMessage,
        actor: data.actor || "System",
        ip: data.ip || "127.0.0.1",
        details: sanitizedDetails,
      },
    });
    return log;
  } catch (error: any) {
    // Gracefully handle un-migrated tables or connection timeouts
    if (error?.code !== "P2021") {
      log.warn("[SystemLog notice]:", error?.message || error);
    }
    return null;
  }
}
