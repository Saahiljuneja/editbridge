import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { CommissionClient } from "./commission-client";

export const dynamic = "force-dynamic";

const KEYS = [
  "commission_rate_pct",          // default platform commission %
  "tds_rate_pct",                 // default TDS rate (0, 10, or 20)
  "featured_listing_price",       // paise — cost to feature a package
  "referral_credit_amount",       // paise — credit awarded per referral
  "min_payout_amount",            // paise — minimum withdrawal amount
  "payout_hold_days",             // days before payout is released post-delivery
];

const DEFAULTS: Record<string, string> = {
  commission_rate_pct: "20",
  tds_rate_pct: "10",
  featured_listing_price: "49900",
  referral_credit_amount: "10000",
  min_payout_amount: "50000",
  payout_hold_days: "7",
};

export default async function AdminCommissionPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin/dashboard");

  const rows = await db.select().from(platformSettings).where(inArray(platformSettings.key, KEYS));
  const saved = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const settings = Object.fromEntries(KEYS.map(k => [k, saved[k] ?? DEFAULTS[k] ?? ""]));

  return <CommissionClient settings={settings} />;
}
