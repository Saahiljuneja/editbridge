import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types";
import { ShowcaseClient } from "./showcase-client";

export const dynamic = "force-dynamic";

const ALLOWED: UserRole[] = ["admin", "staff_moderation"];

export default async function AdminShowcasePage() {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) redirect("/admin/dashboard");

  return (
    <div className="px-8 py-6 ">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Showcase</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Curate the clips shown on the public /showcase page â€" YouTube and Vimeo links only.
        </p>
      </div>
      <ShowcaseClient />
    </div>
  );
}
