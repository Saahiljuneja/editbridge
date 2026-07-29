import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export type PlatformConfig = {
  name: string;
  supportEmail: string;
  commissionRatePct: number;
  processingFeePct: number;
  minRevisions: number;
  maxRevisions: number;
  maxDeliveryDays: number;
  allowedFileTypes: string[];
  maxFileSizeMb: number;
  fontHeading: string;
  fontBody: string;
  brandPrimary: string;
  brandEditor: string;
  brandClient: string;
  brandTeal: string;
  siteRadius: string;
  logoUrl: string;
  faviconUrl: string;
  platformTagline: string;
  announcementEnabled: boolean;
  announcementText: string;
  announcementBg: string;
  announcementTextColor: string;
  siteDarkMode: "light" | "dark" | "system";
  emailHeaderColor: string;
  socialTwitter: string;
  socialInstagram: string;
  socialLinkedin: string;
  customCss: string;
};

type CachedConfig = PlatformConfig & { ts: number };

let _cache: CachedConfig | null = null;
const TTL = 60_000;

const ALL_KEYS = [
  "platform_name", "support_email",
  "commission_rate_pct", "processing_fee_pct",
  "min_revisions", "max_revisions", "max_delivery_days",
  "allowed_file_types", "max_file_size_mb",
  "font_heading", "font_body",
  "brand_primary", "brand_editor", "brand_client", "brand_teal", "site_radius",
  "logo_url", "favicon_url", "platform_tagline",
  "announcement_enabled", "announcement_text", "announcement_bg", "announcement_text_color",
  "site_dark_mode",
  "email_header_color",
  "social_twitter", "social_instagram", "social_linkedin",
  "custom_css",
];

export async function getPlatformSettings(): Promise<PlatformConfig> {
  if (_cache && Date.now() - _cache.ts < TTL) {
    const { ts: _ts, ...rest } = _cache;
    return rest;
  }

  let rows: { key: string; value: string }[] = [];
  try {
    rows = await db
      .select({ key: platformSettings.key, value: platformSettings.value })
      .from(platformSettings)
      .where(inArray(platformSettings.key, ALL_KEYS));
  } catch (err) {
    console.error("[getPlatformSettings] Database connection failed, using default configuration:", err);
    if (_cache) {
      const { ts: _ts, ...rest } = _cache;
      return rest;
    }
  }

  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;

  const cfg: PlatformConfig = {
    name: map.platform_name || "EditBridge",
    supportEmail: map.support_email || "support@editbridge.com",
    commissionRatePct: Math.max(0, Math.min(100, Number(map.commission_rate_pct ?? 15))),
    processingFeePct: Math.max(0, Math.min(100, Number(map.processing_fee_pct ?? 4))),
    minRevisions: Math.max(0, Number(map.min_revisions ?? 0)),
    maxRevisions: Math.max(0, Number(map.max_revisions ?? 3)),
    maxDeliveryDays: Math.max(1, Number(map.max_delivery_days ?? 30)),
    allowedFileTypes: (map.allowed_file_types || "mp4,mov,avi,mkv,zip,rar,pdf")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    maxFileSizeMb: Math.max(1, Number(map.max_file_size_mb ?? 500)),
    fontHeading:         map.font_heading           || "",
    fontBody:            map.font_body              || "",
    brandPrimary:        map.brand_primary          || "#7C3AED",
    brandEditor:         map.brand_editor           || "#7C3AED",
    brandClient:         map.brand_client           || "#0EA5E9",
    brandTeal:           map.brand_teal             || "#0F6E56",
    siteRadius:          map.site_radius            || "0.625rem",
    logoUrl:             map.logo_url               || "",
    faviconUrl:          map.favicon_url            || "",
    platformTagline:     map.platform_tagline       || "",
    announcementEnabled: map.announcement_enabled   === "true",
    announcementText:    map.announcement_text      || "",
    announcementBg:      map.announcement_bg        || "#7C3AED",
    announcementTextColor: map.announcement_text_color || "#ffffff",
    siteDarkMode:        (map.site_dark_mode as PlatformConfig["siteDarkMode"]) || "light",
    emailHeaderColor:    map.email_header_color     || "#7C3AED",
    socialTwitter:       map.social_twitter         || "",
    socialInstagram:     map.social_instagram       || "",
    socialLinkedin:      map.social_linkedin        || "",
    customCss:           map.custom_css             || "",
  };

  _cache = { ...cfg, ts: Date.now() };
  return cfg;
}

export function bustPlatformSettingsCache() {
  _cache = null;
}
