"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Level } from "@/lib/rewards";
import { Zap, Gift, Clock, ShoppingBag, Star, Tag, HeartHandshake, CheckCircle2, ChevronRight, Store } from "lucide-react";

const COLOR = "var(--brand-client)";

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
  bronze:   { label: "Bronze",   emoji: "🥉", tagline: "Standard Member",    accent: "#D97706", ring: "#F59E0B", glow: "rgba(245,158,11,0.06)",   textClass: "text-amber-600",  bgGradient: "from-amber-500/10 to-orange-500/5",    border: "border-amber-500/20",   start: 0,     end: 500   },
  silver:   { label: "Silver",   emoji: "🥈", tagline: "Building momentum",  accent: "#6B7280", ring: "#9CA3AF", glow: "rgba(156,163,175,0.06)",  textClass: "text-slate-600",  bgGradient: "from-slate-400/15 to-gray-500/5",      border: "border-slate-400/25",   start: 500,   end: 2000  },
  gold:     { label: "Gold",     emoji: "🥇", tagline: "Top Supporter",      accent: "#B45309", ring: "#EAB308", glow: "rgba(234,179,8,0.08)",    textClass: "text-yellow-600", bgGradient: "from-yellow-500/15 to-amber-500/5",    border: "border-yellow-500/25",  start: 2000,  end: 5000  },
  platinum: { label: "Platinum", emoji: "💎", tagline: "Elite Status",       accent: "#4F46E5", ring: "#818CF8", glow: "rgba(129,140,248,0.1)",   textClass: "text-indigo-600", bgGradient: "from-indigo-500/15 to-purple-600/5",   border: "border-indigo-500/25",  start: 5000,  end: 10000 },
  diamond:  { label: "Diamond",  emoji: "💠", tagline: "Crystal Tier",       accent: "#0891B2", ring: "#22D3EE", glow: "rgba(34,211,238,0.1)",    textClass: "text-cyan-600",   bgGradient: "from-cyan-500/15 to-sky-500/5",        border: "border-cyan-500/25",    start: 10000, end: 25000 },
  master:   { label: "Master",   emoji: "👑", tagline: "Prestige Rank",      accent: "#9333EA", ring: "#C084FC", glow: "rgba(192,132,252,0.12)",  textClass: "text-purple-600", bgGradient: "from-purple-500/20 to-violet-600/10",  border: "border-purple-500/30",  start: 25000, end: 50000 },
  legend:   { label: "Legend",   emoji: "🔥", tagline: "Mythic Status",      accent: "#DC2626", ring: "#F97316", glow: "rgba(249,115,22,0.14)",   textClass: "text-orange-700", bgGradient: "from-orange-500/20 to-red-600/10",     border: "border-orange-500/30",  start: 50000, end: Infinity },
};

const LEVEL_ORDER: Level[] = ["bronze", "silver", "gold", "platinum", "diamond", "master", "legend"];
const LEVEL_XP_LABELS = ["0", "500", "2k", "5k", "10k", "25k", "50k+"];

const PERKS: Record<Level, Array<{ icon: string; text: string }>> = {
  bronze:   [{ icon: "👥", text: "Standard matching" },  { icon: "🎧", text: "Basic support" }],
  silver:   [{ icon: "🏷️", text: "2% off orders" },      { icon: "🎗️", text: "Silver badge" },       { icon: "⚡", text: "Early editor access" }],
  gold:     [{ icon: "🏷️", text: "5% off orders" },      { icon: "👑", text: "Gold badge" },          { icon: "🎯", text: "Priority matching" },      { icon: "📞", text: "Dedicated support" }],
  platinum: [{ icon: "🏷️", text: "10% off orders" },     { icon: "💎", text: "Platinum badge" },      { icon: "🔥", text: "Top priority matching" },  { icon: "🤝", text: "VIP support" }],
  diamond:  [{ icon: "🏷️", text: "15% off orders" },     { icon: "💠", text: "Diamond badge" },       { icon: "🚀", text: "Premium matching" },       { icon: "🤝", text: "VIP support" },        { icon: "🎁", text: "Exclusive promos" }],
  master:   [{ icon: "🏷️", text: "20% off orders" },     { icon: "👑", text: "Master badge" },        { icon: "⭐", text: "Top-10 editor access" },   { icon: "🤝", text: "VIP support" },        { icon: "🎁", text: "Exclusive promos" }],
  legend:   [{ icon: "🏷️", text: "25% off orders" },     { icon: "🔥", text: "Legend badge" },        { icon: "🌟", text: "Top-3 editor access" },   { icon: "📞", text: "Account manager" },    { icon: "🎁", text: "Exclusive promos" }],
};

