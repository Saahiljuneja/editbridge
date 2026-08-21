/**
 * Editor Account Health — calculation service
 *
 * Health is independent of XP/tier and of Razorpay rating.
 * It measures current operational reliability across 5 categories.
 *
 * To change weights: edit WEIGHTS only. Do not change the calculation logic.
 */

import { db } from "@/lib/db";
import { editors, orders, reviews, disputes, packages, messages, revisionRequests } from "@/lib/db/schema";
import { and, eq, sql, inArray, isNotNull, count, avg } from "drizzle-orm";

// ── Category weights — the only place these numbers live ─────────────────────
export const WEIGHTS = {
  orderReliability:  0.30,
  quality:           0.30,
  clientExperience:  0.20,
  compliance:        0.15,
  activity:          0.05,
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export type HealthStatus =
  | "excellent"        // 90–100
  | "good"             // 75–89
  | "needs_attention"  // 60–74
  | "at_risk"          // 40–59
  | "critical";        // 0–39

export interface ImprovementAction {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  href?: string;
}

export interface HealthResult {
  totalScore: number;
  healthStatus: HealthStatus;
  categoryScores: {
    orderReliability: number;
    quality:          number;
    clientExperience: number;
    compliance:       number;
    activity:         number;
  };
  signals: {
    // Order Reliability
    acceptanceRate:        number;   // 0–100
    noResponseRate:        number;   // 0–100 (lower = better)
    onTimeDeliveryPct:     number;   // 0–100
    editorCancellationRate:number;   // 0–100 (lower = better)
    // Quality
    avgRating:             number;   // 0–5
    fiveStarPct:           number;   // 0–100
    revisionFrequency:     number;   // revisions per completed order
    disputeRate:           number;   // 0–100 (lower = better)
    // Client Experience
    responseRateScore:     number;   // 0–100
    repeatClientRate:      number;   // 0–100
    openDisputeCount:      number;
    // Compliance
    kycScore:              number;   // 0–100
    hasBankAccount:        boolean;
    hasActivePackage:      boolean;
    panProvided:           boolean;
    // Activity
    daysSinceLastOrder:    number;   // null treated as 999
    isAvailable:           boolean;
    activeOrderCount:      number;
    // Sample sizes
    totalOrdersReceived:   number;
    totalCompleted:        number;
  };
  improvementActions: ImprovementAction[];
  computedAt: Date;
}

// ── Status thresholds ─────────────────────────────────────────────────────────

export function scoreToStatus(score: number): HealthStatus {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 60) return "needs_attention";
  if (score >= 40) return "at_risk";
  return "critical";
}

// ── Normalisation helpers (clamp to 0–100) ───────────────────────────────────

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

// Higher acceptance rate → better
function acceptanceScore(rate: number): number {
  if (rate >= 90) return 100;
  if (rate >= 80) return 85;
  if (rate >= 70) return 65;
  if (rate >= 60) return 45;
  return Math.max(0, rate * 0.5);
}

// Lower no-response rate → better (noResponseRate is 0–100)
function noResponseScore(rate: number): number {
  if (rate <= 2)  return 100;
  if (rate <= 5)  return 85;
  if (rate <= 10) return 65;
  if (rate <= 20) return 40;
  return Math.max(0, 100 - rate * 2);
}

// Higher on-time % → better
function onTimeScore(pct: number): number {
  if (pct >= 95) return 100;
  if (pct >= 85) return 80;
  if (pct >= 75) return 60;
  if (pct >= 60) return 40;
  return Math.max(0, pct * 0.5);
}

// Lower editor cancellation rate → better (rate is 0–100)
function cancellationScore(rate: number): number {
  if (rate <= 2)  return 100;
  if (rate <= 5)  return 80;
  if (rate <= 10) return 55;
  if (rate <= 20) return 30;
  return Math.max(0, 100 - rate * 2.5);
}

// Avg rating 0–5 → 0–100
function ratingScore(avgRating: number, totalReviews: number): number {
  if (totalReviews === 0) return 80; // neutral default for new editors
  if (avgRating >= 4.8) return 100;
  if (avgRating >= 4.5) return 85;
  if (avgRating >= 4.0) return 65;
  if (avgRating >= 3.5) return 45;
  return Math.max(0, avgRating * 15);
}

