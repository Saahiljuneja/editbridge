import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.data || typeof body.data !== "object") {
    return NextResponse.json({ error: "Invalid format. Expected { data: { key: value } }" }, { status: 400 });
  }

  const entries = Object.entries(body.data as Record<string, unknown>)
    .filter(([k]) => k.startsWith("email_"))
    .map(([k, v]) => [k, String(v)] as [string, string]);

  for (const [key, value] of entries) {
    await db.insert(platformSettings).values({ key, value })
      .onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedAt: new Date() } });
  }

  return NextResponse.json({ imported: entries.length });
}
