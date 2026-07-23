import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, editors, deliveries, users, packages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notifyOrderDelivered, createInAppNotification } from "@/lib/notifications";
import { createOrderEvent } from "@/lib/order-events";
import { z } from "zod";

const deliverSchema = z.object({
  fileUrl: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user?.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [editor] = await db
    .select({ id: editors.id })
    .from(editors)
    .where(eq(editors.userId, session.user.userId!))
    .limit(1);

  if (!editor) return NextResponse.json({ error: "Editor not found" }, { status: 404 });

  const [order] = await db
    .select({
      id: orders.id,
      editorId: orders.editorId,
      clientId: orders.clientId,
      packageId: orders.packageId,
      status: orders.status,
    })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.editorId !== editor.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const allowed = ["pending", "in_progress", "revision_requested"];
  if (!allowed.includes(order.status)) {
    return NextResponse.json({ error: `Cannot deliver from status: ${order.status}` }, { status: 409 });
  }

  const body = await request.json();
  const parsed = deliverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db
    .select({ versionNumber: deliveries.versionNumber })
    .from(deliveries)
    .where(eq(deliveries.orderId, id));
  const nextVersion = existing.length + 1;

  const [delivery] = await db
    .insert(deliveries)
    .values({
      orderId: id,
      versionNumber: nextVersion,
      fileUrl: parsed.data.fileUrl,
      fileName: parsed.data.fileName,
      fileSize: parsed.data.fileSize,
      uploadedBy: session.user.userId!,
    })
    .returning();

  await db
    .update(orders)
    .set({ status: "delivered", deliveredAt: new Date(), updatedAt: new Date() })
    .where(eq(orders.id, id));

  createOrderEvent(id, session.user.userId!, "delivery_uploaded", { versionNumber: nextVersion, fileName: parsed.data.fileName });

  // Fire-and-forget notification to client
  const [clientUser, pkg] = await Promise.all([
    db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, order.clientId)).limit(1).then((r) => r[0]),
    order.packageId ? db.select({ title: packages.title }).from(packages).where(eq(packages.id, order.packageId)).limit(1).then((r) => r[0]) : Promise.resolve({ title: "Custom order" }),
  ]);

  if (clientUser && pkg) {
    notifyOrderDelivered({
      clientEmail: clientUser.email,
      clientName: clientUser.name ?? "",
      editorName: session.user.name ?? "",
      packageTitle: pkg.title,
      versionNumber: nextVersion,
      fileName: parsed.data.fileName,
      orderId: id,
    });
    createInAppNotification({
      userId: order.clientId,
      type: "delivery_received",
      title: `Your delivery is ready`,
      body: `${session.user.name ?? "Your editor"} delivered v${nextVersion} of ${pkg.title}.`,
      link: `/client/orders/${id}`,
    });
  }

  return NextResponse.json(delivery, { status: 201 });
}
