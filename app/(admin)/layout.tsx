import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import type { UserRole } from "@/types";

const ADMIN_ROLES: UserRole[] = [
  "admin",
  "staff_kyc",
  "staff_support",
  "staff_dispute",
  "staff_moderation",
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.twoFactorPending) redirect("/2fa");
  if (!ADMIN_ROLES.includes(session.user.role as UserRole)) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
