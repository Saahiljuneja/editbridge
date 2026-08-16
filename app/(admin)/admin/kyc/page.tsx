import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { kycApplications, editors, users } from "@/lib/db/schema";
import { eq, desc, sql, and, count } from "drizzle-orm";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { FileCheck, Search, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import { KycBulkTable } from "./kyc-bulk-table";

export const dynamic = "force-dynamic";

const ALLOWED: UserRole[] = ["admin", "staff_kyc"];

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
    { value: "pending", label: "Pending Verification" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <div className="px-8 py-8 relative min-h-screen">
      
      {/* Background ambient glowing gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/20 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-brand-primary mb-1">Operations Desk</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none">KYC Queue</h1>
          <p className="text-xs text-gray-400 mt-1.5 font-medium">
            {totalCount} active application{totalCount !== 1 ? "s" : ""} in {status} status
          </p>
        </div>
      </div>

      {/* Search and Filters Segment */}
      <div className="bg-white rounded-3xl border border-gray-150 p-5 shadow-xl shadow-gray-100/20 mb-6 space-y-4">
        
        {/* Search Input and Buttons */}
        <form method="GET" className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by editor name or email…"
              className="w-full rounded-2xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary shadow-sm transition-all"
            />
          </div>
          <input type="hidden" name="status" value={status} />
          
          <div className="flex gap-2">
            <button type="submit" className="px-5 py-2.5 rounded-2xl bg-brand-primary text-white text-sm font-bold hover:bg-brand-primary-hover transition-all shadow-md shadow-blue-800/15 cursor-pointer">
              Search
            </button>
            {q && (
              <Link href={`/admin/kyc?status=${status}`} className="px-4 py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5">
                <X className="w-3.5 h-3.5" /> Clear
              </Link>
            )}
          </div>
        </form>

        {/* Status segmented controller */}
        <div className="flex items-center gap-3 border-t border-gray-100 pt-4 flex-wrap">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Queue status:</span>
          <div className="inline-flex p-1 bg-gray-100/80 rounded-2xl gap-1">
            {STATUS_TABS.map((tab) => (
              <Link
                key={tab.value}
                href={`/admin/kyc?status=${tab.value}${q ? `&q=${q}` : ""}`}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer",
                  status === tab.value
                    ? "bg-white text-brand-primary shadow-sm"
                    : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

      </div>

      {/* Main Table or Empty State */}
      {rows.length === 0 ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-16 text-center shadow-xl shadow-gray-100/30 flex flex-col items-center justify-center min-h-[340px]">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 border border-blue-100 animate-pulse">
            <FileCheck className="w-8 h-8 text-brand-primary" />
          </div>
          <h3 className="text-base font-bold text-gray-900 capitalize">No {status} applications</h3>
          <p className="text-xs text-gray-450 max-w-sm mt-2 leading-relaxed">
            {status === "pending" 
              ? "All KYC document submissions from editors have been reviewed and verified. Great job!" 
              : `There are currently no editor applications marked as ${status}.`}
          </p>
          {q && (
            <Link href={`/admin/kyc?status=${status}`} className="mt-4 text-xs font-bold text-brand-primary bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-all">
              Clear search query
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <KycBulkTable rows={rows} status={status} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1 py-2 text-sm">
              <p className="text-gray-400 font-medium">
                Page {page} of {totalPages} · showing {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/kyc?${new URLSearchParams({ status, ...(q ? { q } : {}), page: String(page - 1) }).toString()}`}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-xs font-semibold"
                  >
                    ← Prev
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/kyc?${new URLSearchParams({ status, ...(q ? { q } : {}), page: String(page + 1) }).toString()}`}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-xs font-semibold"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
