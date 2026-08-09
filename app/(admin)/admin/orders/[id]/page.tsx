export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, users, editors, deliveries, revisionRequests, disputes } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { formatCurrency, formatDate, formatDateTime, displayNameFromFull } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Badge } from "@/components/ui/badge";
import { getPublicUrl } from "@/lib/r2";
import { buttonVariants } from "@/components/ui/button";
import { Download } from "lucide-react";
import Link from "next/link";
import { OrderInterveneForm } from "./order-intervene-form";
import { OrderEventTimeline } from "@/components/order/order-event-timeline";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin", "staff_support", "staff_dispute"];

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) redirect("/admin/dashboard");

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
      razorpayOrderId: orders.razorpayOrderId,
      razorpayPaymentId: orders.razorpayPaymentId,
      clientId: orders.clientId,
      editorId: orders.editorId,
      packageTitle: packages.title,
      packageTier: packages.tier,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) notFound();

  const [editorRow] = await db
    .select({ userId: editors.userId })
    .from(editors)
    .where(eq(editors.id, order.editorId))
    .limit(1);

  const [[clientUser], [editorUser], orderDeliveries, orderRevisions, [openDispute]] = await Promise.all([
    db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, order.clientId)).limit(1),
    editorRow ? db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, editorRow.userId)).limit(1) : Promise.resolve([undefined]),
    db.select().from(deliveries).where(eq(deliveries.orderId, id)).orderBy(asc(deliveries.versionNumber)),
    db.select().from(revisionRequests).where(eq(revisionRequests.orderId, id)).orderBy(asc(revisionRequests.createdAt)),
    db.select({ id: disputes.id }).from(disputes).where(eq(disputes.orderId, id)).limit(1),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-4">
        <Link href="/admin/orders" className="text-sm text-muted-foreground hover:text-foreground">
          ← Orders
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 mb-8">
        <PageHeader title={order.packageTitle ?? "Custom Order"} subtitle={`Order · ${formatDate(order.createdAt)}`} />
        <OrderStatusBadge status={order.status as Parameters<typeof OrderStatusBadge>[0]["status"]} />
      </div>

      <div className="grid md:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-5">
          {/* Brief */}
          <section className="rounded-xl border border-border bg-white p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Brief</p>
            <p className="text-sm whitespace-pre-wrap">{order.brief}</p>
          </section>

          {/* Full event-by-event order timeline, including internal-only events */}
          <OrderEventTimeline orderId={order.id} />

          {/* Deliveries */}
          {orderDeliveries.length > 0 && (
            <section className="rounded-xl border border-border bg-white p-5">
              <p className="font-semibold text-sm mb-3">Deliveries ({orderDeliveries.length})</p>
              <div className="space-y-2">
                {orderDeliveries.map((d) => (
                  <div key={d.id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{d.fileName}</p>
                      <p className="text-xs text-muted-foreground">v{d.versionNumber} · {formatDateTime(d.createdAt)}</p>
                    </div>
                    <a href={getPublicUrl(d.fileUrl)} target="_blank" rel="noopener noreferrer"
                      className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1")}>
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Revisions */}
          {orderRevisions.length > 0 && (
            <section className="rounded-xl border border-border bg-white p-5">
              <p className="font-semibold text-sm mb-3">Revision requests ({orderRevisions.length})</p>
              <div className="space-y-3">
                {orderRevisions.map((r, i) => (
                  <div key={r.id} className="text-sm">
                    <p className="text-xs text-muted-foreground mb-1">#{i + 1} · {formatDate(r.createdAt)}</p>
                    <p>{r.feedbackText}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Intervention */}
          <OrderInterveneForm orderId={id} currentStatus={order.status} />

          {/* Dispute link */}
          {openDispute && (
            <Link href={`/admin/disputes/${openDispute.id}`}
              className="block rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 hover:bg-red-100 transition-colors">
              ⚠ This order has an open dispute — click to review
            </Link>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-border bg-white p-5 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Client</p>
              <p className="font-medium">{clientUser?.name ?? "Unknown"}</p>
              <p className="text-muted-foreground text-xs">{clientUser?.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Editor</p>
              <p className="font-medium">{editorUser?.name ?? "Unknown"}</p>
              <p className="text-muted-foreground text-xs">{editorUser?.email}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white p-5 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Commission</span>
              <span>{formatCurrency(order.commissionAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Editor earns</span>
              <span className="text-[var(--brand-teal)] font-semibold">{formatCurrency(order.totalAmount - order.commissionAmount)}</span>
            </div>
            {order.deadline && (
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-muted-foreground">Deadline</span>
                <span>{formatDate(order.deadline)}</span>
              </div>
            )}
          </div>

          {order.razorpayPaymentId && (
            <div className="rounded-xl border border-border bg-white p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Razorpay</p>
              <p className="text-xs font-mono break-all">{order.razorpayPaymentId}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
