import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { disputes, orders, packages, users } from "@/lib/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin", "staff_support", "staff_dispute"];
const PAGE_SIZE = 25;

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) redirect("/admin/dashboard");

  const { tab = "open", page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const whereClause = sql`${disputes.status} = ${tab}`;

  const [rows, [countRow], openCount, resolvedCount] = await Promise.all([
    db
      .select({
        id: disputes.id,
        status: disputes.status,
        reason: disputes.reason,
        createdAt: disputes.createdAt,
        packageTitle: packages.title,
        openerName: users.name,
      })
      .from(disputes)
      .innerJoin(orders, eq(orders.id, disputes.orderId))
      .leftJoin(packages, eq(packages.id, orders.packageId))
      .innerJoin(users, eq(users.id, disputes.openedBy))
      .where(whereClause)
      .orderBy(desc(disputes.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ total: count() }).from(disputes).where(whereClause),
    db.select({ total: count() }).from(disputes).where(sql`${disputes.status} = 'open'`).then(r => r[0]?.total ?? 0),
    db.select({ total: count() }).from(disputes).where(sql`${disputes.status} = 'resolved'`).then(r => r[0]?.total ?? 0),
  ]);
  const totalCount = countRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function DisputeTable({ list }: { list: typeof rows }) {
    if (list.length === 0) return null;
    return (
      <div className="rounded-xl border border-border overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Opened by</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row, i) => (
              <tr key={row.id} className={cn("border-b border-border last:border-0", i % 2 === 1 && "bg-muted/20")}>
                <td className="px-4 py-3">
                  <p className="font-medium truncate max-w-[180px]">{row.packageTitle ?? "Custom order"}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">{row.reason}</p>
                </td>
                <td className="px-4 py-3">{row.openerName ?? "Unknown"}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(row.createdAt)}</td>
                <td className="px-4 py-3 text-center">
                  <Badge className={cn("text-xs border-0", row.status === "open" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                    {row.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/disputes/${row.id}`} className="text-xs font-semibold text-[#0EA5E9] hover:underline underline-offset-2">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const TABS = [
    { value: "open", label: `Open (${openCount})` },
    { value: "resolved", label: `Resolved (${resolvedCount})` },
  ];

  return (
    <div className="px-8 py-6 ">
      <PageHeader title="Disputes" subtitle={`${openCount} open Â· ${resolvedCount} resolved`} />

      {/* Tabs */}
      <div className="flex gap-1.5 mt-4 mb-5">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/disputes?tab=${t.value}`}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              tab === t.value
                ? "bg-[#0EA5E9] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="w-8 h-8 text-muted-foreground" />}
          heading="No disputes"
          description={`No ${tab} disputes found.`}
        />
      ) : (
        <>
          <DisputeTable list={rows} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <p className="text-gray-400">
                Page {page} of {totalPages} Â· {offset + 1}â€“{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/disputes?tab=${tab}&page=${page - 1}`}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    â† Prev
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/disputes?tab=${tab}&page=${page + 1}`}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Next â†’
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
