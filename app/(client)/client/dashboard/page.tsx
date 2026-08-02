export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, messages, disputes, editors, users, reviews, savedEditors } from "@/lib/db/schema";
import { and, eq, sql, desc, ne, inArray } from "drizzle-orm";
import { formatCurrency, formatDate, displayNameFromFull } from "@/lib/utils";
import {
  ShoppingBag, ArrowRight, MessageSquare, Star,
  Search, AlertTriangle, CheckCircle2, IndianRupee,
  Heart, RefreshCw, Film, Clock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DeadlineCountdown } from "@/components/orders/deadline-countdown";
import { ReferralCard } from "@/components/client/referral-card";
import { RewardsCard } from "@/components/rewards/rewards-card";

const STATUS_STYLES: Record<string, { label: string; dot: string; badge: string }> = {
  pending:            { label: "Pending",     dot: "bg-gray-400",    badge: "bg-gray-100 text-gray-600"      },
  in_progress:        { label: "In Progress", dot: "bg-[#0EA5E9]",   badge: "bg-sky-100 text-sky-700"        },
  delivered:          { label: "Delivered",   dot: "bg-violet-500",  badge: "bg-violet-100 text-violet-700"  },
  revision_requested: { label: "Revision",    dot: "bg-amber-500",   badge: "bg-amber-100 text-amber-700"    },
  disputed:           { label: "Disputed",    dot: "bg-red-500",     badge: "bg-red-100 text-red-700"        },
};

