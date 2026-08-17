// Client-safe: no DB imports

export type ClientItemType =
  // Discounts & Credits
  | "credit_100"
  | "credit_250"
  | "credit_500"
  | "credit_1000"
  | "extra_revision"
  | "fee_waiver"
  // Hiring & Discovery
  | "priority_match"
  | "premium_match"
  | "early_access_editors"
  | "shortlist_expansion"
  | "advanced_search_unlock"
  // Project & Workflow
  | "priority_support"
  | "extra_template"
  | "advanced_brief_template"
  | "project_org_pack"
  | "extra_saved_briefs"
  // Exclusive Experiences
  | "creative_consultation"
  | "premium_video_brief"
  | "video_starter_kit"
  | "project_planning_pack"
  | "editing_strategy_session"
  // Referral Rewards
  | "double_referral"
  | "referral_booster"
  | "xp_credit_swap"; // Legacy fallback

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
  category: "credits" | "hiring" | "workflow" | "experiences" | "referrals";
  tag?: string;
  maxPerMonth?: number;
  creditReward?: number;  // paise added (for credit items)
  isToken?: boolean;      // one-time use
  minLevel?: number;      // Level lock (e.g. require Level 3 Client)
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
  // ─── 1. Discounts & Credits ───────────────────────────────────────────────
  {
    type: "credit_100",
    label: "₹100 Order Credit",
    emoji: "💰",
    desc: "₹100 discount applied automatically on your next video order.",
    cost: 1000,
    durationDays: null,
    category: "credits",
    creditReward: 10000, // ₹100 in paise
    isToken: true,
  },
  {
    type: "credit_250",
    label: "₹250 Order Credit",
    emoji: "💵",
    desc: "₹250 discount applied automatically on your next video order.",
    cost: 2250,
    durationDays: null,
    category: "credits",
    creditReward: 25000, // ₹250 in paise
    isToken: true,
  },
  {
    type: "credit_500",
    label: "₹500 Order Credit",
    emoji: "🎁",
    desc: "₹500 discount applied automatically on your next video order.",
    cost: 4000,
    durationDays: null,
    category: "credits",
    creditReward: 50000, // ₹500 in paise
    isToken: true,
    tag: "Best Value",
  },
  {
    type: "credit_1000",
    label: "₹1,000 Order Credit",
    emoji: "👑",
    desc: "₹1,000 discount applied automatically on your next video order.",
    cost: 7500,
    durationDays: null,
    category: "credits",
    creditReward: 100000, // ₹1000 in paise
    isToken: true,
  },
  {
    type: "extra_revision",
    label: "Free Revision Credit",
    emoji: "🔄",
    desc: "Add +1 free revision beyond package limit on any active order.",
    cost: 2000,
    durationDays: null,
    category: "credits",
    maxPerMonth: 3,
    isToken: true,
  },
  {
    type: "fee_waiver",
    label: "Fee Waiver",
    emoji: "🎟️",
    desc: "Remove the platform service fee completely on your next order check.",
    cost: 3000,
    durationDays: null,
    category: "credits",
    maxPerMonth: 1,
    isToken: true,
    minLevel: 3, // Requires Active level
  },

  // ─── 2. Hiring & Discovery Perks ──────────────────────────────────────────
  {
    type: "priority_match",
    label: "Priority Matching",
    emoji: "🚀",
    desc: "Briefs shown to top-rated editors first. Get matches faster for 7 days.",
    cost: 2000,
    durationDays: 7,
    category: "hiring",
    tag: "Popular",
  },
  {
    type: "premium_match",
    label: "Premium Editor Match",
    emoji: "🏆",
    desc: "Unlock handpicked matches from EditBridge top 5% verified editors.",
    cost: 3500,
    durationDays: 14,
    category: "hiring",
  },
  {
    type: "early_access_editors",
    label: "Early Access to Editors",
    emoji: "👁️",
    desc: "Discover and hire newly verified rising editors before everyone else.",
    cost: 1500,
    durationDays: 30,
    category: "hiring",
  },
  {
    type: "shortlist_expansion",
    label: "Shortlist Expansion",
    emoji: "📂",
    desc: "Save up to 25 additional editors to your favorites list permanent.",
    cost: 750,
    durationDays: null,
    category: "hiring",
  },
  {
    type: "advanced_search_unlock",
    label: "Advanced Search Unlock",
    emoji: "🔍",
    desc: "Unlock hyper-specific tags, rates, and analytics filter metrics for 30 days.",
    cost: 1500,
    durationDays: 30,
    category: "hiring",
  },

  // ─── 3. Project & Workflow Perks ─────────────────────────────────────────
  {
    type: "priority_support",
    label: "Priority Support — 7 days",
    emoji: "🎧",
    desc: "Accelerated support queue access with a 2-hour response guarantee.",
    cost: 2000,
    durationDays: 7,
    category: "workflow",
  },
  {
    type: "extra_template",
    label: "Extra Project Template",
    emoji: "📋",
    desc: "Save 1 additional reusable project structure config in briefs dashboard.",
    cost: 500,
    durationDays: null,
    category: "workflow",
  },
  {
    type: "advanced_brief_template",
    label: "Advanced Brief Template",
    emoji: "📐",
    desc: "Professional premium outline briefs optimized for YouTube, Reels, Ads.",
    cost: 750,
    durationDays: null,
    category: "workflow",
    tag: "Pro Tool",
  },
  {
    type: "project_org_pack",
    label: "Project Organization Pack",
    emoji: "🏷️",
    desc: "Organize drafts and projects with premium custom labels, tags, and folders.",
    cost: 1000,
    durationDays: null,
    category: "workflow",
  },
  {
    type: "extra_saved_briefs",
    label: "Extra Saved Briefs (+10)",
    emoji: "📥",
    desc: "Increases template limit slots to save up to 10 additional brief structures.",
    cost: 750,
    durationDays: null,
    category: "workflow",
  },

  // ─── 5. Exclusive Rewards ──────────────────────────────────────────────────
  {
    type: "creative_consultation",
    label: "Creative Consultation",
    emoji: "🎬",
    desc: "A 15-minute video call with a creative director to review your content strategy.",
    cost: 5000,
    durationDays: null,
    category: "experiences",
    minLevel: 4, // Pro Client
  },
  {
    type: "premium_video_brief",
    label: "Premium Video Brief",
    emoji: "📝",
    desc: "Receive a professional custom brief outline structure for your project.",
    cost: 1000,
    durationDays: null,
    category: "experiences",
  },
  {
    type: "video_starter_kit",
    label: "Brand Video Starter Kit",
    emoji: "🎨",
    desc: "Comprehensive resources, assets, and design checklists to bootstrap video.",
    cost: 2500,
    durationDays: null,
    category: "experiences",
  },
  {
    type: "project_planning_pack",
    label: "Project Planning Pack",
    emoji: "📦",
    desc: "Pre-production outlines + editing checklists + delivery specs sheet.",
    cost: 1500,
    durationDays: null,
    category: "experiences",
    tag: "Useful",
  },
  {
    type: "editing_strategy_session",
    label: "Editing Strategy Session",
    emoji: "💡",
    desc: "Dedicated creative session focusing on format structure, hooks, pacing.",
    cost: 7500,
    durationDays: null,
    category: "experiences",
    minLevel: 5, // VIP Client
  },

  // ─── 6. Referral Rewards ───────────────────────────────────────────────────
  {
    type: "double_referral",
    label: "Double Referral Reward",
    emoji: "👥",
    desc: "Earn 2× credits back on the next friend referral purchase completed.",
    cost: 3000,
    durationDays: null,
    category: "referrals",
    isToken: true,
  },
  {
    type: "referral_booster",
    label: "Referral Booster — 7 Days",
    emoji: "🚀",
    desc: "Receive boosted platform points when referred users place orders within 7 days.",
    cost: 2500,
    durationDays: 7,
    category: "referrals",
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
