import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orders, users, editors, disputes, payouts, kycApplications, auditLogs, packages } from "@/lib/db/schema";
import { sql, count, eq, desc } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ShoppingBag, Users, AlertTriangle, DollarSign, Clock, CheckCircle,
  TrendingUp, TrendingDown, FileCheck, Wallet, ArrowRight, Activity,
  Star, UserCheck, Zap, UserPlus,
} from "lucide-react";
import Link from "next/link";
import { OrdersLineChart, SignupsBarChart, UserPieChart } from "./charts";
import { LiveStats } from "./live-stats";

export const dynamic = "force-dynamic";

// ── helpers ──────────────────────────────────────────────────────────────────

function pct(a: number, b: number) {
  if (!b) return null;
  const diff = ((a - b) / b) * 100;
  return { diff: Math.abs(Math.round(diff)), up: diff >= 0 };
}

function last30Days() {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(5, 10)); // MM-DD
  }
  return days;
}

// ── sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, iconBg, iconColor, href, trend,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; iconBg: string; iconColor: string;
  href?: string; trend?: { diff: number; up: boolean } | null;
}) {
  const inner = (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm h-full hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend.up ? "text-emerald-600" : "text-red-500"}`}>
            {trend.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {trend.diff}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

function ActionCard({
  label, sub, icon: Icon, iconBg, iconColor, href, count: cnt,
}: {
  label: string; sub: string; icon: React.ElementType;
  iconBg: string; iconColor: string; href: string; count: number;
}) {
  return (
    <Link href={href} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm hover:shadow-md transition-shadow group">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
      {cnt > 0 && (
        <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1">
          {cnt > 99 ? "99+" : cnt}
        </span>
      )}
      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
    </Link>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

// ── KYC staff dashboard ───────────────────────────────────────────────────────

async function StaffKycDashboard({ actorName }: { actorName: string }) {
  const [
    pendingCount, approvedCount, rejectedCount,
    recentApplications,
  ] = await Promise.all([
    db.select({ value: count() }).from(kycApplications).where(sql`${kycApplications.status} = 'pending'`).then(r => r[0].value),
    db.select({ value: count() }).from(kycApplications).where(sql`${kycApplications.status} = 'approved'`).then(r => r[0].value),
    db.select({ value: count() }).from(kycApplications).where(sql`${kycApplications.status} = 'rejected'`).then(r => r[0].value),
    db.select({
      id: kycApplications.id,
      editorId: kycApplications.editorId,
      status: kycApplications.status,
      createdAt: kycApplications.createdAt,
      name: users.name,
      email: users.email,
    })
      .from(kycApplications)
      .innerJoin(editors, eq(editors.id, kycApplications.editorId))
      .innerJoin(users, eq(users.id, editors.userId))
      .where(sql`${kycApplications.status} = 'pending'`)
      .orderBy(desc(kycApplications.createdAt))
      .limit(10),
  ]);

  return (
    <div className="px-8 py-6 space-y-8">
      <div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          KYC Review
        </span>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">KYC Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back, {actorName}.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending review", value: pendingCount, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
          { label: "Approved", value: approvedCount, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
          { label: "Rejected", value: rejectedCount, color: "text-red-500", bg: "bg-red-50", border: "border-red-100" },
        ].map(item => (
          <div key={item.label} className={`rounded-2xl border ${item.border} ${item.bg} px-5 py-5`}>
            <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-sm text-gray-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-semibold text-gray-900">Pending Applications</p>
            <p className="text-xs text-gray-400 mt-0.5">Oldest first — review these now</p>
          </div>
          <Link href="/admin/kyc" className="text-xs font-semibold text-[#0EA5E9] hover:underline underline-offset-2">
            Open KYC queue →
          </Link>
        </div>
        {recentApplications.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No pending applications.</p>
        ) : (
          <div className="space-y-2">
            {recentApplications.map(app => (
              <Link
                key={app.id}
                href={`/admin/kyc/${app.id}`}
                className="flex items-center gap-4 px-4 py-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{app.name ?? "Unknown"}</p>
                  <p className="text-xs text-gray-400 truncate">{app.email}</p>
                </div>
                <p className="text-xs text-gray-400 shrink-0">{formatDate(app.createdAt)}</p>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dispute staff dashboard ───────────────────────────────────────────────────

async function StaffDisputeDashboard({ actorName }: { actorName: string }) {
  const [
    openCount, resolvedCount,
    recentOpen,
  ] = await Promise.all([
    db.select({ value: count() }).from(disputes).where(sql`${disputes.status} = 'open'`).then(r => r[0].value),
    db.select({ value: count() }).from(disputes).where(sql`${disputes.status} = 'resolved'`).then(r => r[0].value),
    db.select({
      id: disputes.id,
      reason: disputes.reason,
      status: disputes.status,
      createdAt: disputes.createdAt,
      packageTitle: packages.title,
      openedByName: users.name,
    })
      .from(disputes)
      .innerJoin(orders, eq(orders.id, disputes.orderId))
      .leftJoin(packages, eq(packages.id, orders.packageId))
      .innerJoin(users, eq(users.id, disputes.openedBy))
      .where(sql`${disputes.status} = 'open'`)
      .orderBy(desc(disputes.createdAt))
      .limit(10),
  ]);

  return (
    <div className="px-8 py-6 space-y-8">
      <div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Dispute Resolution
        </span>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Disputes Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back, {actorName}.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Open disputes", value: openCount, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
          { label: "Resolved", value: resolvedCount, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
        ].map(item => (
          <div key={item.label} className={`rounded-2xl border ${item.border} ${item.bg} px-5 py-5`}>
            <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-sm text-gray-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-semibold text-gray-900">Open Disputes</p>
            <p className="text-xs text-gray-400 mt-0.5">Needs your attention</p>
          </div>
          <Link href="/admin/disputes" className="text-xs font-semibold text-[#0EA5E9] hover:underline underline-offset-2">
            All disputes →
          </Link>
        </div>
        {recentOpen.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No open disputes.</p>
        ) : (
          <div className="space-y-2">
            {recentOpen.map(d => (
              <Link
                key={d.id}
                href={`/admin/disputes/${d.id}`}
                className="flex items-center gap-4 px-4 py-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{d.packageTitle ?? "Unknown package"}</p>
                  <p className="text-xs text-gray-400 truncate">Filed by {d.openedByName ?? "user"} · {d.reason.slice(0, 60)}{d.reason.length > 60 ? "…" : ""}</p>
                </div>
                <p className="text-xs text-gray-400 shrink-0">{formatDate(d.createdAt)}</p>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const actorName = session.user.name ?? "Staff";
  if (session.user.role === "staff_kyc") return <StaffKycDashboard actorName={actorName} />;
  if (session.user.role === "staff_dispute") return <StaffDisputeDashboard actorName={actorName} />;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

  const [
    totalUsers, totalEditors, totalOrders, activeOrders,
    openDisputes, totalRevenue, pendingKyc,
    // this month
    thisMonthOrders, thisMonthRevenue, thisMonthSignups,
    // last month
    lastMonthOrders, lastMonthRevenue,
    // today / week
    todaySignups, weekSignups,
    // pending payouts
    pendingPayouts,
    // editor breakdown
    kycApproved, kycPendingCount, kycRejected,
    // top editors
    topEditors,
    // recent activity
    recentActivity,
    // orders per day (last 30)
    ordersPerDay,
    // signups per day (last 30)
    signupsPerDay,
    // user role breakdown
    clientCount,
  ] = await Promise.all([
    db.select({ value: count() }).from(users).then(r => r[0].value),
    db.select({ value: count() }).from(editors).then(r => r[0].value),
    db.select({ value: count() }).from(orders).then(r => r[0].value),
    db.select({ value: count() }).from(orders)
      .where(sql`${orders.status} IN ('pending','in_progress','delivered','revision_requested')`)
      .then(r => r[0].value),
    db.select({ value: count() }).from(disputes)
      .where(sql`${disputes.status} = 'open'`).then(r => r[0].value),
    db.select({ value: sql<number>`COALESCE(SUM(${payouts.commissionAmount}),0)::int` })
      .from(payouts).where(sql`${payouts.status} = 'completed'`).then(r => r[0].value),
    db.select({ value: count() }).from(kycApplications)
      .where(sql`${kycApplications.status} = 'pending'`).then(r => r[0].value),
    // this month orders
    db.select({ value: count() }).from(orders)
      .where(sql`${orders.createdAt} >= ${monthStart}`).then(r => r[0].value),
    // this month revenue
    db.select({ value: sql<number>`COALESCE(SUM(${payouts.commissionAmount}),0)::int` })
      .from(payouts)
      .where(sql`${payouts.status} = 'completed' AND ${payouts.createdAt} >= ${monthStart}`)
      .then(r => r[0].value),
    // this month signups
    db.select({ value: count() }).from(users)
      .where(sql`${users.createdAt} >= ${monthStart}`).then(r => r[0].value),
    // last month orders
    db.select({ value: count() }).from(orders)
      .where(sql`${orders.createdAt} >= ${lastMonthStart} AND ${orders.createdAt} <= ${lastMonthEnd}`)
      .then(r => r[0].value),
    // last month revenue
    db.select({ value: sql<number>`COALESCE(SUM(${payouts.commissionAmount}),0)::int` })
      .from(payouts)
      .where(sql`${payouts.status} = 'completed' AND ${payouts.createdAt} >= ${lastMonthStart} AND ${payouts.createdAt} <= ${lastMonthEnd}`)
      .then(r => r[0].value),
    // today signups
    db.select({ value: count() }).from(users)
      .where(sql`${users.createdAt} >= ${todayStart}`).then(r => r[0].value),
    // week signups
    db.select({ value: count() }).from(users)
      .where(sql`${users.createdAt} >= ${weekStart}`).then(r => r[0].value),
    // pending payouts
    db.select({ value: count() }).from(payouts)
      .where(sql`${payouts.status} = 'pending'`).then(r => r[0].value),
    // kyc approved editors
    db.select({ value: count() }).from(editors)
      .where(sql`${editors.kycStatus} = 'approved'`).then(r => r[0].value),
    // kyc pending editors
    db.select({ value: count() }).from(editors)
      .where(sql`${editors.kycStatus} = 'pending'`).then(r => r[0].value),
    // kyc rejected editors
    db.select({ value: count() }).from(editors)
      .where(sql`${editors.kycStatus} = 'rejected'`).then(r => r[0].value),
    // top 5 editors by total orders
    db.select({
      name: users.name,
      email: users.email,
      totalOrders: editors.totalOrders,
      kycStatus: editors.kycStatus,
    })
      .from(editors)
      .innerJoin(users, eq(users.id, editors.userId))
      .where(sql`${editors.kycStatus} = 'approved'`)
      .orderBy(desc(editors.totalOrders))
      .limit(5),
    // recent audit log activity (last 8)
    db.select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      actorRole: auditLogs.actorRole,
      createdAt: auditLogs.createdAt,
      actorName: users.name,
    })
      .from(auditLogs)
      .innerJoin(users, eq(users.id, auditLogs.actorId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(8),
    // orders per day last 30
    db.execute(sql`
      SELECT TO_CHAR(DATE_TRUNC('day', ${orders.createdAt}), 'MM-DD') AS date, COUNT(*)::int AS value
      FROM ${orders}
      WHERE ${orders.createdAt} >= NOW() - INTERVAL '30 days'
      GROUP BY 1 ORDER BY 1
    `),
    // signups per day last 30
    db.execute(sql`
      SELECT TO_CHAR(DATE_TRUNC('day', ${users.createdAt}), 'MM-DD') AS date, COUNT(*)::int AS value
      FROM ${users}
      WHERE ${users.createdAt} >= NOW() - INTERVAL '30 days'
      GROUP BY 1 ORDER BY 1
    `),
    // client count
    db.select({ value: count() }).from(users)
      .where(sql`${users.role} = 'client'`).then(r => r[0].value),
  ]);

  // Fill in zero days for charts
  const days = last30Days();
  const ordersMap = Object.fromEntries((ordersPerDay.rows as { date: string; value: number }[]).map(r => [r.date, r.value]));
  const signupsMap = Object.fromEntries((signupsPerDay.rows as { date: string; value: number }[]).map(r => [r.date, r.value]));
  const ordersChartData = days.map(d => ({ date: d, value: ordersMap[d] ?? 0 }));
  const signupsChartData = days.map(d => ({ date: d, value: signupsMap[d] ?? 0 }));

  const orderTrend = pct(thisMonthOrders, lastMonthOrders);
  const revenueTrend = pct(thisMonthRevenue, lastMonthRevenue);

  const pieData = [
    { name: "Clients", value: clientCount, color: "#3b82f6" },
    { name: "KYC Approved", value: kycApproved, color: "#10b981" },
    { name: "KYC Pending", value: kycPendingCount, color: "#f59e0b" },
    { name: "KYC Rejected", value: kycRejected, color: "#ef4444" },
  ].filter(d => d.value > 0);

  // Funnel data
  const funnelSteps = [
    { label: "Editors registered", value: totalEditors },
    { label: "KYC submitted", value: kycApproved + kycPendingCount + kycRejected },
    { label: "KYC approved", value: kycApproved },
    { label: "Has orders", value: topEditors.filter(e => e.totalOrders > 0).length },
  ];

  const ACTION_LABEL: Record<string, string> = {
    "kyc.approve": "Approved KYC",
    "kyc.reject": "Rejected KYC",
    "dispute.resolve": "Resolved dispute",
    "user.role_change": "Changed user role",
    "user.suspend": "Suspended user",
    "user.unsuspend": "Reactivated user",
    "payout.status_change": "Updated payout",
  };

  return (
    <div className="px-8 py-6 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Admin Panel
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Platform Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">Live stats across users, orders, revenue, and disputes.</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
      </div>

      {/* ── Live stats (polls every 30s) ── */}
      <LiveStats initial={{ activeOrders, todaySignups, pendingKyc, openDisputes }} />

      {/* ── 10. New users today / this week ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "New today", value: todaySignups, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "New this week", value: weekSignups, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "This month signups", value: thisMonthSignups, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Pending payouts", value: pendingPayouts, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(item => (
          <div key={item.label} className={`rounded-2xl ${item.bg} px-4 py-3.5`}>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* ── 4. Pending action cards ── */}
      <div className="grid sm:grid-cols-3 gap-3">
        <ActionCard label="KYC Queue" sub="Pending applications" icon={FileCheck} iconBg="bg-amber-50" iconColor="text-amber-600" href="/admin/kyc" count={pendingKyc} />
        <ActionCard label="Open Disputes" sub="Needs resolution" icon={AlertTriangle} iconBg="bg-red-50" iconColor="text-red-600" href="/admin/disputes" count={openDisputes} />
        <ActionCard label="Pending Payouts" sub="Awaiting processing" icon={Wallet} iconBg="bg-violet-50" iconColor="text-violet-600" href="/admin/revenue" count={pendingPayouts} />
      </div>

      {/* ── 1. Core stat grid with 6. MoM comparison ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard label="Total Users" value={totalUsers} icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" href="/admin/users" />
        <StatCard label="Total Editors" value={totalEditors} sub="Registered on platform" icon={FileCheck} iconBg="bg-violet-50" iconColor="text-violet-600" href="/admin/users?role=editor" />
        <StatCard label="Total Orders" value={totalOrders} sub="All time" icon={ShoppingBag} iconBg="bg-emerald-50" iconColor="text-emerald-600" href="/admin/orders" />
        <StatCard label="This Month Orders" value={thisMonthOrders} sub={lastMonthOrders > 0 ? `${lastMonthOrders} last month` : undefined} icon={ShoppingBag} iconBg="bg-indigo-50" iconColor="text-indigo-600" href="/admin/orders" trend={orderTrend} />
        <StatCard label="This Month Revenue" value={formatCurrency(thisMonthRevenue)} sub={lastMonthRevenue > 0 ? `${formatCurrency(lastMonthRevenue)} last month` : undefined} icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600" href="/admin/revenue" trend={revenueTrend} />
        <StatCard label="Platform Revenue" value={formatCurrency(totalRevenue)} sub="Commission all time" icon={TrendingUp} iconBg="bg-teal-50" iconColor="text-teal-600" href="/admin/revenue" />
      </div>

      {/* ── 2. Charts ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="font-semibold text-gray-900 mb-1">Orders — last 30 days</p>
          <p className="text-xs text-gray-400 mb-4">Daily order count</p>
          <OrdersLineChart data={ordersChartData} />
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="font-semibold text-gray-900 mb-1">Signups — last 30 days</p>
          <p className="text-xs text-gray-400 mb-4">New user registrations per day</p>
          <SignupsBarChart data={signupsChartData} />
        </div>
      </div>

      {/* ── 5. User breakdown + 7. Conversion funnel ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* 5. User breakdown */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="font-semibold text-gray-900 mb-1">User breakdown</p>
          <p className="text-xs text-gray-400 mb-2">Clients vs editor KYC status</p>
          <UserPieChart data={pieData} />
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-xs text-gray-600">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* 7. Conversion funnel */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="font-semibold text-gray-900 mb-1">Editor funnel</p>
          <p className="text-xs text-gray-400 mb-5">Where editors drop off</p>
          <div className="space-y-3">
            {funnelSteps.map((step, i) => {
              const pctOfFirst = funnelSteps[0].value > 0 ? (step.value / funnelSteps[0].value) * 100 : 0;
              const colors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500"];
              return (
                <div key={step.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{step.label}</span>
                    <span className="font-semibold text-gray-900">{step.value} <span className="text-gray-400 font-normal">({Math.round(pctOfFirst)}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`${colors[i]} h-2 rounded-full transition-all`} style={{ width: `${pctOfFirst}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 3. Top editors leaderboard ── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-semibold text-gray-900">Top Editors</p>
            <p className="text-xs text-gray-400 mt-0.5">By total orders completed</p>
          </div>
          <Link href="/admin/users?role=editor" className="text-xs font-semibold text-[#0EA5E9] hover:underline underline-offset-2">View all →</Link>
        </div>
        {topEditors.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No completed orders yet.</p>
        ) : (
          <div className="space-y-3">
            {topEditors.map((editor, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-50 text-gray-400"
                }`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{editor.name ?? "Unknown"}</p>
                  <p className="text-xs text-gray-400 truncate">{editor.email}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <ShoppingBag className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900">{editor.totalOrders}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 1. Recent activity feed ── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-semibold text-gray-900">Recent Activity</p>
            <p className="text-xs text-gray-400 mt-0.5">Latest admin actions on the platform</p>
          </div>
          <Link href="/admin/audit" className="text-xs font-semibold text-[#0EA5E9] hover:underline underline-offset-2">Full log →</Link>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{item.actorName ?? "Admin"}</span>
                    {" "}<span className="text-gray-500">{ACTION_LABEL[item.action] ?? item.action}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.createdAt)} · {item.actorRole}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 8. Quick action buttons ── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="font-semibold text-gray-900 mb-4">Quick Actions</p>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Review KYC", href: "/admin/kyc", icon: FileCheck, color: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
            { label: "Resolve Disputes", href: "/admin/disputes", icon: AlertTriangle, color: "bg-red-50 text-red-700 hover:bg-red-100" },
            { label: "Pending Payouts", href: "/admin/revenue", icon: Wallet, color: "bg-violet-50 text-violet-700 hover:bg-violet-100" },
            { label: "Manage Users", href: "/admin/users", icon: Users, color: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
            { label: "All Orders", href: "/admin/orders", icon: ShoppingBag, color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
            { label: "Add Staff", href: "/admin/staff", icon: UserPlus, color: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
            { label: "Announcements", href: "/admin/announcements", icon: Zap, color: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" },
            { label: "Audit Log", href: "/admin/audit", icon: Activity, color: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
          ].map(({ label, href, icon: Icon, color }) => (
            <Link key={href} href={href} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${color}`}>
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── 9. System health ── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">System healthy</p>
              <p className="text-xs text-gray-400">No active maintenance mode · All services operational</p>
            </div>
          </div>
          <Link href="/admin/announcements" className="text-xs font-semibold text-[#0EA5E9] hover:underline underline-offset-2 shrink-0">
            Post notice →
          </Link>
        </div>
      </div>

    </div>
  );
}
