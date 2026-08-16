export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { disputes, orders, users, packages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { formatDate, formatDateTime, displayNameFromFull } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, ArrowLeft, FileText } from "lucide-react";
import { TopoBackground } from "@/components/common/topo-background";
import Link from "next/link";
import { DisputeChat } from "@/components/disputes/dispute-chat";

const RESOLUTION_LABELS: Record<string, string> = {
  refund: "Full refund to client",
  release: "Payment released to editor",
  split: "Payment split between parties",
};

export default async function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const userId = session.user.userId!;

  const [dispute] = await db
    .select({
      id: disputes.id,
      orderId: disputes.orderId,
      openedBy: disputes.openedBy,
      reason: disputes.reason,
      evidenceText: disputes.evidenceText,
      evidenceUrls: disputes.evidenceUrls,
      status: disputes.status,
      resolutionType: disputes.resolutionType,
      resolutionNote: disputes.resolutionNote,
      createdAt: disputes.createdAt,
      updatedAt: disputes.updatedAt,
      clientId: orders.clientId,
      packageTitle: packages.title,
    })
    .from(disputes)
    .innerJoin(orders, eq(orders.id, disputes.orderId))
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(eq(disputes.id, id))
    .limit(1);

  if (!dispute) notFound();
  if (dispute.clientId !== userId) notFound();

  const [opener] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, dispute.openedBy))
    .limit(1);

  const isResolved = dispute.status === "resolved";

  return (
    <div className="relative min-h-screen bg-slate-50/50 pb-12 overflow-hidden">
      <TopoBackground background="#f8fafc" strokeColor="#e2e8f0" opacity={0.4} />

      <div className="max-w-2xl mx-auto px-6 pt-6 space-y-4 relative z-10">
        {/* Back + header card */}
        <div className="bg-white rounded-3xl border border-neutral-200/60 p-6 shadow-sm">
          <Link
            href={`/client/disputes`}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to disputes
          </Link>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-neutral-900">Dispute</h1>
              {dispute.packageTitle && (
                <p className="text-xs text-neutral-400 font-semibold mt-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> {dispute.packageTitle}
                </p>
              )}
            </div>
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0",
                isResolved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              )}
            >
              {isResolved ? "Resolved" : "Open"}
            </span>
          </div>
        </div>

        {/* Status banner */}
        <div className={cn(
          "flex items-center gap-3 rounded-2xl px-5 py-4 border",
          isResolved ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
        )}>
          {isResolved ? (
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <div>
            <p className={cn("font-semibold text-sm", isResolved ? "text-green-800" : "text-amber-800")}>
              {isResolved ? "Dispute resolved" : "Dispute under review"}
            </p>
            <p className={cn("text-xs mt-0.5", isResolved ? "text-green-700" : "text-amber-700")}>
              {isResolved
                ? `Resolved on ${formatDate(dispute.updatedAt)}`
                : "Our support team will reach out within 48 hours."}
            </p>
          </div>
        </div>

        {/* Details card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Opened by</p>
            <p className="text-sm font-semibold text-gray-900">{displayNameFromFull(opener?.name)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(dispute.createdAt)}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Reason</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{dispute.reason}</p>
          </div>

          {dispute.evidenceText && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Additional notes</p>
              <p className="text-sm text-gray-500 whitespace-pre-wrap leading-relaxed">{dispute.evidenceText}</p>
            </div>
          )}

          {dispute.evidenceUrls && dispute.evidenceUrls.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Evidence</p>
              <div className="flex flex-wrap gap-2">
                {dispute.evidenceUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Evidence ${i + 1}`}
                      className="w-24 h-24 object-cover rounded-xl border border-gray-200 hover:opacity-80 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Resolution */}
        {isResolved && (dispute.resolutionType || dispute.resolutionNote) && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 mb-1">Resolution</p>
            {dispute.resolutionType && (
              <p className="text-sm font-semibold text-green-800">
                {RESOLUTION_LABELS[dispute.resolutionType] ?? dispute.resolutionType}
              </p>
            )}
            {dispute.resolutionNote && (
              <p className="text-sm text-green-700 whitespace-pre-wrap leading-relaxed">{dispute.resolutionNote}</p>
            )}
          </div>
        )}

        <Link
          href={`/client/orders/${dispute.orderId}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> View order
        </Link>

        {/* Dispute chat */}
        <DisputeChat
          disputeId={id}
          currentUserId={userId}
          isResolved={dispute.status === "resolved"}
        />
      </div>
    </div>
  );
}
