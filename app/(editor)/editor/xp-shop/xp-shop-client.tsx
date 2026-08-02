"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Zap, CheckCircle2, Clock, Sparkles, Lock, ChevronRight, AlertCircle, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  REGULAR_SHOP_ITEMS,
  PORTFOLIO_TIERS,
  PROFILE_FRAMES,
  getPortfolioSlots,
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
  activeTypes: string[];
  boostExpiry: Record<string, string | null>;
  ownedFrames: string[];
  activeFrame: string | null;
  history: PurchaseHistoryItem[];
}

function parseReason(reason: string) {
  if (reason.startsWith("xp_shop_")) {
    const type = reason.replace("xp_shop_", "");
    const item = PORTFOLIO_TIERS.concat(REGULAR_SHOP_ITEMS).find(i => i.type === type);
    return {
      name: item?.label ?? type.replace(/_/g, " "),
      emoji: item?.emoji ?? "🔝",
      type: "Boost",
    };
  }
  if (reason.startsWith("xp_frame_")) {
    const key = reason.replace("xp_frame_", "");
    const frame = PROFILE_FRAMES.find(f => f.key === key);
    return {
      name: frame?.label ?? key.replace(/_/g, " "),
      emoji: frame?.emoji ?? "🖼️",
      type: "Avatar Frame",
    };
  }
  return {
    name: reason.replace(/_/g, " "),
    emoji: "🛍️",
    type: "Purchase",
  };
}

