import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const STAFF_ROLES = ["staff_kyc", "staff_support", "staff_dispute", "staff_moderation", "admin"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, role } = await req.json();
  if (!email || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    return NextResponse.json({ error: "No account found with that email." }, { status: 404 });
  }

  await db.update(users).set({ role }).where(eq(users.id, user.id));

  await db.insert(auditLogs).values({
    actorId: session.user.userId,
    actorRole: session.user.role,
    action: "user.role_change",
    entityType: "user",
    entityId: user.id,
    metadata: { from: user.role, to: role, targetEmail: email },
  });

  return NextResponse.json({ ok: true });
}
