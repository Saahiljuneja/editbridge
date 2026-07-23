import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientBlocks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin", "staff_support", "staff_dispute", "staff_moderation"];

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [deleted] = await db
    .delete(clientBlocks)
    .where(eq(clientBlocks.id, id))
    .returning({ id: clientBlocks.id });

  if (!deleted) return NextResponse.json({ error: "Block not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
