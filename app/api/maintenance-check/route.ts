import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import {
  readMaintenanceCache,
  writeMaintenanceCache,
  isWithinMaintenanceWindow,
} from "@/lib/maintenance-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  let state = readMaintenanceCache();

  if (!state) {
    const rows = await db
      .select({ key: platformSettings.key, value: platformSettings.value })
      .from(platformSettings)
      .where(inArray(platformSettings.key, ["maintenance_mode", "maintenance_start", "maintenance_end"]));

    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;

    state = {
      manualOn: map.maintenance_mode === "true",
      windowStart: map.maintenance_start ?? "",
      windowEnd: map.maintenance_end ?? "",
    };
    writeMaintenanceCache(state);
  }

  const windowActive = isWithinMaintenanceWindow(state.windowStart, state.windowEnd);
  const on = state.manualOn || windowActive;

  return NextResponse.json({ on, manualOn: state.manualOn, windowActive });
}
