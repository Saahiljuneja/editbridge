import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, editors, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(cols: (string | number | null | undefined)[]): string {
  return cols.map(escapeCsv).join(",");
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "client") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      packageTitle: packages.title,
      packageTier: packages.tier,
      editorName: users.name,
      totalAmount: orders.totalAmount,
      processingFee: orders.processingFee,
      createdAt: orders.createdAt,
      completedAt: orders.completedAt,
      deadline: orders.deadline,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .innerJoin(editors, eq(editors.id, orders.editorId))
    .innerJoin(users, eq(users.id, editors.userId))
    .where(eq(orders.clientId, session.user.userId!))
    .orderBy(desc(orders.createdAt));

  const headers = ["Order ID", "Status", "Package", "Tier", "Editor", "Amount (₹)", "Processing Fee (₹)", "Package Price (₹)", "Date Placed", "Completed", "Deadline"];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      row([
        r.id,
        r.status,
        r.packageTitle,
        r.packageTier,
        r.editorName,
        (r.totalAmount / 100).toFixed(2),
        ((r.processingFee ?? 0) / 100).toFixed(2),
        ((r.totalAmount - (r.processingFee ?? 0)) / 100).toFixed(2),
        r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "",
        r.completedAt ? new Date(r.completedAt).toISOString().slice(0, 10) : "",
        r.deadline ? new Date(r.deadline).toISOString().slice(0, 10) : "",
      ])
    ),
  ];

  const csv = lines.join("\n");
  const filename = `editbridge-orders-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
