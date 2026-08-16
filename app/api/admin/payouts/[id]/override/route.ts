import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payouts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "@/lib/audit";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { status, scheduledPayoutAt } = body;

  const [payout] = await db.select().from(payouts).where(eq(payouts.id, id)).limit(1);
  if (!payout) {
    return NextResponse.json({ error: "Payout not found" }, { status: 404 });
  }

  const updateFields: any = { updatedAt: new Date() };
  if (status) updateFields.status = status;
  if (scheduledPayoutAt !== undefined) {
    updateFields.scheduledPayoutAt = scheduledPayoutAt ? new Date(scheduledPayoutAt) : null;
  }

  await db.update(payouts).set(updateFields).where(eq(payouts.id, id));

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: "payout.override",
    entityType: "payout",
    entityId: id,
    metadata: { ...updateFields },
  });

  return NextResponse.json({ success: true });
}
