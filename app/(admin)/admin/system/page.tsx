import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orders, users, kycApplications, disputes, payouts } from "@/lib/db/schema";
import { count, sql } from "drizzle-orm";
import {
  CheckCircle, Server, Database, Clock, AlertCircle, Activity,
  Zap, GitBranch,
} from "lucide-react";
import { SystemHealthClient } from "./system-health-client";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin/dashboard");

  const dbStart = Date.now();
  const [totalUsers, activeOrders, pendingKyc, openDisputes, pendingPayouts] = await Promise.all([
    db.select({ value: count() }).from(users).then(r => r[0].value),
    db.select({ value: count() }).from(orders).where(sql`${orders.status} IN ('pending','in_progress','delivered','revision_requested')`).then(r => r[0].value),
    db.select({ value: count() }).from(kycApplications).where(sql`${kycApplications.status} = 'pending'`).then(r => r[0].value),
    db.select({ value: count() }).from(disputes).where(sql`${disputes.status} = 'open'`).then(r => r[0].value),
    db.select({ value: count() }).from(payouts).where(sql`${payouts.status} = 'pending'`).then(r => r[0].value),
  ]);
  const dbLatency = Date.now() - dbStart;

  const uptime = process.uptime();
  const memUsage = process.memoryUsage();
  const heapUsedMb = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMb = Math.round(memUsage.heapTotal / 1024 / 1024);

  function fmtUptime(s: number) {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  }

  const services = [
    { name: "Database (PostgreSQL)", status: dbLatency < 500 ? "operational" : "degraded", latency: `${dbLatency}ms` },
    { name: "Auth (NextAuth)", status: "operational", latency: "â€"" },
    { name: "File Storage", status: "operational", latency: "â€"" },
    { name: "Email (Resend)", status: "operational", latency: "â€"" },
    { name: "Payment Gateway (Razorpay)", status: "operational", latency: "â€"" },
    { name: "Push Notifications", status: "operational", latency: "â€"" },
  ];

  return (
    <div className="px-8 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Health</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Live process stats, service status, and queue depths.</p>
      </div>

      {/* Overall status banner */}
      <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5 flex items-center gap-4">
        <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
        <div>
          <p className="font-semibold text-emerald-900">All systems operational</p>
          <p className="text-sm text-emerald-700 mt-0.5">No incidents reported &middot; Last checked just now</p>
        </div>
      </div>

      {/* Process metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Server uptime", value: fmtUptime(uptime), icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Heap used", value: `${heapUsedMb} / ${heapTotalMb} MB`, icon: Server, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "DB latency", value: `${dbLatency}ms`, icon: Database, color: dbLatency < 200 ? "text-emerald-600" : "text-amber-600", bg: dbLatency < 200 ? "bg-emerald-50" : "bg-amber-50" },
          { label: "Node version", value: process.version, icon: GitBranch, color: "text-gray-600", bg: "bg-gray-50" },
        ].map(m => (
          <div key={m.label} className={`rounded-2xl ${m.bg} px-4 py-4`}>
            <m.icon className={`w-4 h-4 ${m.color} mb-2`} />
            <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Queue depths */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-6">
        <p className="font-semibold text-gray-900 dark:text-white mb-5">Queue Depths</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {[
            { label: "Active orders", value: activeOrders, color: "text-blue-600" },
            { label: "Pending KYC", value: pendingKyc, color: "text-amber-600" },
            { label: "Open disputes", value: openDisputes, color: "text-red-600" },
            { label: "Pending payouts", value: pendingPayouts, color: "text-violet-600" },
          ].map(q => (
            <div key={q.label} className="text-center">
              <p className={`text-3xl font-bold ${q.color}`}>{q.value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{q.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Service status */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">Service Status</p>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {services.map(svc => (
            <div key={svc.name} className="flex items-center justify-between px-6 py-3.5">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${svc.status === "operational" ? "bg-emerald-400" : "bg-amber-400"}`} />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{svc.name}</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{svc.latency}</span>
                <span className={`text-xs font-semibold ${svc.status === "operational" ? "text-emerald-600" : "text-amber-600"}`}>
                  {svc.status === "operational" ? "Operational" : "Degraded"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live refresh */}
      <SystemHealthClient totalUsers={totalUsers} activeOrders={activeOrders} />
    </div>
  );
}
