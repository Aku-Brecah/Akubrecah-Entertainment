"use client";

import { useState, useEffect } from "react";

const INITIAL_ROLES = [
  { id: "super_admin", name: "Super Admin", desc: "Full administrative, user-management, billing, and security controls." },
  { id: "admin", name: "Admin", desc: "Operational access to CMS content, inquiries, telemetry, and retrieval diagnostics." },
  { id: "auditor", name: "Portal Auditor", desc: "Read-only access to audit logs and system performance." },
  { id: "operator", name: "Cybercafe Partner", desc: "High-volume certificate printing and client facilitation under a Cyber Cafe plan." },
  { id: "taxpayer", name: "Registered Taxpayer", desc: "Self-service PIN retrieval, payments, and personal account controls." },
];

const PERMISSIONS = [
  { key: "dashboard", label: "View Dashboard", category: "General Access" },
  { key: "file_returns", label: "Tax Calculator & Filing Tools", category: "Core Features" },
  { key: "cert_retrieval", label: "Download Certificates", category: "Core Features" },
  { key: "manage_users", label: "Manage Portal Users", category: "Administration" },
  { key: "system_settings", label: "System Config Settings", category: "Administration" },
  { key: "security_logs", label: "View Security Logs", category: "Security" },
];

const DEFAULT_MATRIX: Record<string, Record<string, boolean>> = {
  super_admin: { dashboard: true, file_returns: true, cert_retrieval: true, manage_users: true, system_settings: true, security_logs: true },
  admin: { dashboard: true, file_returns: true, cert_retrieval: true, manage_users: false, system_settings: true, security_logs: true },
  auditor: { dashboard: true, file_returns: false, cert_retrieval: false, manage_users: false, system_settings: false, security_logs: true },
  operator: { dashboard: true, file_returns: true, cert_retrieval: true, manage_users: false, system_settings: false, security_logs: false },
  taxpayer: { dashboard: true, file_returns: true, cert_retrieval: true, manage_users: false, system_settings: false, security_logs: false },
};

