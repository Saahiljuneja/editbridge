import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors, packages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createPackageSchema } from "@/lib/validations";
import { revalidatePublicPagesCache } from "@/lib/revalidate";
import { getPlatformSettings } from "@/lib/platform-settings";
import { getEffectiveTier } from "@/lib/membership";

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const editorId = session.user.editorId;
  if (!editorId) {
    return NextResponse.json({ error: "Editor record not found" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(packages)
    .where(eq(packages.editorId, editorId))
    .orderBy(packages.price);

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const editorId = session.user.editorId;
  if (!editorId) {
    return NextResponse.json({ error: "Editor record not found" }, { status: 404 });
  }

  const body = await request.json();
  // price arrives in paise from the form
  const parsed = createPackageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Enforce set + package limits based on membership tier
  const [editorRow] = await db
    .select({ membershipTier: editors.membershipTier, membershipExpiresAt: editors.membershipExpiresAt })
    .from(editors)
    .where(eq(editors.id, editorId))
    .limit(1);

  if (editorRow) {
    const tier = getEffectiveTier(editorRow.membershipTier, editorRow.membershipExpiresAt);
    const { maxSets, packagesPerSet } = tier;

    // Fetch all existing packages for this editor
    const existing = await db.select({ videoCategory: packages.videoCategory, videoFormat: packages.videoFormat })
      .from(packages)
      .where(eq(packages.editorId, editorId));

    // Group into sets by category+format key
    const setMap = new Map<string, number>();
    for (const pkg of existing) {
      const key = `${pkg.videoCategory ?? "__none__"}||${pkg.videoFormat ?? "__none__"}`;
      setMap.set(key, (setMap.get(key) ?? 0) + 1);
    }

    const incomingKey = `${parsed.data.videoCategory ?? "__none__"}||${parsed.data.videoFormat ?? "__none__"}`;
    const existingCountInSet = setMap.get(incomingKey) ?? 0;

    // Check per-set limit (always 3)
    if (existingCountInSet >= packagesPerSet) {
      return NextResponse.json(
        { error: `Each service set can have a maximum of ${packagesPerSet} packages. Delete an existing package in this set to add a new one.` },
        { status: 403 }
      );
    }

    // Check set limit (new set only)
    if (!setMap.has(incomingKey) && maxSets !== Infinity && setMap.size >= maxSets) {
      return NextResponse.json(
        { error: `Your ${tier.name} plan allows up to ${maxSets} service set${maxSets === 1 ? "" : "s"}. Upgrade your membership to add more sets.` },
        { status: 403 }
      );
    }
  }

  const { minRevisions, maxRevisions, maxDeliveryDays } = await getPlatformSettings();
  if (parsed.data.revisionCount < minRevisions) {
    return NextResponse.json(
      { error: `Revision count must be at least ${minRevisions} (platform minimum).` },
      { status: 400 }
    );
  }
  if (parsed.data.revisionCount > maxRevisions) {
    return NextResponse.json(
      { error: `Revision count cannot exceed the platform maximum of ${maxRevisions}.` },
      { status: 400 }
    );
  }
  if (parsed.data.deliveryDays > maxDeliveryDays) {
    return NextResponse.json(
      { error: `Delivery days cannot exceed the platform maximum of ${maxDeliveryDays}.` },
      { status: 400 }
    );
  }

  const { title, description, price, deliveryDays, revisionCount, videoLengthLimit, videoCount, videoCategory, videoFormat, resolution, aspectRatios, addons, softwareUsed, maxRawFootage, deliveryFormats, includesSourceFiles, includesCommercialRights, isActive } = parsed.data;

  const [created] = await db
    .insert(packages)
    .values({
      editorId,
      title,
      description,
      price,
      deliveryDays,
      revisionCount,
      videoLengthLimit: videoLengthLimit ?? null,
      videoCount: videoCount ?? 1,
      videoCategory: videoCategory ?? null,
      videoFormat: videoFormat ?? null,
      resolution: resolution ?? null,
      aspectRatios: aspectRatios ?? [],
      addons: addons ?? [],
      softwareUsed: softwareUsed ?? [],
      maxRawFootage: maxRawFootage ?? null,
      deliveryFormats: deliveryFormats ?? [],
      includesSourceFiles: includesSourceFiles ?? false,
      includesCommercialRights: includesCommercialRights ?? false,
      isActive: isActive ?? true,
    })
    .returning();

  revalidatePublicPagesCache();
  return NextResponse.json(created, { status: 201 });
}
