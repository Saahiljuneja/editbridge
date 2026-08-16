import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userCredits, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createInAppNotification } from "@/lib/notifications";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { amountInr, reason, expiresAt } = body;

  const num = Number(amountInr);
  if (!num || isNaN(num) || num <= 0)
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

  const amountPaise = Math.round(num * 100);

  const [targetUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await db.insert(userCredits).values({
    userId: id,
    amount: amountPaise,
    reason: (reason as string) || "Admin grant",
    expiresAt: expiresAt ? new Date(expiresAt as string) : null,
  });

  await createInAppNotification({
    userId: id,
    type: "wallet.credits_grant",
    title: "Credits Granted",
    body: `An admin has granted ₹${num} credits to your wallet. Reason: ${reason || "Admin adjustment"}.`,
    link: targetUser.role === "editor" ? "/editor/wallet" : "/client/wallet",
  });

  return NextResponse.json({ ok: true });
}
