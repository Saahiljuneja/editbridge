export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ClientRewardsClient } from "./rewards-client";

export default async function ClientRewardsPage() {
  const session = await auth();
  if (!session || session.user?.role !== "client") redirect("/login");
  return <ClientRewardsClient />;
}
