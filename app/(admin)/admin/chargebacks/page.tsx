import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle, Clock, ExternalLink } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Chargebacks come from Razorpay webhook events. Until a dedicated
// chargebacks table is added, this page shows the integration guide
// and a placeholder for the dispute feed.
const MOCK_CHARGEBACKS = [
  { id: "cb_001", paymentId: "pay_QAB1234xyz", amount: 49900, reason: "Fraudulent transaction", status: "open", raisedAt: "2026-07-08" },
  { id: "cb_002", paymentId: "pay_QAB5678abc", amount: 129900, reason: "Product not received", status: "won", raisedAt: "2026-07-01" },
  { id: "cb_003", paymentId: "pay_QAB9012def", amount: 79900, reason: "Duplicate payment", status: "lost", raisedAt: "2026-06-28" },
];

const STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-50 text-amber-700",
  won: "bg-emerald-50 text-emerald-700",
  lost: "bg-red-50 text-red-700",
};

export default async function AdminChargebacksPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin/dashboard");

  const open = MOCK_CHARGEBACKS.filter(c => c.status === "open").length;
  const won = MOCK_CHARGEBACKS.filter(c => c.status === "won").length;
  const lost = MOCK_CHARGEBACKS.filter(c => c.status === "lost").length;

  return (
    <div className="px-8 py-6 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chargeback Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Payment gateway disputes from Razorpay. Respond within 7 days to avoid automatic loss.</p>
        </div>
        <a href="https://dashboard.razorpay.com/app/disputes" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl hover:border-gray-300 transition-colors">
          <ExternalLink className="w-3.5 h-3.5" /> Razorpay Dashboard
        </a>
      </div>

      {/* Info banner */}
      <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5 flex gap-4">
        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Webhook integration needed</p>
          <p className="text-sm text-blue-700 mt-1">
            Connect your Razorpay <code className="bg-blue-100 px-1 rounded text-xs">payment.dispute.created</code> webhook to{" "}
            <code className="bg-blue-100 px-1 rounded text-xs">/api/webhooks/razorpay</code> to automatically surface chargebacks here.
            Below is a preview with sample data.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Open disputes", value: open, color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
          { label: "Won", value: won, color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle },
          { label: "Lost", value: lost, color: "text-red-600", bg: "bg-red-50", icon: AlertCircle },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl ${s.bg} px-5 py-5`}>
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Chargeback Cases</p>
          <span className="text-xs text-gray-400 dark:text-gray-500 italic">Sample data â€" connect webhook to populate</span>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {MOCK_CHARGEBACKS.map(cb => (
            <div key={cb.id} className="flex items-center gap-4 px-6 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{cb.paymentId}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{cb.reason}</p>
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white shrink-0">â‚¹{(cb.amount / 100).toFixed(2)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{cb.raisedAt}</p>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLES[cb.status]}`}>
                {cb.status.charAt(0).toUpperCase() + cb.status.slice(1)}
              </span>
              {cb.status === "open" && (
                <a href={`https://dashboard.razorpay.com/app/disputes/${cb.paymentId}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs font-semibold text-[var(--brand-client)] hover:underline shrink-0 flex items-center gap-1">
                  Respond <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-3">
        <p className="font-semibold text-gray-900 dark:text-white text-sm">How to respond to a chargeback</p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li>Open the dispute in the Razorpay dashboard.</li>
          <li>Upload evidence: order confirmation, delivery proof, client correspondence.</li>
          <li>Submit within the deadline (usually 7 days from dispute date).</li>
          <li>Mark the dispute as resolved here once Razorpay closes it.</li>
        </ol>
      </div>
    </div>
  );
}
