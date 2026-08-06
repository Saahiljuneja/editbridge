export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { disputes, orders, users, packages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { formatDate, formatDateTime, displayNameFromFull } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle } from "lucide-react";
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
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-4">
        <Link href={`/client/orders/${dispute.orderId}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to order
        </Link>
      </div>

      <PageHeader
        title="Dispute"
        subtitle={`Order: ${dispute.packageTitle}`}
      />

      <div className="mt-6 space-y-5">
        {/* Status banner */}
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl px-5 py-4",
            isResolved
              ? "bg-green-50 border border-green-200"
              : "bg-amber-50 border border-amber-200"
          )}
        >
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
          <Badge
            className={cn(
              "ml-auto text-xs border-0",
              isResolved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            )}
          >
            {isResolved ? "Resolved" : "Open"}
          </Badge>
        </div>

        {/* Details */}
        <div className="rounded-xl border border-border p-5 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Opened by</p>
            <p className="text-sm font-medium">{displayNameFromFull(opener?.name)}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(dispute.createdAt)}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Reason</p>
            <p className="text-sm whitespace-pre-wrap">{dispute.reason}</p>
          </div>

          {dispute.evidenceText && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Additional notes</p>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{dispute.evidenceText}</p>
            </div>
          )}
          {dispute.evidenceUrls && dispute.evidenceUrls.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Evidence screenshots</p>
              <div className="flex flex-wrap gap-2">
                {dispute.evidenceUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Evidence ${i + 1}`}
                      className="w-24 h-24 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Resolution */}
        {isResolved && (dispute.resolutionType || dispute.resolutionNote) && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Resolution</p>
            {dispute.resolutionType && (
              <p className="text-sm font-medium text-green-800">
                {RESOLUTION_LABELS[dispute.resolutionType] ?? dispute.resolutionType}
              </p>
            )}
            {dispute.resolutionNote && (
              <p className="text-sm text-green-700 whitespace-pre-wrap">{dispute.resolutionNote}</p>
            )}
          </div>
        )}

        <Link
          href={`/client/orders/${dispute.orderId}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          View order
        </Link>
      </div>

      {/* Dispute chat */}
      <div className="mt-6">
        <DisputeChat
          disputeId={id}
          currentUserId={userId}
          isResolved={dispute.status === "resolved"}
        />
      </div>
    </div>
  );
}
