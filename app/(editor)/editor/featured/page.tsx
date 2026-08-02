export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Star } from "lucide-react";
import { FeaturedPurchase } from "@/components/editor/featured-purchase";
import { isFeatureEnabled } from "@/lib/feature-flags";

export default async function EditorFeaturedPage() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  const editorId = session.user.editorId;
  if (!editorId) redirect("/editor/kyc");

  const [editor] = await db
    .select({ isFeatured: editors.isFeatured, featuredUntil: editors.featuredUntil })
    .from(editors)
    .where(eq(editors.id, editorId))
    .limit(1);

  const isCurrentlyFeatured = !!editor?.isFeatured && !!editor?.featuredUntil && editor.featuredUntil > new Date();
  const daysRemaining = isCurrentlyFeatured
    ? Math.max(0, Math.ceil((editor!.featuredUntil!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;
  const featureEnabled = await isFeatureEnabled("featured_placement");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="px-6 py-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Featured Placement</h1>
            <p className="text-sm text-gray-400 mt-0.5">Appear at the top of search results and get more visibility</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-6">

        <div className="rounded-xl bg-white border border-gray-200 p-4 space-y-1.5 text-sm text-gray-600 mb-6">
          <p className="font-medium text-gray-700">Featured placement includes:</p>
          <ul className="list-disc list-inside space-y-0.5 text-gray-500">
            <li>Top-of-search position on the browse page</li>
            <li>A &quot;Featured&quot; badge on your profile card</li>
            <li>Priority in editor recommendations</li>
          </ul>
        </div>

        <FeaturedPurchase
          isCurrentlyFeatured={isCurrentlyFeatured}
          daysRemaining={daysRemaining}
          featuredUntil={isCurrentlyFeatured ? editor!.featuredUntil!.toISOString() : null}
          featureEnabled={featureEnabled}
        />
      </div>
    </div>
  );
}
