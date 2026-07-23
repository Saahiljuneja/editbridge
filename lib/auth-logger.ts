// Structured logging for auth rejection events.
// Writes to stdout as JSON so it can be ingested by any log aggregator.
// Extend this to write to a DB table or external service as needed.

export function logAuthRejection(
  route: string,
  reason: string,
  req: Request,
  extra?: Record<string, unknown>
): void {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const ua = (req.headers.get("user-agent") ?? "unknown").slice(0, 300);

  console.warn(
    JSON.stringify({
      event: "auth_rejection",
      route,
      reason,
      ip,
      ua,
      ts: new Date().toISOString(),
      ...extra,
    })
  );
}
