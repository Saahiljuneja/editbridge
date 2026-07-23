import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { like } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Export all email_* keys from platformSettings
  const rows = await db.select().from(platformSettings).where(like(platformSettings.key, "email_%"));
  const data = Object.fromEntries(rows.map(r => [r.key, r.value]));

  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="editbridge-email-templates-${new Date().toISOString().slice(0,10)}.json"`,
    },
  });
}
