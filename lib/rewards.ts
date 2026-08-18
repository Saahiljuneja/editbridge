import { db } from "@/lib/db";
import { userPoints, pointTransactions, userBadges, userCredits, notifications, orders, editors, reviews, portfolioItems, disputes, savedEditors, users } from "@/lib/db/schema";
import { eq, and, sql, gte, count } from "drizzle-orm";
import { EDITOR_LEVELS, calcEditorLevel } from "@/lib/xp-shop-config";

// ─── Level thresholds ─────────────────────────────────────────────────────────

export const CLIENT_LEVELS = [
  { name: "bronze",   min: 0,      max: 999,     label: "New Client", emoji: "🥉" },
  { name: "silver",   min: 1000,   max: 2999,    label: "Regular", emoji: "🥈" },
  { name: "gold",     min: 3000,   max: 7499,    label: "Active", emoji: "🥇" },
  { name: "platinum", min: 7500,   max: 14999,   label: "Pro Client", emoji: "💎" },
  { name: "vip",      min: 15000,  max: 29999,   label: "VIP Client", emoji: "⭐" },
  { name: "elite",    min: 30000,  max: Infinity, label: "Elite Client", emoji: "👑" },
] as const;

export const LEVELS = CLIENT_LEVELS; // Legacy compatibility

export type Level = "bronze" | "silver" | "gold" | "platinum" | "vip" | "elite";

export function calcLevel(totalXp: number, role: "editor" | "client" = "editor"): string {
  const levelsList = role === "editor" ? EDITOR_LEVELS : CLIENT_LEVELS;
  for (const l of [...levelsList].reverse()) {
    if (totalXp >= l.min) return l.name;
  }
  return role === "editor" ? "level1" : "bronze";
}

// ─── Badge definitions ────────────────────────────────────────────────────────

export const BADGES: Record<string, { label: string; emoji: string; desc: string; role: "editor" | "client" | "both" }> = {
  // Editor badges
  profile_star:     { label: "Profile Star",    emoji: "⭐", desc: "Completed 100% of your editor profile",         role: "editor" },
  first_delivery:   { label: "First Delivery",  emoji: "🎬", desc: "Completed your very first order",                role: "editor" },
  rising_star:      { label: "Rising Star",     emoji: "🌟", desc: "Completed 5 orders",                            role: "editor" },
  verified_pro:     { label: "Verified Pro",    emoji: "🏆", desc: "Completed 25 orders",                           role: "editor" },
  top_rated:        { label: "Top Rated",       emoji: "💎", desc: "50+ orders with avg rating ≥ 4.5",              role: "editor" },
  speed_demon:      { label: "Speed Demon",     emoji: "⚡", desc: "Delivered 10 orders before the deadline",       role: "editor" },
  streak_master:    { label: "Streak Master",   emoji: "🔥", desc: "Completed 5 orders in a single week",           role: "editor" },
  early_bird:       { label: "Early Bird",      emoji: "🐦", desc: "One of the first 50 editors on the platform",   role: "editor" },
  perfect_month:    { label: "Perfect Month",   emoji: "🌙", desc: "10+ orders in a month with zero disputes",      role: "editor" },
  client_favorite:  { label: "Client Favorite", emoji: "💖", desc: "Saved by 25+ unique clients",                   role: "editor" },
  quick_responder:  { label: "Quick Responder", emoji: "⚡️", desc: "Avg response time under 2 hours",              role: "editor" },
  referral_pro:     { label: "Referral Pro",    emoji: "🤝", desc: "Successfully referred another user",            role: "editor" },
  // Client badges
  first_order:      { label: "First Order",     emoji: "🛍️", desc: "Placed your very first order",                  role: "client" },
  supporter:        { label: "Supporter",       emoji: "💪", desc: "Placed 5 orders",                              role: "client" },
  power_client:     { label: "Power Client",    emoji: "👑", desc: "Placed 25 orders",                             role: "client" },
  top_reviewer:     { label: "Top Reviewer",    emoji: "✍️", desc: "Left 10 reviews",                              role: "client" },
  loyal_client:     { label: "Loyal Client",    emoji: "❤️", desc: "Placed orders for 3+ months",                  role: "client" },
};

