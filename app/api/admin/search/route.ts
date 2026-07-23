import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, orders, packages, disputes } from "@/lib/db/schema";
import { sql, eq } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || !session.user.role.startsWith("admin") && !session.user.role.startsWith("staff")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ users: [], orders: [], disputes: [] });

  const like = `%${q}%`;

  const [matchedUsers, matchedOrders, matchedDisputes] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(sql`${users.name} ILIKE ${like} OR ${users.email} ILIKE ${like}`)
      .limit(5),
    db.select({ id: orders.id, status: orders.status, packageTitle: packages.title, clientName: users.name })
      .from(orders)
      .leftJoin(packages, eq(packages.id, orders.packageId))
      .innerJoin(users, eq(users.id, orders.clientId))
      .where(sql`${packages.title} ILIKE ${like} OR ${users.name} ILIKE ${like} OR ${users.email} ILIKE ${like}`)
      .limit(5),
    db.select({ id: disputes.id, reason: disputes.reason, status: disputes.status })
      .from(disputes)
      .where(sql`${disputes.reason} ILIKE ${like}`)
      .limit(5),
  ]);

  return NextResponse.json({ users: matchedUsers, orders: matchedOrders, disputes: matchedDisputes });
}
