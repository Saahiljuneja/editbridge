import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { disputes, orders, packages, users } from "@/lib/db/schema";
import { eq, desc, sql, count, and, or, isNull, isNotNull } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

export const dynamic = "force-dynamic";

const ALLOWED: UserRole[] = ["admin", "staff_support", "staff_dispute"];
const PAGE_SIZE = 25;

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; filter?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) redirect("/admin/dashboard");

  const { tab = "open", filter = "all", page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  let whereClause = eq(disputes.status, tab as any);
  if (tab === "open") {
    if (filter === "awaiting") {
      whereClause = and(
        eq(disputes.status, "open"),
        or(isNull(disputes.evidenceText), eq(disputes.evidenceText, ""))
      ) as any;
    } else if (filter === "review") {
      whereClause = and(
        eq(disputes.status, "open"),
        and(isNotNull(disputes.evidenceText), sql`${disputes.evidenceText} != ''`)
      ) as any;
    }
  }

  const [rows, [countRow], openCount, resolvedCount, awaitingCount, reviewCount] = await Promise.all([
    db
      .select({
        id: disputes.id,
        status: disputes.status,
        reason: disputes.reason,
        evidenceText: disputes.evidenceText,
        createdAt: disputes.createdAt,
        packageTitle: packages.title,
        openerName: users.name,
        totalAmount: orders.totalAmount,
        processingFee: orders.processingFee,
        orderId: disputes.orderId,
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
    db.select({ total: count() }).from(disputes).where(eq(disputes.status, "open")).then(r => r[0]?.total ?? 0),
    db.select({ total: count() }).from(disputes).where(eq(disputes.status, "resolved")).then(r => r[0]?.total ?? 0),
    db.select({ total: count() }).from(disputes).where(and(eq(disputes.status, "open"), or(isNull(disputes.evidenceText), eq(disputes.evidenceText, "")))).then(r => r[0]?.total ?? 0),
    db.select({ total: count() }).from(disputes).where(and(eq(disputes.status, "open"), and(isNotNull(disputes.evidenceText), sql`${disputes.evidenceText} != ''`))).then(r => r[0]?.total ?? 0),
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
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Order &amp; Conflict</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Opened by</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Date Filed</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Escrow Value</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Mediation Status</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Action</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row, i) => {
              const escrow = row.totalAmount - (row.processingFee ?? 0);
              const formattedEscrow = `₹${(escrow / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

              let statusLabel = "Open";
              let badgeStyle = "bg-red-100 text-red-700";
              if (row.status === "resolved") {
                statusLabel = "Resolved";
                badgeStyle = "bg-green-100 text-green-700";
              } else {
                const editorResponded = row.evidenceText && row.evidenceText.trim().length > 0;
                if (editorResponded) {
                  statusLabel = "Ready for Review";
                  badgeStyle = "bg-sky-100 text-sky-700";
                } else {
                  statusLabel = "Awaiting Editor";
                  badgeStyle = "bg-amber-100 text-amber-700";
                }
              }

              return (
                <tr key={row.id} className={cn("border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors", i % 2 === 1 && "bg-muted/10")}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 truncate max-w-[200px]">{row.packageTitle ?? "Custom order"}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[220px] mt-0.5">{row.reason}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{row.openerName ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">{formattedEscrow}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={cn("text-[10px] border-0 font-bold px-2 py-0.5 rounded-full select-none", badgeStyle)}>
                      {statusLabel}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/disputes/${row.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-client)] hover:text-sky-700 transition-colors"
                    >
                      Arbitrate &rarr;
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  const TABS = [
    { value: "open", label: `Open (${openCount})` },
    { value: "resolved", label: `Resolved (${resolvedCount})` },
  ];

  const SUB_TABS = [
    { value: "all", label: `All Open (${openCount})` },
    { value: "awaiting", label: `Awaiting Editor Response (${awaitingCount})` },
    { value: "review", label: `Ready for Review (${reviewCount})` },
  ];

  return (
    <div className="px-8 py-6 ">
      <PageHeader title="Disputes" subtitle={`${openCount} open conflict${openCount !== 1 ? "s" : ""} awaiting resolution &middot; ${resolvedCount} resolved`} />

      {/* Main Tabs */}
      <div className="flex gap-1.5 mt-4 mb-4">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/disputes?tab=${t.value}`}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              tab === t.value
                ? "bg-[var(--brand-client)] text-white shadow-sm"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Open Sub-Tabs */}
      {tab === "open" && (
        <div className="flex gap-2 mb-5 border-b border-gray-100 pb-3">
          {SUB_TABS.map((st) => (
            <Link
              key={st.value}
              href={`/admin/disputes?tab=open&filter=${st.value}`}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide transition-all border",
                filter === st.value
                  ? "bg-sky-50 border-sky-200 text-[#0EA5E9]"
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              )}
            >
              {st.label}
            </Link>
          ))}
        </div>
      )}

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
              <p className="text-gray-400 dark:text-gray-500">
                Page {page} of {totalPages} &middot; {offset + 1}&ndash;{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/disputes?tab=${tab}&filter=${filter}&page=${page - 1}`}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    &larr; Prev
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/disputes?tab=${tab}&filter=${filter}&page=${page + 1}`}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    Next &rarr;
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
