import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payouts, auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["pending", "processing", "completed"]),
  note: z.string().max(500).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status. Must be pending, processing, or completed." }, { status: 400 });
  }

  const { status, note } = parsed.data;
  await db.update(payouts).set({ status }).where(eq(payouts.id, id));

  await db.insert(auditLogs).values({
    actorId: session.user.userId,
    actorRole: session.user.role,
    action: "payout.status_change",
    entityType: "payout",
    entityId: id,
    metadata: { to: status, note: note ?? null },
  });

  return NextResponse.json({ ok: true });
}
