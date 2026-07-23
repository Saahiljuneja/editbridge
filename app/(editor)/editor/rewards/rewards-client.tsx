"use client";

import { useEffect, useState } from "react";
import { Zap, Gift, Clock, Trophy, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Level } from "@/lib/rewards";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Badge { id: string; badge: string; awardedAt: string; label: string; emoji: string; desc: string; }
interface LeaderboardEntry { rank: number; userId: string; weekXp: number; name: string; image: string | null; editorId: string | null; }
interface RewardsData {
  xp: number; level: Level; xpToNext: number; nextLevel: string | null;
  availableCredits: number; progress: Record<string, number>; badges: Badge[];
}
interface XpTx { id: string; amount: number; reason: string; createdAt: string; }
interface CreditTx { id: string; amount: number; reason: string; expiresAt: string | null; usedAt: string | null; createdAt: string; }

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type LevelMeta = {
  label: string; emoji: string; tagline: string;
  accent: string; ring: string; glow: string;
  start: number; end: number;
};

const LM: Record<Level, LevelMeta> = {
  bronze:   { label: "Bronze",   emoji: "ðŸ¥‰", tagline: "Getting started",    accent: "#D97706", ring: "#F59E0B", glow: "rgba(245,158,11,0.08)",    start: 0,    end: 500      },
  silver:   { label: "Silver",   emoji: "ðŸ¥ˆ", tagline: "Building momentum",  accent: "#6B7280", ring: "#9CA3AF", glow: "rgba(156,163,175,0.08)",   start: 500,  end: 2000     },
  gold:     { label: "Gold",     emoji: "ðŸ¥‡", tagline: "Top performer",      accent: "#B45309", ring: "#EAB308", glow: "rgba(234,179,8,0.08)",      start: 2000, end: 5000     },
  platinum: { label: "Platinum", emoji: "ðŸ’Ž", tagline: "Elite editor",       accent: "#4F46E5", ring: "#818CF8", glow: "rgba(129,140,248,0.1)",     start: 5000, end: Infinity },
};

const LEVEL_ORDER: Level[] = ["bronze", "silver", "gold", "platinum"];
const LEVEL_XP_LABELS = ["0", "500", "2,000", "5,000+"];

const PERKS: Record<Level, Array<{ icon: string; text: string }>> = {
  bronze:   [{ icon: "ðŸ“¦", text: "3 service packages" }, { icon: "ðŸ”", text: "Standard placement" }],
  silver:   [{ icon: "ðŸ“¦", text: "4 service packages" }, { icon: "ðŸ…", text: "Silver badge" }],
  gold:     [{ icon: "ðŸ“¦", text: "5 service packages" }, { icon: "â­", text: "Featured in search" }, { icon: "ðŸ…", text: "Gold badge" }],
  platinum: [{ icon: "ðŸ“¦", text: "5 service packages" }, { icon: "ðŸ”", text: "Top placement" }, { icon: "ðŸŽ¨", text: "Custom banner" }, { icon: "ðŸŽ¯", text: "Priority support" }],
};

const BADGES: Record<string, { label: string; emoji: string; desc: string; hint: string; credit?: string }> = {
  profile_star:   { label: "Profile Star",   emoji: "â­", desc: "Complete profile + KYC",         hint: "Fill your bio, niche, portfolio & get KYC approved",  },
  first_delivery: { label: "First Delivery", emoji: "ðŸŽ¬", desc: "Complete your first order",        hint: "Deliver your very first project to a client",           },
  rising_star:    { label: "Rising Star",    emoji: "ðŸŒŸ", desc: "Complete 5 orders",                hint: "5 successful deliveries",                               },
  verified_pro:   { label: "Verified Pro",   emoji: "ðŸ†", desc: "Complete 25 orders",               hint: "25 successful deliveries",                              },
  top_rated:      { label: "Top Rated",      emoji: "ðŸ’Ž", desc: "50 orders Â· avg â‰¥ 4.5 â˜…",         hint: "Maintain excellence at scale",                          credit: "â‚¹500 bonus credit" },
  speed_demon:    { label: "Speed Demon",    emoji: "âš¡", desc: "10 early deliveries",               hint: "Deliver 10 orders before the deadline",                 },
  streak_master:  { label: "Streak Master",  emoji: "ðŸ”¥", desc: "5 orders in one week",             hint: "Complete 5 orders in a single Monâ€“Sun week",            },
  early_bird:     { label: "Early Bird",     emoji: "ðŸ¦", desc: "First 50 editors on platform",     hint: "Awarded to the first 50 editors who joined",            },
  perfect_month:  { label: "Perfect Month",  emoji: "ðŸŒ™", desc: "10+ orders, zero disputes (month)", hint: "Complete 10+ orders in a calendar month with no disputes", },
  client_favorite:{ label: "Client Favorite",emoji: "ðŸ’–", desc: "Saved by 25+ unique clients",       hint: "25 different clients added you to their saved list",     },
  quick_responder:{ label: "Quick Responder",emoji: "âš¡ï¸", desc: "Avg response under 2 hours",        hint: "Keep your average reply time under 2 hours",             },
  referral_pro:   { label: "Referral Pro",   emoji: "ðŸ¤", desc: "Referred a user successfully",      hint: "Share your referral link â€” awarded on first conversion",  },
};

