export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, messages, editors, users, reviews, savedEditors } from "@/lib/db/schema";
import { and, eq, sql, desc, ne } from "drizzle-orm";
import { formatCurrency, displayNameFromFull, cn } from "@/lib/utils";
import {
  ArrowRight, MessageSquare, Star,
  Search, AlertTriangle, CheckCircle2,
  RefreshCw, Clock, Users, Plus, Bell, ChevronDown,
  Folder, Gift, Package, IndianRupee,
} from "lucide-react";
import Link from "next/link";
import { TopoBackground } from "@/components/common/topo-background";

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function ClientDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.userId!;
  const fullName = session.user.name ?? "";
  const firstName = displayNameFromFull(fullName) || "there";

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const [activeOrders, statsRow, unreadRow, savedEditorsList, recommendedEditors, recentActivity] =
    await Promise.all([
      // Active orders (not completed / cancelled)
      db
        .select({
          id: orders.id,
          status: orders.status,
          deadline: orders.deadline,
          packageTitle: packages.title,
          editorName: users.name,
        })
        .from(orders)
        .leftJoin(packages, eq(packages.id, orders.packageId))
        .innerJoin(editors, eq(editors.id, orders.editorId))
        .innerJoin(users, eq(users.id, editors.userId))
        .where(and(eq(orders.clientId, userId), sql`${orders.status} NOT IN ('completed','cancelled')`))
        .orderBy(sql`${orders.deadline} ASC NULLS LAST`)
        .limit(5),

      // Lifetime stats
      db
        .select({
          completed:  sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'completed')::int`,
          totalSpent: sql<number>`COALESCE(SUM(${orders.totalAmount}) FILTER (WHERE ${orders.status} = 'completed'), 0)::int`,
        })
        .from(orders)
        .where(eq(orders.clientId, userId))
        .then(r => r[0]),

      // Unread messages
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(messages)
        .innerJoin(orders, eq(messages.orderId, orders.id))
        .where(
          and(
            eq(orders.clientId, userId),
            ne(messages.senderId, userId),
            eq(messages.isRead, false),
            sql`${orders.status} NOT IN ('completed','cancelled')`,
            eq(messages.isBlocked, false)
          )
        )
        .then(r => r[0]),

      // Saved editors (count only)
      db
        .select({ editorId: editors.id })
        .from(savedEditors)
        .innerJoin(editors, eq(editors.id, savedEditors.editorId))
        .where(eq(savedEditors.clientId, userId)),

      // Top available editors by avg rating
      db
        .select({
          editorId:    editors.id,
          name:        users.name,
          displayName: editors.displayName,
          image:       users.image,
          title:       editors.title,
          totalOrders: editors.totalOrders,
          avgRating:   sql<number | null>`ROUND(AVG(${reviews.rating})::numeric, 1)`,
          reviewCount: sql<number>`COUNT(DISTINCT ${reviews.id})::int`,
        })
        .from(editors)
        .innerJoin(users, eq(users.id, editors.userId))
        .leftJoin(reviews, and(eq(reviews.revieweeId, editors.userId), eq(reviews.role, "client")))
        .where(eq(editors.isAvailable, true))
        .groupBy(editors.id, users.id)
        .orderBy(sql`AVG(${reviews.rating}) DESC NULLS LAST`, desc(editors.totalOrders))
        .limit(4),

      // Recent order activity (last 5 by updated)
      db
        .select({
          id:           orders.id,
          status:       orders.status,
          updatedAt:    orders.updatedAt,
          packageTitle: packages.title,
          editorName:   users.name,
        })
        .from(orders)
        .leftJoin(packages, eq(packages.id, orders.packageId))
        .innerJoin(editors, eq(editors.id, orders.editorId))
        .innerJoin(users, eq(users.id, editors.userId))
        .where(eq(orders.clientId, userId))
        .orderBy(desc(orders.updatedAt))
        .limit(5),
    ]);

  const unreadMessages  = unreadRow?.count     ?? 0;
  const totalSpent      = statsRow?.totalSpent  ?? 0;
  const completedOrders = statsRow?.completed   ?? 0;

  return (
    <div className="relative min-h-screen bg-slate-50/50 pb-12 overflow-hidden">
      <TopoBackground background="#f8fafc" strokeColor="#e2e8f0" opacity={0.4} />

      <div className="max-w-6xl mx-auto px-6 pt-8 space-y-6 relative z-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-black text-neutral-900 tracking-tight leading-none">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-xs text-neutral-400 font-bold mt-2">Let&apos;s create something amazing today.</p>
          </div>
          <div className="flex items-center gap-4 shrink-0 self-end md:self-auto">
            <Link
              href="/client/notifications"
              className="relative w-10 h-10 rounded-full bg-white border border-neutral-200/60 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors shadow-sm"
            >
              <Bell className="w-5 h-5" />
              {unreadMessages > 0 && (
                <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-violet-600 border border-white text-[8px] font-bold text-white rounded-full flex items-center justify-center">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-3 bg-white border border-neutral-200/60 rounded-full pl-2.5 pr-4 py-1.5 shadow-sm">
              <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-violet-100 text-violet-700 text-xs font-bold shrink-0">
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt={fullName || "User"} className="w-full h-full object-cover" />
                ) : (
                  (firstName !== "there" ? firstName[0] : "U").toUpperCase()
                )}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-neutral-800 leading-none">{fullName || "User"}</p>
                <p className="text-[9px] text-neutral-400 font-bold mt-0.5">Client</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </div>
          </div>
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              label: "Active Projects",
              value: String(activeOrders.length),
              sub: activeOrders.length === 0 ? "No active orders" : `${activeOrders.length} in progress`,
              Icon: Folder,
              iconBg: "bg-violet-50",
              iconColor: "text-violet-600",
            },
            {
              label: "Completed",
              value: String(completedOrders),
              sub: "All time",
              Icon: CheckCircle2,
              iconBg: "bg-emerald-50",
              iconColor: "text-emerald-600",
            },
            {
              label: "Total Spent",
              value: totalSpent > 0 ? formatCurrency(totalSpent) : "₹0",
              sub: "On completed orders",
              Icon: IndianRupee,
              iconBg: "bg-amber-50",
              iconColor: "text-amber-500",
            },
            {
              label: "Saved Editors",
              value: String(savedEditorsList.length),
              sub: savedEditorsList.length === 0 ? "None saved yet" : "Your favourites",
              Icon: Users,
              iconBg: "bg-blue-50",
              iconColor: "text-blue-600",
            },
          ].map(({ label, value, sub, Icon, iconBg, iconColor }) => (
            <div key={label} className="bg-white rounded-3xl border border-neutral-200/60 p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{label}</p>
                <p className="text-3xl font-black text-neutral-900 leading-none">{value}</p>
                <p className="text-[10px] text-neutral-400 font-semibold mt-1">{sub}</p>
              </div>
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", iconBg)}>
                <Icon className={cn("w-5 h-5", iconColor)} />
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Active Orders */}
            <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-black text-neutral-900">Active Projects</h2>
                <Link href="/client/orders" className="text-xs font-bold text-violet-600 hover:text-violet-700 hover:underline">
                  View all orders
                </Link>
              </div>

              {activeOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mb-3">
                    <Folder className="w-6 h-6 text-violet-400" />
                  </div>
                  <p className="font-bold text-neutral-700 text-sm">No active projects yet</p>
                  <p className="text-xs text-neutral-400 mt-1 mb-4">Find an editor and place your first order to get started.</p>
                  <Link
                    href="/browse"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-black hover:bg-neutral-900 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" /> Browse editors
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {activeOrders.map(order => {
                    const editorFirst = displayNameFromFull(order.editorName ?? "Editor");
                    const daysLeft = order.deadline
                      ? Math.max(0, Math.ceil((order.deadline.getTime() - now.getTime()) / (1000 * 3600 * 24)))
                      : null;
                    const statusClass =
                      order.status === "delivered"          ? "bg-emerald-100 text-emerald-700" :
                      order.status === "in_progress"        ? "bg-violet-100 text-violet-700"  :
                      order.status === "revision_requested" ? "bg-amber-100 text-amber-700"    :
                      "bg-neutral-100 text-neutral-600";
                    const statusLabel =
                      order.status === "delivered"          ? "Delivered"  :
                      order.status === "in_progress"        ? "In Progress":
                      order.status === "revision_requested" ? "Revision"   :
                      order.status === "pending"            ? "Pending"    : order.status;

                    return (
                      <Link
                        key={order.id}
                        href={`/client/orders/${order.id}`}
                        className="flex items-center gap-4 py-3 border-b border-neutral-100 last:border-0 rounded-xl px-2 -mx-2 hover:bg-neutral-50/80 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-violet-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-extrabold text-neutral-800 truncate">
                            {order.packageTitle ?? "Custom Editing Order"}
                          </p>
                          <p className="text-[11px] text-neutral-400 font-bold mt-0.5">
                            {editorFirst}
                            {daysLeft !== null && (
                              <> · <span className={daysLeft <= 1 ? "text-red-500" : ""}>{daysLeft === 0 ? "Due today" : `Due in ${daysLeft}d`}</span></>
                            )}
                          </p>
                        </div>
                        <span className={cn("text-[10px] font-black px-2.5 py-1 rounded-full shrink-0", statusClass)}>
                          {statusLabel}
                        </span>
                        <ArrowRight className="w-4 h-4 text-neutral-300 shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Browse Editors */}
            <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-black text-neutral-900">Browse Editors</h2>
                <Link href="/browse" className="text-xs font-bold text-violet-600 hover:text-violet-700 hover:underline">
                  View all
                </Link>
              </div>

              {recommendedEditors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-neutral-400">No editors available right now.</p>
                  <Link href="/browse" className="mt-3 text-xs font-bold text-violet-600 hover:underline">
                    Browse all editors
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {recommendedEditors.map(editor => {
                    const shownName = editor.displayName || displayNameFromFull(editor.name);
                    const initials = shownName.slice(0, 2).toUpperCase();
                    return (
                      <Link
                        key={editor.editorId}
                        href={`/editor/${editor.editorId}`}
                        className="bg-white rounded-2xl border border-neutral-200/60 overflow-hidden flex flex-col p-3 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-violet-100 to-violet-200 mb-3 flex items-center justify-center">
                          {editor.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={editor.image} alt={shownName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl font-black text-violet-500">{initials}</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-xs font-black text-neutral-900 truncate">{shownName}</h3>
                          {editor.title && (
                            <p className="text-[10px] text-neutral-400 font-bold leading-none truncate">{editor.title}</p>
                          )}
                          <div className="flex items-center gap-0.5 pt-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span className="text-[10px] font-black text-neutral-800">
                              {editor.avgRating != null ? Number(editor.avgRating).toFixed(1) : "New"}
                            </span>
                            {editor.reviewCount > 0 && (
                              <span className="text-[9px] text-neutral-400 ml-0.5">({editor.reviewCount})</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm p-6">
              <h3 className="text-[11px] font-black text-neutral-400 uppercase tracking-wider mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {([
                  { href: "/browse",            label: "New Order",   Icon: Plus,           iconBg: "bg-violet-50", iconColor: "text-violet-600" },
                  { href: "/browse",            label: "Find Editors", Icon: Search,        iconBg: "bg-violet-50", iconColor: "text-violet-600" },
                  { href: "/client/messages",   label: "Messages",    Icon: MessageSquare,  iconBg: "bg-violet-50", iconColor: "text-violet-600", badge: unreadMessages },
                  { href: "/client/referrals",  label: "Refer & Earn", Icon: Gift,          iconBg: "bg-amber-50",  iconColor: "text-amber-500" },
                ] as { href: string; label: string; Icon: React.ElementType; iconBg: string; iconColor: string; badge?: number }[]).map(
                  ({ href, label, Icon, iconBg, iconColor, badge }) => (
                    <Link
                      key={label}
                      href={href}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-neutral-100 hover:bg-neutral-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
                          <Icon className={cn("w-4 h-4", iconColor)} />
                        </div>
                        <span className="text-[13px] font-bold text-neutral-800">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {badge && badge > 0 ? (
                          <span className="text-[9px] font-bold bg-violet-600 text-white rounded-full px-1.5 py-0.5">
                            {badge}
                          </span>
                        ) : null}
                        <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-700 transition-colors" />
                      </div>
                    </Link>
                  )
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm p-6">
              <h3 className="text-[11px] font-black text-neutral-400 uppercase tracking-wider mb-5">Recent Activity</h3>

              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="w-8 h-8 text-neutral-200 mb-2" />
                  <p className="text-sm text-neutral-400">No activity yet</p>
                  <p className="text-xs text-neutral-300 mt-0.5">Order updates will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map(activity => {
                    const editorName = displayNameFromFull(activity.editorName ?? "Editor");
                    const rawTitle   = activity.packageTitle ?? "Custom order";
                    const title      = rawTitle.length > 22 ? rawTitle.slice(0, 22) + "…" : rawTitle;

                    let iconBg       = "bg-gray-50 border-gray-100";
                    let iconClr      = "text-gray-400";
                    let ActivityIcon = Package as React.ElementType;
                    let text         = "Order status updated";

                    if (activity.status === "pending") {
                      text = `New order placed — "${title}"`;
                      iconBg = "bg-violet-50 border-violet-100"; iconClr = "text-violet-600"; ActivityIcon = Plus;
                    } else if (activity.status === "in_progress") {
                      text = `${editorName} started working`;
                      iconBg = "bg-blue-50 border-blue-100";   iconClr = "text-blue-600";    ActivityIcon = Clock;
                    } else if (activity.status === "delivered") {
                      text = `${editorName} delivered "${title}"`;
                      iconBg = "bg-emerald-50 border-emerald-100"; iconClr = "text-emerald-600"; ActivityIcon = CheckCircle2;
                    } else if (activity.status === "revision_requested") {
                      text = `Revision requested on "${title}"`;
                      iconBg = "bg-amber-50 border-amber-100"; iconClr = "text-amber-500";   ActivityIcon = RefreshCw;
                    } else if (activity.status === "completed") {
                      text = `"${title}" marked complete`;
                      iconBg = "bg-emerald-50 border-emerald-100"; iconClr = "text-emerald-600"; ActivityIcon = CheckCircle2;
                    } else if (activity.status === "disputed") {
                      text = `Dispute opened on "${title}"`;
                      iconBg = "bg-red-50 border-red-100";     iconClr = "text-red-500";     ActivityIcon = AlertTriangle;
                    }

                    return (
                      <Link
                        key={activity.id}
                        href={`/client/orders/${activity.id}`}
                        className="flex items-start gap-3 group"
                      >
                        <div className={cn("w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 mt-0.5", iconBg)}>
                          <ActivityIcon className={cn("w-3.5 h-3.5", iconClr)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-neutral-700 leading-normal group-hover:text-neutral-900 transition-colors">
                            {text}
                          </p>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-bold shrink-0 mt-0.5">
                          {relativeTime(activity.updatedAt)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Refer & Earn */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#7C3AED] to-[#5b21b6] p-6 text-white shadow-md flex items-center justify-between">
              <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
              <div className="space-y-1.5 relative z-10 max-w-[160px]">
                <h4 className="font-black text-sm tracking-tight">Refer & Earn</h4>
                <p className="text-[10px] text-white/80 leading-relaxed font-semibold">
                  Invite friends and earn credit on their first order.
                </p>
                <Link
                  href="/client/referrals"
                  className="inline-block mt-3 bg-white text-violet-700 hover:bg-neutral-100 px-4 py-2 rounded-xl text-[10px] font-black transition-all"
                >
                  Invite Now
                </Link>
              </div>
              <div className="w-20 h-20 relative shrink-0 opacity-90">
                <Gift className="w-full h-full text-violet-200 stroke-1" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
