// Client-safe: no DB imports

export type BoostType =
  // 1. Profile Boosts
  | "profile_boost_24h"
  | "profile_boost_7d"
  | "featured_profile_24h"
  | "portfolio_spotlight"
  | "category_spotlight"
  | "rising_editor_badge"
  | "top_rated_badge_frame"
  // 4. Productivity
  | "extra_portfolio_slots"
  | "extra_package_slot"
  | "extra_brief_templates"
  | "advanced_analytics_30d"
  | "priority_support_7d"
  | "extra_storage_30d"
  // 5. Perks
  | "reduced_commission_7d"
  | "proposal_boost"
  | "quote_priority"
  | "early_job_access"
  | "featured_package_7d"
  // Legacy / fallbacks
  | "featured_boost"
  | "profile_highlight"
  | "extended_portfolio"
  | "portfolio_tier2"
  | "portfolio_tier3"
  | "badge_frame";

export type FrameKey =
  | "frame_neon"
  | "frame_cinema"
  | "frame_minimal"
  | "frame_creator"
  | "frame_cyber"
  | "frame_gold"
  | "frame_electric"
  | "frame_fire"
  | "frame_diamond"
  | "frame_bronze"
  | "frame_silver"
  | "frame_ocean"
  | "frame_sakura";

export interface ShopItem {
  type: BoostType;
  label: string;
  emoji: string;
  desc: string;
  cost: number;
  durationDays: number | null;
  category: "boosts" | "customization" | "productivity" | "perks";
  minLevel?: number;
  tag?: string;
  maxPerMonth?: number;
  tierNote?: string;
  requiresActive?: BoostType;
}

export interface FrameItem {
  key: FrameKey;
  label: string;
  emoji: string;
  desc: string;
  cost: number;
  style: React.CSSProperties;
  category: "customization";
  minLevel?: number;
  tag?: string;
  perks?: string[];
}

