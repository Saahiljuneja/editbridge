export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, editors, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { formatCurrency, formatDate, displayNameFromFull } from "@/lib/utils";
import { PrintButton } from "./print-button";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const [order] = await db
    .select({
      id: orders.id,
      editorId: orders.editorId,
      status: orders.status,
      brief: orders.brief,
      totalAmount: orders.totalAmount,
      commissionAmount: orders.commissionAmount,
      processingFee: orders.processingFee,
      createdAt: orders.createdAt,
      deadline: orders.deadline,
      razorpayPaymentId: orders.razorpayPaymentId,
      packageTitle: packages.title,
      packageTier: packages.tier,
      packageDeliveryDays: packages.deliveryDays,
      packageRevisionCount: packages.revisionCount,
      clientName: users.name,
      clientEmail: users.email,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .innerJoin(users, eq(users.id, orders.clientId))
    .where(and(eq(orders.id, id), eq(orders.clientId, session.user.userId!)))
    .limit(1);

  if (!order) notFound();

  const [editorRow] = await db
    .select({ name: users.name, email: users.email })
    .from(editors)
    .innerJoin(users, eq(users.id, editors.userId))
    .where(eq(editors.id, order.editorId))
    .limit(1);

  const processingFee = order.processingFee ?? 0;
  const packageAmount = order.totalAmount - processingFee;
  const subtotal = Math.round(packageAmount / 1.18);
  const gst = packageAmount - subtotal;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      {/* Print/Back bar — hidden on print */}
      <div className="max-w-2xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <a href={`/client/orders/${order.id}`} className="text-sm text-gray-500 hover:text-gray-800">← Back to order</a>
        <PrintButton />
      </div>

      {/* Invoice card */}
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:shadow-none print:rounded-none print:border-0">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100" style={{ background: "linear-gradient(135deg, #000000 0%, #171717 100%)" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white font-bold text-xl">EditBridge</p>
              <p className="text-white/60 text-xs mt-0.5">editbridge.in</p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold text-lg">INVOICE</p>
              <p className="text-white/60 text-xs mt-0.5">#{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Parties */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Bill To</p>
              <p className="font-semibold text-gray-900 text-sm">{order.clientName ?? "Client"}</p>
              <p className="text-xs text-gray-500">{order.clientEmail}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Service By</p>
              <p className="font-semibold text-gray-900 text-sm">{displayNameFromFull(editorRow?.name)}</p>
              <p className="text-xs text-gray-500">{editorRow?.email}</p>
            </div>
          </div>

          {/* Invoice meta */}
          <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-xl p-4">
            {[
              { label: "Invoice Date",  value: formatDate(order.createdAt) },
              { label: "Order Status",  value: order.status.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()) },
              { label: "Payment Ref",   value: order.razorpayPaymentId ? order.razorpayPaymentId.slice(0, 12) + "…" : "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Line items */}
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs text-gray-400 font-medium uppercase tracking-wide">Description</th>
                  <th className="text-right py-2 text-xs text-gray-400 font-medium uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50">
                  <td className="py-3">
                    <p className="font-medium text-gray-900">{order.packageTitle}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{order.packageDeliveryDays}d delivery</p>
                  </td>
                  <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(subtotal)}</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-3 text-gray-500 text-xs">GST (18%)</td>
                  <td className="py-3 text-right text-gray-500 text-xs">{formatCurrency(gst)}</td>
                </tr>
                {processingFee > 0 && (
                  <tr className="border-b border-gray-50">
                    <td className="py-3 text-gray-500 text-xs">Processing fee</td>
                    <td className="py-3 text-right text-gray-500 text-xs">{formatCurrency(processingFee)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-4 font-bold text-gray-900">Total Paid</td>
                  <td className="pt-4 text-right font-bold text-gray-900 text-lg">{formatCurrency(order.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 pt-4 text-center">
            <p className="text-xs text-gray-400">Thank you for choosing EditBridge · support@editbridge.in</p>
            <p className="text-[10px] text-gray-300 mt-1">This is a computer-generated invoice and does not require a signature.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
