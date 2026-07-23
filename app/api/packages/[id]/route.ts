import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { packages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { createPackageSchema } from "@/lib/validations";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user?.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const editorId = session.user.editorId;
  if (!editorId) {
    return NextResponse.json({ error: "Editor record not found" }, { status: 404 });
  }

  const { id } = await params;
  const body = await request.json();

  // Partial update — only validate fields that are present
  const parsed = createPackageSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(packages)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(packages.id, id), eq(packages.editorId, editorId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user?.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const editorId = session.user.editorId;
  if (!editorId) {
    return NextResponse.json({ error: "Editor record not found" }, { status: 404 });
  }

  const { id } = await params;

  // Soft delete — set is_active = false
  const [updated] = await db
    .update(packages)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(packages.id, id), eq(packages.editorId, editorId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
