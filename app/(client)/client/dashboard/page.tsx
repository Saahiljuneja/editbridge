export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, messages, editors, users, userPoints } from "@/lib/db/schema";
import { and, eq, sql, desc, ne } from "drizzle-orm";
import { formatCurrency, displayNameFromFull, cn } from "@/lib/utils";
import {
  ArrowRight, MessageSquare,
  Search, AlertTriangle, CheckCircle2,
  RefreshCw, Clock, Plus,
  Gift, Package, IndianRupee, Wallet, User,
  Zap, TriangleAlert, Folder, ChevronRight,
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

function nextActionText(status: string, daysLeft: number | null): { text: string; urgent: boolean } {
  if (status === "delivered")          return { text: "Delivered — review & approve",          urgent: true };
  if (status === "revision_requested") return { text: "Revision requested — editor is working", urgent: false };
  if (status === "in_progress") {
    if (daysLeft !== null && daysLeft <= 1) return { text: "Due very soon — check in with editor", urgent: true };
    if (daysLeft !== null && daysLeft <= 3) return { text: `Due in ${daysLeft}d — track progress`,  urgent: false };
    return { text: "In progress",  urgent: false };
  }
  if (status === "pending") return { text: "Waiting for editor to accept", urgent: false };
  return { text: status.replace(/_/g, " "), urgent: false };
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

  const [activeOrders, statsRow, unreadRow, recentActivity, xpRow] =
    await Promise.all([
      db.select({
        id: orders.id, status: orders.status, deadline: orders.deadline,
        packageTitle: packages.title, editorName: users.name,
      })
      .from(orders)
      .leftJoin(packages, eq(packages.id, orders.packageId))
      .innerJoin(editors, eq(editors.id, orders.editorId))
      .innerJoin(users, eq(users.id, editors.userId))
      .where(and(eq(orders.clientId, userId), sql`${orders.status} NOT IN ('completed','cancelled')`))
      .orderBy(sql`${orders.deadline} ASC NULLS LAST`)
      .limit(8),

      db.select({
        completed:  sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'completed')::int`,
        totalSpent: sql<number>`COALESCE(SUM(${orders.totalAmount}) FILTER (WHERE ${orders.status} = 'completed'), 0)::int`,
      }).from(orders).where(eq(orders.clientId, userId)).then(r => r[0]),

      db.select({ count: sql<number>`COUNT(*)::int` })
        .from(messages)
        .innerJoin(orders, eq(messages.orderId, orders.id))
        .where(and(
          eq(orders.clientId, userId), ne(messages.senderId, userId),
          eq(messages.isRead, false), sql`${orders.status} NOT IN ('completed','cancelled')`,
          eq(messages.isBlocked, false)
        )).then(r => r[0]),

      db.select({
        id: orders.id, status: orders.status, updatedAt: orders.updatedAt,
        packageTitle: packages.title, editorName: users.name,
      })
      .from(orders)
      .leftJoin(packages, eq(packages.id, orders.packageId))
      .innerJoin(editors, eq(editors.id, orders.editorId))
      .innerJoin(users, eq(users.id, editors.userId))
      .where(eq(orders.clientId, userId))
      .orderBy(desc(orders.updatedAt))
      .limit(5),

      db.select({ current: userPoints.current })
        .from(userPoints)
        .where(eq(userPoints.userId, userId))
        .limit(1)
        .then(r => r[0]),
    ]);

  const unreadMessages  = unreadRow?.count     ?? 0;
  const totalSpent      = statsRow?.totalSpent  ?? 0;
  const completedOrders = statsRow?.completed   ?? 0;

  const currentXp = xpRow?.current ?? 0;
  const xpLevel =
    currentXp >= 50000 ? "Legend"   :
    currentXp >= 25000 ? "Master"   :
    currentXp >= 10000 ? "Diamond"  :
    currentXp >= 5000  ? "Platinum" :
    currentXp >= 2000  ? "Gold"     :
    currentXp >= 500   ? "Silver"   : "Bronze";
  const xpLevelEmoji =
    xpLevel === "Legend"   ? "🔥" : xpLevel === "Master"   ? "👑" :
    xpLevel === "Diamond"  ? "💠" : xpLevel === "Platinum" ? "💎" :
    xpLevel === "Gold"     ? "🥇" : xpLevel === "Silver"   ? "🥈" : "🥉";

  const ordersWithMeta = activeOrders.map(order => {
    const daysLeft = order.deadline
      ? Math.ceil((order.deadline.getTime() - now.getTime()) / (1000 * 3600 * 24))
      : null;
    return { ...order, daysLeft };
  });

  const attentionItems = ordersWithMeta.filter(o =>
    o.status === "delivered" ||
    (o.status === "in_progress" && o.daysLeft !== null && o.daysLeft <= 1)
  );

  return (
    <div className="relative min-h-screen bg-slate-50/50 pb-12 overflow-hidden">
      <TopoBackground background="#f8fafc" strokeColor="#e2e8f0" opacity={0.4} />

      <div className="max-w-6xl mx-auto px-6 pt-8 space-y-6 relative z-10">

        {/* Greeting */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[26px] font-black text-neutral-900 tracking-tight leading-none">
              {greeting}, {firstName}
            </h1>
            <p className="text-xs text-neutral-400 font-bold mt-2">Let&apos;s create something amazing today.</p>
          </div>
          {unreadMessages > 0 && (
            <Link href="/client/messages" className="flex items-center gap-2 bg-white border border-neutral-200/60 rounded-2xl px-4 py-2.5 shadow-sm hover:shadow-md transition-all group">
              <div className="relative">
                <MessageSquare className="w-4 h-4 text-neutral-600" />
                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-[#1e40af] text-white text-[8px] font-black flex items-center justify-center">{unreadMessages}</span>
              </div>
              <span className="text-xs font-bold text-neutral-700">{unreadMessages} new message{unreadMessages !== 1 ? "s" : ""}</span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-700 transition-colors" />
            </Link>
          )}
        </div>

        {/* Attention Required */}
        {attentionItems.length > 0 && (
          <div className="bg-amber-50 border border-amber-200/60 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <TriangleAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs font-black text-amber-800 uppercase tracking-wider">
                {attentionItems.length} item{attentionItems.length !== 1 ? "s" : ""} need{attentionItems.length === 1 ? "s" : ""} your attention
              </p>
            </div>
            <div className="space-y-2">
              {attentionItems.map(order => {
                const { text } = nextActionText(order.status, order.daysLeft);
                return (
                  <Link key={order.id} href={`/client/orders/${order.id}`}
                    className="flex items-center justify-between bg-white rounded-2xl border border-amber-100 px-4 py-3 hover:border-amber-300 transition-colors group">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-neutral-900 truncate">{order.packageTitle ?? "Custom Order"}</p>
                      <p className="text-[11px] text-amber-700 font-semibold mt-0.5">{text}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400 group-hover:text-amber-600 shrink-0 ml-3 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Active Orders",    value: String(ordersWithMeta.length), Icon: Folder,       iconBg: "bg-blue-50",    iconColor: "text-brand-primary" },
            { label: "Unread Msgs",     value: String(unreadMessages),        Icon: MessageSquare, iconBg: "bg-blue-50",    iconColor: "text-brand-primary", href: "/client/messages" },
            { label: "Total Spent",     value: totalSpent > 0 ? formatCurrency(totalSpent) : "₹0", Icon: IndianRupee, iconBg: "bg-amber-50", iconColor: "text-amber-500" },
            { label: "Completed",       value: String(completedOrders),       Icon: CheckCircle2,  iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
          ].map(({ label, value, Icon, iconBg, iconColor, href }) => (
            <div key={label} className={cn("bg-white rounded-2xl border border-neutral-200/60 p-4 shadow-sm flex items-center gap-3", href && "hover:border-neutral-300 transition-colors cursor-pointer")}>
              {href ? (
                <Link href={href} className="flex items-center gap-3 w-full">
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
                    <Icon className={cn("w-4 h-4", iconColor)} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">{label}</p>
                    <p className="text-lg font-black text-neutral-900 leading-none mt-0.5">{value}</p>
                  </div>
                </Link>
              ) : (
                <>
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
                    <Icon className={cn("w-4 h-4", iconColor)} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">{label}</p>
                    <p className="text-lg font-black text-neutral-900 leading-none mt-0.5">{value}</p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left: Active Projects + Recent Activity */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-black text-neutral-900">Active Projects</h2>
                <Link href="/client/orders" className="text-xs font-bold text-brand-primary hover:text-blue-900 hover:underline">All orders</Link>
              </div>

              {ordersWithMeta.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
                    <Folder className="w-6 h-6 text-blue-400" />
                  </div>
                  <p className="font-bold text-neutral-700 text-sm">No active projects</p>
                  <p className="text-xs text-neutral-400 mt-1 mb-4">Find an editor and place your first order to get started.</p>
                  <Link href="/browse" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-black hover:bg-neutral-900 transition-colors">
                    <Search className="w-3.5 h-3.5" /> Browse editors
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {ordersWithMeta.map(order => {
                    const editorFirst = displayNameFromFull(order.editorName ?? "Editor");
                    const { text: actionText, urgent } = nextActionText(order.status, order.daysLeft);
                    const statusBadgeClass =
                      order.status === "delivered"          ? "bg-emerald-100 text-emerald-700" :
                      order.status === "in_progress"        ? "bg-blue-100 text-blue-900"  :
                      order.status === "revision_requested" ? "bg-amber-100 text-amber-700"    :
                      "bg-neutral-100 text-neutral-600";
                    const statusLabel =
                      order.status === "delivered"          ? "Delivered"   :
                      order.status === "in_progress"        ? "In Progress" :
                      order.status === "revision_requested" ? "Revision"    :
                      order.status === "pending"            ? "Pending"     : order.status;
                    return (
                      <Link key={order.id} href={`/client/orders/${order.id}`}
                        className="flex items-center gap-4 py-3 border-b border-neutral-100 last:border-0 rounded-xl px-2 -mx-2 hover:bg-neutral-50/80 transition-colors group">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-brand-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-extrabold text-neutral-800 truncate">{order.packageTitle ?? "Custom Editing Order"}</p>
                          <p className={cn("text-[11px] font-bold mt-0.5 truncate", urgent ? "text-amber-600" : "text-neutral-400")}>
                            {editorFirst} · {actionText}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {order.daysLeft !== null && order.daysLeft <= 3 && order.status === "in_progress" && (
                            <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full",
                              order.daysLeft <= 1 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700")}>
                              {order.daysLeft <= 0 ? "Overdue" : order.daysLeft === 1 ? "Due today" : `Due in ${order.daysLeft}d`}
                            </span>
                          )}
                          <span className={cn("text-[10px] font-black px-2.5 py-1 rounded-full", statusBadgeClass)}>{statusLabel}</span>
                          <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-600 transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between">
                <p className="text-xs text-neutral-400 font-semibold">Start a new project</p>
                <Link href="/browse" className="flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:text-blue-900 hover:underline">
                  <Search className="w-3 h-3" /> Browse editors
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm p-6">
              <h3 className="text-[11px] font-black text-neutral-400 uppercase tracking-wider mb-5">Recent Activity</h3>
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="w-8 h-8 text-neutral-200 mb-2" />
                  <p className="text-sm text-neutral-400">No activity yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map(activity => {
                    const editorName = displayNameFromFull(activity.editorName ?? "Editor");
                    const rawTitle   = activity.packageTitle ?? "Custom order";
                    const title      = rawTitle.length > 22 ? rawTitle.slice(0, 22) + "…" : rawTitle;
                    let iconBg = "bg-gray-50 border-gray-100", iconClr = "text-gray-400";
                    let ActivityIcon = Package as React.ElementType, text = "Order status updated";
                    if (activity.status === "pending") {
                      text = `New order placed — "${title}"`; iconBg = "bg-blue-50 border-blue-100"; iconClr = "text-blue-800"; ActivityIcon = Plus;
                    } else if (activity.status === "in_progress") {
                      text = `${editorName} started working`; iconBg = "bg-blue-50 border-blue-100"; iconClr = "text-blue-800"; ActivityIcon = Clock;
                    } else if (activity.status === "delivered") {
                      text = `${editorName} delivered "${title}"`; iconBg = "bg-emerald-50 border-emerald-100"; iconClr = "text-emerald-600"; ActivityIcon = CheckCircle2;
                    } else if (activity.status === "revision_requested") {
                      text = `Revision requested on "${title}"`; iconBg = "bg-amber-50 border-amber-100"; iconClr = "text-amber-500"; ActivityIcon = RefreshCw;
                    } else if (activity.status === "completed") {
                      text = `"${title}" marked complete`; iconBg = "bg-emerald-50 border-emerald-100"; iconClr = "text-emerald-600"; ActivityIcon = CheckCircle2;
                    } else if (activity.status === "disputed") {
                      text = `Dispute opened on "${title}"`; iconBg = "bg-red-50 border-red-100"; iconClr = "text-red-500"; ActivityIcon = AlertTriangle;
                    }
                    return (
                      <Link key={activity.id} href={`/client/orders/${activity.id}`} className="flex items-start gap-3 group">
                        <div className={cn("w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 mt-0.5", iconBg)}>
                          <ActivityIcon className={cn("w-3.5 h-3.5", iconClr)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-neutral-700 leading-normal group-hover:text-neutral-900 transition-colors">{text}</p>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-bold shrink-0 mt-0.5">{relativeTime(activity.updatedAt)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            {/* XP strip */}
            <Link href="/client/rewards"
              className="flex items-center justify-between bg-white rounded-3xl border border-neutral-200/60 px-5 py-4 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Zap className="w-4.5 h-4.5 text-brand-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Rewards & XP</p>
                  <p className="text-sm font-black text-neutral-900 leading-none mt-0.5">
                    {xpLevelEmoji} {xpLevel} · {currentXp.toLocaleString("en-IN")} XP
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-brand-primary transition-colors" />
            </Link>

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm p-5">
              <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-4">Quick Actions</h3>
              <div className="space-y-2.5">
                {([
                  { href: "/browse",            label: "Browse Editors", Icon: Search,        iconBg: "bg-black",       iconColor: "text-white" },
                  { href: "/client/orders",     label: "My Orders",     Icon: Folder,        iconBg: "bg-blue-50",     iconColor: "text-brand-primary" },
                  { href: "/client/messages",   label: "Messages",      Icon: MessageSquare, iconBg: "bg-blue-50",     iconColor: "text-brand-primary", badge: unreadMessages },
                  { href: "/client/wallet",     label: "Wallet",        Icon: Wallet,        iconBg: "bg-amber-50",    iconColor: "text-amber-500" },
                  { href: "/client/profile",    label: "Profile",       Icon: User,          iconBg: "bg-neutral-100", iconColor: "text-neutral-600" },
                  { href: "/client/referral",   label: "Refer & Earn",  Icon: Gift,          iconBg: "bg-emerald-50",  iconColor: "text-emerald-600" },
                ] as { href: string; label: string; Icon: React.ElementType; iconBg: string; iconColor: string; badge?: number }[]).map(
                  ({ href, label, Icon, iconBg, iconColor, badge }) => (
                    <Link key={label} href={href}
                      className="flex items-center justify-between p-3 rounded-2xl border border-neutral-100 hover:bg-neutral-50 transition-colors group">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
                          <Icon className={cn("w-3.5 h-3.5", iconColor)} />
                        </div>
                        <span className="text-xs font-bold text-neutral-800">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {badge && badge > 0 ? (
                          <span className="text-[9px] font-bold bg-brand-primary text-white rounded-full px-1.5 py-0.5">{badge}</span>
                        ) : null}
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-brand-primary transition-colors" />
                      </div>
                    </Link>
                  )
                )}
              </div>
            </div>

            {/* Refer card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] p-5 text-white shadow-md">
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
              <div className="relative z-10 space-y-2">
                <h4 className="font-black text-sm">Refer & Earn</h4>
                <p className="text-[11px] text-white/80 leading-relaxed font-semibold">Invite friends and earn credit on their first order.</p>
                <Link href="/client/referral" className="inline-block mt-2 bg-white text-blue-900 hover:bg-neutral-100 px-4 py-1.5 rounded-xl text-[11px] font-black transition-all">
                  Invite Now
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
