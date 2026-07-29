import { db } from "@/lib/db";
import { users, referrals, orders } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { addCredit, awardBadgePublic } from "@/lib/rewards";

const REFERRAL_CREDIT_PAISE = 10000; // ₹100 per successful referral

// Generate a short unique referral code
function makeCode(userId: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const base = userId.replace(/-/g, "").slice(0, 8).toUpperCase();
  let code = "";
  for (const c of base) {
    const idx = parseInt(c, 16) % chars.length;
    code += chars[idx];
  }
  return `EB${code}`;
}

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const [user] = await db.select({ referralCode: users.referralCode }).from(users).where(eq(users.id, userId)).limit(1);
  if (user?.referralCode) return user.referralCode;

  const code = makeCode(userId);
  await db.update(users).set({ referralCode: code }).where(eq(users.id, userId));
  return code;
}

export async function getUserByReferralCode(code: string): Promise<string | null> {
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.referralCode, code)).limit(1);
  return row?.id ?? null;
}

// Called at signup when user used a referral link
export async function recordReferral(referrerId: string, refereeId: string): Promise<void> {
  if (referrerId === refereeId) return;
  // Don't double-record
  const [existing] = await db.select({ id: referrals.id }).from(referrals).where(eq(referrals.refereeId, refereeId)).limit(1);
  if (existing) return;

  await db.insert(referrals).values({ referrerId, refereeId });
}

// Called when referee completes their first order — awards credit to referrer
export async function maybeTriggerReferralReward(refereeId: string, orderId: string): Promise<void> {
  const [referral] = await db
    .select({ id: referrals.id, referrerId: referrals.referrerId, rewardedAt: referrals.rewardedAt })
    .from(referrals)
    .where(and(eq(referrals.refereeId, refereeId), isNull(referrals.rewardedAt)))
    .limit(1);

  if (!referral) return;

  // Check order amount is ₹1000+ (100,000 Paise)
  const [order] = await db
    .select({ totalAmount: orders.totalAmount })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order || order.totalAmount < 100000) return;

  // Mark rewarded
  await db.update(referrals).set({ orderId, creditAwarded: REFERRAL_CREDIT_PAISE, rewardedAt: new Date() }).where(eq(referrals.id, referral.id));

  // Award credit to referrer (90 day expiry)
  await addCredit(referral.referrerId, REFERRAL_CREDIT_PAISE, "referral_reward");
  // Award referral_pro badge on first successful referral
  await awardBadgePublic(referral.referrerId, "referral_pro");
}

export async function getReferralStats(userId: string) {
  const rows = await db
    .select({
      refereeId: referrals.refereeId,
      creditAwarded: referrals.creditAwarded,
      rewardedAt: referrals.rewardedAt,
      createdAt: referrals.createdAt,
    })
    .from(referrals)
    .where(eq(referrals.referrerId, userId));

  const total = rows.length;
  const rewarded = rows.filter(r => r.rewardedAt).length;
  const totalEarned = rows.reduce((s, r) => s + r.creditAwarded, 0);
  return { total, rewarded, pending: total - rewarded, totalEarned };
}
