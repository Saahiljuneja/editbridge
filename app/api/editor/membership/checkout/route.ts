import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors, membershipPayments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createOrder } from "@/lib/razorpay";
import { MEMBERSHIP_TIERS, MembershipTierName } from "@/lib/membership";
import { z } from "zod";

const checkoutSchema = z.object({
  tier: z.enum(["starter", "pro", "agency"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [editor] = await db
    .select({ id: editors.id })
    .from(editors)
    .where(eq(editors.userId, session.user.userId!))
    .limit(1);

  if (!editor) {
    return NextResponse.json({ error: "Editor profile not found" }, { status: 404 });
  }

  const body = await req.json();
  const result = checkoutSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid membership tier" }, { status: 400 });
  }

  const { tier } = result.data;
  const tierConfig = MEMBERSHIP_TIERS[tier as MembershipTierName];
  const amountInPaise = tierConfig.priceInRupees * 100;

  const receipt = `mem_${editor.id.slice(0, 8)}_${Date.now()}`;

  try {
    const order = await createOrder(amountInPaise, "INR", receipt);

    // Save pending payment record
    // Membership expires in 30 days from now (once payment is verified)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(membershipPayments).values({
      editorId: editor.id,
      tier,
      amountPaid: amountInPaise,
      razorpayOrderId: order.id,
      status: "pending",
      expiresAt,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("[Membership Checkout] Failed to create Razorpay order:", err);
    return NextResponse.json({ error: "Failed to initiate transaction" }, { status: 500 });
  }
}
