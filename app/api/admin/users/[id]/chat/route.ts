import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { supportTickets, supportMessages } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { logAction } from "@/lib/audit";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Fetch all tickets for this user
  const tickets = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.userId, id))
    .orderBy(desc(supportTickets.createdAt));

  // Fetch messages for each ticket
  const ticketsWithMessages = await Promise.all(
    tickets.map(async (ticket) => {
      const messages = await db
        .select()
        .from(supportMessages)
        .where(eq(supportMessages.ticketId, ticket.id))
        .orderBy(asc(supportMessages.createdAt));
      return { ...ticket, messages };
    })
  );

  return NextResponse.json({ tickets: ticketsWithMessages });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { action, ticketId, subject, bodyText } = body;

  if (action === "create_ticket") {
    if (!subject || !bodyText) {
      return NextResponse.json({ error: "Subject and message are required to start a chat ticket." }, { status: 400 });
    }

    const [newTicket] = await db
      .insert(supportTickets)
      .values({
        userId: id,
        subject,
        category: "general",
        status: "open",
        priority: "medium",
      })
      .returning();

    const [newMsg] = await db
      .insert(supportMessages)
      .values({
        ticketId: newTicket.id,
        senderId: session.user.userId!,
        body: bodyText,
      })
      .returning();

    logAction({
      actorId: session.user.userId!,
      actorRole: session.user.role as UserRole,
      action: "support.ticket_create",
      entityType: "supportTicket",
      entityId: newTicket.id,
      metadata: { subject },
    });

    return NextResponse.json({ ticket: { ...newTicket, messages: [newMsg] } });
  }

  if (action === "send_message") {
    if (!ticketId || !bodyText) {
      return NextResponse.json({ error: "Ticket ID and message body are required." }, { status: 400 });
    }

    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const [newMsg] = await db
      .insert(supportMessages)
      .values({
        ticketId,
        senderId: session.user.userId!,
        body: bodyText,
      })
      .returning();

    // Reopen ticket if resolved/closed when admin sends a message
    if (ticket.status === "resolved") {
      await db.update(supportTickets).set({ status: "open", updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));
    }

    return NextResponse.json({ message: newMsg });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
