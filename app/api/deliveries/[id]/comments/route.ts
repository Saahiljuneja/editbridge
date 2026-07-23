import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deliveryComments, deliveries, orders, editors, users } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { z } from "zod";

async function checkAccess(userId: string, role: string, deliveryId: string) {
  const [delivery] = await db
    .select({ orderId: deliveries.orderId })
    .from(deliveries)
    .where(eq(deliveries.id, deliveryId))
    .limit(1);
  if (!delivery) return null;

  const [order] = await db
    .select({ clientId: orders.clientId, editorId: orders.editorId })
    .from(orders)
    .where(eq(orders.id, delivery.orderId))
    .limit(1);
  if (!order) return null;

  const isStaff = ["admin", "staff_support", "staff_dispute"].includes(role);
  if (order.clientId === userId || isStaff) return order;

  // Check editor
  const [editor] = await db.select({ userId: editors.userId }).from(editors).where(eq(editors.id, order.editorId)).limit(1);
  if (editor?.userId === userId) return order;

  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: deliveryId } = await params;
  const order = await checkAccess(session.user.userId!, session.user.role ?? "", deliveryId);
  if (!order) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const comments = await db
    .select({
      id: deliveryComments.id,
      timestampSec: deliveryComments.timestampSec,
      comment: deliveryComments.comment,
      createdAt: deliveryComments.createdAt,
      userId: deliveryComments.userId,
      userName: users.name,
      userRole: users.role,
    })
    .from(deliveryComments)
    .innerJoin(users, eq(users.id, deliveryComments.userId))
    .where(eq(deliveryComments.deliveryId, deliveryId))
    .orderBy(asc(deliveryComments.timestampSec), asc(deliveryComments.createdAt));

  return NextResponse.json(comments);
}

const postSchema = z.object({
  comment: z.string().min(1).max(1000),
  timestampSec: z.number().int().min(0).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: deliveryId } = await params;
  const order = await checkAccess(session.user.userId!, session.user.role ?? "", deliveryId);
  if (!order) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = postSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const [comment] = await db
    .insert(deliveryComments)
    .values({
      deliveryId,
      userId: session.user.userId!,
      comment: body.data.comment,
      timestampSec: body.data.timestampSec ?? null,
    })
    .returning();

  return NextResponse.json(comment, { status: 201 });
}
