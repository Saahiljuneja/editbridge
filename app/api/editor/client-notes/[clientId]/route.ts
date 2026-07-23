import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientNotes, editors } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

async function getEditorId(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: editors.id })
    .from(editors)
    .where(eq(editors.userId, userId))
    .limit(1);
  return row?.id ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const editorId = await getEditorId(session.user.userId!);
  if (!editorId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { clientId } = await params;

  const [row] = await db
    .select({ note: clientNotes.note, updatedAt: clientNotes.updatedAt })
    .from(clientNotes)
    .where(and(eq(clientNotes.editorId, editorId), eq(clientNotes.clientId, clientId)))
    .limit(1);

  return NextResponse.json({ note: row?.note ?? "", updatedAt: row?.updatedAt ?? null });
}

const putSchema = z.object({ note: z.string().max(2000) });

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const editorId = await getEditorId(session.user.userId!);
  if (!editorId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = putSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { clientId } = await params;

  const [existing] = await db
    .select({ id: clientNotes.id })
    .from(clientNotes)
    .where(and(eq(clientNotes.editorId, editorId), eq(clientNotes.clientId, clientId)))
    .limit(1);

  if (existing) {
    await db
      .update(clientNotes)
      .set({ note: body.data.note, updatedAt: new Date() })
      .where(eq(clientNotes.id, existing.id));
  } else {
    await db.insert(clientNotes).values({
      editorId,
      clientId,
      note: body.data.note,
      updatedAt: new Date(),
    });
  }

  return NextResponse.json({ ok: true });
}
