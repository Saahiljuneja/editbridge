-- Deduplicated view tracking per user (#2)
CREATE TABLE IF NOT EXISTS "portfolio_views" (
  "portfolio_item_id" uuid NOT NULL REFERENCES "portfolio_items"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("portfolio_item_id", "user_id")
);

-- Saves / bookmarks (#6)
CREATE TABLE IF NOT EXISTS "portfolio_saves" (
  "portfolio_item_id" uuid NOT NULL REFERENCES "portfolio_items"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("portfolio_item_id", "user_id")
);
CREATE INDEX IF NOT EXISTS "portfolio_saves_user_idx" ON "portfolio_saves" ("user_id");

-- Parent comment for flat reply threading (#7)
ALTER TABLE "portfolio_comments"
  ADD COLUMN IF NOT EXISTS "parent_id" uuid REFERENCES "portfolio_comments"("id") ON DELETE CASCADE;
