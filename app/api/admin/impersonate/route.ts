import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import type { UserRole } from "@/types";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required." }, { status: 400 });
  if (userId === session.user.userId)
    return NextResponse.json({ error: "Cannot impersonate yourself." }, { status: 400 });

  const [target] = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  // Build a short-lived signed token: base64url(payload).signature
  const payload = Buffer.from(
    JSON.stringify({ userId: target.id, exp: Date.now() + 5 * 60 * 1000 })
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "")
    .update(payload)
    .digest("base64url");
  const token = `${payload}.${sig}`;

  await db.insert(auditLogs).values({
    actorId: session.user.userId,
    actorRole: session.user.role as UserRole,
    action: "user.impersonate",
    entityType: "user",
    entityId: userId,
    metadata: { targetEmail: target.email, adminEmail: session.user.email },
  });

  return NextResponse.json({ token, role: target.role });
}
