export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CalendarClock } from "lucide-react";
import { AvailabilityClient } from "./availability-client";

export default async function EditorAvailabilityPage() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  const editorId = session.user.editorId!;
  if (!editorId) redirect("/editor/kyc");

  const [editor] = await db
    .select({ isAvailable: editors.isAvailable, kycStatus: editors.kycStatus, vacationUntil: editors.vacationUntil })
    .from(editors)
    .where(eq(editors.id, editorId))
    .limit(1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Availability</h1>
            <p className="text-sm text-gray-400 mt-0.5">Control whether clients can place new orders</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#0EA5E9]/10 flex items-center justify-center">
            <CalendarClock className="w-4 h-4 text-[#0EA5E9]" />
          </div>
        </div>
      </div>
      <div className="px-8 py-6 ">
        <AvailabilityClient
          editorId={editorId}
          isAvailable={editor?.isAvailable ?? true}
          kycStatus={editor?.kycStatus ?? "pending"}
          vacationUntil={editor?.vacationUntil?.toISOString() ?? null}
        />
      </div>
    </div>
  );
}
