export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { savedEditors, editors, users, reviews, orders, portfolioSaves, portfolioItems } from "@/lib/db/schema";
import { and, eq, sql, inArray, desc } from "drizzle-orm";
import { Heart, Star, ShoppingBag, Search, RefreshCw, Bookmark, Film, Eye, MessageCircle, Play } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn, displayNameFromFull, formatDate } from "@/lib/utils";
import { UnsaveButton } from "./unsave-button";
import { TopoBackground } from "@/components/common/topo-background";

const PAGE_TABS = [
  { value: "editors",   label: "Saved Editors" },
  { value: "portfolio", label: "Saved Portfolio" },
];

export default async function SavedEditorsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "client") redirect("/client/dashboard");

  const params = await searchParams;
  const tab = (params.tab === "portfolio" ? "portfolio" : "editors") as "editors" | "portfolio";
  const clientId = session.user.userId!;

  // ── Saved Editors data ──────────────────────────────────────────────────────
  const avgRatingExpr = sql<number | null>`ROUND(AVG(${reviews.rating})::numeric, 1)`;

  const editorRows = await db
    .select({
      savedAt: savedEditors.createdAt,
      editorId: editors.id,
      name: users.name,
      displayName: editors.displayName,
      title: editors.title,
      image: users.image,
      isAvailable: editors.isAvailable,
      vacationUntil: editors.vacationUntil,
      totalOrders: editors.totalOrders,
      avgRating: avgRatingExpr,
      reviewCount: sql<number>`COUNT(DISTINCT ${reviews.id})::int`,
    })
    .from(savedEditors)
    .innerJoin(editors, eq(editors.id, savedEditors.editorId))
    .innerJoin(users, eq(users.id, editors.userId))
    .leftJoin(reviews, and(eq(reviews.revieweeId, editors.userId), eq(reviews.role, "client")))
    .where(eq(savedEditors.clientId, clientId))
    .groupBy(savedEditors.createdAt, editors.id, users.name, users.image)
    .orderBy(desc(savedEditors.createdAt));

  const editorIds = editorRows.map((r) => r.editorId);

  const [orderCounts, lastOrders] = editorIds.length
    ? await Promise.all([
        db.select({ editorId: orders.editorId, count: sql<number>`COUNT(*)::int` })
          .from(orders)
          .where(and(eq(orders.clientId, clientId), inArray(orders.editorId, editorIds)))
          .groupBy(orders.editorId),

        db.select({ editorId: orders.editorId, orderId: orders.id, packageId: orders.packageId, createdAt: orders.createdAt })
          .from(orders)
          .where(and(eq(orders.clientId, clientId), inArray(orders.editorId, editorIds), sql`${orders.packageId} IS NOT NULL`))
          .orderBy(desc(orders.createdAt)),
      ])
    : [[], []];

  const ordersByEditor = new Map(orderCounts.map((o) => [o.editorId, o.count]));
  const lastOrderByEditor = new Map<string, { orderId: string; packageId: string }>();
  for (const o of lastOrders) {
    if (!lastOrderByEditor.has(o.editorId) && o.packageId) {
      lastOrderByEditor.set(o.editorId, { orderId: o.orderId, packageId: o.packageId });
    }
  }

  // ── Saved Portfolio data ────────────────────────────────────────────────────
  const r2Base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  const toProxy = (raw: string | null) => {
    if (!raw) return null;
    if (raw.startsWith("/api/file/")) return raw;
    if (r2Base && raw.startsWith(r2Base)) return `/api/file/${raw.slice(r2Base.length + 1)}`;
    return `/api/file/${raw}`;
  };

  const portfolioRows = await db
    .select({
      savedAt: portfolioSaves.createdAt,
      itemId: portfolioItems.id,
      itemType: portfolioItems.type,
      itemUrl: portfolioItems.url,
      itemTitle: portfolioItems.title,
      itemCategory: portfolioItems.category,
      itemLikes: portfolioItems.likesCount,
      itemComments: portfolioItems.commentsCount,
      itemViews: portfolioItems.viewsCount,
      editorId: editors.id,
      editorDisplayName: editors.displayName,
      editorUserName: users.name,
      editorUserImage: users.image,
    })
    .from(portfolioSaves)
    .innerJoin(portfolioItems, eq(portfolioSaves.portfolioItemId, portfolioItems.id))
    .innerJoin(editors, eq(portfolioItems.editorId, editors.id))
    .innerJoin(users, eq(editors.userId, users.id))
    .where(eq(portfolioSaves.userId, clientId))
    .orderBy(desc(portfolioSaves.createdAt));

  const now = new Date();

  return (
    <div className="relative min-h-screen bg-slate-50/50 pb-12 overflow-hidden">
      <TopoBackground background="#f8fafc" strokeColor="#e2e8f0" opacity={0.4} />

      <div className="max-w-6xl mx-auto px-6 pt-6 space-y-6 relative z-10">

        {/* Header Card */}
        <div className="bg-white rounded-3xl border border-neutral-200/60 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-5 h-5 text-red-500 fill-red-500" />
              <h1 className="text-xl font-bold text-neutral-900">Saved</h1>
            </div>
            <p className="text-xs text-neutral-400 font-semibold mt-1">
              {tab === "editors"
                ? `${editorRows.length} saved editor${editorRows.length !== 1 ? "s" : ""}`
                : `${portfolioRows.length} bookmarked item${portfolioRows.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Link href="/browse"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-black hover:bg-neutral-900 transition-colors shadow-sm shrink-0">
            <Search className="w-3.5 h-3.5" /> Browse editors
          </Link>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-2">
          {PAGE_TABS.map((t) => {
            const isActive = tab === t.value;
            return (
              <Link
                key={t.value}
                href={t.value === "editors" ? "/client/saved" : `/client/saved?tab=${t.value}`}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shadow-sm",
                  isActive
                    ? "bg-violet-600 border-violet-600 text-white"
                    : "bg-white border-neutral-200/60 text-neutral-600 hover:bg-neutral-50"
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {/* ─── EDITORS TAB ─── */}
        {tab === "editors" && (
          editorRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Heart className="w-7 h-7 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-700">No saved editors yet</p>
              <p className="text-sm text-gray-400 mt-1 mb-5">Tap the heart icon on any editor profile to save them here.</p>
              <Link href="/browse"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "var(--brand-client)" }}>
                <Search className="w-3.5 h-3.5" /> Browse editors
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {editorRows.map((editor) => {
                const shownName = editor.displayName || displayNameFromFull(editor.name);
                const initials = shownName.slice(0, 2).toUpperCase();
                const isAway = editor.vacationUntil && new Date(editor.vacationUntil) > now;
                const lastOrder = lastOrderByEditor.get(editor.editorId);
                const orderCount = ordersByEditor.get(editor.editorId) ?? 0;

                return (
                  <div key={editor.editorId} className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 px-5 py-4">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-[var(--brand-client)] to-[#6c63d4] flex items-center justify-center">
                        {editor.image
                          ? <Image src={editor.image} alt={shownName} width={48} height={48} className="object-cover w-full h-full" />
                          : <span className="text-white font-bold text-sm">{initials}</span>}
                      </div>
                      {!isAway && editor.isAvailable && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{shownName}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {editor.title && <span className="text-xs text-gray-500 truncate">{editor.title}</span>}
                        {editor.avgRating != null && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {editor.avgRating.toFixed(1)}
                          </span>
                        )}
                        {orderCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <ShoppingBag className="w-3 h-3" />
                            {orderCount} order{orderCount !== 1 ? "s" : ""} together
                          </span>
                        )}
                      </div>
                      {isAway ? (
                        <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                          Away until {formatDate(editor.vacationUntil!)}
                        </span>
                      ) : !editor.isAvailable ? (
                        <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
                          Not accepting orders
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {lastOrder ? (
                        <Link
                          href={`/checkout/${lastOrder.packageId}?reorder=true&orderId=${lastOrder.orderId}`}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-colors",
                            isAway || !editor.isAvailable ? "bg-gray-300 pointer-events-none" : "bg-[var(--brand-client)] hover:bg-brand-primary"
                          )}>
                          <RefreshCw className="w-3.5 h-3.5" /> Re-order
                        </Link>
                      ) : (
                        <Link href={`/editor/${editor.editorId}`}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[var(--brand-client)] hover:bg-brand-primary transition-colors">
                          View profile
                        </Link>
                      )}
                      <UnsaveButton editorId={editor.editorId} />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ─── PORTFOLIO TAB ─── */}
        {tab === "portfolio" && (
          portfolioRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-white flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--brand-client)]/10 flex items-center justify-center mb-4">
                <Bookmark className="w-7 h-7 text-[var(--brand-client)]" />
              </div>
              <p className="font-semibold text-gray-800">No saved items yet</p>
              <p className="text-sm text-gray-400 mt-1 mb-5">Bookmark portfolio items from the feed to find them here.</p>
              <Link href="/feed"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl transition-colors"
                style={{ background: "var(--brand-client)" }}>
                <Film className="w-4 h-4" /> Browse Feed
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {portfolioRows.map((row) => {
                const proxyUrl = toProxy(row.itemUrl) ?? row.itemUrl;
                return (
                  <Link
                    key={row.itemId}
                    href={`/feed?item=${row.itemId}`}
                    className="group relative rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shadow-sm hover:shadow-md transition-shadow aspect-[9/16]"
                  >
                    {row.itemType === "video" ? (
                      <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                        <Play className="w-10 h-10 text-white/60" />
                        <video src={proxyUrl ?? undefined} className="absolute inset-0 w-full h-full object-cover opacity-60" muted preload="metadata" />
                      </div>
                    ) : (
                      <Image src={proxyUrl ?? ""} alt={row.itemTitle ?? "Portfolio"} fill className="object-cover" sizes="(max-width:640px) 50vw, 33vw" unoptimized />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                      {row.itemCategory && (
                        <span className="text-[9px] font-bold text-white/60 uppercase tracking-wide">{row.itemCategory}</span>
                      )}
                      <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{row.itemTitle ?? "Untitled"}</p>
                      <div className="flex items-center gap-1.5">
                        {row.editorUserImage ? (
                          <Image src={row.editorUserImage} alt={row.editorDisplayName ?? ""} width={16} height={16} className="rounded-full object-cover shrink-0" unoptimized />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-brand-primary flex items-center justify-center shrink-0">
                            <span className="text-white text-[8px] font-bold">{(row.editorDisplayName ?? row.editorUserName ?? "?").slice(0, 1).toUpperCase()}</span>
                          </div>
                        )}
                        <span className="text-white/70 text-[10px] truncate">{row.editorDisplayName ?? row.editorUserName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/50 text-[9px]">
                        <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{row.itemViews}</span>
                        <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{row.itemLikes}</span>
                        <span className="flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5" />{row.itemComments}</span>
                      </div>
                    </div>

                    <div className="absolute top-2 right-2 bg-black/50 text-white/70 text-[9px] px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                      {formatDate(row.savedAt)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        )}

      </div>
    </div>
  );
}
