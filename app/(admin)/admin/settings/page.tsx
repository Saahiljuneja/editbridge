import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

const DEFAULTS: Record<string, string> = {
  commission_rate_pct: "20",
  min_revisions: "0",
  max_revisions: "3",
  max_delivery_days: "30",
  maintenance_mode: "false",
  maintenance_start: "",
  maintenance_end: "",
  allowed_file_types: "mp4,mov,avi,mkv,zip,rar,pdf,jpg,jpeg,png,gif,webp",
  max_file_size_mb: "500",
  platform_name: "EditBridge",
  support_email: "support@editbridge.com",
};

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin/dashboard");

  const rows = await db.select().from(platformSettings);
  const settings: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) settings[row.key] = row.value;

  return <SettingsClient initial={settings} />;
}
