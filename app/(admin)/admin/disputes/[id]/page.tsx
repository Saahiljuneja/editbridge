import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { disputes, orders, packages, users, editors, messages } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { formatDate, formatDateTime, displayNameFromFull } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { DisputeResolveForm } from "./dispute-resolve-form";
import { DisputeReopenForm } from "./dispute-reopen-form";
import { DisputeChat } from "@/components/disputes/dispute-chat";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin", "staff_support", "staff_dispute"];

const RESOLUTION_LABELS: Record<string, string> = {
  refund: "Full refund to client",
  release: "Payment released to editor",
  split: "Payment split between parties",
};

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
      packageTitle: packages.title,
    })
    .from(disputes)
    .innerJoin(orders, eq(orders.id, disputes.orderId))
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(eq(disputes.id, id))
    .limit(1);

  if (!dispute) notFound();

  const [editorRow] = await db
    .select({ userId: editors.userId })
    .from(editors)
    .where(eq(editors.id, dispute.editorId))
    .limit(1);

  const orderMessages = await db
    .select({ id: messages.id, content: messages.content, senderId: messages.senderId, createdAt: messages.createdAt, isBlocked: messages.isBlocked })
    .from(messages)
    .where(eq(messages.orderId, dispute.orderId))
    .orderBy(asc(messages.createdAt));

  const [[clientUser], [editorUser], [opener]] = await Promise.all([
    db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, dispute.clientId)).limit(1),
    editorRow
      ? db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, editorRow.userId)).limit(1)
      : Promise.resolve([undefined]),
    db.select({ name: users.name }).from(users).where(eq(users.id, dispute.openedBy)).limit(1),
  ]);

  const isOpen = dispute.status === "open";

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-4">
        <Link href="/admin/disputes" className="text-sm text-muted-foreground hover:text-foreground">
          ← Disputes
        </Link>
      </div>

      <PageHeader
        title={`Dispute — ${dispute.packageTitle}`}
        subtitle={`Filed ${formatDate(dispute.createdAt)} by ${displayNameFromFull(opener?.name)}`}
      />

      <div className="mt-6 space-y-5">
        {/* Parties */}
        <div className="rounded-xl border border-border bg-white p-5 grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Client</p>
            <p className="font-medium">{clientUser?.name ?? "Unknown"}</p>
            <p className="text-muted-foreground">{clientUser?.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Editor</p>
            <p className="font-medium">{editorUser?.name ?? "Unknown"}</p>
            <p className="text-muted-foreground">{editorUser?.email}</p>
          </div>
        </div>

        {/* Dispute details */}
        <div className="rounded-xl border border-border bg-white p-5 space-y-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
            <Badge className={cn("text-xs border-0", isOpen ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
              {dispute.status}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Reason</p>
            <p className="whitespace-pre-wrap">{dispute.reason}</p>
          </div>
          {dispute.evidenceText && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Additional notes</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{dispute.evidenceText}</p>
            </div>
          )}
          {dispute.evidenceUrls && dispute.evidenceUrls.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Evidence screenshots</p>
              <div className="flex flex-wrap gap-2">
                {dispute.evidenceUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Evidence ${i + 1}`}
                      className="w-28 h-28 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Resolution */}
        {!isOpen && (dispute.resolutionType || dispute.resolutionNote) && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-2 text-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Resolution</p>
            {dispute.resolutionType && (
              <p className="font-medium text-green-800">{RESOLUTION_LABELS[dispute.resolutionType] ?? dispute.resolutionType}</p>
            )}
            {dispute.resolutionNote && (
              <p className="text-green-700 whitespace-pre-wrap">{dispute.resolutionNote}</p>
            )}
            <p className="text-xs text-muted-foreground">Resolved {formatDate(dispute.updatedAt)}</p>
          </div>
        )}

        {/* Chat transcript */}
        {orderMessages.length > 0 && (
          <div className="rounded-xl border border-border bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <p className="font-semibold text-sm">Message thread ({orderMessages.length})</p>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {orderMessages.map((msg) => {
                const isClient = msg.senderId === dispute.clientId;
                return (
                  <div key={msg.id} className={`flex gap-2 ${isClient ? "" : "flex-row-reverse"}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isClient ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"}`}>
                      {isClient ? "C" : "E"}
                    </div>
                    <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${isClient ? "bg-gray-100 text-gray-800" : "bg-[#0EA5E9]/10 text-[#0EA5E9]"} ${msg.isBlocked ? "opacity-50 line-through" : ""}`}>
                      <p>{msg.content}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formatDateTime(msg.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Link
          href={`/admin/orders/${dispute.orderId}`}
          className="text-sm text-[#0EA5E9] underline underline-offset-2"
        >
          View order →
        </Link>

        {/* Dispute chat */}
        <div className="mt-6">
          <DisputeChat
            disputeId={id}
            currentUserId={session.user.userId!}
            isResolved={!isOpen}
          />
        </div>

        {/* Resolve form */}
        {isOpen && <DisputeResolveForm disputeId={id} />}

        {/* Reopen — only for resolved disputes, only for admin */}
        {!isOpen && session.user.role === "admin" && (
          <DisputeReopenForm disputeId={id} />
        )}
      </div>
    </div>
  );
}