// ─── Core helpers ─────────────────────────────────────────────────────────────

async function getOrCreatePoints(userId: string) {
  const [existing] = await db.select().from(userPoints).where(eq(userPoints.userId, userId)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(userPoints).values({ userId }).returning();
  return created;
}

async function hasBadge(userId: string, badge: string) {
  const [row] = await db
    .select({ id: userBadges.id })
    .from(userBadges)
    .where(and(eq(userBadges.userId, userId), eq(userBadges.badge, badge)))
    .limit(1);
  return !!row;
}

export async function awardBadgePublic(userId: string, badge: string) {
  await awardBadge(userId, badge);
}

async function awardBadge(userId: string, badge: string) {
  if (await hasBadge(userId, badge)) return;
  await db.insert(userBadges).values({ userId, badge });

  const def = BADGES[badge];
  await db.insert(notifications).values({
    userId,
    type: "badge_earned",
    title: `Badge earned: ${def.emoji} ${def.label}`,
    body: def.desc,
  });
}

const LEVEL_RANK: Record<string, number> = {
  bronze: 0, silver: 1, gold: 2, platinum: 3, vip: 4, elite: 5,
  level1: 0, level2: 1, level3: 2, level4: 3,
};

async function addPoints(userId: string, amount: number, reason: string, metadata: Record<string, unknown> = {}) {
  const pts = await getOrCreatePoints(userId);
  const [userRow] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  const role = userRow?.role === "editor" ? "editor" : "client";

  // Clamp to 0 — XP never goes negative, but level can drop when total decreases
  const newTotal   = Math.max(0, pts.total + amount);
  const newCurrent = Math.max(0, pts.current + amount);
  const newLevel   = calcLevel(newTotal, role);
  const oldLevel   = pts.level;

  await db.update(userPoints).set({
    total: newTotal,
    current: newCurrent,
    level: newLevel,
    updatedAt: new Date(),
  }).where(eq(userPoints.userId, userId));

  await db.insert(pointTransactions).values({ userId, amount, reason, metadata });

  if (newLevel !== oldLevel) {
    const leveledUp = (LEVEL_RANK[newLevel as any] ?? 0) > (LEVEL_RANK[oldLevel as any] ?? 0);

    if (leveledUp) {
      const perks: Record<string, string> = {
        bronze:   "",
        silver:   "You are now a Regular Client!",
        gold:     "You are now an Active Client!",
        platinum: "You are now a Pro Client!",
        vip:      "You've unlocked VIP status with exclusive benefits!",
        elite:    "You've reached Elite Client status! Highest tier support active.",
        level1:   "",
        level2:   "You've leveled up to Level 2: Rising Editor!",
        level3:   "You've leveled up to Level 3: Skilled Editor!",
        level4:   "You've leveled up to Level 4: Pro Editor! Higher visibility active.",
      };
      await db.insert(notifications).values({
        userId,
        type: "level_up",
        title: `Level up! You're now ${newLevel.charAt(0).toUpperCase() + newLevel.slice(1)} 🎉`,
        body: perks[newLevel] || "Keep up the great work!",
      });
    } else {
      await db.insert(notifications).values({
        userId,
        type: "level_up",
        title: `Rank dropped to ${newLevel.charAt(0).toUpperCase() + newLevel.slice(1)} (rank down)`,
        body: "Your XP was reduced due to a recent penalty. Deliver quality work to recover your rank.",
      });
    }
  }

  return newLevel;
}

export async function addCredit(userId: string, amount: number, reason: string) {
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
  await db.insert(userCredits).values({ userId, amount, reason, expiresAt });
  await db.insert(notifications).values({
    userId,
    type: "credit_earned",
    title: `₹${(amount / 100).toFixed(0)} credit added to your account!`,
    body: `${reason}. Valid for 90 days.`,
    link: "/settings",
  });
}

// ─── Public reward triggers ───────────────────────────────────────────────────

/** Called when an editor completes an order */
export async function onEditorOrderCompleted(editorUserId: string, editorId: string, orderId: string, deliveredBeforeDeadline: boolean) {
  // 50 XP per completed order
  await addPoints(editorUserId, 50, "order_completed", { orderId });

  // Tiered XP for early delivery:
  // Delivered >12 hours early: +15 XP
  // Delivered >24 hours early: +20 XP
  const [order] = await db
    .select({ deadline: orders.deadline, deliveredAt: orders.deliveredAt })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (order && order.deadline && order.deliveredAt) {
    const diffMs = order.deadline.getTime() - order.deliveredAt.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours >= 24) {
      await addPoints(editorUserId, 20, "early_delivery", { orderId, earlyHours: diffHours });
    } else if (diffHours >= 12) {
      await addPoints(editorUserId, 15, "early_delivery", { orderId, earlyHours: diffHours });
    } else if (diffHours < 0) {
      // Late delivery — delivered after the deadline
      await addPoints(editorUserId, -20, "late_delivery_penalty", { orderId, lateHours: Math.abs(diffHours) });
      await db.insert(notifications).values({
        userId: editorUserId,
        type: "badge_earned",
        title: "Late delivery — XP penalty",
        body: `This order was delivered after the deadline. -20 XP deducted. Always aim to deliver on time.`,
        link: "/editor/rewards",
      });
    }
  }

  // Count total completed orders for this editor
  const [row] = await db
    .select({ total: sql<number>`COUNT(*)::int` })
    .from(orders)
    .where(and(eq(orders.editorId, editorId), eq(orders.status, "completed")));
  const total = row?.total ?? 0;

  // Badges by milestone
  if (total >= 1)  await awardBadge(editorUserId, "first_delivery");
  if (total >= 5)  await awardBadge(editorUserId, "rising_star");
  if (total >= 25) await awardBadge(editorUserId, "verified_pro");
  if (total >= 50) await checkTopRated(editorUserId);

  // Almost-there notifications (fire at milestone − 1)
  const MILESTONES: Array<{ at: number; badge: string; emoji: string; label: string }> = [
    { at: 4,  badge: "rising_star",  emoji: "🌟", label: "Rising Star"  },
    { at: 24, badge: "verified_pro", emoji: "🏆", label: "Verified Pro" },
    { at: 49, badge: "top_rated",    emoji: "💎", label: "Top Rated eligibility" },
  ];
  for (const m of MILESTONES) {
    if (total === m.at && !(await hasBadge(editorUserId, m.badge))) {
      await db.insert(notifications).values({
        userId: editorUserId,
        type: "badge_earned",
        title: `Almost there! ${m.emoji}`,
        body: `Just 1 more order to unlock the ${m.label} badge.`,
        link: "/editor/rewards",
      });
    }
  }

  // ₹500 credit on 50th order
  if (total === 50) await addCredit(editorUserId, 50000, "50 orders completed milestone");

  // perfect_month: 10+ orders completed this calendar month with zero disputes
  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const [monthRow] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(orders)
    .where(and(eq(orders.editorId, editorId), eq(orders.status, "completed"), gte(orders.updatedAt, monthStart)));
  if ((monthRow?.c ?? 0) >= 10) {
    const [disputeRow] = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(disputes)
      .innerJoin(orders, eq(orders.id, disputes.orderId))
      .where(and(eq(orders.editorId, editorId), gte(disputes.createdAt, monthStart)));
    if ((disputeRow?.c ?? 0) === 0) {
      await awardBadge(editorUserId, "perfect_month");
    }
  }

  // quick_responder: avg response time under 2 hours (120 min) after enough orders
  if (total >= 5) {
    const [editorData] = await db
      .select({ avgResponseTime: editors.avgResponseTime })
      .from(editors)
      .where(eq(editors.id, editorId))
      .limit(1);
    if (editorData?.avgResponseTime != null && editorData.avgResponseTime < 120) {
      await awardBadge(editorUserId, "quick_responder");
    }
  }

  // Speed Demon badge: 10 early deliveries
  if (deliveredBeforeDeadline) {
    const [earlyCount] = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(pointTransactions)
      .where(and(eq(pointTransactions.userId, editorUserId), eq(pointTransactions.reason, "early_delivery")));
    const earlyTotal = earlyCount?.c ?? 0;
    if (earlyTotal >= 10) await awardBadge(editorUserId, "speed_demon");
    if (earlyTotal === 9 && !(await hasBadge(editorUserId, "speed_demon"))) {
      await db.insert(notifications).values({
        userId: editorUserId,
        type: "badge_earned",
        title: "Almost there! ⚡",
        body: "Just 1 more early delivery to unlock the Speed Demon badge.",
        link: "/editor/rewards",
      });
    }
  }

  // Streak: 5 orders completed within the same calendar week (Mon–Sun)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Monday
  const [weekRow] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(orders)
    .where(and(
      eq(orders.editorId, editorId),
      eq(orders.status, "completed"),
      sql`${orders.updatedAt} >= ${weekStart}`
    ));
  if ((weekRow?.c ?? 0) >= 5) await awardBadge(editorUserId, "streak_master");

  // Consecutive order streak: every 5 completed orders in a row (no cancellation in between) → +100 XP
  await checkOrderStreak(editorUserId, editorId);
}



