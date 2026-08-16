export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orders, packages, editors, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { CalendarClient } from "./calendar-client";
import { TopoBackground } from "@/components/common/topo-background";
import { CalendarDays } from "lucide-react";

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
    <div className="relative min-h-screen bg-slate-50/50 pb-12 overflow-hidden">
      <TopoBackground background="#f8fafc" strokeColor="#e2e8f0" opacity={0.4} />

      <div className="max-w-6xl mx-auto px-6 pt-6 space-y-6 relative z-10">
        <div className="bg-white rounded-3xl border border-neutral-200/60 p-6 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Order Calendar</h1>
            <p className="text-xs text-neutral-400 font-semibold mt-1">All your order deadlines at a glance</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5 text-brand-primary" />
          </div>
        </div>

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