// avgResponseTime in minutes → score
function responseTimeToScore(minutes: number | null): number {
  if (minutes == null) return 75; // neutral default
  if (minutes <= 30)   return 100;
  if (minutes <= 120)  return 90;
  if (minutes <= 360)  return 75;
  if (minutes <= 720)  return 55;
  if (minutes <= 1440) return 35;
  return 15;
}

// Lower dispute rate → better (rate is 0–100)
function disputeScore(rate: number, totalCompleted: number): number {
  if (totalCompleted === 0) return 100;
  if (rate <= 2)  return 100;
  if (rate <= 5)  return 75;
  if (rate <= 10) return 45;
  return Math.max(0, 100 - rate * 3);
}

// Days since last order → activity score
function activityScore(days: number): number {
  if (days <= 7)  return 100;
  if (days <= 14) return 90;
  if (days <= 30) return 75;
  if (days <= 60) return 55;
  if (days <= 90) return 35;
  return 15;
}

// ── Main calculation ──────────────────────────────────────────────────────────

export async function calculateEditorHealth(editorId: string): Promise<HealthResult> {
  const computedAt = new Date();

  // ── Fetch editor row ───────────────────────────────────────────────────────
  const [editor] = await db
    .select({
      kycStatus:         editors.kycStatus,
      avgResponseTime:   editors.avgResponseTime,
      isAvailable:       editors.isAvailable,
      vacationUntil:     editors.vacationUntil,
      razorpayAccountId: editors.razorpayAccountId,
      bankAccountNumber: editors.bankAccountNumber,
      panNumberHash:     editors.panNumberHash,
    })
    .from(editors)
    .where(eq(editors.id, editorId))
    .limit(1);

  if (!editor) throw new Error(`Editor not found: ${editorId}`);

  // ── Orders aggregate ───────────────────────────────────────────────────────
  const { rows: [orderStats] } = await db.execute<{
    total_received:         number;
    accepted_count:         number;
    declined_count:         number;
    no_response_count:      number;
    editor_cancelled_count: number;
    completed_count:        number;
    delivered_on_time:      number;
    delivered_total:        number;
    last_completed_days_ago:number | null;
    active_count:           number;
  }>(sql`
    SELECT
      COUNT(*)::int                                                       AS total_received,
      COUNT(*) FILTER (WHERE accepted_at IS NOT NULL)::int               AS accepted_count,
      COUNT(*) FILTER (WHERE cancellation_reason = 'EDITOR_DECLINED')::int AS declined_count,
      COUNT(*) FILTER (WHERE cancellation_reason = 'EDITOR_NO_RESPONSE')::int AS no_response_count,
      COUNT(*) FILTER (WHERE cancelled_by = 'editor')::int              AS editor_cancelled_count,
      COUNT(*) FILTER (WHERE status = 'completed')::int                  AS completed_count,
      COUNT(*) FILTER (WHERE delivered_at IS NOT NULL AND deadline IS NOT NULL AND delivered_at <= deadline)::int AS delivered_on_time,
      COUNT(*) FILTER (WHERE delivered_at IS NOT NULL)::int              AS delivered_total,
      EXTRACT(EPOCH FROM (NOW() - MAX(completed_at))) / 86400            AS last_completed_days_ago,
      COUNT(*) FILTER (WHERE status IN ('pending','in_progress','delivered','revision_requested'))::int AS active_count
    FROM orders
    WHERE editor_id = ${editorId}::uuid
  `);

  const stats = orderStats ?? {
    total_received: 0, accepted_count: 0, declined_count: 0,
    no_response_count: 0, editor_cancelled_count: 0, completed_count: 0,
    delivered_on_time: 0, delivered_total: 0, last_completed_days_ago: null, active_count: 0,
  };

  // Acceptance rate denominator: orders that had a clear accept/decline/no-response outcome
  const decisiveOrders = stats.accepted_count + stats.declined_count + stats.no_response_count;
  const acceptanceRateVal = decisiveOrders > 0
    ? Math.round((stats.accepted_count / decisiveOrders) * 100) : 100;
  const noResponseRateVal = decisiveOrders > 0
    ? Math.round((stats.no_response_count / decisiveOrders) * 100) : 0;
  const onTimeDeliveryPct = stats.delivered_total > 0
    ? Math.round((stats.delivered_on_time / stats.delivered_total) * 100) : 100;
  const editorCancellationRateVal = stats.accepted_count > 0
    ? Math.round((stats.editor_cancelled_count / stats.accepted_count) * 100) : 0;

  // ── Reviews aggregate ──────────────────────────────────────────────────────
  const { rows: [reviewStats] } = await db.execute<{
    avg_rating:    number | null;
    total_reviews: number;
    five_star_count: number;
  }>(sql`
    SELECT
      ROUND(AVG(rating)::numeric, 2)                       AS avg_rating,
      COUNT(*)::int                                        AS total_reviews,
      COUNT(*) FILTER (WHERE rating = 5)::int              AS five_star_count
    FROM reviews r
    INNER JOIN orders o ON o.id = r.order_id
    WHERE o.editor_id = ${editorId}::uuid AND r.role = 'client'
  `);

  const avgRatingVal    = Number(reviewStats?.avg_rating ?? 0);
  const totalReviews    = reviewStats?.total_reviews ?? 0;
  const fiveStarPctVal  = totalReviews > 0
    ? Math.round(((reviewStats?.five_star_count ?? 0) / totalReviews) * 100) : 100;

  // ── Revision frequency ─────────────────────────────────────────────────────
  const { rows: [revStats] } = await db.execute<{ rev_count: number }>(sql`
    SELECT COUNT(rr.id)::int AS rev_count
    FROM revision_requests rr
    INNER JOIN orders o ON o.id = rr.order_id
    WHERE o.editor_id = ${editorId}::uuid
  `);
  const revisionCount     = revStats?.rev_count ?? 0;
  const revisionFrequency = stats.completed_count > 0 ? revisionCount / stats.completed_count : 0;

  // ── Disputes ───────────────────────────────────────────────────────────────
  const { rows: [disputeStats] } = await db.execute<{ total_disputes: number; open_disputes: number }>(sql`
    SELECT
      COUNT(d.id)::int                                         AS total_disputes,
      COUNT(d.id) FILTER (WHERE d.status = 'open')::int       AS open_disputes
    FROM disputes d
    INNER JOIN orders o ON o.id = d.order_id
    WHERE o.editor_id = ${editorId}::uuid
  `);
  const totalDisputes   = disputeStats?.total_disputes ?? 0;
  const openDisputeCount = disputeStats?.open_disputes ?? 0;
  const disputeRateVal  = stats.completed_count > 0
    ? Math.round((totalDisputes / stats.completed_count) * 100) : 0;

  // ── Repeat client rate ─────────────────────────────────────────────────────
  const { rows: [clientStats] } = await db.execute<{ unique_clients: number; repeat_clients: number }>(sql`
    SELECT
      COUNT(DISTINCT client_id)::int AS unique_clients,
      COUNT(DISTINCT client_id) FILTER (WHERE order_count >= 2)::int AS repeat_clients
    FROM (
      SELECT client_id, COUNT(*) AS order_count
      FROM orders
      WHERE editor_id = ${editorId}::uuid AND status = 'completed'
      GROUP BY client_id
    ) sub
  `);
  const uniqueClients   = clientStats?.unique_clients ?? 0;
  const repeatClientRateVal = uniqueClients > 0
    ? Math.round(((clientStats?.repeat_clients ?? 0) / uniqueClients) * 100) : 0;

  // ── Active packages ────────────────────────────────────────────────────────
  const { rows: [pkgRow] } = await db.execute<{ active_count: number }>(sql`
    SELECT COUNT(*)::int AS active_count FROM packages
    WHERE editor_id = ${editorId}::uuid AND is_active = true
  `);
  const hasActivePackage = (pkgRow?.active_count ?? 0) > 0;

  // ── Category scores ────────────────────────────────────────────────────────

  const orderReliabilityScore = clamp(
    acceptanceScore(acceptanceRateVal) * 0.35 +
    noResponseScore(noResponseRateVal) * 0.30 +
    onTimeScore(onTimeDeliveryPct)     * 0.25 +
    cancellationScore(editorCancellationRateVal) * 0.10
  );

  const revisionScore = clamp(revisionFrequency <= 0.2 ? 100 : revisionFrequency <= 0.5 ? 80 : revisionFrequency <= 1 ? 55 : 30);

  const qualityScore = clamp(
    ratingScore(avgRatingVal, totalReviews)               * 0.45 +
    clamp(fiveStarPctVal)                                 * 0.25 +
    revisionScore                                         * 0.15 +
    disputeScore(disputeRateVal, stats.completed_count)   * 0.15
  );

  const responseRateScore = responseTimeToScore(editor.avgResponseTime);
  const repeatScore       = uniqueClients === 0 ? 75 : clamp(repeatClientRateVal);
  const openDisputePenalty = Math.min(50, openDisputeCount * 15);
  const clientExperienceScore = clamp(
    responseRateScore * 0.50 +
    repeatScore       * 0.30 +
    Math.max(0, 100 - openDisputePenalty) * 0.20
  );

  // Compliance signals
  const hasBankAccount = !!(editor.razorpayAccountId || editor.bankAccountNumber);
  const panProvided    = !!editor.panNumberHash;
  const kycScoreVal    = editor.kycStatus === "approved" ? 100
    : editor.kycStatus === "pending"  ? 60
    : editor.kycStatus === "expired"  ? 40
    : 0; // rejected
  const complianceScore = clamp(
    kycScoreVal * 0.50 +
    (hasBankAccount   ? 100 : 0) * 0.20 +
    (hasActivePackage ? 100 : 0) * 0.20 +
    (panProvided      ? 100 : 0) * 0.10
  );

  // Activity signals
  const daysSinceLastOrder = stats.last_completed_days_ago != null
    ? Math.round(Number(stats.last_completed_days_ago)) : 999;
  const onVacation = !!(editor.vacationUntil && editor.vacationUntil > computedAt);
  const availableScore = editor.isAvailable && !onVacation ? 100 : onVacation ? 60 : 40;
  const recencyScore   = daysSinceLastOrder === 999
    ? (stats.total_received === 0 ? 80 : 20)
    : activityScore(daysSinceLastOrder);

  const activityScoreVal = clamp(
    recencyScore   * 0.60 +
    availableScore * 0.40
  );

  // ── Weighted total ─────────────────────────────────────────────────────────
  const totalScore = clamp(
    orderReliabilityScore * WEIGHTS.orderReliability +
    qualityScore          * WEIGHTS.quality +
    clientExperienceScore * WEIGHTS.clientExperience +
    complianceScore       * WEIGHTS.compliance +
    activityScoreVal      * WEIGHTS.activity
  );

  const healthStatus = scoreToStatus(totalScore);

  // ── Improvement actions (only generated for signals actually dragging the score) ──

  const actions: ImprovementAction[] = [];

  if (noResponseRateVal > 10) {
    actions.push({
      priority: "high",
      title: "Respond to pending order requests",
      description: `${noResponseRateVal}% of your orders expired without a response. Reply within 24 hours to avoid auto-cancellation.`,
      href: "/editor/orders",
    });
  }

  if (acceptanceRateVal < 75 && decisiveOrders >= 5) {
    actions.push({
      priority: "high",
      title: "Improve your acceptance rate",
      description: `Your acceptance rate is ${acceptanceRateVal}%. Consider adjusting your packages or availability if certain order types don't suit you.`,
      href: "/editor/packages",
    });
  }

  if (onTimeDeliveryPct < 85 && stats.delivered_total >= 3) {
    actions.push({
      priority: "high",
      title: "Deliver orders on time",
      description: `${100 - onTimeDeliveryPct}% of your deliveries were late. Request a deadline extension early rather than missing it.`,
      href: "/editor/orders",
    });
  }

  if (openDisputeCount > 0) {
    actions.push({
      priority: "high",
      title: `Resolve ${openDisputeCount} open dispute${openDisputeCount > 1 ? "s" : ""}`,
      description: "Open disputes affect your client experience score. Respond promptly to help reach a resolution.",
      href: "/editor/disputes",
    });
  }

  if (editor.kycStatus !== "approved") {
    actions.push({
      priority: "high",
      title: "Complete KYC verification",
      description: `Your KYC status is ${editor.kycStatus}. Verified editors receive full compliance score credit.`,
      href: "/editor/kyc",
    });
  }

  if (!hasBankAccount) {
    actions.push({
      priority: "medium",
      title: "Add your bank account",
      description: "A verified payout account is required to receive earnings and earns compliance credit.",
      href: "/editor/settings",
    });
  }

  if (!hasActivePackage) {
    actions.push({
      priority: "medium",
      title: "Activate at least one package",
      description: "Having an active package shows clients what you offer and counts toward your compliance score.",
      href: "/editor/packages",
    });
  }

  if (avgRatingVal < 4.0 && totalReviews >= 5) {
    actions.push({
      priority: "medium",
      title: "Focus on quality to improve ratings",
      description: `Your average rating is ${avgRatingVal.toFixed(1)} ★. Read client briefs carefully and confirm scope before starting.`,
    });
  }

  if (editorCancellationRateVal > 5 && stats.accepted_count >= 5) {
    actions.push({
      priority: "medium",
      title: "Reduce editor-initiated cancellations",
      description: `${editorCancellationRateVal}% of accepted orders were later cancelled by you. Only accept orders you can complete.`,
    });
  }

  if ((editor.avgResponseTime ?? 0) > 720 && totalReviews >= 3) {
    actions.push({
      priority: "low",
      title: "Respond to messages faster",
      description: "Your average response time is over 12 hours. Faster replies improve your client experience score.",
    });
  }

  if (!panProvided) {
    actions.push({
      priority: "low",
      title: "Add your PAN number",
      description: "PAN is required for tax compliance and counts toward your compliance score.",
      href: "/editor/settings",
    });
  }

  if (daysSinceLastOrder > 30 && stats.total_received > 0) {
    actions.push({
      priority: "low",
      title: "Stay active on the platform",
      description: "Your last completed order was over 30 days ago. Regular activity keeps your account health strong.",
      href: "/editor/orders",
    });
  }

  // Sort: high → medium → low
  actions.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.priority] - rank[b.priority];
  });

  return {
    totalScore,
    healthStatus,
    categoryScores: {
      orderReliability: orderReliabilityScore,
      quality:          qualityScore,
      clientExperience: clientExperienceScore,
      compliance:       complianceScore,
      activity:         activityScoreVal,
    },
    signals: {
      acceptanceRate:         acceptanceRateVal,
      noResponseRate:         noResponseRateVal,
      onTimeDeliveryPct,
      editorCancellationRate: editorCancellationRateVal,
      avgRating:              avgRatingVal,
      fiveStarPct:            fiveStarPctVal,
      revisionFrequency,
      disputeRate:            disputeRateVal,
      responseRateScore,
      repeatClientRate:       repeatClientRateVal,
      openDisputeCount,
      kycScore:               kycScoreVal,
      hasBankAccount,
      hasActivePackage,
      panProvided,
      daysSinceLastOrder,
      isAvailable:            editor.isAvailable,
      activeOrderCount:       stats.active_count,
      totalOrdersReceived:    stats.total_received,
      totalCompleted:         stats.completed_count,
    },
    improvementActions: actions,
    computedAt,
  };
}

