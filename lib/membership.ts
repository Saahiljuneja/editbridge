import { db } from "@/lib/db";
import { editors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Prices for tiers in Rupees (Razorpay will expect these times 100 in paise)
export const MEMBERSHIP_TIERS = {
  hobby: {
    id: "hobby",
    name: "Hobby",
    commissionRate: 20,
    priceInRupees: 0,
    maxSets: 2,
    packagesPerSet: 3,
    maxFeaturedVideos: 3,
  },
  starter: {
    id: "starter",
    name: "Starter",
    commissionRate: 10,
    priceInRupees: 499,
    maxSets: 3,
    packagesPerSet: 3,
    maxFeaturedVideos: 5,
  },
  pro: {
    id: "pro",
    name: "Pro",
    commissionRate: 5,
    priceInRupees: 1499,
    maxSets: 4,
    packagesPerSet: 3,
    maxFeaturedVideos: 10,
  },
  agency: {
    id: "agency",
    name: "Agency",
    commissionRate: 3,
    priceInRupees: 3999,
    maxSets: Infinity, // unlimited sets
    packagesPerSet: 3,
    maxFeaturedVideos: 15,
  },
} as const;

export type MembershipTierName = keyof typeof MEMBERSHIP_TIERS;

/**
 * Returns the effective tier config for an editor (falls back to hobby if expired/missing).
 */
export function getEffectiveTier(
  tier: string | null | undefined,
  expiresAt: Date | null | undefined
) {
  const resolved = (tier && tier !== "hobby" && expiresAt && new Date(expiresAt) > new Date())
    ? (MEMBERSHIP_TIERS[tier as MembershipTierName] ?? MEMBERSHIP_TIERS.hobby)
    : MEMBERSHIP_TIERS.hobby;
  return resolved;
}

/**
 * Checks if the editor's membership is currently active.
 */
export function isMembershipActive(
  tier: string | null | undefined,
  expiresAt: Date | null | undefined
): boolean {
  if (!tier || tier === "hobby") return false;
  if (!expiresAt) return false;
  return new Date(expiresAt) > new Date();
}

/**
 * Calculates the active commission rate (as a percentage, e.g., 10 for 10%) for an editor.
 */
export async function getEditorCommissionRate(editorId: string): Promise<number> {
  const [editor] = await db
    .select({
      membershipTier: editors.membershipTier,
      membershipExpiresAt: editors.membershipExpiresAt,
      customCommissionRate: editors.customCommissionRate,
    })
    .from(editors)
    .where(eq(editors.id, editorId))
    .limit(1);

  if (!editor) {
    return 20; // default fallback
  }

  const { membershipTier, membershipExpiresAt, customCommissionRate } = editor;
  if (customCommissionRate !== null) {
    return customCommissionRate;
  }

  if (isMembershipActive(membershipTier, membershipExpiresAt)) {
    const tierConfig = MEMBERSHIP_TIERS[membershipTier as MembershipTierName];
    if (tierConfig && tierConfig.commissionRate !== null) {
      return tierConfig.commissionRate;
    }
  }

  // Fallback to hobby tier rate or platform settings if desired, but 20% is the hobby rate
  return 20;
}
