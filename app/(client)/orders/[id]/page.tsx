import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, editors, users, deliveries, revisionRequests, reviews, disputes } from "@/lib/db/schema";
import { and, eq, asc, sql } from "drizzle-orm";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderActions } from "./order-actions";
import { ReviewForm } from "./review-form";
import { DisputeForm } from "./dispute-form";
import { formatCurrency, formatDate, formatDateTime, displayNameFromFull } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, Clock, RotateCcw, FileText, RefreshCw } from "lucide-react";
import { getPublicUrl } from "@/lib/r2";
import Link from "next/link";
import { OrderTimeline } from "@/components/client/order-timeline";
import { OrderEventTimeline } from "@/components/order/order-event-timeline";
import { DeliveryComments } from "@/components/orders/delivery-comments";
import { DeadlineCountdown } from "@/components/orders/deadline-countdown";
import { ExtensionPanel } from "@/components/orders/extension-panel";
import { DownloadAllButton } from "@/components/orders/download-all-button";
import { OrderReferences } from "@/components/client/order-references";

export default async function ClientOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      brief: orders.brief,
      totalAmount: orders.totalAmount,
      commissionAmount: orders.commissionAmount,
      deadline: orders.deadline,
      createdAt: orders.createdAt,
      acceptedAt: orders.acceptedAt,
      deliveredAt: orders.deliveredAt,
      completedAt: orders.completedAt,
      clientId: orders.clientId,
      packageId: orders.packageId,
      packageTier: packages.tier,
      packageTitle: packages.title,
      packageDeliveryDays: packages.deliveryDays,
      packageRevisionCount: packages.revisionCount,
      packageRevisionExtensionDays: packages.revisionExtensionDays,
      extensionRequestedAt: orders.extensionRequestedAt,
      extensionReason: orders.extensionReason,
      extensionDays: orders.extensionDays,
      extensionStatus: orders.extensionStatus,
      briefData: orders.briefData,
      editorId: editors.id,
      editorUserId: editors.userId,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .innerJoin(editors, eq(editors.id, orders.editorId))
    .where(and(eq(orders.id, id), eq(orders.clientId, session.user.userId!)))
    .limit(1);

  if (!order) notFound();

  const [editorUser, orderDeliveries, orderRevisions, clientReview, openDispute] = await Promise.all([
    db.select({ name: users.name, image: users.image }).from(users).where(eq(users.id, order.editorUserId)).limit(1).then((r) => r[0]),
    db.select().from(deliveries).where(eq(deliveries.orderId, id)).orderBy(asc(deliveries.versionNumber)),
    db.select().from(revisionRequests).where(eq(revisionRequests.orderId, id)).orderBy(asc(revisionRequests.createdAt)),
    db.select({ id: reviews.id }).from(reviews).where(and(eq(reviews.orderId, id), eq(reviews.reviewerId, session.user.userId!))).limit(1).then((r) => r[0] ?? null),
    db.select({ id: disputes.id }).from(disputes).where(and(eq(disputes.orderId, id), sql`${disputes.status} = 'open'`)).limit(1).then((r) => r[0] ?? null),
  ]);

  const editorName = displayNameFromFull(editorUser?.name);
  const latestDelivery = orderDeliveries[orderDeliveries.length - 1];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/orders" className="text-sm text-gray-400 hover:text-gray-700">← Orders</Link>
            <span className="text-gray-200">/</span>
            <span className="text-sm text-gray-700 font-medium truncate max-w-xs">{order.packageTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/orders/${order.id}/invoice`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> Invoice
            </Link>
            {order.status === "completed" && (
              <a
                href={`/api/orders/${order.id}/invoice`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </a>
            )}
            <Link
              href={`/reorder/${order.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-order
            </Link>
            <OrderStatusBadge status={order.status as Parameters<typeof OrderStatusBadge>[0]["status"]} />
          </div>
        </div>
      </div>

    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{order.packageTitle}</h1>
        <p className="text-gray-400 text-sm mt-1">with {editorName} · {formatDate(order.createdAt)}</p>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-8 items-start">
        <div className="space-y-6">
          {/* Brief */}
          <section className="rounded-xl border border-border p-5">
            <h2 className="font-semibold mb-3">Project brief</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.brief}</p>
          </section>

          {/* Inspiration & References (mood board) */}
          <OrderReferences
            orderId={order.id}
            initial={((order.briefData as Record<string, unknown> | null)?.references as { url: string; note: string; addedAt: string }[] | undefined) ?? []}
            readonly={["completed", "cancelled", "disputed"].includes(order.status)}
          />

          {/* Full event-by-event order timeline */}
          <OrderEventTimeline orderId={order.id} />

          {/* Deliveries */}
          {orderDeliveries.length > 0 && (
            <section className="rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Deliveries</h2>
                <DownloadAllButton orderId={order.id} />
              </div>
              {orderDeliveries.map((d) => {
                const publicUrl = getPublicUrl(d.fileUrl);
                const isVideo = /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(d.fileUrl);
                return (
                  <div key={d.id} className="space-y-3">
                    <div className="flex items-center justify-between bg-muted/40 rounded-lg px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{d.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          v{d.versionNumber} · {formatDateTime(d.createdAt)}
                        </p>
                      </div>
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5")}
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    </div>
                    {/* Inline video preview for video files */}
                    {isVideo && (
                      <div className="rounded-xl overflow-hidden bg-black aspect-video">
                        <video
                          src={publicUrl}
                          controls
                          preload="metadata"
                          className="w-full h-full"
                          id={`video-${d.id}`}
                        />
                      </div>
                    )}
                    {/* Delivery feedback comments */}
                    <DeliveryComments
                      deliveryId={d.id}
                      currentUserId={order.clientId}
                    />
                  </div>
                );
              })}
            </section>
          )}

          {/* Deadline extension request — client decides */}
          {order.extensionStatus === "pending" && (
            <ExtensionPanel
              orderId={order.id}
              viewerRole="client"
              extensionRequestedAt={order.extensionRequestedAt}
              extensionReason={order.extensionReason}
              extensionDays={order.extensionDays}
              extensionStatus={order.extensionStatus}
            />
          )}

          {/* Revision history */}
          {orderRevisions.length > 0 && (
            <section className="rounded-xl border border-border p-5">
              <h2 className="font-semibold mb-4">Revision requests</h2>
              <div className="space-y-4">
                {orderRevisions.map((r, i) => (
                  <div key={r.id} className="flex gap-3">
                    <RotateCcw className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Revision #{i + 1} · {formatDate(r.createdAt)}
                      </p>
                      <p className="text-sm">{r.feedbackText}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Auto-approve countdown — only for delivered orders */}
          {order.status === "delivered" && order.deliveredAt && (() => {
            const autoApproveAt = new Date(order.deliveredAt.getTime() + 7 * 24 * 60 * 60 * 1000);
            const msLeft = autoApproveAt.getTime() - Date.now();
            const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
            return (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Auto-approval in {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""}` : "less than a day"}</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    If you don't approve or request a revision, this delivery will be automatically approved on {formatDate(autoApproveAt)} and the editor's payout will be released.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Client actions */}
          <OrderActions
            orderId={order.id}
            status={order.status}
            latestDeliveryId={latestDelivery?.id}
            revisionsUsed={orderRevisions.length}
            revisionLimit={order.packageRevisionCount ?? -1}
            revisionExtensionDays={order.packageRevisionExtensionDays ?? 2}
          />

          {/* Review — only after completion, only if not yet submitted */}
          {order.status === "completed" && !clientReview && (
            <ReviewForm orderId={order.id} editorName={editorName} />
          )}
          {order.status === "completed" && clientReview && (
            <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
              You have already submitted a review for this order.
            </div>
          )}

          {/* Dispute — only on active orders, only if no open dispute */}
          {["in_progress", "delivered", "revision_requested"].includes(order.status) && !openDispute && (
            <DisputeForm orderId={order.id} />
          )}
          {openDispute && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <span>A dispute is open for this order.</span>
              <Link href={`/disputes/${openDispute.id}`} className="underline underline-offset-2 font-medium">
                View dispute
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar summary */}
        <div className="space-y-4">
        <OrderTimeline
          status={order.status as Parameters<typeof OrderTimeline>[0]["status"]}
          timestamps={{
            placed: order.createdAt,
            accepted: order.acceptedAt ?? undefined,
            delivered: order.deliveredAt ?? undefined,
            completed: order.completedAt ?? undefined,
          }}
          approvedExtensionDays={order.extensionStatus === "approved" ? order.extensionDays : null}
        />
        <div className="rounded-xl border border-border p-5 space-y-4 sticky top-24 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Package</p>
            <p className="font-medium">{order.packageTitle}</p>
          </div>
          <div className="space-y-2 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {order.deadline
                ? !["completed", "cancelled", "disputed"].includes(order.status)
                  ? <DeadlineCountdown deadline={order.deadline.toISOString()} />
                  : `Due ${formatDate(order.deadline)}`
                : `${order.packageDeliveryDays}d delivery`}
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              {order.packageRevisionCount === -1 ? "Unlimited" : order.packageRevisionCount} revision{order.packageRevisionCount !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <div className="flex justify-between mb-1">
              <span className="text-muted-foreground">Total paid</span>
              <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
          <Link
            href={`/messages/${order.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full justify-center")}
          >
            Message editor
          </Link>
        </div>
        </div>
      </div>
    </div>
    </div>
  );
}
