"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  Activity, RefreshCw, Database, Server, Clock, GitBranch,
  Terminal, CheckCircle2, ShieldAlert,
  Trash2, Send, ChevronDown, ChevronUp, TableProperties,
  ShoppingBag, TrendingUp, Users, MessageSquare,
  FileCheck, Scale, Wallet, Timer, AlertTriangle,
  ToggleLeft, ToggleRight,
} from "lucide-react";
import React from "react";
import Link from "next/link";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: any;
  createdAt: string;
  actorName: string | null;
  actorRole: string;
}

interface HealthData {
  dbLatency: number;
  uptime: number;
  heapUsedMb: number;
  heapTotalMb: number;
  nodeVersion: string;
  tableCounts: {
    users: number;
    orders: number;
    packages: number;
    portfolioItems: number;
    disputes: number;
    payouts: number;
    kycApplications: number;
  };
  pings: {
    database: number;
    storage: number | null;
    email: number | null;
    payment: number | null;
    pusher: number | null;
  };
  auditLogs: AuditLog[];
  businessPulse: {
    ordersToday: number;
    revenueToday: number;
    signupsToday: number;
    messagesToday: number;
  };
  pendingQueues: {
    kycPending: number;
    openDisputes: number;
    pendingPayouts: number;
  };
  maintenanceMode: boolean;
  cronStatus: {
    orders: string | null;
    nudges: string | null;
    expireFeatured: string | null;
    offlineNotifications: string | null;
  };
}

