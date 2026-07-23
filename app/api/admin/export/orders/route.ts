import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => {
        const v = row[h];
        if (v == null) return "";
        const s = String(v).replace(/"/g, '""');
        return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
      }).join(",")
    ),
  ];
  return lines.join("\n");
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalAmount: orders.totalAmount,
      commissionAmount: orders.commissionAmount,
      packageTitle: packages.title,
      clientName: users.name,
      clientEmail: users.email,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .innerJoin(users, eq(users.id, orders.clientId))
    .orderBy(desc(orders.createdAt));

  const csv = toCSV(rows.map((r) => ({ ...r, createdAt: r.createdAt?.toISOString() ?? "" })));

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
