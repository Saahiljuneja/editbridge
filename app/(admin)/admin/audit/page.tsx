import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import Link from "next/link";

const ACTION_COLORS: Record<string, string> = {
  "kyc.approve":             "bg-green-50 text-green-700 border-green-200",
  "kyc.reject":              "bg-red-50 text-red-700 border-red-200",
  "dispute.resolve":         "bg-amber-50 text-amber-700 border-amber-200",
  "user.role_change":        "bg-blue-50 text-blue-700 border-blue-200",
  "broadcast.send":          "bg-purple-50 text-purple-700 border-purple-200",
  "broadcast.edit":          "bg-purple-50 text-purple-700 border-purple-200",
  "broadcast.delete":        "bg-red-50 text-red-700 border-red-200",
  "announcement.create":     "bg-indigo-50 text-indigo-700 border-indigo-200",
  "announcement.edit":       "bg-indigo-50 text-indigo-700 border-indigo-200",
  "announcement.activate":   "bg-green-50 text-green-700 border-green-200",
  "announcement.deactivate": "bg-gray-100 text-gray-600 border-gray-200",
  "announcement.delete":     "bg-red-50 text-red-700 border-red-200",
};

const PAGE_SIZE = 50;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin/dashboard");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        actorRole: auditLogs.actorRole,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        actorName: users.name,
        actorEmail: users.email,
      })
      .from(auditLogs)
      .innerJoin(users, eq(users.id, auditLogs.actorId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ total: count() }).from(auditLogs),
  ]);

  const totalCount = countRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="p-6">
      <PageHeader
        title="Audit Log"
        subtitle={`${totalCount} entries — all admin and staff actions recorded for compliance.`}
      />

      <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actor</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entity</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Details</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No audit entries yet.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                      ACTION_COLORS[row.action] ?? "bg-gray-50 text-gray-700 border-gray-200"
                    }`}
                  >
                    {row.action}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{row.actorName ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{row.actorRole}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-muted-foreground">{row.entityType}</p>
                  <p className="text-xs font-mono text-muted-foreground">{row.entityId.slice(0, 8)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                    {row.metadata ? JSON.stringify(row.metadata) : "—"}
                  </p>
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {new Date(row.createdAt).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <p className="text-gray-400 dark:text-gray-500">
            Page {page} of {totalPages} · showing {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/audit?page=${page - 1}`}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/audit?page=${page + 1}`}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
