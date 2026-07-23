import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AddStaffForm } from "./add-staff-form";

export const dynamic = "force-dynamic";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  staff_kyc: "bg-amber-100 text-amber-700",
  staff_support: "bg-green-100 text-green-700",
  staff_dispute: "bg-orange-100 text-orange-700",
  staff_moderation: "bg-purple-100 text-purple-700",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  staff_kyc: "KYC",
  staff_support: "Support",
  staff_dispute: "Disputes",
  staff_moderation: "Moderation",
};

export default async function AdminStaffPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin/dashboard");

  const staffRows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, isActive: users.isActive })
    .from(users)
    .where(sql`${users.role} IN ('admin','staff_kyc','staff_support','staff_dispute','staff_moderation')`)
    .orderBy(desc(users.createdAt));

  return (
    <div className="px-8 py-6 ">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500 mt-0.5">{staffRows.length} member{staffRows.length !== 1 ? "s" : ""}</p>
        </div>
        <AddStaffForm />
      </div>

      <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">Member</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Role</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {staffRows.map((row) => (
              <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="font-medium text-gray-900">{row.name ?? "No name"}</p>
                  <p className="text-xs text-gray-400">{row.email}</p>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <Badge className={cn("text-xs border-0", ROLE_COLORS[row.role] ?? "bg-gray-100")}>
                    {ROLE_LABELS[row.role] ?? row.role}
                  </Badge>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className={cn("inline-flex items-center gap-1 text-xs font-medium", row.isActive ? "text-green-700" : "text-red-600")}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", row.isActive ? "bg-green-500" : "bg-red-500")} />
                    {row.isActive ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-gray-400 text-xs">{formatDate(row.createdAt)}</td>
                <td className="px-4 py-3.5 text-right">
                  <Link href={`/admin/users/${row.id}`} className="text-xs font-semibold text-[#0EA5E9] hover:underline underline-offset-2">
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
            {staffRows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm">No staff members yet. Add one above.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
