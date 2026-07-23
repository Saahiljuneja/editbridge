import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientBlocks, orders, users } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "editor" || !session.user.editorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      clientId: clientBlocks.clientId,
      reason: clientBlocks.reason,
      createdAt: clientBlocks.createdAt,
      clientName: users.name,
      clientEmail: users.email,
    })
    .from(clientBlocks)
    .innerJoin(users, eq(users.id, clientBlocks.clientId))
    .where(eq(clientBlocks.editorId, session.user.editorId))
    .orderBy(desc(clientBlocks.createdAt));

  return NextResponse.json({ blocks: rows });
}

const blockSchema = z.object({
  clientId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "editor" || !session.user.editorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = blockSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { clientId, reason } = parsed.data;
  const editorId = session.user.editorId;

  // Can only block a client you've actually completed an order with —
  // prevents blocking a stranger who never ordered.
  const [completedOrder] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.editorId, editorId), eq(orders.clientId, clientId), eq(orders.status, "completed")))
    .limit(1);

  if (!completedOrder) {
    return NextResponse.json(
      { error: "You can only block a client you've completed an order with" },
      { status: 403 }
    );
  }

  const [existing] = await db
    .select({ id: clientBlocks.id })
    .from(clientBlocks)
    .where(and(eq(clientBlocks.editorId, editorId), eq(clientBlocks.clientId, clientId)))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "You have already blocked this client" }, { status: 409 });
  }

  const [block] = await db
    .insert(clientBlocks)
    .values({ editorId, clientId, reason: reason || null })
    .returning();

  return NextResponse.json(block, { status: 201 });
}
