import {
  AnimatedHero,
  AnimatedFindEditorCTA,
  AnimatedStats,
  AnimatedActivity,
  AnimatedHowItWorks,
  AnimatedEditorCards,
  BeforeAfterSection,
  AnimatedWhySection,
  AnimatedAbout,
  AnimatedScrollingReviews,
  AnimatedCTA,
  ScrollProgressBar,
  AnimatedFAQ,
  StickyCtaBar,
  ForEditorsSection,
  ShowcasePreviewSection,
  ComparisonSection,
  LeaderboardTeaser,
  BlogPreviewSection,
  CombinedStrip,
  PriceAnchorSection,
  GuaranteeBar,
  BackToTopButton,
  EscrowFlowSection,
  WorkGallerySection,
} from "@/components/home/animated-sections";
import { CategoryBrowseSection } from "@/components/home/category-browse-section";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { db } from "@/lib/db";
import { editors, orders, portfolioItems, users, blogPosts } from "@/lib/db/schema";
import { count, eq, desc, and, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { displayNameFromFull } from "@/lib/utils";

export default async function HomePage() {
  const clientUsers = alias(users, "client_users");
  const editorUsers = alias(users, "editor_users");

  const [quizEnabled, editorCountResult, completedOrdersResult, showcaseRows, leaderboardRows, activityRows, blogRows, editorRows, availableCountResult, totalPaidResult] = await Promise.all([
    isFeatureEnabled("find_editor_quiz"),
    db.select({ value: count() }).from(editors).where(eq(editors.kycStatus, "approved")),
    db.select({ value: count() }).from(orders).where(eq(orders.status, "completed")),
    db.select({
      id: portfolioItems.id,
      title: portfolioItems.title,
      category: portfolioItems.category,
      editorName: users.name,
      likesCount: portfolioItems.likesCount,
      viewsCount: portfolioItems.viewsCount,
    })
    .from(portfolioItems)
    .innerJoin(editors, and(eq(editors.id, portfolioItems.editorId), eq(editors.kycStatus, "approved")))
    .innerJoin(users, eq(users.id, editors.userId))
    .orderBy(desc(portfolioItems.likesCount))
    .limit(3),
    db.select({
      id: editors.id,
      name: users.name,
      niche: editors.niche,
      totalOrders: editors.totalOrders,
      avgRating: sql<number | null>`(SELECT ROUND(AVG(r.rating)::numeric,1) FROM reviews r INNER JOIN orders o ON r.order_id = o.id WHERE o.editor_id = ${editors.id} AND r.role = 'client')`,
    })
    .from(editors)
    .innerJoin(users, eq(users.id, editors.userId))
    .where(and(eq(editors.kycStatus, "approved"), eq(users.isActive, true)))
    .orderBy(desc(editors.totalOrders))
    .limit(5),
    db.select({
      clientName: clientUsers.name,
      editorName: editorUsers.name,
      editorNiche: editors.niche,
      totalAmount: orders.totalAmount,
      completedAt: orders.completedAt,
    })
    .from(orders)
    .innerJoin(clientUsers, eq(clientUsers.id, orders.clientId))
    .innerJoin(editors, eq(editors.id, orders.editorId))
    .innerJoin(editorUsers, eq(editorUsers.id, editors.userId))
    .where(eq(orders.status, "completed"))
    .orderBy(desc(orders.completedAt))
    .limit(10),
    db.select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      excerpt: blogPosts.excerpt,
      category: blogPosts.category,
      readTime: blogPosts.readTime,
      publishedAt: blogPosts.publishedAt,
    })
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(3),
    db.select({
      id: editors.id,
      name: users.name,
      displayName: editors.displayName,
      niche: editors.niche,
      title: editors.title,
      location: editors.location,
      totalOrders: editors.totalOrders,
      isFeatured: editors.isFeatured,
      minPrice: sql<number | null>`(SELECT MIN(p.price) FROM packages p WHERE p.editor_id = ${editors.id} AND p.is_active = true)`,
      minDeliveryDays: sql<number | null>`(SELECT MIN(p.delivery_days) FROM packages p WHERE p.editor_id = ${editors.id} AND p.is_active = true)`,
      avgRating: sql<number | null>`(SELECT ROUND(AVG(r.rating)::numeric,1) FROM reviews r INNER JOIN orders o ON r.order_id = o.id WHERE o.editor_id = ${editors.id} AND r.role = 'client')`,
      reviewCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM reviews r INNER JOIN orders o ON r.order_id = o.id WHERE o.editor_id = ${editors.id} AND r.role = 'client'), 0)`,
      skills: sql<string[]>`COALESCE(ARRAY(SELECT name FROM skills WHERE editor_id = ${editors.id} LIMIT 3), ARRAY[]::text[])`,
    })
    .from(editors)
    .innerJoin(users, eq(users.id, editors.userId))
    .where(and(eq(editors.kycStatus, "approved"), eq(users.isActive, true)))
    .orderBy(desc(editors.isFeatured), desc(editors.totalOrders))
    .limit(5),
    db.select({ value: count() }).from(editors).where(and(eq(editors.kycStatus, "approved"), eq(editors.isAvailable, true))),
    db.select({ value: sql<number>`COALESCE(SUM(total_amount), 0)::bigint` }).from(orders).where(eq(orders.status, "completed")),
  ]);

  const featuredEditors = editorRows.map(r => ({
    ...r,
    name: r.name ?? "",
    displayName: r.displayName ?? null,
    skills: Array.isArray(r.skills) ? r.skills : [],
    reviewCount: Number(r.reviewCount ?? 0),
    totalOrders: Number(r.totalOrders ?? 0),
  }));

  const availableCount = Number(availableCountResult[0]?.value ?? 0);
  const totalPaid = Number(totalPaidResult[0]?.value ?? 0);
  const showLeaderboard = leaderboardRows.some(e => e.totalOrders > 0);
  const editorCount = editorCountResult[0]?.value ?? 100;
  const completedOrders = completedOrdersResult[0]?.value ?? 0;
  const showcaseItems = showcaseRows.map(r => ({ ...r, editorName: displayNameFromFull(r.editorName ?? "") }));
  const leaderboardEditors = leaderboardRows.map(r => ({
    ...r,
    name: displayNameFromFull(r.name ?? ""),
    initials: (r.name ?? "??").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
  }));

  const ACTIVITY_COLORS = { order: "#0EA5E9", approved: "#059669", review: "#d97706" };
  const activityFeed = activityRows.map((r, i) => {
    const cName = displayNameFromFull(r.clientName ?? "");
    const eName = displayNameFromFull(r.editorName ?? "");
    const amountINR = r.totalAmount ? `₹${(r.totalAmount / 100).toLocaleString("en-IN")}` : null;
    const isEven = i % 2 === 0;
    return {
      type: isEven ? "approved" : "order",
      name: isEven ? cName : cName,
      action: isEven
        ? `approved delivery from ${eName} — payment released`
        : `booked ${eName} for ${r.editorNiche ?? "video editing"}`,
      time: (() => {
        if (!r.completedAt) return "recently";
        const d = Date.now() - new Date(r.completedAt).getTime();
        if (d < 3_600_000) return `${Math.max(1, Math.round(d / 60_000))}m ago`;
        if (d < 86_400_000) return `${Math.round(d / 3_600_000)}h ago`;
        return `${Math.round(d / 86_400_000)}d ago`;
      })(),
      col: isEven ? ACTIVITY_COLORS.approved : ACTIVITY_COLORS.order,
      amount: amountINR,
    };
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://editbridge.in/#organization",
        name: "EditBridge",
        url: "https://editbridge.in",
        description: "India's trusted marketplace for KYC-verified video editing and thumbnail design services.",
        foundingDate: "2026",
        areaServed: "IN",
      },
      {
        "@type": "WebSite",
        "@id": "https://editbridge.in/#website",
        url: "https://editbridge.in",
        name: "EditBridge",
        publisher: { "@id": "https://editbridge.in/#organization" },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: "https://editbridge.in/browse?q={search_term_string}" },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: "What if the editor delivers terrible work?", acceptedAnswer: { "@type": "Answer", text: "Your payment is held in escrow until you approve. If you're unhappy after revisions, raise a dispute and get a full refund — guaranteed." } },
          { "@type": "Question", name: "How does KYC verification work?", acceptedAnswer: { "@type": "Answer", text: "Every editor submits government-issued ID (Aadhaar, PAN, or Passport) and a live selfie. Our team verifies each submission manually before the editor can accept any order." } },
          { "@type": "Question", name: "What counts as a revision?", acceptedAnswer: { "@type": "Answer", text: "Any change to the delivered work — cuts, pacing, colour, titles, music — counts as a revision. The number of included revisions is shown on each editor's package." } },
          { "@type": "Question", name: "How long until I receive my file?", acceptedAnswer: { "@type": "Answer", text: "Delivery time is set per package, typically 1 to 5 days. The editor's deadline is enforced inside the platform and you're notified the moment files are uploaded." } },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BackToTopButton />
      <div className="flex flex-col">
        <ScrollProgressBar />
        <StickyCtaBar />
        {/* 1. Hero */}
        <AnimatedHero availableCount={availableCount} />
        {/* 2. Niche + trust strip */}
        <CombinedStrip />
        {/* 3. Editor cards — show who's on the platform immediately */}
        <AnimatedEditorCards editors={featuredEditors.length > 0 ? featuredEditors : undefined} />
        {/* 4. Visual proof of creative output */}
        <WorkGallerySection />
        {/* 5. Price anchoring — removes cost uncertainty */}
        <PriceAnchorSection />
        {/* 6. Escrow flow — builds payment trust */}
        <EscrowFlowSection />
        {/* 7. Stats */}
        <AnimatedStats editorCount={editorCount} completedOrders={completedOrders} totalPaid={totalPaid} />
        <GuaranteeBar />
        {/* 8. Live activity */}
        <AnimatedActivity feedItems={activityFeed.length > 0 ? activityFeed : undefined} />
        {/* 9. Category browse */}
        <CategoryBrowseSection />
        {/* 10. How it works */}
        <AnimatedHowItWorks />
        {quizEnabled && <AnimatedFindEditorCTA />}
        {/* 11. Leaderboard only when editors have real completed orders */}
        {showLeaderboard && <LeaderboardTeaser editors={leaderboardEditors} />}
        <BeforeAfterSection />
        <AnimatedWhySection />
        <ShowcasePreviewSection items={showcaseItems} />
        <ComparisonSection />
        <AnimatedScrollingReviews />
        <ForEditorsSection />
        <BlogPreviewSection posts={blogRows} />
        <AnimatedAbout />
        <AnimatedFAQ />
        <AnimatedCTA />
      </div>
    </>
  );
}
