import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, orders, platformSettings } from "@/lib/db/schema";
import { and, eq, gt, inArray, notExists, sql } from "drizzle-orm";
import { sendEmail } from "@/lib/resend";
import { DUMMY_VARS, BROADCASTS_KEY, SUPPRESSION_KEY, AUDIT_LOG_KEY, type BroadcastRecord, type SuppressionEntry, type AuditEntry } from "@/app/(admin)/admin/email-templates/config";
import { wrapEmailHtml, isHtmlContent, type EmailLayoutOptions } from "@/lib/email-layout";

const LAYOUT_KEYS = ["email_layout_logo_text","email_layout_logo_image_url","email_layout_logo_image_height","email_layout_header_tagline","email_layout_header_bg","email_layout_header_text_color","email_layout_header_tagline_color","email_layout_accent_color","email_layout_body_bg","email_layout_support_email","email_layout_website_url","email_layout_help_url","email_layout_unsubscribe_url","email_layout_copyright"];

async function getLayoutOpts(): Promise<EmailLayoutOptions> {
  const rows = await db.select().from(platformSettings).where(inArray(platformSettings.key, LAYOUT_KEYS));
  const m = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return { logoText: m.email_layout_logo_text, logoImageUrl: m.email_layout_logo_image_url, logoImageHeight: m.email_layout_logo_image_height, headerTagline: m.email_layout_header_tagline, headerBg: m.email_layout_header_bg, headerTextColor: m.email_layout_header_text_color, headerTaglineColor: m.email_layout_header_tagline_color, accentColor: m.email_layout_accent_color, bodyBg: m.email_layout_body_bg, supportEmail: m.email_layout_support_email, websiteUrl: m.email_layout_website_url, helpUrl: m.email_layout_help_url, unsubscribeUrl: m.email_layout_unsubscribe_url, copyright: m.email_layout_copyright };
}

function fillVars(text: string, extra: Record<string, string> = {}): string {
  let out = text;
  for (const [k, v] of Object.entries({ ...DUMMY_VARS, ...extra })) out = out.replaceAll(k, v);
  return out;
}

type Segment = "all_clients" | "all_editors" | "inactive_clients";

async function getUsers(segment: Segment) {
  if (segment === "all_clients") {
    return db.select({ email: users.email, name: users.name }).from(users).where(eq(users.role, "client"));
  }
  if (segment === "all_editors") {
    return db.select({ email: users.email, name: users.name }).from(users).where(eq(users.role, "editor"));
  }
  // inactive_clients: clients with no order in last 90 days
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  return db.select({ email: users.email, name: users.name })
    .from(users)
    .where(
      and(
        eq(users.role, "client"),
        notExists(
          db.select({ x: sql<number>`1` }).from(orders)
            .where(and(eq(orders.clientId, users.id), gt(orders.createdAt, cutoff)))
        )
      )
    );
}

// GET ?segment=xxx â†’ return count
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const segment = (new URL(request.url).searchParams.get("segment") ?? "all_clients") as Segment;
  const list = await getUsers(segment);
  return NextResponse.json({ count: list.length });
}

