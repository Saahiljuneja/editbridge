import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, editors, users, clientBlocks } from "@/lib/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { createOrderSchema } from "@/lib/validations";
import { createOrder } from "@/lib/razorpay";
import { getAvailableCredits } from "@/lib/rewards";
import { getPlatformSettings } from "@/lib/platform-settings";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = 20;
  const offset = (page - 1) * limit;

  const conditions = [];

  if (session.user.role === "editor" && session.user.editorId) {
    conditions.push(eq(orders.editorId, session.user.editorId));
  } else {
    conditions.push(eq(orders.clientId, session.user.userId!));
  }

  if (status) conditions.push(sql`${orders.status} = ${status}`);

  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalAmount: orders.totalAmount,
      commissionAmount: orders.commissionAmount,
      deadline: orders.deadline,
      createdAt: orders.createdAt,
      packageTier: packages.tier,
      packageTitle: packages.title,
      clientName: users.name,
      editorId: orders.editorId,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .innerJoin(users, eq(users.id, orders.clientId))
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ orders: rows, page });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "client") {
    return NextResponse.json({ error: "Only clients can place orders" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { packageId, useCredits, rewardDiscountAmount = 0 } = parsed.data as { packageId: string; useCredits?: boolean; rewardDiscountAmount?: number };

  const [pkg] = await db
    .select({
      id: packages.id,
      price: packages.price,
      title: packages.title,
      editorId: packages.editorId,
      isActive: packages.isActive,
    })
    .from(packages)
    .where(and(eq(packages.id, packageId), eq(packages.isActive, true)))
    .limit(1);

  if (!pkg) {
    return NextResponse.json({ error: "Package not found or unavailable" }, { status: 404 });
  }

  // Ensure editor is still approved and available
  const [editor] = await db
    .select({ id: editors.id, kycStatus: editors.kycStatus, isAvailable: editors.isAvailable, maxActiveOrders: editors.maxActiveOrders })
    .from(editors)
    .where(eq(editors.id, pkg.editorId))
    .limit(1);

  if (!editor || editor.kycStatus !== "approved" || !editor.isAvailable) {
    return NextResponse.json({ error: "Editor is not currently accepting orders" }, { status: 409 });
  }

  // Never reveal to the client that they've been blocked — same generic message
  // as an editor who's simply unavailable.
  const [blocked] = await db
    .select({ id: clientBlocks.id })
    .from(clientBlocks)
    .where(and(eq(clientBlocks.editorId, editor.id), eq(clientBlocks.clientId, session.user.userId!)))
    .limit(1);

  if (blocked) {
    return NextResponse.json({ error: "This editor is not accepting new orders at this time" }, { status: 403 });
  }

  // Enforce capacity cap if editor has set one
  if (editor.maxActiveOrders !== null) {
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(orders)
      .where(and(
        eq(orders.editorId, editor.id),
        sql`${orders.status} IN ('pending','in_progress','delivered','revision_requested','disputed')`
      ));
    if (count >= editor.maxActiveOrders) {
      return NextResponse.json({ error: "Editor is not accepting new orders right now" }, { status: 409 });
    }
  }

  const { processingFeePct } = await getPlatformSettings();
  const PROCESSING_FEE = Math.round(pkg.price * (processingFeePct / 100));
  // Clamp discount: cannot exceed package price, must not be negative
  const discount = Math.max(0, Math.min(rewardDiscountAmount, pkg.price));
  const discountedPrice = pkg.price - discount;
  const fullTotal = discountedPrice + PROCESSING_FEE;

  // Client credits reduce the payment amount (credits can cover up to the full total)
  let creditApplied = 0;
  if (useCredits) {
    const { total: available } = await getAvailableCredits(session.user.userId!);
    // Credits can reduce payment down to ₹1 minimum (Razorpay minimum = 100 paise)
    creditApplied = Math.min(available, fullTotal - 100);
    if (creditApplied < 0) creditApplied = 0;
  }

  const chargeAmount = fullTotal - creditApplied;
  const receipt = `eb-${packageId.slice(0, 8)}-${Date.now()}`;
  const rzpOrder = await createOrder(chargeAmount, "INR", receipt);

  return NextResponse.json({
    razorpayOrderId: rzpOrder.id,
    key: process.env.RAZORPAY_KEY_ID,
    amount: chargeAmount,
    packagePrice: pkg.price,
    processingFee: PROCESSING_FEE,
    rewardDiscountAmount: discount,
    creditApplied,
    currency: "INR",
    packageTitle: pkg.title,
  });
}
