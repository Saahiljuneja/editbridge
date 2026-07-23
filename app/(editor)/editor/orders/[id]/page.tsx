import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, users, deliveries, revisionRequests, reviews, clientBlocks } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { DeliveryForm } from "./delivery-form";
import { EditorReviewForm } from "./review-form";
import { formatCurrency, formatDate, formatDateTime, displayNameFromFull } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock, RotateCcw, Download, FileText } from "lucide-react";
import { getPublicUrl } from "@/lib/r2";
import Link from "next/link";
import { ClientNotes } from "@/components/editor/client-notes";
import { OrderEventTimeline } from "@/components/order/order-event-timeline";
import { BlockClientButton } from "./block-client-button";
import { ExtensionPanel } from "@/components/orders/extension-panel";
import { DownloadAllButton } from "@/components/orders/download-all-button";
import { DeliveryComments } from "@/components/orders/delivery-comments";

export default async function EditorOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  const editorId = session.user.editorId;
  if (!editorId) redirect("/editor/kyc");

  const { id } = await params;

  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      brief: orders.brief,
      totalAmount: orders.totalAmount,
      commissionAmount: orders.commissionAmount,
      processingFee: orders.processingFee,
      rewardDiscountAmount: orders.rewardDiscountAmount,
      deadline: orders.deadline,
      createdAt: orders.createdAt,
      clientId: orders.clientId,
      editorId: orders.editorId,
      extensionRequestedAt: orders.extensionRequestedAt,
      extensionReason: orders.extensionReason,
      extensionDays: orders.extensionDays,
      extensionStatus: orders.extensionStatus,
      packageTier: packages.tier,
      packageTitle: packages.title,
      packageDeliveryDays: packages.deliveryDays,
      packageRevisionCount: packages.revisionCount,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(and(eq(orders.id, id), eq(orders.editorId, editorId)))
    .limit(1);

  if (!order) notFound();

  const [clientUser, orderDeliveries, orderRevisions, editorReview, existingBlock] = await Promise.all([
    db.select({ name: users.name }).from(users).where(eq(users.id, order.clientId)).limit(1).then((r) => r[0]),
    db.select().from(deliveries).where(eq(deliveries.orderId, id)).orderBy(asc(deliveries.versionNumber)),
    db.select().from(revisionRequests).where(eq(revisionRequests.orderId, id)).orderBy(asc(revisionRequests.createdAt)),
    db.select({ id: reviews.id }).from(reviews).where(and(eq(reviews.orderId, id), eq(reviews.reviewerId, session.user.userId!))).limit(1).then((r) => r[0] ?? null),
    db.select({ id: clientBlocks.id }).from(clientBlocks).where(and(eq(clientBlocks.editorId, editorId), eq(clientBlocks.clientId, order.clientId))).limit(1).then((r) => r[0] ?? null),
  ]);

  const clientName = displayNameFromFull(clientUser?.name);
  const processingFee = order.processingFee ?? 0;
  const rewardDiscount = order.rewardDiscountAmount ?? 0;
  const originalPrice = order.totalAmount - processingFee + rewardDiscount; // package price editor set
  const discountedPrice = order.totalAmount - processingFee;                 // after reward discount
  const payout = discountedPrice - order.commissionAmount;
  const canDeliver = ["pending", "in_progress", "revision_requested"].includes(order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-2">
        <Link href="/editor/orders" className="text-sm text-muted-foreground hover:text-foreground">
          ← Orders
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">{order.packageTitle ?? "Custom Quote Order"}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            from {clientName} · {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <OrderStatusBadge status={order.status as Parameters<typeof OrderStatusBadge>[0]["status"]} />
          {order.status === "completed" && (
            <BlockClientButton
              clientId={order.clientId}
              clientName={clientName}
              initiallyBlocked={!!existingBlock}
            />
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_280px] gap-8 items-start">
        <div className="space-y-6">
          {/* Client brief */}
          <section className="rounded-xl border border-border p-5">
            <h2 className="font-semibold mb-3">Client brief</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.brief}</p>
          </section>

          {/* Full event-by-event order timeline */}
          <OrderEventTimeline orderId={order.id} />

          {/* Deadline extension request */}
          {order.status === "in_progress" && (
            <ExtensionPanel
              orderId={order.id}
              viewerRole="editor"
              extensionRequestedAt={order.extensionRequestedAt}
              extensionReason={order.extensionReason}
              extensionDays={order.extensionDays}
              extensionStatus={order.extensionStatus}
            />
          )}

          {/* Revision requests */}
          {orderRevisions.length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-semibold mb-3 text-amber-800">Revision requests</h2>
              <div className="space-y-4">
                {orderRevisions.map((r, i) => (
                  <div key={r.id} className="flex gap-3">
                    <RotateCcw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-amber-700 mb-1">
                        Revision #{i + 1} · {formatDate(r.createdAt)}
                      </p>
                      <p className="text-sm text-amber-900">{r.feedbackText}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Previous deliveries */}
          {orderDeliveries.length > 0 && (
            <section className="rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Delivery history</h2>
                <DownloadAllButton orderId={order.id} label="Download all your deliveries" />
              </div>
              <div className="space-y-2">
                {orderDeliveries.map((d) => (
                  <div key={d.id} className="space-y-3">
                    <div className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium">{d.fileName}</p>
                        <p className="text-xs text-muted-foreground">v{d.versionNumber} · {formatDateTime(d.createdAt)}</p>
                      </div>
                      <a
                        href={getPublicUrl(d.fileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1")}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <DeliveryComments deliveryId={d.id} currentUserId={session.user.userId!} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Delivery upload */}
          {canDeliver && (
            <DeliveryForm
              orderId={order.id}
              versionNumber={orderDeliveries.length + 1}
            />
          )}

          {/* Private notes about this client */}
          <ClientNotes clientId={order.clientId} />

          {/* Editor review of client — only after completion */}
          {order.status === "completed" && !editorReview && (
            <EditorReviewForm orderId={order.id} clientName={clientName} />
          )}
          {order.status === "completed" && editorReview && (
            <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
              You have already reviewed this client.
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="rounded-xl border border-border p-5 space-y-4 sticky top-24 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Package</p>
            <p className="font-medium">{order.packageTitle}</p>
          </div>
          <div className="space-y-2 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              {order.deadline ? `Due ${formatDate(order.deadline)}` : `${order.packageDeliveryDays}d delivery`}
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-3.5 h-3.5" />
              {order.packageRevisionCount === -1 ? "Unlimited" : order.packageRevisionCount} revision{order.packageRevisionCount !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="border-t border-border pt-3 space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Package price</span>
              <span>{formatCurrency(originalPrice)}</span>
            </div>
            {rewardDiscount > 0 && (
              <div className="flex justify-between text-amber-600 text-xs">
                <span>Client reward discount</span>
                <span>−{formatCurrency(rewardDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Platform fee (15%)</span>
              <span>−{formatCurrency(order.commissionAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-[#0EA5E9] pt-1 border-t border-border">
              <span>Your payout</span>
              <span>{formatCurrency(payout)}</span>
            </div>
          </div>
          <Link
            href={`/editor/messages/${order.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full justify-center")}
          >
            Message client
          </Link>
          {order.status === "completed" && (
            <a
              href={`/api/orders/${order.id}/invoice`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full justify-center gap-1.5 text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100")}
            >
              <FileText className="w-3.5 h-3.5" /> Download Invoice
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
