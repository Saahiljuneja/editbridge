export type BriefData = {
  mood: string[];
  musicPreference: string;
  colorLook?: string;
  referenceUrls: string[];
  mustInclude: string;
  mustAvoid: string;
  additionalNotes: string;
  customAddons?: {
    extraFast?: boolean;
    extraRevision?: boolean;
    sourceFiles?: boolean;
    commercialRights?: boolean;
  };
};

const MOOD_LABELS: Record<string, string> = {
  cinematic: "Cinematic",
  fast_paced: "Fast-paced",
  minimal: "Minimal",
  energetic: "Energetic",
  emotional: "Emotional",
  funny: "Funny",
  hype: "Hype",
};

const MUSIC_LABELS: Record<string, string> = {
  upbeat: "Upbeat",
  lofi: "Lo-fi",
  no_music: "No music",
  client_provides: "Client provides music",
  editor_choice: "Editor's choice",
};

const COLOR_LABELS: Record<string, string> = {
  bright: "Bright & vibrant",
  moody: "Moody & dark",
  neutral: "Neutral & clean",
  warm: "Warm tones",
  cold: "Cool/cold tones",
};

export function generateBriefText(data: BriefData): string {
  const lines: string[] = [];
  if (data.mood.length)
    lines.push(`Style/Vibe: ${data.mood.map((m) => MOOD_LABELS[m] ?? m).join(", ")}`);
  if (data.musicPreference)
    lines.push(`Music: ${MUSIC_LABELS[data.musicPreference] ?? data.musicPreference}`);
  if (data.colorLook)
    lines.push(`Color look: ${COLOR_LABELS[data.colorLook] ?? data.colorLook}`);
  if (data.referenceUrls.length)
    lines.push(`Reference videos:\n${data.referenceUrls.map((u) => `  - ${u}`).join("\n")}`);
  if (data.mustInclude.trim())
    lines.push(`Must include: ${data.mustInclude.trim()}`);
  if (data.mustAvoid.trim())
    lines.push(`Must avoid: ${data.mustAvoid.trim()}`);
  if (data.additionalNotes.trim())
    lines.push(`Additional notes: ${data.additionalNotes.trim()}`);
  if (data.customAddons) {
    const active: string[] = [];
    if (data.customAddons.extraFast) active.push("Extra Fast Delivery");
    if (data.customAddons.extraRevision) active.push("Additional Revision Round");
    if (data.customAddons.sourceFiles) active.push("Source Files Upgrade");
    if (data.customAddons.commercialRights) active.push("Commercial Use License");
    if (active.length) {
      lines.push(`Selected Add-ons:\n${active.map((a) => `  - [✓] ${a}`).join("\n")}`);
    }
  }
  return lines.join("\n");
}

export { MOOD_LABELS, MUSIC_LABELS, COLOR_LABELS };
