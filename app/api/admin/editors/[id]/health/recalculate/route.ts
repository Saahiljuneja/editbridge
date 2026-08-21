import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { persistEditorHealth } from "@/lib/health";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin", "staff_kyc", "staff_support", "staff_dispute"];

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [editor] = await db.select({ id: editors.id }).from(editors).where(eq(editors.id, id)).limit(1);
  if (!editor) return NextResponse.json({ error: "Editor not found" }, { status: 404 });

  await persistEditorHealth(id);
  return NextResponse.json({ ok: true });
}