function fmtExpiry(iso: string | null | undefined) {
  if (!iso) return "Permanent";
  return `Expires ${new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

export function XpShopClient({ currentXp, activeTypes, boostExpiry, ownedFrames, activeFrame: initialActiveFrame, history: initialHistory }: Props) {
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
      const item = PORTFOLIO_TIERS.concat(REGULAR_SHOP_ITEMS).find(i => i.type === type);
      if (item?.durationDays) {
        setExpiry(p => ({ ...p, [type]: new Date(Date.now() + item.durationDays! * 86_400_000).toISOString() }));
      }
      
      // Append local purchase history item
      const newTx: PurchaseHistoryItem = {
        id: Math.random().toString(),
        amount: -cost,
        reason: `xp_shop_${type}`,
        createdAt: new Date().toISOString(),
      };
      setLocalHistory(p => [newTx, ...p]);
      
      // Trigger Success Modal
      if (item) {
        setSuccessItem({
          label: item.label,
          cost: item.cost,
          emoji: item.emoji,
          desc: item.desc,
        });
      } else {
        showToast("Boost activated!", true);
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
      
      // Append local purchase history item
      const newTx: PurchaseHistoryItem = {
        id: Math.random().toString(),
        amount: -cost,
        reason: `xp_frame_${frameKey}`,
        createdAt: new Date().toISOString(),
      };
      setLocalHistory(p => [newTx, ...p]);

      // Trigger Success Modal
      const frame = PROFILE_FRAMES.find(f => f.key === frameKey);
      if (frame) {
        setSuccessItem({
          label: `${frame.label} Profile Frame`,
          cost: frame.cost,
          emoji: frame.emoji,
          desc: "Custom glowing border around your public profile avatar.",
        });
      } else {
        showToast("Frame unlocked! Activate it below.", true);
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
      showToast(frameKey ? "Frame activated on your profile!" : "Frame removed.", true);
    } finally {
      setSettingFrame(null);
    }
  }

  const portfolioSlots = getPortfolioSlots(active);
  const PORTFOLIO_STEPS = [5, 8, 12, 20];

  return (
    <div className="px-6 py-6 space-y-8 max-w-4xl mx-auto">

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
      <div className="flex items-end justify-between">
        <div>
          <Link
            href="/editor/rewards"
            className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium mb-1.5 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Rewards Dashboard
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-none">XP Shop</h1>
          <p className="text-sm text-gray-400 mt-1">Spend your XP on boosts and profile frames</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800">
          <Zap className="w-4 h-4 text-sky-500" />
          <span className="text-sm font-bold text-sky-600 dark:text-sky-400 tabular-nums">{xp.toLocaleString()} XP</span>
          <span className="text-[10px] text-sky-400 font-medium">available</span>
        </div>
      </div>

      {/* Note */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
        <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
        <span>XP spent here comes from your spendable balance — your level is based on lifetime XP and is never affected.</span>
      </div>

      {/* ── Boosts ──────────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">Boosts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {REGULAR_SHOP_ITEMS.map(item => {
            const isActive  = active.has(item.type);
            const canAfford = xp >= item.cost;
            const isLoading = buying === item.type;
            return (
              <div key={item.type} className={cn(
                "rounded-2xl border p-5 flex flex-col gap-3 transition-all",
                isActive
                  ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                  : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl leading-none">{item.emoji}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{item.label}</p>
                        {item.tag && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">
                            {item.tag}
                          </span>
                        )}
                        {item.maxPerMonth && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                            Max {item.maxPerMonth}×/mo
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {item.durationDays ? `${item.durationDays} days` : "Permanent"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Zap className="w-3.5 h-3.5 text-sky-500" />
                    <span className="text-sm font-extrabold tabular-nums text-sky-600 dark:text-sky-400">{item.cost}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                {item.tierNote && (
                  <div className="flex items-start gap-1.5 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/50 rounded-lg px-2.5 py-2 text-[11px] text-sky-700 dark:text-sky-400 font-medium">
                    <span className="shrink-0 mt-px">ℹ️</span>
                    <span>{item.tierNote}</span>
                  </div>
                )}
                {isActive ? (
                  <div className="flex items-center gap-2 mt-auto pt-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-semibold text-emerald-600">Active</span>
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-gray-400">
                      <Clock className="w-3 h-3" />{fmtExpiry(expiry[item.type])}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => purchaseBoost(item.type, item.cost)}
                    disabled={!canAfford || !!isLoading}
                    className={cn(
                      "mt-auto w-full py-2 rounded-xl text-xs font-bold transition-all",
                      canAfford
                        ? "bg-sky-500 hover:bg-sky-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {isLoading ? "Activating…" : canAfford ? `Redeem · ${item.cost} XP` : `Need ${item.cost - xp} more XP`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Portfolio Upgrade ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">Portfolio Upgrade</h2>
          <span className="text-xs text-gray-400">
            Current: <span className="font-bold text-gray-700 dark:text-gray-300">{portfolioSlots} slots</span>
          </span>
        </div>

        {/* Step progression indicator */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {PORTFOLIO_STEPS.map((slots, i) => {
            const reached = portfolioSlots >= slots;
            return (
              <Fragment key={slots}>
                <span className={cn(
                  "text-xs font-black px-3 py-1.5 rounded-full shrink-0 tabular-nums",
                  reached
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                )}>
                  {slots}
                </span>
                {i < PORTFOLIO_STEPS.length - 1 && (
                  <ChevronRight className={cn(
                    "w-3.5 h-3.5 shrink-0",
                    portfolioSlots >= PORTFOLIO_STEPS[i + 1]
                      ? "text-emerald-400"
                      : "text-gray-300 dark:text-gray-700"
                  )} />
                )}
              </Fragment>
            );
          })}
          <span className="ml-2 text-[10px] text-gray-400 shrink-0">max slots</span>
        </div>

        {/* Tier rows */}
        <div className="space-y-3">
          {PORTFOLIO_TIERS.map((item, idx) => {
            const isActive   = active.has(item.type);
            const reqOk      = !item.requiresActive || active.has(item.requiresActive);
            const canAfford  = xp >= item.cost;
            const isLoading  = buying === item.type;
            const slotBefore = PORTFOLIO_STEPS[idx];
            const slotAfter  = PORTFOLIO_STEPS[idx + 1];

            return (
              <div key={item.type} className={cn(
                "rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all",
                isActive
                  ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                  : !reqOk
                    ? "bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 opacity-70"
                    : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
              )}>
                {/* Tier label + description */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base",
                    isActive ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-gray-100 dark:bg-gray-800"
                  )}>
                    🖼️
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        Tier {idx + 1}
                      </p>
                      <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 px-2 py-0.5 rounded-full">
                        {slotBefore} → {slotAfter} slots
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{item.desc}</p>
                  </div>
                </div>

                {/* Cost + duration */}
                <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-0.5 shrink-0">
                  <div className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-sky-500" />
                    <span className="text-sm font-extrabold tabular-nums text-sky-600 dark:text-sky-400">{item.cost}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">{item.durationDays} days</span>
                </div>

                {/* Action */}
                <div className="shrink-0 sm:w-36">
                  {isActive ? (
                    <div className="flex items-center gap-1.5 justify-center py-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active · {fmtExpiry(expiry[item.type])}
                    </div>
                  ) : (
                    <button
                      onClick={() => purchaseBoost(item.type, item.cost)}
                      disabled={!canAfford || !reqOk || !!isLoading}
                      className={cn(
                        "w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                        canAfford && reqOk
                          ? "bg-sky-500 hover:bg-sky-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      {isLoading ? "Activating…" :
                        !reqOk    ? <><Lock className="w-3 h-3" /> Needs Tier {idx}</> :
                        !canAfford ? `Need ${item.cost - xp} XP` :
                        `Redeem · ${item.cost} XP`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Profile Frames ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">Profile Frames</h2>
          <p className="text-[11px] text-gray-400">Permanent unlocks · one active at a time</p>
        </div>

        {/* Active frame preview */}
        {currentFrame && (() => {
          const f = PROFILE_FRAMES.find(fr => fr.key === currentFrame);
          return f ? (
            <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 shrink-0" style={f.style} />
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{f.emoji} {f.label} — active on your profile</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Your active frame preference is saved</p>
              </div>
              <button
                onClick={() => setActiveFrame(null)}
                disabled={settingFrame === "__clear__"}
                className="text-[11px] text-gray-400 hover:text-red-500 font-medium transition-colors"
              >
                Remove
              </button>
            </div>
          ) : null;
        })()}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PROFILE_FRAMES.map(frame => {
            const isOwned   = owned.has(frame.key);
            const isActive  = currentFrame === frame.key;
            const canAfford = xp >= frame.cost;
            const isLoading = buying === frame.key;
            const isSetting = settingFrame === frame.key;

            return (
              <div key={frame.key} className={cn(
                "rounded-2xl border p-4 flex flex-col items-center gap-2.5 text-center transition-all",
                isActive
                  ? "bg-sky-50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-800"
                  : isOwned
                    ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                    : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800"
              )}>
                {/* Frame preview circle */}
                <div
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-2xl"
                  style={isOwned || isActive ? frame.style : { opacity: 0.4 }}
                >
                  {frame.emoji}
                </div>

                <div className="w-full space-y-0.5">
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{frame.label}</p>
                  {frame.tag && (
                    <span className="inline-block text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                      {frame.tag}
                    </span>
                  )}
                </div>

                {/* Perks */}
                {frame.perks && frame.perks.length > 0 && (
                  <div className="w-full space-y-1 text-left">
                    {frame.perks.map(perk => (
                      <div key={perk} className="flex items-start gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                        <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cost */}
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-sky-500" />
                  <span className={cn(
                    "text-xs font-bold tabular-nums",
                    isOwned ? "text-gray-400 line-through" : "text-sky-600 dark:text-sky-400"
                  )}>
                    {frame.cost}
                  </span>
                  {isOwned && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold ml-1">Owned</span>}
                </div>

                {/* Action */}
                {isActive ? (
                  <span className="w-full py-1.5 rounded-lg text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/30 text-center">
                    ✓ Active
                  </span>
                ) : isOwned ? (
                  <button
                    onClick={() => setActiveFrame(frame.key)}
                    disabled={!!isSetting}
                    className="w-full py-1.5 rounded-lg text-[11px] font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-80 transition-opacity"
                  >
                    {isSetting ? "…" : "Activate"}
                  </button>
                ) : (
                  <button
                    onClick={() => purchaseFrame(frame.key, frame.cost)}
                    disabled={!canAfford || !!isLoading}
                    className={cn(
                      "w-full py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1",
                      canAfford
                        ? "bg-sky-500 hover:bg-sky-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {isLoading ? "…" : canAfford ? "Unlock" : <><Lock className="w-3 h-3" />{frame.cost - xp} more</>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* How to earn more */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Need more XP?</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-400">
          {[
            ["🎬", "Complete an order",  "+50"],
            ["⭐", "5-star review",       "+25"],
            ["⚡", "Early delivery",      "+15"],
            ["🔥", "5-order streak",      "+100"],
            ["📅", "7-day login streak",  "+25"],
            ["🖼️", "Portfolio item",      "+15"],
          ].map(([emoji, label, xpVal]) => (
            <div key={label} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-gray-800">
              <span>{emoji}</span>
              <span className="flex-1 truncate">{label}</span>
              <span className="font-bold text-sky-500">{xpVal}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Spend History */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">Redemption History</h2>
        {localHistory.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center text-xs text-gray-400">
            No purchases logged yet. Redeem a boost or profile frame above to begin!
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-105 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 shadow-sm">
            {localHistory.map(tx => {
              const details = parseReason(tx.reason);
              return (
                <div key={tx.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl leading-none shrink-0">{details.emoji}</span>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{details.name}</p>
                      <p className="text-[10px] text-gray-450 mt-0.5">
                        {details.type} · {new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-red-500">
                    <span>{tx.amount} XP</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Immersive Success Confetti Overlay Modal */}
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
              {/* Confetti animation background effects */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-4 left-4 animate-bounce text-xl">🎉</div>
                <div className="absolute top-8 right-6 animate-pulse text-xl">✨</div>
                <div className="absolute bottom-6 left-12 animate-bounce text-xl">✨</div>
                <div className="absolute bottom-8 right-8 animate-pulse text-xl">🎉</div>
              </div>

              {/* Bounce check circle */}
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

              {/* XP Spent anchor */}
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-905 text-sky-600 dark:text-sky-400 font-extrabold text-sm mt-6 mb-8 shadow-sm">
                <Zap className="w-4 h-4 fill-sky-500 text-sky-500" />
                <span>{successItem.cost} XP spent</span>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSuccessItem(null)}
                className="w-full py-3 bg-[var(--brand-client)] hover:bg-[var(--brand-client-hover)] text-white text-xs font-bold rounded-2xl shadow-md transition-all active:scale-[0.98]"
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
