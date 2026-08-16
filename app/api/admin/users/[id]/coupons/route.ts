import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userCoupons } from "@/lib/db/schema";
import { logAction } from "@/lib/audit";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { code, discountPct, maxDiscountAmountInr, expiresAt } = body;

  if (!code || !discountPct || !maxDiscountAmountInr) {
    return NextResponse.json({ error: "Code, discount percentage, and max discount are required." }, { status: 400 });
  }

  const pct = parseInt(discountPct, 10);
  if (isNaN(pct) || pct < 1 || pct > 100) {
    return NextResponse.json({ error: "Discount percentage must be between 1 and 100." }, { status: 400 });
  }

  const maxAmt = parseInt(maxDiscountAmountInr, 10);
  if (isNaN(maxAmt) || maxAmt <= 0) {
    return NextResponse.json({ error: "Max discount amount must be greater than 0." }, { status: 400 });
  }

  try {
    const uppercaseCode = code.trim().toUpperCase();
    await db.insert(userCoupons).values({
      userId: id,
      code: uppercaseCode,
      discountPct: pct,
      maxDiscountAmount: maxAmt * 100, // paise
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isUsed: false,
    });

    logAction({
      actorId: session.user.userId!,
      actorRole: session.user.role as UserRole,
      action: "user.coupon_create",
      entityType: "user",
      entityId: id,
      metadata: { code: uppercaseCode, discountPct: pct, maxDiscountAmount: maxAmt * 100 },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.code === "23505" || err?.message?.includes("unique")) {
      return NextResponse.json({ error: "Coupon code already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
