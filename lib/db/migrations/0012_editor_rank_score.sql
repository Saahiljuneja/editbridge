ALTER TABLE editors ADD COLUMN IF NOT EXISTS rank_score REAL;

CREATE INDEX IF NOT EXISTS editors_rank_score_idx ON editors (rank_score DESC NULLS LAST);
