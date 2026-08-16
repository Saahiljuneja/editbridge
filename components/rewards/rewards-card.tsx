"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Level } from "@/lib/rewards";

interface Badge {
  id: string;
  badge: string;
  awardedAt: string;
  label: string;
  emoji: string;
  desc: string;
}

interface RewardsData {
  xp: number;
  currentXp: number;
  level: Level;
  xpToNext: number;
  nextLevel: string | null;
  availableCredits: number;
  role: "editor" | "client";
  progress: Record<string, number>;
  badges: Badge[];
}

const LEVEL_CONFIG: Record<Level, { label: string; color: string; bg: string; border: string; bar: string }> = {
  bronze:   { label: "Bronze",   color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200",  bar: "bg-amber-500"  },
  silver:   { label: "Silver",   color: "text-slate-600",  bg: "bg-slate-50",   border: "border-slate-200",  bar: "bg-slate-400"  },
  gold:     { label: "Gold",     color: "text-yellow-600", bg: "bg-yellow-50",  border: "border-yellow-200", bar: "bg-yellow-500" },
  platinum: { label: "Platinum", color: "text-indigo-700", bg: "bg-indigo-50",  border: "border-indigo-200", bar: "bg-indigo-500" },
};

const LEVEL_START: Record<Level, number> = { bronze: 0, silver: 500, gold: 2000, platinum: 5000 };
const LEVEL_MAX: Record<Level, number>   = { bronze: 500, silver: 2000, gold: 5000, platinum: Infinity };

// Each milestone: { badge key, emoji, label, what triggers it, current count fn, target }
type Milestone = {
  badge: string;
  emoji: string;
  label: string;
  desc: string;
  current: (p: Record<string, number>) => number;
  target: number;
  xp: number;
  credit?: string;
};

const EDITOR_MILESTONES: Milestone[] = [
  {
    badge: "profile_star", emoji: "⭐", label: "Profile Star",
    desc: "Complete your profile & get KYC approved",
    current: () => 0, target: 1,
    xp: 100,
  },
  {
    badge: "first_delivery", emoji: "🎬", label: "First Delivery",
    desc: "Complete your 1st order",
    current: p => p.completedOrders ?? 0, target: 1,
    xp: 50,
  },
  {
    badge: "rising_star", emoji: "🌟", label: "Rising Star",
    desc: "Complete 5 orders",
    current: p => p.completedOrders ?? 0, target: 5,
    xp: 50,
  },
  {
    badge: "verified_pro", emoji: "🏆", label: "Verified Pro",
    desc: "Complete 25 orders",
    current: p => p.completedOrders ?? 0, target: 25,
    xp: 50,
  },
  {
    badge: "top_rated", emoji: "💎", label: "Top Rated",
    desc: "Complete 50 orders",
    current: p => p.completedOrders ?? 0, target: 50,
    xp: 50, credit: "₹500 bonus credit",
  },
  {
    badge: "speed_demon", emoji: "⚡", label: "Speed Demon",
    desc: "Deliver 10 orders before the deadline",
    current: p => p.earlyDeliveries ?? 0, target: 10,
    xp: 15,
  },
  {
    badge: "streak_master", emoji: "🔥", label: "Streak Master",
    desc: "Complete 5 orders in a single day",
    current: p => 0, target: 5,
    xp: 100,
  },
];

const CLIENT_MILESTONES: Milestone[] = [
  {
    badge: "first_order", emoji: "🛍️", label: "First Order",
    desc: "Place your 1st order",
    current: p => p.placedOrders ?? 0, target: 1,
    xp: 20,
  },
  {
    badge: "supporter", emoji: "💪", label: "Supporter",
    desc: "Place 5 orders",
    current: p => p.placedOrders ?? 0, target: 5,
    xp: 20,
  },
  {
    badge: "power_client", emoji: "👑", label: "Power Client",
    desc: "Place 25 orders",
    current: p => p.placedOrders ?? 0, target: 25,
    xp: 20,
  },
  {
    badge: "top_reviewer", emoji: "✍️", label: "Top Reviewer",
    desc: "Leave 10 reviews",
    current: p => p.reviewsLeft ?? 0, target: 10,
    xp: 20, credit: "₹200 bonus credit at 10th order",
  },
];

function MiniProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function RewardsCard() {
  const [data, setData] = useState<RewardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"earned" | "upcoming">("upcoming");

  useEffect(() => {
    fetch("/api/rewards")
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5 animate-pulse">
        <div className="h-4 w-24 bg-gray-100 rounded mb-3" />
        <div className="h-2 w-full bg-gray-100 rounded mb-5" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const cfg = LEVEL_CONFIG[data.level];
  const start = LEVEL_START[data.level];
  const max   = LEVEL_MAX[data.level];
  const progress = max === Infinity ? 100 : Math.min(100, ((data.xp - start) / (max - start)) * 100);

  const earnedKeys = new Set(data.badges.map(b => b.badge));
  const milestones = data.role === "editor" ? EDITOR_MILESTONES : CLIENT_MILESTONES;
  const upcoming = milestones.filter(m => !earnedKeys.has(m.badge));

  return (
    <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
      {/* Level header */}
      <div className={cn("px-5 py-4", cfg.bg)}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className={cn("text-[11px] font-bold uppercase tracking-widest", cfg.color)}>
              {cfg.label} level
            </span>
            <p className="text-xl font-bold text-gray-900 leading-tight">{data.xp.toLocaleString()} XP</p>
          </div>
          {data.availableCredits > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Credits</p>
              <p className="text-base font-bold text-green-600">₹{(data.availableCredits / 100).toFixed(0)}</p>
            </div>
          )}
        </div>

        {data.nextLevel ? (
          <>
            <div className="h-2 bg-white/50 rounded-full overflow-hidden mb-1">
              <div className={cn("h-full rounded-full transition-all duration-700", cfg.bar)} style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[10px] text-gray-500">
              {data.xpToNext.toLocaleString()} XP to {data.nextLevel.charAt(0).toUpperCase() + data.nextLevel.slice(1)}
            </p>
          </>
        ) : (
          <p className="text-[11px] font-semibold text-purple-600">✨ Maximum level reached!</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {(["upcoming", "earned"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2.5 text-xs font-semibold transition-colors",
              tab === t ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-400 hover:text-gray-600"
            )}
          >
            {t === "upcoming" ? `Upcoming (${upcoming.length})` : `Earned (${data.badges.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
        {tab === "upcoming" ? (
          upcoming.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">All badges earned! 🎉</div>
          ) : (
            upcoming.map(m => {
              const current = m.current(data.progress);
              const done = current >= m.target;
              const pct = Math.min(1, current / m.target);
              return (
                <div key={m.badge} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-start gap-2.5">
                    <span className="text-xl leading-none mt-0.5 grayscale opacity-50">{m.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-gray-700">{m.label}</span>
                        <span className="text-[10px] font-bold text-gray-500 shrink-0">
                          +{m.xp} XP{m.credit ? ` · ${m.credit}` : ""}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mb-2 leading-snug">{m.desc}</p>
                      {m.target > 1 && (
                        <>
                          <MiniProgressBar value={current} max={m.target} color="bg-gray-400" />
                          <p className="text-[10px] text-gray-400 mt-1">
                            {current} / {m.target}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          data.badges.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">No badges yet — complete your first milestone!</div>
          ) : (
            data.badges.map(b => (
              <div key={b.id} className="flex items-center gap-2.5 rounded-xl bg-green-50 border border-green-100 px-3 py-2.5">
                <span className="text-xl leading-none">{b.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800">{b.label}</p>
                  <p className="text-[11px] text-gray-500 leading-snug">{b.desc}</p>
                </div>
                <span className="text-[10px] text-green-600 font-bold shrink-0">✓</span>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
