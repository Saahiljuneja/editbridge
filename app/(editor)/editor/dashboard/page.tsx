export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  editors, orders, reviews, messages, packages,
  users, disputes, portfolioItems, preOrderQuestions,
  userPoints, userCredits,
} from "@/lib/db/schema";
import { and, eq, sql, ne, desc, isNull, gte, lte } from "drizzle-orm";
import { calcLevel, getLevelPerks, LEVELS } from "@/lib/rewards";
import type { Level } from "@/lib/rewards";
import { formatCurrency, displayNameFromFull, formatDate, formatDateTime } from "@/lib/utils";
import {
  ShoppingBag, AlertCircle, Clock, CheckCircle2,
  Star, ArrowRight, Zap, IndianRupee,
  Package, MessageSquare, AlertTriangle, RefreshCw,
  TrendingUp, ImageIcon, BadgeCheck, Share2, CircleDot,
  HelpCircle, Film, Banknote,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AutoPauseBanner } from "./auto-pause-banner";
import { DeadlineCountdown } from "@/components/orders/deadline-countdown";
import { AvailabilityToggle } from "@/components/editor/availability-toggle";
import { TopoBackground } from "@/components/common/topo-background";
import { EditorDashboardCharts } from "./dashboard-charts";

export default async function EditorDashboardPage() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  const editorId = session.user.editorId;
  const firstName = displayNameFromFull(session.user.name);

  if (!editorId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-[#0EA5E9]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Complete your setup</h2>
          <p className="text-sm text-gray-500 mb-6">
            Your editor profile isn&apos;t set up yet. Complete KYC to start accepting orders.
          </p>
          <Link
            href="/editor/kyc"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[#0EA5E9] hover:bg-sky-600 transition-colors"
          >
            Complete setup <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  const creditExpirySoon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    editorRow, activeOrders, recentReviews,
    earningsRow, monthEarningsRow, unreadCountRow,
    ratingRow, openDisputeCount, activePackages,
    pendingPayoutRow, portfolioRows, unansweredQuestionCount,
    xpRow, weekOrdersRow, expiringCredits,
  ] = await Promise.all([
    db.select({
      bio: editors.bio, totalOrders: editors.totalOrders,
      completionRate: editors.completionRate, avgResponseTime: editors.avgResponseTime,
      createdAt: editors.createdAt, kycStatus: editors.kycStatus, kycApprovedAt: editors.kycApprovedAt,
      isAvailable: editors.isAvailable, displayName: editors.displayName,
      niche: editors.niche,
    }).from(editors).where(eq(editors.id, editorId)).limit(1).then(r => r[0]),

    db.select({
      id: orders.id, status: orders.status,
      totalAmount: orders.totalAmount, commissionAmount: orders.commissionAmount,
      deadline: orders.deadline, createdAt: orders.createdAt,
      packageTitle: packages.title, clientName: users.name,
    }).from(orders)
      .leftJoin(packages, eq(packages.id, orders.packageId))
      .innerJoin(users, eq(users.id, orders.clientId))
      .where(and(eq(orders.editorId, editorId), sql`${orders.status} IN ('pending','in_progress','delivered','revision_requested')`))
      .orderBy(sql`${orders.deadline} ASC NULLS LAST`).limit(8),

    db.select({ id: reviews.id, rating: reviews.rating, text: reviews.text, createdAt: reviews.createdAt })
      .from(reviews)
      .where(and(eq(reviews.revieweeId, session.user.userId!), eq(reviews.role, "client")))
      .orderBy(desc(reviews.createdAt)).limit(3),

    db.select({ total: sql<number>`COALESCE(SUM(${orders.totalAmount} - ${orders.commissionAmount}),0)::int` })
      .from(orders).where(and(eq(orders.editorId, editorId), eq(orders.status, "completed"))).then(r => r[0]),

    db.select({ total: sql<number>`COALESCE(SUM(${orders.totalAmount} - ${orders.commissionAmount}),0)::int` })
      .from(orders).where(and(eq(orders.editorId, editorId), eq(orders.status, "completed"), sql`${orders.updatedAt} >= ${monthStart}`)).then(r => r[0]),

    db.select({ count: sql<number>`COUNT(*)::int` })
      .from(messages).innerJoin(orders, eq(messages.orderId, orders.id))
      .where(
        and(
          eq(orders.editorId, editorId),
          ne(messages.senderId, session.user.userId!),
          eq(messages.isRead, false),
          sql`${orders.status} IN ('pending','in_progress','delivered','revision_requested')`,
          eq(messages.isBlocked, false)
        )
      )
      .then(r => r[0]),

    db.select({ avg: sql<number>`ROUND(AVG(${reviews.rating})::numeric, 1)`, count: sql<number>`COUNT(*)::int` })
      .from(reviews).where(and(eq(reviews.revieweeId, session.user.userId!), eq(reviews.role, "client"))).then(r => r[0]),

    db.select({ count: sql<number>`COUNT(*)::int` })
      .from(disputes).innerJoin(orders, eq(orders.id, disputes.orderId))
      .where(and(eq(orders.editorId, editorId), eq(disputes.status, "open"))).then(r => r[0]),

    db.select({ isActive: packages.isActive })
      .from(packages).where(eq(packages.editorId, editorId)),

    db.select({ total: sql<number>`COALESCE(SUM(${orders.totalAmount} - ${orders.commissionAmount}),0)::int` })
      .from(orders).where(and(eq(orders.editorId, editorId), sql`${orders.status} IN ('pending','in_progress','delivered','revision_requested')`)).then(r => r[0]),

    db.select({ id: portfolioItems.id })
      .from(portfolioItems).where(eq(portfolioItems.editorId, editorId)),

    db.select({ count: sql<number>`COUNT(*)::int` })
      .from(preOrderQuestions)
      .where(and(
        eq(preOrderQuestions.editorId, editorId),
        isNull(preOrderQuestions.answer),
        sql`${preOrderQuestions.askedAt} <= NOW() - INTERVAL '6 hours'`
      )).then(r => r[0]),

    db.select({ total: userPoints.total, level: userPoints.level })
      .from(userPoints)
      .where(eq(userPoints.userId, session.user.userId!))
      .limit(1).then(r => r[0] ?? null),

    db.select({ c: sql<number>`COUNT(*)::int` })
      .from(orders)
      .where(and(eq(orders.editorId, editorId), eq(orders.status, "completed"), gte(orders.updatedAt, weekStart)))
      .then(r => r[0]),

    db.select({ amount: userCredits.amount, expiresAt: userCredits.expiresAt })
      .from(userCredits)
      .where(and(
        eq(userCredits.userId, session.user.userId!),
        isNull(userCredits.usedAt),
        gte(userCredits.expiresAt, now),
        lte(userCredits.expiresAt, creditExpirySoon),
      )),
  ]);

  const [monthlyEarnings, activeOrdersBreakdown, responseTimeData, clientRepeatData] = await Promise.all([
    db.execute<{ month: string; earnings: number }>(sql`
      SELECT TO_CHAR(DATE_TRUNC('month', updated_at), 'Mon YY') AS month,
        COALESCE(SUM(total_amount - commission_amount), 0)::int AS earnings
      FROM orders
      WHERE editor_id = ${editorId}::uuid AND status = 'completed'
        AND updated_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', updated_at)
      ORDER BY DATE_TRUNC('month', updated_at)
    `),
    db.execute<{ status: string; count: number }>(sql`
      SELECT status, COUNT(*)::int AS count FROM orders
      WHERE editor_id = ${editorId}::uuid
        AND status IN ('pending', 'in_progress', 'delivered', 'revision_requested')
      GROUP BY status
    `),
    db.execute<{ name: string; value: number }>(sql`
      SELECT 'My Avg'::text AS name, COALESCE(${editors.avgResponseTime}, 0)::int AS value
      FROM editors WHERE id = ${editorId}::uuid
      UNION ALL
      SELECT 'Category Avg'::text AS name, COALESCE(AVG(avg_response_time), 0)::int AS value
      FROM editors WHERE niche = ${editorRow?.niche ?? ""} AND id != ${editorId}::uuid
    `),
    db.execute<{ client_type: string; client_count: number }>(sql`
      SELECT CASE WHEN client_order_count >= 2 THEN 'Repeat' ELSE 'New' END AS client_type,
        COUNT(DISTINCT client_id)::int AS client_count
      FROM (
        SELECT client_id, COUNT(*) AS client_order_count FROM orders
        WHERE editor_id = ${editorId}::uuid GROUP BY client_id
      ) sub GROUP BY client_type
    `),
  ]);

  const myResponseTime = responseTimeData.rows[0]?.value ?? 0;
  let categoryResponseTime = responseTimeData.rows[1]?.value ?? 0;
  if (!categoryResponseTime) {
    const globalAvgResult = await db.execute<{ avg: number }>(sql`
      SELECT COALESCE(AVG(avg_response_time), 0)::int AS avg FROM editors WHERE id != ${editorId}::uuid
    `);
    categoryResponseTime = globalAvgResult.rows[0]?.avg ?? 0;
  }
  const finalResponseTimeData = [
    { name: "My Avg", value: myResponseTime },
    { name: "Category Avg", value: categoryResponseTime },
  ];

  const totalEarnings  = earningsRow?.total     ?? 0;
  const monthEarnings  = monthEarningsRow?.total ?? 0;
  const unreadMessages = unreadCountRow?.count   ?? 0;
  const avgRating      = ratingRow?.avg ? Number(ratingRow.avg) : null;
  const totalReviews   = ratingRow?.count        ?? 0;
  const openDisputes   = openDisputeCount?.count ?? 0;
  const staleQuestions = unansweredQuestionCount?.count ?? 0;
  const isAvailable    = editorRow?.isAvailable  ?? true;
  const pkgCount       = activePackages.filter(p => p.isActive).length;
  const pendingPayout  = pendingPayoutRow?.total ?? 0;
  const portCount      = portfolioRows.length;

  const needsAction = activeOrders.filter(o => o.status === "revision_requested" || o.status === "pending");
  const inProgress  = activeOrders.filter(o => o.status !== "revision_requested" && o.status !== "pending");

  const xpTotal   = xpRow?.total ?? 0;
  const xpLevel   = (xpRow?.level ?? "bronze") as Level;
  const levelMeta = LEVELS.find(l => l.name === xpLevel)!;
  const nextLevel = LEVELS.find(l => l.min > xpTotal);
  const xpPct     = nextLevel
    ? Math.min(100, ((xpTotal - levelMeta.min) / (nextLevel.min - levelMeta.min)) * 100)
    : 100;
  const weekOrders  = weekOrdersRow?.c ?? 0;
  const expiringAmt = expiringCredits.reduce((s, c) => s + c.amount, 0);
  const earliestExp = expiringCredits.length
    ? expiringCredits.reduce((a, b) => (a.expiresAt! < b.expiresAt! ? a : b)).expiresAt
    : null;

  const LEVEL_COLORS: Record<Level, string> = {
    bronze: "#D97706", silver: "#6B7280", gold: "#CA8A04", platinum: "#4F46E5",
    diamond: "#0891B2", master: "#9333EA", legend: "#DC2626",
  };
  const LEVEL_EMOJIS: Record<Level, string> = {
    bronze: "🥉", silver: "🥈", gold: "🥇", platinum: "💎",
    diamond: "💠", master: "👑", legend: "🔥",
  };
  const xpColor = LEVEL_COLORS[xpLevel];
  const RING_R = 28;
  const RING_C = +(2 * Math.PI * RING_R).toFixed(2);

  const STATUS_STYLES: Record<string, { label: string; dot: string; badge: string }> = {
    pending:            { label: "Pending",     dot: "bg-gray-400",    badge: "bg-gray-100 text-gray-600"   },
    in_progress:        { label: "In Progress", dot: "bg-[#0EA5E9]",   badge: "bg-sky-100 text-sky-700"     },
    delivered:          { label: "Delivered",   dot: "bg-[#0EA5E9]",   badge: "bg-sky-100 text-sky-700"     },
    revision_requested: { label: "Revision",    dot: "bg-amber-500",   badge: "bg-amber-100 text-amber-700" },
  };

  const profileHref  = `/editor/${editorId}`;
  const kycApproved  = editorRow?.kycStatus === "approved";
  const greeting     = now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening";

  const KPI_CARDS = [
    {
      label: "This Month", value: formatCurrency(monthEarnings),
      sub: `${formatCurrency(totalEarnings)} lifetime`,
      icon: IndianRupee, topBorder: "border-t-2 border-emerald-500",
      iconBg: "bg-emerald-50", iconCls: "text-emerald-600", numCls: "text-gray-900",
    },
    {
      label: "Active Orders", value: String(activeOrders.length),
      sub: needsAction.length > 0 ? `${needsAction.length} need action` : "All on track",
      icon: ShoppingBag, topBorder: "border-t-2 border-[#0EA5E9]",
      iconBg: "bg-sky-50", iconCls: "text-[#0EA5E9]", numCls: "text-[#0EA5E9]",
    },
    {
      label: "Pending Payout", value: formatCurrency(pendingPayout),
      sub: "From active orders",
      icon: Banknote, topBorder: "border-t-2 border-amber-400",
      iconBg: "bg-amber-50", iconCls: "text-amber-600", numCls: "text-gray-900",
    },
    {
      label: "Avg Rating", value: avgRating ? `${avgRating} ★` : "—",
      sub: `${totalReviews} review${totalReviews !== 1 ? "s" : ""}`,
      icon: Star, topBorder: "border-t-2 border-amber-300",
      iconBg: "bg-amber-50", iconCls: "text-amber-500", numCls: "text-gray-900",
    },
  ];

  const PERF_CARDS = [
    {
      icon: Clock, label: "Avg Response",
      value: editorRow?.avgResponseTime
        ? editorRow.avgResponseTime < 60 ? `${editorRow.avgResponseTime}m` : `${Math.round(editorRow.avgResponseTime / 60)}h`
        : "—",
      iconBg: "bg-sky-50", iconCls: "text-[#0EA5E9]",
    },
    {
      icon: CheckCircle2, label: "Completion",
      value: editorRow?.completionRate != null ? `${editorRow.completionRate}%` : "—",
      iconBg: "bg-emerald-50", iconCls: "text-emerald-600",
    },
    {
      icon: ShoppingBag, label: "Completed",
      value: String(editorRow?.totalOrders ?? 0),
      iconBg: "bg-amber-50", iconCls: "text-amber-600",
    },
    {
      icon: ImageIcon, label: "Portfolio",
      value: String(portCount),
      iconBg: "bg-sky-50", iconCls: "text-[#0EA5E9]",
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#ffffff] pb-12 overflow-hidden">
      {/* Topographic backdrop */}
      <TopoBackground background="#ffffff" strokeColor="#f3f4f6" opacity={0.6} />

      <div className="max-w-5xl mx-auto px-6 pt-6 space-y-6 relative z-10">
        {/* Dashboard Header */}
        <div className="bg-[#ffffff] rounded-3xl border border-neutral-200/50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm relative z-10">
          <div className="flex items-center gap-4">
            {session.user.image ? (
              <img
                src={session.user.image} alt="" width={44} height={44}
                className="w-11 h-11 rounded-xl object-cover shrink-0 ring-2 ring-neutral-200/20"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center shrink-0 text-white font-black text-lg">
                {(session.user.name ?? "E")[0].toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-black text-neutral-900 tracking-tight leading-none">
                Good {greeting}, {firstName}
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                  isAvailable ? "bg-emerald-50 text-emerald-700 border border-emerald-200/35" : "bg-neutral-100 text-neutral-500 border border-neutral-200/35"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", isAvailable ? "bg-emerald-500" : "bg-neutral-400")} />
                  {isAvailable ? "Available" : "Paused"}
                </span>
                {kycApproved && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                    <BadgeCheck className="w-3.5 h-3.5" /> Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side info links */}
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">This month</p>
              <p className="text-lg font-black text-neutral-900 tabular-nums">{formatCurrency(monthEarnings)}</p>
            </div>
            <Link
              href={profileHref}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-200 bg-[#ffffff] hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-colors shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5 text-neutral-400" /> Public profile
            </Link>
          </div>
        </div>

        {/* Status banners */}
        <div className="space-y-3 relative z-10">
          {editorRow?.kycStatus === "pending" && (
            <div className="flex items-center gap-3 rounded-2xl bg-amber-50/50 border border-amber-200 px-4 py-3 shadow-sm">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-800 font-bold uppercase tracking-wider flex-1">Complete KYC verification to start receiving orders.</p>
              <Link href="/editor/kyc" className="text-xs font-bold text-amber-700 hover:text-amber-900 whitespace-nowrap">
                Complete KYC →
              </Link>
            </div>
          )}
          {editorRow?.kycStatus === "rejected" && (
            <div className="flex items-center gap-3 rounded-2xl bg-red-50/50 border border-red-200 px-4 py-3 shadow-sm">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-800 font-bold uppercase tracking-wider flex-1">Your KYC was rejected. Re-submit with a valid government ID.</p>
              <Link href="/editor/kyc" className="text-xs font-bold text-red-700 whitespace-nowrap">Re-submit →</Link>
            </div>
          )}
          {kycApproved && editorRow?.kycApprovedAt && (() => {
            const approvedAt = new Date(editorRow.kycApprovedAt);
            const expiryDate = new Date(approvedAt.getTime() + 365 * 24 * 60 * 60 * 1000);
            const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / 86_400_000);
            return daysLeft <= 60 ? (
              <div className="flex items-center gap-3 rounded-2xl bg-amber-50/50 border border-amber-200 px-4 py-3 shadow-sm">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-800 font-bold uppercase tracking-wider flex-1">
                  KYC expires in <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong> ({formatDate(expiryDate)}).
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl bg-[#ffffff] border border-neutral-200/50 px-4 py-3 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <p className="text-xs text-neutral-400 font-semibold">
                  KYC verified {formatDate(approvedAt)} · valid until {formatDate(expiryDate)}
                </p>
              </div>
            );
          })()}
          {kycApproved && activeOrders.length === 0 && totalEarnings === 0 && (
            <div className="flex items-center gap-3 rounded-2xl bg-indigo-50/50 border border-indigo-200 px-4 py-3 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
              <p className="text-xs text-indigo-800 font-bold uppercase tracking-wider flex-1">Your profile is live! Share it to start receiving orders.</p>
              <Link href={profileHref} className="text-xs font-bold text-indigo-600 whitespace-nowrap">
                Share profile →
              </Link>
            </div>
          )}
          {expiringAmt > 0 && earliestExp && (
            <div className="flex items-center gap-3 rounded-2xl bg-amber-50/50 border border-amber-200 px-4 py-3 shadow-sm">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-800 font-bold uppercase tracking-wider flex-1">
                <strong>₹{(expiringAmt / 100).toFixed(0)} in credits</strong> expire on{" "}
                {new Date(earliestExp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} — use them on your next order.
              </p>
              <Link href="/editor/rewards" className="text-xs font-bold text-amber-700 whitespace-nowrap">View →</Link>
            </div>
          )}
        </div>

        {/* Auto-pause */}
        {activeOrders.length >= 3 && kycApproved && isAvailable && (
          <AutoPauseBanner activeCount={activeOrders.length} />
        )}

        {/* Disputes alert */}
        {openDisputes > 0 && (
          <Link href="/editor/disputes"
            className="flex items-center gap-4 bg-red-50/50 border border-red-200 rounded-3xl px-5 py-4 hover:bg-red-100/50 transition-colors group shadow-sm relative z-10">
            <div className="w-9 h-9 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-900 leading-tight">
                {openDisputes} open dispute{openDisputes !== 1 ? "s" : ""} need{openDisputes === 1 ? "s" : ""} your response
              </p>
              <p className="text-xs text-red-600 mt-1 font-semibold">Respond promptly to help resolve these orders.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-red-400 group-hover:text-red-600 shrink-0 transition-colors" />
          </Link>
        )}

        {/* Stale questions */}
        {staleQuestions > 0 && (
          <Link href="/editor/questions"
            className="flex items-center gap-4 bg-amber-50/50 border border-amber-200 rounded-3xl px-5 py-4 hover:bg-amber-100/50 transition-colors group shadow-sm relative z-10">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900 leading-tight">
                {staleQuestions} unanswered question{staleQuestions !== 1 ? "s" : ""} from potential clients
              </p>
              <p className="text-xs text-amber-600 mt-1 font-semibold">Asked over 6 hours ago — quick replies win more orders.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-400 group-hover:text-amber-600 shrink-0 transition-colors" />
          </Link>
        )}

        {/* Needs attention */}
        {needsAction.length > 0 && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50/30 overflow-hidden shadow-sm relative z-10">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-100 bg-amber-50/50">
              <RefreshCw className="w-4 h-4 text-amber-600" />
              <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">Needs attention</p>
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                {needsAction.length}
              </span>
            </div>
            <div className="divide-y divide-amber-100/40 bg-[#ffffff]/60">
              {needsAction.map(order => (
                <Link key={order.id} href={`/editor/orders/${order.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-amber-50/30 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CircleDot className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <p className="text-sm font-bold text-neutral-900 truncate">{order.packageTitle}</p>
                    </div>
                    <p className="text-xs text-amber-700 ml-5 mt-1 font-semibold">
                      {order.status === "revision_requested" ? "Client requested revisions" : "Awaiting your start"}
                      {order.deadline && <> · <DeadlineCountdown deadline={order.deadline.toISOString()} /></>}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-700 shrink-0 ml-3 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          {KPI_CARDS.map(({ label, value, sub, icon: Icon, topBorder, iconBg, iconCls, numCls }) => (
            <div key={label} className={cn("bg-[#ffffff] rounded-3xl border border-neutral-200/50 p-5 shadow-sm", topBorder)}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{label}</p>
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", iconBg)}>
                  <Icon className={cn("w-4 h-4", iconCls)} />
                </div>
              </div>
              <p className={cn("text-2xl font-black leading-none mb-1.5 tabular-nums", numCls)}>{value}</p>
              <p className={cn(
                "text-xs font-semibold",
                label === "Active Orders" && needsAction.length > 0 ? "text-amber-600" : "text-neutral-400"
              )}>{sub}</p>
            </div>
          ))}
        </div>

        {/* XP widget */}
        <Link href="/editor/rewards"
          className="block bg-[#ffffff] rounded-3xl border border-neutral-200/50 shadow-sm px-5 py-4 hover:border-neutral-300 transition-colors relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 shrink-0">
              <svg viewBox="0 0 64 64" className="w-full h-full" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="32" cy="32" r={RING_R} fill="none" stroke="currentColor" strokeWidth="5" className="text-neutral-100" />
                <circle cx="32" cy="32" r={RING_R} fill="none" stroke={xpColor} strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - xpPct / 100)} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xl select-none">
                {LEVEL_EMOJIS[xpLevel]}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-neutral-900 tabular-nums">{xpTotal.toLocaleString()}</span>
                <span className="text-xs text-neutral-450 font-bold">XP</span>
                <span className="text-[9px] font-extrabold uppercase tracking-wider ml-1 px-2 py-0.5 rounded-full text-white"
                  style={{ background: xpColor }}>
                  {xpLevel}
                </span>
              </div>
              {nextLevel ? (
                <p className="text-xs text-neutral-400 mt-0.5 font-semibold">
                  {(nextLevel.min - xpTotal).toLocaleString()} XP to {nextLevel.name.charAt(0).toUpperCase() + nextLevel.name.slice(1)}
                </p>
              ) : (
                <p className="text-xs font-bold mt-0.5" style={{ color: xpColor }}>Max level reached 🎉</p>
              )}
            </div>
            <div className="hidden sm:flex flex-col items-center gap-0.5 shrink-0 border-l border-neutral-100 pl-4">
              <span className="text-2xl select-none">{weekOrders > 0 ? "🔥" : "💤"}</span>
              <p className="text-sm font-black text-neutral-900 tabular-nums">{weekOrders}/5</p>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">this week</p>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-300 shrink-0" />
          </div>
        </Link>

        {/* Main grid */}
        <div className="grid lg:grid-cols-3 gap-5 relative z-10">

          {/* Left: charts + orders + perf + reviews */}
          <div className="lg:col-span-2 space-y-5">

            <EditorDashboardCharts
              earningsData={monthlyEarnings.rows.map(r => ({ month: String(r.month), earnings: Number(r.earnings) }))}
              activeOrderData={activeOrdersBreakdown.rows.map(r => ({ status: String(r.status), count: Number(r.count) }))}
              responseTimeData={finalResponseTimeData}
              clientRepeatData={clientRepeatData.rows.map(r => ({ client_type: String(r.client_type), client_count: Number(r.client_count) }))}
            />

            {/* Active orders */}
            <div className="bg-[#ffffff] rounded-3xl border border-neutral-200/50 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-neutral-900 text-xs uppercase tracking-wider">Active Orders</h2>
                  {activeOrders.length > 0 && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-black text-white">
                      {activeOrders.length}
                    </span>
                  )}
                </div>
                <Link href="/editor/orders"
                  className="text-xs font-bold text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {activeOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-50 border border-neutral-200/30 flex items-center justify-center mb-3">
                    <ShoppingBag className="w-5 h-5 text-neutral-300" />
                  </div>
                  <p className="font-bold text-neutral-800 text-sm">No active orders</p>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xs font-semibold">
                    {kycApproved ? "Share your profile link to start receiving orders." : "Complete KYC to start receiving orders."}
                  </p>
                  <Link href={kycApproved ? profileHref : "/editor/kyc"}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-black hover:bg-neutral-900 transition-colors shadow-sm">
                    {kycApproved ? "View public profile" : "Complete KYC"} <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {[...needsAction, ...inProgress].slice(0, 6).map(order => {
                    const s = STATUS_STYLES[order.status];
                    return (
                      <Link key={order.id} href={`/editor/orders/${order.id}`}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50/50 transition-colors group">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", s.dot)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-neutral-900 truncate mb-0.5">{order.packageTitle}</p>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider", s.badge)}>
                              {s.label}
                            </span>
                            <span className="text-xs text-neutral-400 font-semibold">{displayNameFromFull(order.clientName ?? "Client")}</span>
                            {order.deadline && (
                              <>
                                <span className="text-neutral-200 text-xs select-none">·</span>
                                <DeadlineCountdown deadline={order.deadline.toISOString()} />
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-black text-neutral-900 tabular-nums">
                            {formatCurrency(order.totalAmount - order.commissionAmount)}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-black transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Performance row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PERF_CARDS.map(({ icon: Icon, label, value, iconBg, iconCls }) => (
                <div key={label} className="bg-[#ffffff] rounded-2xl border border-neutral-200/50 p-4 flex items-center gap-3 shadow-sm">
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
                    <Icon className={cn("w-4 h-4", iconCls)} />
                  </div>
                  <div>
                    <p className="text-base font-black text-neutral-900 leading-none mb-0.5 tabular-nums">{value}</p>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent reviews */}
            {recentReviews.length > 0 && (
              <div className="bg-[#ffffff] rounded-3xl border border-neutral-200/50 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                  <h2 className="font-extrabold text-neutral-900 text-xs uppercase tracking-wider">Recent Reviews</h2>
                  {avgRating && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn("w-3 h-3 select-none", i < Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-neutral-200")} />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-neutral-700">{avgRating}</span>
                      <span className="text-xs text-neutral-400 font-semibold">({totalReviews})</span>
                    </div>
                  )}
                </div>
                <div className="divide-y divide-neutral-100">
                  {recentReviews.map(review => (
                    <div key={review.id} className="px-5 py-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn("w-3 h-3 select-none", i < review.rating ? "fill-amber-400 text-amber-400" : "text-neutral-200")} />
                          ))}
                        </div>
                        <span className="text-[10px] text-neutral-450 font-bold">{formatDate(review.createdAt)}</span>
                      </div>
                      {review.text && <p className="text-xs text-neutral-600 font-semibold leading-relaxed line-clamp-2">{review.text}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            <AvailabilityToggle initial={isAvailable} kycApproved={kycApproved} />

            {/* Earnings */}
            <div className="bg-[#ffffff] rounded-3xl border border-neutral-200/50 border-t-2 border-t-emerald-500 shadow-sm p-5">
              <p className="font-extrabold text-neutral-900 text-xs uppercase tracking-wider mb-4">Earnings</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0EA5E9] shrink-0" />
                    <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">This month</span>
                  </div>
                  <span className="text-sm font-black text-neutral-900 tabular-nums">{formatCurrency(monthEarnings)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Pending</span>
                  </div>
                  <span className="text-sm font-black text-amber-600 tabular-nums">{formatCurrency(pendingPayout)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-neutral-305 shrink-0" />
                    <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">All-time</span>
                  </div>
                  <span className="text-sm font-black text-neutral-900 tabular-nums">{formatCurrency(totalEarnings)}</span>
                </div>
              </div>
              <Link href="/editor/payouts"
                className="mt-4 flex items-center justify-between text-xs font-bold text-indigo-650 hover:underline">
                View payouts <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Quick links */}
            <div className="bg-[#ffffff] rounded-3xl border border-neutral-200/50 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <h2 className="font-extrabold text-neutral-900 text-xs uppercase tracking-wider">Quick Access</h2>
              </div>
              <div className="p-3 space-y-1">
                {[
                  { href: "/feed",             icon: Film,          label: "Editor Feed", sub: "Discover all work" },
                  { href: "/editor/packages",  icon: Package,       label: "Packages",   sub: `${pkgCount} active` },
                  { href: "/editor/messages",  icon: MessageSquare, label: "Messages",   sub: unreadMessages > 0 ? `${unreadMessages} unread` : "All read" },
                  { href: "/editor/analytics", icon: TrendingUp,    label: "Analytics",  sub: "Earnings & stats" },
                  { href: "/editor/rewards",   icon: Zap,           label: "Rewards",    sub: "XP & badges" },
                ].map(({ href, icon: Icon, label, sub }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50/50 transition-colors group">
                    <div className="w-8 h-8 rounded-xl bg-neutral-100 border border-neutral-200/30 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-neutral-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-neutral-800">{label}</p>
                      <p className="text-xs text-neutral-400 font-semibold">{sub}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-black transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
