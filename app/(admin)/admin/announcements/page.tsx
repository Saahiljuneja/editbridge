import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import type { UserRole } from "@/types";
import { AnnouncementsClient } from "./announcements-client";

export const dynamic = "force-dynamic";

const ALLOWED: UserRole[] = ["admin", "staff_moderation"];

export default async function AdminAnnouncementsPage() {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) redirect("/admin/dashboard");

  const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt));

  return <AnnouncementsClient initialRows={rows} />;
}