function fmtUptime(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function fmtRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function timeAgo(isoString: string | null): string {
  if (!isoString) return "Never";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function cronDotColor(isoString: string | null, warnAfterHours: number): string {
  if (!isoString) return "bg-red-400";
  const hrs = (Date.now() - new Date(isoString).getTime()) / 3600000;
  if (hrs < warnAfterHours) return "bg-emerald-400";
  if (hrs < 24) return "bg-amber-400 animate-pulse";
  return "bg-red-400 animate-pulse";
}

export function SystemHealthClient({
  totalUsers: initialTotalUsers,
  activeOrders: initialActiveOrders,
}: {
  totalUsers: number;
  activeOrders: number;
}) {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(15);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealth = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/system");
      if (!res.ok) throw new Error("Failed to load metrics");
      const health: HealthData = await res.json();
      setData(health);
      setMaintenanceMode(health.maintenanceMode);
      setCountdown(15);
    } catch {
      toast.error("Failed to refresh system metrics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { fetchHealth(); return 15; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current); };
  }, []);

  const triggerAction = async (action: string, extra?: Record<string, unknown>) => {
    setActionLoading(action);
    try {
      const res = await fetch("/api/admin/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Action failed");
      toast.success(resData.message || "Action executed successfully.");
      if (action === "purge-cache") fetchHealth();
    } catch (err: any) {
      toast.error(err.message || "Failed to execute action.");
    } finally {
      setActionLoading(null);
    }
  };

  async function toggleMaintenance() {
    const newValue = !maintenanceMode;
    setMaintenanceMode(newValue);
    try {
      const res = await fetch("/api/admin/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-maintenance", enabled: newValue }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Maintenance mode ${newValue ? "enabled" : "disabled"}.`);
    } catch {
      setMaintenanceMode(!newValue);
      toast.error("Failed to toggle maintenance mode.");
    }
  }

  // Derived values with fallbacks
  const dbLatency = data?.dbLatency ?? 0;
  const uptime = data?.uptime ?? 0;
  const heapUsedMb = data?.heapUsedMb ?? 0;
  const heapTotalMb = data?.heapTotalMb ?? 0;
  const nodeVersion = data?.nodeVersion ?? "v20.0.0";
  const tableCounts = data?.tableCounts ?? {
    users: initialTotalUsers, orders: initialActiveOrders,
    packages: 0, portfolioItems: 0, disputes: 0, payouts: 0, kycApplications: 0,
  };
  const pings = data?.pings ?? { database: 0, storage: null, email: null, payment: null, pusher: null };
  const logs = data?.auditLogs ?? [];
  const pulse = data?.businessPulse ?? { ordersToday: 0, revenueToday: 0, signupsToday: 0, messagesToday: 0 };
  const queues = data?.pendingQueues ?? { kycPending: 0, openDisputes: 0, pendingPayouts: 0 };
  const cron = data?.cronStatus ?? { orders: null, nudges: null, expireFeatured: null, offlineNotifications: null };

  const memPct = heapTotalMb > 0 ? Math.round((heapUsedMb / heapTotalMb) * 100) : 0;
  const dataLoaded = data !== null;
  const allServicesUp = dataLoaded && pings.storage !== null && pings.email !== null && pings.payment !== null && pings.pusher !== null;
  const someServicesDown = dataLoaded && (pings.storage === null || pings.email === null || pings.payment === null || pings.pusher === null);
  const dbLatencyColor = dbLatency < 50
    ? "text-emerald-600 border-emerald-100 bg-emerald-50/40"
    : dbLatency < 200
    ? "text-amber-600 border-amber-100 bg-amber-50/40"
    : "text-red-600 border-red-100 bg-red-50/40";

  return (
    <div className="space-y-6 mt-6">

      {/* Auto-refresh header */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-client)]/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-[var(--brand-client)] animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Real-time Diagnostics</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Auto-refreshing in <span className="font-semibold text-gray-700 dark:text-gray-300">{countdown}s</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchHealth(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-800 px-3.5 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Force Refresh
        </button>
      </div>

      {/* Business Pulse strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Orders Today", value: loading ? "—" : pulse.ordersToday.toString(), icon: ShoppingBag, color: "text-sky-600 border-sky-100 bg-sky-50/40", sub: "New orders placed" },
          { label: "Revenue Today", value: loading ? "—" : fmtRupees(pulse.revenueToday), icon: TrendingUp, color: "text-emerald-600 border-emerald-100 bg-emerald-50/40", sub: "Gross collected" },
          { label: "New Signups", value: loading ? "—" : pulse.signupsToday.toString(), icon: Users, color: "text-violet-600 border-violet-100 bg-violet-50/40", sub: "Users registered today" },
          { label: "Messages Today", value: loading ? "—" : pulse.messagesToday.toString(), icon: MessageSquare, color: "text-orange-500 border-orange-100 bg-orange-50/40", sub: "Chat activity" },
        ].map(m => (
          <div key={m.label} className={`rounded-2xl border ${m.color} p-4 transition-all duration-300 hover:shadow-md`}>
            <m.icon className="w-4 h-4 mb-2 opacity-80" />
            <p className="text-lg font-black tracking-tight">{m.value}</p>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide">{m.label}</p>
            <p className="text-[10px] text-gray-300 mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Process Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Uptime */}
        <div className="rounded-2xl border text-sky-600 border-sky-100 bg-sky-50/40 p-4 hover:shadow-md transition-all duration-300">
          <Clock className="w-4 h-4 mb-2 opacity-80" />
          <p className="text-lg font-black tracking-tight">{uptime > 0 ? fmtUptime(uptime) : "Calculating..."}</p>
          <p className="text-[11px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide">Server uptime</p>
        </div>

        {/* Memory with bar */}
        <div className="rounded-2xl border text-violet-600 border-violet-100 bg-violet-50/40 p-4 hover:shadow-md transition-all duration-300">
          <Server className="w-4 h-4 mb-2 opacity-80" />
          <p className="text-lg font-black tracking-tight">{heapUsedMb > 0 ? `${heapUsedMb} MB` : "Reading..."}</p>
          <p className="text-[11px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide">Memory (Heap)</p>
          {heapTotalMb > 0 && (
            <div className="mt-2 w-full h-1.5 bg-violet-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${memPct > 80 ? "bg-red-400" : memPct > 60 ? "bg-amber-400" : "bg-violet-400"}`}
                style={{ width: `${memPct}%` }}
              />
            </div>
          )}
          {heapTotalMb > 0 && (
            <p className="text-[10px] text-gray-300 mt-1">{memPct}% of {heapTotalMb} MB</p>
          )}
        </div>

        {/* DB Latency with tiered color */}
        <div className={`rounded-2xl border ${dbLatencyColor} p-4 hover:shadow-md transition-all duration-300`}>
          <Database className="w-4 h-4 mb-2 opacity-80" />
          <p className="text-lg font-black tracking-tight">{dbLatency > 0 ? `${dbLatency}ms` : "Pinging..."}</p>
          <p className="text-[11px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide">Database Ping</p>
          {dbLatency > 0 && (
            <p className="text-[10px] text-gray-300 mt-0.5">{dbLatency < 50 ? "Excellent" : dbLatency < 200 ? "Normal" : "Degraded"}</p>
          )}
        </div>

        {/* Node */}
        <div className="rounded-2xl border text-gray-600 border-gray-200 bg-gray-50/40 p-4 hover:shadow-md transition-all duration-300">
          <GitBranch className="w-4 h-4 mb-2 opacity-80" />
          <p className="text-lg font-black tracking-tight">{nodeVersion}</p>
          <p className="text-[11px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide">Node Runtime</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Status */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between">
            <p className="font-bold text-gray-900 dark:text-white text-sm">Services Integration Health</p>
            {!dataLoaded ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Checking...
              </span>
            ) : allServicesUp ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-2.5 h-2.5" /> All online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                <ShieldAlert className="w-2.5 h-2.5" /> Some degraded
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800 flex-1">
            {[
              { name: "PostgreSQL Database", ping: pings.database, label: "Primary Storage" },
              { name: "Cloudflare R2 Storage", ping: pings.storage, label: "Assets Bucket" },
              { name: "Resend Mail Server", ping: pings.email, label: "Transactional Email" },
              { name: "Razorpay Gateway", ping: pings.payment, label: "Escrow Processor" },
              { name: "Pusher WebSockets", ping: pings.pusher, label: "Real-time Messaging" },
            ].map(svc => (
              <div key={svc.name} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/40 dark:hover:bg-gray-800/20 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{svc.name}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{svc.label}</p>
                </div>
                <div className="flex items-center gap-5">
                  <span className="text-xs font-mono text-gray-400">{svc.ping !== null ? `${svc.ping}ms` : "—"}</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${svc.ping !== null ? "text-emerald-600" : "text-amber-500"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${svc.ping !== null ? "bg-emerald-500" : "bg-amber-400 animate-pulse"}`} />
                    {svc.ping !== null ? "Operational" : "Checking..."}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Database Diagnostics */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center gap-2">
            <TableProperties className="w-4 h-4 text-gray-400" />
            <p className="font-bold text-gray-900 dark:text-white text-sm">Database Diagnostics</p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800 flex-1">
            {[
              { label: "User Accounts", count: tableCounts.users, sub: "Clients & Editors" },
              { label: "Orders Records", count: tableCounts.orders, sub: "Job flow history" },
              { label: "Packages Defined", count: tableCounts.packages, sub: "Editor pricing" },
              { label: "Portfolio Items", count: tableCounts.portfolioItems, sub: "Showcases" },
              { label: "Disputes", count: tableCounts.disputes, sub: "Arbitration cases" },
              { label: "Payouts", count: tableCounts.payouts, sub: "Transferred payments" },
              { label: "KYC Submissions", count: tableCounts.kycApplications, sub: "KYC records" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50/40 dark:hover:bg-gray-800/20 transition-colors">
                <div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{row.label}</p>
                  <p className="text-[9.5px] text-gray-400 dark:text-gray-500">{row.sub}</p>
                </div>
                <span className="text-xs font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md tabular-nums">
                  {row.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Queues + Cron Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Queues */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <p className="font-bold text-gray-900 dark:text-white text-sm">Pending Queues</p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {[
              { label: "KYC Pending Review", count: queues.kycPending, icon: FileCheck, href: "/admin/kyc", color: queues.kycPending > 0 ? "text-amber-600 bg-amber-50" : "text-gray-500 bg-gray-100 dark:bg-gray-800" },
              { label: "Open Disputes", count: queues.openDisputes, icon: Scale, href: "/admin/disputes", color: queues.openDisputes > 0 ? "text-red-600 bg-red-50" : "text-gray-500 bg-gray-100 dark:bg-gray-800" },
              { label: "Pending Payouts", count: queues.pendingPayouts, icon: Wallet, href: "/admin/payouts", color: queues.pendingPayouts > 0 ? "text-sky-600 bg-sky-50" : "text-gray-500 bg-gray-100 dark:bg-gray-800" },
            ].map(item => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/40 dark:hover:bg-gray-800/20 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{item.label}</p>
                </div>
                <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full tabular-nums ${item.color}`}>
                  {loading ? "—" : item.count}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Cron Job Status */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center gap-2">
            <Timer className="w-4 h-4 text-gray-400" />
            <p className="font-bold text-gray-900 dark:text-white text-sm">Cron Job Status</p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {[
              { label: "Order Lifecycle", sub: "Runs every hour", ts: cron.orders, warnAfter: 2 },
              { label: "Nudges & Digests", sub: "Runs daily", ts: cron.nudges, warnAfter: 25 },
              { label: "Expire Featured", sub: "Runs every hour", ts: cron.expireFeatured, warnAfter: 2 },
              { label: "Offline Notifications", sub: "Runs every 15 min", ts: cron.offlineNotifications, warnAfter: 0.5 },
            ].map(job => (
              <div key={job.label} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/40 dark:hover:bg-gray-800/20 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${loading ? "bg-gray-300" : cronDotColor(job.ts, job.warnAfter)}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{job.label}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{job.sub}</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-gray-400 dark:text-gray-500 shrink-0">
                  {loading ? "—" : timeAgo(job.ts)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Diagnostic Operations Panel */}
      <div className="rounded-2xl border border-[var(--brand-client)]/10 bg-sky-50/20 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="w-4 h-4 text-[var(--brand-client)]" />
          <p className="font-bold text-sm text-gray-900 dark:text-white">Diagnostic Operations</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Purge cache */}
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex flex-col justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Clear Public Cache</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Purges homepage and category listing CDN caches immediately.</p>
            </div>
            <button
              onClick={() => triggerAction("purge-cache")}
              disabled={actionLoading !== null}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-gray-900 hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 text-white font-semibold text-xs py-2 px-3 rounded-lg transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {actionLoading === "purge-cache" ? "Purging..." : "Purge Static Cache"}
            </button>
          </div>

          {/* Test email */}
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex flex-col justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Test Email Connection</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Sends a diagnostic ping via Resend to verify mail delivery.</p>
            </div>
            <button
              onClick={() => triggerAction("test-email")}
              disabled={actionLoading !== null}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-[var(--brand-client)] hover:bg-[var(--brand-client-hover)] text-white font-semibold text-xs py-2 px-3 rounded-lg transition-colors disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              {actionLoading === "test-email" ? "Sending..." : "Send Test Diagnostic"}
            </button>
          </div>

          {/* Maintenance mode */}
          <div className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-colors ${maintenanceMode ? "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20" : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"}`}>
            <div>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Maintenance Mode</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                {maintenanceMode ? "Platform is currently in maintenance mode — users see a holding page." : "Platform is live. Enable to show a maintenance page to visitors."}
              </p>
            </div>
            <button
              onClick={toggleMaintenance}
              className={`w-full inline-flex items-center justify-center gap-1.5 font-semibold text-xs py-2 px-3 rounded-lg transition-colors ${maintenanceMode ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"}`}
            >
              {maintenanceMode
                ? <><ToggleRight className="w-3.5 h-3.5" /> Disable Maintenance</>
                : <><ToggleLeft className="w-3.5 h-3.5" /> Enable Maintenance</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Stream */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-gray-400" />
            <p className="font-bold text-gray-900 dark:text-white text-sm">Recent Audit Log Stream</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold font-mono">live feed</span>
            <Link href="/admin/audit" className="text-[10px] font-semibold text-[var(--brand-client)] hover:underline">
              View full log →
            </Link>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 dark:text-gray-500">No recent system events logged.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-850/10 text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Actor</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Entity</th>
                  <th className="px-6 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-850">
                {logs.map((log) => {
                  const isExpanded = expandedLog === log.id;
                  const date = new Date(log.createdAt);
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-gray-50/20 dark:hover:bg-gray-800/10 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-800 dark:text-gray-200">{log.actorName || "System / API"}</p>
                          <span className="inline-block text-[9px] font-bold px-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase">
                            {log.actorRole}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{log.action}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-400 dark:text-gray-500">
                          {log.entityType} ({log.entityId.slice(0, 8)})
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--brand-client)] hover:underline"
                          >
                            Metadata {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50/40 dark:bg-gray-850/10">
                          <td colSpan={5} className="px-6 py-4">
                            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4 font-mono text-[11px] text-gray-600 dark:text-gray-400 max-h-[200px] overflow-y-auto">
                              <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
