import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { portfolioItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "@/lib/audit";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin", "staff_moderation"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { isHidden } = body;

  if (typeof isHidden !== "boolean") {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const [item] = await db.select().from(portfolioItems).where(eq(portfolioItems.id, id)).limit(1);
  if (!item) {
    return NextResponse.json({ error: "Portfolio item not found" }, { status: 404 });
  }

  await db
    .update(portfolioItems)
    .set({ isHidden })
    .where(eq(portfolioItems.id, id));

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: isHidden ? "portfolio.hide" : "portfolio.unhide",
    entityType: "portfolio_item",
    entityId: id,
    metadata: { editorId: item.editorId, isHidden },
  });

  return NextResponse.json({ ok: true });
}
