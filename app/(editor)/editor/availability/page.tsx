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
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b border-gray-150 shadow-sm">
        <div className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <h1 className="text-xl font-black text-neutral-900 tracking-tight">Availability</h1>
            <p className="text-xs text-neutral-450 mt-0.5 font-semibold">Control whether clients can place new orders</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center">
            <CalendarClock className="w-4 h-4 text-brand-primary" />
          </div>
        </div>
      </div>
      <div className="px-6 py-6 max-w-5xl mx-auto">
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
