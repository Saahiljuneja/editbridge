-- Add social counters to portfolio_items
ALTER TABLE "portfolio_items"
  ADD COLUMN IF NOT EXISTS "likes_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "comments_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "views_count" integer NOT NULL DEFAULT 0;

-- Portfolio likes (one row per user per item)
CREATE TABLE IF NOT EXISTS "portfolio_likes" (
  "portfolio_item_id" uuid NOT NULL REFERENCES "portfolio_items"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("portfolio_item_id", "user_id")
);

-- Portfolio comments
CREATE TABLE IF NOT EXISTS "portfolio_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "portfolio_item_id" uuid NOT NULL REFERENCES "portfolio_items"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "text" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "portfolio_comments_item_idx" ON "portfolio_comments" ("portfolio_item_id");
