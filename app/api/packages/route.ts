import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors, packages, userPoints } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { createPackageSchema } from "@/lib/validations";
import { revalidatePublicPagesCache } from "@/lib/revalidate";
import { getPlatformSettings } from "@/lib/platform-settings";
import { getLevelPerks, calcLevel } from "@/lib/rewards";
import type { Level } from "@/lib/rewards";

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

  // Enforce package limit based on editor's XP level
  const [editorUser] = await db
    .select({ userId: editors.userId })
    .from(editors)
    .where(eq(editors.id, editorId))
    .limit(1);

  if (editorUser) {
    const [pts] = await db
      .select({ total: userPoints.total })
      .from(userPoints)
      .where(eq(userPoints.userId, editorUser.userId))
      .limit(1);

    const level = calcLevel(pts?.total ?? 0) as Level;
    const { maxPackages } = getLevelPerks(level);

    const [countRow] = await db
      .select({ total: count() })
      .from(packages)
      .where(eq(packages.editorId, editorId));

    if ((countRow?.total ?? 0) >= maxPackages) {
      return NextResponse.json(
        { error: `You can create up to ${maxPackages} packages on your current ${level} level. Complete more orders to level up and unlock more slots.` },
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
