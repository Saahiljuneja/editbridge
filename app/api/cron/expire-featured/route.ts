import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { editors, users } from "@/lib/db/schema";
import { and, eq, lt, inArray } from "drizzle-orm";
import { notifyFeaturedExpired } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const expired = await db
    .select({ id: editors.id, userId: editors.userId })
    .from(editors)
    .where(and(eq(editors.isFeatured, true), lt(editors.featuredUntil, now)));

  if (expired.length === 0) {
    return NextResponse.json({ expired: 0 });
  }

  const editorIds = expired.map((e) => e.id);
  await db.update(editors).set({ isFeatured: false, updatedAt: now }).where(inArray(editors.id, editorIds));

  const editorUsers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(inArray(users.id, expired.map((e) => e.userId)));

  const userById = new Map(editorUsers.map((u) => [u.id, u]));
  for (const e of expired) {
    const user = userById.get(e.userId);
    if (user) {
      notifyFeaturedExpired({ editorEmail: user.email, editorName: user.name ?? "" });
    }
  }

  return NextResponse.json({ expired: expired.length });
}
