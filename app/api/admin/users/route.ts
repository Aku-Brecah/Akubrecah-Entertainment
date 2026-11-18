import { log } from '@/lib/monitoring/logger';
import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCaller, isSuperAdminCaller } from "@/lib/admin-auth";

const ALLOWED_ROLES = new Set([
  "Super Admin",
  "Admin",
  "Portal Auditor",
  "Cybercafe Partner",
  "Registered Taxpayer",
  "user",
]);

function isProtectedSuperAdminTarget(user: {
  emailAddresses?: { id: string; emailAddress: string }[];
  primaryEmailAddressId?: string | null;
  publicMetadata?: Record<string, unknown>;
}): boolean {
  const email = (
    user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ||
    user.emailAddresses?.[0]?.emailAddress ||
    ""
  )
    .trim()
    .toLowerCase();
  const configAdmin = (process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
  const publicAdmin = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
  return (
    (Boolean(email) && Boolean(configAdmin) && email === configAdmin) ||
    (Boolean(email) && Boolean(publicAdmin) && email === publicAdmin)
  );
}

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdminCaller(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized: Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const parsedLimit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const parsedPage = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;
    const page = Number.isFinite(parsedPage) ? Math.max(parsedPage, 1) : 1;
    const offset = (page - 1) * limit;

    const client = await clerkClient();

    const response = await client.users.getUserList({
      limit,
      offset,
    });

    const rawUsers = Array.isArray(response) ? response : ((response as any).data || []);
    const totalCount = typeof (response as any).totalCount === "number" ? (response as any).totalCount : rawUsers.length;

    log.info("[API Admin Users GET] Fetched users page:", {
      page,
      limit,
      totalReturned: rawUsers.length,
      totalCount,
    });

    const formattedUsers = rawUsers.map((user: {
      id: string;
      emailAddresses: { id: string; emailAddress: string }[];
      primaryEmailAddressId: string | null;
      firstName: string | null;
      lastName: string | null;
      username: string | null;
      publicMetadata: Record<string, unknown>;
      banned: boolean;
      lastSignInAt: number | null;
    }) => {
      const email = user.emailAddresses.find((e: { id: string; emailAddress: string }) => e.id === user.primaryEmailAddressId)?.emailAddress 
        || user.emailAddresses[0]?.emailAddress 
        || "";
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || email.split("@")[0] || "Unknown User";
      const role = (user.publicMetadata?.role as string) || "Registered Taxpayer";
      const status = user.banned ? "Inactive" : "Active";
      const lastLogin = user.lastSignInAt 
        ? new Date(user.lastSignInAt).toLocaleString("en-US", { hour12: true, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : "Never";

      return {
        id: user.id,
        name,
        email,
        role,
        status,
        lastLogin,
        initials: name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2),
      };
    });

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      },
    });
  } catch (error: any) {
    log.error("[API Admin Users GET Error]:", error);
    return NextResponse.json({ success: false, error: "Failed to load users list." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdminCaller(req);
    if (!isSuperAdminCaller(admin)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Super Admin privileges required to manage users and roles." },
        { status: 403 }
      );
    }

    const client = await clerkClient();
    const { action, userId, role, status } = await req.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
    }

    const targetUser = await client.users.getUser(userId).catch(() => null);
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "Target user not found." }, { status: 404 });
    }
    const targetIsProtectedSuperAdmin = isProtectedSuperAdminTarget(targetUser);

    if (action === "updateRole") {
      if (!role || typeof role !== "string" || !ALLOWED_ROLES.has(role)) {
        return NextResponse.json(
          { success: false, error: `Invalid role. Allowed roles: ${Array.from(ALLOWED_ROLES).join(", ")}` },
          { status: 400 }
        );
      }

      if (targetIsProtectedSuperAdmin && role !== "Super Admin") {
        return NextResponse.json(
          { success: false, error: "Forbidden: Primary Super Admin cannot be demoted." },
          { status: 403 }
        );
      }

      await client.users.updateUserMetadata(userId, {
        publicMetadata: { role },
      });

      return NextResponse.json({ success: true, message: `Updated user role to ${role}` });
    }

    if (action === "toggleStatus") {
      if (status !== "Active" && status !== "Inactive") {
        return NextResponse.json({ success: false, error: 'Status must be "Active" or "Inactive".' }, { status: 400 });
      }

      if (status === "Inactive" && targetIsProtectedSuperAdmin) {
        return NextResponse.json(
          { success: false, error: "Forbidden: Primary Super Admin account cannot be suspended." },
          { status: 403 }
        );
      }

      if (status === "Inactive") {
        await client.users.banUser(userId);
      } else {
        await client.users.unbanUser(userId);
      }

      return NextResponse.json({ success: true, message: `User status changed to ${status}` });
    }

    if (action === "resetPassword" || action === "resetSessions") {
      if (targetIsProtectedSuperAdmin && targetUser.id !== admin?.userId) {
        return NextResponse.json(
          { success: false, error: "Forbidden: Cannot revoke primary Super Admin sessions." },
          { status: 403 }
        );
      }

      const sessionsRes = await client.sessions.getSessionList({ userId });
      const activeSessions = (sessionsRes.data || []).filter((s) => s.status === "active");
      await Promise.all(activeSessions.map((s) => client.sessions.revokeSession(s.id)));

      return NextResponse.json({
        success: true,
        revokedCount: activeSessions.length,
        message:
          activeSessions.length > 0
            ? `Revoked ${activeSessions.length} active session(s); user must re-authenticate or reset password via Clerk.`
            : "No active sessions found; user will authenticate cleanly on next login.",
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    log.error("[API Admin Users POST Error]:", error);
    return NextResponse.json({ success: false, error: "Failed to update user account." }, { status: 500 });
  }
}