export default async function ClientDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.userId!;
  const firstName = displayNameFromFull(session.user.name);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [activeOrders, statsRow, unreadRow, openDisputeRow, recentReviews, monthSpentRow, savedEditorsList] = await Promise.all([
    db.select({
      id: orders.id, status: orders.status,
      totalAmount: orders.totalAmount, deadline: orders.deadline,
      createdAt: orders.createdAt, packageTitle: packages.title,
      editorName: users.name,
    })
      .from(orders)
      .leftJoin(packages, eq(packages.id, orders.packageId))
      .innerJoin(editors, eq(editors.id, orders.editorId))
      .innerJoin(users, eq(users.id, editors.userId))
      .where(and(eq(orders.clientId, userId), sql`${orders.status} NOT IN ('completed','cancelled')`))
      .orderBy(sql`${orders.deadline} ASC NULLS LAST`).limit(5),

    db.select({
      total:      sql<number>`COUNT(*)::int`,
      completed:  sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'completed')::int`,
      totalSpent: sql<number>`COALESCE(SUM(${orders.totalAmount}) FILTER (WHERE ${orders.status} = 'completed'),0)::int`,
    }).from(orders).where(eq(orders.clientId, userId)).then(r => r[0]),

    db.select({ count: sql<number>`COUNT(*)::int` })
      .from(messages).innerJoin(orders, eq(messages.orderId, orders.id))
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

    db.select({ count: sql<number>`COUNT(*)::int` })
      .from(disputes).innerJoin(orders, eq(orders.id, disputes.orderId))
      .where(and(eq(orders.clientId, userId), eq(disputes.status, "open"))).then(r => r[0]),

    db.select({ id: reviews.id, rating: reviews.rating, text: reviews.text, createdAt: reviews.createdAt })
      .from(reviews).where(and(eq(reviews.reviewerId, userId), eq(reviews.role, "client")))
      .orderBy(desc(reviews.createdAt)).limit(3),

    db.select({ total: sql<number>`COALESCE(SUM(${orders.totalAmount}) FILTER (WHERE ${orders.status} = 'completed'),0)::int` })
      .from(orders).where(and(eq(orders.clientId, userId), sql`${orders.updatedAt} >= ${monthStart}`)).then(r => r[0]),

    db.select({
      editorId: editors.id, name: users.name, displayName: editors.displayName,
      image: users.image, isAvailable: editors.isAvailable, vacationUntil: editors.vacationUntil,
    })
      .from(savedEditors)
      .innerJoin(editors, eq(editors.id, savedEditors.editorId))
      .innerJoin(users, eq(users.id, editors.userId))
      .where(eq(savedEditors.clientId, userId))
      .orderBy(desc(savedEditors.createdAt))
      .limit(4),
  ]);

  const savedEditorIds = savedEditorsList.map(e => e.editorId);
  const savedLastOrders = savedEditorIds.length
    ? await db.select({ editorId: orders.editorId, orderId: orders.id, packageId: orders.packageId })
        .from(orders)
        .where(and(eq(orders.clientId, userId), inArray(orders.editorId, savedEditorIds), sql`${orders.packageId} IS NOT NULL`))
        .orderBy(desc(orders.createdAt))
    : [];
  const savedLastOrderByEditor = new Map<string, { orderId: string; packageId: string }>();
  for (const o of savedLastOrders) {
    if (!savedLastOrderByEditor.has(o.editorId) && o.packageId) {
      savedLastOrderByEditor.set(o.editorId, { orderId: o.orderId, packageId: o.packageId });
    }
  }

  const unreadMessages  = unreadRow?.count       ?? 0;
  const openDisputes    = openDisputeRow?.count   ?? 0;
  const monthSpent      = monthSpentRow?.total    ?? 0;
  const totalSpent      = statsRow?.totalSpent    ?? 0;
  const totalOrders     = statsRow?.total         ?? 0;
  const completedOrders = statsRow?.completed     ?? 0;

  const greet = now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening";

  const KPI_CARDS = [
    {
      label: "Spent this month",
      value: formatCurrency(monthSpent),
      sub: `${formatCurrency(totalSpent)} all-time`,
      icon: IndianRupee,
      href: "/client/orders",
      topBorder: "border-t-2 border-emerald-500",
      iconBg: "bg-emerald-50", iconCls: "text-emerald-600",
    },
    {
      label: "Active orders",
      value: String(activeOrders.length),
      sub: activeOrders.length === 0 ? "Nothing in progress" : "In progress now",
      icon: Clock,
      href: "/client/orders",
      topBorder: "border-t-2 border-[#0EA5E9]",
      iconBg: "bg-sky-50", iconCls: "text-[#0EA5E9]",
    },
    {
      label: "Completed",
      value: String(completedOrders),
      sub: `of ${totalOrders} total order${totalOrders !== 1 ? "s" : ""}`,
      icon: CheckCircle2,
      href: "/client/orders",
      topBorder: "border-t-2 border-teal-500",
      iconBg: "bg-teal-50", iconCls: "text-teal-600",
    },
    {
      label: "Unread messages",
      value: String(unreadMessages),
      sub: unreadMessages === 0 ? "All caught up" : "Waiting for you",
      icon: MessageSquare,
      href: "/client/messages",
      topBorder: "border-t-2 border-amber-400",
      iconBg: "bg-amber-50", iconCls: "text-amber-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Good {greet}, {firstName}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {activeOrders.length > 0
                ? `You have ${activeOrders.length} active order${activeOrders.length !== 1 ? "s" : ""}`
                : "No active orders — ready to find an editor?"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {unreadMessages > 0 && (
              <Link href="/client/messages"
                className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 text-sm font-medium hover:bg-sky-100 transition-colors">
                <MessageSquare className="w-4 h-4" />
                <span>{unreadMessages}</span>
              </Link>
            )}
            {openDisputes > 0 && (
              <Link href="/client/disputes"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors">
                <AlertTriangle className="w-4 h-4" />
                <span>{openDisputes} dispute{openDisputes !== 1 ? "s" : ""}</span>
              </Link>
            )}
            <Link href="/browse"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#0EA5E9] hover:bg-sky-600 transition-colors">
              <Search className="w-4 h-4" /> Find editor
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_CARDS.map(({ label, value, sub, icon: Icon, href, topBorder, iconBg, iconCls }) => (
            <Link key={label} href={href}
              className={cn("bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group", topBorder)}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium text-gray-400">{label}</p>
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110", iconBg)}>
                  <Icon className={cn("w-4 h-4", iconCls)} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 leading-none mb-1.5 tabular-nums">{value}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </Link>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* Left col */}
          <div className="lg:col-span-2 space-y-5">

            {/* Active orders */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-gray-400" />
                  <h2 className="font-semibold text-gray-900 text-sm">Active Orders</h2>
                  {activeOrders.length > 0 && (
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-[#0EA5E9] text-white">
                      {activeOrders.length}
                    </span>
                  )}
                </div>
                <Link href="/client/orders"
                  className="text-xs font-medium flex items-center gap-1 text-[#0EA5E9] hover:underline">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {activeOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#0EA5E9]/10 flex items-center justify-center mb-3">
                    <ShoppingBag className="w-5 h-5 text-[#0EA5E9]" />
                  </div>
                  <p className="font-semibold text-gray-700 text-sm">No active orders</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs">Find a great editor and start your first project today.</p>
                  <Link href="/browse"
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#0EA5E9] hover:bg-sky-600 transition-colors">
                    <Search className="w-3.5 h-3.5" /> Browse editors
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {activeOrders.map(order => {
                    const s = STATUS_STYLES[order.status];
                    return (
                      <Link key={order.id} href={`/client/orders/${order.id}`}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", s?.dot ?? "bg-gray-300")} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate mb-0.5">{order.packageTitle}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {s && (
                              <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", s.badge)}>
                                {s.label}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">{displayNameFromFull(order.editorName ?? "Editor")}</span>
                            {order.deadline && (
                              <>
                                <span className="text-gray-200 text-xs">·</span>
                                <DeadlineCountdown deadline={order.deadline.toISOString()} />
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-bold text-gray-900 tabular-nums">{formatCurrency(order.totalAmount)}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Saved editors */}
            {savedEditorsList.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                    <h2 className="font-semibold text-gray-900 text-sm">Saved Editors</h2>
                  </div>
                  <Link href="/client/saved" className="text-xs font-medium flex items-center gap-1 text-[#0EA5E9] hover:underline">
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="divide-y divide-gray-50">
                  {savedEditorsList.map(editor => {
                    const shownName = editor.displayName || displayNameFromFull(editor.name);
                    const initials = shownName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
                    const isAway = editor.vacationUntil && new Date(editor.vacationUntil) > now;
                    const lastOrder = savedLastOrderByEditor.get(editor.editorId);
                    const unavailable = isAway || !editor.isAvailable;
                    return (
                      <div key={editor.editorId} className="flex items-center gap-3 px-5 py-3.5">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#0EA5E9]/10 flex items-center justify-center shrink-0">
                          {editor.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={editor.image} alt={shownName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[#0EA5E9] font-bold text-xs">{initials}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{shownName}</p>
                          {isAway ? (
                            <p className="text-xs text-amber-600">Away until {formatDate(editor.vacationUntil!)}</p>
                          ) : !editor.isAvailable ? (
                            <p className="text-xs text-gray-400">Not taking orders</p>
                          ) : (
                            <p className="text-xs text-emerald-600">Available now</p>
                          )}
                        </div>
                        {lastOrder ? (
                          <Link
                            href={`/checkout/${lastOrder.packageId}?reorder=true&orderId=${lastOrder.orderId}`}
                            className={cn(
                              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shrink-0 transition-colors",
                              unavailable
                                ? "bg-gray-200 text-gray-400 pointer-events-none"
                                : "bg-[#0EA5E9] hover:bg-sky-600"
                            )}
                          >
                            <RefreshCw className="w-3 h-3" /> Re-order
                          </Link>
                        ) : (
                          <Link
                            href={`/editor/${editor.editorId}`}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0EA5E9] hover:bg-sky-600 transition-colors shrink-0"
                          >
                            View
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent reviews */}
            {recentReviews.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <h2 className="font-semibold text-gray-900 text-sm">Reviews You Left</h2>
                  </div>
                  <Link href="/client/reviews" className="text-xs font-medium text-[#0EA5E9] hover:underline">
                    View all
                  </Link>
                </div>
                <div className="divide-y divide-gray-50">
                  {recentReviews.map(review => (
                    <div key={review.id} className="px-5 py-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn("w-3 h-3", i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                          ))}
                        </div>
                        <span className="text-[10px] text-gray-400">{formatDate(review.createdAt)}</span>
                      </div>
                      {review.text && <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{review.text}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right col / sidebar */}
          <div className="space-y-4">

            {/* Browse CTA if no orders */}
            {activeOrders.length === 0 && (
              <div className="rounded-2xl p-5 text-white bg-gradient-to-br from-sky-500 to-indigo-500">
                <Film className="w-6 h-6 mb-3 opacity-80" />
                <p className="font-semibold text-sm mb-1">Discover editors</p>
                <p className="text-xs opacity-75 mb-4 leading-relaxed">
                  Browse portfolios, compare packages, and find the perfect editor for your project.
                </p>
                <Link href="/browse"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-semibold transition-colors">
                  Browse now <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Member rewards — live XP/level/badges */}
            <RewardsCard />

            {/* Referral — live stats + copy link */}
            <ReferralCard />

            {/* Editor feed teaser */}
            <Link href="/feed"
              className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-violet-200 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-50">
                  <Film className="w-4 h-4 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Editor Feed</p>
                  <p className="text-xs text-gray-400">Discover editor portfolios</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-violet-500 transition-colors shrink-0" />
              </div>
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
}
