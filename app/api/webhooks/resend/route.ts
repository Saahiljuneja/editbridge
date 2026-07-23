import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SUPPRESSION_KEY, type SuppressionEntry } from "@/app/(admin)/admin/email-templates/config";

// Auto-add hard bounces and unsubscribes to the suppression list.
// Configure in Resend dashboard: Webhooks → add this URL, select "email.bounced" and "email.complained".
// Optionally set RESEND_WEBHOOK_SECRET and verify the svix signature here.

async function readList(): Promise<SuppressionEntry[]> {
  const [row] = await db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, SUPPRESSION_KEY)).limit(1);
  return row?.value ? JSON.parse(row.value) : [];
}

async function writeList(list: SuppressionEntry[]) {
  const v = JSON.stringify(list);
  await db.insert(platformSettings).values({ key: SUPPRESSION_KEY, value: v })
    .onConflictDoUpdate({ target: platformSettings.key, set: { value: v, updatedAt: new Date() } });
}

export async function POST(request: NextRequest) {
  let payload: { type?: string; data?: { email?: { to?: string[] }; created_at?: string } };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const type   = payload?.type;
  const toList = payload?.data?.email?.to ?? [];

  // Handle hard bounces and spam complaints — both should suppress
  if (type === "email.bounced" || type === "email.complained") {
    const list = await readList();
    const existing = new Set(list.map(e => e.email));
    const reason = type === "email.bounced" ? "Hard bounce (auto)" : "Spam complaint (auto)";
    let added = 0;
    for (const email of toList) {
      if (!existing.has(email)) {
        list.unshift({ email, addedAt: new Date().toISOString(), reason });
        existing.add(email);
        added++;
      }
    }
    if (added > 0) await writeList(list);
    return NextResponse.json({ ok: true, suppressed: added });
  }

  return NextResponse.json({ ok: true, skipped: true });
}
