export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { packages, editors, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getAvailableCredits } from "@/lib/rewards";
import CheckoutForm from "./checkout-form";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getPlatformSettings } from "@/lib/platform-settings";

export default async function PackageCheckoutPage({ params }: { params: Promise<{ packageId: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== "client") redirect("/login");

  const { packageId } = await params;

  const [pkg] = await db
    .select({
      id: packages.id,
      tier: packages.tier,
      title: packages.title,
      description: packages.description,
      price: packages.price,
      deliveryDays: packages.deliveryDays,
      revisionCount: packages.revisionCount,
      videoLengthLimit: packages.videoLengthLimit,
      videoCount: packages.videoCount,
      resolution: packages.resolution,
      maxRawFootage: packages.maxRawFootage,
      aspectRatios: packages.aspectRatios,
      addons: packages.addons,
      softwareUsed: packages.softwareUsed,
      deliveryFormats: packages.deliveryFormats,
      includesSourceFiles: packages.includesSourceFiles,
      includesCommercialRights: packages.includesCommercialRights,
      editorName: users.name,
      editorId: packages.editorId,
      isAvailable: editors.isAvailable,
    })
    .from(packages)
    .innerJoin(editors, eq(editors.id, packages.editorId))
    .innerJoin(users, eq(users.id, editors.userId))
    .where(and(eq(packages.id, packageId), eq(packages.isActive, true)))
    .limit(1);

  if (!pkg) notFound();

  if (!pkg.isAvailable) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Editor Currently Unavailable</h2>
          <p className="text-sm text-gray-500 mb-6">
            {pkg.editorName ?? "This editor"} is not accepting new orders at this time. Please check back later or browse other talented editors.
          </p>
          <Link
            href="/browse"
            className="inline-flex items-center justify-center w-full px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[#1e40af] hover:bg-brand-primary transition-colors"
          >
            Browse Other Editors
          </Link>
        </div>
      </div>
    );
  }

  const { total: availableCredits } = await getAvailableCredits(session.user.userId!);
  const { processingFeePct } = await getPlatformSettings();

  const pkgWithDefaultName = {
    ...pkg,
    editorName: pkg.editorName ?? "Unknown Editor",
  };

  return (
    <CheckoutForm
      pkg={pkgWithDefaultName}
      availableCredits={availableCredits}
      processingFeePct={processingFeePct}
    />
  );
}