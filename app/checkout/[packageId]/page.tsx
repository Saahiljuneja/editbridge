export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { packages, editors, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getAvailableCredits } from "@/lib/rewards";
import CheckoutForm from "./checkout-form";

export default async function PackageCheckoutPage({ params }: { params: Promise<{ packageId: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== "client") redirect("/login");

  const { packageId } = await params;

  const [pkg] = await db
    .select({
      id: packages.id,
      title: packages.title,
      description: packages.description,
      price: packages.price,
      deliveryDays: packages.deliveryDays,
      revisionCount: packages.revisionCount,
      editorName: users.name,
      editorId: packages.editorId,
      includesSourceFiles: packages.includesSourceFiles,
      includesCommercialRights: packages.includesCommercialRights,
    })
    .from(packages)
    .innerJoin(editors, eq(editors.id, packages.editorId))
    .innerJoin(users, eq(users.id, editors.userId))
    .where(and(eq(packages.id, packageId), eq(packages.isActive, true)))
    .limit(1);

  if (!pkg) notFound();

  const { total: availableCredits } = await getAvailableCredits(session.user.userId!);

  const pkgWithDefaultName = {
    ...pkg,
    editorName: pkg.editorName ?? "Unknown Editor",
  };

  return (
    <CheckoutForm
      pkg={pkgWithDefaultName}
      availableCredits={availableCredits}
    />
  );
}