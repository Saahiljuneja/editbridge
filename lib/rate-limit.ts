import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Fixed-window rate limiter backed by Neon PostgreSQL (HTTP driver — edge-compatible).
 * Each (key, windowStart) pair holds a count that is atomically incremented via upsert.
 *
 * @param key      Identifies the resource + actor, e.g. "msg:userId:orderId"
 * @param limit    Max requests allowed in the window
 * @param windowMs Window size in milliseconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const resetAt = new Date(windowStart.getTime() + windowMs);

  const result = await db.execute(sql`
    INSERT INTO rate_limits (key, window_start, count)
    VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT (key, window_start)
    DO UPDATE SET count = rate_limits.count + 1
    RETURNING count
  `);

  const count = (result.rows[0] as { count: number }).count;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}

/**
 * Purge expired windows older than the given age. Call from a maintenance cron.
 */
export async function pruneRateLimits(olderThanMs = 24 * 60 * 60 * 1000): Promise<void> {
  const cutoff = new Date(Date.now() - olderThanMs);
  await db.execute(sql`DELETE FROM rate_limits WHERE window_start < ${cutoff}`);
}
