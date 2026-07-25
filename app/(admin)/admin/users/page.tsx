import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { desc, sql, count } from "drizzle-orm";
import Link from "next/link";
import type { UserRole } from "@/types";
import { UsersBulkTable } from "./users-bulk-table";

export const dynamic = "force-dynamic";

const ALLOWED: UserRole[] = ["admin", "staff_support", "staff_dispute", "staff_moderation"];

const PAGE_SIZE = 25;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) redirect("/admin/dashboard");

  const { q, role, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const whereClause = q
    ? sql`(${users.name} ILIKE ${"%" + q + "%"} OR ${users.email} ILIKE ${"%" + q + "%"})`
    : role
      ? sql`${users.role} = ${role}`
      : undefined;

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

      {/* Search */}
      <form method="GET" className="mb-5 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or email…"
          className="flex-1 a-input rounded-lg px-3 py-2"
        />
        <button type="submit" className="px-4 py-2 rounded-lg bg-[#0EA5E9] text-white text-sm font-medium hover:bg-sky-600 transition-colors">
          Search
        </button>
        {q && (
          <Link href="/admin/users" className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Clear
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
                href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(role ? { role } : {}), page: String(page - 1) }).toString()}`}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(role ? { role } : {}), page: String(page + 1) }).toString()}`}
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
