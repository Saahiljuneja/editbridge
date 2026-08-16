import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors } from "@/lib/db/schema";
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
  const { tier, expiresAt } = body;

  if (!tier) {
    return NextResponse.json({ error: "Membership tier is required." }, { status: 400 });
  }

  const [editor] = await db.select().from(editors).where(eq(editors.userId, id)).limit(1);
  if (!editor) {
    return NextResponse.json({ error: "Editor profile not found" }, { status: 404 });
  }

  await db
    .update(editors)
    .set({
      membershipTier: tier,
      membershipExpiresAt: expiresAt ? new Date(expiresAt) : null,
      updatedAt: new Date(),
    })
    .where(eq(editors.userId, id));

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: "editor.subscription_override",
    entityType: "user",
    entityId: id,
    metadata: { tier, expiresAt },
  });

  return NextResponse.json({ success: true });
}
