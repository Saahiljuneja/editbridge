import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, users, packages, editors } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin"];
const GST_RATE = 0.18; // 18% GST on platform commission (service fee)

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month"); // "YYYY-MM"

  let from: Date;
  let to: Date;

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, mon] = month.split("-").map(Number);
    from = new Date(year, mon - 1, 1);
    to = new Date(year, mon, 1); // exclusive upper bound
  } else {
    // Default: current month
    const now = new Date();
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const editorUsers = db
    .select({ editorId: editors.id, userId: editors.userId })
    .from(editors)
    .as("editor_users");

  const rows = await db
    .select({
      orderId: orders.id,
      completedAt: orders.completedAt,
      clientName: sql<string>`client_users.name`,
      clientEmail: sql<string>`client_users.email`,
      editorName: sql<string>`editor_user_tbl.name`,
      editorEmail: sql<string>`editor_user_tbl.email`,
      packageTitle: packages.title,
      totalAmount: orders.totalAmount,
      processingFee: orders.processingFee,
      commissionAmount: orders.commissionAmount,
      razorpayPaymentId: orders.razorpayPaymentId,
    })
    .from(orders)
    .innerJoin(
      sql`users AS client_users`,
      sql`client_users.id = ${orders.clientId}`
    )
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .leftJoin(editorUsers, eq(editorUsers.editorId, orders.editorId))
    .leftJoin(
      sql`users AS editor_user_tbl`,
      sql`editor_user_tbl.id = editor_users.user_id`
    )
    .where(
      and(
        eq(orders.status, "completed"),
        gte(orders.completedAt, from),
        lte(orders.completedAt, to)
      )
    )
    .orderBy(orders.completedAt);

  const label = month ?? `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`;

  // Build CSV
  const headers = [
    "Order ID",
    "Completion Date",
    "Client Name",
    "Client Email",
    "Editor Name",
    "Editor Email",
    "Package",
    "Order Amount (₹)",
    "Processing Fee (₹)",
    "Package Price (₹)",
    "Platform Commission (₹)",
    "GST on Commission 18% (₹)",
    "Total Platform Revenue incl. GST (₹)",
    "Editor Net Payout (₹)",
    "Razorpay Payment ID",
  ];

  const csvRows = rows.map((r) => {
    const packagePrice = r.totalAmount - (r.processingFee ?? 0);
    const commission = r.commissionAmount;
    const gst = Math.round(commission * GST_RATE);
    const netEditor = packagePrice - commission;

    return [
      r.orderId,
      r.completedAt ? new Date(r.completedAt).toLocaleDateString("en-IN") : "",
      r.clientName ?? "",
      r.clientEmail ?? "",
      r.editorName ?? "",
      r.editorEmail ?? "",
      r.packageTitle ?? "Custom",
      (r.totalAmount / 100).toFixed(2),
      ((r.processingFee ?? 0) / 100).toFixed(2),
      (packagePrice / 100).toFixed(2),
      (commission / 100).toFixed(2),
      (gst / 100).toFixed(2),
      ((commission + gst) / 100).toFixed(2),
      (netEditor / 100).toFixed(2),
      r.razorpayPaymentId ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });

  // Summary row
  const totals = rows.reduce(
    (acc, r) => {
      const commission = r.commissionAmount;
      const gst = Math.round(commission * GST_RATE);
      acc.total += r.totalAmount;
      acc.commission += commission;
      acc.gst += gst;
      acc.net += r.totalAmount - (r.processingFee ?? 0) - commission;
      return acc;
    },
    { total: 0, commission: 0, gst: 0, net: 0 }
  );

  csvRows.push(""); // blank line
  csvRows.push(
    [
      `"TOTAL (${rows.length} orders)"`,
      "", "", "", "", "", "",
      `"${(totals.total / 100).toFixed(2)}"`,
      "", "",
      `"${(totals.commission / 100).toFixed(2)}"`,
      `"${(totals.gst / 100).toFixed(2)}"`,
      `"${((totals.commission + totals.gst) / 100).toFixed(2)}"`,
      `"${(totals.net / 100).toFixed(2)}"`,
      "",
    ].join(",")
  );

  const csv = [headers.map((h) => `"${h}"`).join(","), ...csvRows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="editbridge-gst-${label}.csv"`,
    },
  });
}