// Progress toward each badge â€” returns { current, target } or null if not trackable
function getBadgeProgress(key: string, progress: Record<string, number>): { current: number; target: number } | null {
  const c = progress.completedOrders ?? 0;
  if (key === "first_delivery") return c >= 1  ? null : { current: c, target: 1  };
  if (key === "rising_star")    return c >= 5  ? null : { current: c, target: 5  };
  if (key === "verified_pro")   return c >= 25 ? null : { current: c, target: 25 };
  if (key === "top_rated")      return c >= 50 ? null : { current: c, target: 50 };
  if (key === "speed_demon") {
    const e = progress.earlyDeliveries ?? 0;
    return e >= 10 ? null : { current: e, target: 10 };
  }
  if (key === "streak_master") {
    const w = progress.weekOrders ?? 0;
    return w >= 5 ? null : { current: w, target: 5 };
  }
  return null;
}

const BADGE_KEYS = ["profile_star","first_delivery","rising_star","verified_pro","top_rated","speed_demon","streak_master","early_bird","perfect_month","client_favorite","quick_responder","referral_pro"];

const XP_ENTRY: Record<string, { label: string; icon: string }> = {
  order_completed:      { label: "Order completed",         icon: "ðŸŽ¬" },
  early_delivery:       { label: "Early delivery bonus",    icon: "âš¡" },
  five_star_review:     { label: "5-star review received",  icon: "â­" },
  review_received:      { label: "Positive review received",icon: "ðŸŒŸ" },
  profile_completed:    { label: "Profile completed",       icon: "âœ…" },
  repeat_client_bonus:  { label: "Repeat client bonus",     icon: "ðŸ¤" },
  quote_received:       { label: "Quote request received",  icon: "ðŸ“‹" },
  qa_answered:          { label: "Answered client question",icon: "ðŸ’¬" },
  portfolio_added:      { label: "Portfolio item added",    icon: "ðŸ–¼ï¸" },
};

