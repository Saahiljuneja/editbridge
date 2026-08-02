export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orders, packages, editors, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { CalendarClient } from "./calendar-client";

export default async function CalendarPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.userId!;

  const activeOrders = await db
    .select({
      id: orders.id,
      status: orders.status,
      deadline: orders.deadline,
      createdAt: orders.createdAt,
      packageTitle: packages.title,
      editorName: users.name,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .innerJoin(editors, eq(editors.id, orders.editorId))
    .innerJoin(users, eq(users.id, editors.userId))
    .where(
      and(
        eq(orders.clientId, userId),
        sql`${orders.status} NOT IN ('cancelled')`,
        sql`${orders.deadline} IS NOT NULL`,
      ),
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <h1 className="text-xl font-bold text-gray-900">Order Calendar</h1>
        <p className="text-sm text-gray-400 mt-0.5">All your order deadlines at a glance</p>
      </div>
      <div className="px-6 py-6">
        <CalendarClient
          orders={activeOrders.map((o) => ({
            id: o.id,
            status: o.status,
            deadline: o.deadline!.toISOString(),
            createdAt: o.createdAt.toISOString(),
            packageTitle: o.packageTitle ?? "Order",
            editorName: o.editorName ?? "Editor",
          }))}
        />
      </div>
    </div>
  );
}