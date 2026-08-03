import { db } from "@/lib/db";
import { editors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Prices for tiers in Rupees (Razorpay will expect these times 100 in paise)
export const MEMBERSHIP_TIERS = {
  hobby: {
    id: "hobby",
    name: "Hobby",
    commissionRate: 15, // 15% commission
    priceInRupees: 0,
  },
  starter: {
    id: "starter",
    name: "Starter",
    commissionRate: 10, // 10% commission
    priceInRupees: 499,
  },
  pro: {
    id: "pro",
    name: "Pro",
    commissionRate: 5, // 5% commission
    priceInRupees: 1499,
  },
  agency: {
    id: "agency",
    name: "Agency",
    commissionRate: 3, // 3% commission
    priceInRupees: 3999,
  },
} as const;

export type MembershipTierName = keyof typeof MEMBERSHIP_TIERS;

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
    })
    .from(editors)
    .where(eq(editors.id, editorId))
    .limit(1);

  if (!editor) {
    return 15; // default fallback
  }

  const { membershipTier, membershipExpiresAt } = editor;
  if (isMembershipActive(membershipTier, membershipExpiresAt)) {
    const tierConfig = MEMBERSHIP_TIERS[membershipTier as MembershipTierName];
    if (tierConfig && tierConfig.commissionRate !== null) {
      return tierConfig.commissionRate;
    }
  }

  // Fallback to hobby tier rate or platform settings if desired, but 15% is the hobby rate
  return 15;
}
