import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors, kycApplications, userPoints } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { EditorSidebar } from "@/components/layout/editor-sidebar";
import { EditorKycGuard } from "./editor-kyc-guard";
import { PushPermissionPrompt } from "@/components/push/push-permission";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { calcLevel } from "@/lib/rewards";
import type { KYCStatus } from "@/types";

export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || session.user?.role !== "editor") {
    redirect("/login");
  }
  if (session.user.twoFactorPending) redirect("/2fa");

  const editorId = session.user.editorId;

  // Determine real KYC state from kycApplications table
  // editors.kycStatus defaults to "pending" even before submission — not reliable
  let kycGuardStatus: KYCStatus | "not_submitted" = "not_submitted";

  if (editorId) {
    const [application] = await db
      .select({ status: kycApplications.status })
      .from(kycApplications)
      .where(eq(kycApplications.editorId, editorId))
      .orderBy(desc(kycApplications.createdAt))
      .limit(1);

    if (application) {
      kycGuardStatus = application.status;
    }
  }

  const [featuredPlacementEnabled, xpRow] = await Promise.all([
    isFeatureEnabled("featured_placement"),
    session.user.userId
      ? db.select({ total: userPoints.total }).from(userPoints).where(eq(userPoints.userId, session.user.userId)).limit(1).then(r => r[0])
      : Promise.resolve(null),
  ]);

  const xpLevel = calcLevel(xpRow?.total ?? 0);

  return (
    <EditorKycGuard kycStatus={kycGuardStatus}>
      <div className="min-h-screen bg-background">
        <div className="flex">
          <EditorSidebar
            featuredPlacementEnabled={featuredPlacementEnabled}
            userName={session.user.name ?? ""}
            userImage={session.user.image ?? null}
            xpLevel={xpLevel}
            editorId={editorId ?? null}
            userId={session.user.userId ?? null}
          />
          <div className="flex-1 flex flex-col min-w-0">
            {children}
          </div>
        </div>
      <PushPermissionPrompt />
      </div>
    </EditorKycGuard>
  );
}
