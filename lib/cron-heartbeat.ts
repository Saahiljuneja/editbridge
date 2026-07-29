import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";

export async function updateCronHeartbeat(name: string): Promise<void> {
  try {
    const now = new Date();
    await db
      .insert(platformSettings)
      .values({ key: `cron_${name}_last_run`, value: now.toISOString() })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: { value: now.toISOString(), updatedAt: now },
      });
  } catch {
    // Non-critical — don't fail the cron if heartbeat fails
  }
}
