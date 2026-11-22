import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  CheckCircle2, 
  FileCheck2, 
  ArrowRight, 
  ShieldCheck, 
  Send,
  User
} from "lucide-react";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import prisma, { createSystemLog } from "@/lib/prisma";
import ProfileWarningPopup from "@/components/profile-warning-popup";
import { CyberSubscriptionCard } from "@/components/cyber-subscription-card";

export default async function TaxpayerDashboard() {
  const user = await currentUser();
  const firstName = user?.firstName || "Client";
  const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.fullName || "Taxpayer";
  const userId = user?.id;
  const email = user?.emailAddresses[0]?.emailAddress;
  const phone = user?.phoneNumbers?.[0]?.phoneNumber || (user?.publicMetadata?.phoneNumber as string) || null;

  // 1. Throttled Login Log tracking (Internal telemetry)
  if (userId) {
    const actor = email || userId;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    try {
      const db = prisma as any;
      if (typeof db.systemLog?.findFirst === "function") {
        const existingLog = await db.systemLog.findFirst({
          where: {
            actor,
            service: "Auth",
            message: "User logged in successfully",
            timestamp: {
              gte: oneHourAgo,
            },
          },
        });

        if (!existingLog) {
          const headersList = await headers();
          const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || '127.0.0.1';
          await createSystemLog({
            level: "info",
            service: "Auth",
            message: "User logged in successfully",
            actor,
            ip,
          });
        }
      }
    } catch (e: any) {
      if (e?.code !== "P2021") console.warn("[Dashboard auth log notice]:", e?.message || e);
    }
  }

  // 2. Profile Completeness evaluation
  const hasName = !!(user?.firstName && user?.lastName) || !!user?.fullName;
  const hasPhone = !!phone;
  const isProfileComplete = hasName && hasPhone;
  let completeness = 0;
  if (hasName) completeness += 50;
  if (hasPhone) completeness += 50;

  // 3. Fetch personal certificate count
  let certificatesCount = 0;
  if (userId) {
    try {
      const actorIds = [userId, email].filter(Boolean) as string[];
      const db = prisma as any;
      const [systemLogCertCount, certDownloadsCount] = await Promise.all([
        typeof db.systemLog?.count === "function"
          ? db.systemLog.count({
              where: {
                actor: { in: actorIds },
                service: "Certificate-Generation",
              },
            })
          : 0,
        typeof db.certificateDownload?.count === "function"
          ? db.certificateDownload.count({
              where: { clerkId: userId },
            })
          : 0,
      ]);
      certificatesCount = Math.max(certDownloadsCount || 0, systemLogCertCount || 0);
    } catch (error: any) {
      if (error?.code !== "P2021") console.warn("[Dashboard stats notice]:", error?.message || error);
    }
  }

  // 4. Admin privilege check (strict non-empty email guard)
  const userEmail = (email || "").trim().toLowerCase();
  const userRole = (user?.publicMetadata?.role as string) || "";
  const configAdminEmail = (process.env.SUPER_ADMIN_EMAIL || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  const isAdmin =
    (Boolean(userEmail) && Boolean(configAdminEmail) && userEmail === configAdminEmail) ||
    userRole === "Super Admin" ||
    userRole === "Admin";

  return (
    <div className="px-4 sm:px-6 lg:px-10 xl:px-12 py-6 sm:py-8 w-full max-w-[1360px] mx-auto space-y-6 font-sans">
      
      {/* Streamlined Welcome Header & Account Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-outline-variant">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Taxpayer Console
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface mt-1">
            Welcome back, {firstName}
          </h1>
          <p className="text-on-surface-variant mt-1 text-xs sm:text-sm">
            Access statutory compliance tools and retrieve verified KRA PIN certificates.
          </p>
        </div>

        {/* Account Verification Status Badge */}
        <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant p-3.5 px-4 rounded-xl">
          <div className={`p-2 rounded-lg shrink-0 ${isProfileComplete ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
            {isProfileComplete ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-on-surface">
              {isProfileComplete ? "Taxpayer Profile Verified" : "Profile Setup Pending"}
            </span>
            <span className="text-[11px] text-on-surface-variant">
              {isProfileComplete ? (
                "All services active"
              ) : (
                <Link href="/dashboard/profile" className="text-primary hover:underline font-semibold">
                  Complete profile ({completeness}%) &rarr;
                </Link>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Action Cards */}
      <div className={`grid grid-cols-1 ${isAdmin ? "md:grid-cols-3" : "md:grid-cols-2"} gap-6`}>
        
        {/* Card 1: KRA Certificate Retrieval Portal */}
        <Card className="bg-surface-container-lowest border-outline-variant hover:border-primary/40 transition-colors rounded-xl flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-primary/10 text-primary border border-primary/20">
                KES 20
              </span>
            </div>
            <CardTitle className="text-base font-bold text-on-surface">
              KRA Certificate Retrieval
            </CardTitle>
            <CardDescription className="text-xs text-on-surface-variant leading-relaxed mt-1">
              Retrieve your KRA PIN compliance certificate by National ID or PIN with verified QR code and direct PDF download.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="pt-3 border-t border-outline-variant flex items-center justify-between text-xs text-on-surface-variant mb-4">
              <span>Retrieval Gateway</span>
              <span className="font-semibold text-on-surface">
                {certificatesCount > 0 ? `${certificatesCount} Generated` : "On-demand PDF · KES 20"}
              </span>
            </div>
            <Link href="/retrieval-portal" className="block w-full">
              <Button className="w-full h-10 rounded-lg bg-primary text-white font-semibold text-xs hover:bg-primary/90 flex items-center justify-center gap-2">
                <span>Open Retrieval Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Card 2: Tax Calculator & Filing Guide */}
        <Card className="bg-surface-container-lowest border-outline-variant hover:border-primary/40 transition-colors rounded-xl flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Send className="h-5 w-5" />
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-surface-container text-on-surface-variant border border-outline-variant">
                Free Utility
              </span>
            </div>
            <CardTitle className="text-base font-bold text-on-surface">
              P9 Tax Calculator &amp; Filing Guide
            </CardTitle>
            <CardDescription className="text-xs text-on-surface-variant leading-relaxed mt-1">
              Compute annual Kenyan PAYE, NSSF, and SHIF figures from your P9 form before filing on the official KRA iTax portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="pt-3 border-t border-outline-variant flex items-center justify-between text-xs text-on-surface-variant mb-4">
              <span>Filing Module</span>
              <span className="font-semibold text-on-surface">Calculator Ready</span>
            </div>
            <Link href="/retrieval-portal?view=filing" className="block w-full">
              <Button variant="outline" className="w-full h-10 rounded-lg border-outline-variant font-semibold text-xs hover:bg-surface-container flex items-center justify-center gap-2">
                <span>Open Tax Calculator</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Card 3: Live PIN & ID Checker (Admin Only) */}
        {isAdmin && (
          <Card className="bg-surface-container-lowest border-outline-variant hover:border-primary/40 transition-colors rounded-xl flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-surface-container text-on-surface border border-outline-variant">
                  Admin Only
                </span>
              </div>
              <CardTitle className="text-base font-bold text-on-surface">
                Live PIN &amp; ID Checker
              </CardTitle>
              <CardDescription className="text-xs text-on-surface-variant leading-relaxed mt-1">
                Internal administration engine to verify taxpayer registry status, confirm active obligations, and check assigned KRA Tax Station.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="pt-3 border-t border-outline-variant flex items-center justify-between text-xs text-on-surface-variant mb-4">
                <span>Taxpayer Registry</span>
                <span className="font-semibold text-on-surface">Admin Audit Access</span>
              </div>
              <Link href="/pin-checker" className="block w-full">
                <Button variant="outline" className="w-full h-10 rounded-lg border-outline-variant font-semibold text-xs hover:bg-surface-container flex items-center justify-center gap-2">
                  <span>Open Admin PIN Checker</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Account Details & Compliance Profile Card */}
      <Card className="bg-surface-container-lowest border-outline-variant shadow-soft rounded-2xl">
        <CardHeader className="pb-4 border-b border-outline-variant/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <span>Taxpayer Profile & Compliance Record</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Your linked taxpayer account information and document records
              </CardDescription>
            </div>
            <Link href="/dashboard/profile">
              <Button variant="outline" size="sm" className="h-8.5 rounded-xl text-xs font-bold border-outline-variant hover:bg-surface-container">
                Manage Profile & Security &rarr;
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Account Name</span>
              <p className="text-sm font-bold text-on-surface truncate">{fullName}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Registered Email</span>
              <p className="text-sm font-medium text-on-surface truncate">{email || "Not provided"}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Phone Number</span>
              <p className="text-sm font-medium text-on-surface truncate">
                {phone ? (
                  phone
                ) : (
                  <Link href="/dashboard/profile" className="text-amber-600 dark:text-amber-400 hover:underline text-xs flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" /> Add phone number
                  </Link>
                )}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Certificates Issued</span>
              <p className="text-sm font-bold text-on-surface">
                {certificatesCount > 0 ? (
                  <span className="text-green-600 dark:text-green-400">{certificatesCount} on file</span>
                ) : (
                  <span className="text-on-surface-variant text-xs font-normal">None generated yet</span>
                )}
              </p>
            </div>
          </div>

          {/* Profile completion progress */}
          {!isProfileComplete && (
            <div className="mt-6 pt-5 border-t border-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-500/5 p-4 rounded-xl border border-amber-500/20">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-on-surface">Complete your taxpayer profile to unlock all statutory downloads</p>
                <p className="text-[11px] text-on-surface-variant">Full legal name and verified phone number are required for compliance certificates.</p>
              </div>
              <Link href="/dashboard/profile">
                <Button size="sm" className="h-8 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0">
                  Complete Setup ({completeness}%)
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cyber Cafe Monthly Subscription & Invoices */}
      <CyberSubscriptionCard />

      {/* Floating warning popup if profile is incomplete */}
      <ProfileWarningPopup isProfileComplete={isProfileComplete} />
    </div>
  );
}
