import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SUPPRESSION_KEY, type SuppressionEntry } from "@/app/(admin)/admin/email-templates/config";

async function readList(): Promise<SuppressionEntry[]> {
  const [row] = await db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, SUPPRESSION_KEY)).limit(1);
  return row?.value ? JSON.parse(row.value) : [];
}

async function writeList(list: SuppressionEntry[]) {
  const v = JSON.stringify(list);
  await db.insert(platformSettings).values({ key: SUPPRESSION_KEY, value: v })
    .onConflictDoUpdate({ target: platformSettings.key, set: { value: v, updatedAt: new Date() } });
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ list: await readList() });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, reason } = await request.json();
  if (!email || !email.includes("@")) return NextResponse.json({ error: "Valid email required" }, { status: 400 });

  const list = await readList();
  if (list.some(e => e.email === email)) return NextResponse.json({ error: "Already suppressed" }, { status: 409 });

  list.unshift({ email, addedAt: new Date().toISOString(), reason });
  await writeList(list);
  return NextResponse.json({ ok: true, count: list.length });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = await request.json();
  const list = await readList();
  const filtered = list.filter(e => e.email !== email);
  await writeList(filtered);
  return NextResponse.json({ ok: true, removed: list.length - filtered.length });
}
