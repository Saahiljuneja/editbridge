-- Order acceptance system: cancellation tracking + new event types
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancellation_reason" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancelled_by" text;

ALTER TYPE "order_event_type" ADD VALUE IF NOT EXISTS 'order_accepted';
ALTER TYPE "order_event_type" ADD VALUE IF NOT EXISTS 'order_declined';
ALTER TYPE "order_event_type" ADD VALUE IF NOT EXISTS 'refund_failed';
