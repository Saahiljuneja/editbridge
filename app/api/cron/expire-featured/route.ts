import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { editors, users } from "@/lib/db/schema";
import { and, eq, lt, inArray } from "drizzle-orm";
import { notifyFeaturedExpired } from "@/lib/notifications";
import { revalidatePublicPagesCache } from "@/lib/revalidate";
import { updateCronHeartbeat } from "@/lib/cron-heartbeat";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron] CRON_SECRET is not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const expired = await db
    .select({ id: editors.id, userId: editors.userId })
    .from(editors)
    .where(and(eq(editors.isFeatured, true), lt(editors.featuredUntil, now)));

  if (expired.length === 0) {
    await updateCronHeartbeat("expire-featured");
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

  revalidatePublicPagesCache();
  await updateCronHeartbeat("expire-featured");
  return NextResponse.json({ expired: expired.length });
}
