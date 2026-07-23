import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { savedEditors, editors } from "@/lib/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";

// Count of saved editors that became available in the last 3 days —
// drives the notification badge next to "Saved Editors" in the sidebar.
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "client") {
    return NextResponse.json({ count: 0 });
  }

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(savedEditors)
    .innerJoin(editors, eq(editors.id, savedEditors.editorId))
    .where(
      and(
        eq(savedEditors.clientId, session.user.userId!),
        eq(editors.isAvailable, true),
        gte(editors.updatedAt, threeDaysAgo)
      )
    );

  return NextResponse.json({ count: row?.count ?? 0 });
}
