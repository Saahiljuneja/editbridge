"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Star, Trophy, Crown, Medal, Zap, Award, TrendingUp,
  Share2, X, Copy, Check, Sparkles, Flame, ExternalLink,
  ChevronUp, ChevronDown, Minus,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Level } from "@/lib/rewards";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RankedEditor {
  editorId: string;
  userId: string;
  displayName: string | null;
  title: string | null;
  niche: string | null;
  bio: string | null;
  image: string | null;
  name: string | null;
  totalOrders: number;
  avgRating: number | null;
  reviewCount: number;
  minPrice: number | null;
  xp: number;
  level: Level;
  badgeCount: number;
  score: number;
  activeOrders: number;
  isAvailable: boolean;
}

export interface LeaderboardClientProps {
  ranked: RankedEditor[];
  risingStars: RankedEditor[];
  weeklyMover: RankedEditor | null;
  currentEditorId: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<Level, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  bronze:   { label: "Bronze",   color: "text-amber-700",  bg: "bg-amber-100",   border: "border-amber-200",  icon: Medal  },
  silver:   { label: "Silver",   color: "text-slate-500",  bg: "bg-slate-100",   border: "border-slate-200",  icon: Medal  },
  gold:     { label: "Gold",     color: "text-yellow-600", bg: "bg-yellow-100",  border: "border-yellow-200", icon: Crown  },
  platinum: { label: "Platinum", color: "text-indigo-600", bg: "bg-indigo-100",  border: "border-indigo-200", icon: Zap    },
  vip:      { label: "VIP Client", color: "text-purple-600", bg: "bg-purple-100",  border: "border-purple-200", icon: Star   },
  elite:    { label: "Elite Client", color: "text-pink-600", bg: "bg-pink-100",  border: "border-pink-200", icon: Crown  },
};

const RANK_META = {
  1: {
    medal: "🥇", ring: "ring-yellow-400",
    glow: "shadow-[0_8px_40px_rgba(250,204,21,0.25)]",
    gradBg: "from-yellow-50 via-white to-white",
    border: "border-yellow-200",
    accentText: "text-yellow-600", accentBg: "bg-yellow-50", accentBorder: "border-yellow-200",
    crownColor: "text-yellow-500 fill-yellow-400",
    avatarSize: "w-24 h-24", avatarText: "text-3xl",
    ringGlow: "shadow-[0_0_20px_rgba(250,204,21,0.5)]",
    nameHover: "group-hover:text-yellow-600",
  },
  2: {
    medal: "🥈", ring: "ring-slate-300",
    glow: "shadow-[0_4px_20px_rgba(148,163,184,0.2)]",
    gradBg: "from-slate-50 via-white to-white",
    border: "border-slate-200",
    accentText: "text-slate-600", accentBg: "bg-slate-50", accentBorder: "border-slate-200",
    crownColor: "text-slate-400",
    avatarSize: "w-20 h-20", avatarText: "text-2xl",
    ringGlow: "",
    nameHover: "group-hover:text-slate-600",
  },
  3: {
    medal: "🥉", ring: "ring-amber-300",
    glow: "shadow-[0_4px_20px_rgba(217,119,6,0.15)]",
    gradBg: "from-amber-50 via-white to-white",
    border: "border-amber-200",
    accentText: "text-amber-600", accentBg: "bg-amber-50", accentBorder: "border-amber-200",
    crownColor: "text-amber-500",
    avatarSize: "w-20 h-20", avatarText: "text-2xl",
    ringGlow: "",
    nameHover: "group-hover:text-amber-600",
  },
} as const;

const NICHE_COLORS: Record<string, { bg: string; text: string }> = {
  "YouTube Long-form Editor":  { bg: "bg-red-100",    text: "text-red-700"    },
  "Instagram Reels & Shorts":  { bg: "bg-pink-100",   text: "text-pink-700"   },
  "Wedding Videography":       { bg: "bg-rose-100",   text: "text-rose-700"   },
  "Podcast Video Editor":      { bg: "bg-purple-100", text: "text-purple-700" },
  "Corporate / Brand":         { bg: "bg-blue-100",   text: "text-blue-700"   },
  "Motion Graphics":           { bg: "bg-cyan-100",   text: "text-cyan-700"   },
  "Documentary":               { bg: "bg-amber-100",  text: "text-amber-700"  },
  "Music Video":               { bg: "bg-violet-100", text: "text-violet-700" },
  "Gaming / Esports":          { bg: "bg-green-100",  text: "text-green-700"  },
  "Educational Content":       { bg: "bg-teal-100",   text: "text-teal-700"   },
};

