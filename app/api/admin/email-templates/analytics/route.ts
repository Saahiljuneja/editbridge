import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Resend } from "resend";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY!);

  try {
    const result = await resend.emails.list({ limit: 100 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emails: { last_event?: string; created_at?: string }[] = (result?.data as any)?.data ?? result?.data ?? [];

    const counts = { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, failed: 0 };
    for (const e of emails) {
      const ev = (e.last_event ?? "sent") as keyof typeof counts;
      if (ev in counts) counts[ev]++;
      else counts.sent++;
    }

    const total = emails.length;
    const deliveredOrBetter = counts.delivered + counts.opened + counts.clicked;
    const deliveryRate = total > 0 ? (deliveredOrBetter / total * 100).toFixed(1) : null;
    const openRate    = total > 0 ? ((counts.opened + counts.clicked) / total * 100).toFixed(1) : null;
    const ctr         = total > 0 ? (counts.clicked / total * 100).toFixed(1) : null;
    const bounceRate  = total > 0 ? (counts.bounced / total * 100).toFixed(1) : null;

    // 7-day daily breakdown
    const daily: Record<string, { sent: number; opened: number; bounced: number }> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      daily[d.toISOString().slice(0, 10)] = { sent: 0, opened: 0, bounced: 0 };
    }
    for (const e of emails) {
      const day = (e.created_at ?? "").slice(0, 10);
      if (day in daily) {
        daily[day].sent++;
        const ev = e.last_event ?? "sent";
        if (ev === "opened" || ev === "clicked") daily[day].opened++;
        if (ev === "bounced") daily[day].bounced++;
      }
    }
    const dailyBreakdown = Object.entries(daily).map(([date, v]) => ({ date, ...v }));

    return NextResponse.json({ ...counts, total, deliveryRate, openRate, ctr, bounceRate, dailyBreakdown });
  } catch (err) {
    console.error("[analytics] Resend error:", err);
    return NextResponse.json({ error: "Failed to fetch from Resend" }, { status: 500 });
  }
}
