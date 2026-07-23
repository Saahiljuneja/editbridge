export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RefundsClient } from "./refunds-client";
import { RotateCcw } from "lucide-react";
import type { UserRole } from "@/types";

export default async function AdminRefundsPage() {
  const session = await auth();
  if (!session || (session.user.role as UserRole) !== "admin") redirect("/admin/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Refund Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">Issue manual refunds outside the dispute flow</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
            <RotateCcw className="w-4 h-4 text-red-500" />
          </div>
        </div>
      </div>
      <RefundsClient />
    </div>
  );
}
