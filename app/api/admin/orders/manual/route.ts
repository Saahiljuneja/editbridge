import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { logAction } from "@/lib/audit";
import { getEditorCommissionRate } from "@/lib/membership";
import { getClientProcessingFeeRate } from "@/lib/platform-settings";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { clientId, editorId, packageId, basePriceInr, deadlineDays, brief } = body;

  if (!clientId || !editorId || !basePriceInr || !deadlineDays) {
    return NextResponse.json({ error: "Missing required details." }, { status: 400 });
  }

  const basePricePaise = Math.round(parseFloat(basePriceInr) * 100);
  if (isNaN(basePricePaise) || basePricePaise <= 0) {
    return NextResponse.json({ error: "Invalid base price amount." }, { status: 400 });
  }

  // Calculate overrides or default rates
  const commissionRatePct = await getEditorCommissionRate(editorId);
  const commissionAmount = Math.round(basePricePaise * (commissionRatePct / 100));

  const processingFeePct = await getClientProcessingFeeRate(clientId);
  const processingFee = Math.round(basePricePaise * (processingFeePct / 100));

  const totalAmount = basePricePaise + processingFee;

  // Insert manual order record
  const [newOrder] = await db
    .insert(orders)
    .values({
      clientId,
      editorId,
      packageId: packageId || null,
      status: "in_progress",
      packageTitle: packageId ? "Linked Package" : "Manual Custom Contract",
      packageDescription: brief || "Manually drafted by administrator.",
      totalAmount,
      processingFee,
      commissionAmount,
      isManual: true, // We can track manual flag if it exists, or just let it insert normally
    } as any)
    .returning();

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: "order.create_manual",
    entityType: "order",
    entityId: newOrder.id,
    metadata: { clientId, editorId, totalAmount },
  });

  return NextResponse.json({ success: true, orderId: newOrder.id });
}