const BADGES: Record<string, { label: string; emoji: string; desc: string; hint: string; credit?: string }> = {
  first_order:  { label: "First Order",   emoji: "📦", desc: "Place your very first order",  hint: "Order a video edit project on EditBridge", },
  supporter:    { label: "Supporter",     emoji: "💪", desc: "Place 5 orders",                hint: "5 successful video orders completed", },
  power_client: { label: "Power Client",  emoji: "👑", desc: "Place 25 orders",               hint: "25 successful video orders completed", credit: "₹200 credit at 10th order" },
  top_reviewer: { label: "Top Reviewer",  emoji: "✍️", desc: "Leave 10 reviews",              hint: "Submit reviews for 10 finished projects", },
  loyal_client: { label: "Loyal Client",  emoji: "❤️", desc: "Place orders for 3+ months",   hint: "Place orders across 3 distinct calendar months", },
};
const BADGE_KEYS = ["first_order","supporter","power_client","top_reviewer","loyal_client"];

const XP_WAYS = [
  { emoji: "🛍️", label: "Place an Order",       xp: "+20 XP",      isOneTime: false, details: "Earn on every order placed" },
  { emoji: "✍️", label: "Leave a Review",        xp: "+20 XP",      isOneTime: false, details: "Earn on every review submitted" },
  { emoji: "🤝", label: "Repeat Editor Bonus",   xp: "+30 XP",      isOneTime: false, details: "3rd order with the same editor" },
  { emoji: "📅", label: "7-Day Login Streak",    xp: "+25 XP",      isOneTime: false, details: "Log in 7 days in a row · resets daily" },
  { emoji: "🎁", label: "Refer a Friend",        xp: "₹200 Credit", isOneTime: false, details: "When referred user orders" },
  { emoji: "🎫", label: "10th Order Milestone",  xp: "₹200 Credit", isOneTime: true,  details: "One-time milestone reward" },
];

const XP_LABELS: Record<string, { label: string; penalty?: true }> = {
  order_placed:                      { label: "Order placed" },
  review_left:                       { label: "Review left" },
  repeat_client_bonus:               { label: "Repeat editor bonus" },
  login_streak_7:                    { label: "7-day login streak" },
  // ── XP Store purchases ──
  client_store_priority_match:       { label: "Priority Match activated" },
  client_store_vip_support:          { label: "VIP Support activated" },
  client_store_rush_flag:            { label: "Rush Flag used" },
  client_store_extra_revision:       { label: "Extra Revision token used" },
  client_store_xp_credit_swap:       { label: "XP converted to credit" },
  // ── Patron badges ──
  patron_badge_patron_bronze:        { label: "Patron Bronze badge unlocked" },
  patron_badge_patron_silver:        { label: "Patron Silver badge unlocked" },
  patron_badge_patron_gold:          { label: "Patron Gold badge unlocked" },
  patron_badge_patron_diamond:       { label: "Patron Diamond badge unlocked" },
  // ── Penalties ──
  chargeback_fraud_penalty:          { label: "Chargeback fraud",    penalty: true },
  abusive_behavior_penalty:          { label: "Abusive behaviour",   penalty: true },
};

