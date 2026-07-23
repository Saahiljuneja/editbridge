import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AUDIT_LOG_KEY, type HistoryEntry, type AuditEntry } from "@/app/(admin)/admin/email-templates/config";

const MAX_HISTORY = 5;
const MAX_AUDIT   = 100;

async function upsert(key: string, value: string) {
  await db.insert(platformSettings).values({ key, value })
    .onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedAt: new Date() } });
}

async function readValue(key: string): Promise<string> {
  const [row] = await db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, key)).limit(1);
  return row?.value ?? "";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key } = await params;
  const { subject, body, fromName, cc, replyTo, bcc, preheader, attachment, templateLabel } = await request.json().catch(() => ({}));

  // Read previous values (for history + audit diff)
  const [prevSubject, prevBody, rawHist, rawAudit] = await Promise.all([
    readValue(`${key}_subject`),
    readValue(`${key}_body`),
    readValue(`${key}_history`),
    readValue(AUDIT_LOG_KEY),
  ]);

  // Build version history entry from previous values
  const existingHistory: HistoryEntry[] = rawHist ? JSON.parse(rawHist) : [];
  const newHistory: HistoryEntry[] = (prevSubject || prevBody)
    ? [{ subject: prevSubject, body: prevBody, savedAt: new Date().toISOString() }, ...existingHistory].slice(0, MAX_HISTORY)
    : existingHistory;

  // Determine what changed for audit note
  const changes: string[] = [];
  if (subject !== undefined && subject !== prevSubject) changes.push("subject");
  if (body    !== undefined && body    !== prevBody)    changes.push("body");
  if (fromName !== undefined) changes.push("sender name");
  if (cc       !== undefined) changes.push("CC");
  if (replyTo    !== undefined) changes.push("reply-to");
  if (bcc        !== undefined) changes.push("BCC");
  if (preheader  !== undefined) changes.push("preheader");
  if (attachment !== undefined) changes.push("attachment");
  const note = changes.length ? `Changed: ${changes.join(", ")}` : "Saved (no changes)";

  // Write template + history
  const writes: Record<string, string> = {
    [`${key}_subject`]: subject ?? prevSubject,
    [`${key}_body`]:    body    ?? prevBody,
    [`${key}_history`]: JSON.stringify(newHistory),
  };
  if (fromName !== undefined) writes[`${key}_from_name`] = fromName;
  if (cc       !== undefined) writes[`${key}_cc`]        = cc;
  if (replyTo    !== undefined) writes[`${key}_reply_to`]   = replyTo;
  if (bcc        !== undefined) writes[`${key}_bcc`]        = bcc;
  if (preheader  !== undefined) writes[`${key}_preheader`]  = preheader;
  if (attachment !== undefined) writes[`${key}_attachment`] = attachment;

  // Write audit entry
  const auditLog: AuditEntry[] = rawAudit ? JSON.parse(rawAudit) : [];
  const auditEntry: AuditEntry = {
    id: Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
    adminEmail: session.user.email ?? "admin",
    templateLabel: templateLabel ?? key,
    action: "save",
    note,
  };
  const updatedAudit = [auditEntry, ...auditLog].slice(0, MAX_AUDIT);
  writes[AUDIT_LOG_KEY] = JSON.stringify(updatedAudit);

  await Promise.all(Object.entries(writes).map(([k, v]) => upsert(k, v)));

  return NextResponse.json({ ok: true, history: newHistory });
}