export default function RoleAccessPage() {
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>(DEFAULT_MATRIX);
  const [selectedRole, setSelectedRole] = useState("super_admin");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load saved RBAC matrix");
        }
        if (active && data.rbac_matrix && typeof data.rbac_matrix === "object") {
          setMatrix((prev) => {
            const merged: Record<string, Record<string, boolean>> = { ...prev };
            for (const role of INITIAL_ROLES) {
              const savedRole = data.rbac_matrix[role.id];
              if (savedRole && typeof savedRole === "object") {
                merged[role.id] = { ...prev[role.id], ...savedRole };
              }
            }
            return merged;
          });
        }
      } catch (err: any) {
        if (active) setLoadError(err?.message || "Failed to load RBAC matrix from server.");
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleToggle = (roleId: string, permKey: string) => {
    // Protect Super Admin from stripping core settings or user management
    if (roleId === "super_admin" && (permKey === "system_settings" || permKey === "manage_users")) {
      showToast("Cannot revoke core System Settings or User Management permissions from Super Admin.");
      return;
    }

    const nextGranted = !matrix[roleId]?.[permKey];
    setMatrix((prev) => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [permKey]: nextGranted,
      },
    }));

    const roleName = INITIAL_ROLES.find((r) => r.id === roleId)?.name || roleId;
    const permLabel = PERMISSIONS.find((p) => p.key === permKey)?.label || permKey;
    showToast(`${nextGranted ? "Granted" : "Revoked"} "${permLabel}" for ${roleName} (click Save to persist)`);
  };

  const saveMatrix = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rbac_matrix: matrix }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to persist RBAC matrix");
      }
      showToast("Access matrix saved to database.");
    } catch (err: any) {
      showToast("Save failed: " + (err?.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  const resetMatrix = () => {
    setMatrix(DEFAULT_MATRIX);
    showToast("Permissions matrix reset to defaults (click Save to persist).");
  };

  return (
    <div className="w-full max-w-[1280px] mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Role & Permissions</h1>
          <p className="text-on-surface-variant text-sm mt-1">Configure and persist role capabilities for portal administrators and users.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={resetMatrix}
            disabled={isSaving}
            className="px-4 py-2 bg-surface-container border border-outline-variant hover:bg-surface-container-high text-sm font-bold text-on-surface rounded-xl transition-all disabled:opacity-50"
          >
            Reset Matrix
          </button>
          <button
            type="button"
            onClick={saveMatrix}
            disabled={isSaving || isLoading}
            className="px-5 py-2 bg-primary text-white hover:bg-primary/90 text-sm font-bold rounded-xl shadow-soft transition-all disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Access Matrix"}
          </button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-800 dark:text-amber-300">
          {loadError} Showing default matrix until saved.
        </div>
      )}

      {/* Access Matrix Dashboard */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Permission Grid Matrix Table */}
        <div className="flex-1 min-w-0 w-full bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant bg-surface flex items-center justify-between">
            <h3 className="font-bold text-on-surface">System Permissions Matrix</h3>
            {isLoading && <span className="text-xs text-on-surface-variant">Loading saved policy...</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="text-xs font-bold text-on-surface-variant uppercase py-3.5 px-5">Permission Module</th>
                  {INITIAL_ROLES.map(role => (
                    <th key={role.id} className="text-xs font-bold text-on-surface-variant uppercase py-3.5 px-5 text-center">{role.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 text-sm">
                {PERMISSIONS.map(perm => (
                  <tr key={perm.key} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-medium text-on-surface">{perm.label}</div>
                      <span className="text-[10px] text-on-surface-variant/80 uppercase font-bold tracking-wider">{perm.category}</span>
                    </td>
                    {INITIAL_ROLES.map(role => {
                      const isChecked = matrix[role.id]?.[perm.key] || false;
                      return (
                        <td key={role.id} className="py-4 px-5 text-center">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isChecked}
                            aria-label={`${perm.label} for ${role.name}`}
                            onClick={() => handleToggle(role.id, perm.key)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/40 ${isChecked ? "bg-primary" : "bg-surface-container-high"}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isChecked ? "translate-x-5" : "translate-x-0"}`}
                            />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Role Inspector Panel */}
        <div className="w-full xl:w-80 shrink-0 space-y-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5">
            <h3 className="font-bold text-on-surface mb-4">Role Descriptions</h3>
            <div className="space-y-4">
              {INITIAL_ROLES.map(role => (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedRole === role.id ? "bg-primary/5 border-primary" : "bg-surface-container-low border-transparent hover:border-outline-variant"}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`material-symbols-outlined text-[18px] ${selectedRole === role.id ? "text-primary" : "text-on-surface-variant"}`}>
                      {role.id === "super_admin" || role.id === "admin" ? "shield" : role.id === "auditor" ? "visibility" : role.id === "operator" ? "storefront" : "person"}
                    </span>
                    <h4 className="font-bold text-on-surface text-sm">{role.name}</h4>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{role.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5">
            <h4 className="text-xs font-extrabold text-primary tracking-wider uppercase mb-3">Policy Enforcement Note</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              This matrix is persisted to the portal settings store (<code className="font-mono text-[11px]">rbac_matrix</code>). Core privileged API routes (user management, Daraja diagnostics, user migration, and Nil-return actions) strictly enforce server-side <strong className="text-on-surface">Super Admin</strong> verification via Clerk metadata and configured administrator identity.
            </p>
          </div>
        </div>
      </div>

      {/* Custom Alert Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg px-5 py-3 animate-slide-up">
          <span className="material-symbols-outlined text-primary text-[20px]">info</span>
          <span className="text-sm font-medium text-on-surface">{toast}</span>
        </div>
      )}
    </div>
  );
}
