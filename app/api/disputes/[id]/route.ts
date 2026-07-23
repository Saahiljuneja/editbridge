import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { disputes, orders, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.userId!;
  const role = session.user.role;

  const [dispute] = await db
    .select({
      id: disputes.id,
      orderId: disputes.orderId,
      openedBy: disputes.openedBy,
      reason: disputes.reason,
      evidenceText: disputes.evidenceText,
      evidenceUrls: disputes.evidenceUrls,
      status: disputes.status,
      resolutionType: disputes.resolutionType,
      resolutionNote: disputes.resolutionNote,
      createdAt: disputes.createdAt,
      updatedAt: disputes.updatedAt,
      clientId: orders.clientId,
      editorId: orders.editorId,
    })
    .from(disputes)
    .innerJoin(orders, eq(orders.id, disputes.orderId))
    .where(eq(disputes.id, id))
    .limit(1);

  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  const isClient = dispute.clientId === userId;
  const isEditor = session.user.editorId === dispute.editorId;
  const isStaff = ["admin", "staff_support", "staff_dispute"].includes(role ?? "");

  if (!isClient && !isEditor && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [opener] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, dispute.openedBy))
    .limit(1);

  return NextResponse.json({ ...dispute, openerName: opener?.name ?? null });
}
