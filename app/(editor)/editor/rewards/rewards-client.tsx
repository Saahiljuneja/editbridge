"use client";

import { useEffect, useState } from "react";
import { Zap, Gift, Clock, Trophy, Medal, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
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
  bronze:   { label: "Bronze",   emoji: "🥉", tagline: "Getting started",   accent: "#D97706", ring: "#F59E0B", glow: "rgba(245,158,11,0.06)",  textClass: "text-amber-600",  bgGradient: "from-amber-500/10 to-orange-500/5",   border: "border-amber-500/20",  start: 0,    end: 500      },
  silver:   { label: "Silver",   emoji: "🥈", tagline: "Building momentum", accent: "#6B7280", ring: "#9CA3AF", glow: "rgba(156,163,175,0.06)", textClass: "text-slate-600",  bgGradient: "from-slate-400/15 to-gray-500/5",     border: "border-slate-400/25",  start: 500,  end: 2000     },
  gold:     { label: "Gold",     emoji: "🥇", tagline: "Top performer",     accent: "#B45309", ring: "#EAB308", glow: "rgba(234,179,8,0.08)",   textClass: "text-yellow-600", bgGradient: "from-yellow-500/15 to-amber-500/5",   border: "border-yellow-500/25", start: 2000, end: 5000     },
  platinum: { label: "Platinum", emoji: "💎", tagline: "Elite editor",      accent: "#4F46E5", ring: "#818CF8", glow: "rgba(129,140,248,0.1)",  textClass: "text-indigo-600", bgGradient: "from-indigo-500/15 to-purple-600/5",  border: "border-indigo-500/25", start: 5000, end: Infinity },
};

const LEVEL_ORDER: Level[] = ["bronze", "silver", "gold", "platinum"];
const LEVEL_XP_LABELS = ["0", "500", "2k", "5k"];
const VIOLET = "#1e40af";

const PERKS: Record<Level, Array<{ icon: string; text: string }>> = {
  bronze:   [{ icon: "📦", text: "3 packages" },      { icon: "🔍", text: "Standard placement" }],
  silver:   [{ icon: "📦", text: "4 packages" },      { icon: "🎗️", text: "Silver badge" },      { icon: "💸", text: "2% client discount" }],
  gold:     [{ icon: "📦", text: "5 packages" },      { icon: "⭐", text: "Featured in search" }, { icon: "💸", text: "5% client discount" }],
  platinum: [{ icon: "📦", text: "5 packages" },      { icon: "🔝", text: "Top placement" },     { icon: "🎨", text: "Custom banner" },      { icon: "💸", text: "10% discount" }],
};

const BADGES: Record<string, { label: string; emoji: string; desc: string; hint: string; credit?: string }> = {
  profile_star:    { label: "Profile Star",    emoji: "⭐", desc: "Complete profile + KYC",           hint: "Fill your bio, niche, portfolio & get KYC approved"       },
  first_delivery:  { label: "First Delivery",  emoji: "🎬", desc: "Complete your first order",         hint: "Deliver your very first project to a client"              },
  rising_star:     { label: "Rising Star",     emoji: "🌟", desc: "Complete 5 orders",                 hint: "5 successful deliveries"                                  },
  verified_pro:    { label: "Verified Pro",    emoji: "🏆", desc: "Complete 25 orders",                hint: "25 successful deliveries"                                 },
  top_rated:       { label: "Top Rated",       emoji: "💎", desc: "50 orders · avg ≥ 4.5 ★",          hint: "Maintain excellence at scale",  credit: "₹500 bonus credit" },
  speed_demon:     { label: "Speed Demon",     emoji: "⚡", desc: "10 early deliveries",               hint: "Deliver 10 orders before the deadline"                    },
  streak_master:   { label: "Streak Master",   emoji: "🔥", desc: "5 orders in one week",              hint: "Complete 5 orders in a single Mon–Sun week"               },
  early_bird:      { label: "Early Bird",      emoji: "🐦", desc: "First 50 editors on platform",      hint: "Awarded to the first 50 editors who joined"               },
  perfect_month:   { label: "Perfect Month",   emoji: "🌙", desc: "10+ orders, zero disputes (month)", hint: "Complete 10+ orders in a calendar month with no disputes"  },
  client_favorite: { label: "Client Favorite", emoji: "💖", desc: "Saved by 25+ unique clients",       hint: "25 different clients added you to their saved list"        },
  quick_responder: { label: "Quick Responder", emoji: "⚡️", desc: "Avg response under 2 hours",        hint: "Keep your average reply time under 2 hours"               },
  referral_pro:    { label: "Referral Pro",    emoji: "🤝", desc: "Referred a user successfully",      hint: "Share your referral link — awarded on first conversion"    },
};
const BADGE_KEYS = ["profile_star","first_delivery","rising_star","verified_pro","top_rated","speed_demon","streak_master","early_bird","perfect_month","client_favorite","quick_responder","referral_pro"];