async function checkOrderStreak(editorUserId: string, editorId: string) {
  // Look at terminal-state orders sorted most-recent first
  const recentOrders = await db
    .select({ status: orders.status })
    .from(orders)
    .where(and(
      eq(orders.editorId, editorId),
      sql`${orders.status} IN ('completed', 'cancelled')`
    ))
    .orderBy(sql`${orders.updatedAt} DESC`)
    .limit(100);

  let streak = 0;
  for (const o of recentOrders) {
    if (o.status === "completed") streak++;
    else break;
  }

  if (streak > 0 && streak % 5 === 0) {
    const milestone = streak / 5;
    const [existing] = await db
      .select({ id: pointTransactions.id })
      .from(pointTransactions)
      .where(and(
        eq(pointTransactions.userId, editorUserId),
        eq(pointTransactions.reason, "order_streak_5"),
        sql`${pointTransactions.metadata}->>'milestone' = ${milestone.toString()}`
      ))
      .limit(1);
    if (!existing) {
      await addPoints(editorUserId, 100, "order_streak_5", { milestone, streak });
      await db.insert(notifications).values({
        userId: editorUserId,
        type: "badge_earned",
        title: `${streak}-order win streak! 🔥`,
        body: `You completed ${streak} orders in a row without a cancellation. +100 XP!`,
        link: "/editor/rewards",
      });
    }
  }
}

