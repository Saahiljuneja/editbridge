"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap, CheckCircle2, Clock, AlertCircle, Lock,
  Sparkles, RefreshCw, Gift, ArrowLeft, Info,
  Search, Shield, Star, Award, UserCheck, Flame, Plus,
  ChevronRight, Compass, Settings, Check, HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CLIENT_STORE_ITEMS, PATRON_BADGES } from "@/lib/client-xp-store-config";
import type { ClientItemType, PatronBadgeKey, ClientStoreItem } from "@/lib/client-xp-store-config";

const ACCENT = "#4f46e5"; // Indigo theme for premium client portal feel

const CLIENT_LEVELS = [
  { name: "bronze",   min: 0,    max: 499,     label: "Bronze",   emoji: "🥉", target: 500   },
  { name: "silver",   min: 500,  max: 1999,    label: "Silver",   emoji: "🥈", target: 2000  },
  { name: "gold",     min: 2000, max: 4999,    label: "Gold",     emoji: "🥇", target: 5000  },
  { name: "platinum", min: 5000, max: Infinity, label: "Platinum", emoji: "💎", target: Infinity },
];

interface Props {
  currentXp:          number;
  totalXp:            number;
  activeTypes:        string[];
  boostExpiry:        Record<string, string | null>;
  ownedBadges:        string[];
  swapUsedThisMonth:  number;
}

