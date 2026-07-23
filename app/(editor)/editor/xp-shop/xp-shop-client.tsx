"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, CheckCircle2, Clock, Sparkles, Lock } from "lucide-react";
import { SHOP_ITEMS, PROFILE_FRAMES, type BoostType, type FrameKey } from "@/lib/xp-shop-config";

interface Props {
  currentXp: number;
  activeTypes: string[];
  boostExpiry: Record<string, string | null>;
  ownedFrames: string[];
  activeFrame: string | null;
}

function fmtExpiry(iso: string | null | undefined) {
  if (!iso) return "Permanent";
  return `Expires ${new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

export function XpShopClient({ currentXp, activeTypes, boostExpiry, ownedFrames, activeFrame: initialActiveFrame }: Props) {
  const router = useRouter();
  const [xp, setXp]               = useState(currentXp);
  const [active, setActive]        = useState(new Set(activeTypes));
  const [expiry, setExpiry]        = useState<Record<string, string | null>>(boostExpiry);
  const [owned, setOwned]          = useState(new Set(ownedFrames));
  const [currentFrame, setCurrentFrame] = useState<string | null>(initialActiveFrame);
  const [buying, setBuying]        = useState<string | null>(null);
  const [settingFrame, setSettingFrame] = useState<string | null>(null);
  const [toast, setToast]          = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
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
      showToast("Boost activated!", true);
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
      showToast("Frame unlocked! Activate it below.", true);
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

  return (
    <div className="px-8 py-6 space-y-8">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg ${
          toast.ok ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Editor</p>
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
        <span>XP spent here comes from your spendable balance â€” your level is based on lifetime XP and is never affected.</span>
      </div>

      {/* â”€â”€ Boosts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">Boosts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SHOP_ITEMS.map(item => {
            const isActive  = active.has(item.type);
            const canAfford = xp >= item.cost;
            const isLoading = buying === item.type;
            return (
              <div key={item.type} className={`rounded-2xl border p-5 flex flex-col gap-3 transition-all ${
                isActive
                  ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                  : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl leading-none">{item.emoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{item.label}</p>
                        {item.tag && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-600">
                            {item.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.durationDays ? `${item.durationDays} days` : "Permanent"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Zap className="w-3.5 h-3.5 text-sky-500" />
                    <span className="text-sm font-extrabold tabular-nums text-sky-600 dark:text-sky-400">{item.cost}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
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
                    className={`mt-auto w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      canAfford ? "bg-sky-500 hover:bg-sky-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isLoading ? "Activatingâ€¦" : canAfford ? `Buy for ${item.cost} XP` : `Need ${item.cost - xp} more XP`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* â”€â”€ Profile Frames â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">Profile Frames</h2>
          <p className="text-[11px] text-gray-400">Permanent unlocks Â· one active at a time</p>
        </div>

        {/* Active frame preview */}
        {currentFrame && (() => {
          const f = PROFILE_FRAMES.find(fr => fr.key === currentFrame);
          return f ? (
            <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 shrink-0" style={f.style} />
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{f.emoji} {f.label} â€” active on your profile</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Visible to all clients who view your profile</p>
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
              <div key={frame.key} className={`rounded-2xl border p-4 flex flex-col items-center gap-2.5 text-center transition-all ${
                isActive
                  ? "bg-sky-50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-800"
                  : isOwned
                    ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                    : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800"
              }`}>
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
                    <span className="inline-block text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                      {frame.tag}
                    </span>
                  )}
                </div>

                {/* Cost */}
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-sky-500" />
                  <span className={`text-xs font-bold tabular-nums ${isOwned ? "text-gray-400 line-through" : "text-sky-600 dark:text-sky-400"}`}>
                    {frame.cost}
                  </span>
                  {isOwned && <span className="text-[10px] text-emerald-600 font-semibold ml-1">Owned</span>}
                </div>

                {/* Action */}
                {isActive ? (
                  <span className="w-full py-1.5 rounded-lg text-[11px] font-bold text-sky-600 bg-sky-100 dark:bg-sky-900/30 text-center">
                    âœ“ Active
                  </span>
                ) : isOwned ? (
                  <button
                    onClick={() => setActiveFrame(frame.key)}
                    disabled={!!isSetting}
                    className="w-full py-1.5 rounded-lg text-[11px] font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-80 transition-opacity"
                  >
                    {isSetting ? "â€¦" : "Activate"}
                  </button>
                ) : (
                  <button
                    onClick={() => purchaseFrame(frame.key, frame.cost)}
                    disabled={!canAfford || !!isLoading}
                    className={`w-full py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                      canAfford
                        ? "bg-sky-500 hover:bg-sky-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isLoading ? "â€¦" : canAfford ? "Unlock" : <><Lock className="w-3 h-3" />{frame.cost - xp} more</>}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-500">
          {[
            ["ðŸŽ¬", "Complete an order", "+50"],
            ["â­", "5-star review", "+25"],
            ["âš¡", "Early delivery", "+15"],
            ["ðŸ“‹", "Answer a quote", "+10"],
            ["ðŸ’¬", "Reply to Q&A", "+5"],
            ["ðŸ–¼ï¸", "Add portfolio item", "+15"],
          ].map(([emoji, label, xpVal]) => (
            <div key={label} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-gray-800">
              <span>{emoji}</span>
              <span className="flex-1 truncate">{label}</span>
              <span className="font-bold text-sky-500">{xpVal}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
