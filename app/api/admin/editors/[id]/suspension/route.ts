import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notifyAccountSuspended } from "@/lib/notifications";
import type { UserRole } from "@/types";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { action, reason } = body as { action?: string; reason?: string };

  if (action !== "suspend" && action !== "unsuspend") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (action === "suspend" && (!reason || !reason.trim())) {
    return NextResponse.json({ error: "reason is required to suspend" }, { status: 400 });
  }

  const [editor] = await db.select({ id: editors.id, userId: editors.userId, isSuspended: editors.isSuspended })
    .from(editors).where(eq(editors.id, id)).limit(1);
  if (!editor) return NextResponse.json({ error: "Editor not found" }, { status: 404 });

  if (action === "suspend") {
    await db.update(editors).set({
      isSuspended: true,
      suspendedAt: new Date(),
      suspendedBy: session.user.userId,
      suspensionReason: reason!.trim(),
    }).where(eq(editors.id, id));

    notifyAccountSuspended(editor.userId, reason!.trim());
  } else {
    await db.update(editors).set({
      isSuspended: false,
      suspendedAt: null,
      suspendedBy: null,
      suspensionReason: null,
    }).where(eq(editors.id, id));
  }

  return NextResponse.json({ ok: true });
}
