// Portfolio media fields are stored inconsistently: `url` (for uploaded files) is a
// bare R2 object key, while `beforeUrl`/`thumbnailUrl` are saved as "/api/file/{key}"
// proxy paths, and external videos are full YouTube/Vimeo URLs. This normalizes any
// of those into a path the browser can actually fetch.
export function toPortfolioProxyUrl(raw: string | null | undefined, r2Base: string): string | null {
  if (!raw) return null;
  if (raw.startsWith("/api/file/")) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    if (r2Base && raw.startsWith(r2Base)) return `/api/file/${raw.slice(r2Base.length + 1)}`;
    return raw; // external URL (YouTube/Vimeo) — keep as-is
  }
  return `/api/file/${raw}`;
}
