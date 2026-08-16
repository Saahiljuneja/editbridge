import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { supportTickets, supportMessages, users } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";

const createMessageSchema = z.object({
  body: z.string().min(1, "Message content is required"),
});

// GET: Fetch messages for a ticket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const session = await auth();
  if (!session || !session.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ticketId } = await params;
  const role = session.user.role;
  const isStaff = role === "admin" || role?.startsWith("staff_");

  try {
    // Check if ticket exists and if user has access
    const [ticket] = await db
      .select({ id: supportTickets.id, userId: supportTickets.userId })
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .limit(1);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.userId !== session.user.userId && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messagesList = await db
      .select({
        id: supportMessages.id,
        body: supportMessages.body,
        createdAt: supportMessages.createdAt,
        senderId: supportMessages.senderId,
        senderName: users.name,
        senderImage: users.image,
        senderRole: users.role,
      })
      .from(supportMessages)
      .innerJoin(users, eq(users.id, supportMessages.senderId))
      .where(eq(supportMessages.ticketId, ticketId))
      .orderBy(asc(supportMessages.createdAt));

    return NextResponse.json(messagesList);
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Add a new message to the ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const session = await auth();
  if (!session || !session.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ticketId } = await params;
  const role = session.user.role;
  const isStaff = role === "admin" || role?.startsWith("staff_");

  const json = await request.json();
  const result = createMessageSchema.safeParse(json);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }
  const body = result.data;

  try {
    // Fetch the ticket first to check permissions
    const [ticket] = await db
      .select({ id: supportTickets.id, userId: supportTickets.userId, status: supportTickets.status })
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .limit(1);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.userId !== session.user.userId && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Insert message and update ticket timestamp/status in a transaction
    await db.transaction(async (tx) => {
      await tx.insert(supportMessages).values({
        ticketId,
        senderId: session.user.userId!,
        body: body.body,
      });

      const updates: Partial<typeof supportTickets.$inferInsert> = {
        updatedAt: new Date(),
      };
      
      // If client replies to a resolved ticket, mark it open again
      if (ticket.userId === session.user.userId && ticket.status === "resolved") {
        updates.status = "open";
      }

      await tx
        .update(supportTickets)
        .set(updates)
        .where(eq(supportTickets.id, ticketId));
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to post message:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
