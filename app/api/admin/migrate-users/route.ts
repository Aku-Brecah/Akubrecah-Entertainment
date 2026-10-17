import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createSystemLog } from "@/lib/prisma";
import { verifyAdminCaller } from "@/lib/admin-auth";

export const maxDuration = 60; // Allow sufficient time for batch user migration

interface MigrationResults {
  total: number;
  success: string[];
  skipped: string[];
  failed: { email: string; error: string }[];
}

/**
 * Helper to parse CSV rows into key-value objects
 */
function parseCsv(content: string): any[] {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header line handling potential quotes
  const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parser that handles commas inside quotes
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim().replace(/^["']|["']$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^["']|["']$/g, ""));

    const rowObj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      rowObj[header] = values[idx] || "";
    });
    rows.push(rowObj);
  }

  return rows;
}

/**
 * POST /api/admin/migrate-users
 * Supports:
 * 1. Direct Clerk API sync (devSecretKey: "sk_test_...")
 * 2. Raw CSV content upload/paste (csvContent: "...")
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdminCaller(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const devSecretKey = (body.devSecretKey || process.env.DEV_CLERK_SECRET_KEY || process.env.CLERK_DEV_SECRET_KEY || "").trim();
    const csvContent = (body.csvContent || "").trim();
    const defaultPassword = body.defaultPassword || "Akubrecah2026!#";

    if (!devSecretKey && !csvContent) {
      // Check if old clerk.csv exists on server filesystem as fallback
      const fallbackPath = path.resolve(process.cwd(), "old clerk.csv");
      if (!fs.existsSync(fallbackPath)) {
        return NextResponse.json(
          {
            success: false,
            error: "Please provide your Clerk Development Secret Key (sk_test_...) or upload a Clerk CSV export.",
          },
          { status: 400 }
        );
      }
    }

    const client = await clerkClient();

    // 1. Fetch existing production users to avoid duplicates
    const existingUsersList = await client.users.getUserList({ limit: 500 });
    const existingUsers = Array.isArray(existingUsersList)
      ? existingUsersList
      : ((existingUsersList as any).data || []);

    const targetEmails = new Set<string>();
    existingUsers.forEach((u: any) => {
      (u.emailAddresses || []).forEach((e: any) => {
        if (e.emailAddress) targetEmails.add(e.emailAddress.toLowerCase());
      });
    });

    const results: MigrationResults = {
      total: 0,
      success: [],
      skipped: [],
      failed: [],
    };

    // =========================================================
    // METHOD 1: Direct Clerk Dev API Sync
    // =========================================================
    if (devSecretKey) {
      console.log("[User Migration] Initiating direct Clerk API migration with dev secret key...");
      const devRes = await fetch("https://api.clerk.com/v1/users?limit=500&order_by=-created_at", {
        headers: {
          Authorization: `Bearer ${devSecretKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!devRes.ok) {
        const errorText = await devRes.text();
        return NextResponse.json(
          {
            success: false,
            error: `Failed to fetch users from Clerk Dev instance (${devRes.status}): ${errorText}`,
          },
          { status: 400 }
        );
      }

      const devUsers: any[] = await devRes.json();
      results.total = devUsers.length;

      for (const devUser of devUsers) {
        const email =
          devUser.email_addresses?.find((e: any) => e.id === devUser.primary_email_address_id)?.email_address ||
          devUser.email_addresses?.[0]?.email_address;

        if (!email) {
          results.skipped.push(`User ${devUser.id} skipped (no email address found)`);
          continue;
        }

        if (targetEmails.has(email.toLowerCase())) {
          results.skipped.push(`${email} (already exists in production)`);
          continue;
        }

        const payload: any = {
          emailAddress: [email],
          firstName: devUser.first_name || undefined,
          lastName: devUser.last_name || undefined,
          username: devUser.username || undefined,
          password: defaultPassword,
          skipPasswordChecks: true,
          publicMetadata: {
            ...(devUser.public_metadata || {}),
            migrated_from_dev: true,
            migrated_at: new Date().toISOString(),
          },
        };

        // Attach phone if present and valid E.164
        const primaryPhone =
          devUser.phone_numbers?.find((p: any) => p.id === devUser.primary_phone_number_id)?.phone_number ||
          devUser.phone_numbers?.[0]?.phone_number;

        if (primaryPhone && primaryPhone.startsWith("+")) {
          payload.phoneNumber = [primaryPhone];
        }

        try {
          const created = await client.users.createUser(payload);
          results.success.push(`${email} (${created.id})`);
          targetEmails.add(email.toLowerCase());
        } catch (err: any) {
          console.error(`[User Migration] Failed to create ${email}:`, err);
          let errorMsg = err.message || "Failed to create user in production";
          if (err.errors && Array.isArray(err.errors)) {
            errorMsg = err.errors.map((e: any) => `${e.code}: ${e.message}`).join(" | ");
          }
          results.failed.push({ email, error: errorMsg });
        }

        // Rate limit courtesy delay
        await new Promise((r) => setTimeout(r, 60));
      }
    }
    // =========================================================
    // METHOD 2: Clerk CSV Export Sync
    // =========================================================
    else {
      let rawContent = csvContent;
      if (!rawContent) {
        const fallbackPath = path.resolve(process.cwd(), "old clerk.csv");
        rawContent = fs.readFileSync(fallbackPath, "utf8");
      }

      const parsedUsers = parseCsv(rawContent);
      results.total = parsedUsers.length;

      for (const u of parsedUsers) {
        const email =
          u.primary_email_address ||
          u.email_address ||
          u.email ||
          u["Primary Email Address"];

        if (!email) {
          results.skipped.push(`Row skipped: missing email address (${u.first_name || "Unknown"})`);
          continue;
        }

        if (targetEmails.has(email.toLowerCase())) {
          results.skipped.push(`${email} (already exists in production)`);
          continue;
        }

        const payload: any = {
          emailAddress: [email],
          firstName: u.first_name || u["First Name"] || undefined,
          lastName: u.last_name || u["Last Name"] || undefined,
          username: u.username || u["Username"] || undefined,
          skipPasswordChecks: true,
          publicMetadata: {
            role: u.role || u["Role"] || "Registered Taxpayer",
            migrated_from_csv: true,
            migrated_at: new Date().toISOString(),
          },
        };

        // If Clerk CSV included password hash digests, retain exact password credentials
        const passwordDigest = u.password_digest || u["Password Digest"];
        const passwordHasher = u.password_hasher || u["Password Hasher"];

        if (passwordDigest && passwordHasher) {
          payload.passwordDigest = passwordDigest;
          payload.passwordHasher = passwordHasher;
        } else {
          payload.password = defaultPassword;
        }

        const phone = u.phone_number || u["Phone Number"];
        if (phone && phone.startsWith("+")) {
          payload.phoneNumber = [phone];
        }

        try {
          const created = await client.users.createUser(payload);
          results.success.push(`${email} (${created.id})`);
          targetEmails.add(email.toLowerCase());
        } catch (err: any) {
          console.error(`[User Migration CSV] Failed to create ${email}:`, err);
          let errorMsg = err.message || "Failed to create user in production";
          if (err.errors && Array.isArray(err.errors)) {
            errorMsg = err.errors.map((e: any) => `${e.code}: ${e.message}`).join(" | ");
          }
          results.failed.push({ email, error: errorMsg });
        }

        // Rate limit courtesy delay
        await new Promise((r) => setTimeout(r, 60));
      }
    }

    // Record audit log to Neon database
    try {
      await createSystemLog({
        level: results.failed.length > 0 ? "warning" : "info",
        service: "UserMigration",
        message: `User migration executed by ${admin.email}: ${results.success.length} succeeded, ${results.skipped.length} skipped, ${results.failed.length} failed out of ${results.total} total.`,
        actor: admin.email || "SystemAdmin",
        details: {
          total: results.total,
          successCount: results.success.length,
          skippedCount: results.skipped.length,
          failedCount: results.failed.length,
          failedUsers: results.failed,
        },
      });
    } catch (logErr) {
      console.warn("[User Migration] Failed to write database log:", logErr);
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed: ${results.success.length} imported, ${results.skipped.length} skipped, ${results.failed.length} failed.`,
      results,
    });
  } catch (error: any) {
    console.error("[User Migration Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error during migration." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/migrate-users
 * Returns diagnostic migration readiness status
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdminCaller(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const fallbackPath = path.resolve(process.cwd(), "old clerk.csv");
    const hasLocalCsv = fs.existsSync(fallbackPath);
    const hasEnvDevKey = Boolean(process.env.DEV_CLERK_SECRET_KEY || process.env.CLERK_DEV_SECRET_KEY);

    return NextResponse.json({
      success: true,
      ready: true,
      hasLocalCsv,
      hasEnvDevKey,
      methods: ["api", "csv"],
      message: "User migration engine is ready. You can sync via Clerk Dev Secret Key or CSV upload.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
