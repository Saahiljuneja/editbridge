// Shared between the portfolio API routes (server) and the portfolio editor UI (client) —
// keep this module free of server-only imports (no db, no node builtins).

export const MAX_FEATURED_ITEMS = 6;
export const MAX_TAGS = 20;
export const MAX_TAG_LENGTH = 40;
export const MAX_CATEGORY_LENGTH = 60;
export const MAX_TITLE_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 300;

const YOUTUBE_RE = /^https?:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]{11}/i;
const VIMEO_RE = /^https?:\/\/(www\.|player\.)?vimeo\.com\/(video\/)?\d+/i;
const GDRIVE_RE = /^https?:\/\/(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]{10,})/i;

export function isEmbeddableVideoUrl(url: string): boolean {
  return YOUTUBE_RE.test(url) || VIMEO_RE.test(url) || GDRIVE_RE.test(url);
}

// An internal R2 object key, or a "/api/file/{key}" proxy path — never an external
// URL or another URI scheme (blocks javascript:, data:, etc.) and never path traversal.
export function isSafeInternalPath(value: string): boolean {
  if (typeof value !== "string" || value.length === 0 || value.length > 2000) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return false;
  if (value.includes("..")) return false;
  return true;
}

export function isValidPortfolioUrl(type: "video" | "image", url: unknown): url is string {
  if (typeof url !== "string" || url.length === 0 || url.length > 2000) return false;
  if (/^https?:\/\//i.test(url)) {
    return type === "video" && isEmbeddableVideoUrl(url);
  }
  return isSafeInternalPath(url);
}

export function sanitizeCategory(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, MAX_CATEGORY_LENGTH);
  return trimmed || null;
}

export function sanitizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim().toLowerCase().slice(0, MAX_TAG_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_TAGS);
}

export function sanitizeTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, MAX_TITLE_LENGTH);
  return trimmed || null;
}

export function sanitizeDescription(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, MAX_DESCRIPTION_LENGTH);
  return trimmed || null;
}
