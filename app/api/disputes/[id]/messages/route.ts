import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { disputeMessages, disputes, orders, editors, users } from "@/lib/db/schema";
import { eq, asc, and, or } from "drizzle-orm";
import { z } from "zod";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

const postSchema = z.object({ body: z.string().min(1).max(2000) });

async function getDisputeAndCheckAccess(disputeId: string, userId: string, role: string) {
  const [dispute] = await db
    .select({
      id: disputes.id,
      orderId: disputes.orderId,
      status: disputes.status,
      clientId: orders.clientId,
      editorUserId: users.id,
    })
    .from(disputes)
    .innerJoin(orders, eq(orders.id, disputes.orderId))
    .innerJoin(editors, eq(editors.id, orders.editorId))
    .innerJoin(users, eq(users.id, editors.userId))
    .where(eq(disputes.id, disputeId))
    .limit(1);

  if (!dispute) return null;

  const isAdmin = role === "admin" || role?.startsWith("staff_");
  const isClient = dispute.clientId === userId;
  const isEditor = dispute.editorUserId === userId;
  if (!isAdmin && !isClient && !isEditor) return null;

  return dispute;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const dispute = await getDisputeAndCheckAccess(id, session.user.userId, session.user.role ?? "");
  if (!dispute) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await db
    .select({
      id: disputeMessages.id,
      body: disputeMessages.body,
      createdAt: disputeMessages.createdAt,
      senderId: disputeMessages.senderId,
      senderName: users.name,
      senderRole: users.role,
      senderImage: users.image,
    })
    .from(disputeMessages)
    .innerJoin(users, eq(users.id, disputeMessages.senderId))
    .where(eq(disputeMessages.disputeId, id))
    .orderBy(asc(disputeMessages.createdAt));

  return NextResponse.json(messages);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const dispute = await getDisputeAndCheckAccess(id, session.user.userId, session.user.role ?? "");
  if (!dispute) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (dispute.status === "resolved") {
    return NextResponse.json({ error: "Dispute is already resolved" }, { status: 409 });
  }

  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid message" }, { status: 400 });

  const [message] = await db
    .insert(disputeMessages)
    .values({ disputeId: id, senderId: session.user.userId, body: parsed.data.body })
    .returning();

  const payload = {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt,
    senderId: session.user.userId,
    senderName: session.user.name ?? "Unknown",
    senderRole: session.user.role,
    senderImage: session.user.image ?? null,
  };

  // Broadcast via Pusher
  await pusher.trigger(`dispute-${id}`, "new-message", payload).catch(() => {});

  return NextResponse.json(payload, { status: 201 });
}
