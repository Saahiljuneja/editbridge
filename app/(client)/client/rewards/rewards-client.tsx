"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Level } from "@/lib/rewards";
import { Zap, Gift, Clock, CheckCircle2, Store, Star, ShoppingBag, ArrowUpRight } from "lucide-react";
import { XpStoreClient } from "../xp-store/xp-store-client";

const COLOR = "#1e40af";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Badge { id: string; badge: string; awardedAt: string; label: string; emoji: string; desc: string; }
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
  bronze:   { label: "Bronze",   emoji: "🥉", tagline: "Standard Member",   accent: "#D97706", ring: "#F59E0B", glow: "rgba(245,158,11,0.06)",  textClass: "text-amber-600",  bgGradient: "from-amber-500/10 to-orange-500/5",   border: "border-amber-500/20",  start: 0,    end: 500      },
  silver:   { label: "Silver",   emoji: "🥈", tagline: "Building Momentum", accent: "#6B7280", ring: "#9CA3AF", glow: "rgba(156,163,175,0.06)", textClass: "text-slate-600",  bgGradient: "from-slate-400/15 to-gray-500/5",     border: "border-slate-400/25",  start: 500,  end: 2000     },
  gold:     { label: "Gold",     emoji: "🥇", tagline: "Top Supporter",     accent: "#B45309", ring: "#EAB308", glow: "rgba(234,179,8,0.08)",   textClass: "text-yellow-600", bgGradient: "from-yellow-500/15 to-amber-500/5",   border: "border-yellow-500/25", start: 2000, end: 5000     },
  platinum: { label: "Platinum", emoji: "💎", tagline: "Elite Status",      accent: "#4F46E5", ring: "#818CF8", glow: "rgba(129,140,248,0.1)",  textClass: "text-indigo-600", bgGradient: "from-indigo-500/15 to-purple-600/5",  border: "border-indigo-500/25", start: 5000, end: Infinity },
};

const LEVEL_ORDER: Level[] = ["bronze", "silver", "gold", "platinum"];
const LEVEL_XP_LABELS = ["0", "500", "2k", "5k"];

const PERKS: Record<Level, Array<{ icon: string; text: string }>> = {
  bronze:   [{ icon: "👥", text: "Standard matching" },  { icon: "🎧", text: "Basic support" }],
  silver:   [{ icon: "🏷️", text: "2% off orders" },      { icon: "🎗️", text: "Silver badge" },      { icon: "⚡", text: "Early editor access" }],
  gold:     [{ icon: "🏷️", text: "5% off orders" },      { icon: "👑", text: "Gold badge" },         { icon: "🎯", text: "Priority matching" },    { icon: "📞", text: "Dedicated support" }],
  platinum: [{ icon: "🏷️", text: "10% off orders" },     { icon: "💎", text: "Platinum badge" },     { icon: "🔥", text: "Top priority" },         { icon: "🤝", text: "VIP support" }],
};

const BADGES: Record<string, { label: string; emoji: string; desc: string; hint: string; credit?: string }> = {
  first_order:  { label: "First Order",  emoji: "📦", desc: "Place your very first order", hint: "Order a video edit project on EditBridge" },
  supporter:    { label: "Supporter",    emoji: "💪", desc: "Place 5 orders",               hint: "5 successful video orders completed" },
  power_client: { label: "Power Client", emoji: "👑", desc: "Place 25 orders",              hint: "25 successful video orders completed", credit: "₹200 credit at 10th order" },
  top_reviewer: { label: "Top Reviewer", emoji: "✍️", desc: "Leave 10 reviews",             hint: "Submit reviews for 10 finished projects" },
  loyal_client: { label: "Loyal Client", emoji: "❤️", desc: "Place orders for 3+ months",  hint: "Place orders across 3 distinct calendar months" },
};
const BADGE_KEYS = ["first_order","supporter","power_client","top_reviewer","loyal_client"];

