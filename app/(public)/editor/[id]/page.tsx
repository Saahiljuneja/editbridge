import { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { editors, users, packages, skills, tools, portfolioItems, reviews, savedEditors, profileEvents } from "@/lib/db/schema";



import { and, eq, sql } from "drizzle-orm";
import { displayNameFromFull } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { toPortfolioProxyUrl } from "@/lib/portfolio-url";
import { EditorProfileClient } from "./editor-profile-client";

export const dynamic = "force-dynamic";

async function getEditorProfileData(id: string) {
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
      previousClients: editors.previousClients,
      completionRate: editors.completionRate,
      totalOrders: editors.totalOrders,
      avgResponseTime: editors.avgResponseTime,
      kycStatus: editors.kycStatus,
      isAvailable: editors.isAvailable,
      createdAt: editors.createdAt,
      kycApprovedAt: editors.kycApprovedAt,
      activeFrame: editors.activeFrame,
    })
    .from(editors)

    .innerJoin(users, eq(editors.userId, users.id))
    .where(
      isOwnProfile
        ? eq(editors.id, id)
        : and(eq(editors.id, id), eq(editors.kycStatus, "approved"))
    )
    .limit(1);

  if (!editorRows[0]) return null;
  const editor = editorRows[0];

  // Log profile view event if viewer is not the editor themselves or staff
  const isSelf = session?.user?.role === "editor" && session.user.editorId === id;
  const isStaff = session?.user?.role && ["admin", "staff_kyc", "staff_support", "staff_dispute", "staff_moderation"].includes(session.user.role);
  if (!isSelf && !isStaff) {
    db.insert(profileEvents)
      .values({
        editorId: id,
        eventType: "profile_view",
        viewerId: session?.user?.userId || null,
      })
      .catch(() => {});
  }

  // Get total view count from events
  const [viewCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(profileEvents)
    .where(and(eq(profileEvents.editorId, id), eq(profileEvents.eventType, "profile_view")));
  const viewCount = (viewCountRow?.count ?? 0) + (!isSelf && !isStaff ? 1 : 0);

  // Check bookmark status
  let isBookmarked = false;
  if (session?.user?.userId) {
    const [saved] = await db
      .select({ id: savedEditors.id })
      .from(savedEditors)
      .where(and(eq(savedEditors.clientId, session.user.userId), eq(savedEditors.editorId, id)))
      .limit(1);
    isBookmarked = !!saved;
  }

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

  // Calculate rating breakdown percentages (5★ down to 1★)
  const totalReviews = reviewRows.length;
  const ratingCounts = [0, 0, 0, 0, 0];
  reviewRows.forEach((r) => {
    const star = Math.min(Math.max(r.rating, 1), 5);
    ratingCounts[5 - star]++;
  });
  const ratingDistribution = ratingCounts.map((c) =>
    totalReviews > 0 ? Math.round((c / totalReviews) * 100) : 0
  );

  const r2Base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  const portfolioItemsOut = portfolioRows.map((p) => ({
    id: p.id,
    type: p.type,
    url: toPortfolioProxyUrl(p.url, r2Base) ?? p.url,
    beforeUrl: toPortfolioProxyUrl(p.beforeUrl, r2Base),
    thumbnailUrl: toPortfolioProxyUrl(p.thumbnailUrl, r2Base),
    title: p.title ?? null,
    description: p.description ?? null,
    category: p.category ?? null,
    isFeatured: p.isFeatured,
    orderId: p.orderId ?? null,
    likesCount: p.likesCount,
  }));

  const reviewsOut = reviewRows.map((r) => ({
    id: r.id,
    rating: r.rating,
    text: r.text,
    replyText: r.replyText,
    createdAt: r.createdAt.toISOString(),
    reviewerName: displayNameFromFull(r.reviewerName),
    reviewerImage: r.reviewerImage,
  }));

  return {
    ...editor,
    createdAt: editor.createdAt.toISOString(),
    kycApprovedAt: editor.kycApprovedAt?.toISOString() || null,
    packages: packageRows,

    skills: skillRows.map((s) => s.name),
    tools: toolRows.map((t) => t.name),
    portfolioItems: portfolioItemsOut,
    reviews: reviewsOut,
    avgRating,
    reviewCount: reviewRows.length,
    viewCount,
    isBookmarked,
    ratingDistribution,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const editor = await getEditorProfileData(id);
  if (!editor) {
    return {
      title: "Editor Profile Not Found — EditBridge",
      description: "The requested editor profile could not be found.",
    };
  }

  const name = editor.displayName || displayNameFromFull(editor.name);
  const title = editor.title || "Video Editor";
  const bio = editor.bio ? editor.bio.slice(0, 160) : `Check out ${name}'s portfolio and video editing services on EditBridge.`;

  return {
    title: `${name} — ${title} | EditBridge`,
    description: bio,
    openGraph: {
      title: `${name} — ${title} | EditBridge`,
      description: bio,
      images: editor.image ? [{ url: editor.image }] : [],
    },
  };
}

export default async function EditorPublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const editor = await getEditorProfileData(id);

  if (!editor) notFound();

  const name = editor.displayName || displayNameFromFull(editor.name);
  const title = editor.title || "Video Editor";

  // Structured Data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "name": `${name} - ${title} on EditBridge`,
    "description": editor.bio || "",
    "mainEntity": {
      "@type": "Person",
      "name": name,
      "image": editor.image || undefined,
      "jobTitle": title,
      "workLocation": editor.location ? {
        "@type": "Place",
        "name": editor.location
      } : undefined
    }
  };

  const session = await auth();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <EditorProfileClient editor={editor as any} isLoggedIn={!!session} />
    </>
  );

}
