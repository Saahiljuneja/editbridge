import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { responseTemplates } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { z } from "zod";

const MAX_TEMPLATES = 15;

const createSchema = z.object({
  title: z.string().trim().min(1).max(60),
  content: z.string().trim().min(1).max(1000),
  shortcut: z.string().trim().toLowerCase().regex(/^[a-z]+$/, "Shortcut must be letters only").max(20).nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(responseTemplates)
    .where(eq(responseTemplates.editorId, session.user.userId!))
    .orderBy(asc(responseTemplates.sortOrder));

  return NextResponse.json({ templates: rows });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(responseTemplates)
    .where(eq(responseTemplates.editorId, session.user.userId!));

  if (count >= MAX_TEMPLATES) {
    return NextResponse.json({ error: `You can have at most ${MAX_TEMPLATES} templates.` }, { status: 409 });
  }

  const { title, content, shortcut } = parsed.data;

  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number>`COALESCE(MAX(${responseTemplates.sortOrder}), -1)::int` })
    .from(responseTemplates)
    .where(eq(responseTemplates.editorId, session.user.userId!));

  const [template] = await db
    .insert(responseTemplates)
    .values({
      editorId: session.user.userId!,
      title,
      content,
      shortcut: shortcut || null,
      sortOrder: maxOrder + 1,
    })
    .returning();

  return NextResponse.json(template, { status: 201 });
}
