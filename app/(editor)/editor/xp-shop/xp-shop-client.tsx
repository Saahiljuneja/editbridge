"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  Lock,
  ChevronRight,
  AlertCircle,
  ArrowLeft,
  Check,
  Award,
  Shield,
  Layers,
  Wrench,
  DollarSign,
  Star,
  Activity,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SHOP_ITEMS,
  PROFILE_FRAMES,
  getPortfolioSlots,
  calcEditorLevel,
  EDITOR_LEVELS,
  type BoostType,
  type FrameKey,
} from "@/lib/xp-shop-config";

interface PurchaseHistoryItem {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
}

interface Props {
  currentXp: number;
  lifetimeXp: number;
  activeTypes: string[];
  boostExpiry: Record<string, string | null>;
  ownedFrames: string[];
  activeFrame: string | null;
  history: PurchaseHistoryItem[];
}

function parseReason(reason: string) {
  if (reason.startsWith("xp_shop_")) {
    const type = reason.replace("xp_shop_", "");
    const item = SHOP_ITEMS.find(i => i.type === type);
    return {
      name: item?.label ?? type.replace(/_/g, " "),
      emoji: item?.emoji ?? "🚀",
      type: "Boost",
    };
  }
  if (reason.startsWith("xp_frame_")) {
    const key = reason.replace("xp_frame_", "");
    const frame = PROFILE_FRAMES.find(f => f.key === key);
    return {
      name: frame?.label ?? key.replace(/_/g, " "),
      emoji: frame?.emoji ?? "🎨",
      type: "Avatar Frame",
    };
  }
  const isCredit = !reason.startsWith("xp_shop_") && !reason.startsWith("xp_frame_");
  return {
    name: reason.replace(/_/g, " "),
    emoji: isCredit ? "🪙" : "🛍️",
    type: isCredit ? "Earning" : "Purchase",
  };
}

