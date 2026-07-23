import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { showcaseItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "@/lib/audit";

const ALLOWED_ROLES = ["admin", "staff_moderation"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const updates: Record<string, unknown> = {};
  if (typeof body.sortOrder === "number") updates.sortOrder = body.sortOrder;
  if (typeof body.title === "string" && body.title.trim()) updates.title = body.title.trim();
  if (typeof body.description === "string") updates.description = body.description.trim() || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const [updated] = await db.update(showcaseItems).set(updates).where(eq(showcaseItems.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const [deleted] = await db.delete(showcaseItems).where(eq(showcaseItems.id, id)).returning();
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role,
    action: "showcase.remove",
    entityType: "showcase_item",
    entityId: id,
    metadata: { title: deleted.title },
  });

  return NextResponse.json({ success: true });
}
