// Client-safe: no DB imports

export type ClientItemType =
  | "priority_match"
  | "vip_support"
  | "rush_flag"
  | "extra_revision"
  | "xp_credit_swap";

export type PatronBadgeKey =
  | "patron_bronze"
  | "patron_silver"
  | "patron_gold"
  | "patron_diamond";

export interface ClientStoreItem {
  type: ClientItemType;
  label: string;
  emoji: string;
  desc: string;
  cost: number;
  durationDays: number | null;
  tag?: string;
  maxPerMonth?: number;
  creditReward?: number;  // paise added (xp_credit_swap only)
  isToken?: boolean;      // one-time use, consumed on next relevant action
}

export interface PatronBadge {
  key: PatronBadgeKey;
  label: string;
  emoji: string;
  desc: string;
  cost: number;
  tag?: string;
  perks?: string[];
  style: React.CSSProperties;
}

export const CLIENT_STORE_ITEMS: ClientStoreItem[] = [
  {
    type: "priority_match",
    label: "Priority Matching",
    emoji: "🚀",
    desc: "Your briefs are shown to top-rated editors first for 7 days. Get faster, higher-quality matches.",
    cost: 300,
    durationDays: 7,
    tag: "Popular",
  },
  {
    type: "vip_support",
    label: "VIP Support",
    emoji: "🎧",
    desc: "Move to the front of the support queue — 2-hour response SLA for 30 days.",
    cost: 500,
    durationDays: 30,
  },
  {
    type: "rush_flag",
    label: "Rush Flag",
    emoji: "⚡",
    desc: "Mark your next order as high priority. Editors see it in their urgent queue. Single-use token.",
    cost: 400,
    durationDays: null,
    maxPerMonth: 2,
    isToken: true,
  },
  {
    type: "extra_revision",
    label: "Extra Revision",
    emoji: "🔄",
    desc: "Add +1 revision beyond your package limit on your next order. Single-use token.",
    cost: 200,
    durationDays: null,
    maxPerMonth: 3,
    isToken: true,
  },
  {
    type: "xp_credit_swap",
    label: "XP → Credit",
    emoji: "💰",
    desc: "Convert 150 XP into ₹50 platform credit, applied automatically at checkout.",
    cost: 150,
    durationDays: null,
    maxPerMonth: 3,
    creditReward: 5000,  // ₹50 in paise
    isToken: true,
  },
];

export const PATRON_BADGES: PatronBadge[] = [
  {
    key: "patron_bronze",
    label: "Bronze Patron",
    emoji: "🥉",
    desc: "Bronze badge shown on your order cards and briefs.",
    cost: 300,
    style: { boxShadow: "0 0 0 2px #D97706, 0 0 8px rgba(217,119,6,0.3)" },
    perks: ["Bronze badge on all order cards"],
  },
  {
    key: "patron_silver",
    label: "Silver Patron",
    emoji: "🥈",
    desc: "Silver badge — signals a trusted, experienced client to editors.",
    cost: 700,
    style: { boxShadow: "0 0 0 2px #9CA3AF, 0 0 10px rgba(156,163,175,0.4)" },
    perks: ["Silver badge on order cards", "Priority in editor browse results"],
  },
  {
    key: "patron_gold",
    label: "Gold Patron",
    emoji: "🥇",
    desc: "Gold badge — premium client status. Editors see your dedicated label.",
    cost: 1500,
    style: { boxShadow: "0 0 0 2px #F59E0B, 0 0 0 5px rgba(245,158,11,0.3), 0 0 18px rgba(245,158,11,0.4)" },
    tag: "Premium",
    perks: ["Gold badge on order cards", "\"Gold Patron\" label shown to editors", "Top-priority editor matching"],
  },
  {
    key: "patron_diamond",
    label: "Diamond Patron",
    emoji: "💎",
    desc: "Diamond patron — the highest client tier. Animated badge and maximum visibility.",
    cost: 3000,
    style: { boxShadow: "0 0 0 2px #06B6D4, 0 0 0 5px rgba(6,182,212,0.3), 0 0 20px rgba(6,182,212,0.5)" },
    tag: "Elite",
    perks: ["Animated diamond badge", "Maximum editor visibility", "Dedicated account matching"],
  },
];