/** Called on every sign-in — updates the login streak and awards +25 XP every 7 consecutive days */
export async function onLoginStreak(userId: string) {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD" UTC

  const [user] = await db
    .select({ lastLoginDate: users.lastLoginDate, loginStreakDays: users.loginStreakDays })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return;
  if (user.lastLoginDate === today) return; // already counted today

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const newStreak = user.lastLoginDate === yesterdayStr ? (user.loginStreakDays + 1) : 1;

  await db
    .update(users)
    .set({ loginStreakDays: newStreak, lastLoginDate: today, updatedAt: new Date() })
    .where(eq(users.id, userId));

  if (newStreak % 7 === 0) {
    const milestone = newStreak / 7;
    const [existing] = await db
      .select({ id: pointTransactions.id })
      .from(pointTransactions)
      .where(and(
        eq(pointTransactions.userId, userId),
        eq(pointTransactions.reason, "login_streak_7"),
        sql`${pointTransactions.metadata}->>'milestone' = ${milestone.toString()}`
      ))
      .limit(1);
    if (!existing) {
      await addPoints(userId, 25, "login_streak_7", { milestone, streak: newStreak });
      await db.insert(notifications).values({
        userId,
        type: "badge_earned",
        title: `${newStreak}-day login streak! 🔥`,
        body: `You've logged in ${newStreak} days in a row. +25 XP!`,
      });
    }
  }
}

