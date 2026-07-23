import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { editors, users, packages, skills, tools, portfolioItems, reviews } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { displayNameFromFull } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { toPortfolioProxyUrl } from "@/lib/portfolio-url";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Allow editor to preview their own profile regardless of KYC status
    const session = await auth();
    const isOwnProfile = session?.user?.role === "editor" && session.user.editorId === id;

    const editorRows = await db
      .select({
        id: editors.id,
        userId: editors.userId,
        name: users.name,
        image: users.image,
        bio: editors.bio,
        displayName: editors.displayName,
        title: editors.title,
        location: editors.location,
        experienceLevel: editors.experienceLevel,
        yearsOfExperience: editors.yearsOfExperience,
        niche: editors.niche,
        isFeatured: editors.isFeatured,
        coverImage: editors.coverImage,
        featuredVideoUrl: editors.featuredVideoUrl,
        languages: editors.languages,
        workStyleTags: editors.workStyleTags,
        faqs: editors.faqs,
        previousClients: editors.previousClients,
        completionRate: editors.completionRate,
        totalOrders: editors.totalOrders,
        avgResponseTime: editors.avgResponseTime,
        kycStatus: editors.kycStatus,
        isAvailable: editors.isAvailable,
        createdAt: editors.createdAt,
      })
      .from(editors)
      .innerJoin(users, eq(editors.userId, users.id))
      .where(
        isOwnProfile
          ? eq(editors.id, id)
          : and(eq(editors.id, id), eq(editors.kycStatus, "approved"))
      )
      .limit(1);

    if (!editorRows[0]) {
      return NextResponse.json({ error: "Editor not found" }, { status: 404 });
    }

    const editor = editorRows[0];

    const [packageRows, skillRows, toolRows, portfolioRows, reviewRows] = await Promise.all([
      db
        .select()
        .from(packages)
        .where(and(eq(packages.editorId, id), eq(packages.isActive, true)))
        .orderBy(packages.price),
      db.select().from(skills).where(eq(skills.editorId, id)),
      db.select().from(tools).where(eq(tools.editorId, id)),
      db.select().from(portfolioItems).where(and(eq(portfolioItems.editorId, id), eq(portfolioItems.isHidden, false))).orderBy(portfolioItems.sortOrder, portfolioItems.createdAt),
      db
        .select({
          id: reviews.id,
          orderId: reviews.orderId,
          rating: reviews.rating,
          text: reviews.text,
          replyText: reviews.replyText,
          createdAt: reviews.createdAt,
          reviewerName: users.name,
          reviewerImage: users.image,
        })
        .from(reviews)
        .innerJoin(users, eq(reviews.reviewerId, users.id))
        .where(and(eq(reviews.revieweeId, editor.userId), eq(reviews.role, "client")))
        .orderBy(reviews.createdAt),
    ]);

    const avgRating =
      reviewRows.length > 0
        ? Math.round((reviewRows.reduce((sum, r) => sum + r.rating, 0) / reviewRows.length) * 10) / 10
        : null;

    const r2Base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
    const portfolioItemsOut = portfolioRows.map((p) => ({
      ...p,
      url: toPortfolioProxyUrl(p.url, r2Base) ?? p.url,
      beforeUrl: toPortfolioProxyUrl(p.beforeUrl, r2Base),
      thumbnailUrl: toPortfolioProxyUrl(p.thumbnailUrl, r2Base),
    }));

    return NextResponse.json({
      ...editor,
      packages: packageRows,
      skills: skillRows.map((s) => s.name),
      tools: toolRows.map((t) => t.name),
      portfolioItems: portfolioItemsOut,
      reviews: reviewRows.map((r) => ({
        ...r,
        reviewerName: displayNameFromFull(r.reviewerName),
      })),
      avgRating,
      reviewCount: reviewRows.length,
    });
  } catch (error) {
    console.error("[GET /api/editors/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch editor" }, { status: 500 });
  }
}
