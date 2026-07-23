import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { quoteRequests } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== "client")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [quote] = await db.select({ id: quoteRequests.id, status: quoteRequests.status })
    .from(quoteRequests)
    .where(and(eq(quoteRequests.id, id), eq(quoteRequests.clientId, session.user.userId!)))
    .limit(1);

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (!["pending", "offered"].includes(quote.status))
    return NextResponse.json({ error: "Cannot decline this quote" }, { status: 409 });

  await db.update(quoteRequests)
    .set({ status: "declined", updatedAt: new Date() })
    .where(eq(quoteRequests.id, id));

  return NextResponse.json({ success: true });
}
