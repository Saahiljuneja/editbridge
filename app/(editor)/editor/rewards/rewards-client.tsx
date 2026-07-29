"use client";

import { useEffect, useState } from "react";
import { Zap, Gift, Clock, Trophy, Sparkles, Medal, Award, CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Level } from "@/lib/rewards";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Badge { id: string; badge: string; awardedAt: string; label: string; emoji: string; desc: string; }
interface LeaderboardEntry { rank: number; userId: string; weekXp: number; name: string; image: string | null; editorId: string | null; }
interface RewardsData {
  xp: number; level: Level; xpToNext: number; nextLevel: string | null;
  availableCredits: number; progress: Record<string, number>; badges: Badge[];
}
interface XpTx { id: string; amount: number; reason: string; createdAt: string; }
interface CreditTx { id: string; amount: number; reason: string; expiresAt: string | null; usedAt: string | null; createdAt: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

type LevelMeta = {
  label: string; emoji: string; tagline: string;
  accent: string; ring: string; glow: string; textClass: string;
  bgGradient: string; border: string;
  start: number; end: number;
};

const LM: Record<Level, LevelMeta> = {
  bronze:   { label: "Bronze",   emoji: "🥉", tagline: "Getting started",    accent: "#D97706", ring: "#F59E0B", glow: "rgba(245,158,11,0.06)",   textClass: "text-amber-600",  bgGradient: "from-amber-500/10 to-orange-500/5",    border: "border-amber-500/20",   start: 0,     end: 500   },
  silver:   { label: "Silver",   emoji: "🥈", tagline: "Building momentum",  accent: "#6B7280", ring: "#9CA3AF", glow: "rgba(156,163,175,0.06)",  textClass: "text-slate-600",  bgGradient: "from-slate-400/15 to-gray-500/5",      border: "border-slate-400/25",   start: 500,   end: 2000  },
  gold:     { label: "Gold",     emoji: "🥇", tagline: "Top performer",      accent: "#B45309", ring: "#EAB308", glow: "rgba(234,179,8,0.08)",    textClass: "text-yellow-600", bgGradient: "from-yellow-500/15 to-amber-500/5",    border: "border-yellow-500/25",  start: 2000,  end: 5000  },
  platinum: { label: "Platinum", emoji: "💎", tagline: "Elite editor",       accent: "#4F46E5", ring: "#818CF8", glow: "rgba(129,140,248,0.1)",   textClass: "text-indigo-600", bgGradient: "from-indigo-500/15 to-purple-600/5",   border: "border-indigo-500/25",  start: 5000,  end: 10000 },
  diamond:  { label: "Diamond",  emoji: "💠", tagline: "Crystal tier",       accent: "#0891B2", ring: "#22D3EE", glow: "rgba(34,211,238,0.1)",    textClass: "text-cyan-600",   bgGradient: "from-cyan-500/15 to-sky-500/5",        border: "border-cyan-500/25",    start: 10000, end: 25000 },
  master:   { label: "Master",   emoji: "👑", tagline: "Prestige rank",      accent: "#9333EA", ring: "#C084FC", glow: "rgba(192,132,252,0.12)",  textClass: "text-purple-600", bgGradient: "from-purple-500/20 to-violet-600/10",  border: "border-purple-500/30",  start: 25000, end: 50000 },
  legend:   { label: "Legend",   emoji: "🔥", tagline: "Mythic status",      accent: "#DC2626", ring: "#F97316", glow: "rgba(249,115,22,0.14)",   textClass: "text-orange-700", bgGradient: "from-orange-500/20 to-red-600/10",     border: "border-orange-500/30",  start: 50000, end: Infinity },
};

const LEVEL_ORDER: Level[] = ["bronze", "silver", "gold", "platinum", "diamond", "master", "legend"];
const LEVEL_XP_LABELS = ["0", "500", "2k", "5k", "10k", "25k", "50k+"];

const PERKS: Record<Level, Array<{ icon: string; text: string }>> = {
  bronze:   [{ icon: "📦", text: "3 packages" },         { icon: "🔍", text: "Standard placement" }],
  silver:   [{ icon: "📦", text: "4 packages" },         { icon: "🎗️", text: "Silver badge" },         { icon: "💸", text: "2% client discount" }],
  gold:     [{ icon: "📦", text: "5 packages" },         { icon: "⭐", text: "Featured in search" },    { icon: "💸", text: "5% client discount" }],
  platinum: [{ icon: "📦", text: "5 packages" },         { icon: "🔝", text: "Top placement" },        { icon: "🎨", text: "Custom banner" },        { icon: "💸", text: "10% discount" }],
  diamond:  [{ icon: "💠", text: "Diamond placement" },  { icon: "🎨", text: "Custom banner" },        { icon: "🎯", text: "Priority support" },      { icon: "💸", text: "15% discount" }],
  master:   [{ icon: "👑", text: "Master badge" },       { icon: "🔝", text: "Top-10 spotlight" },     { icon: "🎨", text: "Custom banner" },        { icon: "💸", text: "20% discount" }],
  legend:   [{ icon: "🔥", text: "Legend badge" },       { icon: "🌟", text: "Top-3 spotlight" },      { icon: "🎨", text: "Custom banner" },        { icon: "💸", text: "25% discount" }, { icon: "📞", text: "Account manager" }],
};

const BADGES: Record<string, { label: string; emoji: string; desc: string; hint: string; credit?: string }> = {
  profile_star:   { label: "Profile Star",   emoji: "⭐", desc: "Complete profile + KYC",         hint: "Fill your bio, niche, portfolio & get KYC approved",  },
  first_delivery: { label: "First Delivery", emoji: "🎬", desc: "Complete your first order",        hint: "Deliver your very first project to a client",           },
  rising_star:    { label: "Rising Star",    emoji: "🌟", desc: "Complete 5 orders",                hint: "5 successful deliveries",                               },
  verified_pro:   { label: "Verified Pro",   emoji: "🏆", desc: "Complete 25 orders",               hint: "25 successful deliveries",                              },
  top_rated:      { label: "Top Rated",      emoji: "💎", desc: "50 orders · avg ≥ 4.5 ★",         hint: "Maintain excellence at scale",                          credit: "₹500 bonus credit" },
  speed_demon:    { label: "Speed Demon",    emoji: "⚡", desc: "10 early deliveries",               hint: "Deliver 10 orders before the deadline",                 },
  streak_master:  { label: "Streak Master",  emoji: "🔥", desc: "5 orders in one week",             hint: "Complete 5 orders in a single Mon–Sun week",            },
  early_bird:     { label: "Early Bird",     emoji: "🐦", desc: "First 50 editors on platform",     hint: "Awarded to the first 50 editors who joined",            },
  perfect_month:  { label: "Perfect Month",  emoji: "🌙", desc: "10+ orders, zero disputes (month)", hint: "Complete 10+ orders in a calendar month with no disputes", },
  client_favorite:{ label: "Client Favorite",emoji: "💖", desc: "Saved by 25+ unique clients",       hint: "25 different clients added you to their saved list",     },
  quick_responder:{ label: "Quick Responder",emoji: "⚡️", desc: "Avg response under 2 hours",        hint: "Keep your average reply time under 2 hours",             },
  referral_pro:   { label: "Referral Pro",   emoji: "🤝", desc: "Referred a user successfully",      hint: "Share your referral link — awarded on first conversion",  },
};

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

const XP_ENTRY: Record<string, { label: string; icon: string; penalty?: true }> = {
  order_completed:           { label: "Order completed",                     icon: "🎬" },
  early_delivery:            { label: "Early delivery bonus",                icon: "⚡" },
  five_star_review:          { label: "5-star review received",              icon: "⭐" },
  review_received:           { label: "Positive review received",            icon: "🌟" },
  profile_completed:         { label: "Profile completed",                   icon: "✅" },
  repeat_client_bonus:       { label: "Repeat client bonus",                 icon: "🤝" },
  qa_answered:               { label: "Answered client question",            icon: "💬" },
  portfolio_added:           { label: "Portfolio item added (KYC verified)", icon: "🖼️" },
  order_streak_5:            { label: "5-order win streak",                  icon: "🔥" },
  login_streak_7:            { label: "7-day login streak",                  icon: "📅" },
  // ── XP Shop — boost purchases ──
  xp_shop_featured_boost:       { label: "Featured Boost activated",           icon: "🔝" },
  xp_shop_extra_package_slot:   { label: "Extra Package Slot activated",       icon: "📦" },
  xp_shop_profile_highlight:    { label: "Profile Highlight activated",        icon: "✨" },
  xp_shop_extended_portfolio:   { label: "Portfolio Boost – Tier 1 activated", icon: "🖼️" },
  xp_shop_portfolio_tier2:      { label: "Portfolio Boost – Tier 2 activated", icon: "🖼️" },
  xp_shop_portfolio_tier3:      { label: "Portfolio Boost – Tier 3 activated", icon: "🖼️" },
  xp_shop_badge_frame:          { label: "Custom Badge Frame activated",       icon: "🏆" },
  // ── XP Shop — frame unlocks ──
  xp_frame_frame_bronze:        { label: "Bronze Ring unlocked",               icon: "🥉" },
  xp_frame_frame_silver:        { label: "Silver Ring unlocked",               icon: "🥈" },
  xp_frame_frame_gold:          { label: "Gold Ring unlocked",                 icon: "🥇" },
  xp_frame_frame_diamond:       { label: "Diamond Frame unlocked",             icon: "💎" },
  xp_frame_frame_fire:          { label: "Fire Frame unlocked",                icon: "🔥" },
  xp_frame_frame_electric:      { label: "Electric Frame unlocked",            icon: "⚡" },
  xp_frame_frame_ocean:         { label: "Ocean Frame unlocked",               icon: "🌊" },
  xp_frame_frame_sakura:        { label: "Sakura Frame unlocked",              icon: "🌸" },
  // ── Penalties ──
  late_delivery_penalty:     { label: "Late delivery",                       icon: "⏰", penalty: true },
  order_cancelled_penalty:   { label: "Order cancelled",                     icon: "❌", penalty: true },
  spam_portfolio_penalty:    { label: "Spam portfolio",                      icon: "🗑️", penalty: true },
  fake_review_penalty:       { label: "Fake review",                         icon: "🚫", penalty: true },
  abusive_behavior_penalty:  { label: "Abusive behaviour",                   icon: "⚠️", penalty: true },
};

const RING_R = 70;
const RING_C = +(2 * Math.PI * RING_R).toFixed(2); // 439.82

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

export function EditorRewardsClient() {
  const [data, setData]               = useState<RewardsData | null>(null);
  const [xpHistory, setXpHistory]     = useState<XpTx[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditTx[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myLbStats, setMyLbStats]     = useState<{ rank: number; weekXp: number; userId: string } | null>(null);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<"badges" | "history" | "credits" | "leaderboard">("badges");
  const [ringReady, setRingReady]     = useState(false);
  const [showXpBreakdown, setShowXpBreakdown] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => { setRingReady(true); }, []);

  useEffect(() => {
    const calcTimeLeft = () => {
      const now = new Date();
      const nextSunday = new Date();
      // Sunday is 0. Find days until next Sunday (or 7 if today is Sunday)
      const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
      nextSunday.setDate(now.getDate() + daysUntilSunday);
      nextSunday.setHours(23, 59, 59, 999);
      const diff = nextSunday.getTime() - now.getTime();
      if (diff <= 0) return "Resetting...";
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      return `${days}d ${hours}h ${minutes}m`;
    };
    setTimeLeft(calcTimeLeft());
    const timer = setInterval(() => setTimeLeft(calcTimeLeft()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/rewards").then(r => r.json()),
      fetch("/api/rewards/history").then(r => r.json()),
      fetch("/api/rewards/leaderboard").then(r => r.json()),
    ]).then(([rd, hd, lb]) => {
      setData(rd);
      setXpHistory(hd.xpHistory ?? []);
      setCreditHistory(hd.creditHistory ?? []);
      const entries = Array.isArray(lb) ? lb : (lb.entries ?? []);
      setLeaderboard(entries);
      if (!Array.isArray(lb) && lb.myRank != null && lb.myUserId) {
        setMyLbStats({ rank: lb.myRank, weekXp: lb.myWeekXp ?? 0, userId: lb.myUserId });
      }
    }).catch(err => console.error("Failed to load editor rewards data", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="px-8 py-6 space-y-6">
      <div className="h-8 w-32 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div className="h-56 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div className="h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div className="h-72 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
    </div>
  );

  if (!data) return (
    <div className="px-8 py-6 text-center text-sm text-gray-400">
      <Zap className="w-8 h-8 mx-auto mb-3 opacity-20 animate-bounce" />
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
    <div className="px-8 py-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">Editor Workspace</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">Rewards Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          {data.availableCredits > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Available Credits</span>
              <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                ₹{(data.availableCredits / 100).toFixed(0)}
              </span>
            </div>
          )}
          <button
            onClick={() => setShowXpBreakdown(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all shadow-sm font-medium"
          >
            <Medal className="w-4 h-4 text-indigo-500" />
            <span className="text-xs text-indigo-650 dark:text-indigo-400">XP Rules</span>
          </button>
          <Link
            href="/editor/xp-shop"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-800/60 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-all shadow-sm font-medium"
          >
            <Sparkles className="w-4 h-4 text-sky-500" />
            <span className="text-xs text-sky-600 dark:text-sky-400">XP Shop</span>
          </Link>
        </div>
      </div>

      {/* Level Hero card */}
      <div
        className="rounded-2xl border overflow-hidden bg-white dark:bg-gray-900 shadow-md relative"
        style={{ borderColor: `${lm.ring}35` }}
      >
        {/* Top Accent Gradient Line */}
        <div className="h-[4px]" style={{ background: `linear-gradient(90deg, ${lm.ring}, ${lm.accent})` }} />

        <div className="p-6 flex flex-col md:flex-row items-center gap-8"
          style={{ background: `linear-gradient(135deg, ${lm.glow}, transparent)` }}>

          {/* Glowing XP circle ring */}
          <div className="relative w-40 h-40 shrink-0 select-none">
            <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_0_12px_rgba(var(--ring-glow-rgb,79,70,229),0.15)]" style={{ transform: "rotate(-90deg)" }}>
              {/* track */}
              <circle cx="80" cy="80" r={RING_R} fill="none"
                stroke="currentColor" strokeWidth="10"
                className="text-gray-100 dark:text-gray-800" />
              {/* progress */}
              <circle cx="80" cy="80" r={RING_R} fill="none"
                stroke={lm.ring} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={ringReady ? offset : RING_C}
                style={{ 
                  transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)",
                }} />
            </svg>
            {/* Center stats */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl leading-none mb-1">{lm.emoji}</span>
              <span className="text-2xl font-black leading-none tabular-nums text-gray-900 dark:text-white">
                {data.xp.toLocaleString()}
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] mt-1" style={{ color: lm.accent }}>
                XP
              </span>
            </div>
          </div>

          {/* Level information */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 justify-center md:justify-start">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{lm.label} Rank</h2>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white"
                  style={{ background: lm.accent }}
                >
                  {lm.tagline}
                </span>
              </div>
              {data.nextLevel ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  💡 Earn <span className="font-bold text-gray-800 dark:text-gray-200">{data.xpToNext.toLocaleString()} XP</span> more to reach {LM[data.nextLevel as Level].label} Rank
                </p>
              ) : (
                <p className="text-sm font-semibold mt-1 text-indigo-600 dark:text-indigo-400">
                  🎉 Level Cap Achieved! You are at maximum rank.
                </p>
              )}
            </div>

            {/* Current perks tags */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Active Perks</p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {PERKS[data.level].map(p => (
                  <span
                    key={p.text}
                    className="text-[11px] flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/80 dark:bg-black/35 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 backdrop-blur-sm shadow-sm"
                  >
                    <span className="text-[12px]">{p.icon}</span>
                    <span className="font-medium">{p.text}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Level Journey Horizonal Step Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-5 py-5 shadow-sm overflow-hidden">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-5">Journey Map</p>
        <div className="overflow-x-auto pb-1">
          <div className="relative flex items-center justify-between min-w-[560px]">
            {/* Timeline Connector Line */}
            <div className="absolute left-[3%] right-[3%] h-[3px] bg-gray-100 dark:bg-gray-800 rounded-full" />
            {levelIdx > 0 && (
              <div
                className="absolute left-[3%] h-[3px] rounded-full transition-all duration-700"
                style={{
                  width: `calc(${(levelIdx / 6) * 94}%)`,
                  background: `linear-gradient(90deg, ${LM.bronze.ring}, ${lm.ring})`,
                }}
              />
            )}

            {LEVEL_ORDER.map((l, i) => {
              const m          = LM[l];
              const isCompleted = i < levelIdx;
              const isCurrent   = i === levelIdx;
              return (
                <div key={l} className="relative flex flex-col items-center flex-1 z-10">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-base border-2 transition-all duration-500 shadow-sm"
                    style={{
                      background: isCompleted ? `${m.ring}15` : isCurrent ? m.glow : "var(--bg-card, #fff)",
                      borderColor: isCurrent ? m.ring : isCompleted ? `${m.ring}60` : "rgba(229,231,235,0.8)",
                      boxShadow: isCurrent ? `0 0 0 4px ${m.ring}25` : undefined,
                    }}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" style={{ color: m.ring }} /> : m.emoji}
                  </div>
                  <p className={`mt-1.5 text-[10px] font-bold ${isCurrent ? m.textClass : "text-gray-500 dark:text-gray-400"}`}>
                    {m.label}
                  </p>
                  <p className="text-[9px] text-gray-400 font-medium mt-0.5 tabular-nums">
                    {LEVEL_XP_LABELS[i]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Perk unlocks preview */}
      {data.nextLevel && (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-900/20">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{LM[data.nextLevel as Level].emoji}</span>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Next Tier Unlock:{" "}
              <span className="text-gray-800 dark:text-gray-200 font-bold">
                {LM[data.nextLevel as Level].label} perks
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERKS[data.nextLevel as Level].map(p => (
              <span
                key={p.text}
                className="text-[11px] flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 font-medium"
              >
                <span className="text-[12px]">{p.icon}</span>
                {p.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs list container */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        
        {/* Custom Tab Selector Pills */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 p-1.5 gap-1.5 overflow-x-auto">
          {([
            { key: "badges"      as const, label: `Badges · ${data.badges.length}/${BADGE_KEYS.length}` },
            { key: "history"     as const, label: "XP History" },
            { key: "credits"     as const, label: "Credits" },
            { key: "leaderboard" as const, label: "Leaderboard" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 min-w-max py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                tab === key
                  ? "text-gray-900 dark:text-white bg-white dark:bg-gray-800 shadow-sm"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/40 dark:hover:bg-gray-800/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Badges Tab */}
        {tab === "badges" && (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {BADGE_KEYS.map(key => {
              const def      = BADGES[key];
              const earned   = earnedSet.has(key);
              const date     = earnedMap[key];
              const prog     = !earned ? getBadgeProgress(key, data.progress) : null;
              return (
                <div
                  key={key}
                  className={`rounded-2xl border p-4 flex flex-col justify-between items-center text-center gap-3 transition-all hover:-translate-y-0.5 hover:shadow-md duration-300 ${
                    earned
                      ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm"
                      : "bg-gray-50/50 dark:bg-gray-800/30 border-gray-100/80 dark:border-gray-800/60 opacity-60"
                  }`}
                >
                  <div className="space-y-2 flex flex-col items-center">
                    <span
                      className="text-4xl filter transition-transform duration-300"
                      style={{ filter: earned ? "none" : "grayscale(1) opacity(0.3)" }}
                    >
                      {def.emoji}
                    </span>
                    <div>
                      <p className={`text-xs font-bold leading-tight ${earned ? "text-gray-800 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"}`}>
                        {def.label}
                      </p>
                      <p className={`text-[10px] leading-snug mt-0.5 ${earned ? "text-gray-400 dark:text-gray-500" : "text-gray-400 dark:text-gray-600"}`}>
                        {def.desc}
                      </p>
                      {def.hint && !earned && (
                        <p className="text-[9px] text-gray-400 dark:text-gray-600 border-t border-dashed mt-1.5 pt-1.5 leading-tight italic">
                          {def.hint}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="w-full">
                    {def.credit && earned && (
                      <p className="text-[10px] text-emerald-600 font-semibold mb-1">🎁 {def.credit}</p>
                    )}
                    {earned && date ? (
                      <p className="text-[9px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full inline-block">
                        {fmtDate(date)}
                      </p>
                    ) : prog ? (
                      <div className="w-full space-y-1">
                        <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500"
                            style={{ width: `${Math.min(100, (prog.current / prog.target) * 100)}%` }}
                          />
                        </div>
                        <p className="text-[9px] font-bold text-gray-400 tabular-nums">
                          {prog.current} / {prog.target}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* XP History Tab */}
        {tab === "history" && (
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-96 overflow-y-auto">
            {xpHistory.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400 space-y-2">
                <Zap className="w-8 h-8 mx-auto opacity-10" />
                <p>No XP history yet — complete your first order!</p>
              </div>
            ) : xpHistory.map(tx => {
              const entry = XP_ENTRY[tx.reason];
              return (
                <div key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl w-7 text-center shrink-0">{entry?.icon ?? "💫"}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {entry?.label ?? tx.reason.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-gray-400">{timeAgo(tx.createdAt)}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-sm font-extrabold tabular-nums",
                    tx.amount < 0 ? "text-red-600 dark:text-red-400" : "text-indigo-600 dark:text-indigo-400"
                  )}>
                    {tx.amount < 0 ? tx.amount : `+${tx.amount}`} XP
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Credits Tab */}
        {tab === "credits" && (
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-96 overflow-y-auto">
            {creditHistory.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400 space-y-2">
                <Gift className="w-8 h-8 mx-auto opacity-10" />
                <p>No credit transactions recorded.</p>
              </div>
            ) : creditHistory.map(tx => {
              const used    = !!tx.usedAt;
              const expired = !!(tx.expiresAt && new Date(tx.expiresAt) < now && !used);
              return (
                <div key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", 
                      used || expired ? "bg-gray-100 dark:bg-gray-850" : "bg-emerald-50 dark:bg-emerald-950/20"
                    )}>
                      <Gift className={cn("w-4 h-4", used || expired ? "text-gray-400" : "text-emerald-600")} />
                    </div>
                    <div>
                      <p className={cn("text-sm font-semibold", used || expired ? "text-gray-400 line-through" : "text-gray-800 dark:text-gray-200")}>
                        {tx.reason}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400">{timeAgo(tx.createdAt)}</p>
                        {!used && !expired && tx.expiresAt && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-md flex items-center gap-0.5 font-medium">
                            <Clock className="w-2.5 h-2.5" /> Expires {fmtDate(tx.expiresAt)}
                          </span>
                        )}
                        {used && <span className="text-[10px] bg-gray-100 dark:bg-gray-850 text-gray-500 px-2 py-0.5 rounded-md font-medium">Used</span>}
                        {expired && <span className="text-[10px] bg-red-50 dark:bg-red-950/20 text-red-500 px-2 py-0.5 rounded-md font-medium">Expired</span>}
                      </div>
                    </div>
                  </div>
                  <span className={cn("text-sm font-extrabold tabular-nums", used || expired ? "text-gray-300" : "text-emerald-600")}>
                    ₹{(tx.amount / 100).toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Competitive Leaderboard Tab */}
        {tab === "leaderboard" && (
          <div className="p-5 space-y-5">
            {/* Header info with countdown */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl p-4 border border-indigo-100/50 dark:border-indigo-900/30">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-indigo-955 dark:text-indigo-200 uppercase tracking-wider">
                    Weekly Leaderboard
                  </p>
                  <p className="text-[10px] text-indigo-850 dark:text-indigo-300">XP earned Monday to Sunday</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border dark:border-gray-700 px-3 py-1 rounded-xl shadow-sm text-xs font-bold shrink-0">
                <Clock className="w-4 h-4 text-indigo-500 animate-pulse" />
                <span className="text-gray-400 font-semibold text-[10px] uppercase">Resets in:</span>
                <span className="text-indigo-650 dark:text-indigo-400 tabular-nums">{timeLeft}</span>
              </div>
            </div>

            {/* Weekly Prize Pool Incentives */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">🏆 Weekly Prize Pool</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { rank: "🥇 1st Place", bonus: "+150 XP & Highlight", details: "Profile highlight for 7 days", color: "border-yellow-200 bg-yellow-50/20 text-yellow-800 dark:text-yellow-400 dark:border-yellow-900/40" },
                  { rank: "🥈 2nd Place", bonus: "+100 XP Points", details: "Added to ranking points", color: "border-slate-200 bg-slate-50/30 text-slate-800 dark:text-slate-400 dark:border-slate-800/40" },
                  { rank: "🥉 3rd Place", bonus: "+50 XP Points", details: "Added to ranking points", color: "border-amber-250 bg-amber-50/20 text-amber-800 dark:text-amber-400 dark:border-amber-900/30" },
                ].map((prize) => (
                  <div key={prize.rank} className={cn("border rounded-2xl p-3.5 space-y-1 shadow-sm", prize.color)}>
                    <p className="text-xs font-extrabold">{prize.rank}</p>
                    <p className="text-sm font-black tracking-tight">{prize.bonus}</p>
                    <p className="text-[10px] opacity-75">{prize.details}</p>
                  </div>
                ))}
              </div>
            </div>

            {myLbStats && !leaderboard.some(e => e.userId === myLbStats.userId) && (
              <div className="flex items-center gap-4 rounded-2xl px-4 py-3.5 border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/60 dark:bg-indigo-950/20 shadow-sm">
                <div className="w-8 shrink-0 text-center">
                  <span className="text-xs font-extrabold text-indigo-500 tabular-nums">#{myLbStats.rank}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Your position</p>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400">{myLbStats.weekXp.toLocaleString()} XP this week</p>
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0" />
              </div>
            )}

            <div className="space-y-2">
              {leaderboard.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-400 space-y-2">
                  <Trophy className="w-8 h-8 mx-auto opacity-10" />
                  <p>No activity recorded this week yet.</p>
                </div>
              ) : leaderboard.map((entry, i) => {
                const rank = i + 1;
                const is1st = rank === 1;
                const is2nd = rank === 2;
                const is3rd = rank === 3;
                const rankBadge = is1st ? "🥇" : is2nd ? "🥈" : is3rd ? "🥉" : null;

                return (
                  <div
                    key={entry.userId}
                    className={cn(
                      "flex items-center gap-4 rounded-2xl px-4 py-3.5 border transition-all duration-300",
                      is1st ? "bg-yellow-50/60 dark:bg-yellow-950/10 border-yellow-200 dark:border-yellow-900/40 shadow-sm" :
                      is2nd ? "bg-slate-50/60 dark:bg-slate-900/10 border-slate-200 dark:border-slate-800/40" :
                      is3rd ? "bg-amber-50/40 dark:bg-amber-950/5 border-amber-200/60 dark:border-amber-900/30" :
                              "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/40"
                    )}
                  >
                    {/* Rank Indicator */}
                    <div className="w-8 shrink-0 text-center flex items-center justify-center">
                      {rankBadge ? (
                        <span className="text-2xl leading-none">{rankBadge}</span>
                      ) : (
                        <span className="text-xs font-extrabold text-gray-400 tabular-nums">#{rank}</span>
                      )}
                    </div>

                    {/* Editor Profile Photo */}
                    <div className="relative shrink-0">
                      {entry.image ? (
                        <img src={entry.image} alt={entry.name} className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-white dark:ring-gray-800" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 ring-2 ring-white dark:ring-gray-800">
                          <span className="text-xs font-bold text-gray-500">{(entry.name ?? "?")[0]?.toUpperCase()}</span>
                        </div>
                      )}
                      {is1st && (
                        <span className="absolute -top-2 -right-1 text-xs select-none">👑</span>
                      )}
                    </div>

                    {/* Editor Name / Profile Link */}
                    <div className="flex-1 min-w-0">
                      {entry.editorId ? (
                        <Link href={`/editor/${entry.editorId}`} target="_blank" className="text-sm font-bold text-gray-900 dark:text-white hover:underline flex items-center gap-1.5">
                          {entry.name}
                          <span className="text-[10px] font-normal text-indigo-500 hover:no-underline">view profile ↗</span>
                        </Link>
                      ) : (
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{entry.name}</p>
                      )}
                    </div>

                    {/* Weekly XP score */}
                    <div className="shrink-0 text-right">
                      <span className={cn(
                        "text-sm font-black tabular-nums",
                        is1st ? "text-amber-600 dark:text-yellow-500" : "text-indigo-600 dark:text-indigo-400"
                      )}>
                        {entry.weekXp.toLocaleString()} <span className="text-[10px] font-semibold text-gray-400">XP</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Weekly active challenges */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">Active Challenges</p>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Weekly Quests</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: "Fast Responder", reward: "+30 XP", details: "Reply to 3 client messages in under 30 minutes.", progress: "1 / 3 messages", done: false, value: 33 },
            { title: "Portfolio Refresh", reward: "+50 XP", details: "Add a new video showcase to your public feed.", progress: "Completed", done: true, value: 100 },
            { title: "Punctual Editor", reward: "+40 XP", details: "Deliver 2 projects at least 12 hours before the deadline.", progress: "1 / 2 deliveries", done: false, value: 50 },
          ].map((quest) => (
            <div key={quest.title} className={cn(
              "border rounded-2xl p-4 space-y-3.5 flex flex-col justify-between transition-all hover:shadow-md",
              quest.done ? "bg-emerald-50/10 dark:bg-emerald-950/5 border-emerald-200 dark:border-emerald-900/30" : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
            )}>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    {quest.done ? "✅" : "🕒"} {quest.title}
                  </p>
                  <span className="text-xs font-extrabold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full">{quest.reward}</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">{quest.details}</p>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 font-medium">
                  <span>Progress</span>
                  <span className={quest.done ? "text-emerald-600 font-bold" : "text-gray-500"}>{quest.progress}</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-700", quest.done ? "bg-emerald-500" : "bg-indigo-500")} style={{ width: `${quest.value}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How to earn XP */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">How to earn XP</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {[
            { emoji: "✅", label: "Complete Profile & KYC", xp: "+100 XP", isOneTime: true, details: "One-time profile completeness" },
            { emoji: "🖼️", label: "Portfolio Item Added", xp: "+15 XP", isOneTime: true, details: "KYC-verified editors only · max 5 items" },
            { emoji: "🎬", label: "Complete an Order", xp: "+50 XP", isOneTime: false, details: "Earned on every delivery" },
            { emoji: "⚡", label: "Early Delivery Bonus", xp: "+15 / +20 XP", isOneTime: false, details: ">12h early (+15), >24h early (+20)" },
            { emoji: "⭐", label: "5-Star Review Received", xp: "+25 XP", isOneTime: false, details: "On every 5-star rating" },
            { emoji: "🌟", label: "4-Star Review Received", xp: "+15 XP", isOneTime: false, details: "On every 4-star rating" },
            { emoji: "✨", label: "3-Star Review Received", xp: "+5 XP", isOneTime: false, details: "On every 3-star rating" },
            { emoji: "🤝", label: "Repeat Client Bonus", xp: "+30 XP", isOneTime: false, details: "3rd order from same client" },
            { emoji: "💬", label: "Answer FAQ Question",    xp: "+5 XP",   isOneTime: false, details: "Pre-order question answered" },
            { emoji: "🔥", label: "5-Order Win Streak",      xp: "+100 XP", isOneTime: false, details: "5 consecutive completions, no cancellation" },
            { emoji: "📅", label: "7-Day Login Streak",      xp: "+25 XP",  isOneTime: false, details: "Log in 7 days in a row · resets daily" },
          ].map(({ emoji, label, xp, isOneTime, details }) => (
            <div
              key={label}
              className="rounded-2xl p-4 text-center space-y-2.5 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-800/40 dark:to-gray-900 border border-gray-100 dark:border-gray-800 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 flex flex-col justify-between items-center"
            >
              <div className="space-y-2.5 w-full flex flex-col items-center">
                <span className="text-3xl block filter drop-shadow-sm">{emoji}</span>
                <div>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-255 leading-snug">{label}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-555 mt-0.5 leading-snug">{details}</p>
                </div>
              </div>
              <div className="space-y-1.5 w-full mt-2">
                <span className={cn(
                  "text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block",
                  isOneTime ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30" : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30"
                )}>
                  {isOneTime ? "One-time" : "Regular"}
                </span>
                <p className="text-xs font-black block text-indigo-650 dark:text-indigo-400">{xp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Platform Penalties */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-100 dark:border-red-900/30 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">⚠️</span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">Platform Penalties</p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
          XP can be deducted for behaviour that harms platform quality. Level can drop if total XP falls below the current tier threshold.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {[
            { emoji: "⏰", label: "Late Delivery",     xp: "−20 XP", details: "Delivered after the agreed deadline" },
            { emoji: "❌", label: "Order Cancelled",   xp: "−40 XP", details: "Editor-initiated cancellation" },
            { emoji: "🗑️", label: "Spam Portfolio",    xp: "−25 XP", details: "Irrelevant or spam content flagged" },
            { emoji: "🚫", label: "Fake Review",       xp: "−100 XP", details: "Soliciting or posting fake reviews" },
            { emoji: "⚠️", label: "Abusive Behaviour", xp: "−50 XP", details: "Confirmed abusive conduct" },
          ].map(({ emoji, label, xp, details }) => (
            <div
              key={label}
              className="rounded-2xl p-4 text-center space-y-2.5 bg-red-50/40 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 flex flex-col justify-between items-center"
            >
              <div className="space-y-2.5 w-full flex flex-col items-center">
                <span className="text-3xl block">{emoji}</span>
                <div>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 leading-snug">{label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{details}</p>
                </div>
              </div>
              <p className="text-xs font-black text-red-600 dark:text-red-400 mt-2">{xp}</p>
            </div>
          ))}
        </div>
      </div>

      {/* XP Breakdown Modal */}
      {showXpBreakdown && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-gray-950 border border-gray-150 dark:border-gray-850 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowXpBreakdown(false)}
              className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-black leading-none z-10 transition-colors"
            >
              &times;
            </button>
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-bold text-gray-950 dark:text-white">XP Scoring Rules</h3>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Earn XP points to level up your Editor Rank and unlock benefits like more package offerings, custom banners, and search promotion.
            </p>
            <div className="divide-y divide-gray-100 dark:divide-gray-800 border dark:border-gray-800 rounded-2xl overflow-hidden text-xs max-h-96 overflow-y-auto">
              {[
                { title: "Complete Profile & KYC", xp: "+100 XP", desc: "BIO, title, niche, portfolio & KYC verification (One-time)" },
                { title: "Portfolio Item Uploaded", xp: "+15 XP", desc: "KYC-verified editors only · max 5 items (up to +75 XP)" },
                { title: "Order Completed", xp: "+50 XP", desc: "For every video delivery completed" },
                { title: "Early Delivery Bonus", xp: "+15 / +20 XP", desc: "Completed >12h early (+15 XP) or >24h early (+20 XP)" },
                { title: "5-Star Review Received", xp: "+25 XP", desc: "For every 5-star review received" },
                { title: "4-Star Review Received", xp: "+15 XP", desc: "For every 4-star review received" },
                { title: "3-Star Review Received", xp: "+5 XP", desc: "For every 3-star review received" },
                { title: "Repeat Client Bonus", xp: "+30 XP", desc: "On 3rd completed order with same client" },
                { title: "Answer Pre-order FAQ",  xp: "+5 XP",   desc: "When answering client questions" },
                { title: "5-Order Win Streak",    xp: "+100 XP", desc: "Every 5 consecutive completed orders without a cancellation" },
                { title: "7-Day Login Streak",    xp: "+25 XP",  desc: "Log in 7 days in a row — applies to editors and clients" },
              ].map((rule) => (
                <div key={rule.title} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <div className="pr-4">
                    <p className="font-bold text-gray-855 dark:text-gray-200">{rule.title}</p>
                    <p className="text-[10px] text-gray-400">{rule.desc}</p>
                  </div>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0">{rule.xp}</span>
                </div>
              ))}
              <div className="bg-red-50/60 dark:bg-red-950/10 px-3 py-2 border-t border-red-100 dark:border-red-900/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">Platform Penalties</p>
              </div>
              {[
                { title: "Late Delivery",    xp: "−20 XP", desc: "Order delivered after the agreed deadline" },
                { title: "Order Cancelled",  xp: "−40 XP", desc: "Editor-initiated cancellation" },
                { title: "Spam Portfolio",   xp: "−25 XP", desc: "Portfolio flagged for spam or irrelevant content" },
                { title: "Fake Review",      xp: "−100 XP", desc: "Caught submitting or soliciting fake reviews" },
                { title: "Abusive Behaviour",xp: "−50 XP", desc: "Confirmed abusive conduct toward clients or staff" },
              ].map((rule) => (
                <div key={rule.title} className="flex justify-between items-center p-3 hover:bg-red-50/30 dark:hover:bg-red-950/10">
                  <div className="pr-4">
                    <p className="font-bold text-gray-800 dark:text-gray-200">{rule.title}</p>
                    <p className="text-[10px] text-gray-400">{rule.desc}</p>
                  </div>
                  <span className="font-extrabold text-red-600 dark:text-red-400 shrink-0">{rule.xp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
