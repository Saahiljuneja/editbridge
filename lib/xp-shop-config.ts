// Client-safe: no DB imports

export type BoostType =
  | "featured_boost"
  | "extra_package_slot"
  | "profile_highlight"
  | "extended_portfolio"   // portfolio tier 1: 5 → 8 slots
  | "portfolio_tier2"      // portfolio tier 2: 8 → 12 slots
  | "portfolio_tier3"      // portfolio tier 3: 12 → 20 slots
  | "badge_frame";

export type FrameKey =
  | "frame_bronze"
  | "frame_silver"
  | "frame_gold"
  | "frame_diamond"
  | "frame_fire"
  | "frame_electric"
  | "frame_ocean"
  | "frame_sakura";

export interface ShopItem {
  type: BoostType;
  label: string;
  emoji: string;
  desc: string;
  cost: number;
  durationDays: number | null;
  tag?: string;
  maxPerMonth?: number;        // monthly purchase cap — enforced server-side
  tierNote?: string;           // restriction blurb shown under description
  requiresActive?: BoostType;  // must have this boost active to purchase
}

export interface FrameItem {
  key: FrameKey;
  label: string;
  emoji: string;
  desc: string;
  cost: number;
  style: React.CSSProperties;
  tag?: string;
  perks?: string[];            // cosmetic / informational perk bullets
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    type: "featured_boost",
    label: "Featured Boost",
    emoji: "🔝",
    desc: "Your profile appears at the top of browse results for 3 days. High visibility — limited to prevent saturation.",
    cost: 1000,
    durationDays: 3,
    tag: "Popular",
    maxPerMonth: 2,
  },
  {
    type: "extra_package_slot",
    label: "Extra Package Slot",
    emoji: "📦",
    desc: "Add one extra service package beyond your current tier cap for 30 days.",
    cost: 400,
    durationDays: 30,
    tierNote: "Bronze 3→4 · Silver 4→5 · Gold+ already at cap",
  },
  {
    type: "profile_highlight",
    label: "Profile Highlight",
    emoji: "✨",
    desc: "A glowing border appears around your card in browse results for 7 days.",
    cost: 200,
    durationDays: 7,
  },
  {
    type: "extended_portfolio",
    label: "Portfolio Boost — Tier 1",
    emoji: "🖼️",
    desc: "Expand from 5 to 8 portfolio slots on your public profile.",
    cost: 250,
    durationDays: 30,
  },
  {
    type: "portfolio_tier2",
    label: "Portfolio Boost — Tier 2",
    emoji: "🖼️",
    desc: "Expand from 8 to 12 portfolio slots. Requires Tier 1 to be active.",
    cost: 400,
    durationDays: 30,
    requiresActive: "extended_portfolio",
  },
  {
    type: "portfolio_tier3",
    label: "Portfolio Boost — Tier 3",
    emoji: "🖼️",
    desc: "Expand from 12 to 20 portfolio slots. Requires Tier 2 to be active.",
    cost: 700,
    durationDays: 30,
    requiresActive: "portfolio_tier2",
  },
  {
    type: "badge_frame",
    label: "Custom Badge Frame",
    emoji: "🏆",
    desc: "A permanent golden frame around your earned badges on your public profile.",
    cost: 600,
    durationDays: null,
  },
];

export const PORTFOLIO_TIERS = SHOP_ITEMS.filter(i =>
  i.type === "extended_portfolio" || i.type === "portfolio_tier2" || i.type === "portfolio_tier3"
);

export const REGULAR_SHOP_ITEMS = SHOP_ITEMS.filter(i =>
  i.type !== "extended_portfolio" && i.type !== "portfolio_tier2" && i.type !== "portfolio_tier3"
);

/** Given the set of active boost types, return the current portfolio slot count. */
export function getPortfolioSlots(activeTypes: Set<string>): number {
  if (activeTypes.has("portfolio_tier3")) return 20;
  if (activeTypes.has("portfolio_tier2")) return 12;
  if (activeTypes.has("extended_portfolio")) return 8;
  return 5;
}

