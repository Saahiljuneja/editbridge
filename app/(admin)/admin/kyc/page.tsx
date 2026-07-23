import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { kycApplications, editors, users } from "@/lib/db/schema";
import { eq, desc, sql, and, count } from "drizzle-orm";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { FileCheck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import { KycBulkTable } from "./kyc-bulk-table";

export const dynamic = "force-dynamic";

const ALLOWED: UserRole[] = ["admin", "staff_kyc"];

const STATUS_CONFIG: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const PAGE_SIZE = 25;

export default async function AdminKycQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) redirect("/admin/dashboard");

  const { q, status = "pending", page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const whereClause = and(
    sql`${kycApplications.status} = ${status}`,
    q ? sql`(${users.name} ILIKE ${"%" + q + "%"} OR ${users.email} ILIKE ${"%" + q + "%"})` : undefined
  );

  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        id: kycApplications.id,
        editorId: kycApplications.editorId,
        documentType: kycApplications.documentType,
        status: kycApplications.status,
        createdAt: kycApplications.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(kycApplications)
      .innerJoin(editors, eq(editors.id, kycApplications.editorId))
      .innerJoin(users, eq(users.id, editors.userId))
      .where(whereClause)
      .orderBy(desc(kycApplications.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ total: count() })
      .from(kycApplications)
      .innerJoin(editors, eq(editors.id, kycApplications.editorId))
      .innerJoin(users, eq(users.id, editors.userId))
      .where(whereClause),
  ]);
  const totalCount = countRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const STATUS_TABS = [
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <div className="px-8 py-6 ">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">KYC Queue</h1>
        <p className="text-sm text-gray-500 mt-0.5">{totalCount} application{totalCount !== 1 ? "s" : ""}</p>
      </div>

      {/* Search + filter bar */}
      <form method="GET" className="flex gap-2 mb-5">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or email…"
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30"
        />
        <input type="hidden" name="status" value={status} />
        <button type="submit" className="px-4 py-2 rounded-xl bg-[#0EA5E9] text-white text-sm font-medium hover:bg-sky-600 transition-colors">
          Search
        </button>
        {q && (
          <Link href={`/admin/kyc?status=${status}`} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
            Clear
          </Link>
        )}
      </form>

      {/* Status tabs */}
      <div className="flex gap-1.5 mb-5">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/kyc?status=${tab.value}${q ? `&q=${q}` : ""}`}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              status === tab.value
                ? "bg-[#0EA5E9] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <FileCheck className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No {status} applications</p>
          <p className="text-xs text-gray-400 mt-1">
            {status === "pending" ? "All KYC applications have been reviewed." : `No ${status} applications found.`}
          </p>
        </div>
      ) : (
        <>
          <KycBulkTable rows={rows} status={status} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1 py-2 text-sm">
              <p className="text-gray-400">
                Page {page} of {totalPages} · {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/kyc?${new URLSearchParams({ status, ...(q ? { q } : {}), page: String(page - 1) }).toString()}`}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    ← Prev
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/kyc?${new URLSearchParams({ status, ...(q ? { q } : {}), page: String(page + 1) }).toString()}`}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Next →
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
