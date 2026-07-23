import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { authorizeChannel } from "@/lib/pusher";

// Pusher sends form-encoded body: socket_id + channel_name
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id");
  const channelName = params.get("channel_name");

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
  }

  // Channel name format: private-order-{orderId}
  if (!channelName.startsWith("private-order-")) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 403 });
  }
  const orderId = channelName.replace("private-order-", "");

  // Verify the requesting user is a party to this order
  const [order] = await db
    .select({ clientId: orders.clientId, editorId: orders.editorId })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const userId = session.user.userId!;
  const editorId = session.user.editorId;

  const isClient = order.clientId === userId;
  const isEditor = editorId === order.editorId;
  const isStaff = ["admin", "staff_support", "staff_dispute"].includes(session.user.role ?? "");

  if (!isClient && !isEditor && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const authResponse = authorizeChannel(socketId, channelName);
  return NextResponse.json(authResponse);
}
