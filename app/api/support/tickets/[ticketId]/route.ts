import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { supportTickets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateTicketSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

export async function PATCH(
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
  const result = updateTicketSchema.safeParse(json);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }
  const body = result.data;

  try {
    // Fetch the ticket first to check permissions
    const [ticket] = await db
      .select({ id: supportTickets.id, userId: supportTickets.userId })
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .limit(1);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Permission check: User can only update status to close, staff can change priority & status
    if (ticket.userId !== session.user.userId && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates: Partial<typeof supportTickets.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body.status) updates.status = body.status;
    if (body.priority && isStaff) updates.priority = body.priority;

    await db
      .update(supportTickets)
      .set(updates)
      .where(eq(supportTickets.id, ticketId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update ticket:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
