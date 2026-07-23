import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AUDIT_LOG_KEY, type AuditEntry } from "@/app/(admin)/admin/email-templates/config";

const MAX_ENTRIES = 100;

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [row] = await db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, AUDIT_LOG_KEY)).limit(1);
  const log: AuditEntry[] = row?.value ? JSON.parse(row.value) : [];
  return NextResponse.json({ log });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entry: Omit<AuditEntry, "id" | "timestamp" | "adminEmail"> = await request.json();

  const [row] = await db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, AUDIT_LOG_KEY)).limit(1);
  const existing: AuditEntry[] = row?.value ? JSON.parse(row.value) : [];

  const newEntry: AuditEntry = {
    id: Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
    adminEmail: session.user.email ?? "admin",
    ...entry,
  };

  const updated = [newEntry, ...existing].slice(0, MAX_ENTRIES);

  await db.insert(platformSettings).values({ key: AUDIT_LOG_KEY, value: JSON.stringify(updated) })
    .onConflictDoUpdate({ target: platformSettings.key, set: { value: JSON.stringify(updated), updatedAt: new Date() } });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.insert(platformSettings).values({ key: AUDIT_LOG_KEY, value: "[]" })
    .onConflictDoUpdate({ target: platformSettings.key, set: { value: "[]", updatedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
