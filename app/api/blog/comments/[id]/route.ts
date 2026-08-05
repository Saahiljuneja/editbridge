import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { blogComments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateCommentSchema = z.object({
  status: z.enum(["pending", "approved", "spam"]).optional(),
  adminReply: z.string().max(2000).optional().nullable(),
  isPinned: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session || !["admin", "staff_moderation"].includes(session.user.role ?? "")) return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateCommentSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.adminReply !== undefined) updates.adminReply = parsed.data.adminReply;
  if (parsed.data.isPinned !== undefined) updates.isPinned = parsed.data.isPinned;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [comment] = await db
    .update(blogComments)
    .set(updates)
    .where(eq(blogComments.id, id))
    .returning();

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  return NextResponse.json({ comment });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const deleted = await db.delete(blogComments).where(eq(blogComments.id, id)).returning();
  
  if (deleted.length === 0) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
