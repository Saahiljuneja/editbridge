import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { bustMaintenanceCache } from "@/lib/maintenance-cache";
import { bustPlatformSettingsCache } from "@/lib/platform-settings";

const DEFAULTS: Record<string, string> = {
  commission_rate_pct: "15",
  processing_fee_pct: "4",
  min_revisions: "0",
  max_revisions: "3",
  max_delivery_days: "30",
  maintenance_mode: "false",
  maintenance_start: "",
  maintenance_end: "",
  allowed_file_types: "mp4,mov,avi,mkv,zip,rar,pdf",
  max_file_size_mb: "500",
  platform_name: "EditBridge",
  support_email: "support@editbridge.com",
};

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rows = await db.select().from(platformSettings);
  const map: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) map[row.key] = row.value;
  return NextResponse.json(map);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const updates: Record<string, string> = await req.json();
  for (const [key, value] of Object.entries(updates)) {
    await db.insert(platformSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedAt: new Date() } });
  }

  bustMaintenanceCache();
  bustPlatformSettingsCache();

  return NextResponse.json({ ok: true });
}
