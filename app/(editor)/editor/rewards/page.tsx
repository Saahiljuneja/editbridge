export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { EditorRewardsClient } from "./rewards-client";

export default async function EditorRewardsPage() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");
  return <EditorRewardsClient />;
}
