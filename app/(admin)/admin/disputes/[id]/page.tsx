import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  disputes, orders, packages, users, editors, messages,
  deliveries, orderEvents, disputeMessages,
} from "@/lib/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { formatDate, formatDateTime, displayNameFromFull } from "@/lib/utils";
import {
  MessageSquare, FileText, Clock, DollarSign, AlertTriangle,
  Download, ChevronRight, User, Scale, Package, ArrowLeft, Gavel,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DisputeResolveForm } from "./dispute-resolve-form";
import { DisputeReopenForm } from "./dispute-reopen-form";
import { DisputeChat } from "@/components/disputes/dispute-chat";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin", "staff_support", "staff_dispute"];

const RESOLUTION_LABELS: Record<string, { label: string; color: string }> = {
  refund:  { label: "Full refund to client",         color: "bg-red-100 text-red-700" },
  release: { label: "Payment released to editor",    color: "bg-green-100 text-green-700" },
  split:   { label: "Payment split between parties", color: "bg-amber-100 text-amber-700" },
};

const EVENT_LABELS: Record<string, string> = {
  order_created:    "Order created",
  order_accepted:   "Editor accepted",
  order_delivered:  "Delivery submitted",
  revision_requested: "Revision requested",
  order_completed:  "Order completed",
  order_cancelled:  "Order cancelled",
  dispute_opened:   "Dispute opened",
  dispute_resolved: "Dispute resolved",
  payout_scheduled: "Payout scheduled",
  order_overdue:    "Delivery overdue",
};

