import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin"];
const VALID_TIERS = ["hobby", "starter", "pro", "agency"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { tier, expiresAt } = body;

  if (!VALID_TIERS.includes(tier))
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });

  await db
    .update(editors)
    .set({
      membershipTier: tier,
      membershipExpiresAt: expiresAt ? new Date(expiresAt) : null,
      updatedAt: new Date(),
    })
    .where(eq(editors.id, id));

  return NextResponse.json({ ok: true });
}
