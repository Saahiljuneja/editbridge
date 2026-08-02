export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { CreditCard, Shield, ExternalLink, Info } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function PaymentMethodsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.userId!;

  // Pull last 10 completed payments so we can surface recent payment method usage
  const recentPayments = await db
    .select({
      id: orders.id,
      totalAmount: orders.totalAmount,
      razorpayPaymentId: orders.razorpayPaymentId,
      razorpayOrderId: orders.razorpayOrderId,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      sql`${orders.clientId} = ${userId} AND ${orders.razorpayPaymentId} IS NOT NULL`,
    )
    .orderBy(desc(orders.createdAt))
    .limit(10);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <h1 className="text-xl font-bold text-gray-900">Payment Methods</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage how you pay on EditBridge</p>
      </div>

      <div className="px-6 py-6 space-y-5">
        {/* Info banner */}
        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5 flex gap-4">
          <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Cards managed by Razorpay</p>
            <p className="text-sm text-blue-700 mt-1 leading-relaxed">
              EditBridge uses Razorpay as its payment processor. Your card details are stored
              securely by Razorpay and never touched by EditBridge servers. To add, remove, or
              update saved cards, use the Razorpay customer portal.
            </p>
            <a href="https://razorpay.com" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-blue-700 hover:text-blue-900">
              Razorpay customer portal <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Accepted payment methods */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="font-semibold text-gray-900 text-sm">Accepted payment methods</p>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { label: "Credit / Debit Cards", desc: "Visa, Mastercard, RuPay, Amex", icon: "ðŸ’³" },
              { label: "UPI", desc: "GPay, PhonePe, Paytm, BHIM, and all UPI apps", icon: "ðŸ‡®ðŸ‡³" },
              { label: "Net Banking", desc: "All major Indian banks", icon: "ðŸ¦" },
              { label: "Wallets", desc: "Paytm, Mobikwik, Freecharge", icon: "ðŸ‘›" },
              { label: "EMI", desc: "Credit card EMI via Razorpay", icon: "ðŸ“…" },
            ].map(({ label, desc, icon }) => (
              <div key={label} className="flex items-center gap-4 px-6 py-4">
                <span className="text-xl">{icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Processing fee notice */}
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5 flex gap-3">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 leading-relaxed">
            A <strong>4% platform fee</strong> is added to all orders to cover payment processing and platform costs.
            This is shown transparently at checkout before you pay.
          </p>
        </div>

        {/* Recent transactions */}
        {recentPayments.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-900 text-sm">Recent payments</p>
              <Link href="/transactions" className="text-xs font-semibold text-[var(--brand-client)] hover:underline">
                View all â†’
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(p.totalAmount)}</p>
                    <p className="text-xs text-gray-400 font-mono truncate">{p.razorpayPaymentId}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">{formatDate(p.createdAt)}</p>
                    <Link href={`/orders/${p.id}`}
                      className="text-xs font-semibold text-[var(--brand-client)] hover:underline">
                      View order
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Refund policy */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-3">
          <p className="font-semibold text-gray-900 text-sm">Refund policy</p>
          <ul className="space-y-2 text-sm text-gray-600 list-disc list-inside leading-relaxed">
            <li>Pending orders cancelled before acceptance receive a <strong>full refund</strong>.</li>
            <li>Orders cancelled after the editor has started work are handled on a case-by-case basis via dispute.</li>
            <li>Refunds are processed to the original payment method within 5â€“7 business days.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}