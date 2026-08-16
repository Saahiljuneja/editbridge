import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { EditorWalletClient } from "./wallet-client";

export const dynamic = "force-dynamic";

export default async function EditorWalletPage() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  return <EditorWalletClient />;
}
