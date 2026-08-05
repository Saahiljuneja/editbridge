export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { editors, users, orders } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { displayNameFromFull } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { Trophy } from "lucide-react";
import type { Level } from "@/lib/rewards";
import { LeaderboardClient, type RankedEditor } from "./leaderboard-client";

export const metadata = {
  title: "Top 100 Editors – EditBridge Leaderboard",
  description:
    "The top-rated video editors on EditBridge, ranked by completed orders, client ratings, and reputation.",
};

function rankScore(totalOrders: number, avgRating: number | null, xp: number) {
  const orderScore = Math.min(totalOrders, 200) * 0.6;
  const ratingScore = (avgRating ?? 0) * 20 * 0.4;
  const xpBonus = Math.min(xp, 5000) * 0.002;
  return orderScore + ratingScore + xpBonus;
}

export default async function LeaderboardPage() {
  // ── 1. Fetch all eligible editors (top 120 for rising stars) ──────────────
  const rows = await db
    .select({
      editorId: editors.id,
      userId: editors.userId,
      displayName: editors.displayName,
      title: editors.title,
      niche: editors.niche,
      bio: editors.bio,
      image: users.image,
      name: users.name,
      totalOrders: editors.totalOrders,
      isAvailable: editors.isAvailable,
      avgRating: sql<number | null>`
        (SELECT ROUND(AVG(r.rating)::numeric, 1)
         FROM reviews r
         INNER JOIN orders o ON r.order_id = o.id
         WHERE o.editor_id = ${editors.id} AND r.role = 'client')
      `,
      reviewCount: sql<number>`
        (SELECT COUNT(*)::int
         FROM reviews r
         INNER JOIN orders o ON r.order_id = o.id
         WHERE o.editor_id = ${editors.id} AND r.role = 'client')
      `,
      minPrice: sql<number | null>`
        (SELECT MIN(p.price) FROM packages p WHERE p.editor_id = ${editors.id} AND p.is_active = true)
      `,
      xp: sql<number>`COALESCE(
        (SELECT up.total FROM user_points up WHERE up.user_id = ${editors.userId}), 0
      )`,
      level: sql<Level>`COALESCE(
        (SELECT up.level FROM user_points up WHERE up.user_id = ${editors.userId}), 'bronze'
      )`,
      badgeCount: sql<number>`
        (SELECT COUNT(*)::int FROM user_badges ub WHERE ub.user_id = ${editors.userId})
      `,
    })
    .from(editors)
    .innerJoin(users, eq(users.id, editors.userId))
    .where(and(eq(editors.kycStatus, "approved"), eq(users.isActive, true)))
    .limit(300);

  // ── 2. Score + sort ────────────────────────────────────────────────────────
  const scored = rows
    .map(r => ({ ...r, score: rankScore(r.totalOrders, r.avgRating, r.xp), activeOrders: 0 }))
    .sort((a, b) => b.score - a.score);

  const top120 = scored.slice(0, 120);
  const editorIds = top120.map(r => r.editorId);

  // ── 3. Fetch active order counts for top 120 ───────────────────────────────
  let activeOrderCounts: Record<string, number> = {};
  if (editorIds.length > 0) {
    const activeCounts = await db
      .select({
        editorId: orders.editorId,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(orders)
      .where(
        and(
          inArray(orders.editorId, editorIds),
          inArray(orders.status, ["in_progress", "delivered", "revision_requested"])
        )
      )
      .groupBy(orders.editorId);

    activeOrderCounts = Object.fromEntries(activeCounts.map(r => [r.editorId, r.count]));
  }

  // ── 4. Attach active order counts ─────────────────────────────────────────
  const withActive = top120.map(r => ({
    ...r,
    activeOrders: activeOrderCounts[r.editorId] ?? 0,
  }));

  const ranked: RankedEditor[] = withActive.slice(0, 100);
  const risingStars: RankedEditor[] = withActive.slice(100, 120);

  // ── 5. Weekly mover: editor with highest XP-to-orders ratio (most growth) ─
  const weeklyMover: RankedEditor | null =
    ranked.length > 3
      ? ranked.slice(3).reduce<RankedEditor | null>((best, ed) => {
          const ratio = ed.totalOrders > 0 ? ed.xp / ed.totalOrders : ed.xp;
          const bestRatio = best
            ? (best.totalOrders > 0 ? best.xp / best.totalOrders : best.xp)
            : -1;
          return ratio > bestRatio ? ed : best;
        }, null)
      : null;

  // ── 6. Current user session (for "Your Rank" banner) ──────────────────────
  const session = await auth();
  let currentEditorId: string | null = null;
  if (session?.user?.id) {
    const editorRow = ranked.find(r => r.userId === session.user.id);
    currentEditorId = editorRow?.editorId ?? null;
  }

  return (
    <div className="min-h-screen bg-[#ffffff]">
      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#1a1060] via-[#2d1b8e] to-[var(--brand-client)] pt-16 pb-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/70 text-xs font-medium mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <Trophy className="w-3.5 h-3.5 text-yellow-300" />
            Updated daily
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 tracking-tight">
            Top 100 Editors
          </h1>
          <p className="text-white/60 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
            The most trusted video editors on EditBridge — ranked by orders,
            ratings, and reputation.
          </p>
        </div>
      </div>

      {/* ─── Client section ────────────────────────────────────────────────── */}
      <LeaderboardClient
        ranked={ranked}
        risingStars={risingStars}
        weeklyMover={weeklyMover}
        currentEditorId={currentEditorId}
      />
    </div>
  );
}
