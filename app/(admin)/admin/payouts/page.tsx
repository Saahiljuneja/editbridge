import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { payouts, editors, users, orders, packages } from "@/lib/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Banknote, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { PayoutsClient } from "./payouts-client";

export const dynamic = "force-dynamic";

export default async function AdminPayoutsPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin/dashboard");

  const [pending, completed, totalPending, pendingRows] = await Promise.all([
    db.select({ value: count() }).from(payouts).where(sql`${payouts.status} = 'pending'`).then(r => r[0].value),
    db.select({ value: count() }).from(payouts).where(sql`${payouts.status} = 'completed'`).then(r => r[0].value),
    db.select({ value: sql<number>`COALESCE(SUM(${payouts.netAmount}),0)::int` }).from(payouts).where(sql`${payouts.status} = 'pending'`).then(r => r[0].value),
    db.select({
      id: payouts.id,
      status: payouts.status,
      grossAmount: payouts.grossAmount,
      commissionAmount: payouts.commissionAmount,
      tdsAmount: payouts.tdsAmount,
      netAmount: payouts.netAmount,
      createdAt: payouts.createdAt,
      scheduledPayoutAt: payouts.scheduledPayoutAt,
      editorName: users.name,
      editorEmail: users.email,
      packageTitle: packages.title,
    })
      .from(payouts)
      .innerJoin(editors, eq(editors.id, payouts.editorId))
      .innerJoin(users, eq(users.id, editors.userId))
      .innerJoin(orders, eq(orders.id, payouts.orderId))
      .leftJoin(packages, eq(packages.id, orders.packageId))
      .where(sql`${payouts.status} = 'pending'`)
      .orderBy(desc(payouts.createdAt))
      .limit(100),
  ]);

  const stats = [
    { label: "Pending payouts", value: pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Total pending value", value: formatCurrency(totalPending), icon: Banknote, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Completed all time", value: completed, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="px-8 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payout Approval Queue</h1>
        <p className="text-sm text-gray-500 mt-1">Review and approve editor withdrawal requests.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className={`rounded-2xl ${s.bg} px-5 py-5`}>
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {pendingRows.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="font-semibold text-gray-900">All caught up!</p>
          <p className="text-sm text-gray-400 mt-1">No pending payout requests at the moment.</p>
        </div>
      ) : (
        <PayoutsClient rows={pendingRows.map(r => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          scheduledPayoutAt: r.scheduledPayoutAt?.toISOString() ?? null,
        }))} />
      )}
    </div>
  );
}
