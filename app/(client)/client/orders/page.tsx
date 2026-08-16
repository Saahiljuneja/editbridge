export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, editors, users, quoteRequests } from "@/lib/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { formatCurrency, formatDate, displayNameFromFull } from "@/lib/utils";
import {
  ShoppingBag, Clock, CheckCircle2, Search, Download,
  ChevronLeft, ChevronRight, MessageSquare, ArrowRight,
  Sparkles, XCircle, CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { OrdersListClient } from "./orders-list-client";
import { CalendarClient } from "../calendar/calendar-client";
import { QuoteCountdown } from "@/components/quotes/quote-countdown";
import { QuoteDeclineButton } from "../quotes/quote-decline-button";
import { getPlatformSettings } from "@/lib/platform-settings";
import { TopoBackground } from "@/components/common/topo-background";

const ORDER_STATUS_VALUES = ["all","pending","in_progress","delivered","revision_requested","completed","cancelled"] as const;
type OrderTab = typeof ORDER_STATUS_VALUES[number] | "quotes" | "calendar";

const ALL_TABS: { value: OrderTab; label: string }[] = [
  { value: "all",                 label: "All" },
  { value: "pending",             label: "Pending" },
  { value: "in_progress",         label: "In Progress" },
  { value: "delivered",           label: "Delivered" },
  { value: "revision_requested",  label: "Revision" },
  { value: "completed",           label: "Completed" },
  { value: "cancelled",           label: "Cancelled" },
  { value: "quotes",              label: "Quote Requests" },
  { value: "calendar",            label: "Calendar" },
];

const QUOTE_STATUS_CONFIG: Record<
  string,
  { label: string; stripe: string; badge: string; icon: React.ElementType }
> = {
  pending:  { label: "Awaiting response", stripe: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border border-amber-200",      icon: Clock },
  offered:  { label: "Offer received",    stripe: "bg-brand-primary",  badge: "bg-blue-50 text-blue-900 border border-blue-200",    icon: Sparkles },
  accepted: { label: "Accepted",          stripe: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: CheckCircle2 },
  paid:     { label: "Order active",      stripe: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: CheckCircle2 },
  declined: { label: "Declined",          stripe: "bg-red-400",     badge: "bg-red-50 text-red-600 border border-red-200",             icon: XCircle },
  expired:  { label: "Expired",           stripe: "bg-gray-300",    badge: "bg-gray-50 text-gray-500 border border-gray-200",          icon: XCircle },
};

const PAGE_SIZE = 20;

export default async function ClientOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const rawTab = params.tab ?? "all";
  const tab: OrderTab = ([...ORDER_STATUS_VALUES, "quotes", "calendar"] as string[]).includes(rawTab)
    ? (rawTab as OrderTab)
    : "all";
  const page = Math.max(1, Number(params.page ?? "1"));
  const userId = session.user.userId!;

  const isOrderTab = (ORDER_STATUS_VALUES as readonly string[]).includes(tab);

  // Always fetch stat bar
  const statsRow = await db
    .select({
      total:     sql<number>`COUNT(*)::int`,
      active:    sql<number>`COUNT(*) FILTER (WHERE ${orders.status} NOT IN ('completed','cancelled'))::int`,
      completed: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'completed')::int`,
    })
    .from(orders)
    .where(eq(orders.clientId, userId))
    .then((r) => r[0]);

  // Orders tab data
  let rows: {
    id: string; status: string; totalAmount: number; deadline: Date | null;
    createdAt: Date; packageTitle: string | null; packageTier: string | null; editorName: string | null;
  }[] = [];
  let countRow = { count: 0 };
  let totalPages = 0;

  if (isOrderTab) {
    const conditions = [eq(orders.clientId, userId)];
    if (tab !== "all") conditions.push(sql`${orders.status} = ${tab}`);

    [rows, countRow] = await Promise.all([
      db.select({
        id: orders.id,
        status: orders.status,
        totalAmount: orders.totalAmount,
        deadline: orders.deadline,
        createdAt: orders.createdAt,
        packageTitle: packages.title,
        packageTier: packages.tier,
        editorName: users.name,
      })
      .from(orders)
      .leftJoin(packages, eq(packages.id, orders.packageId))
      .innerJoin(editors, eq(editors.id, orders.editorId))
      .innerJoin(users, eq(users.id, editors.userId))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),

      db.select({ count: sql<number>`COUNT(*)::int` })
        .from(orders)
        .where(and(...conditions))
        .then((r) => r[0]),
    ]);

    totalPages = Math.ceil((countRow?.count ?? 0) / PAGE_SIZE);
  }

  // Quotes tab data
  let quotes: {
    id: string; videoType: string; brief: string; budgetMin: number; budgetMax: number;
    deadlinePreference: string; status: string; offeredPrice: number | null;
    offerMessage: string | null; orderId: string | null; expiresAt: Date;
    createdAt: Date; editorName: string | null;
  }[] = [];
  let processingFeePct = 0;

  if (tab === "quotes") {
    const [quotesData, platformConfig] = await Promise.all([
      db.select({
        id: quoteRequests.id,
        videoType: quoteRequests.videoType,
        brief: quoteRequests.brief,
        budgetMin: quoteRequests.budgetMin,
        budgetMax: quoteRequests.budgetMax,
        deadlinePreference: quoteRequests.deadlinePreference,
        status: quoteRequests.status,
        offeredPrice: quoteRequests.offeredPrice,
        offerMessage: quoteRequests.offerMessage,
        orderId: quoteRequests.orderId,
        expiresAt: quoteRequests.expiresAt,
        createdAt: quoteRequests.createdAt,
        editorName: users.name,
      })
      .from(quoteRequests)
      .innerJoin(editors, eq(editors.id, quoteRequests.editorId))
      .innerJoin(users, eq(users.id, editors.userId))
      .where(eq(quoteRequests.clientId, userId))
      .orderBy(desc(quoteRequests.createdAt)),
      getPlatformSettings(),
    ]);
    quotes = quotesData;
    processingFeePct = platformConfig.processingFeePct / 100;
  }

  // Calendar tab data
  let calendarOrders: {
    id: string; status: string; deadline: string; createdAt: string;
    packageTitle: string; editorName: string;
  }[] = [];

  if (tab === "calendar") {
    const raw = await db
      .select({
        id: orders.id,
        status: orders.status,
        deadline: orders.deadline,
        createdAt: orders.createdAt,
        packageTitle: packages.title,
        editorName: users.name,
      })
      .from(orders)
      .leftJoin(packages, eq(packages.id, orders.packageId))
      .innerJoin(editors, eq(editors.id, orders.editorId))
      .innerJoin(users, eq(users.id, editors.userId))
      .where(and(eq(orders.clientId, userId), sql`${orders.status} NOT IN ('cancelled')`, sql`${orders.deadline} IS NOT NULL`));

    calendarOrders = raw.map((o) => ({
      id: o.id,
      status: o.status,
      deadline: o.deadline!.toISOString(),
      createdAt: o.createdAt.toISOString(),
      packageTitle: o.packageTitle ?? "Order",
      editorName: o.editorName ?? "Editor",
    }));
  }

  function pageHref(p: number) {
    const qs = new URLSearchParams();
    if (tab !== "all") qs.set("tab", tab);
    if (p > 1) qs.set("page", String(p));
    return `/client/orders${qs.toString() ? `?${qs}` : ""}`;
  }

  function tabHref(t: OrderTab) {
    return t === "all" ? "/client/orders" : `/client/orders?tab=${t}`;
  }

  const STAT_CONFIG = [
    { label: "Total Orders",       value: statsRow?.total ?? 0,     icon: ShoppingBag,  iconCls: "text-brand-primary",  iconBg: "bg-blue-50" },
    { label: "Active Projects",    value: statsRow?.active ?? 0,    icon: Clock,        iconCls: "text-brand-primary",    iconBg: "bg-blue-50" },
    { label: "Completed Projects", value: statsRow?.completed ?? 0, icon: CheckCircle2, iconCls: "text-emerald-600", iconBg: "bg-emerald-50" },
  ];

  return (
    <div className="relative min-h-screen bg-slate-50/50 pb-12 overflow-hidden select-none">
      <TopoBackground background="#f8fafc" strokeColor="#e2e8f0" opacity={0.4} />

      <div className="max-w-6xl mx-auto px-6 pt-6 space-y-6 relative z-10">

        {/* Header Card */}
        <div className="bg-white rounded-3xl border border-neutral-200/60 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm relative z-10">
          <div>
            <h1 className="text-xl font-black text-neutral-900 tracking-tight leading-none">My Orders</h1>
            <p className="text-xs text-neutral-400 font-bold mt-1.5">Track and manage all your video projects</p>
          </div>
          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
            <a href="/api/client/orders/export" download
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-colors shadow-sm">
              <Download className="w-4 h-4" /> Export CSV
            </a>
            <Link href="/browse"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-black hover:bg-neutral-900 transition-all shadow-sm">
              <Search className="w-4 h-4" /> Browse editors
            </Link>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {STAT_CONFIG.map(({ label, value, icon: Icon, iconCls, iconBg }) => (
            <div key={label} className="bg-white rounded-3xl border border-neutral-200/60 p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{label}</p>
                <p className="text-3xl font-black text-neutral-900 leading-none">{value}</p>
              </div>
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", iconBg)}>
                <Icon className={cn("w-5 h-5", iconCls)} />
              </div>
            </div>
          ))}
        </div>

        {/* Flat tab bar — all 9 tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {ALL_TABS.map((t) => {
            const isActive = tab === t.value;
            return (
              <Link
                key={t.value}
                href={tabHref(t.value)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shadow-sm",
                  isActive
                    ? "bg-brand-primary border-brand-primary text-white"
                    : "bg-white border-neutral-200/60 text-neutral-600 hover:bg-neutral-50"
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {/* ─── ORDERS TABS (all / status filters) ─── */}
        {isOrderTab && (
          <>
            {countRow && countRow.count > 0 && (
              <p className="text-xs text-neutral-400 font-bold">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, countRow.count)} of {countRow.count} orders
              </p>
            )}

            <OrdersListClient rows={rows} hasFilter={tab !== "all"} />

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-neutral-400 font-bold">Page {page} of {totalPages}</p>
                <div className="flex items-center gap-2">
                  <Link href={pageHref(page - 1)} aria-disabled={page <= 1}
                    className={cn("flex items-center gap-1 px-3.5 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 bg-white transition-colors shadow-sm",
                      page <= 1 ? "opacity-40 pointer-events-none" : "hover:bg-neutral-50")}>
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </Link>
                  <Link href={pageHref(page + 1)} aria-disabled={page >= totalPages}
                    className={cn("flex items-center gap-1 px-3.5 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 bg-white transition-colors shadow-sm",
                      page >= totalPages ? "opacity-40 pointer-events-none" : "hover:bg-neutral-50")}>
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── QUOTES TAB ─── */}
        {tab === "quotes" && (
          <div>
            {quotes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-white flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                  <MessageSquare className="w-7 h-7 text-brand-primary" />
                </div>
                <p className="font-semibold text-neutral-800">No quote requests yet</p>
                <p className="text-sm text-neutral-400 mt-1 mb-5">Visit an editor&apos;s profile and click &quot;Request a Quote&quot;</p>
                <Link href="/browse"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary transition-colors">
                  Browse editors
                </Link>
              </div>
            ) : (
              <div className="space-y-4 max-w-3xl">
                {quotes.map((quote) => {
                  const isExpired = quote.status === "pending" && new Date() > new Date(quote.expiresAt);
                  const effectiveStatus = isExpired ? "expired" : quote.status;
                  const cfg = QUOTE_STATUS_CONFIG[effectiveStatus] ?? QUOTE_STATUS_CONFIG.pending;
                  const Icon = cfg.icon;
                  const editorName = displayNameFromFull(quote.editorName ?? "");
                  const editorInitials = (quote.editorName ?? "").split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase();

                  return (
                    <div key={quote.id} className="bg-white rounded-2xl border border-neutral-200/60 shadow-sm overflow-hidden flex">
                      <div className={cn("w-1 shrink-0", cfg.stripe)} />
                      <div className="flex-1 min-w-0">
                        <div className="px-5 pt-4 pb-3 border-b border-neutral-100 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-900 shrink-0 uppercase select-none">
                              {editorInitials || "?"}
                            </div>
                            <p className="text-sm font-semibold text-neutral-900 truncate">{editorName}</p>
                            <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0", cfg.badge)}>
                              <Icon className="w-3 h-3" /> {cfg.label}
                            </span>
                          </div>
                          <span className="text-xs text-neutral-400 shrink-0">{formatDate(quote.createdAt)}</span>
                        </div>

                        <div className="px-5 py-4 space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-600 capitalize">{quote.videoType}</span>
                            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-600 tabular-nums">
                              {formatCurrency(quote.budgetMin)} – {formatCurrency(quote.budgetMax)}
                            </span>
                            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-600">{quote.deadlinePreference}</span>
                          </div>
                          <p className="text-sm text-neutral-500 line-clamp-2 leading-relaxed">{quote.brief}</p>

                          {quote.status === "offered" && quote.offeredPrice && (
                            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-0.5">
                                  <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Editor&apos;s offer</p>
                                  {quote.expiresAt && <QuoteCountdown expiresAt={quote.expiresAt} />}
                                </div>
                                <p className="text-2xl font-bold text-blue-900 tabular-nums shrink-0">{formatCurrency(quote.offeredPrice)}</p>
                              </div>
                              {quote.offerMessage && (
                                <p className="text-sm text-blue-900 border-t border-blue-200/60 pt-2.5">&ldquo;{quote.offerMessage}&rdquo;</p>
                              )}
                              <div className="flex gap-2 pt-0.5">
                                <Link href={`/client/quotes/${quote.id}/pay`}
                                  className="flex-1 text-center py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary transition-colors">
                                  Accept &amp; Pay {formatCurrency(quote.offeredPrice + Math.round(quote.offeredPrice * processingFeePct))}
                                </Link>
                                <QuoteDeclineButton quoteId={quote.id} />
                              </div>
                            </div>
                          )}

                          {quote.status === "paid" && quote.orderId && (
                            <Link href={`/client/orders/${quote.orderId}`}
                              className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors group">
                              <span>View your order</span>
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                          )}

                          {(quote.status === "declined" || isExpired) && (
                            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 flex items-center gap-2">
                              <XCircle className="w-4 h-4 text-neutral-400 shrink-0" />
                              {isExpired ? "This quote request expired without a response." : "You declined this offer."}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── CALENDAR TAB ─── */}
        {tab === "calendar" && (
          <>
            <div className="bg-white rounded-3xl border border-neutral-200/60 p-5 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5 text-brand-primary" />
              </div>
              <div>
                <p className="text-sm font-black text-neutral-900">Order Calendar</p>
                <p className="text-xs text-neutral-400 font-semibold">All your order deadlines at a glance</p>
              </div>
            </div>
            <CalendarClient orders={calendarOrders} />
          </>
        )}

      </div>
    </div>
  );
}
