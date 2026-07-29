"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap, CheckCircle2, Clock, AlertCircle, Lock,
  Sparkles, RefreshCw, Gift, ArrowLeft, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CLIENT_STORE_ITEMS, PATRON_BADGES } from "@/lib/client-xp-store-config";
import type { ClientItemType, PatronBadgeKey } from "@/lib/client-xp-store-config";

const ACCENT = "#0EA5E9";

interface Props {
  currentXp:          number;
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

      if (type === "xp_credit_swap") {
        showToast("₹50 credit added — applied at next checkout!", true);
      } else {
        setActive(p => new Set([...p, type]));
        const item = CLIENT_STORE_ITEMS.find(i => i.type === type);
        if (item?.durationDays) {
          setExpiry(p => ({
            ...p,
            [type]: new Date(Date.now() + item.durationDays! * 86_400_000).toISOString(),
          }));
        }
        showToast("Redeemed! Boost is now active.", true);
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
      showToast("Patron badge unlocked!", true);
      router.refresh();
    } finally {
      setBuying(null);
    }
  }

  // Separate credit swap from the rest
  const boostItems  = CLIENT_STORE_ITEMS.filter(i => i.type !== "xp_credit_swap");
  const creditSwap  = CLIENT_STORE_ITEMS.find(i => i.type === "xp_credit_swap")!;

  return (
    <div className="px-6 py-6 space-y-8 max-w-4xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg flex items-center gap-2",
          toast.ok ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
        )}>
          {toast.ok
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />
          }
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <Link
            href="/client/rewards"
            className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 font-medium mb-1.5 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Rewards Dashboard
          </Link>
          <h1 className="text-xl font-bold text-gray-900 leading-none">XP Store</h1>
          <p className="text-sm text-gray-400 mt-1">Spend your XP on boosts, perks, and patron status</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border"
          style={{ background: `${ACCENT}08`, borderColor: `${ACCENT}25` }}>
          <Zap className="w-4 h-4" style={{ color: ACCENT }} />
          <span className="text-sm font-bold tabular-nums" style={{ color: ACCENT }}>
            {xp.toLocaleString()} XP
          </span>
          <span className="text-[10px] text-gray-400 font-medium">available</span>
        </div>
      </div>

      {/* Spendable note */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
        <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
        <span>XP spent here comes from your spendable balance — your membership level is based on lifetime XP and is never affected.</span>
      </div>

      {/* ── Service Boosts ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-700">Service Boosts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {boostItems.map(item => {
            const isActive   = active.has(item.type);
            const canAfford  = xp >= item.cost;
            const isLoading  = buying === item.type;
            const expDisplay = fmtExpiry(expiry[item.type]);

            return (
              <div
                key={item.type}
                className={cn(
                  "rounded-2xl border p-5 flex flex-col gap-3 transition-all",
                  isActive
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-white border-gray-100"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl leading-none">{item.emoji}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900">{item.label}</p>
                        {item.tag && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-600">
                            {item.tag}
                          </span>
                        )}
                        {item.maxPerMonth && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">
                            Max {item.maxPerMonth}×/mo
                          </span>
                        )}
                        {item.isToken && !item.maxPerMonth && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">
                            Token
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {item.durationDays ? `${item.durationDays} days` : "Single use"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Zap className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                    <span className="text-sm font-extrabold tabular-nums" style={{ color: ACCENT }}>
                      {item.cost}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>

                {isActive ? (
                  <div className="mt-auto pt-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-xs font-semibold text-emerald-600">Active</span>
                      {expDisplay && (
                        <span className="ml-auto flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock className="w-3 h-3" />{expDisplay}
                        </span>
                      )}
                    </div>
                    {item.isToken && (
                      <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg bg-sky-50 border border-sky-100 text-[10px] text-sky-700 leading-snug">
                        <Info className="w-3 h-3 shrink-0 mt-px" />
                        This token applies automatically when you place your next qualifying order. No action needed.
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => redeemItem(item.type, item.cost)}
                    disabled={!canAfford || !!isLoading}
                    className={cn(
                      "mt-auto w-full py-2 rounded-xl text-xs font-bold transition-all",
                      canAfford
                        ? "text-white hover:opacity-90"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                    style={canAfford ? { background: ACCENT } : {}}
                  >
                    {isLoading
                      ? "Redeeming…"
                      : canAfford
                        ? `Redeem · ${item.cost} XP`
                        : `Need ${item.cost - xp} more XP`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── XP → Credit ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-3">Convert XP to Credit</h2>
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0 text-3xl">
              {creditSwap.emoji}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-gray-900">{creditSwap.label}</p>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">
                  Max {creditSwap.maxPerMonth}×/mo
                </span>
                <span className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                  swapUsedThisMonth >= (creditSwap.maxPerMonth ?? 3)
                    ? "bg-red-100 text-red-600"
                    : "bg-gray-100 text-gray-500"
                )}>
                  {swapUsedThisMonth} / {creditSwap.maxPerMonth} used this month
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed max-w-sm">{creditSwap.desc}</p>
              <div className="flex items-center gap-3 pt-0.5">
                <div className="flex items-center gap-1 text-xs font-bold" style={{ color: ACCENT }}>
                  <Zap className="w-3.5 h-3.5" />
                  <span>150 XP</span>
                </div>
                <RefreshCw className="w-3 h-3 text-gray-400" />
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <Gift className="w-3.5 h-3.5" />
                  <span>₹50 credit</span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => redeemItem("xp_credit_swap", creditSwap.cost)}
            disabled={xp < creditSwap.cost || buying === "xp_credit_swap"}
            className={cn(
              "shrink-0 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              xp >= creditSwap.cost
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {buying === "xp_credit_swap"
              ? "Converting…"
              : xp >= creditSwap.cost
                ? "Convert Now"
                : `Need ${creditSwap.cost - xp} more XP`}
          </button>
        </div>
      </section>

      {/* ── Patron Badges ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-gray-700">Patron Badges</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Permanent unlocks · shown on your orders. If you own multiple, your highest-tier badge is displayed.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PATRON_BADGES.map(badge => {
            const isOwned   = owned.has(badge.key);
            const canAfford = xp >= badge.cost;
            const isLoading = buying === badge.key;

            return (
              <div
                key={badge.key}
                className={cn(
                  "rounded-2xl border p-4 flex flex-col items-center gap-2.5 text-center transition-all",
                  isOwned
                    ? "bg-white border-gray-200"
                    : "bg-gray-50 border-gray-100"
                )}
              >
                {/* Badge preview */}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                  style={{
                    background: "linear-gradient(135deg, #e0f2fe, #bae6fd)",
                    ...(isOwned ? badge.style : { opacity: 0.35 }),
                  }}
                >
                  {badge.emoji}
                </div>

                <div className="w-full space-y-0.5">
                  <p className="text-xs font-bold text-gray-800">{badge.label}</p>
                  {badge.tag && (
                    <span className="inline-block text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">
                      {badge.tag}
                    </span>
                  )}
                </div>

                {/* Perks */}
                {badge.perks && badge.perks.length > 0 && (
                  <div className="w-full space-y-1 text-left">
                    {badge.perks.map(perk => (
                      <div key={perk} className="flex items-start gap-1.5 text-[10px] text-gray-500">
                        <span className="w-1 h-1 rounded-full bg-sky-400 shrink-0 mt-1.5" />
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cost */}
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" style={{ color: ACCENT }} />
                  <span className={cn(
                    "text-xs font-bold tabular-nums",
                    isOwned ? "text-gray-400 line-through" : ""
                  )} style={isOwned ? {} : { color: ACCENT }}>
                    {badge.cost}
                  </span>
                  {isOwned && (
                    <span className="text-[10px] text-emerald-600 font-semibold ml-1">Owned</span>
                  )}
                </div>

                {/* Action */}
                {isOwned ? (
                  <span className="w-full py-1.5 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-100 text-center">
                    ✓ Unlocked
                  </span>
                ) : (
                  <button
                    onClick={() => redeemBadge(badge.key, badge.cost)}
                    disabled={!canAfford || !!isLoading}
                    className={cn(
                      "w-full py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1",
                      canAfford
                        ? "text-white hover:opacity-90"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                    style={canAfford ? { background: ACCENT } : {}}
                  >
                    {isLoading
                      ? "…"
                      : canAfford
                        ? "Unlock"
                        : <><Lock className="w-3 h-3" />{badge.cost - xp} more</>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How to earn more XP ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Need more XP?</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-500">
          {[
            ["🛍️", "Place an Order",      "+20"],
            ["✍️", "Leave a Review",       "+20"],
            ["🤝", "Repeat Editor Bonus",  "+30"],
            ["📅", "7-Day Login Streak",   "+25"],
            ["🎁", "Refer a Friend",       "+25"],
            ["🏆", "10th Order",           "₹200"],
          ].map(([emoji, label, xpVal]) => (
            <div key={label} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-gray-50">
              <span>{emoji}</span>
              <span className="flex-1 truncate">{label}</span>
              <span className="font-bold" style={{ color: ACCENT }}>{xpVal}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
