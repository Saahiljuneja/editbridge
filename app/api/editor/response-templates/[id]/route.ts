import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { responseTemplates } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(60).optional(),
  content: z.string().trim().min(1).max(1000).optional(),
  shortcut: z.string().trim().toLowerCase().regex(/^[a-z]+$/, "Shortcut must be letters only").max(20).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const updates: Record<string, unknown> = { ...parsed.data };
  if ("shortcut" in updates) updates.shortcut = updates.shortcut || null;

  const [updated] = await db
    .update(responseTemplates)
    .set(updates)
    .where(and(eq(responseTemplates.id, id), eq(responseTemplates.editorId, session.user.userId!)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [deleted] = await db
    .delete(responseTemplates)
    .where(and(eq(responseTemplates.id, id), eq(responseTemplates.editorId, session.user.userId!)))
    .returning({ id: responseTemplates.id });

  if (!deleted) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
