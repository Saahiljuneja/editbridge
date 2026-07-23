import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { referrals, users } from "@/lib/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Share2, Gift, DollarSign } from "lucide-react";
import { ReferralsClient } from "./referrals-client";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin/dashboard");

  const referrer = aliasedTable(users, "referrer");
  const referee = aliasedTable(users, "referee");

  const [totalReferrals, converted, totalCredits, rows] = await Promise.all([
    db.select({ value: count() }).from(referrals).then(r => r[0].value),
    db.select({ value: count() }).from(referrals).where(sql`${referrals.orderId} IS NOT NULL`).then(r => r[0].value),
    db.select({ value: sql<number>`COALESCE(SUM(${referrals.creditAwarded}),0)::int` }).from(referrals).then(r => r[0].value),
    db
      .select({
        id: referrals.id,
        creditAwarded: referrals.creditAwarded,
        rewardedAt: referrals.rewardedAt,
        createdAt: referrals.createdAt,
        hasOrder: sql<boolean>`${referrals.orderId} IS NOT NULL`,
        referrerName: referrer.name,
        referrerEmail: referrer.email,
        refereeName: referee.name,
        refereeEmail: referee.email,
      })
      .from(referrals)
      .innerJoin(referrer, eq(referrer.id, referrals.referrerId))
      .innerJoin(referee, eq(referee.id, referrals.refereeId))
      .orderBy(desc(referrals.createdAt))
      .limit(200),
  ]);

  const conversionRate = totalReferrals > 0 ? Math.round((converted / totalReferrals) * 100) : 0;

  return (
    <div className="px-8 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Referral Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Track who referred whom and how many referrals converted to orders.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total referrals", value: totalReferrals, icon: Share2, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Converted (placed order)", value: converted, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Conversion rate", value: `${conversionRate}%`, icon: Gift, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Credits awarded", value: formatCurrency(totalCredits), icon: Gift, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl ${s.bg} px-5 py-5`}>
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <ReferralsClient rows={rows.map(r => ({
        ...r,
        rewardedAt: r.rewardedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        hasOrder: Boolean(r.hasOrder),
      }))} />
    </div>
  );
}
