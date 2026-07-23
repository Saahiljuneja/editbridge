import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllFeatureFlags } from "@/lib/feature-flags";
import { FeatureFlagsClient } from "./feature-flags-client";

export const dynamic = "force-dynamic";

export default async function AdminFeatureFlagsPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin/dashboard");

  const flags = await getAllFeatureFlags();

  return <FeatureFlagsClient initial={flags} />;
}