function getBadgeProgress(key: string, progress: Record<string, number>): { current: number; target: number } | null {
  const c = progress.placedOrders ?? 0;
  const reviewsCount = progress.reviewsLeft ?? 0;
  const monthsActive = progress.monthsActive ?? 0;

  if (key === "first_order") return c >= 1 ? null : { current: c, target: 1 };
  if (key === "supporter") return c >= 5 ? null : { current: c, target: 5 };
  if (key === "power_client") return c >= 25 ? null : { current: c, target: 25 };
  if (key === "top_reviewer") return reviewsCount >= 10 ? null : { current: reviewsCount, target: 10 };
  if (key === "loyal_client") return monthsActive >= 3 ? null : { current: monthsActive, target: 3 };
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
const RING_C = +(2 * Math.PI * RING_R).toFixed(2); // 439.82

export function ClientRewardsClient() {
  const [data, setData] = useState<RewardsData | null>(null);
  const [xpHistory, setXpHistory] = useState<XpTx[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"badges" | "history" | "credits">("badges");
  const [ringReady, setRingReady] = useState(false);
  const [plannedBudget, setPlannedBudget] = useState(10000);
  const [monthlySpend, setMonthlySpend] = useState(20000);

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
    <div className="px-8 py-6 space-y-6">
      <div className="h-8 w-32 rounded-xl bg-gray-100 animate-pulse" />
      <div className="h-56 rounded-2xl bg-gray-100 animate-pulse" />
      <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
      <div className="h-72 rounded-2xl bg-gray-100 animate-pulse" />
    </div>
  );

  if (!data) return <div className="p-8 text-center text-sm text-gray-400">Failed to load rewards.</div>;

  const lm = LM[data.level];
  const pct = lm.end === Infinity ? 100 : Math.min(100, ((data.xp - lm.start) / (lm.end - lm.start)) * 100);
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
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Client Workspace</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-none">Rewards Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          {data.availableCredits > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 shadow-sm">
              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Available Credits</span>
              <span className="text-sm font-extrabold text-emerald-700">
                ₹{(data.availableCredits / 100).toFixed(0)}
              </span>
            </div>
          )}
          <Link
            href="/client/xp-store"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-100 hover:bg-sky-100 transition-all shadow-sm font-medium"
          >
            <Store className="w-4 h-4 text-sky-500" />
            <span className="text-xs text-sky-600">XP Store</span>
          </Link>
        </div>
      </div>

      {/* Level Hero card */}
      <div
        className="rounded-2xl border overflow-hidden bg-white shadow-md relative"
        style={{ borderColor: `${lm.ring}35` }}
      >
        {/* Top Accent Gradient Line */}
        <div className="h-[4px]" style={{ background: `linear-gradient(90deg, ${lm.ring}, ${lm.accent})` }} />

        <div className="p-6 flex flex-col md:flex-row items-center gap-8"
          style={{ background: `linear-gradient(135deg, ${lm.glow}, transparent)` }}>

          {/* Glowing XP circle ring */}
          <div className="relative w-40 h-40 shrink-0 select-none">
            <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_0_12px_rgba(217,119,6,0.15)]" style={{ transform: "rotate(-90deg)" }}>
              {/* track */}
              <circle cx="80" cy="80" r={RING_R} fill="none"
                stroke="currentColor" strokeWidth="10"
                className="text-gray-100" />
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
              <span className="text-2xl font-black leading-none tabular-nums text-gray-900">
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
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{lm.label} Member</h2>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white"
                  style={{ background: lm.accent }}
                >
                  {lm.tagline}
                </span>
              </div>
              {data.nextLevel ? (
                <p className="text-sm text-gray-500 mt-1">
                  💡 Earn <span className="font-bold text-gray-800">{data.xpToNext.toLocaleString()} XP</span> more to reach {LM[data.nextLevel as Level].label} Status
                </p>
              ) : (
                <p className="text-sm font-semibold mt-1 text-indigo-600">
                  🎉 Maximum member tier achieved! Thank you for your support.
                </p>
              )}
            </div>

            {/* Current perks tags */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Perks</p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {PERKS[data.level].map(p => (
                  <span
                    key={p.text}
                    className="text-[11px] flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-gray-100 text-gray-700 backdrop-blur-sm shadow-sm font-medium"
                  >
                    <span className="text-[12px]">{p.icon}</span>
                    <span>{p.text}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Level Journey Timeline Step Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 px-5 py-5 shadow-sm overflow-hidden">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-5">Journey Map</p>
        <div className="overflow-x-auto pb-1">
          <div className="relative flex items-center justify-between min-w-[560px]">
            {/* Timeline Connector Line */}
            <div className="absolute left-[3%] right-[3%] h-[3px] bg-gray-100 rounded-full" />
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
                      background: isCompleted ? `${m.ring}15` : isCurrent ? m.glow : "#fff",
                      borderColor: isCurrent ? m.ring : isCompleted ? `${m.ring}60` : "rgba(229,231,235,0.8)",
                      boxShadow: isCurrent ? `0 0 0 4px ${m.ring}25` : undefined,
                    }}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" style={{ color: m.ring }} /> : m.emoji}
                  </div>
                  <p className={`mt-1.5 text-[10px] font-bold ${isCurrent ? m.textClass : "text-gray-500"}`}>
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
        <div className="rounded-2xl border border-dashed border-gray-200 p-4 bg-gray-50/50">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{LM[data.nextLevel as Level].emoji}</span>
            <p className="text-xs font-semibold text-gray-500">
              Next Tier Unlock:{" "}
              <span className="text-gray-800 font-bold">
                {LM[data.nextLevel as Level].label} perks
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERKS[data.nextLevel as Level].map(p => (
              <span
                key={p.text}
                className="text-[11px] flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-400 font-medium"
              >
                <span className="text-[12px]">{p.icon}</span>
                {p.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Loyalty Calculator & Tier Simulator */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Simulator Slider */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">XP & Milestone Simulator</p>
            <h3 className="text-sm font-bold text-gray-900">Estimate your next project</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-700">
                <span>Planned Order Budget</span>
                <span className="text-indigo-650" style={{ color: COLOR }}>₹{plannedBudget.toLocaleString()}</span>
              </div>
              <input 
                type="range" 
                min="1000" 
                max="50000" 
                step="1000" 
                value={plannedBudget} 
                onChange={(e) => setPlannedBudget(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                style={{ accentColor: COLOR }}
              />
              <div className="flex justify-between text-[9px] font-bold text-gray-400">
                <span>₹1,000</span>
                <span>₹50,000</span>
              </div>
            </div>

            {/* Calculations Output */}
            <div className="bg-indigo-50/30 rounded-2xl p-4 border border-indigo-100/30 text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Instant Discount Savings</p>
              <p className="text-xl font-black text-green-600 mt-0.5">
                ₹{Math.floor(plannedBudget * (data.level === "legend" ? 0.25 : data.level === "master" ? 0.20 : data.level === "diamond" ? 0.15 : data.level === "platinum" ? 0.10 : data.level === "gold" ? 0.05 : data.level === "silver" ? 0.02 : 0)).toLocaleString()}
              </p>
              <p className="text-[9px] text-gray-400 leading-none mt-0.5">({LM[data.level].label} discount applied)</p>
            </div>
            <p className="text-[10px] text-gray-400 text-center">
              +20 XP per order placed — fixed regardless of order size
            </p>

            {/* Simulated Tier status progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-gray-550">
                <span>Simulated XP Progress</span>
                <span>{(data.xp + 20).toLocaleString()} XP</span>
              </div>
              <div className="h-2 bg-gray-105 rounded-full overflow-hidden p-0.5 border">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-indigo-550 to-purple-550 transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, (((data.xp + 20) - lm.start) / ((lm.end === Infinity ? 5000 : lm.end) - lm.start)) * 100)}%`,
                    background: `linear-gradient(90deg, ${COLOR}, #818CF8)`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tier Benefits Comparison */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Benefits Chart</p>
              <h3 className="text-sm font-bold text-gray-900">Interactive Savings Simulator</h3>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-gray-405 uppercase tracking-wide">Monthly Spend</p>
              <p className="text-sm font-extrabold text-indigo-650" style={{ color: COLOR }}>₹{monthlySpend.toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-3.5">
            <input 
              type="range" 
              min="5000" 
              max="100000" 
              step="5000" 
              value={monthlySpend} 
              onChange={(e) => setMonthlySpend(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-105 rounded-lg appearance-none cursor-pointer accent-indigo-650"
              style={{ accentColor: COLOR }}
            />

            {/* Savings Comparisons */}
            <div className="space-y-1.5">
              {[
                { label: "Bronze (0%)",    level: "bronze",   savings: 0,                                    color: "text-amber-600 bg-amber-50 border-amber-200/50" },
                { label: "Silver (2%)",    level: "silver",   savings: Math.floor(monthlySpend * 0.02),      color: "text-slate-600 bg-slate-50 border-slate-200/50" },
                { label: "Gold (5%)",      level: "gold",     savings: Math.floor(monthlySpend * 0.05),      color: "text-yellow-600 bg-yellow-50 border-yellow-200/50" },
                { label: "Platinum (10%)", level: "platinum", savings: Math.floor(monthlySpend * 0.10),      color: "text-indigo-600 bg-indigo-50 border-indigo-200/50" },
                { label: "Diamond (15%)",  level: "diamond",  savings: Math.floor(monthlySpend * 0.15),      color: "text-cyan-600 bg-cyan-50 border-cyan-200/50" },
                { label: "Master (20%)",   level: "master",   savings: Math.floor(monthlySpend * 0.20),      color: "text-purple-600 bg-purple-50 border-purple-200/50" },
                { label: "Legend (25%)",   level: "legend",   savings: Math.floor(monthlySpend * 0.25),      color: "text-orange-600 bg-orange-50 border-orange-200/50" },
              ].map((tier) => {
                const isCurrentTier = tier.level === data.level;
                return (
                  <div key={tier.label} className={cn(
                    "flex justify-between items-center p-2.5 rounded-xl border text-xs font-semibold",
                    isCurrentTier ? "ring-2 ring-indigo-500/20 bg-indigo-50/10 border-indigo-200" : "bg-gray-50/30 border-gray-100"
                  )}
                  style={isCurrentTier ? { borderColor: `${COLOR}40`, boxShadow: `0 0 0 4px ${COLOR}15` } : {}}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded-full", tier.color)}>
                        {tier.label}
                      </span>
                      {isCurrentTier && <span className="text-[9px] font-extrabold uppercase" style={{ color: COLOR }}>(Current)</span>}
                    </div>
                    <span className="font-extrabold text-green-600">₹{tier.savings.toLocaleString()} saved / mo</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Tabs list container */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        
        {/* Custom Tab Selector Pills */}
        <div className="flex border-b border-gray-100 bg-gray-50/50 p-1.5 gap-1.5 overflow-x-auto">
          {([
            { key: "badges"      as const, label: `Badges · ${data.badges.length}/${BADGE_KEYS.length}` },
            { key: "history"     as const, label: "XP History" },
            { key: "credits"     as const, label: "Credits" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 min-w-max py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                tab === key
                  ? "text-gray-900 bg-white shadow-sm"
                  : "text-gray-400 hover:text-gray-600 hover:bg-white/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Badges Tab */}
        {tab === "badges" && (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-4">
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
                      ? "bg-white border-gray-200 shadow-sm"
                      : "bg-gray-50/50 border-gray-100/80 opacity-60"
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
                      <p className={`text-xs font-bold leading-tight ${earned ? "text-gray-800" : "text-gray-400"}`}>
                        {def.label}
                      </p>
                      <p className={`text-[10px] leading-snug mt-0.5 ${earned ? "text-gray-400" : "text-gray-400"}`}>
                        {def.desc}
                      </p>
                      {def.hint && !earned && (
                        <p className="text-[9px] text-gray-400 border-t border-dashed mt-1.5 pt-1.5 leading-tight italic">
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
                      <p className="text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-650 px-2 py-0.5 rounded-full inline-block">
                        {fmtDate(date)}
                      </p>
                    ) : prog ? (
                      <div className="w-full space-y-1">
                        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500"
                            style={{ width: `${Math.min(100, (prog.current / prog.target) * 100)}%` }}
                          />
                        </div>
                        <p className="text-[9px] font-bold text-gray-400 tabular-nums">
                          {prog.current} / {prog.target}
                        </p>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-300 font-semibold">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* XP History Tab */}
        {tab === "history" && (
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {xpHistory.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400 space-y-2">
                <Zap className="w-8 h-8 mx-auto opacity-10" />
                <p>No XP history yet — place an order to get started!</p>
              </div>
            ) : xpHistory.map(tx => {
              const entry = XP_LABELS[tx.reason];
              const isPenalty = entry?.penalty;
              return (
                <div key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                      isPenalty ? "bg-red-50" : ""
                    )} style={isPenalty ? {} : { background: `${COLOR}10` }}>
                      <Zap className="w-4 h-4" style={{ color: isPenalty ? "#DC2626" : COLOR }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {entry?.label ?? tx.reason.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-gray-400">{timeAgo(tx.createdAt)}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-sm font-extrabold tabular-nums",
                    tx.amount < 0 ? "text-red-600" : ""
                  )} style={tx.amount >= 0 ? { color: COLOR } : {}}>
                    {tx.amount < 0 ? tx.amount : `+${tx.amount}`} XP
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Credits Tab */}
        {tab === "credits" && (
          <div className="space-y-4 p-4">
            
            {/* Credit Alerts Timeline */}
            {(() => {
              const expiringSoon = creditHistory.filter(tx => {
                const used = !!tx.usedAt;
                const expired = tx.expiresAt && new Date(tx.expiresAt) < now && !used;
                if (used || expired || !tx.expiresAt) return false;
                const daysLeft = Math.ceil((new Date(tx.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return daysLeft <= 30 && daysLeft > 0;
              });

              if (expiringSoon.length === 0) return null;

              return (
                <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4 space-y-2 shadow-sm">
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
                    ⚠️ Credits Expiring Soon
                  </p>
                  <div className="space-y-1.5">
                    {expiringSoon.map(tx => {
                      const daysLeft = Math.ceil((new Date(tx.expiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={tx.id} className="flex justify-between items-center bg-white border border-amber-200/40 rounded-xl p-2.5 text-xs font-bold text-amber-900 shadow-sm">
                          <span className="truncate pr-3">₹{(tx.amount / 100).toFixed(0)} Credit ({tx.reason})</span>
                          <span className="shrink-0 bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            expiring in {daysLeft} days
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto border rounded-2xl bg-white">
              {creditHistory.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-400 space-y-2">
                  <Gift className="w-8 h-8 mx-auto opacity-10" />
                  <p>No credit transactions recorded.</p>
                </div>
              ) : creditHistory.map(tx => {
              const used    = !!tx.usedAt;
              const expired = !!(tx.expiresAt && new Date(tx.expiresAt) < now && !used);
              return (
                <div key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", 
                      used || expired ? "bg-gray-100" : "bg-emerald-50"
                    )}>
                      <Gift className={cn("w-4 h-4", used || expired ? "text-gray-400" : "text-emerald-600")} />
                    </div>
                    <div>
                      <p className={cn("text-sm font-semibold", used || expired ? "text-gray-400 line-through" : "text-gray-800")}>
                        {tx.reason}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400">{timeAgo(tx.createdAt)}</p>
                        {!used && !expired && tx.expiresAt && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-0.5 font-medium">
                            <Clock className="w-2.5 h-2.5" /> Expires {fmtDate(tx.expiresAt)}
                          </span>
                        )}
                        {used && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-medium">Used</span>}
                        {expired && <span className="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-md font-medium">Expired</span>}
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
          </div>
        )}
      </div>

      {/* How to earn */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <h2 className="font-semibold text-gray-900 mb-4 text-sm tracking-tight">How to earn rewards</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {XP_WAYS.map(({ emoji, label, xp, isOneTime, details }) => (
            <div key={label} className="rounded-2xl p-4 text-center space-y-2.5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 bg-gradient-to-b from-gray-50/50 to-white border border-gray-100 flex flex-col justify-between items-center">
              <div className="space-y-2.5 w-full flex flex-col items-center">
                <span className="text-3xl block filter drop-shadow-sm">{emoji}</span>
                <div>
                  <p className="text-xs font-bold text-gray-700 leading-snug">{label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{details}</p>
                </div>
              </div>
              <div className="space-y-1.5 w-full mt-2">
                <span className={cn(
                  "text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block",
                  isOneTime ? "bg-amber-50 text-amber-600 border border-amber-200/50" : "bg-emerald-50 text-emerald-600 border border-emerald-200/50"
                )}>
                  {isOneTime ? "One-time" : "Regular"}
                </span>
                <p className="text-xs font-black block" style={{ color: COLOR }}>{xp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Penalties */}
      <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">⚠️</span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">Platform Penalties</p>
        </div>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          XP can be deducted for behaviour that harms the platform. Level can drop if total XP falls below the current tier threshold.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
          {[
            { emoji: "💳", label: "Chargeback Fraud",  xp: "−100 XP", details: "Illegitimate chargeback filed" },
            { emoji: "⚠️", label: "Abusive Behaviour",  xp: "−50 XP",  details: "Confirmed abusive conduct" },
          ].map(({ emoji, label, xp, details }) => (
            <div
              key={label}
              className="rounded-2xl p-4 text-center space-y-2.5 bg-red-50/40 border border-red-100 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 flex flex-col justify-between items-center"
            >
              <div className="space-y-2.5 w-full flex flex-col items-center">
                <span className="text-3xl block">{emoji}</span>
                <div>
                  <p className="text-xs font-bold text-gray-700 leading-snug">{label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{details}</p>
                </div>
              </div>
              <p className="text-xs font-black text-red-600 mt-2">{xp}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Credit tip */}
      <div className="rounded-2xl border p-4.5 flex items-start gap-3 bg-indigo-50/50 border-indigo-100/80 shadow-sm">
        <Gift className="w-5.5 h-5.5 mt-0.5 shrink-0 text-indigo-650" />
        <div>
          <p className="text-sm font-bold text-indigo-950">Credits apply automatically at checkout</p>
          <p className="text-xs text-indigo-800/85 mt-1 leading-relaxed">Available rewards credits are automatically deducted from your next order total. Credits expire after 90 days of issue, so verify and use them on your upcoming projects!</p>
        </div>
      </div>

    </div>
  );
}
