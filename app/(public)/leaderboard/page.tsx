export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { editors, users, reviews, packages, userPoints, userBadges } from "@/lib/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { displayNameFromFull, formatCurrency } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { Star, Trophy, Shield, Crown, Zap, Medal, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Level } from "@/lib/rewards";

export const metadata = {
  title: "Top Editors – EditBridge Leaderboard",
  description: "The top-rated video editors on EditBridge, ranked by completed orders, ratings, and reputation.",
};

const LEVEL_CONFIG: Record<Level, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  bronze:   { label: "Bronze",   color: "text-amber-700",  bg: "bg-amber-100",   icon: Medal   },
  silver:   { label: "Silver",   color: "text-slate-500",  bg: "bg-slate-100",   icon: Medal   },
  gold:     { label: "Gold",     color: "text-yellow-600", bg: "bg-yellow-100",  icon: Crown   },
  platinum: { label: "Platinum", color: "text-indigo-600", bg: "bg-indigo-100",  icon: Zap     },
  diamond:  { label: "Diamond",  color: "text-cyan-600",   bg: "bg-cyan-100",    icon: Zap     },
  master:   { label: "Master",   color: "text-purple-600", bg: "bg-purple-100",  icon: Crown   },
  legend:   { label: "Legend",   color: "text-orange-700", bg: "bg-orange-100",  icon: Crown   },
};

// Rank score: 60% completion weight + 40% rating weight, bonus for high volume
function rankScore(totalOrders: number, avgRating: number | null, xp: number) {
  const orderScore = Math.min(totalOrders, 200) * 0.6;   // caps at 200 for fairness
  const ratingScore = (avgRating ?? 0) * 20 * 0.4;       // 5.0 rating = 40pts
  const xpBonus = Math.min(xp, 5000) * 0.002;            // small XP boost
  return orderScore + ratingScore + xpBonus;
}

