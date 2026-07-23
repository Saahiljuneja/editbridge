export type VideoProvider = "youtube" | "vimeo";

export interface ParsedVideo {
  provider: VideoProvider;
  videoId: string;
  embedUrl: string;
  thumbnailUrl: string | null;
}

// Only YouTube and Vimeo are supported — enforces the zero-hosting-cost
// constraint on the showcase feature (embeds only, never a hosted file).
export function parseVideoUrl(rawUrl: string): ParsedVideo | null {
  let u: URL;
  try {
    u = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");

  if (host === "youtube.com") {
    let id: string | null = null;
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2] ?? null;
    else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2] ?? null;
    if (!id) return null;
    return {
      provider: "youtube",
      videoId: id,
      embedUrl: `https://www.youtube.com/embed/${id}`,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  }

  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    if (!id) return null;
    return {
      provider: "youtube",
      videoId: id,
      embedUrl: `https://www.youtube.com/embed/${id}`,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const match = u.pathname.match(/(\d+)/);
    const id = match?.[1];
    if (!id) return null;
    return {
      provider: "vimeo",
      videoId: id,
      embedUrl: `https://player.vimeo.com/video/${id}`,
      thumbnailUrl: null,
    };
  }

  return null;
}
