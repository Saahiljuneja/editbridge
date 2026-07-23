import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payouts, auditLogs } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { ids, status } = await req.json();
  if (!Array.isArray(ids) || !ids.length || !["completed", "processing"].includes(status)) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  await db.update(payouts).set({ status }).where(inArray(payouts.id, ids));
  await db.insert(auditLogs).values({
    actorId: session.user.userId,
    actorRole: session.user.role,
    action: "payout.batch_update",
    entityType: "payout",
    entityId: ids.join(","),
    metadata: { count: ids.length, to: status },
  });
  return NextResponse.json({ ok: true, count: ids.length });
}
