"use client";

import { useState, useEffect, useRef } from "react";
import {
  BadgeCheck,
  Search,
  RefreshCw,
  FileText,
  ShieldCheck,
  CreditCard,
  Database,
  FileSpreadsheet
} from "lucide-react";
import { toast } from "react-hot-toast";

interface CertificateDownloadRecord {
  id: string;
  userId: string;
  clerkId: string;
  pin: string;
  downloadType: string;
  amountCharged: number;
  currency: string;
  mpesaReceipt: string | null;
  checkoutId: string | null;
  createdAt: string;
  users?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: string;
  service: string;
  message: string;
  actor: string;
  ip: string;
  details: any;
}

export default function KraRetrievalsAdminPage() {
  const [data, setData] = useState<{
    stats: {
      totalTaxpayers: number;
      totalDownloads: number;
      totalRevenueKes: number;
      recentDownloadsCount: number;
      recentTaxpayersCount: number;
    };
    downloads: CertificateDownloadRecord[];
    logs: SystemLogEntry[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeTab, setActiveTab] = useState<"downloads" | "logs" | "live-test">("downloads");

  // Live Gateway Query Test State
  const [testIdentifier, setTestIdentifier] = useState("");
  const [testMode, setTestMode] = useState<"id" | "pin">("id");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testHttpStatus, setTestHttpStatus] = useState<number | null>(null);

  const fetchData = async (query = searchQuery) => {
    setLoading(true);
    try {
      const url = `/api/admin/kra-retrievals${query ? `?q=${encodeURIComponent(query)}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error(json.error || "Failed to load KRA retrieval data");
      }
    } catch (e: any) {
      toast.error("Network error fetching admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const handleLiveQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testIdentifier.trim()) {
      toast.error("Please enter an ID Number or KRA PIN");
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    setTestHttpStatus(null);

    try {
      const endpoint = testMode === "pin" ? "/api/kra/live-verify/pin" : "/api/kra/live-verify/id";
      const body = testMode === "pin" ? { pin: testIdentifier.trim().toUpperCase() } : { idNumber: testIdentifier.trim() };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      setTestHttpStatus(res.status);
      const json = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
      setTestResult(json);
      if (res.ok && json.success) {
        toast.success("Live taxpayer record resolved!");
        fetchData(); // refresh cache
      } else {
        toast.error(json.error || `Gateway returned HTTP ${res.status}`);
      }
    } catch (e: any) {
      toast.error("Gateway test failed: " + e.message);
    } finally {
      setTestLoading(false);
    }
  };

  const exportCsv = () => {
    if (!data?.downloads || data.downloads.length === 0) {
      toast.error("No order audit records to export");
      return;
    }

    const csvEscape = (val: unknown) => {
      const raw = String(val ?? "");
      const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
      return `"${safe.replace(/"/g, '""')}"`;
    };

    const headers = [
      "Order ID",
      "KRA PIN",
      "Amount (KES)",
      "M-Pesa Receipt / Checkout",
      "Gateway",
      "Customer Email",
      "Storage Policy",
      "Timestamp"
    ];

    const rows = data.downloads.map((d) => [
      d.id,
      d.pin,
      Number(d.amountCharged ?? 0).toFixed(2),
      d.mpesaReceipt || d.checkoutId || "Direct/Admin",
      d.downloadType,
      d.users?.email || d.clerkId || "Guest",
      "Ephemeral - Zero PDF Storage",
      new Date(d.createdAt).toISOString(),
    ]);

    const csvBody = [
      headers.map(csvEscape).join(","),
      ...rows.map((r) => r.map(csvEscape).join(",")),
    ].join("\n");

    const blob = new Blob([csvBody], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `KRA_Order_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
      window.URL.revokeObjectURL(url);
    }, 1000);
    toast.success("CSV export downloaded successfully!");
  };

  return (
    <div className="w-full max-w-none space-y-6 px-2 sm:px-4 py-4 sm:py-6">

      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black text-on-surface tracking-tight">KRA Retrieval Intelligence</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/25 px-2.5 py-0.5 rounded-full">
                  Admin Command Center
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
                  Zero PDF Storage Policy
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Real-time M-Pesa revenue auditing and verification telemetry. Strict Zero-PDF Storage Policy: certificates are streamed ephemerally to the user and are never saved on the site.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="h-10 px-4 rounded-xl bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-variant/40 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportCsv}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold uppercase tracking-wider mb-2">
            <span>PDF Storage</span>
            <Database className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-on-surface">
            0 Stored
          </div>
          <p className="text-[10px] text-on-surface-variant mt-1">Ephemeral stream only — PDFs are never stored on site</p>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold uppercase tracking-wider mb-2">
            <span>Verified Orders</span>
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {data?.stats?.totalDownloads ?? "..."}
          </div>
          <p className="text-[10px] text-on-surface-variant mt-1">Paid KRA PIN orders (Web + WhatsApp)</p>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold uppercase tracking-wider mb-2">
            <span>Total Revenue</span>
            <CreditCard className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-primary">
            KES {data?.stats?.totalRevenueKes?.toLocaleString() ?? "0"}
          </div>
          <p className="text-[10px] text-on-surface-variant mt-1">KES 20 per order via Safaricom Daraja M-Pesa (Till 9348469)</p>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-bold uppercase tracking-wider mb-2">
            <span>Audit Events</span>
            <BadgeCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-on-surface">
            {data?.logs?.length ?? "0"}
          </div>
          <p className="text-[10px] text-on-surface-variant mt-1">Recent gateway verification logs</p>
        </div>
      </div>

      {/* Search & Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-container rounded-xl">
          <button
            onClick={() => setActiveTab("downloads")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "downloads"
                ? "bg-surface text-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
              }`}
          >
            Payment &amp; Order Audit ({data?.downloads?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "logs"
                ? "bg-surface text-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
              }`}
          >
            Gateway Logs ({data?.logs?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("live-test")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "live-test"
                ? "bg-primary text-white shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
              }`}
          >
            Live Gateway Tester
          </button>
        </div>

        {/* Global Live Filter */}
        <div className="relative min-w-0 sm:min-w-[260px]">
          <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
              searchDebounceRef.current = setTimeout(() => {
                fetchData(val);
              }, 300);
            }}
            placeholder="Search PIN, receipt, checkout ID..."
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-container text-xs text-on-surface placeholder:text-muted-foreground border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
          />
        </div>
      </div>

      {/* Tab 1: Certificate Orders & Payments Audit */}
      {activeTab === "downloads" && (
        <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-on-surface">Certificate Order Audit &amp; Safaricom Daraja M-Pesa Logs</h2>
              <p className="text-xs text-on-surface-variant">
                Every settled KES 20 payment streams an in-memory PDF directly to the taxpayer. No PDFs or taxpayer documents are stored on the server.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider shrink-0">
              No PDFs or Taxpayer Files Stored on Server
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container text-on-surface-variant font-bold uppercase text-[10px] tracking-wider border-b border-outline-variant">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">KRA PIN</th>
                  <th className="py-3 px-4">Storage Policy</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">M-Pesa Receipt / Checkout</th>
                  <th className="py-3 px-4">Gateway</th>
                  <th className="py-3 px-4">Customer Email</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {!data?.downloads || data.downloads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-on-surface-variant">
                      No certificate orders recorded yet.
                    </td>
                  </tr>
                ) : (
                  data.downloads.map((d) => {
                    const isDaraja =
                      d.downloadType === "mpesa" ||
                      d.downloadType === "pay_per_download" ||
                      Boolean(d.checkoutId?.startsWith("ws_CO_"));
                    return (
                      <tr key={d.id} className="hover:bg-surface-variant/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-on-surface-variant text-[11px]">
                          {d.id.slice(0, 12)}...
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-primary">
                          {d.pin}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-container border border-outline-variant text-[10px] font-bold text-on-surface-variant">
                            Ephemeral · Zero PDF Storage
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400">
                          KES {Number(d.amountCharged ?? 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-on-surface">
                          {d.mpesaReceipt || d.checkoutId || <span className="text-on-surface-variant italic">Direct/Admin</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${d.downloadType === "admin"
                              ? "bg-primary/10 text-primary"
                              : isDaraja
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-surface-container text-on-surface-variant"
                            }`}>
                            {d.downloadType === "admin"
                              ? "Admin Instant"
                              : isDaraja
                                ? "Safaricom Daraja M-Pesa"
                                : d.downloadType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-on-surface">
                          {d.users?.email || d.clerkId || "Guest"}
                        </td>
                        <td className="py-3 px-4 text-on-surface-variant whitespace-nowrap">
                          {new Date(d.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Gateway Audit Logs */}
      {activeTab === "logs" && (
        <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-outline-variant">
            <h2 className="text-base font-bold text-on-surface">KRA Service Security & Access Logs</h2>
            <p className="text-xs text-on-surface-variant">
              Immutable system audit trail tracking incoming queries, IPs, actors, and response signatures.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-surface-container text-on-surface-variant font-bold uppercase text-[10px] tracking-wider border-b border-outline-variant">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Message</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Client IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {!data?.logs || data.logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-on-surface-variant">
                      No system logs found.
                    </td>
                  </tr>
                ) : (
                  data.logs.map((l) => (
                    <tr key={l.id} className="hover:bg-surface-variant/20 transition-colors">
                      <td className="py-2.5 px-4 text-on-surface-variant whitespace-nowrap text-[11px]">
                        {new Date(l.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${l.level === "error" ? "bg-red-500/10 text-red-600" :
                            l.level === "warning" ? "bg-amber-500/10 text-amber-600" :
                              "bg-emerald-500/10 text-emerald-600"
                          }`}>
                          {l.level}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-primary">{l.service}</td>
                      <td className="py-2.5 px-4 text-on-surface">{l.message}</td>
                      <td className="py-2.5 px-4 text-on-surface-variant">{l.actor}</td>
                      <td className="py-2.5 px-4 text-on-surface-variant">{l.ip}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Live Gateway Tester */}
      {activeTab === "live-test" && (
        <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-black text-on-surface">Live Government Gateway Diagnostic Tool</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Query the official Kenya Revenue Authority statutory verification node in real-time as a Super Admin.
            </p>
          </div>

          <form onSubmit={handleLiveQuery} className="max-w-xl space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="testMode"
                  checked={testMode === "id"}
                  onChange={() => setTestMode("id")}
                  className="accent-primary"
                />
                <span>National ID Number</span>
              </label>
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="testMode"
                  checked={testMode === "pin"}
                  onChange={() => setTestMode("pin")}
                  className="accent-primary"
                />
                <span>KRA PIN</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={testIdentifier}
                onChange={(e) => setTestIdentifier(e.target.value)}
                placeholder={testMode === "pin" ? "e.g. A012345678Z" : "e.g. 28475912"}
                className="flex-1 h-12 px-4 rounded-xl bg-surface-container text-sm text-on-surface font-mono font-bold border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={testLoading}
                className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {testLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Execute Query</span>
              </button>
            </div>
          </form>

          {testResult && (
            <div className="mt-6 rounded-2xl bg-neutral-950 p-5 border border-neutral-800 font-mono text-xs text-emerald-400 overflow-x-auto">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800 text-neutral-400 text-[11px]">
                <span>Gateway Raw Response Status: HTTP {testHttpStatus ?? (testResult.success ? 200 : 500)}</span>
                <span>Time: {new Date().toLocaleTimeString()}</span>
              </div>
              <pre className="pt-3">{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
