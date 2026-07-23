import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, editors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { nameSchema } from "@/lib/validations";
import { onEditorCreated } from "@/lib/rewards";
import { logAuthRejection } from "@/lib/auth-logger";

const schema = z.object({
  role: z.enum(["client", "editor"]),
  name: nameSchema,
});

export async function POST(request: NextRequest) {
  const session = await auth();
  console.log("[onboarding API] session:", session?.user?.userId, session?.user?.role);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    logAuthRejection("onboarding", parsed.error.issues[0].message, request, {
      userId: session.user.userId,
      fields: parsed.error.issues.map((i) => i.path.join(".")),
    });
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { role, name } = parsed.data;
  const userId = session.user.userId!;

  await db
    .update(users)
    .set({ role, name, onboarded: true, updatedAt: new Date() })
    .where(eq(users.id, userId));

  if (role === "editor") {
    const [existing] = await db
      .select({ id: editors.id })
      .from(editors)
      .where(eq(editors.userId, userId))
      .limit(1);

    if (!existing) {
      await db.insert(editors).values({ userId });
      onEditorCreated(userId).catch(() => {});
    }
  }

  return NextResponse.json({ success: true, role });
}