export const SHOP_ITEMS: ShopItem[] = [
  // --- 1.🚀 Profile Boosts ---
  {
    type: "profile_boost_24h",
    label: "Profile Boost — 24h",
    emoji: "🚀",
    desc: "Get increased visibility in editor discovery for 24 hours.",
    cost: 500,
    durationDays: 1,
    category: "boosts",
    tag: "Popular",
  },
  {
    type: "profile_boost_7d",
    label: "Profile Boost — 7 days",
    emoji: "🚀",
    desc: "Extend your profile boost for a full 7 days for maximum client discovery.",
    cost: 2500,
    durationDays: 7,
    category: "boosts",
  },
  {
    type: "featured_profile_24h",
    label: "Featured Profile — 24h",
    emoji: "🔝",
    desc: "Get premium featured placement at the top of client search results.",
    cost: 1000,
    durationDays: 1,
    category: "boosts",
  },
  {
    type: "portfolio_spotlight",
    label: "Portfolio Spotlight",
    emoji: "🖼️",
    desc: "Highlights your selected portfolio samples on the client homepage.",
    cost: 1500,
    durationDays: 7,
    category: "boosts",
  },
  {
    type: "category_spotlight",
    label: "Category Spotlight",
    emoji: "🎯",
    desc: "Higher visibility ranking inside your primary video editing category.",
    cost: 2000,
    durationDays: 7,
    category: "boosts",
  },
  {
    type: "rising_editor_badge",
    label: "“Rising Editor” badge",
    emoji: "✨",
    desc: "Unlock a custom badge tag displayed on your public profile card.",
    cost: 1000,
    durationDays: null,
    category: "boosts",
    minLevel: 2,
  },
  {
    type: "top_rated_badge_frame",
    label: "“Top Rated” badge frame",
    emoji: "🏆",
    desc: "Unlock a premium badge border frame for your high-rated orders.",
    cost: 3000,
    durationDays: null,
    category: "boosts",
    minLevel: 5,
  },

  // --- 4.🧰 Editor Productivity Rewards ---
  {
    type: "extra_portfolio_slots",
    label: "+5 Portfolio Slots",
    emoji: "🖼️",
    desc: "Permanently add 5 extra video slots to display more work on your profile.",
    cost: 1000,
    durationDays: null,
    category: "productivity",
  },
  {
    type: "extra_package_slot",
    label: "+1 Package Slot",
    emoji: "📦",
    desc: "Allows you to create 1 additional custom package/tier for your clients.",
    cost: 1500,
    durationDays: null,
    category: "productivity",
  },
  {
    type: "extra_brief_templates",
    label: "+10 Brief Templates",
    emoji: "📝",
    desc: "Permanently save up to 10 more template briefs for client orders.",
    cost: 500,
    durationDays: null,
    category: "productivity",
  },
  {
    type: "advanced_analytics_30d",
    label: "Advanced Analytics — 30 days",
    emoji: "📈",
    desc: "Unlocks detailed charts, profile traffic sources, and performance stats for 30 days.",
    cost: 2000,
    durationDays: 30,
    category: "productivity",
  },
  {
    type: "priority_support_7d",
    label: "Priority Support — 7 days",
    emoji: "💬",
    desc: "Direct access to support chat with under-30-minute response SLA.",
    cost: 1500,
    durationDays: 7,
    category: "productivity",
  },
  {
    type: "extra_storage_30d",
    label: "+10 GB Storage — 30 days",
    emoji: "💾",
    desc: "Expands your cloud raw footage upload allowance by 10 GB for 30 days.",
    cost: 2000,
    durationDays: 30,
    category: "productivity",
  },

  // --- 5.💰 Marketplace Perks ---
  {
    type: "reduced_commission_7d",
    label: "1% commission discount",
    emoji: "💸",
    desc: "Lowers EditBridge's platform fee on your orders for the next 7 days.",
    cost: 5000,
    durationDays: 7,
    category: "perks",
  },
  {
    type: "proposal_boost",
    label: "Proposal Boost",
    emoji: "⚡",
    desc: "Your proposal gets a visual highlight in the client job inbox.",
    cost: 1000,
    durationDays: null,
    category: "perks",
  },
  {
    type: "quote_priority",
    label: "Quote Priority",
    emoji: "👑",
    desc: "Your quotes will sort to the top of the client check list for orders.",
    cost: 1500,
    durationDays: null,
    category: "perks",
  },
  {
    type: "early_job_access",
    label: "Early Job Access",
    emoji: "⏳",
    desc: "View and apply to relevant client job briefs 30 minutes before other editors.",
    cost: 2500,
    durationDays: null,
    category: "perks",
  },
  {
    type: "featured_package_7d",
    label: "Featured Package",
    emoji: "⭐️",
    desc: "Highlights one of your pricing packages with a colored card border in your list for 7 days.",
    cost: 2000,
    durationDays: 7,
    category: "perks",
  },

  // --- Legacy fallbacks (to prevent compile errors) ---
  {
    type: "featured_boost",
    label: "Featured Boost",
    emoji: "🔝",
    desc: "Your profile appears at the top of browse results for 3 days.",
    cost: 1000,
    durationDays: 3,
    category: "boosts",
  },
  {
    type: "profile_highlight",
    label: "Profile Highlight",
    emoji: "✨",
    desc: "A glowing border appears around your card in browse results for 7 days.",
    cost: 200,
    durationDays: 7,
    category: "boosts",
  },
  {
    type: "extended_portfolio",
    label: "Portfolio Boost",
    emoji: "🖼️",
    desc: "Expand to 8 portfolio slots on your public profile.",
    cost: 250,
    durationDays: 30,
    category: "productivity",
  },
  {
    type: "portfolio_tier2",
    label: "Portfolio Boost — Tier 2",
    emoji: "🖼️",
    desc: "Expand to 12 portfolio slots.",
    cost: 400,
    durationDays: 30,
    category: "productivity",
  },
  {
    type: "portfolio_tier3",
    label: "Portfolio Boost — Tier 3",
    emoji: "🖼️",
    desc: "Expand to 20 portfolio slots.",
    cost: 700,
    durationDays: 30,
    category: "productivity",
  },
  {
    type: "badge_frame",
    label: "Custom Badge Frame",
    emoji: "🏆",
    desc: "A permanent golden frame around your badges.",
    cost: 600,
    durationDays: null,
    category: "boosts",
  },
];