const RING_R = 70;
const RING_C = +(2 * Math.PI * RING_R).toFixed(2); // 439.82

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function EditorRewardsClient() {
  const [data, setData]               = useState<RewardsData | null>(null);
  const [xpHistory, setXpHistory]     = useState<XpTx[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditTx[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<"badges" | "history" | "credits" | "leaderboard">("badges");
  const [ringReady, setRingReady]     = useState(false);

  useEffect(() => { setRingReady(true); }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/rewards").then(r => r.json()),
      fetch("/api/rewards/history").then(r => r.json()),
      fetch("/api/rewards/leaderboard").then(r => r.json()),
    ]).then(([rd, hd, lb]) => {
      setData(rd);
      setXpHistory(hd.xpHistory ?? []);
      setCreditHistory(hd.creditHistory ?? []);
      setLeaderboard(Array.isArray(lb) ? lb : []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="px-8 py-6 space-y-4">
      <div className="h-7 w-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div className="h-52 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div className="h-72 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
    </div>
  );

  if (!data) return (
    <div className="px-8 py-6 text-center text-sm text-gray-400">
      <Zap className="w-8 h-8 mx-auto mb-3 opacity-20" />
      Failed to load rewards.
    </div>
  );

  const lm    = LM[data.level];
  const pct   = lm.end === Infinity ? 100 : Math.min(100, ((data.xp - lm.start) / (lm.end - lm.start)) * 100);
  const offset = RING_C * (1 - pct / 100);

  const earnedSet = new Set(data.badges.map(b => b.badge));
  const earnedMap = Object.fromEntries(data.badges.map(b => [b.badge, b.awardedAt]));
  const levelIdx  = LEVEL_ORDER.indexOf(data.level);
  const now = new Date();

  return (
    <div className="px-8 py-6 space-y-4">

      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-end justify-between mb-1">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Editor</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-none">Rewards</h1>
        </div>
        <div className="flex items-center gap-2">
          {data.availableCredits > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Credits</span>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                â‚¹{(data.availableCredits / 100).toFixed(0)}
              </span>
            </div>
          )}
          <Link
            href="/editor/xp-shop"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">XP Shop</span>
          </Link>
        </div>
      </div>

      {/* â”€â”€ Level hero card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="rounded-2xl border overflow-hidden bg-white dark:bg-gray-900"
        style={{ borderColor: `${lm.ring}35` }}
      >
        {/* Accent stripe */}
        <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${lm.ring}, ${lm.accent})` }} />

        <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6"
          style={{ background: lm.glow }}>

          {/* XP ring */}
          <div className="relative w-40 h-40 shrink-0">
            <svg viewBox="0 0 160 160" className="w-full h-full" style={{ transform: "rotate(-90deg)" }}>
              {/* track */}
              <circle cx="80" cy="80" r={RING_R} fill="none"
                stroke="currentColor" strokeWidth="11"
                className="text-gray-100 dark:text-gray-800" />
              {/* progress */}
              <circle cx="80" cy="80" r={RING_R} fill="none"
                stroke={lm.ring} strokeWidth="11" strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={ringReady ? offset : RING_C}
                style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
            </svg>
            {/* center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
              <span className="text-4xl leading-none mb-1">{lm.emoji}</span>
              <span
                className="text-[22px] font-extrabold leading-none tabular-nums text-gray-900 dark:text-white"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {data.xp.toLocaleString()}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] mt-0.5" style={{ color: lm.accent }}>
                XP
              </span>
            </div>
          </div>

          {/* Level info */}
          <div className="flex-1 text-center sm:text-left space-y-3">
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                <span className="text-xl font-bold text-gray-900 dark:text-white">{lm.label}</span>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                  style={{ background: lm.accent }}
                >
                  {lm.tagline}
                </span>
              </div>
              {data.nextLevel ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {data.xpToNext.toLocaleString()} XP
                  </span>{" "}
                  to {data.nextLevel.charAt(0).toUpperCase() + data.nextLevel.slice(1)}
                </p>
              ) : (
                <p className="text-sm font-semibold" style={{ color: lm.accent }}>
                  Maximum level reached ðŸŽ‰
                </p>
              )}
            </div>

            {/* Current perks */}
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {PERKS[data.level].map(p => (
                <span
                  key={p.text}
                  className="text-[11px] flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 dark:bg-black/30 border border-white/60 dark:border-white/10 text-gray-600 dark:text-gray-300 backdrop-blur-sm"
                >
                  <span className="text-[13px]">{p.icon}</span>
                  {p.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€ Level journey â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Level journey</p>
        <div className="relative flex items-start">
          {/* connecting lines */}
          <div className="absolute top-[18px] left-[20px] right-[20px] h-[2px] bg-gray-100 dark:bg-gray-800" />
          {/* filled portion â€” up to current level dot */}
          {levelIdx > 0 && (
            <div
              className="absolute top-[18px] h-[2px]"
              style={{
                left: "20px",
                width: `calc(${(levelIdx / 3) * 100}% - 10px)`,
                background: `linear-gradient(90deg, ${LM.bronze.ring}, ${lm.ring})`,
              }}
            />
          )}

          {LEVEL_ORDER.map((l, i) => {
            const m       = LM[l];
            const isPast  = i < levelIdx;
            const isCurr  = i === levelIdx;
            const isFut   = i > levelIdx;
            return (
              <div key={l} className="relative flex flex-col items-center flex-1 z-10">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xl border-2 transition-all duration-300"
                  style={{
                    background: isFut ? undefined : isCurr ? m.glow : `${m.ring}15`,
                    borderColor: isFut ? "transparent" : isCurr ? m.ring : `${m.ring}50`,
                    boxShadow: isCurr ? `0 0 0 4px ${m.ring}25` : undefined,
                    opacity: isFut ? 0.3 : 1,
                  }}
                >
                  {m.emoji}
                </div>
                <p className={`mt-1.5 text-[11px] font-semibold ${isFut ? "text-gray-300 dark:text-gray-600" : "text-gray-700 dark:text-gray-300"}`}>
                  {m.label}
                </p>
                <p className={`text-[10px] ${isFut ? "text-gray-300 dark:text-gray-600" : "text-gray-400"}`}>
                  {LEVEL_XP_LABELS[i]} XP
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* â”€â”€ Next level unlock preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {data.nextLevel && (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{LM[data.nextLevel as Level].emoji}</span>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Unlock at{" "}
              <span className="text-gray-700 dark:text-gray-200 font-bold">
                {LM[data.nextLevel as Level].label}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERKS[data.nextLevel as Level].map(p => (
              <span
                key={p.text}
                className="text-[11px] flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 text-gray-400"
              >
                <span className="text-[13px]">{p.icon}</span>
                {p.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* â”€â”€ Tabs: Badges / XP History / Credits â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
          {([
            { key: "badges"      as const, label: `Badges Â· ${data.badges.length}/${BADGE_KEYS.length}` },
            { key: "history"     as const, label: "XP History" },
            { key: "credits"     as const, label: "Credits" },
            { key: "leaderboard" as const, label: "Leaderboard" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 min-w-max py-2.5 px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === key
                  ? "text-gray-900 dark:text-white border-b-2 bg-white dark:bg-gray-900"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-50 dark:bg-gray-800/60"
              }`}
              style={tab === key ? { borderColor: "#0EA5E9" } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Badges */}
        {tab === "badges" && (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BADGE_KEYS.map(key => {
              const def      = BADGES[key];
              const earned   = earnedSet.has(key);
              const date     = earnedMap[key];
              const prog     = !earned ? getBadgeProgress(key, data.progress) : null;
              return (
                <div
                  key={key}
                  className={`rounded-xl border p-3 flex flex-col items-center text-center gap-1.5 transition-all ${
                    earned
                      ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm"
                      : "bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800"
                  }`}
                  style={earned ? { boxShadow: "0 1px 8px rgba(0,0,0,0.06)" } : {}}
                >
                  <span
                    className="text-3xl leading-none mt-0.5"
                    style={{ filter: earned ? "none" : "grayscale(1)", opacity: earned ? 1 : 0.25 }}
                  >
                    {def.emoji}
                  </span>
                  <div className="space-y-0.5 w-full">
                    <p className={`text-xs font-semibold leading-tight ${earned ? "text-gray-800 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"}`}>
                      {def.label}
                    </p>
                    <p className={`text-[10px] leading-snug ${earned ? "text-gray-400" : "text-gray-400 dark:text-gray-600"}`}>
                      {def.desc}
                    </p>
                    {def.credit && earned && (
                      <p className="text-[10px] text-emerald-600 font-medium">{def.credit}</p>
                    )}
                    {earned && date ? (
                      <p className="text-[10px] font-semibold mt-1" style={{ color: "#0EA5E9" }}>
                        {fmtDate(date)}
                      </p>
                    ) : prog ? (
                      <div className="mt-1.5 w-full space-y-1">
                        <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-400 transition-all duration-700"
                            style={{ width: `${Math.min(100, (prog.current / prog.target) * 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 tabular-nums">
                          {prog.current}/{prog.target}
                        </p>
                      </div>
                    ) : !earned ? (
                      <p className="text-[10px] text-gray-300 dark:text-gray-700 mt-0.5">â€”</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* XP History */}
        {tab === "history" && (
          <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-96 overflow-y-auto">
            {xpHistory.length === 0 ? (
              <div className="py-14 text-center">
                <Zap className="w-7 h-7 mx-auto mb-2 text-gray-200 dark:text-gray-700" />
                <p className="text-sm text-gray-400">No XP yet â€” complete your first order!</p>
              </div>
            ) : xpHistory.map(tx => {
              const entry = XP_ENTRY[tx.reason];
              return (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center shrink-0">{entry?.icon ?? "ðŸ’«"}</span>
                    <div>
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        {entry?.label ?? tx.reason.replace(/_/g, " ")}
                      </p>
                      <p className="text-[11px] text-gray-400">{timeAgo(tx.createdAt)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color: "#0EA5E9" }}>
                    +{tx.amount} XP
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Leaderboard */}
        {tab === "leaderboard" && (
          <div className="p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 px-1">
              Top editors this week Â· XP earned Monâ€“Sun
            </p>
            {leaderboard.length === 0 ? (
              <div className="py-14 text-center">
                <Trophy className="w-7 h-7 mx-auto mb-2 text-gray-200 dark:text-gray-700" />
                <p className="text-sm text-gray-400">No activity this week yet.</p>
              </div>
            ) : leaderboard.map((entry, i) => {
              const isTop3 = i < 3;
              const rankEmoji = i === 0 ? "ðŸ¥‡" : i === 1 ? "ðŸ¥ˆ" : i === 2 ? "ðŸ¥‰" : null;
              return (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                    isTop3
                      ? "bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  {/* Rank */}
                  <div className="w-7 shrink-0 text-center">
                    {rankEmoji ? (
                      <span className="text-lg leading-none">{rankEmoji}</span>
                    ) : (
                      <span className="text-xs font-bold tabular-nums text-gray-400">#{entry.rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  {entry.image ? (
                    <img src={entry.image} alt={entry.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-gray-500">{(entry.name ?? "?")[0]?.toUpperCase()}</span>
                    </div>
                  )}

                  {/* Name */}
                  <p className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{entry.name}</p>

                  {/* XP */}
                  <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: "#0EA5E9" }}>
                    +{entry.weekXp.toLocaleString()} XP
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Credits */}
        {tab === "credits" && (
          <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-96 overflow-y-auto">
            {creditHistory.length === 0 ? (
              <div className="py-14 text-center">
                <Gift className="w-7 h-7 mx-auto mb-2 text-gray-200 dark:text-gray-700" />
                <p className="text-sm text-gray-400">No credits yet â€” earn them through milestones!</p>
              </div>
            ) : creditHistory.map(tx => {
              const used    = !!tx.usedAt;
              const expired = !!(tx.expiresAt && new Date(tx.expiresAt) < now && !used);
              return (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      used || expired ? "bg-gray-100 dark:bg-gray-800" : "bg-emerald-100 dark:bg-emerald-900/30"
                    }`}>
                      <Gift className={`w-3.5 h-3.5 ${used || expired ? "text-gray-400" : "text-emerald-600"}`} />
                    </div>
                    <div>
                      <p className={`text-sm ${used || expired ? "text-gray-400 line-through" : "text-gray-800 dark:text-gray-200"}`}>
                        {tx.reason}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[11px] text-gray-400">{timeAgo(tx.createdAt)}</p>
                        {!used && !expired && tx.expiresAt && (
                          <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> Expires {fmtDate(tx.expiresAt)}
                          </span>
                        )}
                        {used    && <span className="text-[10px] text-gray-400">Used</span>}
                        {expired && <span className="text-[10px] text-red-400">Expired</span>}
                      </div>
                    </div>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${used || expired ? "text-gray-300 dark:text-gray-600" : "text-emerald-600"}`}>
                    â‚¹{(tx.amount / 100).toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* â”€â”€ How to earn XP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">How to earn XP</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { emoji: "ðŸŽ¬", label: "Complete an order",       xp: "+50 XP"  },
            { emoji: "âš¡", label: "Deliver before deadline", xp: "+15 XP"  },
            { emoji: "â­", label: "Receive a 5-star review", xp: "+25 XP"  },
            { emoji: "âœ…", label: "Complete your profile",   xp: "+100 XP" },
          ].map(({ emoji, label, xp }) => (
            <div
              key={label}
              className="rounded-xl p-3 text-center space-y-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
            >
              <span className="text-2xl block">{emoji}</span>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{label}</p>
              <p className="text-xs font-bold" style={{ color: "#0EA5E9" }}>{xp}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
