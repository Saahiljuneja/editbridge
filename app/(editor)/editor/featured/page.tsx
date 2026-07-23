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
    <div className="px-8 py-6 ">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
          <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Featured placement</h1>
          <p className="text-sm text-gray-400">Get seen first â€” appear at the top of search results.</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-1.5 text-sm text-gray-600">
        <p>Featured placement includes:</p>
        <ul className="list-disc list-inside space-y-0.5 text-gray-500">
          <li>Top-of-search position on the browse page</li>
          <li>A subtle &quot;Featured&quot; badge on your profile card</li>
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
  );
}
