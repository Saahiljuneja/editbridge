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
};

type CachedConfig = PlatformConfig & { ts: number };

let _cache: CachedConfig | null = null;
const TTL = 60_000;

const ALL_KEYS = [
  "platform_name",
  "support_email",
  "commission_rate_pct",
  "processing_fee_pct",
  "min_revisions",
  "max_revisions",
  "max_delivery_days",
  "allowed_file_types",
  "max_file_size_mb",
];

export async function getPlatformSettings(): Promise<PlatformConfig> {
  if (_cache && Date.now() - _cache.ts < TTL) {
    return {
      name: _cache.name,
      supportEmail: _cache.supportEmail,
      commissionRatePct: _cache.commissionRatePct,
      processingFeePct: _cache.processingFeePct,
      minRevisions: _cache.minRevisions,
      maxRevisions: _cache.maxRevisions,
      maxDeliveryDays: _cache.maxDeliveryDays,
      allowedFileTypes: _cache.allowedFileTypes,
      maxFileSizeMb: _cache.maxFileSizeMb,
    };
  }

  const rows = await db
    .select({ key: platformSettings.key, value: platformSettings.value })
    .from(platformSettings)
    .where(inArray(platformSettings.key, ALL_KEYS));

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
  };

  _cache = { ...cfg, ts: Date.now() };
  return cfg;
}

export function bustPlatformSettingsCache() {
  _cache = null;
}
