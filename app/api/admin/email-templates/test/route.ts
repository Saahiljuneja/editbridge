import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/resend";
import { DUMMY_VARS, TEST_HISTORY_KEY, type TestHistoryEntry } from "@/app/(admin)/admin/email-templates/config";
import { wrapEmailHtml, isHtmlContent, type EmailLayoutOptions } from "@/lib/email-layout";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

const LAYOUT_KEYS = ["email_layout_logo_text","email_layout_logo_image_url","email_layout_logo_image_height","email_layout_header_tagline","email_layout_header_bg","email_layout_header_text_color","email_layout_header_tagline_color","email_layout_accent_color","email_layout_body_bg","email_layout_support_email","email_layout_website_url","email_layout_help_url","email_layout_unsubscribe_url","email_layout_copyright"] as const;

async function getLayoutOpts(): Promise<EmailLayoutOptions> {
  const rows = await db.select().from(platformSettings).where(inArray(platformSettings.key, [...LAYOUT_KEYS]));
  const m = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return { logoText: m.email_layout_logo_text, logoImageUrl: m.email_layout_logo_image_url, logoImageHeight: m.email_layout_logo_image_height, headerTagline: m.email_layout_header_tagline, headerBg: m.email_layout_header_bg, headerTextColor: m.email_layout_header_text_color, headerTaglineColor: m.email_layout_header_tagline_color, accentColor: m.email_layout_accent_color, bodyBg: m.email_layout_body_bg, supportEmail: m.email_layout_support_email, websiteUrl: m.email_layout_website_url, helpUrl: m.email_layout_help_url, unsubscribeUrl: m.email_layout_unsubscribe_url, copyright: m.email_layout_copyright };
}

function fillVars(text: string): string {
  let out = text;
  for (const [k, v] of Object.entries(DUMMY_VARS)) out = out.replaceAll(k, v);
  return out;
}

async function readHistory(): Promise<TestHistoryEntry[]> {
  const [row] = await db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, TEST_HISTORY_KEY)).limit(1);
  return row?.value ? JSON.parse(row.value) : [];
}

async function appendHistory(entry: TestHistoryEntry) {
  const existing = await readHistory();
  const updated = [entry, ...existing].slice(0, 50);
  const v = JSON.stringify(updated);
  await db.insert(platformSettings).values({ key: TEST_HISTORY_KEY, value: v })
    .onConflictDoUpdate({ target: platformSettings.key, set: { value: v, updatedAt: new Date() } });
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ history: await readHistory() });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subject, body, to, preheader, templateLabel } = await request.json().catch(() => ({}));
  if (!subject || !body) {
    return NextResponse.json({ error: "subject and body are required" }, { status: 400 });
  }

  const recipient = (typeof to === "string" && to.includes("@")) ? to : session.user.email!;
  const filledBody = fillVars(body);
  const isHtml = isHtmlContent(filledBody);
  const layoutOpts = isHtml ? await getLayoutOpts() : {};

  await sendEmail({
    to: recipient,
    subject: `[Test Preview] ${fillVars(subject)}`,
    ...(isHtml
      ? { html: wrapEmailHtml(filledBody, preheader ? fillVars(preheader) : "", layoutOpts) }
      : { text: filledBody }
    ),
  });

  await appendHistory({
    id: Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
    to: recipient,
    templateLabel: typeof templateLabel === "string" ? templateLabel : "Unknown",
    adminEmail: session.user.email ?? "admin",
  });

  return NextResponse.json({ success: true, sentTo: recipient });
}