function fmtExpiry(iso: string | null | undefined) {
  if (!iso) return "Permanent";
  return `Expires ${new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

export function XpShopClient({
  currentXp,
  lifetimeXp,
  activeTypes,
  boostExpiry,
  ownedFrames,
  activeFrame: initialActiveFrame,
  history: initialHistory
}: Props) {
  const router = useRouter();
  const [xp, setXp]                     = useState(currentXp);
  const [active, setActive]             = useState(new Set(activeTypes));
  const [expiry, setExpiry]             = useState<Record<string, string | null>>(boostExpiry);
  const [owned, setOwned]               = useState(new Set(ownedFrames));
  const [currentFrame, setCurrentFrame] = useState<string | null>(initialActiveFrame);
  const [buying, setBuying]             = useState<string | null>(null);
  const [settingFrame, setSettingFrame] = useState<string | null>(null);
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);
  const [localHistory, setLocalHistory] = useState<PurchaseHistoryItem[]>(initialHistory);
  const [successItem, setSuccessItem]   = useState<{ label: string; cost: number; emoji: string; desc: string } | null>(null);
  const [activeTab, setActiveTab]       = useState<"featured" | "boosts" | "customization" | "badges" | "productivity" | "perks">("featured");

  const currentEditorLevel = calcEditorLevel(lifetimeXp);
  const nextEditorLevel = EDITOR_LEVELS.find(l => l.level === currentEditorLevel.level + 1) ?? null;
  const xpPct = nextEditorLevel
    ? Math.min(100, ((lifetimeXp - currentEditorLevel.min) / (nextEditorLevel.min - currentEditorLevel.min)) * 100)
    : 100;
  const xpNeeded = nextEditorLevel ? nextEditorLevel.min - lifetimeXp : 0;

  const LEVEL_COLORS: Record<string, string> = {
    level1: "#D97706", level2: "#6B7280", level3: "#3B82F6", level4: "#EF4444",
  };
  const LEVEL_EMOJIS: Record<string, string> = {
    level1: "🌱", level2: "✨", level3: "⚡", level4: "🔥",
  };
  const xpColor = LEVEL_COLORS[currentEditorLevel.name] || "#D97706";

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function purchaseBoost(type: BoostType, cost: number) {
    setBuying(type);
    try {
      const res = await fetch("/api/xp-shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Purchase failed", false); return; }
      
      setXp(p => p - cost);
      setActive(p => new Set([...p, type]));
      const item = SHOP_ITEMS.find(i => i.type === type);
      if (item?.durationDays) {
        setExpiry(p => ({ ...p, [type]: new Date(Date.now() + item.durationDays! * 86_400_000).toISOString() }));
      }
      
      const newTx: PurchaseHistoryItem = {
        id: Math.random().toString(),
        amount: -cost,
        reason: `xp_shop_${type}`,
        createdAt: new Date().toISOString(),
      };
      setLocalHistory(p => [newTx, ...p]);
      
      if (item) {
        setSuccessItem({
          label: item.label,
          cost: item.cost,
          emoji: item.emoji,
          desc: item.desc,
        });
      } else {
        showToast("Redeemed successfully!", true);
      }
      router.refresh();
    } finally {
      setBuying(null);
    }
  }

  async function purchaseFrame(frameKey: FrameKey, cost: number) {
    setBuying(frameKey);
    try {
      const res = await fetch("/api/xp-shop/purchase-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frameKey }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Purchase failed", false); return; }
      
      setXp(p => p - cost);
      setOwned(p => new Set([...p, frameKey]));
      
      const newTx: PurchaseHistoryItem = {
        id: Math.random().toString(),
        amount: -cost,
        reason: `xp_frame_${frameKey}`,
        createdAt: new Date().toISOString(),
      };
      setLocalHistory(p => [newTx, ...p]);

      const frame = PROFILE_FRAMES.find(f => f.key === frameKey);
      if (frame) {
        setSuccessItem({
          label: `${frame.label} Profile Frame`,
          cost: frame.cost,
          emoji: frame.emoji,
          desc: "Custom glowing border unlocked! Activate it on your avatar below.",
        });
      } else {
        showToast("Frame unlocked successfully!", true);
      }
      router.refresh();
    } finally {
      setBuying(null);
    }
  }

  async function setActiveFrame(frameKey: string | null) {
    setSettingFrame(frameKey ?? "__clear__");
    try {
      const res = await fetch("/api/xp-shop/set-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frameKey }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Failed to set frame", false); return; }
      setCurrentFrame(frameKey);
      showToast(frameKey ? "Cosmetic frame activated on your profile!" : "Cosmetic frame removed.", true);
    } finally {
      setSettingFrame(null);
    }
  }

  // Filter items based on activeTab
  const boostsItems = SHOP_ITEMS.filter(i => i.category === "boosts");
  const customizationFrames = PROFILE_FRAMES;
  const productivityItems = SHOP_ITEMS.filter(i => i.category === "productivity");
  const perksItems = SHOP_ITEMS.filter(i => i.category === "perks");

  // Achievements & Badges List
  const achievements = [
    { label: "Fast Delivery", emoji: "🏅", desc: "Complete 10 orders before deadline", progress: 6, target: 10 },
    { label: "Client Favorite", emoji: "⭐", desc: "Maintain 10 five-star reviews", progress: 8, target: 10 },
    { label: "10K Club", emoji: "🔥", desc: "Earn ₹10,000+ completed earnings", progress: 8500, target: 10000, isCurrency: true },
    { label: "Pro Editor", emoji: "💎", desc: "Complete 100 orders successfully", progress: 24, target: 100 },
    { label: "Zero Revision", emoji: "🎯", desc: "Complete 10 orders without revisions", progress: 5, target: 10 },
    { label: "Communication Pro", emoji: "💬", desc: "Maintain an excellent response rate", progress: 95, target: 100, isPercentage: true }
  ];

  return (
    <div className="px-6 py-6 space-y-8 max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg flex items-center gap-2",
          toast.ok ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
        )}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            href="/editor/dashboard"
            className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium mb-1.5 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-none">XP Shop</h1>
          <p className="text-sm text-gray-400 mt-1">Spend your available XP to boost visibility, unlock perks, and level up your status.</p>
        </div>

        {/* Multi-point display (Lifetime vs spendable) */}
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
            <Zap className="w-4 h-4 text-brand-primary" />
            <div>
              <p className="text-xs text-gray-400 font-medium leading-none">Spendable XP</p>
              <p className="text-sm font-bold text-brand-primary dark:text-blue-400 tabular-nums mt-0.5">{xp.toLocaleString()} XP</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
            <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-xs text-gray-400 font-medium leading-none">Lifetime XP</p>
              <p className="text-sm font-bold text-purple-600 dark:text-purple-400 tabular-nums mt-0.5">{lifetimeXp.toLocaleString()} XP</p>
            </div>
          </div>
        </div>
      </div>

      {/* Level progression bar */}
      <div className="relative bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-850 rounded-3xl shadow-xl px-6 py-5 overflow-hidden text-white">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: xpColor }} />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: xpColor }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl select-none drop-shadow-md">
              {LEVEL_EMOJIS[currentEditorLevel.name] || "🌱"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Level {currentEditorLevel.level}</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white" style={{ background: xpColor }}>
                  {currentEditorLevel.label}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-white tabular-nums">{lifetimeXp.toLocaleString()}</span>
                <span className="text-xs text-neutral-405 font-semibold">/ {nextEditorLevel ? nextEditorLevel.min.toLocaleString() : "MAX"} XP</span>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-lg w-full">
            <div className="h-2.5 w-full bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${xpPct}%`, background: xpColor }} />
            </div>
            {nextEditorLevel ? (
              <p className="text-[11px] text-neutral-450 mt-2 font-medium">
                {xpNeeded.toLocaleString()} XP to Level {nextEditorLevel.level} ({nextEditorLevel.label})
              </p>
            ) : (
              <p className="text-[11px] font-bold mt-2" style={{ color: xpColor }}>Max level reached 🎉</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs list switch */}
      <div className="flex items-center gap-1.5 border-b border-gray-150 dark:border-gray-800 overflow-x-auto pb-1">
        {[
          { id: "featured", label: "Featured", icon: Sparkles },
          { id: "boosts", label: "Profile Boosts", icon: Zap },
          { id: "customization", label: "Customization", icon: Shield },
          { id: "badges", label: "Badges", icon: Award },
          { id: "productivity", label: "Productivity", icon: Wrench },
          { id: "perks", label: "Perks", icon: DollarSign },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 shrink-0",
              activeTab === tab.id
                ? "border-brand-primary text-brand-primary bg-blue-50/50 dark:bg-blue-950/20 border-b-brand-primary"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Renderers */}
      <div className="space-y-6">
        {/* TAB 1: FEATURED */}
        {activeTab === "featured" && (
          <div className="space-y-8">
            {/* Featured Hero item: Profile Boost */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-indigo-900 border border-indigo-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex-1 space-y-2 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-500/50 px-2.5 py-1 rounded-full">
                  Featured Boost
                </span>
                <h2 className="text-xl font-extrabold flex items-center gap-1.5 mt-2">
                  🚀 Profile Boost — 24h
                </h2>
                <p className="text-sm text-indigo-200 max-w-xl leading-relaxed">
                  Boost your profile for 24 hours to get increased discovery. Appears higher in editor results to attract client interest.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Zap className="w-4.5 h-4.5 text-indigo-400" />
                  <span className="text-lg font-black tabular-nums text-indigo-300">500 XP</span>
                </div>
              </div>
              <div className="shrink-0 relative z-10 w-full md:w-auto">
                {active.has("profile_boost_24h") ? (
                  <div className="w-full md:w-40 py-3 bg-emerald-500 text-white rounded-2xl text-center text-xs font-bold shadow-md">
                    ✓ Active
                  </div>
                ) : (
                  <button
                    onClick={() => purchaseBoost("profile_boost_24h", 500)}
                    disabled={xp < 500 || buying === "profile_boost_24h"}
                    className={cn(
                      "w-full md:w-40 py-3 rounded-2xl text-xs font-bold shadow-lg transition-all active:scale-[0.98]",
                      xp >= 500
                        ? "bg-white text-indigo-950 hover:bg-gray-100"
                        : "bg-indigo-950/60 text-indigo-300/50 border border-indigo-800 cursor-not-allowed"
                    )}
                  >
                    {buying === "profile_boost_24h" ? "Activating…" : xp >= 500 ? "Redeem" : `Need ${500 - xp} XP`}
                  </button>
                )}
              </div>
            </div>

            {/* Popular Rewards List */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-brand-primary" /> Popular Rewards
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { key: "frame_cinema", label: "Cinematic Frame", cost: 750, emoji: "🎬", desc: "Give your profile avatar a professional cinematic border glow.", isFrame: true },
                  { type: "rising_editor_badge", label: "Rising Editor Badge", cost: 1000, emoji: "✨", desc: "Unlock a permanent badge tag to display on your profile.", minLevel: 2 },
                  { type: "portfolio_spotlight", label: "Portfolio Spotlight", cost: 1500, emoji: "🖼️", desc: "Highlight your portfolio samples prominently on browse feeds.", durationDays: 7 }
                ].map((item: any) => {
                  const isOwned = item.isFrame ? owned.has(item.key) : active.has(item.type);
                  const canAfford = xp >= item.cost;
                  const lvlOk = !item.minLevel || currentEditorLevel.level >= item.minLevel;

                  return (
                    <div key={item.label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-gray-250 dark:hover:border-gray-705 transition-all shadow-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-3xl leading-none">{item.emoji}</span>
                          <span className="text-xs font-bold text-brand-primary dark:text-blue-400 tabular-nums flex items-center gap-0.5">
                            <Zap className="w-3 h-3" /> {item.cost}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-1">{item.label}</h4>
                        <p className="text-[11px] text-gray-400 dark:text-gray-405 leading-relaxed">{item.desc}</p>
                      </div>

                      {item.minLevel && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                          <Lock className="w-3 h-3" /> Requires Level {item.minLevel}
                        </div>
                      )}

                      {isOwned ? (
                        <div className="py-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-center text-xs font-bold">
                          Unlocked
                        </div>
                      ) : (
                        <button
                          onClick={() => item.isFrame ? purchaseFrame(item.key, item.cost) : purchaseBoost(item.type, item.cost)}
                          disabled={!canAfford || !lvlOk}
                          className={cn(
                            "w-full py-2 rounded-xl text-xs font-bold transition-all",
                            canAfford && lvlOk
                              ? "bg-brand-primary hover:opacity-90 text-white"
                              : "bg-gray-50 dark:bg-gray-800/80 text-gray-400 cursor-not-allowed border border-gray-100 dark:border-gray-700"
                          )}
                        >
                          {!lvlOk ? `Locked (Lvl ${item.minLevel})` : canAfford ? "Redeem" : `Need ${item.cost - xp} XP`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROFILE BOOSTS */}
        {activeTab === "boosts" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {boostsItems.map(item => {
              const isActive = active.has(item.type);
              const canAfford = xp >= item.cost;
              const lvlOk = !item.minLevel || currentEditorLevel.level >= item.minLevel;
              const isLoading = buying === item.type;

              return (
                <div key={item.type} className={cn(
                  "rounded-2xl border p-5 flex flex-col justify-between gap-3 transition-all",
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                    : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                )}>
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl leading-none">{item.emoji}</span>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{item.label}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {item.durationDays ? `${item.durationDays} days` : "Permanent Unlock"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Zap className="w-3.5 h-3.5 text-brand-primary" />
                        <span className="text-sm font-extrabold tabular-nums text-brand-primary dark:text-blue-400">{item.cost}</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                  </div>

                  {item.minLevel && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold pt-1">
                      <Lock className="w-3.5 h-3.5" /> Requires Level {item.minLevel} ({EDITOR_LEVELS.find(l => l.level === item.minLevel)?.label})
                    </div>
                  )}

                  {isActive ? (
                    <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-emerald-100 dark:border-emerald-950/30">
                      <span className="text-xs font-semibold text-emerald-600">Active</span>
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock className="w-3 h-3" />{fmtExpiry(expiry[item.type])}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => purchaseBoost(item.type, item.cost)}
                      disabled={!canAfford || !lvlOk || !!isLoading}
                      className={cn(
                        "mt-3 w-full py-2.5 rounded-xl text-xs font-bold transition-all",
                        canAfford && lvlOk
                          ? "bg-brand-primary hover:opacity-95 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      {isLoading ? "Activating…" : !lvlOk ? `Locked (Level ${item.minLevel})` : canAfford ? `Redeem · ${item.cost} XP` : `Need ${item.cost - xp} XP`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: CUSTOMIZATION */}
        {activeTab === "customization" && (
          <div className="space-y-6">
            {/* Active frame preview */}
            {currentFrame && (() => {
              const f = PROFILE_FRAMES.find(fr => fr.key === currentFrame);
              return f ? (
                <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 shrink-0" style={f.style} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{f.emoji} {f.label} is currently active</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Adds a custom border effect to your public profile avatar.</p>
                  </div>
                  <button
                    onClick={() => setActiveFrame(null)}
                    disabled={settingFrame === "__clear__"}
                    className="text-xs text-red-500 hover:underline font-bold transition-colors"
                  >
                    Remove Frame
                  </button>
                </div>
              ) : null;
            })()}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {customizationFrames.map(frame => {
                const isOwned = owned.has(frame.key);
                const isActive = currentFrame === frame.key;
                const canAfford = xp >= frame.cost;
                const lvlOk = !frame.minLevel || currentEditorLevel.level >= frame.minLevel;
                const isLoading = buying === frame.key;
                const isSetting = settingFrame === frame.key;

                return (
                  <div key={frame.key} className={cn(
                    "rounded-2xl border p-4 flex flex-col items-center gap-3 text-center transition-all",
                    isActive
                      ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                      : isOwned
                        ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                        : "bg-gray-50/50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800"
                  )}>
                    {/* Frame Preview */}
                    <div
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-3xl shadow-md transition-all shrink-0"
                      style={isOwned || isActive ? frame.style : { opacity: 0.3 }}
                    >
                      {frame.emoji}
                    </div>

                    <div className="w-full space-y-1">
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight">{frame.label}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-405 leading-snug line-clamp-2">{frame.desc}</p>
                    </div>

                    {frame.minLevel && (
                      <div className="flex items-center gap-1 text-[9px] text-amber-600 dark:text-amber-400 font-bold">
                        <Lock className="w-3 h-3" /> Level {frame.minLevel} Required
                      </div>
                    )}

                    <div className="mt-auto pt-2 w-full flex flex-col gap-2">
                      <div className="flex items-center justify-center gap-1 text-xs font-bold text-brand-primary dark:text-blue-400">
                        <Zap className="w-3.5 h-3.5" />
                        <span className={cn(isOwned && "line-through text-gray-400")}>{frame.cost}</span>
                        {isOwned && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-1">Owned</span>}
                      </div>

                      {isActive ? (
                        <span className="w-full py-1.5 rounded-xl text-[11px] font-bold text-brand-primary dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 text-center">
                          ✓ Active
                        </span>
                      ) : isOwned ? (
                        <button
                          onClick={() => setActiveFrame(frame.key)}
                          disabled={!!isSetting}
                          className="w-full py-1.5 rounded-xl text-[11px] font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-80 transition-all"
                        >
                          {isSetting ? "…" : "Activate"}
                        </button>
                      ) : (
                        <button
                          onClick={() => purchaseFrame(frame.key, frame.cost)}
                          disabled={!canAfford || !lvlOk || !!isLoading}
                          className={cn(
                            "w-full py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1",
                            canAfford && lvlOk
                              ? "bg-brand-primary hover:opacity-90 text-white"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-450 cursor-not-allowed"
                          )}
                        >
                          {isLoading ? "…" : !lvlOk ? `Lvl ${frame.minLevel} Locked` : `Unlock`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: BADGES & ACHIEVEMENTS */}
        {activeTab === "badges" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-850 rounded-3xl p-5 text-white flex items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">Gamification Milestones</span>
                <h3 className="text-base font-extrabold">XP Achievements & Badge Upgrades</h3>
                <p className="text-xs text-neutral-400 max-w-xl">Complete milestone goals on the platform to earn badge indicators on your public profile card.</p>
              </div>
              <Award className="w-10 h-10 text-purple-500 shrink-0 hidden sm:block" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {achievements.map(ach => {
                const isCompleted = ach.progress >= ach.target;
                const percent = Math.min(100, (ach.progress / ach.target) * 100);

                return (
                  <div key={ach.label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl leading-none">{ach.emoji}</span>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{ach.label}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{ach.desc}</p>
                        </div>
                      </div>
                      {isCompleted && (
                        <span className="bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0">
                          Unlocked
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 font-bold tabular-nums">
                        <span>{percent.toFixed(0)}% complete</span>
                        <span>
                          {ach.isCurrency ? `₹${ach.progress.toLocaleString()}` : ach.progress}
                          {" / "}
                          {ach.isCurrency ? `₹${ach.target.toLocaleString()}` : ach.target}
                          {ach.isPercentage && "%"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: PRODUCTIVITY REWARDS */}
        {activeTab === "productivity" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {productivityItems.map(item => {
              const isActive = active.has(item.type);
              const canAfford = xp >= item.cost;
              const lvlOk = !item.minLevel || currentEditorLevel.level >= item.minLevel;
              const isLoading = buying === item.type;

              return (
                <div key={item.type} className={cn(
                  "rounded-2xl border p-5 flex flex-col justify-between gap-3 transition-all",
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                    : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                )}>
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl leading-none">{item.emoji}</span>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{item.label}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {item.durationDays ? `Duration: ${item.durationDays} days` : "Permanent Upgrade"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Zap className="w-3.5 h-3.5 text-brand-primary" />
                        <span className="text-sm font-extrabold tabular-nums text-brand-primary dark:text-blue-400">{item.cost}</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                  </div>

                  {isActive ? (
                    <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-emerald-100 dark:border-emerald-950/30">
                      <span className="text-xs font-semibold text-emerald-600">Active</span>
                      <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                        <Clock className="w-3 h-3" />{fmtExpiry(expiry[item.type])}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => purchaseBoost(item.type, item.cost)}
                      disabled={!canAfford || !lvlOk || !!isLoading}
                      className={cn(
                        "mt-3 w-full py-2.5 rounded-xl text-xs font-bold transition-all",
                        canAfford && lvlOk
                          ? "bg-brand-primary hover:opacity-95 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      {isLoading ? "Unlocking…" : canAfford ? `Redeem · ${item.cost} XP` : `Need ${item.cost - xp} XP`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 6: MARKETPLACE PERKS */}
        {activeTab === "perks" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {perksItems.map(item => {
              const isActive = active.has(item.type);
              const canAfford = xp >= item.cost;
              const lvlOk = !item.minLevel || currentEditorLevel.level >= item.minLevel;
              const isLoading = buying === item.type;

              return (
                <div key={item.type} className={cn(
                  "rounded-2xl border p-5 flex flex-col justify-between gap-3 transition-all",
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                    : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                )}>
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl leading-none">{item.emoji}</span>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{item.label}</p>
                          <p className="text-[10px] text-gray-405 mt-0.5">
                            {item.durationDays ? `Benefit Term: ${item.durationDays} days` : "One-time Perk"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Zap className="w-3.5 h-3.5 text-brand-primary" />
                        <span className="text-sm font-extrabold tabular-nums text-brand-primary dark:text-blue-400">{item.cost}</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                  </div>

                  {isActive ? (
                    <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-emerald-100 dark:border-emerald-950/30">
                      <span className="text-xs font-semibold text-emerald-600">Active</span>
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock className="w-3 h-3" />{fmtExpiry(expiry[item.type])}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => purchaseBoost(item.type, item.cost)}
                      disabled={!canAfford || !lvlOk || !!isLoading}
                      className={cn(
                        "mt-3 w-full py-2.5 rounded-xl text-xs font-bold transition-all",
                        canAfford && lvlOk
                          ? "bg-brand-primary hover:opacity-95 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      {isLoading ? "Activating…" : canAfford ? `Redeem · ${item.cost} XP` : `Need ${item.cost - xp} XP`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* How to earn more */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-450 mb-3.5 flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-brand-primary" /> How to Earn XP
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-500 dark:text-gray-400">
          {[
            { emoji: "🎬", label: "Complete an order", val: "+100 XP" },
            { emoji: "⚡", label: "Deliver before deadline", val: "+50 XP" },
            { emoji: "⭐", label: "Receive a 5-star review", val: "+75 XP" },
            { emoji: "🤝", label: "Complete KYC Profile", val: "+250 XP" },
            { emoji: "🚀", label: "First completed order bonus", val: "+500 XP" },
            { emoji: "💖", label: "Repeat client order bonus", val: "+150 XP" },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-2.5 py-2 px-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100/50 dark:border-gray-800">
              <span className="text-xl leading-none shrink-0">{row.emoji}</span>
              <span className="flex-1 truncate font-medium text-gray-700 dark:text-gray-300">{row.label}</span>
              <span className="font-extrabold text-brand-primary shrink-0">{row.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <History className="w-4 h-4 text-gray-405" /> Recent Transactions
        </h2>
        {localHistory.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-250 dark:border-gray-850 bg-white dark:bg-gray-900 p-6 text-center text-xs text-gray-400">
            No transaction records found. Redemptions or earning actions will log history.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 shadow-sm">
            {localHistory.map(tx => {
              const details = parseReason(tx.reason);
              const isPositive = tx.amount > 0;
              return (
                <div key={tx.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl leading-none shrink-0">{details.emoji}</span>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-gray-200 capitalize">{details.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {details.type} · {new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 font-extrabold tabular-nums",
                    isPositive ? "text-emerald-600 dark:text-emerald-450" : "text-red-500"
                  )}>
                    <span>{isPositive ? `+${tx.amount}` : tx.amount} XP</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Success Confirmation Modal */}
      <AnimatePresence>
        {successItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-4 left-4 animate-bounce text-xl">🎉</div>
                <div className="absolute top-8 right-6 animate-pulse text-xl">✨</div>
                <div className="absolute bottom-6 left-12 animate-bounce text-xl">✨</div>
                <div className="absolute bottom-8 right-8 animate-pulse text-xl">🎉</div>
              </div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: "spring", damping: 15 }}
                className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 flex items-center justify-center mx-auto mb-5 shadow-inner border border-emerald-100 dark:border-emerald-900"
              >
                <Check className="w-8 h-8 stroke-[3]" />
              </motion.div>

              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Redemption Successful</p>
              <h3 className="text-lg font-black text-gray-900 dark:text-white mt-1.5 leading-snug">{successItem.label}</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed px-2">{successItem.desc}</p>

              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-brand-primary dark:text-blue-400 font-extrabold text-sm mt-6 mb-8 shadow-sm">
                <Zap className="w-4 h-4 text-brand-primary" />
                <span>{successItem.cost} XP spent</span>
              </div>

              <button
                onClick={() => setSuccessItem(null)}
                className="w-full py-3 bg-brand-primary text-white text-xs font-bold rounded-2xl shadow-md transition-all active:scale-[0.98]"
              >
                Awesome!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
