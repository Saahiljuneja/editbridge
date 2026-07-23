import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { quoteRequests, editors, users } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";
import { createInAppNotification, editorWantsNotif } from "@/lib/notifications";
import { onQuoteReceived } from "@/lib/rewards";

const createSchema = z.object({
  editorId: z.string().uuid(),
  videoType: z.string().min(1),
  brief: z.string().min(20).max(2000),
  budgetMin: z.number().int().min(50000),   // ₹500 minimum
  budgetMax: z.number().int().min(50000),
  deadlinePreference: z.enum(["1-3 days", "1 week", "2 weeks", "flexible"]),
  referenceUrl: z.string().url().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "client")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { editorId, videoType, brief, budgetMin, budgetMax, deadlinePreference, referenceUrl } = parsed.data;

  // Verify editor exists
  const [editor] = await db.select({ id: editors.id, userId: editors.userId })
    .from(editors).where(eq(editors.id, editorId)).limit(1);
  if (!editor)
    return NextResponse.json({ error: "Editor not found" }, { status: 404 });

  // Prevent duplicate pending requests to same editor
  const [existing] = await db.select({ id: quoteRequests.id })
    .from(quoteRequests)
    .where(and(
      eq(quoteRequests.clientId, session.user.userId!),
      eq(quoteRequests.editorId, editorId),
      eq(quoteRequests.status, "pending"),
    )).limit(1);
  if (existing)
    return NextResponse.json({ error: "You already have a pending quote request with this editor" }, { status: 409 });

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const [quote] = await db.insert(quoteRequests).values({
    clientId: session.user.userId!,
    editorId,
    videoType,
    brief,
    budgetMin,
    budgetMax,
    deadlinePreference,
    referenceUrl: referenceUrl || null,
    expiresAt,
  }).returning({ id: quoteRequests.id });

  onQuoteReceived(editor.userId).catch(() => {});

  // Notify editor
  const [clientUser] = await db.select({ name: users.name })
    .from(users).where(eq(users.id, session.user.userId!)).limit(1);

  if (await editorWantsNotif(editor.id, "newOrder")) {
    await createInAppNotification({
      userId: editor.userId,
      type: "new_order",
      title: "New quote request",
      body: `${clientUser?.name ?? "A client"} wants a quote for a ${videoType} video. Reply within 48 hours.`,
      link: `/editor/quotes/${quote.id}`,
    });
  }

  return NextResponse.json({ quoteId: quote.id }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.userId!;
  const role = session.user.role;

  if (role === "client") {
    const rows = await db.select({
      id: quoteRequests.id,
      videoType: quoteRequests.videoType,
      brief: quoteRequests.brief,
      budgetMin: quoteRequests.budgetMin,
      budgetMax: quoteRequests.budgetMax,
      deadlinePreference: quoteRequests.deadlinePreference,
      status: quoteRequests.status,
      offeredPrice: quoteRequests.offeredPrice,
      offerMessage: quoteRequests.offerMessage,
      expiresAt: quoteRequests.expiresAt,
      createdAt: quoteRequests.createdAt,
      editorName: users.name,
    })
      .from(quoteRequests)
      .innerJoin(editors, eq(editors.id, quoteRequests.editorId))
      .innerJoin(users, eq(users.id, editors.userId))
      .where(eq(quoteRequests.clientId, userId))
      .orderBy(desc(quoteRequests.createdAt))
      .limit(50);
    return NextResponse.json(rows);
  }

  if (role === "editor") {
    const [editor] = await db.select({ id: editors.id })
      .from(editors).where(eq(editors.userId, userId)).limit(1);
    if (!editor) return NextResponse.json([], { status: 200 });

    const rows = await db.select({
      id: quoteRequests.id,
      videoType: quoteRequests.videoType,
      brief: quoteRequests.brief,
      budgetMin: quoteRequests.budgetMin,
      budgetMax: quoteRequests.budgetMax,
      deadlinePreference: quoteRequests.deadlinePreference,
      referenceUrl: quoteRequests.referenceUrl,
      status: quoteRequests.status,
      offeredPrice: quoteRequests.offeredPrice,
      expiresAt: quoteRequests.expiresAt,
      createdAt: quoteRequests.createdAt,
      clientName: users.name,
    })
      .from(quoteRequests)
      .innerJoin(users, eq(users.id, quoteRequests.clientId))
      .where(eq(quoteRequests.editorId, editor.id))
      .orderBy(desc(quoteRequests.createdAt))
      .limit(50);
    return NextResponse.json(rows);
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
