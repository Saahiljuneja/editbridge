import { db } from "@/lib/db";
import { userPoints, pointTransactions, userBadges, userCredits, notifications, orders, editors, reviews, portfolioItems, disputes, savedEditors } from "@/lib/db/schema";
import { eq, and, sql, gte, count } from "drizzle-orm";

// ─── Level thresholds ─────────────────────────────────────────────────────────

export const LEVELS = [
  { name: "bronze",   min: 0,     max: 499  },
  { name: "silver",   min: 500,   max: 1999 },
  { name: "gold",     min: 2000,  max: 4999 },
  { name: "platinum", min: 5000,  max: Infinity },
] as const;

export type Level = "bronze" | "silver" | "gold" | "platinum";

export function calcLevel(totalXp: number): Level {
  for (const l of [...LEVELS].reverse()) {
    if (totalXp >= l.min) return l.name as Level;
  }
  return "bronze";
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

async function addPoints(userId: string, amount: number, reason: string, metadata: Record<string, unknown> = {}) {
  const pts = await getOrCreatePoints(userId);
  const newTotal = pts.total + amount;
  const newCurrent = pts.current + amount;
  const newLevel = calcLevel(newTotal);
  const oldLevel = pts.level as Level;

  await db.update(userPoints).set({
    total: newTotal,
    current: newCurrent,
    level: newLevel,
    updatedAt: new Date(),
  }).where(eq(userPoints.userId, userId));

  await db.insert(pointTransactions).values({ userId, amount, reason, metadata });

  // Notify on level up
  if (newLevel !== oldLevel) {
    const perks: Record<Level, string> = {
      bronze:   "",
      silver:   "You can now offer 4 packages. Clients also get a discount on orders with you.",
      gold:     "You're featured in browse results! Clients get a bigger discount.",
      platinum: "You've unlocked priority support and a custom profile banner.",
    };
    await db.insert(notifications).values({
      userId,
      type: "level_up",
      title: `Level up! You're now ${newLevel.charAt(0).toUpperCase() + newLevel.slice(1)} 🎉`,
      body: perks[newLevel] || "Keep up the great work!",
    });
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

  // +15 XP for early delivery
  if (deliveredBeforeDeadline) {
    await addPoints(editorUserId, 15, "early_delivery", { orderId });
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
}

/** Called when a client sends an editor a quote request (+10 XP, max 3/day) */
export async function onQuoteReceived(editorUserId: string) {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const [todayCount] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(pointTransactions)
    .where(and(eq(pointTransactions.userId, editorUserId), eq(pointTransactions.reason, "quote_received"), gte(pointTransactions.createdAt, dayStart)));
  if ((todayCount?.c ?? 0) < 3) {
    await addPoints(editorUserId, 10, "quote_received");
  }
}

/** Called when an editor answers a pre-order question (+5 XP) */
export async function onEditorAnsweredQuestion(editorUserId: string) {
  await addPoints(editorUserId, 5, "qa_answered");
}

/** Called when a portfolio item is added (+15 XP, max 5 items total) */
export async function onPortfolioItemAdded(editorUserId: string, editorId: string) {
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

/** Called when a review is received by an editor (any rating ≥ 3 earns XP) */
export async function onFiveStarReview(editorUserId: string, rating: number) {
  if (rating < 3) return;
  if (rating === 5) {
    await addPoints(editorUserId, 25, "five_star_review");
    await checkTopRated(editorUserId);
  } else {
    await addPoints(editorUserId, 10, "review_received", { rating });
  }
}

/** Called when a client places an order — on the 3rd order with the same editor, reward both */
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
    .where(and(eq(orders.clientId, clientUserId), eq(orders.editorId, editorId)));

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
    .select({ id: editors.id, totalOrders: editors.totalOrders })
    .from(editors)
    .where(eq(editors.userId, editorUserId))
    .limit(1);

  if (!editorRow || editorRow.totalOrders < 50) return;

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

/** Called when a client places an order */
export async function onClientOrderPlaced(clientUserId: string, orderId: string) {
  await addPoints(clientUserId, 20, "order_placed", { orderId });

  const [row] = await db
    .select({ total: sql<number>`COUNT(*)::int` })
    .from(orders)
    .where(eq(orders.clientId, clientUserId));
  const total = row?.total ?? 0;

  if (total >= 1)  await awardBadge(clientUserId, "first_order");
  if (total >= 5)  await awardBadge(clientUserId, "supporter");
  if (total >= 25) await awardBadge(clientUserId, "power_client");

  // ₹200 credit on 10th order
  if (total === 10) await addCredit(clientUserId, 20000, "10 orders placed milestone");

  // Loyal Client: orders placed across at least 3 distinct calendar months
  if (!(await hasBadge(clientUserId, "loyal_client"))) {
    const [monthRow] = await db
      .select({ distinctMonths: sql<number>`COUNT(DISTINCT DATE_TRUNC('month', ${orders.createdAt}))::int` })
      .from(orders)
      .where(eq(orders.clientId, clientUserId));
    if ((monthRow?.distinctMonths ?? 0) >= 3) {
      await awardBadge(clientUserId, "loyal_client");
    }
  }
}

/** Called when a client leaves a review */
export async function onClientReviewLeft(clientUserId: string) {
  await addPoints(clientUserId, 20, "review_left");

  const [reviewCount] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(pointTransactions)
    .where(and(eq(pointTransactions.userId, clientUserId), eq(pointTransactions.reason, "review_left")));
  if ((reviewCount?.c ?? 0) >= 10) await awardBadge(clientUserId, "top_reviewer");
}

/** Get a user's full rewards profile */
export async function getUserRewards(userId: string) {
  const [pts, badges] = await Promise.all([
    db.select().from(userPoints).where(eq(userPoints.userId, userId)).limit(1).then(r => r[0]),
    db.select().from(userBadges).where(eq(userBadges.userId, userId)).orderBy(userBadges.awardedAt),
  ]);

  const level = pts?.level as Level ?? "bronze";
  const nextLevel = LEVELS.find(l => l.name !== level && l.min > (pts?.total ?? 0));
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

/** Perks unlocked by level */
export function getLevelPerks(level: Level) {
  return {
    maxPackages: level === "bronze" ? 3 : level === "silver" ? 4 : 5,
    featuredInBrowse: level === "gold" || level === "platinum",
    clientDiscountPercent: level === "silver" ? 2 : level === "gold" ? 5 : level === "platinum" ? 10 : 0,
    prioritySupport: level === "platinum",
    customBanner: level === "platinum",
  };
}
