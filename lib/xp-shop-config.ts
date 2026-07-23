// Client-safe: no DB imports

export type BoostType =
  | "featured_boost"
  | "extra_package_slot"
  | "profile_highlight"
  | "extended_portfolio"
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
}

export interface FrameItem {
  key: FrameKey;
  label: string;
  emoji: string;
  desc: string;
  cost: number;
  style: React.CSSProperties;
  tag?: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    type: "featured_boost",
    label: "Featured Boost",
    emoji: "🔝",
    desc: "Your profile appears at the top of browse results for 7 days.",
    cost: 500,
    durationDays: 7,
    tag: "Popular",
  },
  {
    type: "extra_package_slot",
    label: "Extra Package Slot",
    emoji: "📦",
    desc: "Add one extra service package beyond your level cap for 30 days.",
    cost: 400,
    durationDays: 30,
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
    label: "Extended Portfolio",
    emoji: "🖼️",
    desc: "Show up to 10 portfolio items on your public profile instead of 5 for 30 days.",
    cost: 250,
    durationDays: 30,
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

export const PROFILE_FRAMES: FrameItem[] = [
  {
    key: "frame_bronze",
    label: "Bronze Ring",
    emoji: "🥉",
    desc: "A solid amber ring around your avatar.",
    cost: 200,
    style: { boxShadow: "0 0 0 3px #D97706, 0 0 10px rgba(217,119,6,0.3)" },
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
  },
  {
    key: "frame_diamond",
    label: "Diamond",
    emoji: "💎",
    desc: "A brilliant blue-cyan diamond shimmer.",
    cost: 900,
    style: { boxShadow: "0 0 0 3px #06B6D4, 0 0 0 6px rgba(6,182,212,0.3), 0 0 20px rgba(6,182,212,0.5)" },
    tag: "Premium",
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
    style: { boxShadow: "0 0 0 3px #0EA5E9, 0 0 0 6px rgba(14,165,233,0.3), 0 0 18px rgba(14,165,233,0.4)" },
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
  frame_ocean:    "0 0 0 3px #0EA5E9, 0 0 0 6px rgba(14,165,233,0.3), 0 0 18px rgba(14,165,233,0.4)",
  frame_sakura:   "0 0 0 3px #EC4899, 0 0 0 6px rgba(236,72,153,0.25), 0 0 18px rgba(236,72,153,0.35)",
};