// POST â†’ send broadcast
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subject, body, segment, templateLabel } = await request.json();
  if (!subject || !body || !segment) return NextResponse.json({ error: "subject, body, segment required" }, { status: 400 });

  // Check global pause
  const [pauseRow] = await db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, "email_paused")).limit(1);
  if (pauseRow?.value === "true") return NextResponse.json({ error: "All emails are paused. Unpause in Settings." }, { status: 503 });

  // Check send window (hours in IST, 0â€“23)
  const [winStartRow, winEndRow] = await Promise.all([
    db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, "email_send_window_start")).limit(1),
    db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, "email_send_window_end")).limit(1),
  ]);
  const winStart = winStartRow[0]?.value ? parseInt(winStartRow[0].value, 10) : null;
  const winEnd   = winEndRow[0]?.value   ? parseInt(winEndRow[0].value,   10) : null;
  if (winStart !== null && winEnd !== null) {
    const istHour = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false });
    const h = parseInt(istHour, 10);
    if (h < winStart || h >= winEnd) {
      return NextResponse.json({ error: `Send window is ${winStart}:00â€“${winEnd}:00 IST. Current IST hour: ${h}.` }, { status: 503 });
    }
  }

  const list = await getUsers(segment as Segment);

  // Load suppression list
  const [suppRow] = await db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, SUPPRESSION_KEY)).limit(1);
  const suppressed: SuppressionEntry[] = suppRow?.value ? JSON.parse(suppRow.value) : [];
  const suppressedEmails = new Set(suppressed.map(e => e.email));

  // Load throttle setting (ms between sends, default 0)
  const [throttleRow] = await db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, "email_broadcast_throttle_ms")).limit(1);
  const throttleMs = parseInt(throttleRow?.value ?? "0", 10) || 0;

  // Load frequency cap (hours, 0 = no cap)
  const [capRow, sendLogRow] = await Promise.all([
    db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, "email_freq_cap_hours")).limit(1),
    db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, "email_send_log")).limit(1),
  ]);
  const capHours = parseInt(capRow?.[0]?.value ?? "0", 10) || 0;
  const sendLog: Record<string, string> = sendLogRow?.[0]?.value ? JSON.parse(sendLogRow[0].value) : {};
  const capCutoff = capHours > 0 ? Date.now() - capHours * 3600_000 : 0;

  const layoutOpts = await getLayoutOpts();
  let sent = 0;
  let freqCapped = 0;
  const failed: string[] = [];

  for (const user of list) {
    if (suppressedEmails.has(user.email)) continue;
    if (capHours > 0) {
      const lastSent = sendLog[user.email];
      if (lastSent && new Date(lastSent).getTime() > capCutoff) { freqCapped++; continue; }
    }
    try {
      const firstName = (user.name ?? "").split(" ")[0] || "there";
      const filledBody = fillVars(body, { "{{name}}": firstName, "{{clientName}}": firstName });
      const bodyIsHtml = isHtmlContent(filledBody);
      await sendEmail({
        to: user.email,
        subject: fillVars(subject, { "{{name}}": firstName, "{{clientName}}": firstName }),
        ...(bodyIsHtml
          ? { html: wrapEmailHtml(filledBody, "", layoutOpts) }
          : { text: filledBody }
        ),
      });
      sent++;
      sendLog[user.email] = new Date().toISOString();
      if (throttleMs > 0) await new Promise(r => setTimeout(r, throttleMs));
    } catch {
      failed.push(user.email);
    }
  }

  // Persist updated send log (trim entries older than 30 days)
  if (capHours > 0 || sent > 0) {
    const keepCutoff = Date.now() - 30 * 86400_000;
    for (const [email, ts] of Object.entries(sendLog)) {
      if (new Date(ts).getTime() < keepCutoff) delete sendLog[email];
    }
    const logVal = JSON.stringify(sendLog);
    await db.insert(platformSettings).values({ key: "email_send_log", value: logVal })
      .onConflictDoUpdate({ target: platformSettings.key, set: { value: logVal, updatedAt: new Date() } });
  }

  // Persist broadcast record
  const [row] = await db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, BROADCASTS_KEY)).limit(1);
  const existing: BroadcastRecord[] = row?.value ? JSON.parse(row.value) : [];
  const record: BroadcastRecord = {
    id: Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
    segment,
    templateLabel: templateLabel ?? "Unknown",
    sentCount: sent,
    adminEmail: session.user.email ?? "admin",
    failed: failed.length,
    failedEmails: failed.slice(0, 20),
  };
  const updated = [record, ...existing].slice(0, 50);
  await db.insert(platformSettings).values({ key: BROADCASTS_KEY, value: JSON.stringify(updated) })
    .onConflictDoUpdate({ target: platformSettings.key, set: { value: JSON.stringify(updated), updatedAt: new Date() } });

  // Write to audit log
  const auditEntry: AuditEntry = {
    id: Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
    adminEmail: session.user.email ?? "admin",
    templateLabel: templateLabel ?? "Unknown",
    action: "broadcast",
    note: `Sent to ${sent} ${segment.replace(/_/g," ")}${failed.length > 0 ? ` (${failed.length} failed)` : ""}`,
  };
  const [auditRow] = await db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, AUDIT_LOG_KEY)).limit(1);
  const auditLog: AuditEntry[] = auditRow?.value ? JSON.parse(auditRow.value) : [];
  const auditUpdated = [auditEntry, ...auditLog].slice(0, 100);
  await db.insert(platformSettings).values({ key: AUDIT_LOG_KEY, value: JSON.stringify(auditUpdated) })
    .onConflictDoUpdate({ target: platformSettings.key, set: { value: JSON.stringify(auditUpdated), updatedAt: new Date() } });

  return NextResponse.json({ sent, failed: failed.length, freqCapped, total: list.length });
}


