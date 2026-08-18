import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { CATEGORY_PAGES, type CategoryPage as CategoryConfig } from "@/lib/category-seo";
import { toPortfolioProxyUrl } from "@/lib/portfolio-url";
import { db } from "@/lib/db";
import { editors, users, packages, skills, reviews } from "@/lib/db/schema";
import { and, eq, ilike, or, sql, inArray } from "drizzle-orm";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { EditorCard } from "@/components/editor/editor-card";
import { ComparePanel } from "@/components/browse/compare-panel";
import { Sparkles, HelpCircle, Users, CheckCircle, ChevronRight, ArrowLeft } from "lucide-react";


export async function generateStaticParams() {
  return CATEGORY_PAGES.map((c) => ({
    category: c.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = CATEGORY_PAGES.find((c) => c.slug === slug);
  if (!category) return {};
  return {
    title: category.metaTitle,
    description: category.metaDescription,
  };
}

async function getCategoryEditors(category: CategoryConfig) {
  const conditions = [
    eq(editors.kycStatus, "approved"),
    eq(editors.isAvailable, true),
  ];

  if (category.matchField === "niche") {
    conditions.push(
      or(
        ...category.matchKeywords.map((k) => ilike(editors.niche, `%${k}%`))
      )!
    );
  } else if (category.matchField === "skill") {
    const matchingEditorIds = await db
      .selectDistinct({ id: skills.editorId })
      .from(skills)
      .where(
        or(
          ...category.matchKeywords.map((k) => ilike(skills.name, `%${k}%`))
        )
      );
    
    if (matchingEditorIds.length === 0) return [];
    conditions.push(inArray(editors.id, matchingEditorIds.map((x) => x.id)));
  } else if (category.matchField === "packageCategory") {
    const matchingEditorIds = await db
      .selectDistinct({ id: packages.editorId })
      .from(packages)
      .where(
        and(
          eq(packages.isActive, true),
          sql`${packages.videoCategory} = ${category.matchKeywords[0]} OR ${packages.videoCategory} LIKE ${category.matchKeywords[0] + ",%"} OR ${packages.videoCategory} LIKE ${"%" + "," + category.matchKeywords[0]} OR ${packages.videoCategory} LIKE ${"%" + "," + category.matchKeywords[0] + ",%" }`
        )
      );

    if (matchingEditorIds.length === 0) return [];
    conditions.push(inArray(editors.id, matchingEditorIds.map((x) => x.id)));
  }

  const minPriceExpr = sql<number | null>`MIN(CASE WHEN ${packages.isActive} = true THEN ${packages.price} END)`;
  const minDeliveryExpr = sql<number | null>`MIN(CASE WHEN ${packages.isActive} = true THEN ${packages.deliveryDays} END)`;
  const avgRatingExpr = sql<number | null>`ROUND(AVG(${reviews.rating})::numeric, 1)`;

  const featuredPlacementEnabled = await isFeatureEnabled("featured_placement");
  const featuredBoostExpr = featuredPlacementEnabled
    ? sql`(CASE WHEN ${editors.isFeatured} = true AND ${editors.featuredUntil} > now() AND (
        SELECT COUNT(*) FROM editors e2
        WHERE e2.is_featured = true AND e2.featured_until > now()
          AND (e2.featured_until < ${editors.featuredUntil} OR (e2.featured_until = ${editors.featuredUntil} AND e2.id < ${editors.id}))
      ) < 3 THEN 0 ELSE 1 END)`
    : sql`0::int`;

  const profileCompletenessExpr = sql`(
    (CASE WHEN LENGTH(COALESCE(${editors.bio}, '')) >= 200 THEN 25 ELSE 0 END) +
    (CASE WHEN ${users.image} IS NOT NULL THEN 25 ELSE 0 END) +
    (CASE WHEN EXISTS (SELECT 1 FROM packages p2 WHERE p2.editor_id = editors.id AND p2.is_active = true) THEN 25 ELSE 0 END) +
    (CASE WHEN (SELECT COUNT(*) FROM skills s2 WHERE s2.editor_id = editors.id) >= 3 THEN 25 ELSE 0 END)
  )`;
  const profileCompletenessFactorExpr = sql`(CASE
    WHEN ${profileCompletenessExpr} < 50 THEN 0.5
    WHEN ${profileCompletenessExpr} < 80 THEN 1.0
    ELSE 1.2
  END)`;

  const orderByExpr = sql`COALESCE(${editors.rankScore}, (${editors.totalOrders} * ${profileCompletenessFactorExpr}) / 100.0) DESC NULLS LAST`;

  const rows = await db
    .select({
      id: editors.id,
      name: users.name,
      displayName: editors.displayName,
      title: editors.title,
      image: users.image,
      bio: editors.bio,
      niche: editors.niche,
      location: editors.location,
      totalOrders: editors.totalOrders,
      isFeatured: featuredPlacementEnabled
        ? sql<boolean>`(${editors.isFeatured} = true AND ${editors.featuredUntil} > now())`
        : sql<boolean>`false`,
      minPrice: minPriceExpr,
      minDelivery: minDeliveryExpr,
      avgRating: avgRatingExpr,
      reviewCount: sql<number>`COUNT(DISTINCT ${reviews.id})::int`,
      thumbnailUrl: sql<string | null>`(SELECT thumbnail_url FROM portfolio_items WHERE editor_id = ${editors.id} AND thumbnail_url IS NOT NULL AND is_hidden = false LIMIT 1)`,
      videoUrl: sql<string | null>`(SELECT url FROM portfolio_items WHERE editor_id = ${editors.id} AND url IS NOT NULL AND is_hidden = false LIMIT 1)`,
    })
    .from(editors)
    .innerJoin(users, eq(editors.userId, users.id))
    .leftJoin(packages, eq(packages.editorId, editors.id))
    .leftJoin(
      reviews,
      and(eq(reviews.revieweeId, editors.userId), eq(reviews.role, "client"))
    )
    .where(and(...conditions))
    .groupBy(editors.id, users.id, editors.displayName, editors.title, editors.niche, editors.location)
    .orderBy(featuredBoostExpr, orderByExpr)
    .limit(30);

  if (rows.length === 0) return [];
  const editorIds = rows.map((r) => r.id);
  const skillRows = await db
    .select({ editorId: skills.editorId, name: skills.name })
    .from(skills)
    .where(inArray(skills.editorId, editorIds));

  const skillsByEditor: Record<string, string[]> = {};
  for (const s of skillRows) {
    if (!skillsByEditor[s.editorId]) skillsByEditor[s.editorId] = [];
    skillsByEditor[s.editorId].push(s.name);
  }

  const r2Base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  return rows.map((e) => ({
    ...e,
    videoUrl: toPortfolioProxyUrl(e.videoUrl, r2Base),
    thumbnailUrl: toPortfolioProxyUrl(e.thumbnailUrl, r2Base),
    skills: skillsByEditor[e.id] ?? [],
    isAvailable: true,
  }));
}

const getCachedCategoryEditors = (categorySlug: string) =>
  unstable_cache(
    async () => {
      const category = CATEGORY_PAGES.find((c) => c.slug === categorySlug);
      if (!category) return [];
      return getCategoryEditors(category);
    },
    ["category-editors-data", categorySlug],
    { revalidate: 300, tags: ["category-editors-data", `category-editors-${categorySlug}`] }
  )();

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = CATEGORY_PAGES.find((c) => c.slug === slug);
  if (!category) notFound();

  const matchingEditors = await getCachedCategoryEditors(category.slug);

  const relatedCategories = CATEGORY_PAGES.filter((c) =>
    category.relatedCategories.includes(c.slug)
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Dynamic Hero Section */}
      <div 
        className="relative overflow-hidden py-16 sm:py-20 text-neutral-900 border-b border-neutral-200/60"
        style={{ 
          background: `linear-gradient(135deg, ${category.accentColor}08 0%, #f8fafc 100%)` 
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
          <Link 
            href="/browse"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors mb-6 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Browse all categories
          </Link>
          
          <div className="flex items-start gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white flex items-center justify-center text-2xl sm:text-4xl border border-neutral-200/60 shadow-sm">
              {category.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight leading-none mb-3">
                {category.h1}
              </h1>
              <p className="text-neutral-550 text-sm sm:text-base max-w-2xl leading-relaxed">
                {category.heroDescription}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 mt-10">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Grid */}
          <div className="lg:col-span-3 space-y-8">
            <div className="flex items-center justify-between border-b border-gray-200/80 pb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-600">
                  {matchingEditors.length} verified editors matching &ldquo;{category.name}&rdquo;
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Available Now</span>
              </div>
            </div>

            {matchingEditors.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="font-bold text-gray-800">No editors found</p>
                <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                  We are currently onboarding verified editors for this niche. In the meantime, you can explore other categories or post a custom request.
                </p>
                <Link 
                  href="/browse"
                  className="inline-block mt-5 px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Clear niche filters
                </Link>
              </div>
            ) : (
              <Suspense>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {matchingEditors.map((editor) => (
                    <EditorCard key={editor.id} {...editor} />
                  ))}
                </div>
              </Suspense>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Related Categories */}
            {relatedCategories.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Related Services
                </h3>
                <div className="divide-y divide-gray-50">
                  {relatedCategories.map((rc) => (
                    <Link
                      key={rc.slug}
                      href={`/editors/${rc.slug}`}
                      className="flex items-center justify-between py-3 text-xs font-semibold text-gray-700 hover:text-gray-900 group"
                    >
                      <span className="flex items-center gap-2">
                        <span>{rc.icon}</span>
                        <span>{rc.name}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Quick trust card */}
            <div className="bg-gradient-to-br from-gray-900 to-slate-950 rounded-2xl p-5 text-white shadow-sm border border-slate-800">
              <h4 className="text-sm font-bold mb-2">Escrow-Protected</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                Your payment is held securely in escrow and only released to the editor after you review and approve the final work.
              </p>
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="flex items-center gap-2 text-[10px] text-slate-300">
                  <CheckCircle className="w-3.5 h-3.5 text-[var(--brand-client)]" />
                  Verified KYC Applications
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-300">
                  <CheckCircle className="w-3.5 h-3.5 text-[var(--brand-client)]" />
                  Secure RBI-Regulated Escrow
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* FAQs Section */}
        {category.faqs && category.faqs.length > 0 && (
          <section className="mt-16 border-t border-gray-200/80 pt-16">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-gray-400 shrink-0" />
                Frequently Asked Questions
              </h2>
              <p className="text-xs text-gray-500 mb-8">
                Everything you need to know about booking and collaborating with {category.name} in India.
              </p>
              
              <div className="space-y-4">
                {category.faqs.map((faq, index) => (
                  <details
                    key={index}
                    className="group border border-gray-150 rounded-xl bg-white [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex items-center justify-between gap-1.5 p-4 text-xs sm:text-sm font-bold text-gray-900 cursor-pointer focus:outline-none">
                      <span>{faq.q}</span>
                      <span className="relative shrink-0 w-5 h-5 rounded-full bg-gray-50 group-open:bg-gray-100 flex items-center justify-center transition-colors">
                        <ChevronRight className="w-3 h-3 text-gray-500 group-open:rotate-90 transition-transform" />
                      </span>
                    </summary>
                    <div className="px-4 pb-4 border-t border-gray-50 pt-3 text-xs sm:text-sm text-gray-600 leading-relaxed">
                      {faq.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Editor Comparison panel */}
      <Suspense>
        <ComparePanel />
      </Suspense>
    </div>
  );
}