export const PORTFOLIO_TIERS = SHOP_ITEMS.filter(i =>
  i.type === "extended_portfolio" || i.type === "portfolio_tier2" || i.type === "portfolio_tier3"
);

export const REGULAR_SHOP_ITEMS = SHOP_ITEMS.filter(i =>
  i.type !== "extended_portfolio" && i.type !== "portfolio_tier2" && i.type !== "portfolio_tier3"
);

export function getPortfolioSlots(activeTypes: Set<string>): number {
  if (activeTypes.has("portfolio_tier3")) return 20;
  if (activeTypes.has("portfolio_tier2")) return 12;
  if (activeTypes.has("extended_portfolio")) return 8;
  return 5;
}

export const PROFILE_FRAMES: FrameItem[] = [
  {
    key: "frame_minimal",
    label: "Minimal Frame",
    emoji: "🔳",
    desc: "Give your profile a clean, minimal look.",
    cost: 300,
    style: { boxShadow: "0 0 0 2px #E5E7EB, 0 0 5px rgba(229,231,235,0.2)" },
    category: "customization",
  },
  {
    key: "frame_neon",
    label: "Neon Glow",
    emoji: "🟢",
    desc: "An energetic green neon ring glow.",
    cost: 400,
    style: { boxShadow: "0 0 0 3px #10B981, 0 0 15px rgba(16,185,129,0.5)" },
    category: "customization",
  },
  {
    key: "frame_creator",
    label: "Creator Frame",
    emoji: "🌸",
    desc: "Vibrant custom rose glow frame.",
    cost: 600,
    style: { boxShadow: "0 0 0 3px #F43F5E, 0 0 15px rgba(244,63,94,0.5)" },
    category: "customization",
  },
  {
    key: "frame_cinema",
    label: "Cinematic Frame",
    emoji: "🎬",
    desc: "Give your profile a professional cinematic look.",
    cost: 750,
    style: { boxShadow: "0 0 0 3px #1E1B4B, 0 0 15px rgba(30,27,75,0.4)" },
    category: "customization",
    tag: "Cinematic",
  },
  {
    key: "frame_cyber",
    label: "Cyber Ring",
    emoji: "🌐",
    desc: "A futuristic cyan cyber pulse glow.",
    cost: 800,
    style: { boxShadow: "0 0 0 3px #06B6D4, 0 0 20px rgba(6,182,212,0.6)" },
    category: "customization",
  },
  {
    key: "frame_gold",
    label: "Gold Ring",
    emoji: "🥇",
    desc: "A rich golden glow ring.",
    cost: 600,
    style: { boxShadow: "0 0 0 3px #F59E0B, 0 0 0 6px rgba(245,158,11,0.3), 0 0 20px rgba(245,158,11,0.4)" },
    tag: "Popular",
    category: "customization",
  },
  {
    key: "frame_fire",
    label: "Fire Ring",
    emoji: "🔥",
    desc: "An intense orange-red fire glow.",
    cost: 750,
    style: { boxShadow: "0 0 0 3px #EF4444, 0 0 0 6px rgba(251,146,60,0.4), 0 0 24px rgba(239,68,68,0.5)" },
    category: "customization",
  },
  {
    key: "frame_electric",
    label: "Electric Ring",
    emoji: "⚡",
    desc: "A purple-blue electric pulse ring.",
    cost: 700,
    style: { boxShadow: "0 0 0 3px #8B5CF6, 0 0 0 6px rgba(139,92,246,0.3), 0 0 20px rgba(99,102,241,0.5)" },
    category: "customization",
  },
  {
    key: "frame_diamond",
    label: "Diamond Ring",
    emoji: "💎",
    desc: "A brilliant blue-cyan diamond shimmer.",
    cost: 900,
    style: { boxShadow: "0 0 0 3px #06B6D4, 0 0 0 6px rgba(6,182,212,0.3), 0 0 20px rgba(6,182,212,0.5)" },
    tag: "Premium",
    category: "customization",
    minLevel: 5,
  },
  // Legacy backups
  {
    key: "frame_bronze",
    label: "Bronze Ring",
    emoji: "🥉",
    desc: "Amber glow ring.",
    cost: 200,
    style: { boxShadow: "0 0 0 3px #D97706, 0 0 10px rgba(217,119,6,0.3)" },
    category: "customization",
  },
  {
    key: "frame_silver",
    label: "Silver Ring",
    emoji: "🥈",
    desc: "Slate shimmer ring.",
    cost: 350,
    style: { boxShadow: "0 0 0 3px #9CA3AF, 0 0 12px rgba(156,163,175,0.4)" },
    category: "customization",
  },
  {
    key: "frame_ocean",
    label: "Ocean Ring",
    emoji: "🌊",
    desc: "Deep teal ring.",
    cost: 500,
    style: { boxShadow: "0 0 0 3px #1e40af, 0 0 0 6px rgba(14,165,233,0.3), 0 0 18px rgba(14,165,233,0.4)" },
    category: "customization",
  },
  {
    key: "frame_sakura",
    label: "Sakura Ring",
    emoji: "🌸",
    desc: "Soft pink glow ring.",
    cost: 450,
    style: { boxShadow: "0 0 0 3px #EC4899, 0 0 0 6px rgba(236,72,153,0.25), 0 0 18px rgba(236,72,153,0.35)" },
    category: "customization",
  },
];

