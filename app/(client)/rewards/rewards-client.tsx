"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Level } from "@/lib/rewards";
import { Zap, Gift, Clock, ChevronRight, ShoppingBag, Star, Tag, HeartHandshake } from "lucide-react";

const COLOR = "#0EA5E9";

interface Badge { id: string; badge: string; awardedAt: string; label: string; emoji: string; desc: string; }
interface RewardsData {
  xp: number; level: Level; xpToNext: number; nextLevel: string | null;
  availableCredits: number; progress: Record<string, number>; badges: Badge[];
}
interface XpTx { id: string; amount: number; reason: string; createdAt: string; }
interface CreditTx { id: string; amount: number; reason: string; expiresAt: string | null; usedAt: string | null; createdAt: string; }

const LEVEL_CONFIG: Record<Level, { label: string; color: string; bg: string; border: string; bar: string }> = {
  bronze:   { label: "Bronze",   color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  bar: "bg-amber-500"  },
  silver:   { label: "Silver",   color: "text-slate-600",  bg: "bg-slate-100", border: "border-slate-200",  bar: "bg-slate-400"  },
  gold:     { label: "Gold",     color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200", bar: "bg-yellow-500" },
  platinum: { label: "Platinum", color: "text-sky-700",    bg: "bg-sky-50",    border: "border-sky-200",    bar: "bg-sky-500"    },
};
const LEVEL_START: Record<Level, number> = { bronze: 0, silver: 500, gold: 2000, platinum: 5000 };
const LEVEL_MAX:   Record<Level, number> = { bronze: 500, silver: 2000, gold: 5000, platinum: Infinity };

const PERKS: Record<Level, string[]> = {
  bronze:   ["Standard order matching", "Basic support"],
  silver:   ["2% discount on all orders", "Silver member badge", "Early access to new editors"],
  gold:     ["5% discount on all orders", "Gold member badge", "Priority editor matching", "Dedicated support"],
  platinum: ["10% discount on all orders", "Platinum badge", "Top priority matching", "VIP support", "Exclusive promotions"],
};

const BADGES: Record<string, { label: string; emoji: string; desc: string; xp: number; credit?: string }> = {
  first_order:  { label: "First Order",   emoji: "ðŸ›ï¸", desc: "Place your very first order",  xp: 20 },
  supporter:    { label: "Supporter",     emoji: "ðŸ’ª", desc: "Place 5 orders",                xp: 20 },
  power_client: { label: "Power Client",  emoji: "ðŸ‘‘", desc: "Place 25 orders",               xp: 20, credit: "â‚¹200 at 10th order" },
  top_reviewer: { label: "Top Reviewer",  emoji: "âœï¸", desc: "Leave 10 reviews",              xp: 20 },
  loyal_client: { label: "Loyal Client",  emoji: "â¤ï¸", desc: "Place orders for 3+ months",   xp: 50 },
};
const BADGE_KEYS = ["first_order","supporter","power_client","top_reviewer","loyal_client"];

const XP_WAYS = [
  { icon: ShoppingBag, label: "Place an order",   xp: "+20 XP" },
  { icon: Star,        label: "Leave a review",   xp: "+20 XP" },
  { icon: HeartHandshake, label: "Refer a friend", xp: "â‚¹200 credit" },
  { icon: Tag,         label: "10th order milestone", xp: "â‚¹200 credit" },
];

const XP_LABELS: Record<string, string> = {
  order_placed: "Order placed",
  review_left:  "Review left",
};

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

export function ClientRewardsClient() {
  const [data, setData] = useState<RewardsData | null>(null);
  const [xpHistory, setXpHistory] = useState<XpTx[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"badges" | "history" | "credits">("badges");

  useEffect(() => {
    Promise.all([
      fetch("/api/rewards").then(r => r.json()),
      fetch("/api/rewards/history").then(r => r.json()),
    ]).then(([rd, hd]) => {
      setData(rd);
      setXpHistory(hd.xpHistory ?? []);
      setCreditHistory(hd.creditHistory ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="px-8 py-6 space-y-4 animate-pulse">
      {[180, 120, 320].map(h => <div key={h} className="rounded-2xl bg-gray-100" style={{ height: h }} />)}
    </div>
  );
  if (!data) return <div className="p-8 text-center text-sm text-gray-400">Failed to load rewards.</div>;

  const cfg = LEVEL_CONFIG[data.level];
  const start = LEVEL_START[data.level];
  const max = LEVEL_MAX[data.level];
  const pct = max === Infinity ? 100 : Math.min(100, ((data.xp - start) / (max - start)) * 100);
  const earnedKeys = new Set(data.badges.map(b => b.badge));
  const earnedMap  = Object.fromEntries(data.badges.map(b => [b.badge, b.awardedAt]));
  const levels = ["bronze","silver","gold","platinum"] as Level[];
  const now = new Date();

  return (
    <div className="px-8 py-6 space-y-6">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${COLOR}15` }}>
          <Zap className="w-5 h-5" style={{ color: COLOR }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Member Rewards</h1>
          <p className="text-sm text-gray-400">Earn XP with every order and unlock exclusive member discounts</p>
        </div>
      </div>

      {/* Level card */}
      <div className={cn("rounded-2xl border p-6 space-y-4", cfg.bg, cfg.border)}>
        <div className="flex items-start justify-between">
          <div>
            <span className={cn("text-[11px] font-bold uppercase tracking-widest", cfg.color)}>{cfg.label} Member</span>
            <p className="text-4xl font-bold text-gray-900 mt-1">
              {data.xp.toLocaleString()} <span className="text-lg text-gray-400 font-normal">XP</span>
            </p>
            {data.nextLevel ? (
              <p className="text-xs text-gray-500 mt-1">{data.xpToNext.toLocaleString()} XP to {data.nextLevel.charAt(0).toUpperCase() + data.nextLevel.slice(1)}</p>
            ) : (
              <p className="text-xs font-semibold mt-1" style={{ color: COLOR }}>Maximum level reached!</p>
            )}
          </div>
          {data.availableCredits > 0 && (
            <div className="rounded-xl bg-white border border-green-200 px-4 py-2 text-center shadow-sm">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Available credits</p>
              <p className="text-xl font-bold text-green-600">â‚¹{(data.availableCredits / 100).toFixed(0)}</p>
              <p className="text-[10px] text-gray-400">Apply at checkout</p>
            </div>
          )}
        </div>

        <div className="h-2.5 bg-white/60 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-700", cfg.bar)} style={{ width: `${pct}%` }} />
        </div>

        {/* Level track */}
        <div className="flex items-center gap-1">
          {levels.map((l, i) => {
            const c = LEVEL_CONFIG[l];
            const isActive = l === data.level;
            const isPast = levels.indexOf(data.level) > i;
            return (
              <div key={l} className="flex items-center flex-1">
                <div className={cn(
                  "flex-1 rounded-full px-2 py-1 text-center text-[10px] font-bold",
                  isActive ? cn(c.bg, c.color, "ring-2", c.border) :
                  isPast   ? "bg-gray-100 text-gray-400 line-through" :
                             "bg-gray-50 text-gray-300"
                )}>{c.label}</div>
                {i < 3 && <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* How to earn */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <h2 className="font-semibold text-gray-900 mb-4 text-sm">How to earn rewards</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {XP_WAYS.map(({ icon: Icon, label, xp }) => (
            <div key={label} className="rounded-xl p-3 text-center space-y-2" style={{ background: `${COLOR}08`, border: `1px solid ${COLOR}20` }}>
              <div className="w-8 h-8 rounded-full mx-auto flex items-center justify-center" style={{ background: `${COLOR}15` }}>
                <Icon className="w-4 h-4" style={{ color: COLOR }} />
              </div>
              <p className="text-[11px] text-gray-600 leading-snug">{label}</p>
              <p className="text-xs font-bold" style={{ color: COLOR }}>{xp}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Member perks */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <h2 className="font-semibold text-gray-900 mb-4 text-sm flex items-center gap-2">
          <Tag className="w-4 h-4" style={{ color: COLOR }} /> Member perks by level
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {levels.map((l) => {
            const c = LEVEL_CONFIG[l];
            const isActive = l === data.level;
            const isPast = levels.indexOf(data.level) > levels.indexOf(l);
            return (
              <div key={l} className={cn("rounded-xl border p-3", isActive ? cn(c.bg, c.border, "shadow-sm") : "bg-gray-50 border-gray-100 opacity-50")}>
                <p className={cn("text-xs font-bold mb-2", isActive ? c.color : "text-gray-400")}>{c.label}</p>
                <ul className="space-y-1">
                  {PERKS[l].map(p => (
                    <li key={p} className={cn("text-[11px] flex items-start gap-1", isActive ? "text-gray-700" : "text-gray-400")}>
                      <span className="mt-0.5 shrink-0">{isActive || isPast ? "âœ“" : "Â·"}</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <div className="flex border-b border-gray-100">
          {(["badges","history","credits"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex-1 py-3 text-xs font-semibold transition-colors capitalize",
                tab === t ? "text-gray-900 border-b-2 bg-white" : "text-gray-400 hover:text-gray-600 bg-gray-50"
              )}
              style={tab === t ? { borderColor: COLOR } : {}}
            >
              {t === "badges" ? `Badges (${data.badges.length}/${BADGE_KEYS.length})` : t === "history" ? "XP History" : "Credits"}
            </button>
          ))}
        </div>

        {/* Badges */}
        {tab === "badges" && (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BADGE_KEYS.map(key => {
              const def = BADGES[key];
              const earned = earnedKeys.has(key);
              return (
                <div key={key} className={cn("rounded-xl border p-4 flex flex-col items-center text-center gap-2",
                  earned ? "bg-sky-50 border-sky-200 shadow-sm" : "bg-gray-50 border-gray-100 opacity-50"
                )}>
                  <span className={cn("text-3xl", !earned && "grayscale")}>{def.emoji}</span>
                  <div>
                    <p className={cn("text-xs font-semibold", earned ? "text-gray-800" : "text-gray-400")}>{def.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{def.desc}</p>
                    {def.credit && <p className="text-[10px] text-green-600 mt-1 font-medium">{def.credit}</p>}
                    {earned && earnedMap[key] && <p className="text-[10px] mt-1 font-medium" style={{ color: COLOR }}>{fmtDate(earnedMap[key])}</p>}
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
              <div className="py-12 text-center text-sm text-gray-400">No XP yet â€” place your first order to get started!</div>
            ) : xpHistory.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${COLOR}15` }}>
                    <Zap className="w-3.5 h-3.5" style={{ color: COLOR }} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-800">{XP_LABELS[tx.reason] ?? tx.reason.replace(/_/g, " ")}</p>
                    <p className="text-xs text-gray-400">{timeAgo(tx.createdAt)}</p>
                  </div>
                </div>
                <span className="text-sm font-bold" style={{ color: COLOR }}>+{tx.amount} XP</span>
              </div>
            ))}
          </div>
        )}

        {/* Credits */}
        {tab === "credits" && (
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {creditHistory.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">No credits yet â€” refer a friend or reach order milestones!</div>
            ) : creditHistory.map(tx => {
              const used = !!tx.usedAt;
              const expired = tx.expiresAt && new Date(tx.expiresAt) < now && !used;
              return (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", used || expired ? "bg-gray-100" : "bg-green-100")}>
                      <Gift className={cn("w-3.5 h-3.5", used || expired ? "text-gray-400" : "text-green-600")} />
                    </div>
                    <div>
                      <p className={cn("text-sm", used || expired ? "text-gray-400 line-through" : "text-gray-800")}>{tx.reason}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400">{timeAgo(tx.createdAt)}</p>
                        {!used && !expired && tx.expiresAt && (
                          <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> Expires {fmtDate(tx.expiresAt)}
                          </span>
                        )}
                        {used && <span className="text-[10px] text-gray-400">Used</span>}
                        {expired && <span className="text-[10px] text-red-400">Expired</span>}
                      </div>
                    </div>
                  </div>
                  <span className={cn("text-sm font-bold", used || expired ? "text-gray-300" : "text-green-600")}>
                    â‚¹{(tx.amount / 100).toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Credit tip */}
      <div className="rounded-2xl border p-4 flex items-start gap-3" style={{ background: `${COLOR}08`, borderColor: `${COLOR}25` }}>
        <Gift className="w-5 h-5 mt-0.5 shrink-0" style={{ color: COLOR }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: COLOR }}>Credits apply automatically at checkout</p>
          <p className="text-xs text-gray-500 mt-0.5">Available credits are deducted from your next order total. They expire after 90 days, so use them soon!</p>
        </div>
      </div>

    </div>
  );
}
