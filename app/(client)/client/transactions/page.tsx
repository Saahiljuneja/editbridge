export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orders, packages, editors, users } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { formatCurrency } from "@/lib/utils";
import { IndianRupee, TrendingUp, ShoppingBag } from "lucide-react";
import { TransactionsClient } from "./transactions-client";

export default async function TransactionsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.userId!;

  const txns = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalAmount: orders.totalAmount,
      processingFee: orders.processingFee,
      creditApplied: orders.creditApplied,
      razorpayOrderId: orders.razorpayOrderId,
      razorpayPaymentId: orders.razorpayPaymentId,
      createdAt: orders.createdAt,
      completedAt: orders.completedAt,
      cancelledAt: orders.cancelledAt,
      packageTitle: packages.title,
      editorName: users.name,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .innerJoin(editors, eq(editors.id, orders.editorId))
    .innerJoin(users, eq(users.id, editors.userId))
    .where(eq(orders.clientId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(200);

  const completed = txns.filter((t) => t.status === "completed");
  const totalSpent = completed.reduce((s, t) => s + t.totalAmount, 0);
  const avgOrder = completed.length > 0 ? Math.round(totalSpent / completed.length) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <h1 className="text-xl font-bold text-gray-900">Transaction History</h1>
        <p className="text-sm text-gray-400 mt-0.5">All payments and orders on your account</p>
      </div>

      <div className="px-6 py-6 space-y-5">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total spent", value: formatCurrency(totalSpent), icon: IndianRupee, color: "var(--brand-client)" },
            { label: "Orders placed", value: String(txns.filter((t) => t.status !== "cancelled").length), icon: ShoppingBag, color: "var(--brand-editor)" },
            { label: "Avg per order", value: avgOrder ? formatCurrency(avgOrder) : "—", icon: TrendingUp, color: "#059669" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color }} />
                <p className="text-xs text-gray-400">{label}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        <TransactionsClient
          rows={txns.map((t) => ({
            ...t,
            createdAt: t.createdAt.toISOString(),
            completedAt: t.completedAt?.toISOString() ?? null,
            cancelledAt: t.cancelledAt?.toISOString() ?? null,
            editorName: t.editorName ?? null,
          }))}
        />
      </div>
    </div>
  );
}