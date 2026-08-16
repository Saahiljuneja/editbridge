export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { editors, users } from "@/lib/db/schema";
import { desc, sql, count, eq, ilike, or } from "drizzle-orm";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin", "staff_kyc", "staff_support", "staff_dispute"];
const PAGE_SIZE = 25;

const KYC_COLORS: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  pending:  "bg-amber-100 text-amber-700",
  expired:  "bg-gray-100 text-gray-500",
};

const TIER_COLORS: Record<string, string> = {
  hobby:   "bg-gray-100 text-gray-600",
  starter: "bg-blue-100 text-blue-900",
  pro:     "bg-violet-100 text-violet-700",
  agency:  "bg-amber-100 text-amber-700",
};

export default async function AdminEditorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kyc?: string; tier?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) redirect("/admin/dashboard");

  const { q, kyc, tier, page: pageParam } = await searchParams;
  const page   = Math.max(1, parseInt(pageParam ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const conditions: ReturnType<typeof sql>[] = [];
  if (q)   conditions.push(sql`(${users.name} ILIKE ${"%" + q + "%"} OR ${users.email} ILIKE ${"%" + q + "%"} OR ${editors.displayName} ILIKE ${"%" + q + "%"})`);
  if (kyc)  conditions.push(sql`${editors.kycStatus} = ${kyc}`);
  if (tier) conditions.push(sql`${editors.membershipTier} = ${tier}`);

  const where = conditions.length > 0
    ? sql`${conditions.reduce((acc, c) => sql`${acc} AND ${c}`)}`
    : undefined;

  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        id:             editors.id,
        userId:         editors.userId,
        displayName:    editors.displayName,
        kycStatus:      editors.kycStatus,
        membershipTier: editors.membershipTier,
        isAvailable:    editors.isAvailable,
        totalOrders:    editors.totalOrders,
        isFeatured:     editors.isFeatured,
        createdAt:      editors.createdAt,
        userName:       users.name,
        userEmail:      users.email,
      })
      .from(editors)
      .innerJoin(users, eq(editors.userId, users.id))
      .where(where)
      .orderBy(desc(editors.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ total: count() })
      .from(editors)
      .innerJoin(users, eq(editors.userId, users.id))
      .where(where),
  ]);

  const totalCount = countRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function buildLink(extra: Record<string, string>) {
    const p: Record<string, string> = {};
    if (q)   p.q   = q;
    if (kyc)  p.kyc  = kyc;
    if (tier) p.tier = tier;
    return `/admin/editors?${new URLSearchParams({ ...p, ...extra }).toString()}`;
  }

  return (
    <div className="px-8 py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="a-h1">Editors</h1>
          <p className="a-muted mt-0.5">{totalCount} editor{totalCount !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="mb-5 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or email…"
          className="flex-1 min-w-[200px] a-input rounded-lg px-3 py-2"
        />
        <select name="kyc" defaultValue={kyc ?? ""} className="a-input rounded-lg px-3 py-2 text-sm">
          <option value="">All KYC</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
        <select name="tier" defaultValue={tier ?? ""} className="a-input rounded-lg px-3 py-2 text-sm">
          <option value="">All Tiers</option>
          <option value="hobby">Hobby</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="agency">Agency</option>
        </select>
        <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--brand-client)] text-white text-sm font-medium hover:bg-[var(--brand-client-hover)] transition-colors">
          Search
        </button>
        {(q || kyc || tier) && (
          <Link href="/admin/editors" className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Editor</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">KYC</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Tier</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Orders</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700 shrink-0">
                        {(row.displayName ?? row.userName ?? "E").slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 leading-tight">
                          {row.displayName ?? row.userName ?? "No name"}
                          {row.isFeatured && (
                            <span className="ml-1.5 text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                              Featured
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">{row.userEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full capitalize", KYC_COLORS[row.kycStatus] ?? "bg-gray-100 text-gray-500")}>
                      {row.kycStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full capitalize", TIER_COLORS[row.membershipTier] ?? "bg-gray-100 text-gray-600")}>
                      {row.membershipTier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", row.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                      {row.isAvailable ? "Available" : "Away"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700 font-semibold">{row.totalOrders}</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Link href={`/admin/editors/${row.id}`} className="text-xs font-semibold text-[var(--brand-client)] hover:underline">
                        Stats →
                      </Link>
                      <Link href={`/admin/users/${row.userId}`} className="text-xs font-semibold text-gray-400 hover:underline">
                        Account
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    No editors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <p className="text-gray-400">
            Page {page} of {totalPages} · {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildLink({ page: String(page - 1) })} className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link href={buildLink({ page: String(page + 1) })} className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
