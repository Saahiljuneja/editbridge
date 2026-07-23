import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  references: z.array(z.object({
    url: z.string().url("Must be a valid URL"),
    note: z.string().max(200).optional().default(""),
    addedAt: z.string().optional(),
  })).max(20),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [order] = await db
    .select({ id: orders.id, briefData: orders.briefData, clientId: orders.clientId })
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.clientId, session.user.userId)))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const existing = (order.briefData as Record<string, unknown>) ?? {};
  const updated = { ...existing, references: parsed.data.references };

  await db
    .update(orders)
    .set({ briefData: updated, updatedAt: new Date() })
    .where(eq(orders.id, id));

  return NextResponse.json({ success: true });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [order] = await db
    .select({ briefData: orders.briefData, clientId: orders.clientId, editorId: orders.editorId })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = (order.briefData as Record<string, unknown>) ?? {};
  return NextResponse.json({ references: data.references ?? [] });
}