const XP_ENTRY: Record<string, { label: string; icon: string; penalty?: true }> = {
  order_completed:           { label: "Order completed",               icon: "🎬" },
  early_delivery:            { label: "Early delivery bonus",          icon: "⚡" },
  five_star_review:          { label: "5-star review received",        icon: "⭐" },
  review_received:           { label: "Positive review received",      icon: "🌟" },
  profile_completed:         { label: "Profile completed",             icon: "✅" },
  repeat_client_bonus:       { label: "Repeat client bonus",           icon: "🤝" },
  qa_answered:               { label: "Answered client question",      icon: "💬" },
  portfolio_added:           { label: "Portfolio item added",          icon: "🖼️" },
  order_streak_5:            { label: "5-order win streak",            icon: "🔥" },
  login_streak_7:            { label: "7-day login streak",            icon: "📅" },
  xp_shop_featured_boost:    { label: "Featured Boost activated",      icon: "🔝" },
  xp_shop_extra_package_slot:{ label: "Extra Package Slot activated",  icon: "📦" },
  xp_shop_profile_highlight: { label: "Profile Highlight activated",   icon: "✨" },
  late_delivery_penalty:     { label: "Late delivery",                 icon: "⏰", penalty: true },
  order_cancelled_penalty:   { label: "Order cancelled",               icon: "❌", penalty: true },
  spam_portfolio_penalty:    { label: "Spam portfolio",                icon: "🗑️", penalty: true },
  fake_review_penalty:       { label: "Fake review",                   icon: "🚫", penalty: true },
  abusive_behavior_penalty:  { label: "Abusive behaviour",             icon: "⚠️", penalty: true },
};

const RING_R = 70;
const RING_C = +(2 * Math.PI * RING_R).toFixed(2);

