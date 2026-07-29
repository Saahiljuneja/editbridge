CREATE TABLE IF NOT EXISTS rate_limits (
  key         TEXT      NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count       INTEGER   NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS rate_limits_window_start_idx ON rate_limits (window_start);
