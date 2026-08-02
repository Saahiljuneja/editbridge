import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { MembershipClient } from "./membership-client";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Membership Tiers — Editor Portal",
  description: "Upgrade your freelance video editor account level to reduce platform fees and unlock premium boosts.",
};

export default async function EditorMembershipPage() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") {
    redirect("/login");
  }

  const isPricingTiersEnabled = await isFeatureEnabled("editor_membership_pricing");

  return (
    <div className="min-h-screen bg-gray-50/50">
      <MembershipClient isPricingTiersEnabled={isPricingTiersEnabled} />
    </div>
  );
}
