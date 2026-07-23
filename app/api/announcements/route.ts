import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";
import { and, eq, or, isNull, gte } from "drizzle-orm";

export async function GET() {
  const now = new Date();

  const rows = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      type: announcements.type,
    })
    .from(announcements)
    .where(
      and(
        eq(announcements.isActive, true),
        or(isNull(announcements.expiresAt), gte(announcements.expiresAt, now))
      )
    )
    .limit(3);

  return NextResponse.json(rows, {
    headers: { "Cache-Control": "no-store" },
  });
}
