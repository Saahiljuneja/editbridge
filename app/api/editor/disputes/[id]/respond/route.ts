import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { disputes, orders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "editor" || !session.user.editorId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { evidenceText } = await req.json();
  if (!evidenceText?.trim()) return NextResponse.json({ error: "Response text required." }, { status: 400 });

  // Verify the dispute belongs to an order of this editor
  const [dispute] = await db
    .select({ id: disputes.id, status: disputes.status })
    .from(disputes)
    .innerJoin(orders, eq(orders.id, disputes.orderId))
    .where(and(eq(disputes.id, id), eq(orders.editorId, session.user.editorId)))
    .limit(1);

  if (!dispute) return NextResponse.json({ error: "Dispute not found." }, { status: 404 });
  if (dispute.status !== "open") return NextResponse.json({ error: "Dispute is already resolved." }, { status: 400 });

  await db.update(disputes).set({ evidenceText: evidenceText.trim() }).where(eq(disputes.id, id));

  return NextResponse.json({ ok: true });
}
