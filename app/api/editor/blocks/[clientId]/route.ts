import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientBlocks } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "editor" || !session.user.editorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { clientId } = await params;

  const [deleted] = await db
    .delete(clientBlocks)
    .where(and(eq(clientBlocks.editorId, session.user.editorId), eq(clientBlocks.clientId, clientId)))
    .returning({ id: clientBlocks.id });

  if (!deleted) return NextResponse.json({ error: "Block not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
