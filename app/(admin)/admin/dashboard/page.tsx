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
import nextDynamic from "next/dynamic";

const OrdersLineChart = nextDynamic(() => import("./charts").then(m => m.OrdersLineChart));
const SignupsBarChart = nextDynamic(() => import("./charts").then(m => m.SignupsBarChart));
const UserPieChart = nextDynamic(() => import("./charts").then(m => m.UserPieChart));
const PlatformRevenueChart = nextDynamic(() => import("./charts").then(m => m.PlatformRevenueChart));
const PlatformActiveOrdersChart = nextDynamic(() => import("./charts").then(m => m.PlatformActiveOrdersChart));
const PlatformNicheResponseChart = nextDynamic(() => import("./charts").then(m => m.PlatformNicheResponseChart));
const PlatformClientRepeatChart = nextDynamic(() => import("./charts").then(m => m.PlatformClientRepeatChart));
import { LiveStats } from "./live-stats";

export const dynamic = "force-dynamic";

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
    days.push(d.toISOString().slice(5, 10));
  }
  return days;
}

function StatCard({
  label, value, sub, icon: Icon, accent, href, trend,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string;
  href?: string; trend?: { diff: number; up: boolean } | null;
}) {
  const inner = (
    <div className={`rounded-2xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-5 shadow-sm h-full hover:shadow-lg dark:hover:shadow-black/30 transition-all duration-200 group border-l-4 ${accent}`}>
      <div className="flex items-start justify-between mb-3">
        <Icon className="w-4 h-4 text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors" strokeWidth={1.8} />
        {trend && (
          <span className={`flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
            trend.up
              ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
              : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          }`}>
            {trend.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.diff}%
          </span>
        )}
      </div>
      <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tight">{value}</p>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-1">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

type AccentKey = "amber" | "red" | "violet";

const ACCENT_STYLES: Record<AccentKey, { border: string; iconBg: string; iconBgDark: string; iconColor: string; badge: string }> = {
  amber: { border: "border-amber-500", iconBg: "bg-amber-50", iconBgDark: "dark:bg-amber-500/10", iconColor: "text-amber-600", badge: "bg-amber-500" },
  red:   { border: "border-red-600",   iconBg: "bg-red-50",   iconBgDark: "dark:bg-red-500/10",   iconColor: "text-red-600",   badge: "bg-red-500"   },
  violet:{ border: "border-violet-600",iconBg: "bg-violet-50",iconBgDark: "dark:bg-violet-500/10",iconColor: "text-violet-600",badge: "bg-violet-500"},
};

function ActionCard({
  label, sub, icon: Icon, accentKey, href, count: cnt,
}: {
  label: string; sub: string; icon: React.ElementType;
  accentKey: AccentKey; href: string; count: number;
}) {
  const hasAlert = cnt > 0;
  const a = ACCENT_STYLES[accentKey];
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 rounded-2xl px-5 py-4 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg dark:hover:shadow-black/30 transition-all duration-200 group border dark:border-gray-800 ${
        hasAlert ? `border-l-4 ${a.border} border-gray-100` : "border-gray-100"
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
        hasAlert ? `${a.iconBg} ${a.iconBgDark}` : "bg-gray-50 dark:bg-gray-800"
      }`}>
        <Icon className={`w-5 h-5 ${hasAlert ? a.iconColor : "text-gray-400 dark:text-gray-600"}`} strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
      </div>
      {hasAlert && (
        <span className={`text-white text-xs font-bold rounded-full min-w-[24px] h-[24px] flex items-center justify-center px-1.5 ${a.badge}`}>
          {cnt > 99 ? "99+" : cnt}
        </span>
      )}
      <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-700 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors shrink-0" />
    </Link>
  );
}

async function StaffKycDashboard({ actorName }: { actorName: string }) {
  const [pendingCount, approvedCount, rejectedCount, recentApplications] = await Promise.all([
    db.select({ value: count() }).from(kycApplications).where(sql`${kycApplications.status} = 'pending'`).then(r => r[0].value),
    db.select({ value: count() }).from(kycApplications).where(sql`${kycApplications.status} = 'approved'`).then(r => r[0].value),
    db.select({ value: count() }).from(kycApplications).where(sql`${kycApplications.status} = 'rejected'`).then(r => r[0].value),
    db.select({
      id: kycApplications.id, editorId: kycApplications.editorId,
      status: kycApplications.status, createdAt: kycApplications.createdAt,
      name: users.name, email: users.email,
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
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          KYC Review
        </span>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">KYC Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Welcome back, {actorName}.</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending review", value: pendingCount, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-100 dark:border-amber-500/20" },
          { label: "Approved", value: approvedCount, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-100 dark:border-emerald-500/20" },
          { label: "Rejected", value: rejectedCount, color: "text-red-500 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-100 dark:border-red-500/20" },
        ].map(item => (
          <div key={item.label} className={`rounded-2xl border ${item.border} ${item.bg} px-5 py-5`}>
            <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Pending Applications</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Oldest first — review these now</p>
          </div>
          <Link href="/admin/kyc" className="a-link">Open KYC queue →</Link>
        </div>
        {recentApplications.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-8">No pending applications.</p>
        ) : (
          <div className="space-y-2">
            {recentApplications.map(app => (
              <Link key={app.id} href={`/admin/kyc/${app.id}`}
                className="flex items-center gap-4 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{app.name ?? "Unknown"}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{app.email}</p>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{formatDate(app.createdAt)}</p>
                <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

async function StaffDisputeDashboard({ actorName }: { actorName: string }) {
  const [openCount, resolvedCount, recentOpen] = await Promise.all([
    db.select({ value: count() }).from(disputes).where(sql`${disputes.status} = 'open'`).then(r => r[0].value),
    db.select({ value: count() }).from(disputes).where(sql`${disputes.status} = 'resolved'`).then(r => r[0].value),
    db.select({
      id: disputes.id, reason: disputes.reason, status: disputes.status,
      createdAt: disputes.createdAt, packageTitle: packages.title, openedByName: users.name,
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
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Dispute Resolution
        </span>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">Disputes Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Welcome back, {actorName}.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Open disputes", value: openCount, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-100 dark:border-red-500/20" },
          { label: "Resolved", value: resolvedCount, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-100 dark:border-emerald-500/20" },
        ].map(item => (
          <div key={item.label} className={`rounded-2xl border ${item.border} ${item.bg} px-5 py-5`}>
            <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Open Disputes</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Needs your attention</p>
          </div>
          <Link href="/admin/disputes" className="a-link">All disputes →</Link>
        </div>
        {recentOpen.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-8">No open disputes.</p>
        ) : (
          <div className="space-y-2">
            {recentOpen.map(d => (
              <Link key={d.id} href={`/admin/disputes/${d.id}`}
                className="flex items-center gap-4 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{d.packageTitle ?? "Unknown package"}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">Filed by {d.openedByName ?? "user"} · {d.reason.slice(0, 60)}{d.reason.length > 60 ? "…" : ""}</p>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{formatDate(d.createdAt)}</p>
                <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
    thisMonthOrders, thisMonthRevenue, thisMonthSignups,
    lastMonthOrders, lastMonthRevenue,
    todaySignups, weekSignups, pendingPayouts,
    kycApproved, kycPendingCount, kycRejected,
    topEditors, recentActivity, ordersPerDay, signupsPerDay, clientCount,
  ] = await Promise.all([
    db.select({ value: count() }).from(users).then(r => r[0].value),
    db.select({ value: count() }).from(editors).then(r => r[0].value),
    db.select({ value: count() }).from(orders).then(r => r[0].value),
    db.select({ value: count() }).from(orders)
      .where(sql`${orders.status} IN ('pending','in_progress','delivered','revision_requested')`).then(r => r[0].value),
    db.select({ value: count() }).from(disputes).where(sql`${disputes.status} = 'open'`).then(r => r[0].value),
    db.select({ value: sql<number>`COALESCE(SUM(${payouts.commissionAmount}),0)::int` })
      .from(payouts).where(sql`${payouts.status} = 'completed'`).then(r => r[0].value),
    db.select({ value: count() }).from(kycApplications).where(sql`${kycApplications.status} = 'pending'`).then(r => r[0].value),
    db.select({ value: count() }).from(orders).where(sql`${orders.createdAt} >= ${monthStart}`).then(r => r[0].value),
    db.select({ value: sql<number>`COALESCE(SUM(${payouts.commissionAmount}),0)::int` })
      .from(payouts).where(sql`${payouts.status} = 'completed' AND ${payouts.createdAt} >= ${monthStart}`).then(r => r[0].value),
    db.select({ value: count() }).from(users).where(sql`${users.createdAt} >= ${monthStart}`).then(r => r[0].value),
    db.select({ value: count() }).from(orders)
      .where(sql`${orders.createdAt} >= ${lastMonthStart} AND ${orders.createdAt} <= ${lastMonthEnd}`).then(r => r[0].value),
    db.select({ value: sql<number>`COALESCE(SUM(${payouts.commissionAmount}),0)::int` })
      .from(payouts).where(sql`${payouts.status} = 'completed' AND ${payouts.createdAt} >= ${lastMonthStart} AND ${payouts.createdAt} <= ${lastMonthEnd}`).then(r => r[0].value),
    db.select({ value: count() }).from(users).where(sql`${users.createdAt} >= ${todayStart}`).then(r => r[0].value),
    db.select({ value: count() }).from(users).where(sql`${users.createdAt} >= ${weekStart}`).then(r => r[0].value),
    db.select({ value: count() }).from(payouts).where(sql`${payouts.status} = 'pending'`).then(r => r[0].value),
    db.select({ value: count() }).from(editors).where(sql`${editors.kycStatus} = 'approved'`).then(r => r[0].value),
    db.select({ value: count() }).from(editors).where(sql`${editors.kycStatus} = 'pending'`).then(r => r[0].value),
    db.select({ value: count() }).from(editors).where(sql`${editors.kycStatus} = 'rejected'`).then(r => r[0].value),
    db.select({ name: users.name, email: users.email, totalOrders: editors.totalOrders, kycStatus: editors.kycStatus })
      .from(editors).innerJoin(users, eq(users.id, editors.userId))
      .where(sql`${editors.kycStatus} = 'approved'`).orderBy(desc(editors.totalOrders)).limit(5),
    db.select({
      id: auditLogs.id, action: auditLogs.action, entityType: auditLogs.entityType,
      actorRole: auditLogs.actorRole, createdAt: auditLogs.createdAt, actorName: users.name,
    })
      .from(auditLogs).innerJoin(users, eq(users.id, auditLogs.actorId))
      .orderBy(desc(auditLogs.createdAt)).limit(8),
    db.execute(sql`
      SELECT TO_CHAR(DATE_TRUNC('day', ${orders.createdAt}), 'MM-DD') AS date, COUNT(*)::int AS value
      FROM ${orders} WHERE ${orders.createdAt} >= NOW() - INTERVAL '30 days'
      GROUP BY 1 ORDER BY 1
    `),
    db.execute(sql`
      SELECT TO_CHAR(DATE_TRUNC('day', ${users.createdAt}), 'MM-DD') AS date, COUNT(*)::int AS value
      FROM ${users} WHERE ${users.createdAt} >= NOW() - INTERVAL '30 days'
      GROUP BY 1 ORDER BY 1
    `),
    db.select({ value: count() }).from(users).where(sql`${users.role} = 'client'`).then(r => r[0].value),
  ]);

  // ── Admin Dashboard Chart Queries ──
  const [
    platformMonthlyRevenue,
    platformActiveOrdersBreakdown,
    platformNicheResponseTimes,
    platformClientRepeat,
  ] = await Promise.all([
    // 1. platform monthly GTV and commission (over the last 6 months)
    db.execute<{ month: string; gtv: number; commission: number }>(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') AS month,
        COALESCE(SUM(total_amount), 0)::int AS gtv,
        COALESCE(SUM(commission_amount), 0)::int AS commission
      FROM orders
      WHERE status = 'completed'
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `),

    // 2. platform active orders by status
    db.execute<{ status: string; count: number }>(sql`
      SELECT status, COUNT(*)::int AS count
      FROM orders
      WHERE status IN ('pending', 'in_progress', 'delivered', 'revision_requested')
      GROUP BY status
    `),

    // 3. platform response times by category/niche
    db.execute<{ niche: string; avg_response: number }>(sql`
      SELECT
        COALESCE(niche, 'General') AS niche,
        ROUND(AVG(avg_response_time))::int AS avg_response
      FROM editors
      WHERE kyc_status = 'approved' AND avg_response_time IS NOT NULL
      GROUP BY niche
      ORDER BY avg_response ASC
      LIMIT 6
    `),

    // 4. platform client repeat-rates
    db.execute<{ client_type: string; client_count: number }>(sql`
      SELECT
        CASE WHEN order_count >= 2 THEN 'Repeat Buyers' ELSE 'One-time Buyers' END AS client_type,
        COUNT(DISTINCT client_id)::int AS client_count
      FROM (
        SELECT client_id, COUNT(*) AS order_count
        FROM orders
        WHERE status = 'completed'
        GROUP BY client_id
      ) sub
      GROUP BY client_type
    `),
  ]);

  const platformRevenueData = platformMonthlyRevenue.rows.map(r => ({
    month: String(r.month),
    gtv: Number(r.gtv),
    commission: Number(r.commission),
  }));

  const platformActiveOrdersData = platformActiveOrdersBreakdown.rows.map(r => ({
    status: String(r.status),
    count: Number(r.count),
  }));

  const platformNicheResponseData = platformNicheResponseTimes.rows.map(r => ({
    niche: String(r.niche),
    avg_response: Number(r.avg_response),
  }));

  const platformClientRepeatData = platformClientRepeat.rows.map(r => ({
    client_type: String(r.client_type),
    client_count: Number(r.client_count),
  }));

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

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const QUICK_STATS = [
    { label: "New today", value: todaySignups,    light: "text-blue-600   bg-blue-50   border-blue-100",   dark: "dark:text-blue-400   dark:bg-blue-500/10   dark:border-blue-500/20" },
    { label: "New this week", value: weekSignups, light: "text-violet-600 bg-violet-50 border-violet-100", dark: "dark:text-violet-400 dark:bg-violet-500/10 dark:border-violet-500/20" },
    { label: "Month signups", value: thisMonthSignups, light: "text-emerald-600 bg-emerald-50 border-emerald-100", dark: "dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20" },
    { label: "Pending payouts", value: pendingPayouts, light: "text-amber-600 bg-amber-50 border-amber-100", dark: "dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20" },
  ];

  return (
    <div>
      {/* ── Header ── */}
      <div className="bg-white px-8 py-7 border-b border-gray-150">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400 mb-1">Admin Panel</p>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">{greeting}, {actorName}.</h1>
            <p className="text-sm text-neutral-500 mt-1">Platform overview — live stats across users, orders, revenue, and disputes.</p>
          </div>
          <div className="text-right shrink-0 ml-8">
            <p className="text-sm font-bold text-neutral-900">{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long" })}</p>
            <p className="text-xs text-neutral-400 mt-0.5 font-semibold">{new Date().toLocaleDateString("en-IN", { weekday: "long" })}</p>
          </div>
        </div>
        <div className="mt-6">
          <LiveStats initial={{ activeOrders, todaySignups, pendingKyc, openDisputes }} />
        </div>
      </div>

      <div className="px-8 py-7 space-y-7">

        {/* ── Needs Attention ── */}
        <div>
          <p className="a-section-label">Needs Attention</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <ActionCard label="KYC Queue" sub="Pending applications" icon={FileCheck} accentKey="amber" href="/admin/kyc" count={pendingKyc} />
            <ActionCard label="Open Disputes" sub="Needs resolution" icon={AlertTriangle} accentKey="red" href="/admin/disputes" count={openDisputes} />
            <ActionCard label="Pending Payouts" sub="Awaiting processing" icon={Wallet} accentKey="violet" href="/admin/revenue" count={pendingPayouts} />
          </div>
        </div>

        {/* ── Platform Metrics ── */}
        <div>
          <p className="a-section-label">Platform Metrics</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Users" value={totalUsers} icon={Users} accent="border-blue-500" href="/admin/users" />
            <StatCard label="Total Editors" value={totalEditors} sub="Registered on platform" icon={FileCheck} accent="border-violet-500" href="/admin/users?role=editor" />
            <StatCard label="Total Orders" value={totalOrders} sub="All time" icon={ShoppingBag} accent="border-emerald-500" href="/admin/orders" />
            <StatCard label="This Month Orders" value={thisMonthOrders} sub={lastMonthOrders > 0 ? `${lastMonthOrders} last month` : undefined} icon={ShoppingBag} accent="border-indigo-500" href="/admin/orders" trend={orderTrend} />
            <StatCard label="This Month Revenue" value={formatCurrency(thisMonthRevenue)} sub={lastMonthRevenue > 0 ? `${formatCurrency(lastMonthRevenue)} last month` : undefined} icon={DollarSign} accent="border-emerald-500" href="/admin/revenue" trend={revenueTrend} />
            <StatCard label="Platform Revenue" value={formatCurrency(totalRevenue)} sub="Commission all time" icon={TrendingUp} accent="border-teal-500" href="/admin/revenue" />
          </div>
        </div>

        {/* ── Quick signup stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_STATS.map(item => (
            <div key={item.label} className={`rounded-2xl border px-4 py-4 ${item.light} ${item.dark}`}>
              <p className="text-2xl font-black tabular-nums">{item.value}</p>
              <p className="text-xs mt-1 font-medium opacity-70">{item.label}</p>
            </div>
          ))}
        </div>

        {/* ── 30-Day Trends ── */}
        <div>
          <p className="a-section-label">30-Day Trends</p>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Orders</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Daily count — last 30 days</p>
                </div>
                <span className="text-xs font-bold text-brand-primary dark:text-blue-400 bg-blue-50 dark:bg-brand-primary/10 px-2.5 py-1 rounded-full">{thisMonthOrders} this month</span>
              </div>
              <OrdersLineChart data={ordersChartData} />
            </div>
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Signups</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">New registrations — last 30 days</p>
                </div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">{thisMonthSignups} this month</span>
              </div>
              <SignupsBarChart data={signupsChartData} />
            </div>
          </div>
        </div>

        {/* ── User breakdown + Funnel ── */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <p className="font-semibold text-gray-900 dark:text-white mb-1">User breakdown</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Clients vs editor KYC status</p>
            <UserPieChart data={pieData} />
            <div className="flex flex-wrap gap-3 mt-3 justify-center">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <p className="font-semibold text-gray-900 dark:text-white mb-1">Editor funnel</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">Where editors drop off</p>
            <div className="space-y-3">
              {funnelSteps.map((step, i) => {
                const pctOfFirst = funnelSteps[0].value > 0 ? (step.value / funnelSteps[0].value) * 100 : 0;
                const colors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500"];
                return (
                  <div key={step.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-300">{step.label}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {step.value} <span className="text-gray-400 dark:text-gray-500 font-normal">({Math.round(pctOfFirst)}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                      <div className={`${colors[i]} h-2 rounded-full transition-all`} style={{ width: `${pctOfFirst}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Platform Analytics & Performance Charts ── */}
        <div>
          <p className="a-section-label">Platform Performance & Niche Insights</p>
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Platform Revenue */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Earnings & GTV Growth</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Platform volume & net revenue — last 6 months</p>
                </div>
              </div>
              <PlatformRevenueChart data={platformRevenueData} />
            </div>

            {/* Active Platform Workload */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Active Order Distribution</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Workload across order stages</p>
                </div>
              </div>
              <PlatformActiveOrdersChart data={platformActiveOrdersData} />
            </div>

            {/* Editor Response Times by Niche */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Response Times by Niche</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Avg editor response speed (mins)</p>
                </div>
              </div>
              <PlatformNicheResponseChart data={platformNicheResponseData} />
            </div>

            {/* Client Retention */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Client Repeat Rates</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">One-time vs repeat buyers proportion</p>
                </div>
              </div>
              <PlatformClientRepeatChart data={platformClientRepeatData} />
            </div>
          </div>
        </div>

        {/* ── Top Editors + Recent Activity ── */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-bold text-gray-900 dark:text-white">Top Editors</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">By total orders completed</p>
              </div>
              <Link href="/admin/users?role=editor" className="a-link">View all →</Link>
            </div>
            {topEditors.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-8">No completed orders yet.</p>
            ) : (
              <div className="space-y-2">
                {topEditors.map((editor, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                      i === 0 ? "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400"
                      : i === 1 ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      : i === 2 ? "bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400"
                      : "bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600"
                    }`}>{i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 dark:from-gray-700 to-gray-300 dark:to-gray-600 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{(editor.name ?? "?")[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{editor.name ?? "Unknown"}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{editor.email}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                      <ShoppingBag className="w-3 h-3 text-gray-400 dark:text-gray-600" />
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200 tabular-nums">{editor.totalOrders}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-bold text-gray-900 dark:text-white">Recent Activity</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Latest admin actions on the platform</p>
              </div>
              <Link href="/admin/audit" className="a-link">Full log →</Link>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-8">No activity yet.</p>
            ) : (
              <div className="space-y-1">
                {recentActivity.map((item) => {
                  const iconCfg: Record<string, { bg: string; darkBg: string; color: string; Icon: React.ElementType }> = {
                    "kyc.approve":       { bg: "bg-emerald-100", darkBg: "dark:bg-emerald-500/15", color: "text-emerald-600 dark:text-emerald-400", Icon: UserCheck },
                    "kyc.reject":        { bg: "bg-red-100",     darkBg: "dark:bg-red-500/15",     color: "text-red-600 dark:text-red-400",         Icon: UserCheck },
                    "dispute.resolve":   { bg: "bg-amber-100",   darkBg: "dark:bg-amber-500/15",   color: "text-amber-600 dark:text-amber-400",     Icon: AlertTriangle },
                    "user.role_change":  { bg: "bg-blue-100",    darkBg: "dark:bg-blue-500/15",    color: "text-blue-600 dark:text-blue-400",       Icon: Users },
                    "user.suspend":      { bg: "bg-red-100",     darkBg: "dark:bg-red-500/15",     color: "text-red-600 dark:text-red-400",         Icon: Users },
                    "payout.status_change": { bg: "bg-violet-100", darkBg: "dark:bg-violet-500/15", color: "text-violet-600 dark:text-violet-400", Icon: Wallet },
                  };
                  const cfg = iconCfg[item.action] ?? { bg: "bg-gray-100", darkBg: "dark:bg-gray-800", color: "text-gray-500 dark:text-gray-400", Icon: Activity };
                  return (
                    <div key={item.id} className="flex items-start gap-3 px-2 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <div className={`w-7 h-7 rounded-lg ${cfg.bg} ${cfg.darkBg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <cfg.Icon className={`w-3.5 h-3.5 ${cfg.color}`} strokeWidth={1.8} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white leading-snug">
                          <span className="font-semibold">{item.actorName ?? "Admin"}</span>
                          {" "}<span className="text-gray-500 dark:text-gray-400">{ACTION_LABEL[item.action] ?? item.action}</span>
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(item.createdAt)} · {item.actorRole}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <p className="font-bold text-gray-900 dark:text-white mb-4">Quick Actions</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Review KYC",       href: "/admin/kyc",           icon: FileCheck,    cls: "bg-amber-50 dark:bg-amber-500/10  text-amber-700  dark:text-amber-400  hover:bg-amber-100  dark:hover:bg-amber-500/20  border border-amber-100  dark:border-amber-500/20" },
              { label: "Resolve Disputes", href: "/admin/disputes",      icon: AlertTriangle,cls: "bg-red-50   dark:bg-red-500/10    text-red-700    dark:text-red-400    hover:bg-red-100    dark:hover:bg-red-500/20    border border-red-100    dark:border-red-500/20" },
              { label: "Pending Payouts",  href: "/admin/revenue",       icon: Wallet,       cls: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20 border border-violet-100 dark:border-violet-500/20" },
              { label: "Manage Users",     href: "/admin/users",         icon: Users,        cls: "bg-blue-50  dark:bg-blue-500/10   text-blue-700   dark:text-blue-400   hover:bg-blue-100   dark:hover:bg-blue-500/20   border border-blue-100   dark:border-blue-500/20" },
              { label: "All Orders",       href: "/admin/orders",        icon: ShoppingBag,  cls: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-100 dark:border-emerald-500/20" },
              { label: "Add Staff",        href: "/admin/staff",         icon: UserPlus,     cls: "bg-gray-50  dark:bg-gray-800      text-gray-700   dark:text-gray-300   hover:bg-gray-100   dark:hover:bg-gray-700/60   border border-gray-200   dark:border-gray-700" },
              { label: "Announcements",    href: "/admin/announcements", icon: Zap,          cls: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-100 dark:border-indigo-500/20" },
              { label: "Audit Log",        href: "/admin/audit",         icon: Activity,     cls: "bg-gray-50  dark:bg-gray-800      text-gray-700   dark:text-gray-300   hover:bg-gray-100   dark:hover:bg-gray-700/60   border border-gray-200   dark:border-gray-700" },
            ].map(({ label, href, icon: Icon, cls }) => (
              <Link key={href} href={href} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${cls}`}>
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── System health ── */}
        <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-900/10 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">All systems operational</p>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-500">No active maintenance mode · Payments, orders, and KYC running normally</p>
              </div>
            </div>
            <Link href="/admin/announcements" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline underline-offset-2 shrink-0">
              Post notice →
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
