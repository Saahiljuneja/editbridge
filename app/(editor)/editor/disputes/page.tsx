export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { disputes, orders, packages, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatDate, formatDateTime } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { DisputeResponseForm } from "./dispute-response-form";

const STATUS_CONFIG = {
  open:     { label: "Open",     icon: Clock,         color: "text-amber-600", bg: "bg-amber-50",  dot: "bg-amber-400" },
  resolved: { label: "Resolved", icon: CheckCircle2,  color: "text-green-600", bg: "bg-green-50",  dot: "bg-green-400" },
};

const RESOLUTION_LABELS: Record<string, string> = {
  refund_client:    "Refund issued to client",
  payout_editor:    "Payout released to editor",
  partial_refund:   "Partial refund",
  order_cancelled:  "Order cancelled",
  no_action:        "No action taken",
};

export default async function EditorDisputesPage() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  const editorId = session.user.editorId!;
  if (!editorId) redirect("/editor/kyc");

  const rows = await db
    .select({
      id: disputes.id,
      reason: disputes.reason,
      evidenceText: disputes.evidenceText,
      status: disputes.status,
      resolutionType: disputes.resolutionType,
      resolutionNote: disputes.resolutionNote,
      createdAt: disputes.createdAt,
      updatedAt: disputes.updatedAt,
      orderId: orders.id,
      packageTitle: packages.title,
      clientName: users.name,
    })
    .from(disputes)
    .innerJoin(orders, eq(orders.id, disputes.orderId))
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .innerJoin(users, eq(users.id, orders.clientId))
    .where(eq(orders.editorId, editorId))
    .orderBy(desc(disputes.createdAt));

  const openCount = rows.filter(r => r.status === "open").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Disputes</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {openCount > 0 ? `${openCount} open dispute${openCount !== 1 ? "s" : ""}` : "No open disputes"}
            </p>
          </div>
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", openCount > 0 ? "bg-amber-50" : "bg-gray-100")}>
            <AlertTriangle className={cn("w-4 h-4", openCount > 0 ? "text-amber-600" : "text-gray-400")} />
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">

        {/* Info banner */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
          <p className="text-sm font-medium text-blue-800 mb-0.5">How disputes work</p>
          <p className="text-xs text-blue-700 leading-relaxed">
            A client may open a dispute if they're unhappy with a delivery. You can submit your response below and our team will review within 3 business days. Keep communication professional.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-500" />
            </div>
            <p className="font-semibold text-gray-800">No disputes</p>
            <p className="text-sm text-gray-400 mt-1">Great track record — keep it up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map(row => {
              const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.open;
              const StatusIcon = cfg.icon;
              return (
                <div key={row.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full", cfg.bg, cfg.color)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900">{row.packageTitle}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Client: {row.clientName} · Opened {formatDate(row.createdAt)} ·{" "}
                        <Link href={`/editor/orders/${row.orderId}`} className="text-[#0EA5E9] hover:underline">View order →</Link>
                      </p>
                    </div>
                  </div>

                  <div className="px-6 py-5 space-y-4">
                    {/* Client's reason */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Client's reason</p>
                      <p className="text-sm text-gray-700 leading-relaxed bg-red-50 border border-red-100 rounded-xl px-4 py-3">{row.reason}</p>
                    </div>

                    {/* Your response or response form */}
                    {row.status === "open" ? (
                      <DisputeResponseForm disputeId={row.id} existingResponse={row.evidenceText} />
                    ) : (
                      <>
                        {row.evidenceText && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Your response</p>
                            <p className="text-sm text-gray-700 leading-relaxed bg-[#0EA5E9]/5 border border-[#0EA5E9]/15 rounded-xl px-4 py-3">{row.evidenceText}</p>
                          </div>
                        )}
                        {row.resolutionType && (
                          <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3">
                            <p className="text-xs font-semibold text-green-700 mb-0.5">Resolution</p>
                            <p className="text-sm text-green-800 font-medium">{RESOLUTION_LABELS[row.resolutionType] ?? row.resolutionType}</p>
                            {row.resolutionNote && <p className="text-xs text-green-700 mt-1">{row.resolutionNote}</p>}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
