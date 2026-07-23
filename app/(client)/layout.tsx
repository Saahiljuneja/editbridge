import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ClientSidebar } from "@/components/layout/client-sidebar";
import { PushPermissionPrompt } from "@/components/push/push-permission";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.twoFactorPending) redirect("/2fa");

  const role = session.user.role;
  if (role === "editor") redirect("/editor/dashboard");
  if (role === "admin" || role?.startsWith("staff_")) redirect("/admin/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <ClientSidebar
          userName={session.user.name ?? ""}
          userImage={session.user.image ?? null}
        />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      <PushPermissionPrompt />
    </div>
  );
}
