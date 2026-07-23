import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const ALLOWED = ["admin", "staff_support", "staff_dispute"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const { action, newDeadline, note } = await req.json();

  const [order] = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  if (action === "complete") {
    await db.update(orders).set({ status: "completed" }).where(eq(orders.id, id));
  } else if (action === "cancel") {
    await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, id));
  } else if (action === "extend_deadline" && newDeadline) {
    await db.update(orders).set({ deadline: new Date(newDeadline) }).where(eq(orders.id, id));
  } else {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  await db.insert(auditLogs).values({
    actorId: session.user.userId,
    actorRole: session.user.role,
    action: `order.${action}`,
    entityType: "order",
    entityId: id,
    metadata: { note: note ?? null, newDeadline: newDeadline ?? null, prevStatus: order.status },
  });

  return NextResponse.json({ ok: true });
}
