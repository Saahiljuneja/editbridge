import { isFeatureEnabled } from "@/lib/feature-flags";
import { PricingClient } from "./pricing-client";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing — EditBridge",
  description: "Transparent fee structure for video creators and freelance editors on EditBridge.",
};

export default async function PricingPage() {
  // Query the feature flag status server-side from DB
  const isPricingTiersEnabled = await isFeatureEnabled("editor_membership_pricing");

  return <PricingClient isPricingTiersEnabled={isPricingTiersEnabled} />;
}