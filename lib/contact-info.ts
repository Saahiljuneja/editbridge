// Blocks contact-sharing attempts (email, phone, social handles) in free-text
// profile fields, so editors and clients stay on-platform for messaging.
export function hasContactInfo(text: string): boolean {
  // Normalize unicode digit variants to ASCII (Arabic-Indic, Extended, Full-width)
  const n = text
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[０-９]/g, d => String(d.charCodeAt(0) - 0xFF10))
    .toLowerCase();
  // Email
  if (/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/.test(n)) return true;
  // Obfuscated email: "user [at] gmail [dot] com"
  if (/[a-z0-9]+\s*[\(\[{]?\s*at\s*[\)\]}]?\s*[a-z0-9]+\s*[\(\[{]?\s*dot\s*[\)\]}]?\s*[a-z]{2,}/.test(n)) return true;
  // @handle
  if (/@[a-z0-9_]{2,}/.test(n)) return true;
  // Social media URLs and short refs
  if (/\b(instagram|insta|telegram|whatsapp|tiktok|twitter|snapchat|youtube|facebook|t\.me|wa\.me|fb\.com)\s*[\/:.@]\s*[a-z0-9_]+/.test(n)) return true;
  if (/\b(ig|dm|tg|wa)\s*[:@]\s*[a-z0-9_]{2,}/.test(n)) return true;
  // Sliding window: 8+ digits in any 30-char span (catches spaced/obfuscated numbers)
  for (let i = 0; i <= n.length; i++) {
    if ((n.slice(i, i + 30).match(/\d/g) ?? []).length >= 8) return true;
  }
  return false;
}
