import { db } from "@/lib/db";
import { featureFlags } from "@/lib/db/schema";

// Register a new flag here first, then check `isFeatureEnabled(key)` at the
// point(s) where that feature does something — a purchase endpoint, a boost
// query, a page render. The DB only stores the on/off override; label,
// description, and default live here in code.
export const FEATURE_FLAG_REGISTRY = {
  featured_placement: {
    label: "Featured Placement",
    description: "Editors can pay to appear at the top of browse search results.",
    portal: "editor",
    defaultEnabled: true,
  },
  find_editor_quiz: {
    label: "Style Quiz Matching",
    description: "The 5-question homepage quiz that matches clients to their 3 best-fit editors.",
    portal: "public",
    defaultEnabled: true,
  },
  editor_membership_pricing: {
    label: "Editor Membership Tiers",
    description: "Display the 4-tier editor portal membership subscription plans in the editor dashboard settings.",
    portal: "editor",
    defaultEnabled: false,
  },
} as const;


export type FeatureFlagKey = keyof typeof FEATURE_FLAG_REGISTRY;

let _cache: { map: Record<string, boolean>; ts: number } | null = null;
const TTL = 5_000;

async function loadFlags(): Promise<Record<string, boolean>> {
  if (_cache && Date.now() - _cache.ts < TTL) return _cache.map;

  const rows = await db.select({ key: featureFlags.key, enabled: featureFlags.enabled }).from(featureFlags);
  const map: Record<string, boolean> = {};
  for (const row of rows) map[row.key] = row.enabled;

  _cache = { map, ts: Date.now() };
  return map;
}

export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  const map = await loadFlags();
  return map[key] ?? FEATURE_FLAG_REGISTRY[key].defaultEnabled;
}

export async function getAllFeatureFlags() {
  const map = await loadFlags();
  return (Object.keys(FEATURE_FLAG_REGISTRY) as FeatureFlagKey[]).map((key) => ({
    key,
    ...FEATURE_FLAG_REGISTRY[key],
    enabled: map[key] ?? FEATURE_FLAG_REGISTRY[key].defaultEnabled,
  }));
}

export function bustFeatureFlagsCache() {
  _cache = null;
}
