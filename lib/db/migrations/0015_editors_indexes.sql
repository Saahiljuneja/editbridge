-- Add composite indexes to editors table for browse/search performance
CREATE INDEX IF NOT EXISTS "editors_kyc_available_rank_idx" ON "editors" ("kyc_status", "is_available", "rank_score");
CREATE INDEX IF NOT EXISTS "editors_featured_idx" ON "editors" ("is_featured", "featured_until");
