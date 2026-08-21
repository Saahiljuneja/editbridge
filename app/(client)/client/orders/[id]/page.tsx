export const dynamic = "force-dynamic";

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
  messages,
} from "@/lib/db/schema";
import { and, eq, asc, sql } from "drizzle-orm";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderActions } from "./order-actions";
import { ReviewForm } from "./review-form";
import { DisputeForm } from "./dispute-form";
import { formatCurrency, formatDate, displayNameFromFull } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { TopoBackground } from "@/components/common/topo-background";
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
import { ChatWindow } from "@/components/chat/chat-window";
import { DeadlineCountdown } from "@/components/orders/deadline-countdown";
import { ExtensionPanel } from "@/components/orders/extension-panel";
import { DownloadAllButton } from "@/components/orders/download-all-button";
import { OrderReferences } from "@/components/client/order-references";
import { DeliveryVideoSection } from "@/components/orders/delivery-video-section";

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
      editorBio: editors.bio,
      editorTotalOrders: editors.totalOrders,
      editorCompletionRate: editors.completionRate,
      editorDisplayName: editors.displayName,
      processingFee: orders.processingFee,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .innerJoin(editors, eq(editors.id, orders.editorId))
    .where(
      and(eq(orders.id, id), eq(orders.clientId, session.user.userId!))
    )
    .limit(1);

  if (!order) notFound();

  const [editorUser, orderDeliveries, orderRevisions, clientReview, openDispute, orderMessages] =
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

      db
        .select()
        .from(messages)
        .where(and(eq(messages.orderId, id), eq(messages.isBlocked, false)))
        .orderBy(asc(messages.createdAt))
        .limit(100),
    ]);

  const editorName = displayNameFromFull(editorUser?.name);
  const latestDelivery = orderDeliveries[orderDeliveries.length - 1];
  const bd = (order.briefData as BriefData | null) ?? {};
  const processingFee = order.processingFee ?? 0;
  const packageAmount = order.totalAmount - processingFee;
  const subtotal = Math.round(packageAmount / 1.18);
  const gst = packageAmount - subtotal;
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
    <div className="relative min-h-screen bg-[#ffffff] pb-12 overflow-hidden">
      {/* Topographic backdrop */}
      <TopoBackground background="#ffffff" strokeColor="#f3f4f6" opacity={0.6} />

      <div className="max-w-4xl mx-auto px-6 pt-6 space-y-6 relative z-10">
        {/* Top bar Card */}
        <div className="bg-[#ffffff] rounded-3xl border border-neutral-200/50 p-4 flex items-center justify-between shadow-sm relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/client/orders"
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-900 font-bold uppercase tracking-wider shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Orders
            </Link>
            <span className="text-neutral-200 select-none">/</span>
            <span className="text-xs text-neutral-700 font-extrabold truncate max-w-[180px] md:max-w-xs uppercase tracking-wider">
              {order.packageTitle}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/client/orders/${order.id}/invoice`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 bg-[#ffffff] hover:bg-neutral-50 transition-colors shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-neutral-400" /> Invoice
            </Link>
            {order.status === "completed" && (
              <a
                href={`/api/orders/${order.id}/invoice`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-100 bg-blue-50 text-xs font-bold text-blue-900 hover:bg-blue-100 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </a>
            )}
            <Link
              href={`/reorder/${order.id}`}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 bg-[#ffffff] hover:bg-neutral-50 transition-colors shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 text-neutral-400" /> Re-order
            </Link>
            <OrderStatusBadge
              status={order.status as Parameters<typeof OrderStatusBadge>[0]["status"]}
            />
          </div>
        </div>

        {/* Page heading */}
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-xl bg-neutral-100 border border-neutral-200/30 flex items-center justify-center text-sm font-bold text-neutral-400 select-none shrink-0 uppercase">
            {editorInitials || "?"}
          </div>
          <div>
            <h1 className="text-xl font-black text-neutral-900 tracking-tight leading-none">{order.packageTitle}</h1>
            <p className="text-xs text-neutral-400 font-semibold mt-1.5">
              with {editorName} · placed {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        {/* ── Pending: awaiting editor acceptance ───────────────────────── */}
        {order.status === "pending" && (() => {
          const acceptanceDeadline = new Date(
            order.createdAt.getTime() + 24 * 60 * 60 * 1000
          );
          return (
            <div className="rounded-3xl border border-sky-200 bg-sky-50/60 p-5 space-y-4 shadow-sm">
              {/* Header row */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#0EA5E9]/10 border border-[#0EA5E9]/20 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-[#0EA5E9]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-sky-900 text-sm tracking-tight">
                    Waiting for editor acceptance
                  </p>
                  <p className="text-xs text-sky-700 mt-1 leading-relaxed">
                    {editorName} has up to 24 hours to accept your order. If
                    they don&apos;t respond, your order will be automatically
                    cancelled and a full refund will be initiated.
                  </p>
                </div>
              </div>

              {/* Countdown pill */}
              <div className="flex items-center justify-between rounded-2xl border border-sky-200 bg-white px-4 py-3">
                <span className="text-[10px] font-extrabold text-sky-400 uppercase tracking-wider">
                  Response window
                </span>
                <DeadlineCountdown deadline={acceptanceDeadline.toISOString()} />
              </div>

              {/* Payment safety note */}
              <div className="flex items-center gap-2.5 px-1">
                <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-xs text-neutral-500">
                  Your payment is held securely and will only be released once
                  you approve the final delivery.
                </p>
              </div>
            </div>
          );
        })()}

        <div className="grid md:grid-cols-[1fr_300px] gap-6 items-start">
          {/* Left column */}
          <div className="space-y-6">
            {/* Project brief */}
            <section className="rounded-3xl border border-neutral-200/50 bg-[#ffffff] p-6 space-y-4 shadow-sm">
              <h2 className="font-extrabold text-neutral-900 text-xs uppercase tracking-wider mb-2">Project brief</h2>

              {order.brief && (
                <p className="text-sm text-neutral-500 whitespace-pre-wrap leading-relaxed">
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
                bd.referenceUrls?.length ||
                bd.customAddons?.extraFast ||
                bd.customAddons?.extraRevision ||
                bd.customAddons?.sourceFiles ||
                bd.customAddons?.commercialRights) ? (
                <div className="space-y-4 border-t border-neutral-100 pt-4">
                  {bd.mood && bd.mood.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2 select-none">
                        <Film className="w-3.5 h-3.5 text-neutral-400" />
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                          Vibe &amp; Style
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {bd.mood.map((m: string) => (
                          <span
                            key={m}
                            className="text-xs px-2.5 py-1 rounded-full bg-[#f3f4f6] text-neutral-600 border border-neutral-200/20 font-bold capitalize"
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
                          <div className="flex items-center gap-1.5 mb-1 select-none">
                            <Music className="w-3 h-3 text-neutral-400" />
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Music</p>
                          </div>
                          <p className="text-xs font-bold text-neutral-700 capitalize">
                            {bd.musicPreference.replace(/_/g, " ")}
                          </p>
                        </div>
                      )}
                      {bd.colorLook && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1 select-none">
                            <Palette className="w-3 h-3 text-neutral-400" />
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Color grading</p>
                          </div>
                          <p className="text-xs font-bold text-neutral-700 capitalize">
                            {bd.colorLook.replace(/_/g, " ")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {bd.mustInclude && (
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Must include</p>
                      <p className="text-xs font-bold text-neutral-700">{bd.mustInclude}</p>
                    </div>
                  )}

                  {bd.mustAvoid && (
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Must avoid</p>
                      <p className="text-xs font-bold text-neutral-700">{bd.mustAvoid}</p>
                    </div>
                  )}

                  {bd.additionalNotes && (
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Additional notes</p>
                      <p className="text-xs font-semibold text-neutral-500 whitespace-pre-wrap leading-relaxed">{bd.additionalNotes}</p>
                    </div>
                  )}

                  {bd.referenceUrls && bd.referenceUrls.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">References</p>
                      <div className="space-y-1.5">
                        {bd.referenceUrls.map((url: string, i: number) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 truncate transition-colors"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            {url}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {(bd.customAddons?.extraFast || bd.customAddons?.extraRevision || bd.customAddons?.sourceFiles || bd.customAddons?.commercialRights) && (
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Add-ons</p>
                      <div className="flex flex-wrap gap-1.5">
                        {bd.customAddons?.extraFast && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/50 font-bold">⚡ Extra fast</span>
                        )}
                        {bd.customAddons?.extraRevision && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/50 font-bold">+1 Revision</span>
                        )}
                        {bd.customAddons?.sourceFiles && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200/50 font-bold">Source files</span>
                        )}
                        {bd.customAddons?.commercialRights && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200/50 font-bold">Commercial rights</span>
                        )}
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
              <section className="rounded-3xl border border-neutral-200/50 bg-[#ffffff] p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <h2 className="font-extrabold text-neutral-900 text-xs uppercase tracking-wider">Deliveries</h2>
                  <DownloadAllButton orderId={order.id} />
                </div>
                {orderDeliveries.map((d) => (
                  <DeliveryVideoSection
                    key={d.id}
                    deliveryId={d.id}
                    fileName={d.fileName}
                    fileUrl={getPublicUrl(d.fileUrl)}
                    versionNumber={d.versionNumber}
                    createdAt={d.createdAt.toISOString()}
                    currentUserId={order.clientId}
                    isVideo={/\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(d.fileUrl)}
                  />
                ))}
              </section>
            )}

            {/* Extension request panel — only show pending requests (client approves/rejects) */}
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
              <section className="rounded-3xl border border-neutral-200/50 bg-[#ffffff] p-6 shadow-sm">
                <h2 className="font-extrabold text-neutral-900 text-xs uppercase tracking-wider mb-4">Revision requests</h2>
                <div className="space-y-4">
                  {orderRevisions.map((r, i) => (
                    <div key={r.id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-xl bg-neutral-100 border border-neutral-200/40 flex items-center justify-center shrink-0 mt-0.5">
                        <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-400 font-bold mb-1">
                          Revision #{i + 1} · {formatDate(r.createdAt)}
                        </p>
                        <p className="text-sm text-neutral-600 font-medium">{r.feedbackText}</p>
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
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-800 flex items-start gap-3">
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

            {/* Inline chat */}
            <section className="rounded-3xl border border-neutral-200/50 bg-[#ffffff] overflow-hidden shadow-sm">
              <div className="px-6 py-3.5 border-b border-neutral-100 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
                <h2 className="font-extrabold text-neutral-900 text-xs uppercase tracking-wider">Chat with editor</h2>
              </div>
              <ChatWindow
                orderId={order.id}
                currentUserId={order.clientId}
                initialMessages={orderMessages.map(m => ({ ...m, createdAt: m.createdAt.toISOString() }))}
                otherPartyName={editorName}
                containerClassName="h-[440px] rounded-none border-0 shadow-none"
              />
            </section>

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
              <div className="rounded-2xl border border-neutral-200/50 bg-[#ffffff] p-4 text-sm text-neutral-400 font-semibold shadow-sm">
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
              <div className="rounded-2xl border border-red-200 bg-red-50/50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <span>A dispute is open for this order.</span>
                <Link
                  href={`/client/disputes/${openDispute.id}`}
                  className="underline underline-offset-2 font-semibold"
                >
                  View dispute
                </Link>
              </div>
            )}
          </div>

          {/* Right column — sticky sidebar */}
          <div className="space-y-4">
            {/* Editor info */}
            <div className="rounded-3xl border border-neutral-200/50 bg-[#ffffff] p-5 space-y-3 shadow-sm">
              <p className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">Your editor</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200/30 flex items-center justify-center text-sm font-bold text-neutral-400 select-none overflow-hidden shrink-0">
                  {editorUser?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={editorUser.image} alt={editorName} className="w-full h-full object-cover" />
                  ) : (
                    editorInitials || "?"
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-neutral-900 text-sm truncate">{editorName}</p>
                  {order.editorTotalOrders > 0 && (
                    <p className="text-xs text-neutral-400">
                      {order.editorTotalOrders} order{order.editorTotalOrders !== 1 ? "s" : ""}
                      {order.editorCompletionRate != null ? ` · ${order.editorCompletionRate}% completion` : ""}
                    </p>
                  )}
                </div>
              </div>
              {order.editorBio && (
                <p className="text-xs text-neutral-500 leading-relaxed line-clamp-3">{order.editorBio}</p>
              )}
              <Link
                href={`/editor/${order.editorId}`}
                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                View profile <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

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

            <div className="rounded-3xl border border-neutral-200/50 bg-[#ffffff] p-5 space-y-4 sticky top-24 text-sm shadow-sm">
              <div>
                <p className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider mb-1">Package</p>
                <p className="font-bold text-neutral-900">{order.packageTitle}</p>
              </div>

              <div className="space-y-2.5 text-neutral-500">
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <Clock className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
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
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <RotateCcw className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                  {order.packageRevisionCount === -1
                    ? "Unlimited"
                    : order.packageRevisionCount}{" "}
                  revision
                  {order.packageRevisionCount !== 1 ? "s" : ""}
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>Package</span>
                  <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>GST (18%)</span>
                  <span className="tabular-nums">{formatCurrency(gst)}</span>
                </div>
                {processingFee > 0 && (
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Processing fee</span>
                    <span className="tabular-nums">{formatCurrency(processingFee)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1.5 border-t border-neutral-100">
                  <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Total paid</span>
                  <span className="font-black text-neutral-900 tabular-nums">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>

              <Link
                href={`/client/messages/${id}`}
                className="w-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Open full chat
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
