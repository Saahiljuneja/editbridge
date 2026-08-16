"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Level } from "@/lib/rewards";
import { Zap, Award, Gift, History, ChevronRight, Clock } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  level: Level;
  xpToNext: number;
  nextLevel: string | null;
  availableCredits: number;
  role: "editor" | "client";
  progress: Record<string, number>;
  badges: Badge[];
}

interface XpTx {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
}

interface CreditTx {
  id: string;
  amount: number;
  reason: string;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<Level, { label: string; color: string; bg: string; border: string; bar: string; hex: string }> = {
  bronze:   { label: "Bronze",   color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",   bar: "bg-amber-500",    hex: "#B45309" },
  silver:   { label: "Silver",   color: "text-slate-600",   bg: "bg-slate-100",   border: "border-slate-200",   bar: "bg-slate-400",    hex: "#475569" },
  gold:     { label: "Gold",     color: "text-yellow-600",  bg: "bg-yellow-50",   border: "border-yellow-200",  bar: "bg-yellow-500",   hex: "#D97706" },
  platinum: { label: "Platinum", color: "text-indigo-700",  bg: "bg-indigo-50",   border: "border-indigo-200",  bar: "bg-indigo-500",   hex: "#4F46E5" },
};

const LEVEL_START: Record<Level, number> = { bronze: 0, silver: 500, gold: 2000, platinum: 5000 };
const LEVEL_MAX:   Record<Level, number> = { bronze: 500, silver: 2000, gold: 5000, platinum: Infinity };

const LEVEL_PERKS: Record<Level, { title: string; perks: string[] }> = {
  bronze:   { title: "Bronze",   perks: ["Standard visibility"] },
  silver:   { title: "Silver",   perks: ["Silver badge", "2% editor discount"] },
  gold:     { title: "Gold",     perks: ["Featured in browse", "5% editor discount"] },
  platinum: { title: "Platinum", perks: ["Top placement", "Custom banner", "10% discount", "Priority support"] },
};

const XP_REASON_LABELS: Record<string, string> = {
  order_completed:           "Order completed",
  order_placed:              "Order completed",   // legacy reason string
  early_delivery:            "Early delivery bonus",
  five_star_review:          "5-star review received",
  review_received:           "Positive review received",
  profile_completed:         "Profile completed",
  review_left:               "Review left",
  repeat_client_bonus:       "Repeat client bonus",
  portfolio_added:           "Portfolio item added",
  qa_answered:               "Answered client question",
  order_streak_5:            "5-order win streak",
  login_streak_7:            "7-day login streak",
  late_delivery_penalty:     "Late delivery",
  order_cancelled_penalty:   "Order cancelled",
  spam_portfolio_penalty:    "Spam portfolio",
  fake_review_penalty:       "Fake review",
  chargeback_fraud_penalty:  "Chargeback fraud",
  abusive_behavior_penalty:  "Abusive behaviour",
};

const ALL_BADGES: Record<string, { label: string; emoji: string; desc: string }> = {
  profile_star:   { label: "Profile Star",   emoji: "⭐", desc: "Completed 100% of your editor profile" },
  first_delivery: { label: "First Delivery", emoji: "🎬", desc: "Completed your very first order" },
  rising_star:    { label: "Rising Star",    emoji: "🌟", desc: "Completed 5 orders" },
  verified_pro:   { label: "Verified Pro",   emoji: "🏆", desc: "Completed 25 orders" },
  top_rated:      { label: "Top Rated",      emoji: "💎", desc: "50+ orders with avg rating ≥ 4.5" },
  speed_demon:    { label: "Speed Demon",    emoji: "⚡", desc: "Delivered 10 orders before the deadline" },
  streak_master:  { label: "Streak Master",  emoji: "🔥", desc: "Completed 5 orders in a single day" },
  early_bird:     { label: "Early Bird",     emoji: "🐦", desc: "One of the first 50 editors on the platform" },
  first_order:    { label: "First Order",    emoji: "🛍️", desc: "Placed your very first order" },
  supporter:      { label: "Supporter",      emoji: "💪", desc: "Placed 5 orders" },
  power_client:   { label: "Power Client",   emoji: "👑", desc: "Placed 25 orders" },
  top_reviewer:   { label: "Top Reviewer",   emoji: "✍️", desc: "Left 10 reviews" },
  loyal_client:   { label: "Loyal Client",   emoji: "❤️", desc: "Placed orders for 3+ months" },
};

const EDITOR_BADGE_KEYS = ["profile_star","first_delivery","rising_star","verified_pro","top_rated","speed_demon","streak_master","early_bird"];
const CLIENT_BADGE_KEYS = ["first_order","supporter","power_client","top_reviewer","loyal_client"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LevelCard({ data }: { data: RewardsData }) {
  const cfg = LEVEL_CONFIG[data.level];
  const start = LEVEL_START[data.level];
  const max   = LEVEL_MAX[data.level];
  const progress = max === Infinity ? 100 : Math.min(100, ((data.xp - start) / (max - start)) * 100);
  const levels: Level[] = ["bronze", "silver", "gold", "platinum"];

  return (
    <div className={cn("rounded-2xl border p-6", cfg.bg, cfg.border)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className={cn("text-xs font-bold uppercase tracking-widest", cfg.color)}>{cfg.label} Level</span>
          <p className="text-4xl font-bold text-gray-900 mt-1">{data.xp.toLocaleString()} <span className="text-lg text-gray-400">XP</span></p>
        </div>
        {data.availableCredits > 0 && (
          <div className="rounded-xl bg-white border border-green-200 px-4 py-2 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Credits</p>
            <p className="text-xl font-bold text-green-600">₹{(data.availableCredits / 100).toFixed(0)}</p>
          </div>
        )}
      </div>

      {/* XP progress bar */}
      <div className="mb-1">
        <div className="h-3 bg-white/60 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-700", cfg.bar)} style={{ width: `${progress}%` }} />
        </div>
      </div>
      {data.nextLevel ? (
        <p className="text-xs text-gray-500">{data.xpToNext.toLocaleString()} XP to {data.nextLevel.charAt(0).toUpperCase() + data.nextLevel.slice(1)}</p>
      ) : (
        <p className="text-xs font-semibold" style={{ color: cfg.hex }}>Maximum level reached!</p>
      )}

      {/* Level track */}
      <div className="overflow-x-auto mt-5 pb-0.5">
        <div className="flex items-center gap-1 min-w-max">
          {levels.map((l, i) => {
            const c = LEVEL_CONFIG[l];
            const isActive = l === data.level;
            const isPast = levels.indexOf(data.level) > i;
            return (
              <div key={l} className="flex items-center">
                <div className={cn(
                  "rounded-full px-2.5 py-1 text-center text-[10px] font-bold transition-all whitespace-nowrap",
                  isActive ? cn(c.bg, c.color, "ring-2", c.border, "shadow-sm") :
                  isPast   ? "bg-gray-100 text-gray-400 line-through" :
                             "bg-gray-50 text-gray-300"
                )}>
                  {c.label}
                </div>
                {i < levels.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300 shrink-0 mx-0.5" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PerksCard({ level }: { level: Level }) {
  const levels: Level[] = ["bronze", "silver", "gold", "platinum"];
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4 text-yellow-500" /> Level perks
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {levels.map((l) => {
          const cfg = LEVEL_CONFIG[l];
          const perkDef = LEVEL_PERKS[l];
          const isActive = l === level;
          const isPast = levels.indexOf(level) > levels.indexOf(l);
          return (
            <div key={l} className={cn(
              "rounded-xl border p-3 transition-all",
              isActive ? cn(cfg.bg, cfg.border, "shadow-sm ring-1", cfg.border) :
              isPast   ? "bg-gray-50 border-gray-100 opacity-60" :
                         "bg-gray-50 border-gray-100 opacity-40"
            )}>
              <p className={cn("text-xs font-bold mb-2", isActive ? cfg.color : "text-gray-400")}>{perkDef.title}</p>
              <ul className="space-y-1">
                {perkDef.perks.map((p) => (
                  <li key={p} className={cn("text-[11px] flex items-start gap-1", isActive ? "text-gray-700" : "text-gray-400")}>
                    <span className="mt-0.5 shrink-0">{isActive || isPast ? "✓" : "·"}</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BadgesGrid({ data }: { data: RewardsData }) {
  const badgeKeys = data.role === "editor" ? EDITOR_BADGE_KEYS : CLIENT_BADGE_KEYS;
  const earnedKeys = new Set(data.badges.map(b => b.badge));
  const earnedMap = Object.fromEntries(data.badges.map(b => [b.badge, b.awardedAt]));

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Award className={cn("w-4 h-4", data.role === "editor" ? "text-violet-500" : "text-brand-primary")} />
        Badges <span className="text-xs text-gray-400 font-normal ml-1">{data.badges.length}/{badgeKeys.length} earned</span>
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {badgeKeys.map((key) => {
          const def = ALL_BADGES[key];
          const earned = earnedKeys.has(key);
          return (
            <div key={key} className={cn(
              "rounded-xl border p-3 flex flex-col items-center text-center gap-2 transition-all",
              earned ? "bg-green-50 border-green-200 shadow-sm" : "bg-gray-50 border-gray-100 opacity-50"
            )}>
              <span className={cn("text-3xl", !earned && "grayscale")}>{def.emoji}</span>
              <div>
                <p className={cn("text-xs font-semibold", earned ? "text-gray-800" : "text-gray-400")}>{def.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{def.desc}</p>
                {earned && earnedMap[key] && (
                  <p className="text-[10px] text-green-600 mt-1 font-medium">{formatDate(earnedMap[key])}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryPanel({ xpHistory, creditHistory }: { xpHistory: XpTx[]; creditHistory: CreditTx[] }) {
  const [tab, setTab] = useState<"xp" | "credits">("xp");
  const now = new Date();

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <div className="flex border-b border-gray-100">
        {(["xp", "credits"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2",
              tab === t ? "text-gray-900 border-b-2 border-gray-900 bg-white" : "text-gray-400 hover:text-gray-600 bg-gray-50"
            )}
          >
            {t === "xp" ? <><Zap className="w-3.5 h-3.5" /> XP History</> : <><Gift className="w-3.5 h-3.5" /> Credits</>}
          </button>
        ))}
      </div>

      <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
        {tab === "xp" ? (
          xpHistory.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No XP earned yet. Complete actions to earn XP!</div>
          ) : (
            xpHistory.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                    <Zap className="w-3.5 h-3.5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-800">{XP_REASON_LABELS[tx.reason] ?? tx.reason.replace(/_/g, " ")}</p>
                    <p className="text-xs text-gray-400">{timeAgo(tx.createdAt)}</p>
                  </div>
                </div>
                <span className={cn("text-sm font-bold", tx.amount < 0 ? "text-red-600" : "text-yellow-600")}>
                  {tx.amount < 0 ? tx.amount : `+${tx.amount}`} XP
                </span>
              </div>
            ))
          )
        ) : (
          creditHistory.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No credits yet. Earn them through milestones and referrals!</div>
          ) : (
            creditHistory.map(tx => {
              const isUsed = !!tx.usedAt;
              const isExpired = tx.expiresAt && new Date(tx.expiresAt) < now && !isUsed;
              return (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      isUsed || isExpired ? "bg-gray-100" : "bg-green-100"
                    )}>
                      <Gift className={cn("w-3.5 h-3.5", isUsed || isExpired ? "text-gray-400" : "text-green-600")} />
                    </div>
                    <div>
                      <p className={cn("text-sm", isUsed || isExpired ? "text-gray-400 line-through" : "text-gray-800")}>{tx.reason}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400">{timeAgo(tx.createdAt)}</p>
                        {!isUsed && !isExpired && tx.expiresAt && (
                          <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> Expires {formatDate(tx.expiresAt)}
                          </span>
                        )}
                        {isUsed && <span className="text-[10px] text-gray-400">Used</span>}
                        {isExpired && <span className="text-[10px] text-red-400">Expired</span>}
                      </div>
                    </div>
                  </div>
                  <span className={cn("text-sm font-bold", isUsed || isExpired ? "text-gray-300" : "text-green-600")}>
                    ₹{(tx.amount / 100).toFixed(0)}
                  </span>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function RewardsPage() {
  const [data, setData] = useState<RewardsData | null>(null);
  const [history, setHistory] = useState<{ xpHistory: XpTx[]; creditHistory: CreditTx[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/rewards").then(r => r.json()),
      fetch("/api/rewards/history").then(r => r.json()),
    ]).then(([rewardsData, historyData]) => {
      setData(rewardsData);
      setHistory(historyData);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4 animate-pulse">
        <div className="h-40 rounded-2xl bg-gray-100" />
        <div className="h-48 rounded-2xl bg-gray-100" />
        <div className="h-64 rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (!data || !history) {
    return <div className="p-8 text-center text-sm text-gray-400">Failed to load rewards.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-yellow-50 border border-yellow-200 flex items-center justify-center">
          <Zap className="w-5 h-5 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Rewards & XP</h1>
          <p className="text-sm text-gray-400">Track your progress, badges, and credits</p>
        </div>
      </div>

      {/* Level card */}
      <LevelCard data={data} />

      {/* Perks table */}
      <PerksCard level={data.level} />

      {/* Badges grid */}
      <BadgesGrid data={data} />

      {/* How to earn XP */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" /> How to earn XP
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { emoji: "🎬", label: "Order completed",      xp: "+20 XP",  note: "Earned when delivery is approved" },
            { emoji: "✍️", label: "Leave a review",       xp: "+20 XP",  note: "1 per order · only after payment released" },
            { emoji: "🤝", label: "Repeat client bonus",  xp: "+30 XP",  note: "3rd completed order with same editor" },
            { emoji: "📅", label: "7-day login streak",   xp: "+25 XP",  note: "Log in 7 days in a row · also for editors" },
          ].map(({ emoji, label, xp, note }) => (
            <div key={label} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{emoji}</span>
                <p className="text-xs font-semibold text-gray-800 leading-snug">{label}</p>
              </div>
              <p className="text-[10px] text-gray-400 leading-snug">{note}</p>
              <span className="text-sm font-black text-[var(--brand-client)]">{xp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-gray-400" /> Activity history
        </h2>
        <HistoryPanel xpHistory={history.xpHistory} creditHistory={history.creditHistory} />
      </div>
    </div>
  );
}
