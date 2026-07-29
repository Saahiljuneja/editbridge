import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, auditLogs } from "@/lib/db/schema";
import { eq, desc, asc, sql } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Ban } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

export const dynamic = "force-dynamic";

const ALLOWED: UserRole[] = ["admin", "staff_support", "staff_moderation"];

export default async function AdminFlaggedPage() {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) redirect("/admin/dashboard");

  const suspendedUsers = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, updatedAt: users.updatedAt })
    .from(users)
    .where(sql`${users.isActive} = false`)
    .orderBy(desc(users.updatedAt));

  // Get last suspend audit log for each user
  const suspendLogs = await db
    .select({ entityId: auditLogs.entityId, metadata: auditLogs.metadata, actorRole: auditLogs.actorRole, createdAt: auditLogs.createdAt, actorName: users.name })
    .from(auditLogs)
    .innerJoin(users, eq(users.id, auditLogs.actorId))
    .where(sql`${auditLogs.action} = 'user.suspend'`)
    .orderBy(asc(auditLogs.createdAt));

  const logMap = new Map(suspendLogs.map(l => [l.entityId, l]));

  return (
    <div className="px-8 py-6 ">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flagged Users</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{suspendedUsers.length} suspended account{suspendedUsers.length !== 1 ? "s" : ""}</p>
      </div>

      {suspendedUsers.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center shadow-sm">
          <Ban className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No suspended accounts</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">All users are currently active.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actioned by</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {suspendedUsers.map(user => {
                const log = logMap.get(user.id);
                const reason = (log?.metadata as Record<string, unknown>)?.reason as string | null;
                return (
                  <tr key={user.id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900 dark:text-white">{user.name ?? "No name"}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{user.email}</p>
                      <Badge className="mt-1 text-xs border-0 bg-red-100 text-red-700">Suspended</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 text-xs max-w-[200px]">
                      {reason ?? <span className="text-gray-400 dark:text-gray-500 italic">No reason given</span>}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 text-xs">
                      {log ? <><p>{log.actorName}</p><p className="text-gray-400 dark:text-gray-500">{log.actorRole}</p></> : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 dark:text-gray-500 text-xs">{formatDate(user.updatedAt)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/admin/users/${user.id}`} className="text-xs font-semibold text-[var(--brand-client)] hover:underline underline-offset-2">
                        Manage →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
