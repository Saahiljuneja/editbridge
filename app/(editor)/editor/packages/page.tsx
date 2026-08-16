import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors, packages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PackagesManager } from "./packages-manager";
import { Info, Layers } from "lucide-react";
import { getEffectiveTier } from "@/lib/membership";

export default async function PackagesPage() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  const editorId = session.user.editorId;
  if (!editorId) redirect("/editor/kyc");

  const [rows, editorRow] = await Promise.all([
    db.select().from(packages).where(eq(packages.editorId, editorId)).orderBy(packages.price),
    db.select({ membershipTier: editors.membershipTier, membershipExpiresAt: editors.membershipExpiresAt })
      .from(editors).where(eq(editors.id, editorId)).limit(1),
  ]);

  const tier = getEffectiveTier(editorRow[0]?.membershipTier, editorRow[0]?.membershipExpiresAt);

  return (
    <div className="px-6 py-8">
      {/* Page header */}
      <div className="flex items-start gap-4 mb-8">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: "linear-gradient(135deg, rgba(14,165,233,0.15) 0%, rgba(14,165,233,0.06) 100%)",
            boxShadow: "0 2px 8px rgba(14,165,233,0.12)",
          }}
        >
          <Layers className="w-5 h-5 text-[var(--brand-client)]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 leading-tight">Services</h1>
          <p className="text-sm text-gray-400 mt-0.5 leading-relaxed">
            List your editing services. Group by category and format so clients find the right fit.
          </p>
        </div>
      </div>

      {/* Member Rewards discount notice */}
      <div className="flex gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 mb-8">
        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
          <Info className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-900 mb-1">Member Rewards discount</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Clients with Member Rewards may receive up to 10% off your listed price. Your payout reflects the discounted price minus the {tier.commissionRate}% platform fee &mdash; you&apos;ll see a full breakdown on each order.
          </p>
        </div>
      </div>

      <PackagesManager
        initialPackages={rows as Parameters<typeof PackagesManager>[0]["initialPackages"]}
        maxSets={tier.maxSets === Infinity ? null : tier.maxSets}
        packagesPerSet={tier.packagesPerSet}
        membershipTier={tier.name}
      />
    </div>
  );
}
