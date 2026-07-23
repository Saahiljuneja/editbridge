import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, comparePassword } from "@/lib/password";
import { z } from "zod";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;

  const [user] = await db
    .select({ hashedPassword: users.hashedPassword })
    .from(users)
    .where(eq(users.id, session.user.userId!))
    .limit(1);

  if (!user || !user.hashedPassword) {
    return NextResponse.json(
      { error: "Password change is not available for accounts created with Google." },
      { status: 400 }
    );
  }

  const valid = await comparePassword(currentPassword, user.hashedPassword);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const newHashed = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ hashedPassword: newHashed, updatedAt: new Date() })
    .where(eq(users.id, session.user.userId!));

  return NextResponse.json({ success: true });
}