/** Called when an editor answers a pre-order question (+5 XP) */
export async function onEditorAnsweredQuestion(editorUserId: string) {
  await addPoints(editorUserId, 5, "qa_answered");
}

/** Called when a portfolio item is added (+15 XP, max 5 items, KYC-approved editors only) */
export async function onPortfolioItemAdded(editorUserId: string, editorId: string) {
  const [ed] = await db
    .select({ kycStatus: editors.kycStatus })
    .from(editors)
    .where(eq(editors.id, editorId))
    .limit(1);

  // Only award XP to KYC-verified editors — prevents random uploads farming XP
  if (!ed || ed.kycStatus !== "approved") return;

  const [countRow] = await db
    .select({ c: count() })
    .from(portfolioItems)
    .where(eq(portfolioItems.editorId, editorId));
  if ((countRow?.c ?? 0) <= 5) {
    await addPoints(editorUserId, 15, "portfolio_added");
  }
}

/** Called when a client saves an editor — check client_favorite milestone */
export async function onClientSavedEditor(editorUserId: string, editorId: string) {
  const [countRow] = await db
    .select({ c: sql<number>`COUNT(DISTINCT ${savedEditors.clientId})::int` })
    .from(savedEditors)
    .where(eq(savedEditors.editorId, editorId));
  if ((countRow?.c ?? 0) >= 25) {
    await awardBadge(editorUserId, "client_favorite");
  }
}

/** Called when the editor profile row is first created — check early_bird eligibility */
export async function onEditorCreated(userId: string) {
  const [countRow] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(editors);
  if ((countRow?.c ?? 0) <= 50) {
    await awardBadge(userId, "early_bird");
  }
}

/** Called when a review is received by an editor */
export async function onFiveStarReview(editorUserId: string, rating: number) {
  if (rating === 5) {
    await addPoints(editorUserId, 25, "five_star_review");
    await checkTopRated(editorUserId);
  } else if (rating === 4) {
    await addPoints(editorUserId, 15, "review_received", { rating });
  } else if (rating === 3) {
    await addPoints(editorUserId, 5, "review_received", { rating });
  }
}

/** Called when a client's order is completed — on the 3rd completed order with the same editor, reward both */
export async function onRepeatClientPair(clientUserId: string, editorId: string) {
  const [editorRow] = await db
    .select({ userId: editors.userId })
    .from(editors)
    .where(eq(editors.id, editorId))
    .limit(1);
  if (!editorRow) return;

  const [countRow] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(orders)
    .where(and(eq(orders.clientId, clientUserId), eq(orders.editorId, editorId), eq(orders.status, "completed")));

  if ((countRow?.c ?? 0) === 3) {
    await addPoints(clientUserId, 30, "repeat_client_bonus", { editorId });
    await addPoints(editorRow.userId, 30, "repeat_client_bonus", { clientUserId });
    await db.insert(notifications).values({
      userId: clientUserId,
      type: "badge_earned",
      title: "Loyalty bonus! 🤝",
      body: "You've placed 3 orders with the same editor. +30 XP awarded.",
    });
    await db.insert(notifications).values({
      userId: editorRow.userId,
      type: "badge_earned",
      title: "Repeat client! 🤝",
      body: "A client has ordered from you 3 times. +30 XP awarded.",
    });
  }
}