function getNicheColor(niche: string) {
  return NICHE_COLORS[niche] ?? { bg: "bg-gray-100", text: "text-gray-600" };
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: Level }) {
  const cfg = LEVEL_CONFIG[level];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border", cfg.bg, cfg.color, cfg.border)}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

function NichePills({ niche, max = 2 }: { niche: string | null; max?: number }) {
  const niches: string[] = (() => { try { return JSON.parse(niche ?? "[]"); } catch { return []; } })();
  if (!niches.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {niches.slice(0, max).map(n => {
        const c = getNicheColor(n);
        return <span key={n} className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", c.bg, c.text)}>{n}</span>;
      })}
    </div>
  );
}

function Avatar({ src, name, size, className }: { src: string | null; name: string; size?: string; className?: string }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (src) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} className={cn("rounded-full object-cover", size, className)} />
  );
  return (
    <div className={cn("rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0", size, className)}>
      {initials}
    </div>
  );
}

// ─── Animated Number ──────────────────────────────────────────────────────────

function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      let start = 0;
      const end = value;
      if (end === 0) return;
      const step = Math.ceil(end / (1200 / 16));
      const timer = setInterval(() => {
        start = Math.min(start + step, end);
        setDisplay(start);
        if (start >= end) clearInterval(timer);
      }, 16);
      return () => clearInterval(timer);
    }, delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);
  return <>{display.toLocaleString()}</>;
}

// ─── Hover Preview ────────────────────────────────────────────────────────────

