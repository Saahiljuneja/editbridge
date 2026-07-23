import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { platformSettings, users, orders } from "@/lib/db/schema";
import { eq, and, gt, notExists, sql } from "drizzle-orm";
import { sendEmail } from "@/lib/resend";
import {
  PENDING_BROADCASTS_KEY, BROADCASTS_KEY, SUPPRESSION_KEY,
  DUMMY_VARS,
  type PendingBroadcast, type BroadcastRecord, type SuppressionEntry,
} from "@/app/(admin)/admin/email-templates/config";

async function readKey(key: string) {
  const [row] = await db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, key)).limit(1);
  return row?.value ?? "[]";
}

async function writeKey(key: string, value: string) {
  await db.insert(platformSettings).values({ key, value })
    .onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedAt: new Date() } });
}

function fillVars(text: string, extra: Record<string, string> = {}): string {
  let out = text;
  for (const [k, v] of Object.entries({ ...DUMMY_VARS, ...extra })) out = out.replaceAll(k, v);
  return out;
}

type Segment = "all_clients" | "all_editors" | "inactive_clients";

async function getUsers(segment: Segment) {
  if (segment === "all_clients") return db.select({ email: users.email, name: users.name }).from(users).where(eq(users.role, "client"));
  if (segment === "all_editors") return db.select({ email: users.email, name: users.name }).from(users).where(eq(users.role, "editor"));
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  return db.select({ email: users.email, name: users.name }).from(users).where(
    and(eq(users.role, "client"), notExists(db.select({ x: sql<number>`1` }).from(orders).where(and(eq(orders.clientId, users.id), gt(orders.createdAt, cutoff)))))
  );
}

// GET — list pending broadcasts
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const list: PendingBroadcast[] = JSON.parse(await readKey(PENDING_BROADCASTS_KEY));
  return NextResponse.json({ list });
}

// POST — create a scheduled broadcast
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { segment, templateLabel, subject, body, scheduledAt } = await request.json();
  if (!segment || !subject || !body || !scheduledAt) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const list: PendingBroadcast[] = JSON.parse(await readKey(PENDING_BROADCASTS_KEY));
  const entry: PendingBroadcast = {
    id: Math.random().toString(36).slice(2),
    segment, templateLabel, subject, body,
    scheduledAt, createdAt: new Date().toISOString(),
    adminEmail: session.user.email ?? "admin",
    status: "pending",
  };
  list.unshift(entry);
  await writeKey(PENDING_BROADCASTS_KEY, JSON.stringify(list.slice(0, 50)));
  return NextResponse.json({ ok: true, id: entry.id });
}

// PATCH — cancel a pending broadcast
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  const list: PendingBroadcast[] = JSON.parse(await readKey(PENDING_BROADCASTS_KEY));
  const updated = list.map(b => b.id === id ? { ...b, status: "cancelled" as const } : b);
  await writeKey(PENDING_BROADCASTS_KEY, JSON.stringify(updated));
  return NextResponse.json({ ok: true });
}

// PUT — execute due broadcasts (called by a cron or by the UI poll)
export async function PUT() {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const list: PendingBroadcast[] = JSON.parse(await readKey(PENDING_BROADCASTS_KEY));
  const suppressed: SuppressionEntry[] = JSON.parse(await readKey(SUPPRESSION_KEY));
  const suppressedEmails = new Set(suppressed.map(e => e.email));

  const due = list.filter(b => b.status === "pending" && new Date(b.scheduledAt) <= now);
  if (due.length === 0) return NextResponse.json({ processed: 0 });

  const sentBroadcasts: BroadcastRecord[] = [];

  for (const broadcast of due) {
    const userList = await getUsers(broadcast.segment as Segment);
    let sent = 0, failed = 0;
    for (const user of userList) {
      if (suppressedEmails.has(user.email)) continue;
      try {
        const firstName = (user.name ?? "").split(" ")[0] || "there";
        await sendEmail({
          to: user.email,
          subject: fillVars(broadcast.subject, { "{{name}}": firstName, "{{clientName}}": firstName }),
          text:    fillVars(broadcast.body,    { "{{name}}": firstName, "{{clientName}}": firstName }),
        });
        sent++;
      } catch { failed++; }
    }
    sentBroadcasts.push({
      id: Math.random().toString(36).slice(2),
      timestamp: new Date().toISOString(),
      segment: broadcast.segment,
      templateLabel: broadcast.templateLabel,
      sentCount: sent, failed,
      adminEmail: broadcast.adminEmail,
    });
  }

  // Mark executed
  const updatedList = list.map(b => due.find(d => d.id === b.id) ? { ...b, status: "sent" as const } : b);
  await writeKey(PENDING_BROADCASTS_KEY, JSON.stringify(updatedList));

  // Append to broadcast history
  const history: BroadcastRecord[] = JSON.parse(await readKey(BROADCASTS_KEY));
  await writeKey(BROADCASTS_KEY, JSON.stringify([...sentBroadcasts, ...history].slice(0, 50)));

  return NextResponse.json({ processed: due.length, sent: sentBroadcasts });
}
