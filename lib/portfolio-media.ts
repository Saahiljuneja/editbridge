// Shared YouTube/Vimeo URL parsing — used by both the editor's portfolio manager
// and the public profile page so thumbnail/embed logic can't drift between them.

export function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?\s]{11})/);
  return m?.[1] ?? null;
}

export function getVimeoId(url: string): string | null {
  return url.match(/(?:vimeo\.com\/)(\d+)/)?.[1] ?? null;
}

export function getThumbnailUrl(url: string): string | null {
  const ytId = getYouTubeId(url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  return null;
}

export function getEmbedUrl(url: string): string | null {
  const ytId = getYouTubeId(url);
  if (ytId) return `https://www.youtube.com/embed/${ytId}`;
  const vimeoId = getVimeoId(url);
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`;
  return null;
}

export function isExternalVideo(url: string): boolean {
  return !!getYouTubeId(url) || !!getVimeoId(url);
}
