// Detects contact info and abusive language that violates platform policy.
// Messages flagged here go through a 3-warning system before being fully blocked.

const CONTACT_PATTERNS: RegExp[] = [
  // Email addresses
  /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/,
  // Indian mobile numbers (10 digits starting with 6-9)
  /\b[6-9]\d{9}\b/,
  // International phone with country code
  /\b\+\d{1,3}[\s\-]?\d[\d\s\-\.]{6,}\d\b/,
  // Standalone 10+ digit sequences
  /\b\d{10,}\b/,
  // WhatsApp / Telegram / Signal mentions
  /\b(whatsapp|whats\s*app|wa\.me|telegram|t\.me|signal|snapchat|wechat)\b/i,
  // "dm me", "message me on", "contact me on" etc.
  /\b(dm\s*me|message\s*me\s*on|contact\s*me\s*on|reach\s*me\s*on|find\s*me\s*on|follow\s*me\s*on)\b/i,
  // Social platforms
  /\b(insta(gram)?|twitter|tiktok|facebook|fb\.com|linkedin)\b/i,
];

// Common abusive / profanity terms (Latin-script, case-insensitive)
const ABUSE_WORDS: RegExp[] = [
  /\bf+u+c+k+\w*/i,
  /\bs+h+i+t+\w*/i,
  /\ba+s+s+h+o+l+e\b/i,
  /\bb+i+t+c+h+\w*/i,
  /\bc+u+n+t\b/i,
  /\bd+i+c+k\b/i,
  /\bp+u+s+s+y\b/i,
  /\bb+a+s+t+a+r+d\b/i,
  /\bm+o+t+h+e+r+f+u+c+k\w*/i,
  /\bwh+o+r+e\b/i,
  /\bs+l+u+t\b/i,
  /\bi+d+i+o+t\b/i,
  /\bs+t+u+p+i+d\b/i,
  /\bm+o+r+o+n\b/i,
  /\br+e+t+a+r+d\w*/i,
  /\blo+s+e+r\b/i,
  /\bscum\b/i,
  /\bvermin\b/i,
  /\bkill\s+you(rself)?\b/i,
  /\bi\s*('ll|will)\s*(kill|hurt|destroy)\b/i,
  /\bkys\b/i,
];

export type FilterType = "contact_info" | "abuse";

export interface FilterResult {
  flagged: boolean;
  filterType?: FilterType;
  reason?: string;
}

export function filterContent(content: string): FilterResult {
  for (const pattern of CONTACT_PATTERNS) {
    if (pattern.test(content)) {
      return {
        flagged: true,
        filterType: "contact_info",
        reason: "Contains contact information that violates platform policy.",
      };
    }
  }
  for (const pattern of ABUSE_WORDS) {
    if (pattern.test(content)) {
      return {
        flagged: true,
        filterType: "abuse",
        reason: "Contains abusive or inappropriate language.",
      };
    }
  }
  return { flagged: false };
}
