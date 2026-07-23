export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { savedEditors, editors, users, reviews, orders } from "@/lib/db/schema";
import { and, eq, sql, inArray, desc } from "drizzle-orm";
import { Heart, Star, ShoppingBag, Search, RefreshCw } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn, displayNameFromFull, formatDate } from "@/lib/utils";
import { UnsaveButton } from "./unsave-button";

export default async function SavedEditorsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "client") redirect("/dashboard");

  const clientId = session.user.userId!;
  const avgRatingExpr = sql<number | null>`ROUND(AVG(${reviews.rating})::numeric, 1)`;

  const rows = await db
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

  const editorIds = rows.map((r) => r.editorId);

  // Count of orders placed with each saved editor, for "N orders together"
  const orderCounts = editorIds.length
    ? await db
        .select({
          editorId: orders.editorId,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(orders)
        .where(and(eq(orders.clientId, clientId), inArray(orders.editorId, editorIds)))
        .groupBy(orders.editorId)
    : [];
  const ordersByEditor = new Map(orderCounts.map((o) => [o.editorId, o.count]));

  // Most recent order (with a package) for the one-click re-order button
  const lastOrders = editorIds.length
    ? await db
        .select({
          editorId: orders.editorId,
          orderId: orders.id,
          packageId: orders.packageId,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(
          and(
            eq(orders.clientId, clientId),
            inArray(orders.editorId, editorIds),
            sql`${orders.packageId} IS NOT NULL`
          )
        )
        .orderBy(desc(orders.createdAt))
    : [];
  const lastOrderByEditor = new Map<string, { orderId: string; packageId: string }>();
  for (const o of lastOrders) {
    if (!lastOrderByEditor.has(o.editorId) && o.packageId) {
      lastOrderByEditor.set(o.editorId, { orderId: o.orderId, packageId: o.packageId });
    }
  }

  const now = new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="px-8 py-6">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            <h1 className="text-xl font-bold text-gray-900">Saved editors ({rows.length})</h1>
          </div>
          <p className="text-sm text-gray-400">Your favourite editors, saved for quick access.</p>
        </div>
      </div>

      <div className="px-8 py-6 ">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Heart className="w-7 h-7 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-700">No saved editors yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">
              Tap the heart icon on any editor profile to save them here.
            </p>
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#0EA5E9" }}
            >
              <Search className="w-3.5 h-3.5" /> Browse editors
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((editor) => {
              const shownName = editor.displayName || displayNameFromFull(editor.name);
              const initials = shownName.slice(0, 2).toUpperCase();
              const isAway = editor.vacationUntil && new Date(editor.vacationUntil) > now;
              const lastOrder = lastOrderByEditor.get(editor.editorId);
              const orderCount = ordersByEditor.get(editor.editorId) ?? 0;

              return (
                <div
                  key={editor.editorId}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 px-5 py-4"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-[#0EA5E9] to-[#6c63d4] flex items-center justify-center">
                      {editor.image ? (
                        <Image src={editor.image} alt={shownName} width={48} height={48} className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-white font-bold text-sm">{initials}</span>
                      )}
                    </div>
                    {!isAway && editor.isAvailable && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{shownName}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {editor.title && (
                        <span className="text-xs text-gray-500 truncate">{editor.title}</span>
                      )}
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

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {lastOrder ? (
                      <Link
                        href={`/checkout/${lastOrder.packageId}?reorder=true&orderId=${lastOrder.orderId}`}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-colors",
                          isAway || !editor.isAvailable ? "bg-gray-300 pointer-events-none" : "bg-[#0EA5E9] hover:bg-[#3d34a0]"
                        )}
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Re-order
                      </Link>
                    ) : (
                      <Link
                        href={`/editor/${editor.editorId}`}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#0EA5E9] hover:bg-[#3d34a0] transition-colors"
                      >
                        View profile
                      </Link>
                    )}
                    <UnsaveButton editorId={editor.editorId} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}