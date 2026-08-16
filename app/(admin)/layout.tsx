import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AdminThemeProvider } from "@/components/admin/admin-theme-provider";
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
  if (!ADMIN_ROLES.includes(session.user.role as UserRole)) redirect("/client/dashboard");

  return (
    <AdminThemeProvider>
      <div className="h-screen overflow-hidden bg-gray-50 flex admin-portal-theme">
        <AdminSidebar />
        <main className="flex-1 min-w-0 overflow-y-auto pt-14 md:pt-0">
          <DashboardHeader
            userName={session.user.name ?? ""}
            userImage={session.user.image ?? null}
          />
          {children}
        </main>
      </div>
    </AdminThemeProvider>
  );
}