export default async function LeaderboardPage() {
  // Fetch top 100 KYC-approved editors with their stats
  const rows = await db
    .select({
      editorId: editors.id,
      userId: editors.userId,
      displayName: editors.displayName,
      title: editors.title,
      niche: editors.niche,
      image: users.image,
      name: users.name,
      totalOrders: editors.totalOrders,
      completionRate: editors.completionRate,
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
    .limit(200); // fetch extra then sort in JS for accurate ranking

  // Sort by rank score descending, take top 100
  const ranked = rows
    .map(r => ({ ...r, score: rankScore(r.totalOrders, r.avgRating, r.xp) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);

  const top3 = ranked.slice(0, 3);
  const rest  = ranked.slice(3);

  function displayName(r: typeof ranked[0]) {
    return r.displayName ?? displayNameFromFull(r.name) ?? "Editor";
  }

  function StarRating({ rating, count }: { rating: number | null; count: number }) {
    if (!rating) return <span className="text-xs text-gray-400">No reviews yet</span>;
    return (
      <span className="flex items-center gap-1">
        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        <span className="text-sm font-semibold text-gray-900">{rating.toFixed(1)}</span>
        <span className="text-xs text-gray-400">({count})</span>
      </span>
    );
  }

  function LevelBadge({ level }: { level: Level }) {
    const cfg = LEVEL_CONFIG[level];
    const Icon = cfg.icon;
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", cfg.bg, cfg.color)}>
        <Icon className="w-2.5 h-2.5" />
        {cfg.label}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a1060] via-[#2d1b8e] to-[var(--brand-client)] pt-16 pb-20 px-4">
        <div className="px-8 py-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs font-medium mb-6">
            <Trophy className="w-3.5 h-3.5 text-yellow-300" />
            Updated daily
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Top 100 Editors
          </h1>
          <p className="text-white/60 text-lg px-8 py-6">
            The most trusted video editors on EditBridge, ranked by completed orders, client ratings, and reputation.
          </p>
        </div>
      </div>

      <div className="px-8 py-6 -mt-10 pb-20 space-y-8">

        {/* Podium — top 3 */}
        {top3.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 2nd place */}
            {top3[1] && (
              <div className="sm:mt-6 order-2 sm:order-1">
                <PodiumCard rank={2} editor={top3[1]} displayName={displayName(top3[1])} StarRating={StarRating} LevelBadge={LevelBadge} />
              </div>
            )}
            {/* 1st place */}
            {top3[0] && (
              <div className="order-1 sm:order-2">
                <PodiumCard rank={1} editor={top3[0]} displayName={displayName(top3[0])} StarRating={StarRating} LevelBadge={LevelBadge} />
              </div>
            )}
            {/* 3rd place */}
            {top3[2] && (
              <div className="sm:mt-10 order-3">
                <PodiumCard rank={3} editor={top3[2]} displayName={displayName(top3[2])} StarRating={StarRating} LevelBadge={LevelBadge} />
              </div>
            )}
          </div>
        )}

        {/* Rank 4–100 table */}
        {rest.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900 text-sm">Rankings #4 – #{rest.length + 3}</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {rest.map((ed, idx) => {
                const rank = idx + 4;
                const cfg = LEVEL_CONFIG[ed.level as Level] ?? LEVEL_CONFIG.bronze;
                const Icon = cfg.icon;
                const niches: string[] = (() => { try { return JSON.parse(ed.niche ?? "[]"); } catch { return []; } })();

                return (
                  <Link
                    key={ed.editorId}
                    href={`/editor/${ed.editorId}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    {/* Rank number */}
                    <div className="w-8 text-center">
                      <span className="text-sm font-bold text-gray-400 tabular-nums">#{rank}</span>
                    </div>

                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {ed.image ? (
                        <Image src={ed.image} alt={displayName(ed)} width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand-client)] to-[#7c6ff7] flex items-center justify-center">
                          <span className="text-sm font-bold text-white">{displayName(ed)[0]?.toUpperCase()}</span>
                        </div>
                      )}
                      {/* Level dot */}
                      <div className={cn("absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white", cfg.bg)}>
                        <Icon className={cn("w-2 h-2", cfg.color)} />
                      </div>
                    </div>

                    {/* Name + title + niches */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-[var(--brand-client)] transition-colors truncate">
                        {displayName(ed)}
                      </p>
                      {ed.title && <p className="text-xs text-gray-500 truncate">{ed.title}</p>}
                      {niches.length > 0 && (
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {niches.slice(0, 2).join(" · ")}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-6 shrink-0">
                      <div className="text-center">
                        <p className="text-xs font-bold text-gray-900">{ed.totalOrders}</p>
                        <p className="text-[10px] text-gray-400">orders</p>
                      </div>
                      <div className="text-center">
                        {ed.avgRating ? (
                          <>
                            <p className="text-xs font-bold text-gray-900 flex items-center gap-1 justify-center">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{ed.avgRating.toFixed(1)}
                            </p>
                            <p className="text-[10px] text-gray-400">{ed.reviewCount} reviews</p>
                          </>
                        ) : (
                          <p className="text-[10px] text-gray-400">No reviews</p>
                        )}
                      </div>
                      {ed.minPrice && (
                        <div className="text-center">
                          <p className="text-xs font-bold text-gray-900">from {formatCurrency(ed.minPrice)}</p>
                          <p className="text-[10px] text-gray-400">starting price</p>
                        </div>
                      )}
                    </div>

                    {/* Level badge — mobile hidden */}
                    <div className="hidden md:block shrink-0">
                      <LevelBadge level={ed.level as Level} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {ranked.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Leaderboard coming soon</p>
            <p className="text-sm mt-1">Editors are completing their profiles — check back shortly.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Podium card (top 3) ──────────────────────────────────────────────────────

function PodiumCard({
  rank,
  editor,
  displayName,
  StarRating,
  LevelBadge,
}: {
  rank: 1 | 2 | 3;
  editor: {
    editorId: string;
    image: string | null;
    name: string | null;
    title: string | null;
    niche: string | null;
    totalOrders: number;
    avgRating: number | null;
    reviewCount: number;
    minPrice: number | null;
    xp: number;
    badgeCount: number;
    level: Level;
  };
  displayName: string;
  StarRating: React.ComponentType<{ rating: number | null; count: number }>;
  LevelBadge: React.ComponentType<{ level: Level }>;
}) {
  const rankStyle = {
    1: { ring: "ring-yellow-400", bg: "from-yellow-50 to-white", icon: "🥇", label: "text-yellow-600", shield: "text-yellow-500" },
    2: { ring: "ring-slate-300",  bg: "from-slate-50 to-white",  icon: "🥈", label: "text-slate-500",  shield: "text-slate-400" },
    3: { ring: "ring-amber-300",  bg: "from-amber-50 to-white",  icon: "🥉", label: "text-amber-600",  shield: "text-amber-500" },
  }[rank];

  const niches: string[] = (() => { try { return JSON.parse(editor.niche ?? "[]"); } catch { return []; } })();

  return (
    <Link href={`/editor/${editor.editorId}`} className="block group">
      <div className={cn(
        "rounded-2xl border border-gray-100 bg-gradient-to-b p-5 text-center shadow-sm hover:shadow-md transition-shadow",
        rankStyle.bg,
        rank === 1 && "shadow-yellow-100"
      )}>
        {/* Rank badge */}
        <div className="text-3xl mb-3">{rankStyle.icon}</div>

        {/* Avatar */}
        <div className={cn("relative inline-block mb-3 ring-2 rounded-full", rankStyle.ring)}>
          {editor.image ? (
            <Image
              src={editor.image}
              alt={displayName}
              width={rank === 1 ? 80 : 64}
              height={rank === 1 ? 80 : 64}
              className={cn("rounded-full object-cover", rank === 1 ? "w-20 h-20" : "w-16 h-16")}
            />
          ) : (
            <div className={cn(
              "rounded-full bg-gradient-to-br from-[var(--brand-client)] to-[#7c6ff7] flex items-center justify-center",
              rank === 1 ? "w-20 h-20" : "w-16 h-16"
            )}>
              <span className={cn("font-bold text-white", rank === 1 ? "text-2xl" : "text-xl")}>
                {displayName[0]?.toUpperCase()}
              </span>
            </div>
          )}
          {rank === 1 && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <Crown className="w-5 h-5 text-yellow-500 fill-yellow-400" />
            </div>
          )}
        </div>

        {/* Name */}
        <p className={cn("font-bold text-gray-900 group-hover:text-[var(--brand-client)] transition-colors mb-0.5", rank === 1 ? "text-base" : "text-sm")}>
          {displayName}
        </p>
        {editor.title && <p className="text-xs text-gray-500 mb-2 truncate">{editor.title}</p>}

        {/* Level */}
        <div className="flex justify-center mb-3">
          <LevelBadge level={editor.level} />
        </div>

        {/* Stats row */}
        <div className="flex justify-center gap-4 text-xs mb-3">
          <div className="text-center">
            <p className="font-bold text-gray-900">{editor.totalOrders}</p>
            <p className="text-gray-400 text-[10px]">orders</p>
          </div>
          <div className="w-px bg-gray-200" />
          <div className="text-center">
            <p className="font-bold text-gray-900">{editor.xp.toLocaleString()}</p>
            <p className="text-gray-400 text-[10px]">XP</p>
          </div>
          {editor.badgeCount > 0 && (
            <>
              <div className="w-px bg-gray-200" />
              <div className="text-center">
                <p className="font-bold text-gray-900">{editor.badgeCount}</p>
                <p className="text-gray-400 text-[10px]">badges</p>
              </div>
            </>
          )}
        </div>

        <StarRating rating={editor.avgRating} count={editor.reviewCount} />

        {editor.minPrice && (
          <p className="text-xs text-gray-400 mt-2">from {formatCurrency(editor.minPrice)}</p>
        )}

        {niches.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 mt-3">
            {niches.slice(0, 2).map(n => (
              <span key={n} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{n}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}