// ── Persist to editors table ──────────────────────────────────────────────────

export async function persistEditorHealth(editorId: string): Promise<void> {
  const result = await calculateEditorHealth(editorId);

  // Only send a degradation notification if status worsened
  const [current] = await db
    .select({ healthStatus: editors.healthStatus, userId: editors.userId })
    .from(editors)
    .where(eq(editors.id, editorId))
    .limit(1);

  await db
    .update(editors)
    .set({
      healthScore:       result.totalScore,
      healthStatus:      result.healthStatus,
      healthComputedAt:  result.computedAt,
      acceptanceRate:    result.signals.acceptanceRate,
      noResponseRate:    result.signals.noResponseRate,
      responseRate:      result.signals.responseRateScore,
      updatedAt:         result.computedAt,
    })
    .where(eq(editors.id, editorId));

  // Notify when status crosses a meaningful threshold downward
  if (current?.userId && current.healthStatus && current.healthStatus !== result.healthStatus) {
    const rank: Record<string, number> = {
      excellent: 4, good: 3, needs_attention: 2, at_risk: 1, critical: 0,
    };
    const before = rank[current.healthStatus] ?? 3;
    const after  = rank[result.healthStatus]  ?? 3;
    if (after < before && (result.healthStatus === "at_risk" || result.healthStatus === "critical")) {
      // Fire-and-forget — import lazily to avoid circular deps
      const { notifyHealthDegraded } = await import("@/lib/notifications");
      notifyHealthDegraded(current.userId, editorId, result.healthStatus, result.improvementActions[0]);
    }
  }
}
