import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors, kycApplications, userPoints } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { EditorSidebar } from "@/components/layout/editor-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
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

  try {
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
  } catch (err) {
    console.warn("[EditorLayout] Database connection failed querying KYC applications, using offline fallback:", err);
  }

  let featuredPlacementEnabled = false;
  let editorMembershipPricingEnabled = false;
  let xpRow: { total: number } | null = null;

  try {
    const [fEnabled, mEnabled, xpResult] = await Promise.all([
      isFeatureEnabled("featured_placement"),
      isFeatureEnabled("editor_membership_pricing"),
      session.user.userId
        ? db.select({ total: userPoints.total }).from(userPoints).where(eq(userPoints.userId, session.user.userId)).limit(1).then(r => r[0])
        : Promise.resolve(null),
    ]);
    featuredPlacementEnabled = fEnabled;
    editorMembershipPricingEnabled = mEnabled;
    xpRow = xpResult || null;
  } catch (err) {
    console.warn("[EditorLayout] Database connection failed querying features and XP, using offline fallback:", err);
  }

  const xpLevel = calcLevel(xpRow?.total ?? 0);

  return (
    <EditorKycGuard kycStatus={kycGuardStatus}>
      <div className="h-screen overflow-hidden flex">
        <EditorSidebar
          featuredPlacementEnabled={featuredPlacementEnabled}
          editorMembershipPricingEnabled={editorMembershipPricingEnabled}
          userName={session.user.name ?? ""}
          userImage={session.user.image ?? null}
          xpLevel={xpLevel}
          editorId={editorId ?? null}
          userId={session.user.userId ?? null}
        />
        <main className="flex-1 min-w-0 overflow-y-auto pt-14 md:pt-0">
          <DashboardHeader
            userName={session.user.name ?? ""}
            userImage={session.user.image ?? null}
          />
          {children}
        </main>
      </div>
      <PushPermissionPrompt />
    </EditorKycGuard>
  );
}
