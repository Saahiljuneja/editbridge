import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, editors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "@/lib/audit";
import type { UserRole } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { customCommissionRate, customProcessingFeeRate } = body;

  // Validation
  if (customCommissionRate !== undefined && customCommissionRate !== null) {
    if (typeof customCommissionRate !== "number" || customCommissionRate < 0 || customCommissionRate > 100) {
      return NextResponse.json({ error: "Commission rate must be between 0 and 100" }, { status: 400 });
    }
  }

  if (customProcessingFeeRate !== undefined && customProcessingFeeRate !== null) {
    if (typeof customProcessingFeeRate !== "number" || customProcessingFeeRate < 0 || customProcessingFeeRate > 100) {
      return NextResponse.json({ error: "Processing fee must be between 0 and 100" }, { status: 400 });
    }
  }

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Update client processing fee rate override
  if (customProcessingFeeRate !== undefined) {
    await db
      .update(users)
      .set({ customProcessingFeeRate, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  // Update editor commission rate override
  if (customCommissionRate !== undefined) {
    await db
      .update(editors)
      .set({ customCommissionRate, updatedAt: new Date() })
      .where(eq(editors.userId, id));
  }

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: "user.custom_rates_update",
    entityType: "user",
    entityId: id,
    metadata: { customCommissionRate, customProcessingFeeRate },
  });

  return NextResponse.json({ success: true });
}
