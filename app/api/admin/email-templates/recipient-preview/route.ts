import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, orders, platformSettings } from "@/lib/db/schema";
import { and, eq, gt, notExists, sql } from "drizzle-orm";
import { SUPPRESSION_KEY, type SuppressionEntry } from "@/app/(admin)/admin/email-templates/config";

type Segment = "all_clients" | "all_editors" | "inactive_clients";

async function getUsers(segment: Segment) {
  if (segment === "all_clients")
    return db.select({ email: users.email, name: users.name }).from(users).where(eq(users.role, "client"));
  if (segment === "all_editors")
    return db.select({ email: users.email, name: users.name }).from(users).where(eq(users.role, "editor"));
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  return db.select({ email: users.email, name: users.name }).from(users).where(
    and(eq(users.role, "client"), notExists(db.select({ x: sql<number>`1` }).from(orders).where(and(eq(orders.clientId, users.id), gt(orders.createdAt, cutoff)))))
  );
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const segment = (url.searchParams.get("segment") ?? "all_clients") as Segment;
  const capHoursParam = url.searchParams.get("freqCapHours");
  const capHours = capHoursParam ? parseInt(capHoursParam, 10) : 0;

  const [list, suppRow] = await Promise.all([
    getUsers(segment),
    db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, SUPPRESSION_KEY)).limit(1),
  ]);

  const suppressed: SuppressionEntry[] = suppRow[0]?.value ? JSON.parse(suppRow[0].value) : [];
  const suppressedEmails = new Set(suppressed.map(e => e.email));
  const eligible = list.filter(u => !suppressedEmails.has(u.email));

  let freqCapped = 0;
  let freqCappedEmails = new Set<string>();

  if (capHours > 0) {
    const [logRow] = await db.select({ value: platformSettings.value }).from(platformSettings)
      .where(eq(platformSettings.key, "email_send_log")).limit(1);
    const sendLog: Record<string, string> = logRow?.value ? JSON.parse(logRow.value) : {};
    const capCutoff = Date.now() - capHours * 3600_000;
    freqCappedEmails = new Set(
      eligible.filter(u => {
        const lastSent = sendLog[u.email];
        return lastSent && new Date(lastSent).getTime() > capCutoff;
      }).map(u => u.email)
    );
    freqCapped = freqCappedEmails.size;
  }

  const wouldSend = eligible.filter(u => !freqCappedEmails.has(u.email));
  const preview = wouldSend.slice(0, 5).map(u => ({ email: u.email, name: u.name ?? "" }));

  return NextResponse.json({
    preview,
    total: wouldSend.length,
    suppressed: suppressed.length,
    freqCapped,
  });
}
