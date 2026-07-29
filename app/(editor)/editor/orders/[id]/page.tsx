import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, users, deliveries, revisionRequests, reviews, clientBlocks } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { DeliveryForm } from "./delivery-form";
import { EditorReviewForm } from "./review-form";
import { formatCurrency, formatDate, formatDateTime, displayNameFromFull } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Clock,
  RotateCcw,
  Download,
  FileText,
  MessageSquare,
  Film,
  Music,
  Palette,
  ExternalLink,
  CheckCircle2,
  Loader,
  XCircle,
  AlertTriangle,
  Banknote,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getPublicUrl } from "@/lib/r2";
import Link from "next/link";
import { ClientNotes } from "@/components/editor/client-notes";
import { OrderEventTimeline } from "@/components/order/order-event-timeline";
import { BlockClientButton } from "./block-client-button";
import { AcceptOrderButton } from "./accept-order-button";
import { ExtensionPanel } from "@/components/orders/extension-panel";
import { DownloadAllButton } from "@/components/orders/download-all-button";
import { DeliveryComments } from "@/components/orders/delivery-comments";

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

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  pending:            { label: "Pending",     badge: "bg-amber-50 text-amber-700 border border-amber-200",     icon: Clock },
  in_progress:        { label: "In Progress", badge: "bg-sky-50 text-sky-700 border border-sky-200",           icon: Loader },
  revision_requested: { label: "Revision",    badge: "bg-orange-50 text-orange-700 border border-orange-200",  icon: RotateCcw },
  delivered:          { label: "Delivered",   badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",icon: CheckCircle2 },
  completed:          { label: "Completed",   badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",icon: CheckCircle2 },
  cancelled:          { label: "Cancelled",   badge: "bg-gray-50 text-gray-500 border border-gray-200",         icon: XCircle },
  disputed:           { label: "Disputed",    badge: "bg-red-50 text-red-600 border border-red-200",            icon: AlertTriangle },
};

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
      briefData: orders.briefData,
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
  const clientInitials = (clientUser?.name ?? "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const processingFee = order.processingFee ?? 0;
  const rewardDiscount = order.rewardDiscountAmount ?? 0;
  const originalPrice = order.totalAmount - processingFee + rewardDiscount;
  const discountedPrice = order.totalAmount - processingFee;
  const payout = discountedPrice - order.commissionAmount;
  const canDeliver = ["pending", "in_progress", "revision_requested"].includes(order.status);

  const briefData = (order.briefData as BriefData | null) ?? {};
  if (briefData?.customAddons?.extraRevision && order.packageRevisionCount !== null && order.packageRevisionCount !== -1) {
    order.packageRevisionCount += 1;
  }

  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link
            href="/editor/orders"
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">
              {order.packageTitle ?? "Custom Quote Order"}
            </h1>
            <p className="text-xs text-gray-400">
              from {clientName} · {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full", cfg.badge)}>
              <StatusIcon className="w-3 h-3" />
              {cfg.label}
            </span>
            {order.status === "completed" && (
              <BlockClientButton
                clientId={order.clientId}
                clientName={clientName}
                initiallyBlocked={!!existingBlock}
              />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Client card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0EA5E9]/10 flex items-center justify-center text-base font-bold text-[#0EA5E9] uppercase select-none shrink-0">
            {clientInitials || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">{clientName}</p>
            <p className="text-sm text-gray-400">Client</p>
          </div>
          <Link
            href={`/editor/messages/${order.id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Message
          </Link>
        </div>

        <div className="grid md:grid-cols-[1fr_280px] gap-6 items-start">
          {/* Main content */}
          <div className="space-y-5">
            {/* Client brief */}
            <section className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-[#0EA5E9]" />
                </div>
                <h2 className="font-semibold text-gray-900">Client brief</h2>
              </div>
              <div className="px-5 py-4 space-y-4">
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {order.brief}
                </p>

                {/* Structured brief data */}
                {briefData && (
                  <div className="border-t border-gray-50 pt-4 space-y-3">
                    {briefData.mood && briefData.mood.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Film className="w-3.5 h-3.5 text-gray-400" />
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mood / Vibe</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {briefData.mood.map((m: string) => (
                            <span key={m} className="text-xs font-medium px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(briefData.musicPreference || briefData.colorLook) && (
                      <div className="grid grid-cols-2 gap-3">
                        {briefData.musicPreference && (
                          <div className="rounded-lg bg-gray-50 px-3 py-2.5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Music className="w-3 h-3 text-gray-400" />
                              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Music</p>
                            </div>
                            <p className="text-sm text-gray-700">{briefData.musicPreference}</p>
                          </div>
                        )}
                        {briefData.colorLook && (
                          <div className="rounded-lg bg-gray-50 px-3 py-2.5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Palette className="w-3 h-3 text-gray-400" />
                              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Color / Look</p>
                            </div>
                            <p className="text-sm text-gray-700">{briefData.colorLook}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {briefData.mustInclude && (
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
                        <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-1">Must include</p>
                        <p className="text-sm text-emerald-900">{briefData.mustInclude}</p>
                      </div>
                    )}
                    {briefData.mustAvoid && (
                      <div className="rounded-lg border border-red-100 bg-red-50/60 px-3 py-2.5">
                        <p className="text-[10px] font-semibold text-red-700 uppercase tracking-wider mb-1">Must avoid</p>
                        <p className="text-sm text-red-900">{briefData.mustAvoid}</p>
                      </div>
                    )}
                    {briefData.referenceUrls && briefData.referenceUrls.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Reference videos</p>
                        <div className="space-y-1.5">
                          {briefData.referenceUrls.map((url: string, i: number) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-[#0EA5E9] hover:underline truncate"
                            >
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{url}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Timeline */}
            <OrderEventTimeline orderId={order.id} />

            {/* Extension request */}
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
              <section className="rounded-xl border border-amber-200 bg-amber-50/60 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-4 h-4 text-amber-700" />
                  </div>
                  <h2 className="font-semibold text-amber-900">
                    Revision requests
                    <span className="ml-2 text-xs font-medium text-amber-600">({orderRevisions.length})</span>
                  </h2>
                </div>
                <div className="px-5 py-4 space-y-4">
                  {orderRevisions.map((r, i) => (
                    <div key={r.id} className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center text-[10px] font-bold text-amber-800 shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-xs text-amber-600 mb-1">{formatDate(r.createdAt)}</p>
                        <p className="text-sm text-amber-900">{r.feedbackText}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Delivery history */}
            {orderDeliveries.length > 0 && (
              <section className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h2 className="font-semibold text-gray-900">Delivery history</h2>
                  </div>
                  <DownloadAllButton orderId={order.id} label="Download all" />
                </div>
                <div className="px-5 py-4 space-y-3">
                  {orderDeliveries.map((d) => (
                    <div key={d.id} className="space-y-2">
                      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{d.fileName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            v{d.versionNumber} · {formatDateTime(d.createdAt)}
                          </p>
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

            {/* Private notes */}
            <ClientNotes clientId={order.clientId} />

            {/* Review */}
            {order.status === "completed" && !editorReview && (
              <EditorReviewForm orderId={order.id} clientName={clientName} />
            )}
            {order.status === "completed" && editorReview && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                You have already reviewed this client.
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="sticky top-6 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 border-t-2 border-t-[#0EA5E9] shadow-sm p-5 space-y-4">
              {/* Package */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Package</p>
                <p className="font-semibold text-gray-900">{order.packageTitle ?? "Custom Quote"}</p>
              </div>

              {/* Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  {order.deadline
                    ? `Due ${formatDate(order.deadline)}`
                    : `${order.packageDeliveryDays}d delivery`}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  {order.packageRevisionCount === -1 ? "Unlimited" : order.packageRevisionCount}{" "}
                  revision{order.packageRevisionCount !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Pricing */}
              <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Package price</span>
                  <span className="tabular-nums">{formatCurrency(originalPrice)}</span>
                </div>
                {rewardDiscount > 0 && (
                  <div className="flex justify-between text-amber-600 text-xs">
                    <span>Client reward discount</span>
                    <span className="tabular-nums">−{formatCurrency(rewardDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>Platform fee</span>
                  <span className="tabular-nums">−{formatCurrency(order.commissionAmount)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-[#0EA5E9]">
                    <Banknote className="w-4 h-4" />
                    Your payout
                  </div>
                  <span className="text-base font-bold text-[#0EA5E9] tabular-nums">
                    {formatCurrency(payout)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2.5 border-t border-gray-100 pt-4">
                {order.status === "pending" && <AcceptOrderButton orderId={order.id} />}

                {order.status === "completed" && (
                  <a
                    href={`/api/orders/${order.id}/invoice`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-sky-700 border border-sky-200 bg-sky-50 hover:bg-sky-100 transition-colors"
                  >
                    <FileText className="w-4 h-4" /> Download Invoice
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
