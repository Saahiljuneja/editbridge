import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, editors, notifications } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  note: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || session.user.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { note } = parsed.data;

  const [order] = await db
    .select({ id: orders.id, status: orders.status, editorId: orders.editorId, clientId: orders.clientId })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending") {
    return NextResponse.json({ error: "Only pending orders can be accepted" }, { status: 409 });
  }

  const [editorRow] = await db
    .select({ id: editors.id })
    .from(editors)
    .where(and(eq(editors.id, order.editorId), eq(editors.userId, session.user.userId!)))
    .limit(1);

  if (!editorRow) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const acceptedAt = new Date();
  await db
    .update(orders)
    .set({ status: "in_progress", acceptedAt, editorAcceptanceNote: note ?? null, updatedAt: acceptedAt })
    .where(eq(orders.id, id));

  await db.insert(notifications).values({
    userId: order.clientId,
    type: "order_accepted",
    title: "Editor accepted your order",
    body: note ?? "Your editor has accepted the order and started working on it.",
    link: `/orders/${id}`,
  });

  return NextResponse.json({ ok: true, acceptedAt });
}
