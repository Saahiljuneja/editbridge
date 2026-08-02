export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { WatchlistClient } from "./watchlist-client";
import { ShieldAlert } from "lucide-react";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin", "staff_moderation", "staff_support"];

export default async function AdminWatchlistPage() {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) redirect("/admin/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Editor Watch List</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Editors auto-flagged for low performance — cancellations, completion rate, or disputes
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-orange-500" />
          </div>
        </div>
      </div>
      <WatchlistClient />
    </div>
  );
}
