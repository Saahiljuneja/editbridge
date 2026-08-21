import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, editors, notifications, packages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createOrderEvent } from "@/lib/order-events";
import { canEditorAcceptOrder } from "@/lib/eligibility";
import { persistEditorHealth } from "@/lib/health";

const schema = z.object({
  note: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || session.user.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { note } = parsed.data;

  const editorId = session.user.editorId;
  if (!editorId) {
    return NextResponse.json({ error: "Editor profile not found" }, { status: 403 });
  }

  // Central eligibility check — single source of truth
  const eligibility = await canEditorAcceptOrder(editorId, id, session.user.userId!);
  if (!eligibility.eligible) {
    const statusMap: Record<string, number> = {
      NOT_AUTHENTICATED:  403,
      ACCOUNT_INACTIVE:   403,
      SUSPENDED:          403,
      KYC_NOT_APPROVED:   403,
      CRITICAL_HEALTH:    403,
      ORDER_NOT_FOUND:    404,
      NOT_ASSIGNED:       403,
      ORDER_NOT_PENDING:  409,
      WINDOW_EXPIRED:     409,
    };
    return NextResponse.json(
      { error: eligibility.reason ?? "Not eligible to accept this order.", code: eligibility.code },
      { status: statusMap[eligibility.code] ?? 400 },
    );
  }

  // Fetch package delivery days (still needed for deadline computation)
  const [order] = await db
    .select({
      id:         orders.id,
      clientId:   orders.clientId,
      packageId:  orders.packageId,
      deliveryDays: packages.deliveryDays,
      packageTitle: packages.title,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(eq(orders.id, id))
    .limit(1);

  const acceptedAt    = new Date();
  const deliveryDays  = order?.deliveryDays ?? null;
  const deadline      = deliveryDays != null
    ? new Date(acceptedAt.getTime() + deliveryDays * 24 * 60 * 60 * 1000)
    : undefined;

  // Atomic update — guards against race with cron auto-cancel
  const updated = await db
    .update(orders)
    .set({
      status: "in_progress",
      acceptedAt,
      editorAcceptanceNote: note ?? null,
      ...(deadline ? { deadline } : {}),
      updatedAt: acceptedAt,
    })
    .where(and(eq(orders.id, id), eq(orders.status, "pending")))
    .returning({ id: orders.id });

  if (updated.length === 0) {
    return NextResponse.json({ error: "Order is no longer available to accept" }, { status: 409 });
  }

  createOrderEvent(id, session.user.userId!, "order_accepted", {
    acceptedAt: acceptedAt.toISOString(),
    ...(deadline ? { deadline: deadline.toISOString() } : {}),
    note,
  });

  const deadlineStr = deadline
    ? deadline.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  await db.insert(notifications).values({
    userId: order!.clientId,
    type: "order_accepted",
    title: "Order accepted!",
    body: deadlineStr
      ? `Your editor has accepted your order and will deliver by ${deadlineStr}.`
      : (note ?? "Your editor has accepted the order and started working on it."),
    link: `/orders/${id}`,
  });

  // Recalculate health async (acceptance improves acceptance rate)
  persistEditorHealth(editorId).catch(() => {});

  return NextResponse.json({ ok: true, acceptedAt, ...(deadline ? { deadline } : {}) });
}
