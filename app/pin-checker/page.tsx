"use client";

import { KraPinChecker } from "@/components/kra-pin-checker";
import { useUser, RedirectToSignIn } from "@clerk/nextjs";
import { Loader2, ShieldAlert, ArrowLeft, FileCheck2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PinCheckerPage() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-on-surface-variant">Verifying access credentials...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const userRole = user?.publicMetadata?.role as string;
  const configAdminEmail = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || '').toLowerCase();
  const isAdmin =
    userEmail === configAdminEmail ||
    userRole === "Super Admin" ||
    userRole === "Admin";

  // Enforce Admin Only Access
  if (!isAdmin) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-6 sm:p-8 text-center space-y-5 font-sans">
          <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <h1 className="text-lg font-bold text-on-surface">
              Administrative Access Only
            </h1>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              The live taxpayer PIN verification engine is reserved for authorized administrative sessions. Taxpayers can retrieve KRA PIN certificates directly via the public retrieval portal.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <Link href="/retrieval-portal" className="block w-full">
              <Button className="w-full h-10 rounded-lg bg-primary text-white font-semibold text-xs hover:bg-primary/90 flex items-center justify-center gap-2">
                <FileCheck2 className="w-4 h-4" />
                <span>Open Certificate Retrieval (KES 20)</span>
              </Button>
            </Link>

            <Link href="/dashboard" className="block w-full">
              <Button variant="outline" className="w-full h-10 rounded-lg border-outline-variant font-semibold text-xs text-on-surface hover:bg-surface-container flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Admin View
  return (
    <div className="w-full flex-1 flex flex-col justify-center py-6 px-4">
      <div className="max-w-5xl mx-auto w-full space-y-4">
        <div className="flex items-center justify-between p-3 px-4 rounded-lg bg-surface-container-low border border-outline-variant text-xs">
          <span className="font-semibold text-on-surface">
            Admin Verification Console
          </span>
          <span className="text-[11px] font-mono text-on-surface-variant">Authorized Session</span>
        </div>
        <KraPinChecker />
      </div>
    </div>
  );
}
