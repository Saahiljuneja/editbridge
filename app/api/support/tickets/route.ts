import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { supportTickets, supportMessages, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const createTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(255),
  category: z.string().min(1, "Category is required"),
  message: z.string().min(1, "Initial message is required"),
});

// GET: List all tickets for the user, or all tickets for admin/staff support
export async function GET() {
  const session = await auth();
  if (!session || !session.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const isStaff = role === "admin" || role?.startsWith("staff_");

  try {
    let ticketsList;

    if (isStaff) {
      // Staff views all tickets with user names
      ticketsList = await db
        .select({
          id: supportTickets.id,
          userId: supportTickets.userId,
          userName: users.name,
          userEmail: users.email,
          userRole: users.role,
          subject: supportTickets.subject,
          category: supportTickets.category,
          status: supportTickets.status,
          priority: supportTickets.priority,
          createdAt: supportTickets.createdAt,
          updatedAt: supportTickets.updatedAt,
        })
        .from(supportTickets)
        .innerJoin(users, eq(users.id, supportTickets.userId))
        .orderBy(desc(supportTickets.updatedAt));
    } else {
      // User views only their own tickets
      ticketsList = await db
        .select({
          id: supportTickets.id,
          userId: supportTickets.userId,
          subject: supportTickets.subject,
          category: supportTickets.category,
          status: supportTickets.status,
          priority: supportTickets.priority,
          createdAt: supportTickets.createdAt,
          updatedAt: supportTickets.updatedAt,
        })
        .from(supportTickets)
        .where(eq(supportTickets.userId, session.user.userId))
        .orderBy(desc(supportTickets.updatedAt));
    }

    return NextResponse.json(ticketsList);
  } catch (error) {
    console.error("Failed to fetch tickets:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Create a new support ticket
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const result = createTicketSchema.safeParse(json);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }
  const body = result.data;

  try {
    // Run in transaction to insert both ticket and initial message safely
    const ticketId = await db.transaction(async (tx) => {
      const [ticket] = await tx
        .insert(supportTickets)
        .values({
          userId: session.user.userId!,
          subject: body.subject,
          category: body.category,
          status: "open",
          priority: "medium",
        })
        .returning({ id: supportTickets.id });

      await tx.insert(supportMessages).values({
        ticketId: ticket.id,
        senderId: session.user.userId!,
        body: body.message,
      });

      return ticket.id;
    });

    return NextResponse.json({ ticketId, ok: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to create ticket:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
