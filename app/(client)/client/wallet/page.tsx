import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ClientWalletClient } from "./wallet-client";

export const dynamic = "force-dynamic";

export default async function ClientWalletPage() {
  const session = await auth();
  if (!session || session.user?.role !== "client") redirect("/login");

  return <ClientWalletClient />;
}
