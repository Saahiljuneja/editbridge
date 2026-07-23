import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payouts, editors, users } from "@/lib/db/schema";
import { and, eq, gte, lt } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { TaxReportDocument } from "@/components/invoice/tax-report-template";
import type { TaxReportData, MonthlyTaxRow } from "@/components/invoice/tax-report-template";
import { createElement } from "react";
import type { ReactElement } from "react";
import { formatDate } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "editor" || !session.user.editorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const yearParam = searchParams.get("year");
  const startYear = yearParam ? parseInt(yearParam, 10) : new Date().getUTCFullYear();
  if (!Number.isFinite(startYear) || startYear < 2000 || startYear > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const fyStart = new Date(Date.UTC(startYear, 3, 1)); // April 1
  const fyEnd = new Date(Date.UTC(startYear + 1, 3, 1)); // April 1 next year (exclusive)

  const [editorRow] = await db
    .select({ panNumber: editors.panNumber })
    .from(editors)
    .where(eq(editors.id, session.user.editorId))
    .limit(1);

  const [userRow] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, session.user.userId!))
    .limit(1);

  const rows = await db
    .select({
      grossAmount: payouts.grossAmount,
      commissionAmount: payouts.commissionAmount,
      netAmount: payouts.netAmount,
      settledAt: payouts.settledAt,
    })
    .from(payouts)
    .where(
      and(
        eq(payouts.editorId, session.user.editorId),
        eq(payouts.status, "completed"),
        gte(payouts.settledAt, fyStart),
        lt(payouts.settledAt, fyEnd)
      )
    );

  const monthKey = (d: Date) => d.toLocaleString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });

  const monthMap = new Map<string, MonthlyTaxRow>();
  for (const r of rows) {
    if (!r.settledAt) continue;
    const key = monthKey(r.settledAt);
    const existing = monthMap.get(key) ?? { month: key, grossEarnings: 0, commission: 0, netPayout: 0, orderCount: 0 };
    existing.grossEarnings += r.grossAmount;
    existing.commission += r.commissionAmount;
    existing.netPayout += r.netAmount;
    existing.orderCount += 1;
    monthMap.set(key, existing);
  }

  // Build all 12 months of the FY in order (Apr → Mar), zero-filled, for a complete report
  const months: MonthlyTaxRow[] = [];
  for (let i = 0; i < 12; i++) {
    const key = monthKey(new Date(Date.UTC(startYear, 3 + i, 1)));
    months.push(monthMap.get(key) ?? { month: key, grossEarnings: 0, commission: 0, netPayout: 0, orderCount: 0 });
  }

  const totalGross = months.reduce((s, m) => s + m.grossEarnings, 0);
  const totalCommission = months.reduce((s, m) => s + m.commission, 0);
  const totalNet = months.reduce((s, m) => s + m.netPayout, 0);
  const totalOrders = months.reduce((s, m) => s + m.orderCount, 0);

  const fyLabel = `${startYear}–${String(startYear + 1).slice(-2)}`;

  const data: TaxReportData = {
    editorName: userRow?.name ?? "",
    panNumber: editorRow?.panNumber ?? null,
    financialYearLabel: fyLabel,
    generatedOn: formatDate(new Date()),
    months,
    totalGross,
    totalCommission,
    totalNet,
    totalOrders,
  };

  const element = createElement(TaxReportDocument, { data }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="editbridge-income-FY${startYear}-${String(startYear + 1).slice(-2)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