export const FRAME_STYLES: Record<FrameKey, string> = {
  frame_minimal:  "0 0 0 2px #E5E7EB, 0 0 5px rgba(229,231,235,0.2)",
  frame_neon:     "0 0 0 3px #10B981, 0 0 15px rgba(16,185,129,0.5)",
  frame_creator:  "0 0 0 3px #F43F5E, 0 0 15px rgba(244,63,94,0.5)",
  frame_cinema:   "0 0 0 3px #1E1B4B, 0 0 15px rgba(30,27,75,0.4)",
  frame_cyber:    "0 0 0 3px #06B6D4, 0 0 20px rgba(6,182,212,0.6)",
  frame_gold:     "0 0 0 3px #F59E0B, 0 0 0 6px rgba(245,158,11,0.3), 0 0 20px rgba(245,158,11,0.4)",
  frame_fire:     "0 0 0 3px #EF4444, 0 0 0 6px rgba(251,146,60,0.4), 0 0 24px rgba(239,68,68,0.5)",
  frame_electric: "0 0 0 3px #8B5CF6, 0 0 0 6px rgba(139,92,246,0.3), 0 0 20px rgba(99,102,241,0.5)",
  frame_diamond:  "0 0 0 3px #06B6D4, 0 0 0 6px rgba(6,182,212,0.3), 0 0 20px rgba(6,182,212,0.5)",
  frame_bronze:   "0 0 0 3px #D97706, 0 0 10px rgba(217,119,6,0.3)",
  frame_silver:   "0 0 0 3px #9CA3AF, 0 0 12px rgba(156,163,175,0.4)",
  frame_ocean:    "0 0 0 3px #1e40af, 0 0 0 6px rgba(14,165,233,0.3), 0 0 18px rgba(14,165,233,0.4)",
  frame_sakura:   "0 0 0 3px #EC4899, 0 0 0 6px rgba(236,72,153,0.25), 0 0 18px rgba(236,72,153,0.35)",
};

export const EDITOR_LEVELS = [
  { level: 1, name: "level1", label: "New Editor", emoji: "🌱", min: 0, max: 999 },
  { level: 2, name: "level2", label: "Rising", emoji: "✨", min: 1000, max: 2999 },
  { level: 3, name: "level3", label: "Skilled", emoji: "⚡", min: 3000, max: 7499 },
  { level: 4, name: "level4", label: "Pro", emoji: "🔥", min: 7500, max: Infinity },
] as const;

export function calcEditorLevel(totalXp: number) {
  for (const l of [...EDITOR_LEVELS].reverse()) {
    if (totalXp >= l.min) return l;
  }
  return EDITOR_LEVELS[0];
}