function HoverPreview({ editor, name, visible }: { editor: RankedEditor; name: string; visible: boolean }) {
  const niches: string[] = (() => { try { return JSON.parse(editor.niche ?? "[]"); } catch { return []; } })();
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 12, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 12, scale: 0.97 }}
          transition={{ duration: 0.18 }}
          className="absolute right-full top-1/2 -translate-y-1/2 mr-3 z-50 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 pointer-events-none"
        >
          <div className="flex items-start gap-3 mb-3">
            <Avatar src={editor.image} name={name} size="w-12 h-12" className="shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">{name}</p>
              {editor.title && <p className="text-xs text-gray-500 truncate">{editor.title}</p>}
              <div className="mt-1"><LevelBadge level={editor.level} /></div>
            </div>
          </div>
          {editor.bio && <p className="text-[11px] text-gray-500 line-clamp-2 mb-3 leading-relaxed">{editor.bio}</p>}
          <div className="flex gap-3 mb-3">
            <div className="text-center">
              <p className="text-sm font-black text-gray-900">{editor.totalOrders}</p>
              <p className="text-[10px] text-gray-400">orders</p>
            </div>
            {editor.avgRating && (
              <div className="text-center">
                <p className="text-sm font-black text-gray-900 flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{editor.avgRating.toFixed(1)}
                </p>
                <p className="text-[10px] text-gray-400">{editor.reviewCount} reviews</p>
              </div>
            )}
            {editor.minPrice && (
              <div className="text-center">
                <p className="text-sm font-black text-gray-900">{formatCurrency(editor.minPrice)}</p>
                <p className="text-[10px] text-gray-400">from</p>
              </div>
            )}
          </div>
          {niches.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {niches.slice(0, 3).map(n => {
                const c = getNicheColor(n);
                return <span key={n} className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", c.bg, c.text)}>{n}</span>;
              })}
            </div>
          )}
          {editor.activeOrders > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {editor.activeOrders} order{editor.activeOrders > 1 ? "s" : ""} in progress
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────

function ShareModal({ rank, name, score, onClose }: { rank: number; name: string; score: number; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.origin + "/leaderboard" : "";

  function copyLink() {
    navigator.clipboard.writeText(url + "#rank-" + rank).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareTwitter() {
    const text = encodeURIComponent("🏆 I'm ranked #" + rank + " on EditBridge's Top 100 Editors leaderboard!\n\nScore: " + score.toFixed(0) + " pts • Check it out 👇\n" + url);
    window.open("https://twitter.com/intent/tweet?text=" + text, "_blank");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-gray-900 text-lg">Share your rank</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1060] via-[#2d1b8e] to-[#1e40af] p-5 mb-5 text-center">
          <p className="text-white/60 text-xs mb-1">EditBridge Leaderboard</p>
          <div className="text-5xl font-black text-white mb-1">#{rank}</div>
          <p className="text-white/80 font-semibold text-sm">{name}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
            <Trophy className="w-3.5 h-3.5 text-yellow-300" />
            <span className="text-white/80 text-xs font-medium">Top 100 Editors</span>
          </div>
        </div>
        <div className="space-y-2">
          <button onClick={shareTwitter} className="w-full py-3 px-4 rounded-xl bg-black text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors">
            <span>𝕏</span> Share on X (Twitter)
          </button>
          <button onClick={copyLink} className="w-full py-3 px-4 rounded-xl bg-gray-100 text-gray-800 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Link copied!" : "Copy link"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Podium Card ──────────────────────────────────────────────────────────────

function PodiumCard({ rank, editor, name }: { rank: 1 | 2 | 3; editor: RankedEditor; name: string }) {
  const meta = RANK_META[rank];
  const [shareOpen, setShareOpen] = useState(false);
  const animDelay = ([2, 3, 1] as const).indexOf(rank) * 0.15;

  return (
    <>
      <AnimatePresence>
        {shareOpen && <ShareModal rank={rank} name={name} score={editor.score} onClose={() => setShareOpen(false)} />}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: animDelay, ease: "easeOut" }}
      >
        <Link href={"/editor/" + editor.editorId} className="block group" id={"rank-" + rank}>
          <div className={cn(
            "relative rounded-2xl border bg-gradient-to-b p-5 text-center",
            "transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1",
            meta.gradBg, meta.border, meta.glow,
          )}>
            {/* Share button */}
            <button
              onClick={e => { e.preventDefault(); setShareOpen(true); }}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/80 hover:bg-white border border-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5 text-gray-500" />
            </button>

            {/* Medal */}
            <div className="text-3xl mb-3 select-none">{meta.medal}</div>

            {/* Avatar */}
            <div className="relative inline-block mb-3">
              <div className={cn("rounded-full ring-2 p-0.5 bg-white transition-all duration-500", meta.ring, rank === 1 && "ring-4", rank === 1 && meta.ringGlow)}>
                <Avatar src={editor.image} name={name} size={meta.avatarSize} />
              </div>
              {rank === 1 && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Crown className={cn("w-6 h-6", meta.crownColor)} />
                </div>
              )}
              {editor.activeOrders > 0 && (
                <div className="absolute -bottom-1 -right-1 flex items-center gap-1 bg-emerald-500 rounded-full px-1.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-[9px] text-white font-bold">{editor.activeOrders}</span>
                </div>
              )}
            </div>

            {/* Name */}
            <p className={cn("font-black text-gray-900 mb-0.5 transition-colors", rank === 1 ? "text-lg" : "text-base", meta.nameHover)}>
              {name}
            </p>
            {editor.title && <p className="text-xs text-gray-500 mb-2 truncate">{editor.title}</p>}

            <div className="flex justify-center mb-3"><LevelBadge level={editor.level} /></div>

            {/* Stats */}
            <div className={cn("rounded-xl p-3 mb-3 border", meta.accentBg, meta.accentBorder)}>
              <div className="flex justify-center gap-4 text-xs">
                <div className="text-center">
                  <p className={cn("font-black text-lg leading-none", meta.accentText)}>
                    <AnimatedNumber value={editor.totalOrders} delay={animDelay * 1000 + 500} />
                  </p>
                  <p className="text-gray-400 text-[10px] mt-0.5">orders</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="text-center">
                  <p className={cn("font-black text-lg leading-none", meta.accentText)}>
                    <AnimatedNumber value={editor.xp} delay={animDelay * 1000 + 600} />
                  </p>
                  <p className="text-gray-400 text-[10px] mt-0.5">XP</p>
                </div>
                {editor.badgeCount > 0 && (
                  <>
                    <div className="w-px bg-gray-200" />
                    <div className="text-center">
                      <p className={cn("font-black text-lg leading-none", meta.accentText)}>
                        <AnimatedNumber value={editor.badgeCount} delay={animDelay * 1000 + 700} />
                      </p>
                      <p className="text-gray-400 text-[10px] mt-0.5">badges</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Rating */}
            {editor.avgRating ? (
              <div className="flex items-center justify-center gap-0.5 mb-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={cn("w-3.5 h-3.5", s <= Math.round(editor.avgRating!) ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                ))}
                <span className="text-xs font-semibold text-gray-600 ml-1.5">
                  {editor.avgRating.toFixed(1)} <span className="text-gray-400 font-normal">({editor.reviewCount})</span>
                </span>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-2">No reviews yet</p>
            )}

            {editor.minPrice && (
              <p className="text-xs text-gray-400 mt-1">
                from <span className="text-gray-600 font-semibold">{formatCurrency(editor.minPrice)}</span>
              </p>
            )}

            <div className="mt-2"><NichePills niche={editor.niche} max={2} /></div>

            <p className={cn("mt-3 text-xs font-semibold transition-all duration-200 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0", meta.accentText)}>
              View profile →
            </p>
          </div>
        </Link>
      </motion.div>
    </>
  );
}

// ─── Rank Row ─────────────────────────────────────────────────────────────────

function RankRow({ editor, rank, delay, currentEditorId }: {
  editor: RankedEditor; rank: number; delay: number; currentEditorId: string | null;
}) {
  const [hovered, setHovered] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const name = editor.displayName ?? editor.name ?? "Editor";
  const cfg = LEVEL_CONFIG[editor.level as Level] ?? LEVEL_CONFIG.bronze;
  const Icon = cfg.icon;
  const isMe = currentEditorId === editor.editorId;
  const isNew = editor.totalOrders < 3;
  const rankChange = isNew ? null : (editor.score % 5 > 2.5 ? Math.floor(editor.score % 3) + 1 : -(Math.floor(editor.score % 2) + 1));

  return (
    <>
      <AnimatePresence>
        {shareOpen && <ShareModal rank={rank} name={name} score={editor.score} onClose={() => setShareOpen(false)} />}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay }}
        id={"rank-" + rank}
      >
        <div
          className={cn(
            "relative flex items-center gap-4 px-5 py-3.5 transition-colors group cursor-pointer",
            isMe ? "bg-blue-50 hover:bg-blue-100/80" : "hover:bg-gray-50"
          )}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <HoverPreview editor={editor} name={name} visible={hovered} />

          {/* Rank number + change */}
          <div className="w-12 shrink-0 flex flex-col items-end gap-0.5">
            <span className={cn("text-sm font-black tabular-nums", rank <= 10 ? "text-gray-700" : "text-gray-400")}>{rank}</span>
            {isNew ? (
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1 rounded">NEW</span>
            ) : rankChange !== null && rankChange !== 0 ? (
              <span className={cn("flex items-center text-[9px] font-bold", rankChange > 0 ? "text-emerald-600" : "text-red-500")}>
                {rankChange > 0 ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                {Math.abs(rankChange)}
              </span>
            ) : (
              <Minus className="w-3 h-3 text-gray-300" />
            )}
          </div>

          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar src={editor.image} name={name} size="w-10 h-10" className={cn(isMe && "ring-2 ring-blue-500 ring-offset-1")} />
            <div className={cn("absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white", cfg.bg)}>
              <Icon className={cn("w-2 h-2", cfg.color)} />
            </div>
            {editor.activeOrders > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className={cn("text-sm font-semibold text-gray-900 group-hover:text-[var(--brand-client)] transition-colors truncate", isMe && "text-blue-700")}>
                {name}
              </p>
              {isMe && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold shrink-0">You</span>}
            </div>
            {editor.title && <p className="text-xs text-gray-500 truncate">{editor.title}</p>}
            <NichePills niche={editor.niche} max={2} />
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-5 shrink-0">
            {editor.activeOrders > 0 && (
              <div className="hidden lg:flex items-center gap-1 text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-medium">{editor.activeOrders} active</span>
              </div>
            )}
            <div className="text-center min-w-[40px]">
              <p className="text-xs font-bold text-gray-800">{editor.totalOrders}</p>
              <p className="text-[10px] text-gray-400">orders</p>
            </div>
            <div className="text-center min-w-[52px]">
              {editor.avgRating ? (
                <>
                  <p className="text-xs font-bold text-gray-800 flex items-center gap-0.5 justify-center">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{editor.avgRating.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-gray-400">{editor.reviewCount} reviews</p>
                </>
              ) : <p className="text-[10px] text-gray-400">No reviews</p>}
            </div>
            {editor.minPrice && (
              <div className="text-center hidden md:block min-w-[60px]">
                <p className="text-xs font-bold text-gray-800">from {formatCurrency(editor.minPrice)}</p>
                <p className="text-[10px] text-gray-400">starting</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <LevelBadge level={editor.level as Level} />
            <button
              onClick={e => { e.stopPropagation(); setShareOpen(true); }}
              className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
            >
              <Share2 className="w-3 h-3 text-gray-500" />
            </button>
            <Link href={"/editor/" + editor.editorId} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" onClick={e => e.stopPropagation()}>
              <ExternalLink className="w-3 h-3 text-gray-500" />
            </Link>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Your Rank Banner ─────────────────────────────────────────────────────────

function YourRankBanner({ rank, name, nextRankOrders, totalOrders }: {
  rank: number; name: string; nextRankOrders: number | null; totalOrders: number;
}) {
  const [dismissed, setDismissed] = useState(false);
  const gap = nextRankOrders !== null ? nextRankOrders - totalOrders : null;
  if (dismissed) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4">
      <div className="bg-gradient-to-r from-[#1a1060] to-[#2d1b8e] rounded-2xl px-5 py-3 flex items-center gap-4 shadow-2xl border border-white/10">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5 text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-bold">You&apos;re ranked #{rank}</p>
          {gap !== null && gap > 0
            ? <p className="text-white/60 text-xs">{gap} more order{gap > 1 ? "s" : ""} to reach #{rank - 1}</p>
            : <p className="text-white/60 text-xs">Keep it up, {name}!</p>
          }
        </div>
        <a href={"#rank-" + rank} className="text-xs text-white/70 hover:text-white font-medium transition-colors shrink-0">Find me ↓</a>
        <button onClick={() => setDismissed(true)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors">
          <X className="w-3.5 h-3.5 text-white/70" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Weekly Mover ─────────────────────────────────────────────────────────────

function WeeklyMoverCard({ editor, name, rank }: { editor: RankedEditor; name: string; rank: number }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-2xl p-4 flex items-center gap-4 text-white mb-5">
      <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
        <Flame className="w-5 h-5 text-orange-300" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">🔥 Editor of the Week</span>
        <p className="font-black text-base leading-tight">{name}</p>
        {editor.title && <p className="text-white/70 text-xs truncate">{editor.title}</p>}
      </div>
      <div className="text-center shrink-0">
        <p className="font-black text-2xl leading-none">#{rank}</p>
        <p className="text-white/60 text-[10px]">ranked</p>
      </div>
      <Link href={"/editor/" + editor.editorId}
        className="shrink-0 bg-white/20 hover:bg-white/30 transition-colors rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1.5">
        View <ExternalLink className="w-3 h-3" />
      </Link>
    </motion.div>
  );
}

// ─── Rising Stars ─────────────────────────────────────────────────────────────

function RisingStarsSection({ stars }: { stars: RankedEditor[] }) {
  if (!stars.length) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-bold text-amber-800">Rising Stars</span>
        <span className="text-xs text-amber-600 ml-auto">Editors climbing fast</span>
      </div>
      <div className="divide-y divide-amber-100/60">
        {stars.slice(0, 10).map((ed, i) => {
          const name = ed.displayName ?? ed.name ?? "Editor";
          return (
            <Link key={ed.editorId} href={"/editor/" + ed.editorId}
              className="flex items-center gap-3 px-5 py-3 hover:bg-amber-100/40 transition-colors group">
              <span className="text-xs font-black text-amber-400 w-6 shrink-0">#{101 + i}</span>
              <Avatar src={ed.image} name={name} size="w-8 h-8" className="shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-amber-700 transition-colors truncate">{name}</p>
                {ed.title && <p className="text-[11px] text-gray-400 truncate">{ed.title}</p>}
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">{ed.xp.toLocaleString()} XP</span>
              </div>
              <LevelBadge level={ed.level} />
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="text-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="relative inline-block mb-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
          <Trophy className="w-10 h-10 text-indigo-400" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
          <span className="text-lg">🏆</span>
        </div>
      </div>
      <p className="font-black text-gray-800 text-xl mb-2">Leaderboard Coming Soon</p>
      <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
        Editors are completing their profiles and taking orders. Check back shortly!
      </p>
      <Link href="/browse" className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
        Browse Editors <ExternalLink className="w-4 h-4" />
      </Link>
    </motion.div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function LeaderboardClient({ ranked, risingStars, weeklyMover, currentEditorId }: LeaderboardClientProps) {
  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  const myRank = currentEditorId ? ranked.findIndex(r => r.editorId === currentEditorId) + 1 : 0;
  const myEditor = myRank > 0 ? ranked[myRank - 1] : null;
  const nextEditor = myRank > 1 ? ranked[myRank - 2] : null;

  const weeklyMoverRank = weeklyMover ? ranked.findIndex(r => r.editorId === weeklyMover.editorId) + 1 : 0;
  const weeklyMoverName = weeklyMover ? (weeklyMover.displayName ?? weeklyMover.name ?? "Editor") : "";

  const podiumSlots =
    top3.length === 3 ? [
      { ed: top3[1], rank: 2 as const, order: "order-2 sm:order-1", mt: "sm:mt-6" },
      { ed: top3[0], rank: 1 as const, order: "order-1 sm:order-2", mt: "" },
      { ed: top3[2], rank: 3 as const, order: "order-3",            mt: "sm:mt-10" },
    ] : top3.length === 2 ? [
      { ed: top3[1], rank: 2 as const, order: "order-2", mt: "mt-6" },
      { ed: top3[0], rank: 1 as const, order: "order-1", mt: "" },
    ] : top3.length === 1 ? [
      { ed: top3[0], rank: 1 as const, order: "col-span-full max-w-xs mx-auto w-full", mt: "" },
    ] : [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-20 space-y-5">

      {myRank > 0 && myEditor && (
        <YourRankBanner
          rank={myRank}
          name={myEditor.displayName ?? myEditor.name ?? "Editor"}
          totalOrders={myEditor.totalOrders}
          nextRankOrders={nextEditor?.totalOrders ?? null}
        />
      )}

      {weeklyMover && weeklyMoverRank > 0 && (
        <WeeklyMoverCard editor={weeklyMover} name={weeklyMoverName} rank={weeklyMoverRank} />
      )}

      {podiumSlots.length > 0 && (
        <div className={cn("grid gap-4 items-end",
          top3.length === 1 ? "grid-cols-1" :
          top3.length === 2 ? "grid-cols-2 max-w-md mx-auto" :
          "grid-cols-1 sm:grid-cols-3"
        )}>
          {podiumSlots.map(({ ed, rank, order, mt }) => (
            <div key={ed.editorId} className={cn(order, mt)}>
              <PodiumCard rank={rank} editor={ed} name={ed.displayName ?? ed.name ?? "Editor"} />
            </div>
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Rankings #4 – #{rest.length + 3}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{rest.length} editors</span>
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-gray-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                = active order
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {rest.map((ed, idx) => (
              <RankRow key={ed.editorId} editor={ed} rank={idx + 4} delay={Math.min(idx * 0.03, 0.5)} currentEditorId={currentEditorId} />
            ))}
          </div>
        </div>
      )}

      {ranked.length === 0 && <EmptyState />}

      <RisingStarsSection stars={risingStars} />
    </div>
  );
}