export const PROFILE_FRAMES: FrameItem[] = [
  {
    key: "frame_bronze",
    label: "Bronze Ring",
    emoji: "🥉",
    desc: "A solid amber ring around your avatar.",
    cost: 200,
    style: { boxShadow: "0 0 0 3px #D97706, 0 0 10px rgba(217,119,6,0.3)" },
    perks: ["+1% profile CTR badge on your card"],
  },
  {
    key: "frame_silver",
    label: "Silver Ring",
    emoji: "🥈",
    desc: "A sleek silver shimmer ring.",
    cost: 350,
    style: { boxShadow: "0 0 0 3px #9CA3AF, 0 0 12px rgba(156,163,175,0.4)" },
  },
  {
    key: "frame_gold",
    label: "Gold Ring",
    emoji: "🥇",
    desc: "A rich golden glow ring.",
    cost: 600,
    style: { boxShadow: "0 0 0 3px #F59E0B, 0 0 0 6px rgba(245,158,11,0.3), 0 0 20px rgba(245,158,11,0.4)" },
    tag: "Popular",
    perks: ["Gold profile border", "Gold username glow on profile"],
  },
  {
    key: "frame_diamond",
    label: "Diamond",
    emoji: "💎",
    desc: "A brilliant blue-cyan diamond shimmer.",
    cost: 900,
    style: { boxShadow: "0 0 0 3px #06B6D4, 0 0 0 6px rgba(6,182,212,0.3), 0 0 20px rgba(6,182,212,0.5)" },
    tag: "Premium",
    perks: ["Animated glow ring", "Sparkle effect on profile card"],
  },
  {
    key: "frame_fire",
    label: "Fire",
    emoji: "🔥",
    desc: "An intense orange-red fire glow.",
    cost: 750,
    style: { boxShadow: "0 0 0 3px #EF4444, 0 0 0 6px rgba(251,146,60,0.4), 0 0 24px rgba(239,68,68,0.5)" },
  },
  {
    key: "frame_electric",
    label: "Electric",
    emoji: "⚡",
    desc: "A purple-blue electric pulse ring.",
    cost: 700,
    style: { boxShadow: "0 0 0 3px #8B5CF6, 0 0 0 6px rgba(139,92,246,0.3), 0 0 20px rgba(99,102,241,0.5)" },
  },
  {
    key: "frame_ocean",
    label: "Ocean",
    emoji: "🌊",
    desc: "A deep teal ocean wave glow.",
    cost: 500,
    style: { boxShadow: "0 0 0 3px #1e40af, 0 0 0 6px rgba(14,165,233,0.3), 0 0 18px rgba(14,165,233,0.4)" },
  },
  {
    key: "frame_sakura",
    label: "Sakura",
    emoji: "🌸",
    desc: "A soft pink sakura blossom glow.",
    cost: 450,
    style: { boxShadow: "0 0 0 3px #EC4899, 0 0 0 6px rgba(236,72,153,0.25), 0 0 18px rgba(236,72,153,0.35)" },
  },
];

// Map for quick server-side style lookup (plain objects, no React types)
export const FRAME_STYLES: Record<FrameKey, string> = {
  frame_bronze:   "0 0 0 3px #D97706, 0 0 10px rgba(217,119,6,0.3)",
  frame_silver:   "0 0 0 3px #9CA3AF, 0 0 12px rgba(156,163,175,0.4)",
  frame_gold:     "0 0 0 3px #F59E0B, 0 0 0 6px rgba(245,158,11,0.3), 0 0 20px rgba(245,158,11,0.4)",
  frame_diamond:  "0 0 0 3px #06B6D4, 0 0 0 6px rgba(6,182,212,0.3), 0 0 20px rgba(6,182,212,0.5)",
  frame_fire:     "0 0 0 3px #EF4444, 0 0 0 6px rgba(251,146,60,0.4), 0 0 24px rgba(239,68,68,0.5)",
  frame_electric: "0 0 0 3px #8B5CF6, 0 0 0 6px rgba(139,92,246,0.3), 0 0 20px rgba(99,102,241,0.5)",
  frame_ocean:    "0 0 0 3px #1e40af, 0 0 0 6px rgba(14,165,233,0.3), 0 0 18px rgba(14,165,233,0.4)",
  frame_sakura:   "0 0 0 3px #EC4899, 0 0 0 6px rgba(236,72,153,0.25), 0 0 18px rgba(236,72,153,0.35)",
};
