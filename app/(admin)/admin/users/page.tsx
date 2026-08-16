import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { desc, sql, count, eq, and, or, ilike } from "drizzle-orm";
import Link from "next/link";
import type { UserRole } from "@/types";
import { UsersBulkTable } from "./users-bulk-table";

export const dynamic = "force-dynamic";

const ALLOWED: UserRole[] = ["admin", "staff_support", "staff_dispute", "staff_moderation"];

const PAGE_SIZE = 25;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) redirect("/admin/dashboard");

  const { q, role, status, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  // Build conditions array
  const conditions = [];

  if (q) {
    conditions.push(
      or(
        ilike(users.name, `%${q}%`),
        ilike(users.email, `%${q}%`)
      )
    );
  }

  if (role && role !== "all") {
    conditions.push(eq(users.role, role as UserRole));
  }

  if (status && status !== "all") {
    conditions.push(eq(users.isActive, status === "active"));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select({ total: count() }).from(users).where(whereClause),
  ]);
  const totalCount = countRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="px-8 py-6">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="a-h1">Users</h1>
          <p className="a-muted mt-0.5">{totalCount} user{totalCount !== 1 ? "s" : ""}</p>
        </div>
        {session.user.role === "admin" && (
          <a
            href="/api/admin/export/users"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            ↓ Export CSV
          </a>
        )}
      </div>

      {/* Search and Filters */}
      <form method="GET" className="mb-6 flex flex-col md:flex-row gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or email…"
          className="flex-1 a-input rounded-xl px-4 py-2.5 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />

        {/* Role Filter */}
        <select
          name="role"
          defaultValue={role ?? "all"}
          className="a-input rounded-xl px-4 py-2.5 border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
        >
          <option value="all">All Roles</option>
          <option value="client">Client</option>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
          <option value="staff_kyc">KYC Staff</option>
          <option value="staff_support">Support Staff</option>
          <option value="staff_dispute">Dispute Staff</option>
          <option value="staff_moderation">Moderation Staff</option>
        </select>

        {/* Status Filter */}
        <select
          name="status"
          defaultValue={status ?? "all"}
          className="a-input rounded-xl px-4 py-2.5 border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Suspended</option>
        </select>

        <button type="submit" className="px-5 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-bold hover:bg-brand-primary-hover transition-all cursor-pointer">
          Apply Filters
        </button>

        {(q || (role && role !== "all") || (status && status !== "all")) && (
          <Link href="/admin/users" className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all text-center">
            Reset
          </Link>
        )}
      </form>

      <UsersBulkTable
        rows={rows}
        currentUserId={session.user.userId!}
        canBulkAction={["admin", "staff_moderation", "staff_support"].includes(session.user.role)}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <p className="text-gray-400 dark:text-gray-500">
            Page {page} of {totalPages} · showing {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(role ? { role } : {}), ...(status ? { status } : {}), page: String(page - 1) }).toString()}`}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(role ? { role } : {}), ...(status ? { status } : {}), page: String(page + 1) }).toString()}`}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
