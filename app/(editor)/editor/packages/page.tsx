import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors, packages, userPoints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PackagesManager } from "./packages-manager";
import { Info } from "lucide-react";
import { calcLevel, getLevelPerks } from "@/lib/rewards";
import type { Level } from "@/lib/rewards";
import { hasActiveBoost } from "@/lib/xp-shop";

export default async function PackagesPage() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  const editorId = session.user.editorId;
  if (!editorId) redirect("/editor/kyc");

  const [rows, editorRow] = await Promise.all([
    db.select().from(packages).where(eq(packages.editorId, editorId)).orderBy(packages.price),
    db.select({ userId: editors.userId }).from(editors).where(eq(editors.id, editorId)).limit(1),
  ]);

  let maxPackages = 3;
  let level: Level = "bronze";
  if (editorRow[0]) {
    const userId = editorRow[0].userId;
    const [[pts], hasSlotBoost] = await Promise.all([
      db.select({ total: userPoints.total }).from(userPoints).where(eq(userPoints.userId, userId)).limit(1),
      hasActiveBoost(userId, "extra_package_slot"),
    ]);
    level = calcLevel(pts?.total ?? 0) as Level;
    maxPackages = getLevelPerks(level).maxPackages + (hasSlotBoost ? 1 : 0);
  }

  return (
    <div className="px-8 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Services</h1>
      <p className="text-sm text-muted-foreground mb-6">
        List the editing services you offer. Group by category and format so clients find the right fit.
      </p>

      {/* Reward discount notice */}
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 mb-8">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
        <div>
          <p className="text-sm font-semibold text-amber-800 mb-0.5">Member Rewards discount</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Clients with Member Rewards may receive up to 10% off your listed price. Your payout reflects the discounted price minus the 15% platform fee &mdash; you&apos;ll see a full breakdown on each order.
          </p>
        </div>
      </div>

      <PackagesManager
        initialPackages={rows as Parameters<typeof PackagesManager>[0]["initialPackages"]}
        maxPackages={maxPackages}
        level={level}
      />
    </div>
  );
}
