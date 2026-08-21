ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "refund_status" text,
  ADD COLUMN IF NOT EXISTS "refunded_at" timestamp;