const XP_WAYS = [
  { emoji: "🛍️", label: "Place an Order",      xp: "+20 XP",      isOneTime: false, details: "Earn on every order placed" },
  { emoji: "✍️", label: "Leave a Review",       xp: "+20 XP",      isOneTime: false, details: "Earn on every review submitted" },
  { emoji: "🤝", label: "Repeat Editor Bonus",  xp: "+30 XP",      isOneTime: false, details: "3rd order with the same editor" },
  { emoji: "📅", label: "7-Day Login Streak",   xp: "+25 XP",      isOneTime: false, details: "Log in 7 days in a row · resets daily" },
  { emoji: "🎁", label: "Refer a Friend",       xp: "₹200 Credit", isOneTime: false, details: "When referred user orders" },
  { emoji: "🎫", label: "10th Order Milestone", xp: "₹200 Credit", isOneTime: true,  details: "One-time milestone reward" },
];

const XP_LABELS: Record<string, { label: string; icon: string; penalty?: true }> = {
  order_placed:               { label: "Order placed",              icon: "🛍️" },
  review_left:                { label: "Review left",               icon: "✍️" },
  repeat_client_bonus:        { label: "Repeat editor bonus",       icon: "🤝" },
  login_streak_7:             { label: "7-day login streak",        icon: "📅" },
  client_store_priority_match:{ label: "Priority Match activated",  icon: "🎯" },
  client_store_vip_support:   { label: "VIP Support activated",     icon: "🤝" },
  client_store_rush_flag:     { label: "Rush Flag used",            icon: "⚡" },
  client_store_extra_revision:{ label: "Extra Revision used",       icon: "🔄" },
  client_store_xp_credit_swap:{ label: "XP converted to credit",   icon: "💱" },
  patron_badge_patron_bronze: { label: "Patron Bronze unlocked",    icon: "🥉" },
  patron_badge_patron_silver: { label: "Patron Silver unlocked",    icon: "🥈" },
  patron_badge_patron_gold:   { label: "Patron Gold unlocked",      icon: "🥇" },
  patron_badge_patron_diamond:{ label: "Patron Diamond unlocked",   icon: "💎" },
  chargeback_fraud_penalty:   { label: "Chargeback fraud",          icon: "💳", penalty: true },
  abusive_behavior_penalty:   { label: "Abusive behaviour",         icon: "⚠️", penalty: true },
};

