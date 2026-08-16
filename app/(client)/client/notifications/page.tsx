export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { and, eq, desc, gte, lt } from "drizzle-orm";
import { NotificationsClient } from "./notifications-client";

export const metadata = { title: "Notifications — EditBridge" };

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.userId!;
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Auto-delete older than 30 days
  await db.delete(notifications).where(lt(notifications.createdAt, cutoff)).catch(() => {});

  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), gte(notifications.createdAt, cutoff)))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return <NotificationsClient initialNotifications={rows} accent="#1e40af" />;
}
