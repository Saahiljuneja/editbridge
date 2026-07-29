import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, orders } from "@/lib/db/schema";
import { count } from "drizzle-orm";
import { SystemHealthClient } from "./system-health-client";

export const dynamic = "force-dynamic";


export default async function AdminSystemPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin/dashboard");

  const [totalUsers, activeOrders] = await Promise.all([
    db.select({ value: count() }).from(users).then(r => r[0].value),
    db.select({ value: count() }).from(orders).then(r => r[0].value),
  ]);

  return (
    <div className="px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Health</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Live process stats, service status, and queue depths.</p>
      </div>

      <SystemHealthClient totalUsers={totalUsers} activeOrders={activeOrders} />
    </div>
  );
}