async function checkTopRated(editorUserId: string) {
  const [editorRow] = await db
    .select({ id: editors.id })
    .from(editors)
    .where(eq(editors.userId, editorUserId))
    .limit(1);

  if (!editorRow) return;

  const [countRow] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(orders)
    .where(and(eq(orders.editorId, editorRow.id), eq(orders.status, "completed")));

  if ((countRow?.c ?? 0) < 50) return;

  // Must also have avg rating ≥ 4.5 across all reviews received
  const [ratingRow] = await db
    .select({ avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)::float` })
    .from(reviews)
    .where(and(eq(reviews.revieweeId, editorUserId), eq(reviews.role, "client")));

  if ((ratingRow?.avg ?? 0) >= 4.5) {
    await awardBadge(editorUserId, "top_rated");
  }
}

/** Called when editor profile is saved or KYC approved — check completeness */
export async function onEditorProfileUpdated(editorUserId: string, editorId: string) {
  const [ed] = await db
    .select({
      bio: editors.bio,
      niche: editors.niche,
      displayName: editors.displayName,
      title: editors.title,
      experienceLevel: editors.experienceLevel,
      kycStatus: editors.kycStatus,
    })
    .from(editors)
    .where(eq(editors.id, editorId))
    .limit(1);

  if (!ed) return;

  // Count portfolio items for this editor
  const [{ portfolioCount }] = await db
    .select({ portfolioCount: count() })
    .from(portfolioItems)
    .where(eq(portfolioItems.editorId, editorId));

  const isComplete =
    !!ed.bio &&
    !!ed.niche &&
    !!ed.displayName &&
    !!ed.title &&
    !!ed.experienceLevel &&
    portfolioCount > 0 &&
    ed.kycStatus === "approved";

  if (isComplete && !(await hasBadge(editorUserId, "profile_star"))) {
    await awardBadge(editorUserId, "profile_star");
    await addPoints(editorUserId, 100, "profile_completed");
  }
}

/** Called when a client's order is completed */
export async function onClientOrderCompleted(clientUserId: string, orderId: string) {
  await addPoints(clientUserId, 20, "order_placed", { orderId });

  const [row] = await db
    .select({ total: sql<number>`COUNT(*)::int` })
    .from(orders)
    .where(and(eq(orders.clientId, clientUserId), eq(orders.status, "completed")));
  const total = row?.total ?? 0;

  if (total >= 1)  await awardBadge(clientUserId, "first_order");
  if (total >= 5)  await awardBadge(clientUserId, "supporter");
  if (total >= 25) await awardBadge(clientUserId, "power_client");

  // ₹200 credit on 10th completed order
  if (total === 10) await addCredit(clientUserId, 20000, "10 orders completed milestone");

  // Loyal Client: completed orders placed across at least 3 distinct calendar months
  if (!(await hasBadge(clientUserId, "loyal_client"))) {
    const [monthRow] = await db
      .select({ distinctMonths: sql<number>`COUNT(DISTINCT DATE_TRUNC('month', ${orders.createdAt}))::int` })
      .from(orders)
      .where(and(eq(orders.clientId, clientUserId), eq(orders.status, "completed")));
    if ((monthRow?.distinctMonths ?? 0) >= 3) {
      await awardBadge(clientUserId, "loyal_client");
    }
  }
}

/** Called when a client leaves a review */
export async function onClientReviewLeft(clientUserId: string, orderId: string) {
  // 1. Verify order is completed (only after payment released)
  const [order] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order || order.status !== "completed") return;

  // 2. Maximum 1 review XP per order & no XP if review edited/resubmitted later
  const [existingTx] = await db
    .select({ id: pointTransactions.id })
    .from(pointTransactions)
    .where(
      and(
        eq(pointTransactions.userId, clientUserId),
        eq(pointTransactions.reason, "review_left"),
        sql`${pointTransactions.metadata}->>'orderId' = ${orderId}`
      )
    )
    .limit(1);

  if (existingTx) return;

  // 3. Award XP
  await addPoints(clientUserId, 20, "review_left", { orderId });

  const [reviewCount] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(pointTransactions)
    .where(and(eq(pointTransactions.userId, clientUserId), eq(pointTransactions.reason, "review_left")));
  if ((reviewCount?.c ?? 0) >= 10) await awardBadge(clientUserId, "top_reviewer");
}

// ─── Penalty triggers ────────────────────────────────────────────────────────

/** Editor: order was cancelled (-40 XP). Call when cancellation is editor-attributable. */
export async function onEditorOrderCancelled(editorUserId: string, orderId: string) {
  const [existing] = await db
    .select({ id: pointTransactions.id })
    .from(pointTransactions)
    .where(and(
      eq(pointTransactions.userId, editorUserId),
      eq(pointTransactions.reason, "order_cancelled_penalty"),
      sql`${pointTransactions.metadata}->>'orderId' = ${orderId}`
    ))
    .limit(1);
  if (existing) return;

  await addPoints(editorUserId, -40, "order_cancelled_penalty", { orderId });
  await db.insert(notifications).values({
    userId: editorUserId,
    type: "badge_earned",
    title: "Order cancelled — XP penalty",
    body: "An order was cancelled on your side. -40 XP deducted. Consistent cancellations affect your rank.",
    link: "/editor/rewards",
  });
}

/** Editor: portfolio items flagged as spam by admin (-25 XP). */
export async function onPortfolioSpam(editorUserId: string) {
  await addPoints(editorUserId, -25, "spam_portfolio_penalty");
  await db.insert(notifications).values({
    userId: editorUserId,
    type: "badge_earned",
    title: "Portfolio flagged as spam — XP penalty",
    body: "One or more portfolio items were removed for violating quality guidelines. -25 XP deducted.",
    link: "/editor/portfolio",
  });
}

/** Editor: review manipulation detected by admin (-100 XP). */
export async function onFakeReview(editorUserId: string) {
  await addPoints(editorUserId, -100, "fake_review_penalty");
  await db.insert(notifications).values({
    userId: editorUserId,
    type: "badge_earned",
    title: "Review manipulation detected — XP penalty",
    body: "A review linked to your account was flagged as inauthentic. -100 XP deducted. This may lead to suspension.",
    link: "/editor/rewards",
  });
}

/** Client: chargeback or payment fraud detected (-100 XP). */
export async function onChargebackFraud(clientUserId: string) {
  await addPoints(clientUserId, -100, "chargeback_fraud_penalty");
  await db.insert(notifications).values({
    userId: clientUserId,
    type: "badge_earned",
    title: "Chargeback fraud detected — XP penalty",
    body: "A fraudulent chargeback was raised on your account. -100 XP deducted. Continued abuse will result in suspension.",
    link: "/client/rewards",
  });
}

/** Client or editor: abusive behaviour reported and confirmed (-50 XP). */
export async function onAbusiveBehavior(userId: string, role: "editor" | "client") {
  await addPoints(userId, -50, "abusive_behavior_penalty");
  await db.insert(notifications).values({
    userId,
    type: "badge_earned",
    title: "Abusive behaviour reported — XP penalty",
    body: "A report of abusive conduct on your account has been confirmed. -50 XP deducted. Repeated violations lead to a permanent ban.",
    link: `/${role}/rewards`,
  });
}

/** Get a user's full rewards profile */
export async function getUserRewards(userId: string) {
  const [pts, badges, userRow] = await Promise.all([
    db.select().from(userPoints).where(eq(userPoints.userId, userId)).limit(1).then(r => r[0]),
    db.select().from(userBadges).where(eq(userBadges.userId, userId)).orderBy(userBadges.awardedAt),
    db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1).then(r => r[0]),
  ]);

  const role = userRow?.role === "editor" ? "editor" : "client";
  const level = (pts?.level ?? (role === "editor" ? "level1" : "bronze")) as any;
  const levelsList = role === "editor" ? EDITOR_LEVELS : CLIENT_LEVELS;
  const nextLevel = levelsList.find(l => l.min > (pts?.total ?? 0));
  const xpToNext = nextLevel ? nextLevel.min - (pts?.total ?? 0) : 0;

  return {
    xp: pts?.total ?? 0,
    currentXp: pts?.current ?? 0,
    level,
    xpToNext,
    nextLevel: nextLevel?.name ?? null,
    badges: badges.map(b => ({ ...b, ...BADGES[b.badge] })),
  };
}

/** Get available credits for a user (unexpired, unused) */
export async function getAvailableCredits(userId: string) {
  const now = new Date();
  const rows = await db
    .select({ id: userCredits.id, amount: userCredits.amount })
    .from(userCredits)
    .where(and(
      eq(userCredits.userId, userId),
      sql`${userCredits.usedAt} IS NULL`,
      sql`(${userCredits.expiresAt} IS NULL OR ${userCredits.expiresAt} > ${now})`
    ))
    .orderBy(userCredits.expiresAt); // consume soonest-expiring first
  return { total: rows.reduce((sum, r) => sum + r.amount, 0), rows };
}

/**
 * Consume up to `maxAmount` paise of available credits, marking each row used.
 * Returns the actual amount consumed.
 */
export async function consumeCredits(userId: string, maxAmount: number, orderId: string) {
  const { rows } = await getAvailableCredits(userId);
  let remaining = maxAmount;
  let consumed = 0;

  for (const row of rows) {
    if (remaining <= 0) break;
    const use = Math.min(row.amount, remaining);
    await db
      .update(userCredits)
      .set({ usedAt: new Date(), orderId })
      .where(eq(userCredits.id, row.id));
    consumed += use;
    remaining -= use;
  }
  return consumed;
}

/** Progress counters needed to compute milestone progress */
export async function getUserProgress(userId: string, role: "editor" | "client", editorId?: string) {
  const result: Record<string, number> = {};

  if (role === "editor" && editorId) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));

    const [completed, earlyCount, fiveStarCount, weekRow] = await Promise.all([
      db.select({ c: sql<number>`COUNT(*)::int` }).from(orders)
        .where(and(eq(orders.editorId, editorId), eq(orders.status, "completed")))
        .then(r => r[0]),
      db.select({ c: sql<number>`COUNT(*)::int` }).from(pointTransactions)
        .where(and(eq(pointTransactions.userId, userId), eq(pointTransactions.reason, "early_delivery")))
        .then(r => r[0]),
      db.select({ c: sql<number>`COUNT(*)::int` }).from(pointTransactions)
        .where(and(eq(pointTransactions.userId, userId), eq(pointTransactions.reason, "five_star_review")))
        .then(r => r[0]),
      db.select({ c: sql<number>`COUNT(*)::int` }).from(orders)
        .where(and(eq(orders.editorId, editorId), eq(orders.status, "completed"), sql`${orders.updatedAt} >= ${weekStart}`))
        .then(r => r[0]),
    ]);

    result.completedOrders = completed?.c ?? 0;
    result.earlyDeliveries = earlyCount?.c ?? 0;
    result.fiveStarReviews = fiveStarCount?.c ?? 0;
    result.weekOrders     = weekRow?.c ?? 0;
  }

  if (role === "client") {
    const [placed] = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(orders)
      .where(eq(orders.clientId, userId));
    result.placedOrders = placed?.c ?? 0;

    const [reviewCount] = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(pointTransactions)
      .where(and(eq(pointTransactions.userId, userId), eq(pointTransactions.reason, "review_left")));
    result.reviewsLeft = reviewCount?.c ?? 0;
  }

  return result;
}

const LEVEL_ORDER_ALL: Level[] = ["bronze", "silver", "gold", "platinum"];

/** Perks unlocked by level */
export function getLevelPerks(level: string) {
  if (level.startsWith("level")) {
    const num = parseInt(level.replace("level", ""), 10) || 1;
    return {
      maxPackages: num < 3 ? 3 : num < 4 ? 4 : 5,
      featuredInBrowse: num >= 4,
      clientDiscountPercent: 0,
      prioritySupport: num >= 7,
      customBanner: num >= 6,
      accountManager: num >= 7,
    };
  }

  const idx = LEVEL_ORDER_ALL.indexOf(level as any);
  return {
    maxPackages: idx < 1 ? 3 : idx < 2 ? 4 : 5,
    featuredInBrowse: idx >= 2,
    clientDiscountPercent: ([0, 2, 5, 10] as const)[idx] ?? 0,
    prioritySupport: idx >= 3,
    customBanner: idx >= 3,
    accountManager: idx >= 3,
  };
}
