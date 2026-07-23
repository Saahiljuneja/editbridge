import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { quoteRequests, editors, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createInAppNotification } from "@/lib/notifications";

const offerSchema = z.object({
  price: z.number().int().min(50000), // ₹500 minimum
  message: z.string().min(10).max(500),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== "editor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = offerSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [editor] = await db.select({ id: editors.id })
    .from(editors).where(eq(editors.userId, session.user.userId!)).limit(1);
  if (!editor) return NextResponse.json({ error: "Editor not found" }, { status: 404 });

  const [quote] = await db.select({
    id: quoteRequests.id,
    clientId: quoteRequests.clientId,
    editorId: quoteRequests.editorId,
    status: quoteRequests.status,
    expiresAt: quoteRequests.expiresAt,
    videoType: quoteRequests.videoType,
  })
    .from(quoteRequests)
    .where(and(eq(quoteRequests.id, id), eq(quoteRequests.editorId, editor.id)))
    .limit(1);

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (quote.status !== "pending") return NextResponse.json({ error: "Quote is no longer pending" }, { status: 409 });
  if (new Date() > quote.expiresAt) return NextResponse.json({ error: "Quote has expired" }, { status: 410 });

  // Enforce budget ceiling — price cannot exceed client's max budget
  const [fullQuote] = await db.select({ budgetMax: quoteRequests.budgetMax })
    .from(quoteRequests).where(eq(quoteRequests.id, id)).limit(1);
  if (parsed.data.price > (fullQuote?.budgetMax ?? Infinity))
    return NextResponse.json({ error: "Offer price exceeds client's stated budget" }, { status: 422 });

  await db.update(quoteRequests)
    .set({ status: "offered", offeredPrice: parsed.data.price, offerMessage: parsed.data.message, updatedAt: new Date() })
    .where(eq(quoteRequests.id, id));

  const [editorUser] = await db.select({ name: users.name })
    .from(users).where(eq(users.id, session.user.userId!)).limit(1);

  await createInAppNotification({
    userId: quote.clientId,
    type: "new_order",
    title: "Quote received",
    body: `${editorUser?.name ?? "An editor"} sent you a price for your ${quote.videoType} video. Review and accept to proceed.`,
    link: `/quotes`,
  });

  return NextResponse.json({ success: true });
}
