import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  orders,
  packages,
  editors,
  users,
  deliveries,
  revisionRequests,
  reviews,
  disputes,
} from "@/lib/db/schema";
import { and, eq, asc, sql } from "drizzle-orm";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderActions } from "./order-actions";
import { ReviewForm } from "./review-form";
import { DisputeForm } from "./dispute-form";
import { formatCurrency, formatDate, formatDateTime, displayNameFromFull } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Download,
  Clock,
  RotateCcw,
  FileText,
  RefreshCw,
  ExternalLink,
  Music,
  Palette,
  Film,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
import { getPublicUrl } from "@/lib/r2";
import Link from "next/link";
import { OrderTimeline } from "@/components/client/order-timeline";
import { OrderEventTimeline } from "@/components/order/order-event-timeline";
import { DeliveryComments } from "@/components/orders/delivery-comments";
import { DeadlineCountdown } from "@/components/orders/deadline-countdown";
import { ExtensionPanel } from "@/components/orders/extension-panel";
import { DownloadAllButton } from "@/components/orders/download-all-button";
import { OrderReferences } from "@/components/client/order-references";

type BriefData = {
  mood?: string[];
  musicPreference?: string;
  colorLook?: string;
  referenceUrls?: string[];
  mustInclude?: string;
  mustAvoid?: string;
  additionalNotes?: string;
  customAddons?: {
    extraFast?: boolean;
    extraRevision?: boolean;
    sourceFiles?: boolean;
    commercialRights?: boolean;
  };
};

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
    .where(
      and(eq(orders.id, id), eq(orders.clientId, session.user.userId!))
    )
    .limit(1);

  if (!order) notFound();

  const [editorUser, orderDeliveries, orderRevisions, clientReview, openDispute] =
    await Promise.all([
      db
        .select({ name: users.name, image: users.image })
        .from(users)
        .where(eq(users.id, order.editorUserId))
        .limit(1)
        .then((r) => r[0]),
      db
        .select()
        .from(deliveries)
        .where(eq(deliveries.orderId, id))
        .orderBy(asc(deliveries.versionNumber)),
      db
        .select()
        .from(revisionRequests)
        .where(eq(revisionRequests.orderId, id))
        .orderBy(asc(revisionRequests.createdAt)),
      db
        .select({ id: reviews.id })
        .from(reviews)
        .where(
          and(eq(reviews.orderId, id), eq(reviews.reviewerId, session.user.userId!))
        )
        .limit(1)
        .then((r) => r[0] ?? null),
      db
        .select({ id: disputes.id })
        .from(disputes)
        .where(and(eq(disputes.orderId, id), sql`${disputes.status} = 'open'`))
        .limit(1)
        .then((r) => r[0] ?? null),
    ]);

  const editorName = displayNameFromFull(editorUser?.name);
  const latestDelivery = orderDeliveries[orderDeliveries.length - 1];
  const bd = (order.briefData as BriefData | null) ?? {};
  if (bd?.customAddons?.extraRevision && order.packageRevisionCount !== null && order.packageRevisionCount !== -1) {
    order.packageRevisionCount += 1;
  }
  const editorInitials = (editorUser?.name ?? "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/client/orders"
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Orders
            </Link>
            <span className="text-gray-200">/</span>
            <span className="text-sm text-gray-700 font-medium truncate max-w-[180px] md:max-w-xs">
              {order.packageTitle}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/client/orders/${order.id}/invoice`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> Invoice
            </Link>
            {order.status === "completed" && (
              <a
                href={`/api/orders/${order.id}/invoice`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50 text-xs font-medium text-sky-700 hover:bg-sky-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </a>
            )}
            <Link
              href={`/reorder/${order.id}`}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-order
            </Link>
            <OrderStatusBadge
              status={order.status as Parameters<typeof OrderStatusBadge>[0]["status"]}
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page heading */}
        <div className="flex items-start gap-4 mb-7">
          <div className="w-12 h-12 rounded-2xl bg-[#0EA5E9]/10 flex items-center justify-center text-sm font-bold text-[#0EA5E9] select-none shrink-0">
            {editorInitials || "?"}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{order.packageTitle}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              with {editorName} · placed {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_300px] gap-8 items-start">
          {/* Left column */}
          <div className="space-y-5">
            {/* Project brief */}
            <section className="rounded-xl border border-border bg-white p-5 space-y-4">
              <h2 className="font-semibold text-gray-900">Project brief</h2>

              {order.brief && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {order.brief}
                </p>
              )}

              {/* Structured brief data */}
              {(bd.mood?.length ||
                bd.musicPreference ||
                bd.colorLook ||
                bd.mustInclude ||
                bd.mustAvoid ||
                bd.additionalNotes ||
                bd.referenceUrls?.length) ? (
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  {bd.mood && bd.mood.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Film className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Vibe &amp; Style
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {bd.mood.map((m: string) => (
                          <span
                            key={m}
                            className="text-xs px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100 font-medium capitalize"
                          >
                            {m.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(bd.musicPreference || bd.colorLook) && (
                    <div className="grid grid-cols-2 gap-4">
                      {bd.musicPreference && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Music className="w-3 h-3 text-gray-400" />
                            <p className="text-xs text-gray-400">Music</p>
                          </div>
                          <p className="text-sm font-medium text-gray-800 capitalize">
                            {bd.musicPreference.replace(/_/g, " ")}
                          </p>
                        </div>
                      )}
                      {bd.colorLook && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Palette className="w-3 h-3 text-gray-400" />
                            <p className="text-xs text-gray-400">Color grading</p>
                          </div>
                          <p className="text-sm font-medium text-gray-800 capitalize">
                            {bd.colorLook.replace(/_/g, " ")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {bd.mustInclude && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Must include</p>
                      <p className="text-sm text-gray-800">{bd.mustInclude}</p>
                    </div>
                  )}

                  {bd.mustAvoid && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Must avoid</p>
                      <p className="text-sm text-gray-800">{bd.mustAvoid}</p>
                    </div>
                  )}

                  {bd.additionalNotes && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Additional notes</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{bd.additionalNotes}</p>
                    </div>
                  )}

                  {bd.referenceUrls && bd.referenceUrls.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">References</p>
                      <div className="space-y-1.5">
                        {bd.referenceUrls.map((url: string, i: number) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-[#0EA5E9] hover:text-sky-700 hover:underline truncate transition-colors"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            {url}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </section>

            {/* Inspiration & References (mood board) */}
            <OrderReferences
              orderId={order.id}
              initial={
                ((order.briefData as Record<string, unknown> | null)
                  ?.references as {
                  url: string;
                  note: string;
                  addedAt: string;
                }[]) ?? []
              }
              readonly={["completed", "cancelled", "disputed"].includes(
                order.status
              )}
            />

            {/* Event timeline */}
            <OrderEventTimeline orderId={order.id} />

            {/* Deliveries */}
            {orderDeliveries.length > 0 && (
              <section className="rounded-xl border border-border bg-white p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Deliveries</h2>
                  <DownloadAllButton orderId={order.id} />
                </div>
                {orderDeliveries.map((d) => {
                  const publicUrl = getPublicUrl(d.fileUrl);
                  const isVideo =
                    /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(d.fileUrl);
                  return (
                    <div key={d.id} className="space-y-3">
                      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                        <div className="min-w-0 mr-3">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {d.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            v{d.versionNumber} · {formatDateTime(d.createdAt)}
                          </p>
                        </div>
                        <a
                          href={publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            buttonVariants({ size: "sm", variant: "outline" }),
                            "gap-1.5 shrink-0"
                          )}
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </a>
                      </div>
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
                      <DeliveryComments
                        deliveryId={d.id}
                        currentUserId={order.clientId}
                      />
                    </div>
                  );
                })}
              </section>
            )}

            {/* Extension request panel */}
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
              <section className="rounded-xl border border-border bg-white p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Revision requests</h2>
                <div className="space-y-4">
                  {orderRevisions.map((r, i) => (
                    <div key={r.id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Revision #{i + 1} · {formatDate(r.createdAt)}
                        </p>
                        <p className="text-sm text-gray-800">{r.feedbackText}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Auto-approval countdown */}
            {order.status === "delivered" &&
              order.deliveredAt &&
              (() => {
                const autoApproveAt = new Date(
                  order.deliveredAt.getTime() + 7 * 24 * 60 * 60 * 1000
                );
                const msLeft = autoApproveAt.getTime() - Date.now();
                const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
                return (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        Auto-approval in{" "}
                        {daysLeft > 0
                          ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`
                          : "less than a day"}
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        If you don&apos;t approve or request a revision, this delivery
                        will be automatically approved on {formatDate(autoApproveAt)}.
                      </p>
                    </div>
                  </div>
                );
              })()}

            {/* Order actions */}
            <OrderActions
              orderId={order.id}
              status={order.status}
              latestDeliveryId={latestDelivery?.id}
              revisionsUsed={orderRevisions.length}
              revisionLimit={order.packageRevisionCount ?? -1}
              revisionExtensionDays={order.packageRevisionExtensionDays ?? 2}
            />

            {/* Review */}
            {order.status === "completed" && !clientReview && (
              <ReviewForm orderId={order.id} editorName={editorName} />
            )}
            {order.status === "completed" && clientReview && (
              <div className="rounded-xl border border-border bg-white p-4 text-sm text-muted-foreground">
                You&apos;ve already submitted a review for this order.
              </div>
            )}

            {/* Dispute */}
            {["in_progress", "delivered", "revision_requested"].includes(
              order.status
            ) && !openDispute && (
              <DisputeForm orderId={order.id} />
            )}
            {openDispute && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <span>A dispute is open for this order.</span>
                <Link
                  href={`/client/disputes/${openDispute.id}`}
                  className="underline underline-offset-2 font-medium"
                >
                  View dispute
                </Link>
              </div>
            )}
          </div>

          {/* Right column — sticky sidebar */}
          <div className="space-y-4">
            <OrderTimeline
              status={
                order.status as Parameters<typeof OrderTimeline>[0]["status"]
              }
              timestamps={{
                placed: order.createdAt,
                accepted: order.acceptedAt ?? undefined,
                delivered: order.deliveredAt ?? undefined,
                completed: order.completedAt ?? undefined,
              }}
              approvedExtensionDays={
                order.extensionStatus === "approved" ? order.extensionDays : null
              }
            />

            <div className="rounded-xl border border-border bg-white p-5 space-y-4 sticky top-24 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Package</p>
                <p className="font-semibold text-gray-900">{order.packageTitle}</p>
              </div>

              <div className="space-y-2.5 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  {order.deadline ? (
                    !["completed", "cancelled", "disputed"].includes(order.status) ? (
                      <DeadlineCountdown deadline={order.deadline.toISOString()} />
                    ) : (
                      `Due ${formatDate(order.deadline)}`
                    )
                  ) : (
                    `${order.packageDeliveryDays}d delivery`
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  {order.packageRevisionCount === -1
                    ? "Unlimited"
                    : order.packageRevisionCount}{" "}
                  revision
                  {order.packageRevisionCount !== 1 ? "s" : ""}
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total paid</span>
                  <span className="font-bold text-gray-900 tabular-nums">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>

              <Link
                href={`/messages/${order.id}`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "w-full justify-center gap-2"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" /> Message editor
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
