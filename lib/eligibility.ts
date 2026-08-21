/**
 * Central editor order-acceptance eligibility check.
 *
 * canEditorAcceptOrder() is the single source of truth for all eligibility gates.
 * Both the API (server-authoritative) and UI (for disabling the button) use this.
 * The server is always authoritative — the UI check only drives presentation.
 */

import { db } from "@/lib/db";
import { editors, orders, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export type EligibilityCode =
  | "OK"
  | "NOT_AUTHENTICATED"
  | "ACCOUNT_INACTIVE"
  | "SUSPENDED"
  | "EDITOR_UNAVAILABLE"
  | "KYC_NOT_APPROVED"
  | "CRITICAL_HEALTH"
  | "ORDER_NOT_FOUND"
  | "NOT_ASSIGNED"
  | "ORDER_NOT_PENDING"
  | "WINDOW_EXPIRED";

export interface EligibilityResult {
  eligible: boolean;
  code:     EligibilityCode;
  reason?:  string;   // human-readable; shown to the editor
}

const WINDOW_HOURS = 24;

export async function canEditorAcceptOrder(
  editorId: string,
  orderId:  string,
  sessionUserId: string,
): Promise<EligibilityResult> {

  // 1. Editor record must exist and belong to the session user
  const [editorRow] = await db
    .select({
      id:              editors.id,
      userId:          editors.userId,
      kycStatus:       editors.kycStatus,
      isSuspended:     editors.isSuspended,
      suspensionReason:editors.suspensionReason,
      healthStatus:    editors.healthStatus,
      isAvailable:     editors.isAvailable,
    })
    .from(editors)
    .where(and(eq(editors.id, editorId), eq(editors.userId, sessionUserId)))
    .limit(1);

  if (!editorRow) {
    return { eligible: false, code: "NOT_AUTHENTICATED", reason: "Editor record not found." };
  }

  // 2. User account must be active
  const [userRow] = await db
    .select({ isActive: users.isActive })
    .from(users)
    .where(eq(users.id, sessionUserId))
    .limit(1);

  if (!userRow?.isActive) {
    return { eligible: false, code: "ACCOUNT_INACTIVE", reason: "Your account is inactive. Please contact support." };
  }

  // 3. Not suspended (admin/moderation action — separate from health)
  if (editorRow.isSuspended) {
    return {
      eligible: false,
      code: "SUSPENDED",
      reason: editorRow.suspensionReason
        ? `Your account is suspended: ${editorRow.suspensionReason}`
        : "Your account is suspended. Please contact support.",
    };
  }

  // 3.5 Editor must be set as available
  if (!editorRow.isAvailable) {
    return {
      eligible: false,
      code: "EDITOR_UNAVAILABLE",
      reason: "You are currently set to unavailable. Toggle your availability in your dashboard to accept new orders.",
    };
  }

  // 4. KYC must be approved
  if (editorRow.kycStatus !== "approved") {
    return {
      eligible: false,
      code: "KYC_NOT_APPROVED",
      reason: editorRow.kycStatus === "expired"
        ? "Your KYC has expired. Please resubmit your verification documents."
        : "KYC verification is required before you can accept orders.",
    };
  }

  // 5. Account Health must not be Critical
  if (editorRow.healthStatus === "critical") {
    return {
      eligible: false,
      code: "CRITICAL_HEALTH",
      reason: "New order acceptance is currently paused because your Account Health is Critical. View your Account Health to see required actions.",
    };
  }

  // 6. Order must exist
  const [order] = await db
    .select({
      id:        orders.id,
      status:    orders.status,
      editorId:  orders.editorId,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    return { eligible: false, code: "ORDER_NOT_FOUND", reason: "Order not found." };
  }

  // 7. This editor must be assigned to the order
  if (order.editorId !== editorId) {
    return { eligible: false, code: "NOT_ASSIGNED", reason: "This order is not assigned to you." };
  }

  // 8. Order must still be pending
  if (order.status !== "pending") {
    return {
      eligible: false,
      code: "ORDER_NOT_PENDING",
      reason: order.status === "cancelled"
        ? "This order was cancelled before you could accept it."
        : "This order is no longer pending.",
    };
  }

  // 9. 24-hour acceptance window must not have expired
  const deadline = new Date(order.createdAt.getTime() + WINDOW_HOURS * 60 * 60 * 1000);
  if (new Date() > deadline) {
    return {
      eligible: false,
      code: "WINDOW_EXPIRED",
      reason: "The 24-hour acceptance window for this order has expired.",
    };
  }

  return { eligible: true, code: "OK" };
}