function fmtExpiry(iso: string | null | undefined) {
  if (!iso) return null;
  return `Expires ${new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

export function XpStoreClient({
  currentXp,
  totalXp,
  activeTypes,
  boostExpiry,
  ownedBadges,
  swapUsedThisMonth,
}: Props) {
  const router = useRouter();
  const [xp, setXp]         = useState(currentXp);
  const [active, setActive] = useState(new Set(activeTypes));
  const [expiry, setExpiry] = useState<Record<string, string | null>>(boostExpiry);
  const [owned, setOwned]   = useState(new Set(ownedBadges));
  const [buying, setBuying] = useState<string | null>(null);
  const [toast, setToast]   = useState<{ msg: string; ok: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<"featured" | "credits" | "hiring" | "workflow" | "vip" | "experiences" | "referrals">("featured");

  // Calculate client level info
  const currentLevel = CLIENT_LEVELS.find((l, i) => {
    const next = CLIENT_LEVELS[i + 1];
    return totalXp >= l.min && (!next || totalXp < next.min);
  }) || CLIENT_LEVELS[0];

  const currentLevelIdx = CLIENT_LEVELS.indexOf(currentLevel) + 1;
  const nextLevel = CLIENT_LEVELS[CLIENT_LEVELS.indexOf(currentLevel) + 1] || null;
  const levelProgressPct = nextLevel
    ? Math.min(100, ((totalXp - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100)
    : 100;
  const xpToNext = nextLevel ? nextLevel.min - totalXp : 0;

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function redeemItem(type: ClientItemType, cost: number) {
    setBuying(type);
    try {
      const res  = await fetch("/api/client-xp-store/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Redemption failed", false); return; }

      setXp(p => p - cost);

      if (type.startsWith("credit_") || type === "xp_credit_swap") {
        showToast(`Rupee credit added successfully — applied at your next order!`, true);
      } else {
        setActive(p => new Set([...p, type]));
        const item = CLIENT_STORE_ITEMS.find(i => i.type === type);
        if (item?.durationDays) {
          setExpiry(p => ({
            ...p,
            [type]: new Date(Date.now() + item.durationDays! * 86_400_000).toISOString(),
          }));
        }
        showToast("Redeemed! Boost benefit is now active on your account.", true);
      }
      router.refresh();
    } finally {
      setBuying(null);
    }
  }

  async function redeemBadge(badgeKey: PatronBadgeKey, cost: number) {
    setBuying(badgeKey);
    try {
      const res  = await fetch("/api/client-xp-store/redeem-badge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badgeKey }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Purchase failed", false); return; }

      setXp(p => p - cost);
      setOwned(p => new Set([...p, badgeKey]));
      showToast("Patron status badge unlocked successfully!", true);
      router.refresh();
    } finally {
      setBuying(null);
    }
  }

  // Filter items based on activeTab
  const activeItems = CLIENT_STORE_ITEMS.filter(item => {
    if (activeTab === "featured") {
      // Show hero banner item + popular/best value items
      return item.tag === "Popular" || item.tag === "Best Value" || item.type === "credit_500";
    }
    return item.category === activeTab;
  });

  return (
    <div className="px-6 py-8 space-y-8 max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl text-sm font-semibold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300",
          toast.ok ? "bg-indigo-600 text-white" : "bg-red-500 text-white"
        )}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Back link */}
      <div>
        <Link
          href="/client/rewards"
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Client Rewards Hub
        </Link>
      </div>

      {/* Header Info Panel */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl border border-slate-800">
        {/* Glow overlay */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4 flex-1">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">EditBridge Premium Store</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Client XP Shop</h1>
              <p className="text-sm text-slate-400 max-w-xl">Redeem your accumulated XP points for credit vouchers, matching upgrades, templates, and exclusive VIP experiences.</p>
            </div>

            {/* Progression details */}
            <div className="space-y-2 max-w-md pt-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <span className="text-lg leading-none">{currentLevel.emoji}</span>
                  Level {currentLevelIdx} — {currentLevel.label}
                </span>
                {nextLevel && (
                  <span className="text-slate-400">
                    {totalXp.toLocaleString()} / {nextLevel.min.toLocaleString()} XP
                  </span>
                )}
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" 
                  style={{ width: `${levelProgressPct}%` }}
                />
              </div>
              {nextLevel ? (
                <p className="text-[11px] text-slate-400">
                  Earn <span className="text-indigo-400 font-bold">{xpToNext.toLocaleString()} more XP</span> to unlock <span className="text-white font-semibold">{nextLevel.label} {nextLevel.emoji}</span> status perks.
                </p>
              ) : (
                <p className="text-[11px] text-yellow-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Highest client level achieved!
                </p>
              )}
            </div>
          </div>

          {/* Balance Widget */}
          <div className="flex flex-col sm:flex-row items-stretch gap-3 shrink-0">
            {/* Spendable credits balance */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col justify-center min-w-[150px] shadow-lg">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Shop Credits</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <Zap className="w-5 h-5 text-indigo-400 fill-indigo-400 shrink-0" />
                <span className="text-2xl font-black tracking-tight text-white tabular-nums">
                  {xp.toLocaleString()}
                </span>
              </div>
              <span className="text-[10px] text-indigo-300 font-medium mt-1">Available to spend</span>
            </div>

            {/* Permanent Lifetime XP */}
            <div className="bg-slate-800/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-center min-w-[150px]">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lifetime XP</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <Star className="w-5 h-5 text-indigo-400/55 shrink-0" />
                <span className="text-2xl font-black tracking-tight text-slate-300 tabular-nums">
                  {totalXp.toLocaleString()}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium mt-1">Permanent Level Rank</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-gray-100">
        {[
          { id: "featured", label: "Featured", emoji: "✨" },
          { id: "credits", label: "Discounts & Credits", emoji: "💰" },
          { id: "hiring", label: "Hiring & Discovery", emoji: "🚀" },
          { id: "workflow", label: "Workflow & Tools", emoji: "⚡" },
          { id: "vip", label: "VIP & Status", emoji: "👑" },
          { id: "experiences", label: "Experiences", emoji: "🎁" },
          { id: "referrals", label: "Referral Perks", emoji: "👥" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border",
              activeTab === tab.id
                ? "bg-slate-900 text-white border-slate-900 shadow-md transform -translate-y-px"
                : "bg-white text-gray-500 border-gray-100 hover:text-gray-700 hover:border-gray-200"
            )}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab contents */}
      {activeTab === "vip" ? (
        /* VIP & Status Perks detailed page */
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-3xl border border-indigo-100/50 p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-center">
            <div className="w-16 h-16 rounded-3xl bg-indigo-100 flex items-center justify-center text-4xl shrink-0">
              ⭐
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="text-lg font-bold text-gray-900">VIP Status Unlocks</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                As a client, you unlock higher status levels dynamically by earning Lifetime XP from marketplace behavior. Status levels grant permanent, passive discounts and privileges without spending your credit points!
              </p>
            </div>
            <div className="shrink-0 bg-white px-5 py-3 rounded-2xl border border-indigo-100 shadow-sm text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Your Current Tier</p>
              <p className="text-sm font-extrabold text-indigo-600 mt-0.5">{currentLevel.label} {currentLevel.emoji}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Levels ladder list */}
            <div className="md:col-span-2 bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
              <h4 className="text-sm font-bold text-gray-800">Status Progression Levels</h4>
              <div className="space-y-3">
                {CLIENT_LEVELS.map((level, i) => {
                  const isActive = currentLevel.name === level.name;
                  const isUnlocked = totalXp >= level.min;

                  return (
                    <div 
                      key={level.name}
                      className={cn(
                        "flex items-center justify-between p-3.5 rounded-2xl border transition-all",
                        isActive 
                          ? "bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-200" 
                          : isUnlocked 
                            ? "bg-slate-50/55 border-gray-100 opacity-80" 
                            : "bg-white border-gray-100 opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl leading-none">{level.emoji}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-gray-950">Level {i + 1}: {level.label}</p>
                            {isActive && (
                              <span className="text-[9px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">
                                Active Status
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">Requires {level.min.toLocaleString()} Lifetime XP</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isUnlocked ? (
                          <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg">
                            <Check className="w-3.5 h-3.5" /> Unlocked
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* VIP specific perks card */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-44 h-44 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⭐</span>
                  <span className="text-sm font-extrabold uppercase tracking-wider text-purple-400">VIP Privileges</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Reaching Level 5 (VIP Client) unlocks a premium set of permanent features tailored for businesses and power creators:
                </p>

                <ul className="space-y-2 text-[11px] text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">✦</span>
                    <span>Priority Support SLAs (2h responses)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">✦</span>
                    <span>Handpicked premium Editor Recommendations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">✦</span>
                    <span>Special Monthly XP conversions booster</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">✦</span>
                    <span>Early-bird access to newly verified editors</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">✦</span>
                    <span>Higher client referral credits (+₹100 bonus)</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 relative z-10">
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4.5 text-center">
                  <p className="text-[10px] text-slate-400 font-semibold">Your Lifetime Progression</p>
                  <p className="text-xl font-black mt-1 text-white">{totalXp.toLocaleString()} XP</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Card Grids for item store */
        <div className="space-y-6">
          {activeTab === "featured" && (
            /* Large Featured Hero Card */
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl border border-indigo-500/20">
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3 max-w-xl">
                  <span className="bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-indigo-400/30">
                    Hot Deal
                  </span>
                  <h3 className="text-2xl font-bold tracking-tight">🎁 ₹500 EditBridge Credit</h3>
                  <p className="text-sm text-indigo-100 leading-relaxed">
                    Convert your hard-earned XP directly into ₹500 shop credit. Applied automatically at your next editing order checkout.
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-xs bg-indigo-800 px-3 py-1.5 rounded-xl font-bold text-indigo-200">
                      Cost: 4,000 XP
                    </span>
                    <span className="text-xs text-indigo-200 font-medium">
                      Requires Level 1
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => redeemItem("credit_500", 4000)}
                  disabled={xp < 4000 || buying === "credit_500"}
                  className={cn(
                    "px-6 py-3 rounded-2xl text-sm font-bold shadow-md transition-all duration-200 shrink-0",
                    xp >= 4000
                      ? "bg-white text-indigo-700 hover:scale-[1.02]"
                      : "bg-indigo-800 text-indigo-400 cursor-not-allowed"
                  )}
                >
                  {buying === "credit_500" ? "Redeeming…" : "Redeem Now"}
                </button>
              </div>
            </div>
          )}

          {/* Cards listing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeItems.map(item => {
              const isActive = active.has(item.type);
              const canAfford = xp >= item.cost;
              const isLoading = buying === item.type;
              const expDisplay = fmtExpiry(expiry[item.type]);

              // Check level constraint
              const hasLevelLock = item.minLevel && currentLevelIdx < item.minLevel;
              const lockLevelMeta = item.minLevel ? CLIENT_LEVELS[item.minLevel - 1] : null;

              return (
                <div
                  key={item.type}
                  className={cn(
                    "bg-white rounded-3xl border p-5 flex flex-col gap-4.5 transition-all duration-200 hover:shadow-md relative overflow-hidden",
                    isActive ? "border-emerald-200 ring-1 ring-emerald-100" : "border-gray-100"
                  )}
                >
                  {/* Item header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl leading-none shrink-0">{item.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-gray-900 leading-tight">{item.label}</h4>
                          {item.tag && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                              {item.tag}
                            </span>
                          )}
                          {hasLevelLock && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 flex items-center gap-0.5 border border-red-100">
                              <Lock className="w-2.5 h-2.5" /> Lvl {item.minLevel}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {item.durationDays ? `Duration: ${item.durationDays} Days` : "One-Time Benefit"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-xs font-black text-indigo-600 shrink-0 tabular-nums">
                      <Zap className="w-3.5 h-3.5 fill-indigo-600 shrink-0" />
                      <span>{item.cost.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-gray-500 leading-relaxed min-h-[40px]">{item.desc}</p>

                  {/* Lock overlays or Action buttons */}
                  <div className="mt-auto pt-2">
                    {hasLevelLock ? (
                      <div className="w-full flex items-center gap-2 p-2.5 rounded-2xl bg-red-50/50 border border-red-100/50 text-[10px] text-red-700 leading-relaxed">
                        <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Requires <span className="font-bold">{lockLevelMeta?.label} {lockLevelMeta?.emoji}</span> level status to redeem.</span>
                      </div>
                    ) : isActive ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="text-xs font-bold text-emerald-600">Redeemed</span>
                          {expDisplay && (
                            <span className="ml-auto text-[10px] text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {expDisplay}
                            </span>
                          )}
                        </div>
                        {item.isToken && (
                          <div className="flex items-start gap-1 p-2 rounded-xl bg-slate-50 text-[9px] text-gray-500 leading-normal">
                            Applied automatically on checkout.
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => redeemItem(item.type, item.cost)}
                        disabled={!canAfford || !!isLoading}
                        className={cn(
                          "w-full py-2 rounded-2xl text-xs font-extrabold transition-all duration-200",
                          canAfford
                            ? "bg-slate-900 text-white hover:bg-slate-800 hover:-translate-y-px active:translate-y-0"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        )}
                      >
                        {isLoading
                          ? "Processing…"
                          : canAfford
                            ? `Redeem for ${item.cost.toLocaleString()} XP`
                            : `Need ${item.cost - xp} more XP`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Patron badges sidebar/shelf (Only shown under featured or credits) */}
      {(activeTab === "featured" || activeTab === "credits") && (
        <section className="space-y-4 pt-4 border-t border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Patron Status Badges</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Unlock collectible public badges to signal you are a trusted, premium client. Showcased on your orders and editor interactions.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PATRON_BADGES.map(badge => {
              const isOwned = owned.has(badge.key);
              const canAfford = xp >= badge.cost;
              const isLoading = buying === badge.key;

              return (
                <div
                  key={badge.key}
                  className={cn(
                    "rounded-2xl border p-4 flex flex-col items-center gap-3 text-center transition-all bg-white",
                    isOwned ? "border-indigo-100" : "border-gray-100 bg-gray-50/50"
                  )}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-3xl transition-transform"
                    style={{
                      background: "linear-gradient(135deg, #f3f4f6, #e5e7eb)",
                      ...(isOwned ? badge.style : { opacity: 0.3 }),
                    }}
                  >
                    {badge.emoji}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-gray-900">{badge.label}</p>
                    {badge.tag && (
                      <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 mt-1 inline-block">
                        {badge.tag}
                      </span>
                    )}
                  </div>

                  {/* Perks list */}
                  {badge.perks && (
                    <div className="w-full text-left space-y-1">
                      {badge.perks.map(perk => (
                        <div key={perk} className="flex items-start gap-1 text-[9px] text-gray-400 leading-normal">
                          <span className="text-indigo-400 font-bold">•</span>
                          <span>{perk}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cost check */}
                  <div className="flex items-center gap-1 text-xs font-extrabold text-indigo-600 pt-1">
                    <Zap className="w-3.5 h-3.5 fill-indigo-600 shrink-0" />
                    <span>{badge.cost.toLocaleString()}</span>
                  </div>

                  {isOwned ? (
                    <span className="w-full py-1.5 rounded-xl text-[10px] font-bold text-emerald-600 bg-emerald-50 text-center">
                      Unlocked
                    </span>
                  ) : (
                    <button
                      onClick={() => redeemBadge(badge.key, badge.cost)}
                      disabled={!canAfford || !!isLoading}
                      className={cn(
                        "w-full py-1.5 rounded-xl text-[10px] font-extrabold transition-all",
                        canAfford
                          ? "bg-slate-900 text-white hover:bg-slate-800"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      {isLoading ? "…" : "Unlock Badge"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Earn XP guidelines */}
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100/50">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-gray-900">How to Earn Client XP & Credits</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Complete First Order", value: "+500 XP", desc: "Start strong on EditBridge" },
            { label: "Complete a Video Order", value: "+100 XP", desc: "Awarded automatically on delivery" },
            { label: "Leave a genuine review", value: "+25 XP", desc: "Share detailed editor feedback" },
            { label: "Hire a new editor", value: "+50 XP", desc: "Build connections with creators" },
            { label: "Repeat hire same editor", value: "+100 XP", desc: "Encourages loyal collaborations" },
            { label: "Complete client profile", value: "+100 XP", desc: "Upload avatar and specifications" },
            { label: "Complete project brief", value: "+50 XP", desc: "Fill optional prompts and requirements" },
            { label: "Successful friend referral", value: "+500 XP", desc: "Applied when referred client orders" },
            { label: "Complete 10 orders", value: "+1,000 XP", desc: "Milestone status boost reward" },
          ].map(way => (
            <div key={way.label} className="bg-white rounded-2xl p-3.5 border border-gray-100 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-gray-900">{way.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{way.desc}</p>
              </div>
              <p className="text-xs font-extrabold text-indigo-600 mt-2.5 flex items-center gap-0.5">
                <Zap className="w-3.5 h-3.5 fill-indigo-600 shrink-0" />
                {way.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