function getBadgeProgress(key: string, progress: Record<string, number>): { current: number; target: number } | null {
  const c = progress.placedOrders ?? 0;
  const r = progress.reviewsLeft ?? 0;
  const m = progress.monthsActive ?? 0;
  if (key === "first_order")  return c >= 1  ? null : { current: c, target: 1  };
  if (key === "supporter")    return c >= 5  ? null : { current: c, target: 5  };
  if (key === "power_client") return c >= 25 ? null : { current: c, target: 25 };
  if (key === "top_reviewer") return r >= 10 ? null : { current: r, target: 10 };
  if (key === "loyal_client") return m >= 3  ? null : { current: m, target: 3  };
  return null;
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const RING_R = 70;
const RING_C = +(2 * Math.PI * RING_R).toFixed(2);

interface StoreProps {
  currentXp: number;
  activeTypes: string[];
  boostExpiry: Record<string, string | null>;
  ownedBadges: string[];
  swapUsedThisMonth: number;
}

export function ClientRewardsClient({ storeProps }: { storeProps: StoreProps }) {
  const [data, setData]             = useState<RewardsData | null>(null);
  const [xpHistory, setXpHistory]   = useState<XpTx[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditTx[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<"badges" | "history" | "credits" | "store">("badges");
  const [ringReady, setRingReady]   = useState(false);

  useEffect(() => { setRingReady(true); }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/rewards").then(r => r.json()),
      fetch("/api/rewards/history").then(r => r.json()),
    ]).then(([rd, hd]) => {
      setData(rd);
      setXpHistory(hd.xpHistory ?? []);
      setCreditHistory(hd.creditHistory ?? []);
    }).catch(err => console.error("Failed to load client rewards data", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="px-6 py-8 space-y-5 w-full">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-7 w-48 rounded-xl bg-gray-100 animate-pulse" />
        </div>
        <div className="h-9 w-28 rounded-xl bg-gray-100 animate-pulse" />
      </div>
      <div className="h-[240px] rounded-3xl bg-gray-100 animate-pulse" />
      <div className="h-24 rounded-3xl bg-gray-100 animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-36 rounded-2xl bg-gray-100 animate-pulse" />)}
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
  const now = new Date();

  return (
    <div className="px-6 py-6 space-y-5 w-full font-sans">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] mb-1" style={{ color: COLOR }}>Loyalty Portal</p>
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
            onClick={() => setTab("store")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold text-white transition-all shadow-sm"
            style={{ background: `linear-gradient(135deg, ${COLOR}, #1e3a8a)` }}
          >
            <Store className="w-3.5 h-3.5" /> XP Store
          </button>
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
            <div
              className="absolute inset-4 rounded-full blur-xl opacity-[0.14] animate-pulse"
              style={{ background: lm.ring }}
            />
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
                {lm.label} <span className="text-gray-400 font-light">Member</span>
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
              <p className="text-sm font-bold text-emerald-600">🎉 Maximum tier achieved! Thank you for your support.</p>
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
                    {isCompleted
                      ? <CheckCircle2 className="w-5 h-5" style={{ color: m.ring }} />
                      : <span className="text-xl">{m.emoji}</span>
                    }
                  </div>
                  <p className={cn("text-[11px] font-bold mt-2.5", isCurrent ? "text-gray-900" : "text-gray-400")}>{m.label}</p>
                  <p className="text-[9px] font-semibold text-gray-300 mt-0.5">{LEVEL_XP_LABELS[i]} XP</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Membership Tier Cards ── */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400 mb-5">Membership Tiers</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            { name: "Bronze",   emoji: "🥉", xp: "0–499",     discount: null,       perks: ["Standard matching", "Basic support"],                     lv: "bronze"   as Level },
            { name: "Silver",   emoji: "🥈", xp: "500–1,999", discount: "2% off",   perks: ["Silver badge", "Early editor access"],                    lv: "silver"   as Level },
            { name: "Gold",     emoji: "🥇", xp: "2k–4,999",  discount: "5% off",   perks: ["Gold badge", "Priority matching", "Dedicated support"],   lv: "gold"     as Level },
            { name: "Platinum", emoji: "💎", xp: "5,000+",    discount: "10% off",  perks: ["Platinum badge", "Top priority", "VIP support"],           lv: "platinum" as Level },
          ] as const).map(row => {
            const meta = LM[row.lv];
            const isCurrent = row.lv === data.level;
            return (
              <div
                key={row.name}
                className={cn(
                  "rounded-2xl p-4 border transition-all",
                  isCurrent ? "shadow-md" : "border-gray-100 bg-gray-50/40 opacity-75 hover:opacity-95"
                )}
                style={isCurrent ? {
                  borderColor: `${meta.ring}40`,
                  background: `linear-gradient(145deg, ${meta.ring}10, white)`,
                } : {}}
              >
                <div className="text-3xl mb-2.5">{row.emoji}</div>
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-sm font-bold text-gray-900">{row.name}</p>
                  {isCurrent && (
                    <span
                      className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-white"
                      style={{ background: meta.ring }}
                    >
                      You
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mb-2.5 tabular-nums">{row.xp} XP</p>
                {row.discount && (
                  <p className="text-sm font-extrabold mb-3" style={{ color: isCurrent ? meta.accent : "#6B7280" }}>
                    {row.discount}
                  </p>
                )}
                <ul className="space-y-1.5 mt-auto">
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

      {/* ── Tabs Content ── */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 bg-gray-50/60 p-1.5 gap-1.5 overflow-x-auto">
          {([
            { key: "badges"  as const, label: "Badges", count: `${data.badges.length}/${BADGE_KEYS.length}` },
            { key: "history" as const, label: "XP History", count: null },
            { key: "credits" as const, label: "Credits", count: null },
            { key: "store"   as const, label: "XP Store", count: null },
          ]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex-1 min-w-max py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5",
                tab === key ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-white/60"
              )}
              style={tab === key ? { background: `linear-gradient(135deg, ${COLOR}, #1e3a8a)` } : {}}
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
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
                    isEarned
                      ? "bg-white hover:-translate-y-0.5 hover:shadow-md"
                      : "bg-gray-50/50 border-gray-100/80 opacity-55"
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
                    {!isEarned && def.hint && (
                      <p className="text-[9px] text-gray-300 italic mt-1 leading-tight">{def.hint}</p>
                    )}
                  </div>
                  <div className="w-full mt-auto">
                    {def.credit && isEarned && (
                      <p className="text-[10px] text-emerald-600 font-semibold mb-1.5">🎁 {def.credit}</p>
                    )}
                    {isEarned && awardedAt ? (
                      <span className="text-[9px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full inline-block" style={{ background: `${COLOR}12`, color: COLOR }}>
                        {fmtDate(awardedAt)}
                      </span>
                    ) : prog ? (
                      <div className="space-y-1">
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${COLOR}15` }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(prog.current / prog.target) * 100}%`, background: `${COLOR}80` }}
                          />
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
                <p className="text-sm text-gray-400">No XP history yet — place your first order!</p>
              </div>
            ) : xpHistory.map(tx => {
              const entry = XP_LABELS[tx.reason];
              const isGain = tx.amount >= 0;
              return (
                <div key={tx.id} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg",
                    isGain ? "bg-blue-50" : "bg-red-50"
                  )}>
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
                const daysLeft = Math.ceil((new Date(tx.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return daysLeft <= 30 && daysLeft > 0;
              });
              if (!expiringSoon.length) return null;
              return (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Credits Expiring Soon
                  </p>
                  {expiringSoon.map(tx => {
                    const daysLeft = Math.ceil((new Date(tx.expiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={tx.id} className="flex justify-between items-center bg-white rounded-xl p-3 text-xs font-bold text-amber-800 border border-amber-100">
                        <span className="truncate pr-3">₹{(tx.amount / 100).toFixed(0)} — {tx.reason}</span>
                        <span className="shrink-0 text-[10px] font-extrabold text-amber-600">{daysLeft}d left</span>
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
                          {used && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-medium">Used</span>}
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

        {/* XP Store */}
        {tab === "store" && (
          <div className="p-0">
            <XpStoreClient
              currentXp={storeProps.currentXp}
              activeTypes={storeProps.activeTypes}
              boostExpiry={storeProps.boostExpiry}
              ownedBadges={storeProps.ownedBadges}
              swapUsedThisMonth={storeProps.swapUsedThisMonth}
            />
          </div>
        )}
      </div>

      {/* ── How to Earn ── */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400 mb-4">How to Earn Rewards</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {XP_WAYS.map(({ emoji, label, xp, isOneTime, details }) => (
            <div
              key={label}
              className="flex items-center gap-3.5 rounded-2xl border border-gray-100 bg-gray-50/40 p-4 hover:border-gray-200 hover:bg-white hover:shadow-sm transition-all duration-200"
            >
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
              <span className="text-sm font-black shrink-0" style={{ color: COLOR }}>{xp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Penalty Policy ── */}
      <div className="bg-white rounded-3xl border border-red-100/80 p-5 shadow-sm">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-red-500 mb-3">⚠️ Penalty Policy</p>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          XP can be deducted for behaviors that harm platform integrity. Level status can drop if total XP decreases below threshold bounds.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { emoji: "💳", label: "Chargeback Fraud",  xp: "−100 XP", details: "Illegitimate chargeback filed" },
            { emoji: "⚠️", label: "Abusive Behaviour", xp: "−50 XP",  details: "Confirmed abusive conduct" },
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

      {/* ── Credit Tip ── */}
      <div className="rounded-3xl border border-blue-100 bg-blue-50/40 p-4 flex items-start gap-3 shadow-sm">
        <Gift className="w-5 h-5 mt-0.5 shrink-0" style={{ color: COLOR }} />
        <div>
          <p className="text-sm font-bold text-blue-800">Credits apply automatically at checkout</p>
          <p className="text-xs text-brand-primary/80 mt-0.5 leading-relaxed">
            Available rewards credits are automatically deducted from your next order total. Credits expire after 90 days — use them on upcoming projects!
          </p>
        </div>
      </div>

    </div>
  );
}
