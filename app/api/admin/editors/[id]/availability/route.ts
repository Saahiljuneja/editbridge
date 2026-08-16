import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin", "staff_support"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { isAvailable } = body;

  if (typeof isAvailable !== "boolean")
    return NextResponse.json({ error: "isAvailable must be a boolean" }, { status: 400 });

  await db
    .update(editors)
    .set({ isAvailable, updatedAt: new Date() })
    .where(eq(editors.id, id));

  return NextResponse.json({ ok: true });
}
