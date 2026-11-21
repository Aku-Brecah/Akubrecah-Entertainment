"use client";

import { useState, useEffect } from "react";

const iconColors: Record<string, string> = {
  error: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400",
  warning: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
  info: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400",
};

const metricIcons: Record<string, string> = {
  "Server Uptime": "dns",
  "Active Users (Clerk)": "group",
  "CPU Load (1m)": "speed",
  "Memory Usage": "warning",
};

export default function SystemHealthPage() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState<"all" | "warning" | "error">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Real-time Load chart tracking (populated strictly from live telemetry responses)
  const [loadHistory, setLoadHistory] = useState<number[]>([]);
  const [loadLabels, setLoadLabels] = useState<string[]>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchHealth = async () => {
    try {
      const [res, logsRes] = await Promise.all([
        fetch("/api/admin/system-health"),
        fetch("/api/admin/logs?limit=15").catch(() => null),
      ]);
      const data = await res.json();
      if (data.success) {
        setFetchError(null);
        setMetrics(data.metrics || []);
        setServices(data.services || []);

        // Update load history chart based on real CPU load reading
        const cpuMetric = (data.metrics || []).find((m: any) => String(m.label || "").includes("CPU"));
        if (cpuMetric) {
          const parsed = parseFloat(cpuMetric.value);
          const loadVal = Number.isFinite(parsed) ? Math.min(100, Math.max(0, Math.round(parsed * 100))) : 0;
          const timeLabel = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          setLoadHistory((prev) => [...prev, loadVal].slice(-12));
          setLoadLabels((prev) => [...prev, timeLabel].slice(-12));
        }
      } else {
        const msg = data.error || "Access Denied";
        setFetchError(msg);
        showToast("Error retrieving live health metrics: " + msg);
      }

      if (logsRes && logsRes.ok) {
        const logsData = await logsRes.json().catch(() => null);
        if (logsData?.success && Array.isArray(logsData.logs)) {
          setLogs(
            logsData.logs.map((l: any) => ({
              type: l.level === "error" || l.level === "warning" ? l.level : "info",
              icon: l.level === "error" ? "error" : l.level === "warning" ? "warning" : "task_alt",
              title: l.service || "System",
              desc: l.message || "",
              time: l.timestamp
                ? new Date(l.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Recent",
              actor: l.actor || "System",
            }))
          );
        }
      }
    } catch (e) {
      console.error(e);
      setFetchError("Network error fetching live health telemetry.");
      showToast("Network error fetching live metrics.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const safeSec = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
    const d = Math.floor(safeSec / (3600 * 24));
    const h = Math.floor((safeSec % (3600 * 24)) / 3600);
    const m = Math.floor((safeSec % 3600) / 60);
    const s = Math.floor(safeSec % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(" ");
  };

  const avgLoad =
    loadHistory.length > 0
      ? Math.round(loadHistory.reduce((a, b) => a + b, 0) / loadHistory.length)
      : 0;
  const filteredLogs = logs.filter((log) => logFilter === "all" || log.type === logFilter);

  return (
    <div className="w-full max-w-[1280px] mx-auto space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">System Health</h1>
          <p className="text-on-surface-variant text-sm mt-1">Real-time live monitoring metrics connected to Neon and Clerk APIs.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            services.some(s => s.status === "Outage") ? "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300" :
            services.some(s => s.status === "Degraded") ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300" :
            "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300"
          }`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${
              services.some(s => s.status === "Outage") ? "bg-red-600 animate-pulse" :
              services.some(s => s.status === "Degraded") ? "bg-amber-500 animate-pulse" :
              "bg-green-600"
            }`} />
            {services.some(s => s.status === "Outage") ? "Critical Outage Detected" :
             services.some(s => s.status === "Degraded") ? "Performance Degraded" :
             "All Systems Operational"}
          </span>
          <button 
            onClick={fetchHealth}
            className="p-2 border border-outline-variant hover:bg-surface-container rounded-xl transition-all text-on-surface-variant flex items-center justify-center shrink-0"
            title="Refresh Live Data"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant animate-pulse shadow-soft h-32" />
          ))
        ) : (
          metrics.map((m) => {
            const isUptime = m.label === "Server Uptime";
            const valStr = isUptime ? formatUptime(parseInt(m.value, 10)) : m.value;
            const icon = metricIcons[m.label] || "dns";

            return (
              <div key={m.label} className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-soft">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                  </div>
                  <span className="bg-surface-container-highest text-on-surface-variant text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md">
                    Real-time
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mb-1">{m.label}</p>
                <p className="text-2xl font-bold text-on-surface tracking-tight">
                  {valStr}<span className="text-base font-normal text-on-surface-variant ml-1">{isUptime ? "" : m.unit}</span>
                </p>
              </div>
            );
          })
        )}
      </div>

      {fetchError && (
        <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={fetchHealth}
            className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Chart + Live Logs */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Chart */}
        <div className="flex-1 min-w-0 w-full bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden shadow-soft">
          <div className="px-5 py-4 border-b border-outline-variant bg-surface flex justify-between items-center gap-2">
            <div>
              <h3 className="font-bold text-on-surface">System Load Trajectory (CPU Load %)</h3>
              <p className="text-[10px] text-on-surface-variant mt-0.5">
                {loadHistory.length > 0 ? (
                  <>Average load across {loadHistory.length} live sample{loadHistory.length === 1 ? "" : "s"}: <strong>{avgLoad}%</strong></>
                ) : (
                  "Waiting for live CPU telemetry samples..."
                )}
              </p>
            </div>
            <span className="text-[10px] uppercase font-extrabold text-on-surface-variant/80 tracking-wider shrink-0">Updates live</span>
          </div>
          <div className="p-5 bg-surface-container-low min-h-[240px] relative flex items-end gap-2.5 pt-10">
            {loadHistory.length === 0 ? (
              <div className="w-full h-36 flex items-center justify-center text-xs text-on-surface-variant">
                {isLoading ? "Collecting live CPU load readings..." : "No CPU load readings recorded yet."}
              </div>
            ) : (
              loadHistory.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-36">
                  <div
                    className={`w-full rounded-t-md hover:opacity-100 transition-all cursor-pointer ${
                      h > 75 ? "bg-red-500/80 hover:bg-red-500" :
                      h > 40 ? "bg-amber-500/80 hover:bg-amber-500" :
                      "bg-primary/70 hover:bg-primary"
                    }`}
                    style={{ height: `${h > 0 ? h : 4}%` }}
                    title={`Load: ${h}%`}
                  />
                  <span className="text-[8px] text-on-surface-variant/80 font-mono tracking-tight font-semibold mt-1 block select-none whitespace-nowrap overflow-hidden max-w-full">
                    {loadLabels[i] ? loadLabels[i].split(" ")[0] : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Logs */}
        <div className="w-full xl:w-80 shrink-0 bg-surface-container-lowest rounded-2xl border border-outline-variant flex flex-col max-h-[420px] shadow-soft">
          <div className="px-5 py-4 border-b border-outline-variant bg-surface flex items-center justify-between">
            <h3 className="font-bold text-on-surface flex items-center gap-2">
              Live Health Logs
              <span className="w-2 h-2 bg-primary rounded-full" />
            </h3>
            <button
              type="button"
              onClick={() => {
                const next = logFilter === "all" ? "warning" : logFilter === "warning" ? "error" : "all";
                setLogFilter(next);
                showToast(`Showing ${next === "all" ? "all" : next} log events`);
              }}
              className="text-on-surface-variant hover:text-primary flex items-center gap-1 text-xs font-semibold cursor-pointer"
              title={`Filter logs (current: ${logFilter})`}
            >
              <span className="uppercase">{logFilter}</span>
              <span className="material-symbols-outlined text-[20px]">filter_list</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="px-5 py-10 text-center text-xs text-on-surface-variant">
                {isLoading ? "Loading live health logs..." : "No matching system log events recorded."}
              </div>
            ) : (
              <ul className="divide-y divide-outline-variant/50">
                {filteredLogs.map((log, i) => (
                  <li key={i} className="px-5 py-3 hover:bg-surface-container-low transition-colors flex gap-3 items-start">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${iconColors[log.type]}`}>
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>{log.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">{log.title}</p>
                      <p className="text-xs text-on-surface-variant truncate">{log.desc}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{log.time} · {log.actor}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Service Status */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden shadow-soft">
        <div className="px-5 py-4 border-b border-outline-variant bg-surface flex justify-between items-center">
          <h3 className="font-bold text-on-surface">API & Resource Connectivity</h3>
          <span className="text-[10px] uppercase font-extrabold text-on-surface-variant/80 tracking-wider">Live Check Results</span>
        </div>
        <div className="divide-y divide-outline-variant/50">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="px-5 py-6 bg-surface-container-lowest animate-pulse" />
            ))
          ) : services.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-on-surface-variant">
              No connectivity probe results available.
            </div>
          ) : (
            services.map(s => (
              <div
                key={s.name}
                className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 px-5 py-4 hover:bg-surface-container-low transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${
                    s.status === "Operational" ? "bg-green-500" :
                    s.status === "Degraded" ? "bg-amber-500 animate-pulse" :
                    "bg-red-500 animate-ping"
                  }`} />
                  <span className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors">{s.name}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                  <span className="text-xs text-on-surface-variant">Response Latency: <strong className="text-on-surface">{s.latency}</strong></span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg select-none transition-all ${
                    s.status === "Operational" ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300" :
                    s.status === "Degraded" ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400" :
                    "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400"
                  }`}>
                    {s.status}
                  </span>
                </div>
              </div>
            ))
          )}
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
