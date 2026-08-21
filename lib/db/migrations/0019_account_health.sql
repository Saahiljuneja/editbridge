-- Account Health System
-- Adds health score + suspension fields to the editors table

ALTER TABLE "editors"
  ADD COLUMN IF NOT EXISTS "health_score"        integer,
  ADD COLUMN IF NOT EXISTS "health_status"       text,
  ADD COLUMN IF NOT EXISTS "health_computed_at"  timestamp,
  ADD COLUMN IF NOT EXISTS "acceptance_rate"     integer,
  ADD COLUMN IF NOT EXISTS "no_response_rate"    integer,
  ADD COLUMN IF NOT EXISTS "response_rate"       integer,
  ADD COLUMN IF NOT EXISTS "is_suspended"        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "suspended_at"        timestamp,
  ADD COLUMN IF NOT EXISTS "suspended_by"        text,
  ADD COLUMN IF NOT EXISTS "suspension_reason"   text;
