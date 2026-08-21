export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orders, packages, editors, users } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { formatCurrency } from "@/lib/utils";
import {
  IndianRupee, TrendingUp, ShoppingBag, CreditCard,
  Shield, Info, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { TransactionsClient } from "./transactions-client";
import { TopoBackground } from "@/components/common/topo-background";
import { cn } from "@/lib/utils";

const PAGE_TABS = [
  { value: "history", label: "Transaction History" },
  { value: "methods", label: "Payment Methods" },
];

const ACCEPTED_METHODS = [
  { name: "UPI", desc: "GPay, PhonePe, BHIM, Paytm & more" },
  { name: "Debit / Credit Card", desc: "Visa, Mastercard, RuPay" },
  { name: "Net Banking", desc: "All major Indian banks" },
  { name: "Wallets", desc: "Paytm, Amazon Pay, Mobikwik" },
];

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const tab = (params.tab ?? "history") as "history" | "methods";
  const userId = session.user.userId!;

  const [[kpiRow], txns] = await Promise.all([
    // All-time aggregate KPIs — no LIMIT so counts are accurate regardless of order volume
    db.select({
      totalSpent:  sql<number>`COALESCE(SUM(${orders.totalAmount}) FILTER (WHERE ${orders.status} = 'completed'), 0)::int`,
      totalOrders: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} != 'cancelled')::int`,
      avgOrder:    sql<number>`COALESCE(AVG(${orders.totalAmount}) FILTER (WHERE ${orders.status} = 'completed'), 0)::int`,
    }).from(orders).where(eq(orders.clientId, userId)),

    // Last 50 orders for the transaction list
    db.select({
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
    .limit(50),
  ]);

  // Recent payments with a Razorpay ID (for payment methods tab)
  const recentPayments = txns
    .filter((t) => t.razorpayPaymentId)
    .slice(0, 5);

  return (
    <div className="relative min-h-screen bg-slate-50/50 pb-12 overflow-hidden">
      <TopoBackground background="#f8fafc" strokeColor="#e2e8f0" opacity={0.4} />

      <div className="max-w-6xl mx-auto px-6 pt-6 space-y-6 relative z-10">
        {/* Header */}
        <div className="bg-white rounded-3xl border border-neutral-200/60 p-6 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Transactions</h1>
            <p className="text-xs text-neutral-400 font-semibold mt-1">Transaction history and payment information</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
            <IndianRupee className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total spent", value: formatCurrency(kpiRow.totalSpent), icon: IndianRupee, color: "var(--brand-client)" },
            { label: "Orders placed", value: String(kpiRow.totalOrders), icon: ShoppingBag, color: "var(--brand-client)" },
            { label: "Avg per order", value: kpiRow.avgOrder ? formatCurrency(kpiRow.avgOrder) : "—", icon: TrendingUp, color: "#059669" },
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

        {/* Tab bar */}
        <div className="flex items-center gap-2">
          {PAGE_TABS.map((t) => {
            const active = tab === t.value;
            return (
              <Link
                key={t.value}
                href={t.value === "history" ? "/client/transactions" : `/client/transactions?tab=${t.value}`}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shadow-sm",
                  active
                    ? "bg-[#1e40af] border-[#1e40af] text-white"
                    : "bg-white border-neutral-200/60 text-neutral-600 hover:bg-neutral-50"
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {/* Tab content */}
        {tab === "history" && (
          <TransactionsClient
            rows={txns.map((t) => ({
              ...t,
              createdAt: t.createdAt.toISOString(),
              completedAt: t.completedAt?.toISOString() ?? null,
              cancelledAt: t.cancelledAt?.toISOString() ?? null,
              editorName: t.editorName ?? null,
            }))}
          />
        )}

        {tab === "methods" && (
          <div className="space-y-5">
            {/* Razorpay info banner */}
            <div className="bg-white rounded-3xl border border-neutral-200/60 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-black text-neutral-900">Secure Payments via Razorpay</h3>
                  <p className="text-xs text-neutral-400 font-semibold leading-relaxed">
                    All payments are processed securely through Razorpay, India&apos;s leading payment gateway. Your card and banking details are never stored on EditBridge servers.
                  </p>
                  <a
                    href="https://razorpay.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline mt-1"
                  >
                    Learn about Razorpay security <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Accepted methods */}
            <div className="bg-white rounded-3xl border border-neutral-200/60 p-6 shadow-sm">
              <h3 className="text-sm font-black text-neutral-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-neutral-400" /> Accepted Payment Methods
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ACCEPTED_METHODS.map((m) => (
                  <div key={m.name} className="flex items-start gap-3 p-3.5 rounded-2xl border border-neutral-100 bg-neutral-50/50">
                    <div className="w-7 h-7 rounded-xl bg-white border border-neutral-200 flex items-center justify-center shrink-0">
                      <CreditCard className="w-3.5 h-3.5 text-neutral-500" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-neutral-800">{m.name}</p>
                      <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">{m.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Processing fee notice */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                A <strong>10% platform processing fee</strong> is applied to all orders at checkout. This covers payment gateway costs and platform maintenance.
              </p>
            </div>

            {/* Recent payments */}
            {recentPayments.length > 0 && (
              <div className="bg-white rounded-3xl border border-neutral-200/60 p-6 shadow-sm">
                <h3 className="text-sm font-black text-neutral-900 mb-4">Recent Payments</h3>
                <div className="space-y-3">
                  {recentPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-neutral-100 last:border-0">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-neutral-800 truncate">{p.packageTitle ?? "Order"}</p>
                        <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">
                          Payment ID: <span className="font-mono">{p.razorpayPaymentId?.slice(0, 18)}…</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs font-black text-neutral-900">{formatCurrency(p.totalAmount)}</p>
                        <p className="text-[10px] text-neutral-400 font-semibold">
                          {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Refund policy */}
            <div className="bg-white rounded-3xl border border-neutral-200/60 p-6 shadow-sm">
              <h3 className="text-sm font-black text-neutral-900 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-neutral-400" /> Refund Policy
              </h3>
              <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
                Payments are held in escrow until you approve the delivery. If you raise a valid dispute and the editor cannot fulfil the brief, a full refund is processed within 5–7 business days to your original payment method.
              </p>
              <Link href="/refund" className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:underline mt-3">
                Read full refund policy <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
