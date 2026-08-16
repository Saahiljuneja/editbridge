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
  const { maxActiveOrders } = body;

  const val = maxActiveOrders === null || maxActiveOrders === "" ? null : Number(maxActiveOrders);
  if (val !== null && (isNaN(val) || val < 1 || val > 50))
    return NextResponse.json({ error: "Must be between 1 and 50, or null to clear" }, { status: 400 });

  await db
    .update(editors)
    .set({ maxActiveOrders: val, updatedAt: new Date() })
    .where(eq(editors.id, id));

  return NextResponse.json({ ok: true });
}
