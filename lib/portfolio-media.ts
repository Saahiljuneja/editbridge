// Shared YouTube/Vimeo URL parsing — used by both the editor's portfolio manager
// and the public profile page so thumbnail/embed logic can't drift between them.

export type VideoSource = "youtube" | "vimeo" | "gdrive" | "direct" | null;

export function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?\s]{11})/);
  return m?.[1] ?? null;
}

export function getVimeoId(url: string): string | null {
  return url.match(/(?:vimeo\.com\/)(?:video\/|)(\d+)/)?.[1] ?? null;
}

export function getGoogleDriveId(url: string): string | null {
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]{10,})/);
  return m?.[1] ?? null;
}

/** Returns platform-specific thumbnail URL. For Vimeo a server-side oEmbed fetch
 *  is needed; this returns the standard hqdefault for YouTube and null otherwise
 *  (Vimeo thumbnails must be fetched server-side or cached separately). */
export function getThumbnailUrl(url: string): string | null {
  const ytId = getYouTubeId(url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  return null;
}

/** Returns the oEmbed thumbnail API URL for a Vimeo video.
 *  Call this on the client and cache the result — don't call it server-side
 *  in a hot path without caching. */
export function getVimeoOembedUrl(url: string): string | null {
  const id = getVimeoId(url);
  if (!id) return null;
  return `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}&width=480`;
}

export function getEmbedUrl(url: string, params?: Record<string, string>): string | null {
  const ytId = getYouTubeId(url);
  if (ytId) {
    const p = new URLSearchParams({ rel: "0", modestbranding: "1", ...params });
    return `https://www.youtube.com/embed/${ytId}?${p.toString()}`;
  }
  const vimeoId = getVimeoId(url);
  if (vimeoId) {
    const p = new URLSearchParams({ byline: "0", title: "0", portrait: "0", dnt: "1", ...params });
    return `https://player.vimeo.com/video/${vimeoId}?${p.toString()}`;
  }
  const driveId = getGoogleDriveId(url);
  if (driveId) return `https://drive.google.com/file/d/${driveId}/preview`;
  return null;
}

export function getVideoSource(url: string): VideoSource {
  if (!url) return null;
  if (getYouTubeId(url)) return "youtube";
  if (getVimeoId(url)) return "vimeo";
  if (getGoogleDriveId(url)) return "gdrive";
  // Treat anything with a common video extension or blob as a direct video
  if (/\.(mp4|webm|mov|mkv|avi|m4v)(\?|$)/i.test(url)) return "direct";
  return null;
}

export function isExternalVideo(url: string): boolean {
  return !!getYouTubeId(url) || !!getVimeoId(url) || !!getGoogleDriveId(url);
}
