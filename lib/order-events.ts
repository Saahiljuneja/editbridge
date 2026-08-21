import { db } from "@/lib/db";
import { orderEvents } from "@/lib/db/schema";

export type OrderEventType =
  | "order_placed"
  | "order_accepted"
  | "order_declined"
  | "delivery_uploaded"
  | "revision_requested"
  | "extension_requested"
  | "extension_approved"
  | "extension_rejected"
  | "dispute_opened"
  | "dispute_resolved"
  | "order_completed"
  | "order_cancelled"
  | "payout_scheduled"
  | "message_flagged"
  | "refund_failed";

/**
 * Record an order-timeline event. Fire-and-forget safe — failures are logged
 * to console but never propagated, so a timeline write can never fail the
 * primary action (delivery, approval, etc.) it's attached to.
 */
export function createOrderEvent(
  orderId: string,
  actorId: string | null,
  eventType: OrderEventType,
  metadata?: Record<string, unknown>
): void {
  db.insert(orderEvents)
    .values({ orderId, actorId, eventType, metadata: metadata ?? {} })
    .catch((err) => {
      console.error("[order-events]", eventType, err);
    });
}
