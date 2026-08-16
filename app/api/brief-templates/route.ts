import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { briefTemplates } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(briefTemplates)
    .where(eq(briefTemplates.userId, session.user.userId))
    .orderBy(desc(briefTemplates.createdAt));

  return NextResponse.json(rows);
}

const createSchema = z.object({
  name: z.string().min(1).max(60),
  content: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const [row] = await db
    .insert(briefTemplates)
    .values({ userId: session.user.userId, name: body.data.name, content: body.data.content })
    .returning();

  return NextResponse.json(row, { status: 201 });
}

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(60).optional(),
  content: z.string().min(1).max(2000).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = updateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { id, name, content } = body.data;
  const updates: Partial<{ name: string; content: string }> = {};
  if (name !== undefined) updates.name = name;
  if (content !== undefined) updates.content = content;
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const [row] = await db
    .update(briefTemplates)
    .set(updates)
    .where(and(eq(briefTemplates.id, id), eq(briefTemplates.userId, session.user.userId)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db
    .delete(briefTemplates)
    .where(and(eq(briefTemplates.id, id), eq(briefTemplates.userId, session.user.userId)));

  return NextResponse.json({ success: true });
}