function getBadgeProgress(key: string, progress: Record<string, number>): { current: number; target: number } | null {
  const c = progress.completedOrders ?? 0;
  if (key === "first_delivery") return c >= 1  ? null : { current: c, target: 1  };
  if (key === "rising_star")    return c >= 5  ? null : { current: c, target: 5  };
  if (key === "verified_pro")   return c >= 25 ? null : { current: c, target: 25 };
  if (key === "top_rated")      return c >= 50 ? null : { current: c, target: 50 };
  if (key === "speed_demon")  { const e = progress.earlyDeliveries ?? 0; return e >= 10 ? null : { current: e, target: 10 }; }
  if (key === "streak_master") { const w = progress.weekOrders ?? 0;     return w >= 5  ? null : { current: w, target: 5  }; }
  return null;
}

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
  const [data, setData]                     = useState<RewardsData | null>(null);
  const [xpHistory, setXpHistory]           = useState<XpTx[]>([]);
  const [creditHistory, setCreditHistory]   = useState<CreditTx[]>([]);
  const [leaderboard, setLeaderboard]       = useState<LeaderboardEntry[]>([]);
  const [myLbStats, setMyLbStats]           = useState<{ rank: number; weekXp: number; userId: string } | null>(null);
  const [loading, setLoading]               = useState(true);
  const [tab, setTab]                       = useState<"badges" | "history" | "credits" | "leaderboard">("badges");
  const [ringReady, setRingReady]           = useState(false);
  const [showXpBreakdown, setShowXpBreakdown] = useState(false);
  const [timeLeft, setTimeLeft]             = useState("");

  useEffect(() => { setRingReady(true); }, []);

  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const next = new Date();
      const days = (7 - now.getDay()) % 7 || 7;
      next.setDate(now.getDate() + days);
      next.setHours(23, 59, 59, 999);
      const diff = next.getTime() - now.getTime();
      if (diff <= 0) return "Resetting...";
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff / 3600000) % 24);
      const m = Math.floor((diff / 60000) % 60);
      return `${d}d ${h}h ${m}m`;
    };
    setTimeLeft(calc());
    const t = setInterval(() => setTimeLeft(calc()), 60000);
    return () => clearInterval(t);
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
    <div className="px-6 py-8 space-y-5 w-full">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-7 w-48 rounded-xl bg-gray-100 animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-xl bg-gray-100 animate-pulse" />
          <div className="h-9 w-24 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      </div>
      <div className="h-[240px] rounded-3xl bg-gray-100 animate-pulse" />
      <div className="h-24 rounded-3xl bg-gray-100 animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />)}
      </div>
      <div className="h-64 rounded-3xl bg-gray-100 animate-pulse" />
    </div>
  );

  if (!data) return (
    <div className="p-8 text-center space-y-2">
      <Zap className="w-8 h-8 mx-auto text-gray-200" />
      <p className="text-sm text-gray-400">Failed to load rewards.</p>
    </div>
  );

  const lm     = LM[data.level];
  const pct    = lm.end === Infinity ? 100 : Math.min(100, ((data.xp - lm.start) / (lm.end - lm.start)) * 100);
  const offset = RING_C * (1 - pct / 100);

  const earnedSet = new Set(data.badges.map(b => b.badge));
  const earnedMap = Object.fromEntries(data.badges.map(b => [b.badge, b.awardedAt]));
  const levelIdx  = LEVEL_ORDER.indexOf(data.level);
  const now       = new Date();

  return (
    <div className="px-6 py-6 space-y-5 w-full font-sans">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] mb-1" style={{ color: VIOLET }}>Editor Portal</p>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Rewards Dashboard</h1>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {data.availableCredits > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 shadow-sm shadow-emerald-200">
              <Gift className="w-3.5 h-3.5 text-emerald-100" />
              <span className="text-sm font-black text-white tabular-nums">₹{(data.availableCredits / 100).toFixed(0)}</span>
              <span className="text-[10px] text-emerald-200 font-semibold uppercase tracking-wide">Credits</span>
            </div>
          )}
          <button
            onClick={() => setShowXpBreakdown(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 transition-all shadow-sm"
          >
            <Medal className="w-3.5 h-3.5" style={{ color: VIOLET }} /> XP Rules
          </button>
          <Link
            href="/editor/xp-shop"
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold text-white transition-all shadow-sm"
            style={{ background: `linear-gradient(135deg, ${VIOLET}, #1e3a8a)` }}
          >
            <Sparkles className="w-3.5 h-3.5" /> XP Shop
          </Link>
        </div>
      </div>

      {/* ── Level Hero Card ── */}
      <div
        className="rounded-3xl overflow-hidden border shadow-lg"
        style={{ borderColor: `${lm.ring}30` }}
      >
        <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${lm.ring}, ${lm.accent})` }} />
        <div
          className="p-7 md:p-10 flex flex-col md:flex-row items-center gap-8"
          style={{ background: `linear-gradient(150deg, ${lm.ring}12 0%, white 55%)` }}
        >
          {/* XP ring */}
          <div className="relative w-[164px] h-[164px] shrink-0 select-none">
            <div className="absolute inset-4 rounded-full blur-xl opacity-[0.14] animate-pulse" style={{ background: lm.ring }} />
            <svg viewBox="0 0 160 160" className="w-full h-full" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="80" cy="80" r={RING_R} fill="none" stroke={`${lm.ring}18`} strokeWidth="12" />
              <circle
                cx="80" cy="80" r={RING_R} fill="none"
                stroke={lm.ring} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={ringReady ? offset : RING_C}
                style={{
                  transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)",
                  filter: `drop-shadow(0 0 10px ${lm.ring}55)`,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl leading-none mb-1.5">{lm.emoji}</span>
              <span className="text-3xl font-black leading-none tabular-nums text-gray-900">{data.xp.toLocaleString()}</span>
              <span className="text-[9px] font-extrabold uppercase tracking-[0.25em] mt-1.5" style={{ color: lm.accent }}>XP</span>
            </div>
          </div>

          {/* Level info */}
          <div className="flex-1 w-full text-center md:text-left space-y-5">
            <div>
              <span
                className="text-[9px] font-black uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-full text-white inline-block mb-3 shadow-sm"
                style={{ background: `linear-gradient(135deg, ${lm.ring}, ${lm.accent})` }}
              >
                {lm.tagline}
              </span>
              <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-none">
                {lm.label} <span className="text-gray-400 font-light">Rank</span>
              </h2>
            </div>

            {/* Progress bar */}
            {data.nextLevel ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-600">{data.xp.toLocaleString()} XP</span>
                  <span style={{ color: lm.accent }}>
                    <strong>{data.xpToNext.toLocaleString()} XP</strong> to {LM[data.nextLevel as Level].label}
                  </span>
                </div>
                <div className="h-3 rounded-full overflow-hidden p-0.5" style={{ background: `${lm.ring}18` }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: ringReady ? `${pct}%` : "0%",
                      background: `linear-gradient(90deg, ${lm.ring}, ${lm.accent})`,
                      transition: "width 1.4s cubic-bezier(0.4,0,0.2,1)",
                    }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm font-bold text-emerald-600">🎉 Level Cap Achieved! You have reached maximum platform rank.</p>
            )}

            {/* Perks */}
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {PERKS[data.level].map(p => (
                <span
                  key={p.text}
                  className="text-[11px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-gray-200/60 text-gray-700 font-semibold shadow-sm"
                >
                  {p.icon} {p.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Journey Roadmap ── */}
      <div className="bg-white rounded-3xl border border-gray-100 px-6 py-5 shadow-sm overflow-hidden">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400 mb-6">Journey Roadmap</p>
        <div className="overflow-x-auto pb-1">
          <div className="relative flex items-center justify-between min-w-[440px] px-6">
            <div className="absolute left-[11%] right-[11%] h-[3px] bg-gray-100 rounded-full top-5" />
            {levelIdx > 0 && (
              <div
                className="absolute left-[11%] h-[3px] rounded-full transition-all duration-700 top-5"
                style={{
                  width: `calc(${(levelIdx / (LEVEL_ORDER.length - 1)) * 78}%)`,
                  background: `linear-gradient(90deg, ${LM.bronze.ring}, ${lm.ring})`,
                }}
              />
            )}
            {LEVEL_ORDER.map((l, i) => {
              const m = LM[l];
              const isCompleted = i < levelIdx;
              const isCurrent   = i === levelIdx;
              return (
                <div key={l} className="relative flex flex-col items-center flex-1 z-10">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all duration-500"
                    style={{
                      background: isCompleted ? `${m.ring}15` : isCurrent ? "white" : "#F8FAFC",
                      borderColor: isCurrent ? m.ring : isCompleted ? `${m.ring}60` : "#E2E8F0",
                      boxShadow: isCurrent ? `0 0 0 4px ${m.ring}22, 0 4px 12px ${m.ring}18` : undefined,
                    }}
                  >
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" style={{ color: m.ring }} /> : <span className="text-xl">{m.emoji}</span>}
                  </div>
                  <p className={cn("text-[11px] font-bold mt-2.5", isCurrent ? "text-gray-900" : "text-gray-400")}>{m.label}</p>
                  <p className="text-[9px] font-semibold text-gray-300 mt-0.5">{LEVEL_XP_LABELS[i]} XP</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Next Tier Preview ── */}
      {data.nextLevel && (
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ background: `${LM[data.nextLevel as Level].ring}15` }}>
              {LM[data.nextLevel as Level].emoji}
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Next Tier</p>
              <p className="text-sm font-bold text-gray-800">{LM[data.nextLevel as Level].label} perks — locked</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERKS[data.nextLevel as Level].map(p => (
              <span key={p.text} className="text-[11px] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-gray-400 font-medium">
                <span className="grayscale opacity-50">{p.icon}</span> {p.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Tier Comparison Cards ── */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400 mb-5">Editor Tiers</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            { name: "Bronze",   emoji: "🥉", xp: "0–499",     packages: "3 packages", perks: ["Standard visibility", "Standard support"],                            lv: "bronze"   as Level },
            { name: "Silver",   emoji: "🥈", xp: "500–1,999", packages: "4 packages", perks: ["Silver badge", "2% client discount"],                                 lv: "silver"   as Level },
            { name: "Gold",     emoji: "🥇", xp: "2k–4,999",  packages: "5 packages", perks: ["Featured search listing", "5% client discount"],                      lv: "gold"     as Level },
            { name: "Platinum", emoji: "💎", xp: "5,000+",    packages: "5 packages", perks: ["Top spotlight", "Custom banner", "10% discount", "VIP support"],      lv: "platinum" as Level },
          ] as const).map(row => {
            const meta = LM[row.lv];
            const isCurrent = row.lv === data.level;
            return (
              <div
                key={row.name}
                className={cn("rounded-2xl p-4 border transition-all", isCurrent ? "shadow-md" : "border-gray-100 bg-gray-50/40 opacity-75 hover:opacity-95")}
                style={isCurrent ? { borderColor: `${meta.ring}40`, background: `linear-gradient(145deg, ${meta.ring}10, white)` } : {}}
              >
                <div className="text-3xl mb-2.5">{row.emoji}</div>
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-sm font-bold text-gray-900">{row.name}</p>
                  {isCurrent && (
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-white" style={{ background: meta.ring }}>
                      You
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mb-2 tabular-nums">{row.xp} XP</p>
                <p className="text-xs font-extrabold mb-3" style={{ color: isCurrent ? meta.accent : "#6B7280" }}>{row.packages}</p>
                <ul className="space-y-1.5">
                  {row.perks.map(p => (
                    <li key={p} className="text-[10px] text-gray-500 flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0 mt-1.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 bg-gray-50/60 p-1.5 gap-1.5 overflow-x-auto">
          {([
            { key: "badges"      as const, label: "Badges",      count: `${data.badges.length}/${BADGE_KEYS.length}` },
            { key: "history"     as const, label: "XP History",  count: null },
            { key: "credits"     as const, label: "Credits",     count: null },
            { key: "leaderboard" as const, label: "Leaderboard", count: null },
          ]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex-1 min-w-max py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5",
                tab === key ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-white/60"
              )}
              style={tab === key ? { background: `linear-gradient(135deg, ${VIOLET}, #1e3a8a)` } : {}}
            >
              {label}
              {count && (
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                  tab === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Badges */}
        {tab === "badges" && (
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {BADGE_KEYS.map(key => {
              const def      = BADGES[key];
              const isEarned = earnedSet.has(key);
              const awardedAt = earnedMap[key];
              const prog     = getBadgeProgress(key, data.progress);
              return (
                <div
                  key={key}
                  className={cn(
                    "rounded-2xl p-4 flex flex-col items-center text-center gap-3 transition-all duration-300 border",
                    isEarned ? "bg-white hover:-translate-y-0.5 hover:shadow-md" : "bg-gray-50/50 border-gray-100/80 opacity-55"
                  )}
                  style={isEarned ? {
                    borderColor: `${lm.ring}30`,
                    boxShadow: `0 0 0 1px ${lm.ring}15, 0 1px 4px ${lm.ring}10`,
                  } : {}}
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
                    style={isEarned ? {
                      background: `${lm.ring}15`,
                      boxShadow: `0 0 0 4px ${lm.ring}20`,
                    } : { background: "#F1F5F9" }}
                  >
                    <span className={cn("text-3xl", !isEarned && "filter grayscale opacity-30")}>{def.emoji}</span>
                  </div>
                  <div className="flex-1">
                    <p className={cn("text-xs font-bold leading-tight", isEarned ? "text-gray-900" : "text-gray-400")}>{def.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{def.desc}</p>
                    {!isEarned && <p className="text-[9px] text-gray-300 italic mt-1 leading-tight">{def.hint}</p>}
                  </div>
                  <div className="w-full mt-auto">
                    {def.credit && isEarned && <p className="text-[10px] text-emerald-600 font-semibold mb-1.5">🎁 {def.credit}</p>}
                    {isEarned && awardedAt ? (
                      <span className="text-[9px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full inline-block" style={{ background: `${VIOLET}12`, color: VIOLET }}>
                        {fmtDate(awardedAt)}
                      </span>
                    ) : prog ? (
                      <div className="space-y-1">
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${VIOLET}15` }}>
                          <div className="h-full rounded-full" style={{ width: `${(prog.current / prog.target) * 100}%`, background: `${VIOLET}80` }} />
                        </div>
                        <p className="text-[9px] tabular-nums text-gray-400 font-bold">{prog.current} / {prog.target}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* XP History */}
        {tab === "history" && (
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {xpHistory.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Zap className="w-8 h-8 mx-auto text-gray-200" />
                <p className="text-sm text-gray-400">No XP history yet — complete your first order!</p>
              </div>
            ) : xpHistory.map(tx => {
              const entry = XP_ENTRY[tx.reason];
              const isGain = tx.amount >= 0;
              return (
                <div key={tx.id} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg", isGain ? "bg-blue-50" : "bg-red-50")}>
                    {entry?.icon ?? "💫"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-semibold truncate", entry?.penalty ? "text-red-600" : "text-gray-800")}>
                      {entry?.label ?? tx.reason.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-gray-400">{timeAgo(tx.createdAt)} · {fmtDate(tx.createdAt)}</p>
                  </div>
                  <span className={cn("text-sm font-extrabold tabular-nums shrink-0", isGain ? "text-brand-primary" : "text-red-500")}>
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount} XP
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Credits */}
        {tab === "credits" && (
          <div className="p-5 space-y-4">
            {(() => {
              const expiringSoon = creditHistory.filter(tx => {
                if (!tx.expiresAt || tx.usedAt) return false;
                const d = Math.ceil((new Date(tx.expiresAt).getTime() - Date.now()) / 86400000);
                return d <= 30 && d > 0;
              });
              if (!expiringSoon.length) return null;
              return (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Credits Expiring Soon
                  </p>
                  {expiringSoon.map(tx => {
                    const d = Math.ceil((new Date(tx.expiresAt!).getTime() - Date.now()) / 86400000);
                    return (
                      <div key={tx.id} className="flex justify-between items-center bg-white rounded-xl p-3 text-xs font-bold text-amber-800 border border-amber-100">
                        <span className="truncate pr-3">₹{(tx.amount / 100).toFixed(0)} — {tx.reason}</span>
                        <span className="shrink-0 text-[10px] font-extrabold text-amber-600">{d}d left</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <div className="divide-y divide-gray-50 border border-gray-100 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
              {creditHistory.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <Gift className="w-8 h-8 mx-auto text-gray-200" />
                  <p className="text-sm text-gray-400">No credit transactions recorded.</p>
                </div>
              ) : creditHistory.map(tx => {
                const used    = !!tx.usedAt;
                const expired = !!(tx.expiresAt && new Date(tx.expiresAt) < now && !used);
                return (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", used || expired ? "bg-gray-100" : "bg-emerald-50")}>
                        <Gift className={cn("w-4 h-4", used || expired ? "text-gray-400" : "text-emerald-600")} />
                      </div>
                      <div>
                        <p className={cn("text-sm font-semibold", used || expired ? "text-gray-400 line-through" : "text-gray-800")}>{tx.reason}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-400">{timeAgo(tx.createdAt)}</p>
                          {!used && !expired && tx.expiresAt && (
                            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md font-medium flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" /> {fmtDate(tx.expiresAt)}
                            </span>
                          )}
                          {used    && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-medium">Used</span>}
                          {expired && <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-md font-medium">Expired</span>}
                        </div>
                      </div>
                    </div>
                    <span className={cn("text-sm font-extrabold tabular-nums shrink-0", used || expired ? "text-gray-300" : "text-emerald-600")}>
                      ₹{(tx.amount / 100).toFixed(0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {tab === "leaderboard" && (
          <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 rounded-2xl p-4 border" style={{ background: `${VIOLET}08`, borderColor: `${VIOLET}20` }}>
              <div className="flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: VIOLET }}>Weekly Leaderboard</p>
                  <p className="text-[10px] text-gray-500">XP earned Monday to Sunday</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-white border border-gray-100 px-3 py-1.5 rounded-xl shadow-sm shrink-0">
                <Clock className="w-3.5 h-3.5" style={{ color: VIOLET }} />
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Resets in</span>
                <span className="text-xs font-bold tabular-nums" style={{ color: VIOLET }}>{timeLeft}</span>
              </div>
            </div>

            {/* Prize pool */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { rank: "🥇 1st", bonus: "+150 XP", detail: "7-day profile highlight", bg: "bg-yellow-50/60 border-yellow-200/80", text: "text-yellow-800" },
                { rank: "🥈 2nd", bonus: "+100 XP", detail: "Added to ranking",         bg: "bg-slate-50/60 border-slate-200/80",  text: "text-slate-700"  },
                { rank: "🥉 3rd", bonus: "+50 XP",  detail: "Added to ranking",         bg: "bg-amber-50/40 border-amber-200/60",  text: "text-amber-800"  },
              ].map(prize => (
                <div key={prize.rank} className={cn("border rounded-2xl p-3.5 text-center space-y-0.5", prize.bg)}>
                  <p className={cn("text-xs font-extrabold", prize.text)}>{prize.rank}</p>
                  <p className={cn("text-base font-black", prize.text)}>{prize.bonus}</p>
                  <p className="text-[10px] text-gray-500">{prize.detail}</p>
                </div>
              ))}
            </div>

            {/* Top-3 podium */}
            {leaderboard.length >= 3 && (
              <div className="flex items-end justify-center gap-2 pt-2 pb-1">
                {/* 2nd */}
                <div className="flex-1 max-w-[110px] flex flex-col items-center gap-2">
                  <div className="relative">
                    {leaderboard[1].image
                      ? <img src={leaderboard[1].image} alt={leaderboard[1].name} className="w-12 h-12 rounded-full object-cover ring-4 ring-slate-200" />
                      : <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center ring-4 ring-slate-200"><span className="text-sm font-bold text-slate-500">{(leaderboard[1].name ?? "?")[0]?.toUpperCase()}</span></div>
                    }
                    <span className="absolute -top-2 -right-1 text-lg select-none">🥈</span>
                  </div>
                  <p className="text-xs font-bold text-gray-700 text-center truncate w-full">{leaderboard[1].name}</p>
                  <div className="w-full bg-slate-100 rounded-t-xl h-16 flex items-center justify-center">
                    <span className="text-sm font-black text-slate-600 tabular-nums">{leaderboard[1].weekXp.toLocaleString()}</span>
                  </div>
                </div>
                {/* 1st */}
                <div className="flex-1 max-w-[120px] flex flex-col items-center gap-2">
                  <div className="relative">
                    {leaderboard[0].image
                      ? <img src={leaderboard[0].image} alt={leaderboard[0].name} className="w-14 h-14 rounded-full object-cover ring-4 ring-yellow-300" />
                      : <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center ring-4 ring-yellow-300"><span className="text-base font-bold text-yellow-700">{(leaderboard[0].name ?? "?")[0]?.toUpperCase()}</span></div>
                    }
                    <span className="absolute -top-3 -right-1 text-xl select-none">👑</span>
                  </div>
                  <p className="text-xs font-bold text-gray-900 text-center truncate w-full">{leaderboard[0].name}</p>
                  <div className="w-full bg-yellow-100 rounded-t-xl h-24 flex items-center justify-center">
                    <span className="text-base font-black text-yellow-700 tabular-nums">{leaderboard[0].weekXp.toLocaleString()}</span>
                  </div>
                </div>
                {/* 3rd */}
                <div className="flex-1 max-w-[110px] flex flex-col items-center gap-2">
                  <div className="relative">
                    {leaderboard[2].image
                      ? <img src={leaderboard[2].image} alt={leaderboard[2].name} className="w-12 h-12 rounded-full object-cover ring-4 ring-amber-200" />
                      : <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center ring-4 ring-amber-200"><span className="text-sm font-bold text-amber-600">{(leaderboard[2].name ?? "?")[0]?.toUpperCase()}</span></div>
                    }
                    <span className="absolute -top-2 -right-1 text-lg select-none">🥉</span>
                  </div>
                  <p className="text-xs font-bold text-gray-700 text-center truncate w-full">{leaderboard[2].name}</p>
                  <div className="w-full bg-amber-50 rounded-t-xl h-10 flex items-center justify-center">
                    <span className="text-sm font-black text-amber-600 tabular-nums">{leaderboard[2].weekXp.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* My position outside top list */}
            {myLbStats && !leaderboard.some(e => e.userId === myLbStats.userId) && (
              <div className="flex items-center gap-4 rounded-2xl px-4 py-3.5 border" style={{ background: `${VIOLET}08`, borderColor: `${VIOLET}25` }}>
                <span className="text-xs font-extrabold tabular-nums w-8 shrink-0 text-center" style={{ color: VIOLET }}>#{myLbStats.rank}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">Your position</p>
                  <p className="text-xs text-gray-500">{myLbStats.weekXp.toLocaleString()} XP this week</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </div>
            )}

            {/* Full list */}
            <div className="space-y-2">
              {leaderboard.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <Trophy className="w-8 h-8 mx-auto text-gray-200" />
                  <p className="text-sm text-gray-400">No activity recorded this week yet.</p>
                </div>
              ) : leaderboard.map((entry, i) => {
                const rank = i + 1;
                const is1  = rank === 1;
                const is2  = rank === 2;
                const is3  = rank === 3;
                const medal = is1 ? "🥇" : is2 ? "🥈" : is3 ? "🥉" : null;
                return (
                  <div
                    key={entry.userId}
                    className={cn(
                      "flex items-center gap-4 rounded-2xl px-4 py-3 border transition-colors",
                      is1 ? "bg-yellow-50/60 border-yellow-200/80 shadow-sm" :
                      is2 ? "bg-slate-50/50 border-slate-200/70" :
                      is3 ? "bg-amber-50/30 border-amber-200/50" :
                            "bg-white border-gray-100 hover:bg-gray-50/50"
                    )}
                  >
                    <div className="w-8 shrink-0 text-center">
                      {medal ? <span className="text-xl leading-none">{medal}</span> : <span className="text-xs font-extrabold text-gray-400 tabular-nums">#{rank}</span>}
                    </div>
                    <div className="relative shrink-0">
                      {entry.image
                        ? <img src={entry.image} alt={entry.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-white" />
                        : <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center ring-2 ring-white"><span className="text-xs font-bold text-gray-500">{(entry.name ?? "?")[0]?.toUpperCase()}</span></div>
                      }
                      {is1 && <span className="absolute -top-2 -right-1 text-xs">👑</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      {entry.editorId ? (
                        <Link href={`/editor/${entry.editorId}`} target="_blank" className="text-sm font-bold text-gray-900 hover:underline flex items-center gap-1">
                          {entry.name} <span className="text-[10px] font-normal" style={{ color: VIOLET }}>↗</span>
                        </Link>
                      ) : (
                        <p className="text-sm font-bold text-gray-900 truncate">{entry.name}</p>
                      )}
                    </div>
                    <span className={cn("text-sm font-black tabular-nums shrink-0", is1 ? "text-yellow-700" : "text-brand-primary")}>
                      {entry.weekXp.toLocaleString()} <span className="text-[10px] font-semibold text-gray-400">XP</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Weekly Quests ── */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400 mb-0.5">Active Challenges</p>
          <h3 className="text-sm font-bold text-gray-900">Weekly Quests</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: "Fast Responder",  reward: "+30 XP", details: "Reply to 3 client messages in under 30 minutes.", progress: "1 / 3 messages",    done: false, value: 33  },
            { title: "Portfolio Refresh", reward: "+50 XP", details: "Add a new video showcase to your public feed.", progress: "Completed",           done: true,  value: 100 },
            { title: "Punctual Editor",  reward: "+40 XP", details: "Deliver 2 projects at least 12 hours early.",   progress: "1 / 2 deliveries",   done: false, value: 50  },
          ].map(quest => (
            <div key={quest.title} className={cn(
              "border rounded-2xl p-4 space-y-3 flex flex-col justify-between",
              quest.done ? "bg-emerald-50/30 border-emerald-200/60" : "bg-white border-gray-100"
            )}>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center gap-2">
                  <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    {quest.done ? "✅" : "🕒"} {quest.title}
                  </p>
                  <span
                    className="text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 text-white"
                    style={{ background: VIOLET }}
                  >
                    {quest.reward}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">{quest.details}</p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-semibold">
                  <span className="text-gray-400">Progress</span>
                  <span className={quest.done ? "text-emerald-600 font-bold" : "text-gray-500"}>{quest.progress}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", quest.done ? "bg-emerald-500" : "")}
                    style={{ width: `${quest.value}%`, background: quest.done ? undefined : VIOLET }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How to Earn XP ── */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400 mb-4">How to Earn XP</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { emoji: "✅", label: "Complete Profile & KYC",  xp: "+100 XP",   isOneTime: true,  details: "One-time profile completeness reward" },
            { emoji: "🖼️", label: "Portfolio Item Added",    xp: "+15 XP",    isOneTime: true,  details: "KYC-verified editors only · max 5 items" },
            { emoji: "🎬", label: "Complete an Order",        xp: "+50 XP",    isOneTime: false, details: "Earned on every video delivery" },
            { emoji: "⚡", label: "Early Delivery Bonus",     xp: "+15–20 XP", isOneTime: false, details: ">12h early (+15), >24h early (+20)" },
            { emoji: "⭐", label: "5-Star Review Received",   xp: "+25 XP",    isOneTime: false, details: "Per 5-star rating received" },
            { emoji: "🌟", label: "4-Star Review Received",   xp: "+15 XP",    isOneTime: false, details: "Per 4-star rating received" },
            { emoji: "🤝", label: "Repeat Client Bonus",      xp: "+30 XP",    isOneTime: false, details: "3rd order from the same client" },
            { emoji: "💬", label: "Answer FAQ Question",      xp: "+5 XP",     isOneTime: false, details: "Pre-order question answered" },
            { emoji: "🔥", label: "5-Order Win Streak",       xp: "+100 XP",   isOneTime: false, details: "5 consecutive completions, no cancellation" },
            { emoji: "📅", label: "7-Day Login Streak",       xp: "+25 XP",    isOneTime: false, details: "Log in 7 days in a row · resets daily" },
          ].map(({ emoji, label, xp, isOneTime, details }) => (
            <div key={label} className="flex items-center gap-3.5 rounded-2xl border border-gray-100 bg-gray-50/40 p-4 hover:border-gray-200 hover:bg-white hover:shadow-sm transition-all duration-200">
              <span className="text-2xl shrink-0">{emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800">{label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{details}</p>
                <span className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1.5 inline-block",
                  isOneTime ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                )}>
                  {isOneTime ? "Once" : "Regular"}
                </span>
              </div>
              <span className="text-sm font-black shrink-0" style={{ color: VIOLET }}>{xp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Platform Penalties ── */}
      <div className="bg-white rounded-3xl border border-red-100/80 p-5 shadow-sm">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-red-500 mb-3">⚠️ Platform Penalties</p>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          XP can be deducted for behaviour that harms platform quality. Level can drop if total XP falls below the tier threshold.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { emoji: "⏰", label: "Late Delivery",      xp: "−20 XP",  details: "Delivered after the agreed deadline" },
            { emoji: "❌", label: "Order Cancelled",    xp: "−40 XP",  details: "Editor-initiated cancellation" },
            { emoji: "🗑️", label: "Spam Portfolio",     xp: "−25 XP",  details: "Irrelevant or spam content flagged" },
            { emoji: "🚫", label: "Fake Review",        xp: "−100 XP", details: "Soliciting or posting fake reviews" },
            { emoji: "⚠️", label: "Abusive Behaviour",  xp: "−50 XP",  details: "Confirmed abusive conduct" },
          ].map(({ emoji, label, xp, details }) => (
            <div key={label} className="rounded-2xl border border-red-100 bg-red-50/30 p-4 flex items-start gap-3">
              <span className="text-2xl shrink-0">{emoji}</span>
              <div>
                <p className="text-xs font-bold text-gray-800">{label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{details}</p>
                <p className="text-sm font-black text-red-600 mt-1.5">{xp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── XP Breakdown Modal ── */}
      {showXpBreakdown && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setShowXpBreakdown(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-black leading-none transition-colors"
            >
              &times;
            </button>
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-bold text-gray-900">XP Scoring Rules</h3>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Earn XP points to level up your Editor Rank and unlock benefits like more packages, custom banners, and search promotion.
            </p>
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden text-xs max-h-96 overflow-y-auto">
              {[
                { title: "Complete Profile & KYC",  xp: "+100 XP",    desc: "Bio, title, niche, portfolio & KYC (One-time)" },
                { title: "Portfolio Item Uploaded", xp: "+15 XP",     desc: "KYC-verified only · max 5 items (up to +75 XP)" },
                { title: "Order Completed",         xp: "+50 XP",     desc: "For every video delivery completed" },
                { title: "Early Delivery Bonus",    xp: "+15/+20 XP", desc: ">12h early (+15) or >24h early (+20)" },
                { title: "5-Star Review",           xp: "+25 XP",     desc: "For every 5-star review received" },
                { title: "4-Star Review",           xp: "+15 XP",     desc: "For every 4-star review received" },
                { title: "3-Star Review",           xp: "+5 XP",      desc: "For every 3-star review received" },
                { title: "Repeat Client Bonus",     xp: "+30 XP",     desc: "On 3rd completed order with same client" },
                { title: "Answer Pre-order FAQ",    xp: "+5 XP",      desc: "When answering client questions" },
                { title: "5-Order Win Streak",      xp: "+100 XP",    desc: "Every 5 consecutive completions without cancellation" },
                { title: "7-Day Login Streak",      xp: "+25 XP",     desc: "Log in 7 days in a row" },
              ].map(r => (
                <div key={r.title} className="flex justify-between items-center p-3 hover:bg-gray-50 transition-colors">
                  <div className="pr-4">
                    <p className="font-bold text-gray-800">{r.title}</p>
                    <p className="text-[10px] text-gray-400">{r.desc}</p>
                  </div>
                  <span className="font-extrabold shrink-0" style={{ color: VIOLET }}>{r.xp}</span>
                </div>
              ))}
              <div className="bg-red-50/60 px-3 py-2 border-t border-red-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">Platform Penalties</p>
              </div>
              {[
                { title: "Late Delivery",     xp: "−20 XP",  desc: "Order delivered after the agreed deadline" },
                { title: "Order Cancelled",   xp: "−40 XP",  desc: "Editor-initiated cancellation" },
                { title: "Spam Portfolio",    xp: "−25 XP",  desc: "Portfolio flagged for spam" },
                { title: "Fake Review",       xp: "−100 XP", desc: "Caught submitting or soliciting fake reviews" },
                { title: "Abusive Behaviour", xp: "−50 XP",  desc: "Confirmed abusive conduct" },
              ].map(r => (
                <div key={r.title} className="flex justify-between items-center p-3 hover:bg-red-50/30 transition-colors">
                  <div className="pr-4">
                    <p className="font-bold text-gray-800">{r.title}</p>
                    <p className="text-[10px] text-gray-400">{r.desc}</p>
                  </div>
                  <span className="font-extrabold text-red-600 shrink-0">{r.xp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
