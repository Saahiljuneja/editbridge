import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, editors, users, deliveries, revisionRequests } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      updatedAt: orders.updatedAt,
      razorpayOrderId: orders.razorpayOrderId,
      razorpayPaymentId: orders.razorpayPaymentId,
      clientId: orders.clientId,
      editorUserId: editors.userId,
      editorId: editors.id,
      // package
      packageTier: packages.tier,
      packageTitle: packages.title,
      packagePrice: packages.price,
      packageDeliveryDays: packages.deliveryDays,
      packageRevisionCount: packages.revisionCount,
      // client user
      clientName: users.name,
      clientImage: users.image,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .innerJoin(editors, eq(editors.id, orders.editorId))
    .innerJoin(users, eq(users.id, orders.clientId))
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Role-based access
  const isClient = session.user.userId === order.clientId;
  const isEditor = session.user.userId === order.editorUserId;
  const isStaff = ["admin", "staff_support", "staff_dispute"].includes(session.user.role ?? "");
  if (!isClient && !isEditor && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch editor's display name
  const [editorUser] = await db
    .select({ name: users.name, image: users.image })
    .from(users)
    .where(eq(users.id, order.editorUserId))
    .limit(1);

  const [orderDeliveries, orderRevisions] = await Promise.all([
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
  ]);

  return NextResponse.json({
    ...order,
    editorName: editorUser?.name ?? null,
    editorImage: editorUser?.image ?? null,
    deliveries: orderDeliveries,
    revisions: orderRevisions,
    viewerRole: isClient ? "client" : isEditor ? "editor" : "staff",
  });
}
