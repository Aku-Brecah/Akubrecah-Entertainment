"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
  initials: string;
}

const ROLES = [
  "All Roles",
  "Super Admin",
  "Admin",
  "Portal Auditor",
  "Cybercafe Partner",
  "Registered Taxpayer"
];

function Modal({
  title,
  onClose,
  children,
  maxWidth = "max-w-md",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className={`w-full ${maxWidth} bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant overflow-hidden max-h-[92vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low shrink-0">
          <h2 className="font-bold text-on-surface text-lg">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [modal, setModal] = useState<null | "edit" | "resetPw" | "migrate">(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Migration states
  const [migrationTab, setMigrationTab] = useState<"api" | "csv">("api");
  const [devSecretKey, setDevSecretKey] = useState("");
  const [showDevKey, setShowDevKey] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [defaultPassword, setDefaultPassword] = useState("");
  const [migrationResults, setMigrationResults] = useState<{
    total: number;
    success: string[];
    skipped: string[];
    failed: { email: string; error: string }[];
  } | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  // Form edit states
  const [formRole, setFormRole] = useState("Registered Taxpayer");
  const [confirmDeactivate, setConfirmDeactivate] = useState<User | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = async (targetPage = page) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/users?page=${targetPage}&limit=50`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
        setPage(data.page || targetPage);
        setTotalPages(data.totalPages || 1);
        setTotalUsersCount(data.total ?? (data.users?.length || 0));
      } else {
        showToast("Error retrieving user accounts from Clerk: " + (data.error || "Access Denied"));
      }
    } catch (e) {
      console.error(e);
      showToast("Network error fetching users list from Clerk.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, []);

  const openEdit = (u: User) => {
    setSelectedUser(u);
    setFormRole(u.role);
    setModal("edit");
  };

  const openResetPw = (u: User) => {
    setSelectedUser(u);
    setModal("resetPw");
  };

  const saveEdit = async () => {
    if (!selectedUser) return;

    // Protect admin from stripping own role (never match empty strings)
    const configAdminEmail = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
    const targetEmail = (selectedUser.email || "").trim().toLowerCase();
    if (Boolean(configAdminEmail) && targetEmail === configAdminEmail && formRole !== "Super Admin") {
      showToast("Cannot downgrade Super Admin role configuration.");
      setModal(null);
      return;
    }

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateRole", userId: selectedUser.id, role: formRole }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Updated user role to ${formRole} for ${selectedUser.name}`);
        fetchUsers(page);
      } else {
        showToast(data.error || "Failed to update role on Clerk.");
      }
    } catch (e) {
      showToast("Network error updating role on Clerk.");
    }
    setModal(null);
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    const configAdminEmail = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
    const targetEmail = (targetUser.email || "").trim().toLowerCase();
    if (Boolean(configAdminEmail) && targetEmail === configAdminEmail) {
      showToast("Cannot ban or deactivate the active Super Admin account.");
      setConfirmDeactivate(null);
      return;
    }

    const targetStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleStatus", userId, status: targetStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`User ${targetUser.name} ${targetStatus === "Active" ? "reactivated" : "deactivated"} successfully.`);
        fetchUsers();
      } else {
        showToast(data.error || "Failed to change user status on Clerk.");
      }
    } catch (e) {
      showToast("Network error modifying user status.");
    }
    setConfirmDeactivate(null);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text || "");
    };
    reader.readAsText(file);
  };

  const handleStartMigration = async () => {
    setIsMigrating(true);
    setMigrationError(null);
    setMigrationResults(null);

    try {
      const payload: any = { defaultPassword };

      if (migrationTab === "api") {
        if (!devSecretKey.trim()) {
          setMigrationError("Please enter your Clerk Development Secret Key (sk_test_...).");
          setIsMigrating(false);
          return;
        }
        payload.devSecretKey = devSecretKey.trim();
      } else {
        if (!csvContent.trim()) {
          setMigrationError("Please upload or paste your Clerk user export CSV.");
          setIsMigrating(false);
          return;
        }
        payload.csvContent = csvContent.trim();
      }

      const res = await fetch("/api/admin/migrate-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.results) {
        setMigrationResults(data.results);
        showToast(`Migration finished! Imported: ${data.results.success.length}, Skipped: ${data.results.skipped.length}`);
        fetchUsers();
      } else {
        setMigrationError(data.error || "Failed to execute user migration.");
      }
    } catch (e: any) {
      setMigrationError(e.message || "Network error executing user migration.");
    } finally {
      setIsMigrating(false);
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.id.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "All Roles" || u.role === roleFilter;
    const matchStatus = statusFilter === "All Status" || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const inputCls = "w-full rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-on-surface text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

  return (
    <div className="w-full max-w-[1280px] mx-auto space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">User Management</h1>
          <p className="text-on-surface-variant text-sm mt-1">View and manage portal user roles, statuses, and access permissions from Clerk.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setModal("migrate");
              setMigrationResults(null);
              setMigrationError(null);
            }}
            className="border border-outline-variant bg-surface hover:bg-surface-container text-on-surface text-sm font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[20px]">sync</span>
            Migrate Old Users
          </button>
          <a
            href="https://dashboard.clerk.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[20px]">open_in_new</span>
            Manage in Clerk
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-soft">
        <div className="relative w-full md:w-96 text-on-surface-variant">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px]">search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-on-surface"
            placeholder="Search by name, ID, or email..."
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="w-full md:w-48 appearance-none bg-surface-container-low border border-outline-variant rounded-xl pl-4 pr-8 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[18px] pointer-events-none text-on-surface-variant">expand_more</span>
          </div>
          <div className="relative flex-1 md:flex-none">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full md:w-44 appearance-none bg-surface-container-low border border-outline-variant rounded-xl pl-4 pr-8 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[18px] pointer-events-none text-on-surface-variant">expand_more</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                {["User ID", "Name / Email", "Role", "Status", "Last Active Sign In", "Actions"].map((h, i) => (
                  <th key={h} className={`text-xs font-bold text-on-surface-variant uppercase py-3.5 px-6 tracking-wide ${i === 5 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 text-sm text-on-surface">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <span className="text-xs font-bold">Querying Clerk User Database...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-on-surface-variant font-medium">No users match your filters.</td>
                </tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.id} className={`hover:bg-surface-container-low/40 transition-colors group ${u.status === "Inactive" ? "opacity-60" : ""}`}>
                    <td className="py-4 px-6 font-mono text-[11px] text-on-surface-variant">{u.id}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-primary font-bold text-xs shrink-0">{u.initials}</div>
                        <div>
                          <div className="font-semibold text-on-surface">{u.name}</div>
                          <div className="text-xs text-on-surface-variant">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-medium px-2.5 py-0.5 rounded-full text-xs bg-surface-container text-on-surface-variant">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {u.status === "Active" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-highest text-on-surface-variant text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-outline" />
                          Banned
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-on-surface-variant font-medium">{u.lastLogin}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button type="button" onClick={() => openEdit(u)} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-lg transition-colors" title="Change Role" aria-label={`Change role for ${u.name}`}>
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button type="button" onClick={() => openResetPw(u)} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-lg transition-colors" title="Revoke Active Sessions" aria-label={`Revoke active sessions for ${u.name}`}>
                          <span className="material-symbols-outlined text-[18px]">key</span>
                        </button>
                        {u.status === "Active" ? (
                          <button type="button" onClick={() => setConfirmDeactivate(u)} className="p-1.5 text-on-surface-variant hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors" title="Deactivate User" aria-label={`Deactivate ${u.name}`}>
                            <span className="material-symbols-outlined text-[18px]">block</span>
                          </button>
                        ) : (
                          <button type="button" onClick={() => handleToggleStatus(u.id, u.status)} className="p-1.5 text-on-surface-variant hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950 rounded-lg transition-colors" title="Reactivate User" aria-label={`Reactivate ${u.name}`}>
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-surface-container-lowest border-t border-outline-variant px-6 py-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-on-surface-variant font-medium">
            Showing {filtered.length} of {totalUsersCount} registered Clerk users (page {page} of {totalPages})
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fetchUsers(page - 1)}
              disabled={page <= 1 || isLoading}
              aria-label="Previous page"
              className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <span className="min-w-8 h-8 px-2 rounded-lg bg-primary text-white text-xs font-bold flex items-center justify-center">
              {page}
            </span>
            <button
              type="button"
              onClick={() => fetchUsers(page + 1)}
              disabled={page >= totalPages || isLoading}
              aria-label="Next page"
              className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODALS ─── */}

      {/* Edit User Role */}
      {modal === "edit" && selectedUser && (
        <Modal title={`Modify Role — ${selectedUser.name}`} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] text-on-surface-variant/80 uppercase font-extrabold tracking-wider">User Account</span>
              <p className="font-semibold text-on-surface">{selectedUser.name} ({selectedUser.email})</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-primary uppercase tracking-wider">System Role Tier</label>
              <select value={formRole} onChange={e => setFormRole(e.target.value)} className={inputCls}>
                {ROLES.filter(r => r !== "All Roles").map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-outline-variant rounded-xl text-on-surface font-bold hover:bg-surface-container transition-colors text-sm">Cancel</button>
              <button onClick={saveEdit} className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors text-sm">Save Changes</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset Password */}
      {modal === "resetPw" && selectedUser && (
        <Modal title={`Reset Session Access — ${selectedUser.name}`} onClose={() => setModal(null)}>
          <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">
            Revoke all active Clerk sessions for <strong className="text-on-surface">{selectedUser.email}</strong> so they must re-authenticate and verify credentials on their next sign-in.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-outline-variant rounded-xl text-on-surface font-bold hover:bg-surface-container text-sm">Cancel</button>
            <button
              onClick={async () => {
                const target = selectedUser;
                setModal(null);
                try {
                  const res = await fetch("/api/admin/users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "resetPassword", userId: target.id }),
                  });
                  const data = await res.json();
                  showToast(data.message || data.error || `Sessions updated for ${target.email}`);
                } catch {
                  showToast("Network error resetting user sessions.");
                }
              }}
              className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 text-sm cursor-pointer"
            >
              Revoke Active Sessions
            </button>
          </div>
        </Modal>
      )}

      {/* Confirm Deactivate */}
      {confirmDeactivate && (
        <Modal title="Deactivate User Account?" onClose={() => setConfirmDeactivate(null)}>
          <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">
            Are you sure you want to deactivate and ban <strong className="text-on-surface">{confirmDeactivate.name}</strong>? They will be locked out of all portal dashboard sections immediately.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDeactivate(null)} className="flex-1 py-2.5 border border-outline-variant rounded-xl text-on-surface font-bold hover:bg-surface-container text-sm">Cancel</button>
            <button onClick={() => handleToggleStatus(confirmDeactivate.id, confirmDeactivate.status)} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 text-sm">Deactivate Account</button>
          </div>
        </Modal>
      )}

      {/* User Migration Modal (Dev to Prod) */}
      {modal === "migrate" && (
        <Modal title="Migrate Users from Development to Production" onClose={() => setModal(null)} maxWidth="max-w-2xl">
          <div className="space-y-5">
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Import registered users from your Clerk Development instance directly into the Clerk Production instance. Existing accounts with matching emails will be automatically skipped to prevent duplicates.
            </p>

            {/* Mode Tabs */}
            <div className="flex border-b border-outline-variant">
              <button
                type="button"
                onClick={() => setMigrationTab("api")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                  migrationTab === "api"
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                Direct Clerk Dev API (Recommended)
              </button>
              <button
                type="button"
                onClick={() => setMigrationTab("csv")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                  migrationTab === "csv"
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">description</span>
                Clerk CSV Export Import
              </button>
            </div>

            {/* Tab 1: API Direct Sync */}
            {migrationTab === "api" && (
              <div className="space-y-4 pt-1">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">info</span>
                  <div className="space-y-1">
                    <p className="font-semibold">Zero-file direct transfer</p>
                    <p className="opacity-90">
                      Enter your Clerk Development Secret Key (<code className="font-mono bg-blue-500/20 px-1 py-0.5 rounded">sk_test_...</code>). This connects directly to your dev instance and replicates all accounts into production.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    Clerk Development Secret Key
                  </label>
                  <div className="relative">
                    <input
                      type={showDevKey ? "text" : "password"}
                      value={devSecretKey}
                      onChange={(e) => setDevSecretKey(e.target.value)}
                      placeholder="sk_test_..."
                      className="w-full font-mono text-xs rounded-xl border border-outline-variant bg-surface px-4 py-2.5 pr-10 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDevKey(!showDevKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showDevKey ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: CSV Sync */}
            {migrationTab === "csv" && (
              <div className="space-y-4 pt-1">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">key</span>
                  <div className="space-y-1">
                    <p className="font-semibold">Password Hashes Supported</p>
                    <p className="opacity-90">
                      If you export your users from Clerk Dashboard (Users → Export), the CSV contains hashed passwords (<code className="font-mono">password_digest</code>) so users can sign in immediately with existing passwords!
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider block">
                    Upload Clerk CSV Export
                  </label>
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-outline-variant rounded-2xl cursor-pointer hover:border-primary transition-all bg-surface-container-low">
                    <span className="material-symbols-outlined text-3xl text-primary mb-1">upload_file</span>
                    <span className="text-xs font-bold text-on-surface">
                      {csvFileName ? `Selected: ${csvFileName}` : "Click to browse .csv file from your computer"}
                    </span>
                    <span className="text-[11px] text-on-surface-variant mt-0.5">Standard Clerk user export format</span>
                    <input type="file" accept=".csv" onChange={handleCsvFileUpload} className="hidden" />
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-on-surface-variant">
                    Or paste raw CSV text:
                  </label>
                  <textarea
                    rows={4}
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                    placeholder="id,first_name,last_name,email_address,role..."
                    className="w-full font-mono text-[11px] rounded-xl border border-outline-variant bg-surface p-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {/* Default Password setting */}
            <div className="space-y-1.5 pt-1">
              <label htmlFor="migration-default-password" className="text-xs font-semibold text-on-surface-variant">
                Temporary Password (required only for accounts without password digests, min 12 chars):
              </label>
              <input
                id="migration-default-password"
                type="password"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                placeholder="Enter a strong temporary password..."
                className="w-full font-mono text-xs rounded-xl border border-outline-variant bg-surface px-4 py-2 text-on-surface"
              />
            </div>

            {/* Error Message */}
            {migrationError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <span className="font-medium break-all">{migrationError}</span>
              </div>
            )}

            {/* Migration Results Report */}
            {migrationResults && (
              <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant space-y-3">
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                  <span className="text-xs font-bold text-on-surface uppercase tracking-wider">Migration Summary</span>
                  <span className="text-xs font-mono font-semibold text-on-surface-variant">
                    Total: {migrationResults.total}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 block">
                      {migrationResults.success.length}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                      Imported
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <span className="text-lg font-black text-amber-600 dark:text-amber-400 block">
                      {migrationResults.skipped.length}
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">
                      Skipped (Existing)
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                    <span className="text-lg font-black text-red-600 dark:text-red-400 block">
                      {migrationResults.failed.length}
                    </span>
                    <span className="text-[10px] font-bold text-red-700 dark:text-red-300 uppercase">
                      Failed
                    </span>
                  </div>
                </div>

                {migrationResults.failed.length > 0 && (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pt-2">
                    <p className="text-[11px] font-bold text-red-600">Failed records:</p>
                    {migrationResults.failed.map((f, i) => (
                      <div key={i} className="text-[10px] text-red-500 font-mono bg-red-500/5 p-1.5 rounded">
                        <strong>{f.email}:</strong> {f.error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-3 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-outline-variant rounded-xl text-on-surface font-bold hover:bg-surface-container text-xs transition-colors"
              >
                {migrationResults ? "Close" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleStartMigration}
                disabled={isMigrating}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isMigrating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Migration...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">cloud_sync</span>
                    <span>Start Migration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg px-5 py-3">
          <span className="material-symbols-outlined text-primary text-[20px]">info</span>
          <span className="text-sm font-medium text-on-surface">{toast}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