function paise(val: number) {
  return `₹${(val / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) redirect("/admin/dashboard");

  const { id } = await params;

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
      resolvedBy: disputes.resolvedBy,
      createdAt: disputes.createdAt,
      updatedAt: disputes.updatedAt,
      clientId: orders.clientId,
      editorId: orders.editorId,
      totalAmount: orders.totalAmount,
      commissionAmount: orders.commissionAmount,
      processingFee: orders.processingFee,
      packageTitle: packages.title,
      orderStatus: orders.status,
      orderCreatedAt: orders.createdAt,
      briefData: orders.briefData,
    })
    .from(disputes)
    .innerJoin(orders, eq(orders.id, disputes.orderId))
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(eq(disputes.id, id))
    .limit(1);

  if (!dispute) notFound();

  const [editorRow] = await db
    .select({ userId: editors.userId, razorpayAccountId: editors.razorpayAccountId })
    .from(editors)
    .where(eq(editors.id, dispute.editorId))
    .limit(1);

  const [
    orderMessages,
    orderDeliveries,
    orderTimeline,
    disputeThread,
  ] = await Promise.all([
    db.select({
      id: messages.id,
      content: messages.content,
      senderId: messages.senderId,
      createdAt: messages.createdAt,
      isBlocked: messages.isBlocked,
      fileUrl: messages.fileUrl,
      fileName: messages.fileName,
    })
    .from(messages)
    .where(eq(messages.orderId, dispute.orderId))
    .orderBy(asc(messages.createdAt)),

    db.select({
      id: deliveries.id,
      versionNumber: deliveries.versionNumber,
      fileName: deliveries.fileName,
      fileUrl: deliveries.fileUrl,
      fileSize: deliveries.fileSize,
      createdAt: deliveries.createdAt,
    })
    .from(deliveries)
    .where(eq(deliveries.orderId, dispute.orderId))
    .orderBy(desc(deliveries.createdAt)),

    db.select({
      id: orderEvents.id,
      eventType: orderEvents.eventType,
      metadata: orderEvents.metadata,
      createdAt: orderEvents.createdAt,
    })
    .from(orderEvents)
    .where(eq(orderEvents.orderId, dispute.orderId))
    .orderBy(asc(orderEvents.createdAt)),

    db.select({
      id: disputeMessages.id,
      body: disputeMessages.body,
      senderId: disputeMessages.senderId,
      createdAt: disputeMessages.createdAt,
    })
    .from(disputeMessages)
    .where(eq(disputeMessages.disputeId, id))
    .orderBy(asc(disputeMessages.createdAt)),
  ]);

  const [[clientUser], [editorUser], [opener], resolver] = await Promise.all([
    db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, dispute.clientId)).limit(1),
    editorRow
      ? db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, editorRow.userId)).limit(1)
      : Promise.resolve([undefined]),
    db.select({ name: users.name }).from(users).where(eq(users.id, dispute.openedBy)).limit(1),
    dispute.resolvedBy
      ? db.select({ name: users.name }).from(users).where(eq(users.id, dispute.resolvedBy)).limit(1).then(r => r[0])
      : Promise.resolve(undefined),
  ]);

  const isOpen = dispute.status === "open";

  // ── Financial calculations ──────────────────────────────────────────────────
  const packagePrice  = dispute.totalAmount - (dispute.processingFee ?? 0);
  const editorNet     = packagePrice - dispute.commissionAmount;
  const editbridgeFee = dispute.commissionAmount;
  const processingFee = dispute.processingFee ?? 0;
  // Split scenario: split 50/50 of the package price
  const splitToClient = Math.floor(packagePrice * 0.5);
  const splitToEditor = packagePrice - splitToClient;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-16">
      {/* Top nav */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/disputes" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Disputes
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">Arbitration Panel</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-xs border-0 font-semibold px-2.5 py-1", isOpen ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
            {isOpen ? "🔴 Open" : "✅ Resolved"}
          </Badge>
          {isOpen && (
            <Badge className={cn("text-xs border-0 font-semibold px-2.5 py-1", dispute.evidenceText && dispute.evidenceText.trim().length > 0 ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700")}>
              {dispute.evidenceText && dispute.evidenceText.trim().length > 0 ? "Ready for Review" : "Awaiting Editor"}
            </Badge>
          )}
          <Link
            href={`/admin/orders/${dispute.orderId}`}
            className="text-xs font-medium text-[var(--brand-client)] hover:underline underline-offset-2 flex items-center gap-1"
          >
            <Package className="w-3.5 h-3.5" /> View order
          </Link>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Warning Banner */}
        {isOpen && !editorRow?.razorpayAccountId && (
          <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs flex items-start gap-2.5 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Payout Restriction Warning</p>
              <p className="mt-0.5 text-amber-700">
                The editor has not completed their payment registration yet (no Razorpay bank account linked).
                If you resolve this dispute in the editor's favor ("Release Payment"), payouts will remain stuck until they link their account.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Gavel className="w-5 h-5 text-red-600" />
            <h1 className="text-xl font-extrabold text-gray-900">
              {dispute.packageTitle ?? "Custom Order"} — Dispute #{id.slice(0, 8).toUpperCase()}
            </h1>
          </div>
          <p className="text-sm text-gray-500">
            Filed {formatDate(dispute.createdAt)} by {displayNameFromFull(opener?.name)} ·{" "}
            {orderMessages.length} messages · {orderDeliveries.length} deliveries
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* LEFT COLUMN: Dispute info + financials + evidence */}
          <div className="xl:col-span-2 space-y-5">

            {/* Parties Card */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Parties Involved</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Client (Buyer)</p>
                    <p className="font-semibold text-sm text-gray-900">{clientUser?.name ?? "Unknown"}</p>
                    <p className="text-xs text-gray-500">{clientUser?.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-violet-50 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-0.5">Editor (Seller)</p>
                    <p className="font-semibold text-sm text-gray-900">{editorUser?.name ?? "Unknown"}</p>
                    <p className="text-xs text-gray-500">{editorUser?.email}</p>
                    {!editorRow?.razorpayAccountId && (
                      <p className="text-[10px] text-amber-600 font-semibold mt-0.5">⚠ No bank account linked</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Escrow Financial Breakdown */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5" /> Escrow Breakdown
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                {[
                  { label: "Client Paid",       value: paise(dispute.totalAmount), sub: "incl. processing fee", color: "bg-gray-50 border-gray-200" },
                  { label: "Processing Fee",     value: paise(processingFee),       sub: "non-refundable",       color: "bg-amber-50 border-amber-200" },
                  { label: "EditBridge Commission", value: paise(editbridgeFee),   sub: "platform fee",          color: "bg-[var(--brand-client)]/5 border-[var(--brand-client)]/20" },
                  { label: "Editor Earnings",    value: paise(editorNet),           sub: "if order completes",   color: "bg-green-50 border-green-200" },
                ].map((item) => (
                  <div key={item.label} className={cn("rounded-xl border p-4", item.color)}>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="text-lg font-extrabold text-gray-900">{item.value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>
                  </div>
                ))}
              </div>

              {/* Resolution Impact Preview */}
              <div className="rounded-xl border border-dashed border-gray-200 p-4 bg-gray-50">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Resolution Financial Impact</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Full Refund</p>
                    <p className="text-xs text-gray-700">Client gets back <span className="font-bold">{paise(dispute.totalAmount)}</span></p>
                    <p className="text-[10px] text-gray-400 mt-1">Editor receives ₹0. Processing fee refunded.</p>
                  </div>
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                    <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Release to Editor</p>
                    <p className="text-xs text-gray-700">Editor gets <span className="font-bold">{paise(editorNet)}</span></p>
                    <p className="text-[10px] text-gray-400 mt-1">EditBridge keeps {paise(editbridgeFee)} commission.</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">50/50 Split</p>
                    <p className="text-xs text-gray-700">Client: <span className="font-bold">{paise(splitToClient)}</span> · Editor: <span className="font-bold">{paise(splitToEditor)}</span></p>
                    <p className="text-[10px] text-gray-400 mt-1">Manual Razorpay action required.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Dispute Reason & Evidence */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Dispute Claim
              </h2>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Stated reason</p>
                <p className="text-sm text-gray-800 bg-red-50 border border-red-100 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">{dispute.reason}</p>
              </div>
              {dispute.evidenceText && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">Additional notes</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{dispute.evidenceText}</p>
                </div>
              )}
              {dispute.evidenceUrls && dispute.evidenceUrls.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Evidence screenshots ({dispute.evidenceUrls.length})</p>
                  <div className="flex flex-wrap gap-3">
                    {dispute.evidenceUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="group relative block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Evidence ${i + 1}`}
                          className="w-28 h-28 object-cover rounded-xl border-2 border-gray-200 group-hover:border-[var(--brand-client)] transition-colors"
                        />
                        <div className="absolute inset-0 flex items-end justify-center rounded-xl bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2">
                          <span className="text-[10px] font-bold text-white">Open ↗</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Editor Deliveries */}
            {orderDeliveries.length > 0 && (
              <section className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> Delivery Files ({orderDeliveries.length})
                </h2>
                <div className="space-y-2">
                  {orderDeliveries.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 py-2.5 px-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[var(--brand-client)]/10 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-[var(--brand-client)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{d.fileName}</p>
                          <p className="text-[10px] text-gray-400">v{d.versionNumber} · {(d.fileSize / (1024 * 1024)).toFixed(1)} MB · {formatDate(d.createdAt)}</p>
                        </div>
                      </div>
                      <a
                        href={`/api/file/${d.fileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--brand-client)] text-white text-xs font-semibold hover:opacity-90 transition-opacity shrink-0"
                      >
                        <Download className="w-3 h-3" /> Download
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Order Chat Transcript */}
            {orderMessages.length > 0 && (
              <section className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" /> Order Chat Transcript ({orderMessages.length})
                </h2>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                  {orderMessages.map((msg) => {
                    const isClient = msg.senderId === dispute.clientId;
                    return (
                      <div key={msg.id} className={`flex gap-2 ${isClient ? "" : "flex-row-reverse"}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isClient ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"}`}>
                          {isClient ? "C" : "E"}
                        </div>
                        <div className={cn(
                          "max-w-[70%] rounded-xl px-3.5 py-2.5 text-sm",
                          isClient ? "bg-gray-100 text-gray-800" : "bg-[var(--brand-client)]/10 text-gray-800",
                          msg.isBlocked && "opacity-50 line-through"
                        )}>
                          {msg.fileName && (
                            <p className="text-[10px] text-gray-500 font-medium mb-1">📎 {msg.fileName}</p>
                          )}
                          <p className="leading-relaxed">{msg.content}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{formatDateTime(msg.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

          </div>

          {/* RIGHT COLUMN: Timeline + Dispute Chat + Resolution Actions */}
          <div className="space-y-5">

            {/* Resolution Badge (if resolved) */}
            {!isOpen && dispute.resolutionType && (
              <section className="bg-green-50 rounded-2xl border border-green-200 p-5">
                <h2 className="text-xs font-bold text-green-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Scale className="w-3.5 h-3.5" /> Resolution
                </h2>
                <div className={cn("inline-block px-3 py-1 rounded-full text-xs font-bold mb-3", RESOLUTION_LABELS[dispute.resolutionType]?.color ?? "bg-gray-100 text-gray-700")}>
                  {RESOLUTION_LABELS[dispute.resolutionType]?.label ?? dispute.resolutionType}
                </div>
                {dispute.resolutionNote && (
                  <p className="text-sm text-green-800 leading-relaxed whitespace-pre-wrap mb-2">{dispute.resolutionNote}</p>
                )}
                <p className="text-[10px] text-green-600">
                  Resolved {formatDate(dispute.updatedAt)}{resolver?.name ? ` by ${resolver.name}` : ""}
                </p>
              </section>
            )}

            {/* Order Timeline */}
            {orderTimeline.length > 0 && (
              <section className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> Order Timeline
                </h2>
                <ol className="relative space-y-3 border-l border-gray-200 pl-4 ml-1">
                  {orderTimeline.map((event) => (
                    <li key={event.id} className="relative">
                      <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-[var(--brand-client)] border-2 border-white ring-1 ring-[var(--brand-client)]/30" />
                      <p className="text-xs font-semibold text-gray-800">
                        {EVENT_LABELS[event.eventType] ?? event.eventType.replace(/_/g, " ")}
                      </p>
                      <p className="text-[10px] text-gray-400">{formatDateTime(event.createdAt)}</p>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Dispute Chat (arbitration thread) */}
            <section className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" /> Arbitration Thread ({disputeThread.length})
              </h2>
              <DisputeChat
                disputeId={id}
                currentUserId={session.user.userId!}
                isResolved={!isOpen}
              />
            </section>

            {/* Resolution Actions */}
            {isOpen && (
              <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="bg-red-50 border-b border-red-100 px-5 py-3">
                  <h2 className="text-xs font-bold text-red-600 uppercase tracking-widest flex items-center gap-2">
                    <Gavel className="w-3.5 h-3.5" /> Issue Arbitration Ruling
                  </h2>
                  <p className="text-[11px] text-red-500 mt-0.5">This action is irreversible. It will trigger automatic payment processing.</p>
                </div>
                <div className="p-5">
                  <DisputeResolveForm disputeId={id} />
                </div>
              </section>
            )}

            {/* Reopen — only for admin on resolved disputes */}
            {!isOpen && session.user.role === "admin" && (
              <section className="bg-white rounded-2xl border border-gray-200 p-5">
                <DisputeReopenForm disputeId={id} />
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
