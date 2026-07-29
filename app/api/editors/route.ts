import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { editors, users, packages, skills, reviews, xpBoosts } from "@/lib/db/schema";
import { and, eq, ilike, or, inArray, sql, asc, desc } from "drizzle-orm";
import { getOnTimeRates, getVerifiedPortfolioCounts } from "@/lib/trust";
import { isFeatureEnabled } from "@/lib/feature-flags";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Fast path: when specific editor IDs are requested (e.g., comparison panel)
    const idsParam = searchParams.get("ids");
    if (idsParam) {
      const ids = idsParam.split(",").filter(Boolean).slice(0, 5);
      if (ids.length === 0) return NextResponse.json({ editors: [] });
      const minPriceExpr = sql<number | null>`MIN(CASE WHEN ${packages.isActive} = true THEN ${packages.price} END)`;
      const minDeliveryExpr = sql<number | null>`MIN(CASE WHEN ${packages.isActive} = true THEN ${packages.deliveryDays} END)`;
      const avgRatingExpr = sql<number | null>`ROUND(AVG(${reviews.rating})::numeric, 1)`;
      const rows = await db
        .select({
          id: editors.id,
          name: users.name,
          displayName: editors.displayName,
          image: users.image,
          niche: editors.niche,
          location: editors.location,
          totalOrders: editors.totalOrders,
          minPrice: minPriceExpr,
          minDelivery: minDeliveryExpr,
          avgRating: avgRatingExpr,
          reviewCount: sql<number>`COUNT(DISTINCT ${reviews.id})::int`,
          thumbnailUrl: sql<string | null>`(SELECT thumbnail_url FROM portfolio_items WHERE editor_id = ${editors.id} AND thumbnail_url IS NOT NULL AND is_hidden = false LIMIT 1)`,
          videoUrl: sql<string | null>`(SELECT url FROM portfolio_items WHERE editor_id = ${editors.id} AND url IS NOT NULL AND is_hidden = false LIMIT 1)`,
          activeFrame: editors.activeFrame,
          hasHighlight: sql<boolean>`EXISTS (SELECT 1 FROM xp_boosts WHERE user_id = ${editors.userId} AND type = 'profile_highlight' AND (expires_at IS NULL OR expires_at > now()))`,
        })
        .from(editors)
        .innerJoin(users, eq(editors.userId, users.id))
        .leftJoin(packages, eq(packages.editorId, editors.id))
        .leftJoin(reviews, and(eq(reviews.revieweeId, editors.userId), eq(reviews.role, "client")))
        .where(inArray(editors.id, ids))
        .groupBy(editors.id, users.id, editors.displayName, editors.niche, editors.location, editors.activeFrame);
      const skillRows = await db.select({ editorId: skills.editorId, name: skills.name }).from(skills).where(inArray(skills.editorId, ids));
      const skillsByEditor: Record<string, string[]> = {};
      for (const s of skillRows) {
        if (!skillsByEditor[s.editorId]) skillsByEditor[s.editorId] = [];
        skillsByEditor[s.editorId].push(s.name);
      }
      return NextResponse.json({ editors: rows.map((e) => ({ ...e, skills: skillsByEditor[e.id] ?? [] })) });
    }

    const q = searchParams.get("q") || "";
    const niche = searchParams.get("niche") || "";
    const experienceLevel = searchParams.get("experience") || "";
    // min/max price arrive in rupees from the UI — convert to paise for DB comparison
    const minPrice = searchParams.get("min_price") ? Number(searchParams.get("min_price")) * 100 : null;
    const maxPrice = searchParams.get("max_price") ? Number(searchParams.get("max_price")) * 100 : null;
    const deliveryDays = searchParams.get("delivery_days") ? Number(searchParams.get("delivery_days")) : null;
    const minRating = searchParams.get("min_rating") ? Number(searchParams.get("min_rating")) : null;
    const sort = searchParams.get("sort") || "popular";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(50, Number(searchParams.get("limit") || "12"));
    const offset = (page - 1) * limit;

    const conditions = [
      eq(editors.kycStatus, "approved"),
      eq(editors.isAvailable, true),
    ];

    if (q) {
      conditions.push(or(ilike(users.name, `%${q}%`), ilike(editors.bio, `%${q}%`))!);
    }

    if (niche) {
      // niche field stores either plain text or JSON array — ilike covers both
      conditions.push(ilike(editors.niche, `%${niche}%`));
    }

    if (experienceLevel) {
      conditions.push(eq(editors.experienceLevel, experienceLevel));
    }

    const minPriceExpr = sql<number | null>`MIN(CASE WHEN ${packages.isActive} = true THEN ${packages.price} END)`;
    const avgRatingExpr = sql<number | null>`ROUND(AVG(${reviews.rating})::numeric, 1)`;

    const havingClauses = [];
    if (minPrice !== null) havingClauses.push(sql`${minPriceExpr} >= ${minPrice}`);
    if (maxPrice !== null) havingClauses.push(sql`${minPriceExpr} <= ${maxPrice}`);
    if (minRating !== null) havingClauses.push(sql`COALESCE(${avgRatingExpr}, 0) >= ${minRating}`);

    // Coarse profile-completeness estimate (0-100) used only to rank the default
    // "popular" sort — deliberately not applied to explicit price/rating/newest
    // sorts, since a client choosing "cheapest first" wants literal cheapest,
    // not a quality-skewed order. Mirrors the signals in lib/profile-score.ts
    // without needing that function's full related-row fetch here.
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

    let orderByExpr;
    switch (sort) {
      case "price_asc":
        orderByExpr = sql`MIN(CASE WHEN ${packages.isActive} = true THEN ${packages.price} END) ASC NULLS LAST`;
        break;
      case "price_desc":
        orderByExpr = sql`MIN(CASE WHEN ${packages.isActive} = true THEN ${packages.price} END) DESC NULLS LAST`;
        break;
      case "rating":
        orderByExpr = sql`AVG(${reviews.rating}) DESC NULLS LAST`;
        break;
      case "newest":
        orderByExpr = desc(editors.createdAt);
        break;
      default:
        orderByExpr = sql`(${editors.totalOrders} * ${profileCompletenessFactorExpr}) DESC`;
    }

    const minDeliveryExpr = sql<number | null>`MIN(CASE WHEN ${packages.isActive} = true THEN ${packages.deliveryDays} END)`;

    // Featured editors are boosted to the top, but capped at 3 so the page
    // doesn't turn into an ad grid — rank by soonest-to-expire among featured.
    // Both gated by the feature flag — flipping it off immediately reverts the
    // page to normal ordering with no badges, without touching any editor's
    // underlying is_featured/featured_until state.
    const featuredPlacementEnabled = await isFeatureEnabled("featured_placement");
    const featuredBoostExpr = featuredPlacementEnabled
      ? sql`(CASE WHEN (${editors.isFeatured} = true AND ${editors.featuredUntil} > now()) OR EXISTS (
          SELECT 1 FROM xp_boosts WHERE user_id = ${editors.userId} AND type = 'featured_boost' AND (expires_at IS NULL OR expires_at > now())
        ) THEN 0 ELSE 1 END)`
      : sql`0::int`; // typed literal — a bare `0` gets parsed as an ORDER BY ordinal position, not a value

    let query = db
      .select({
        id: editors.id,
        userId: editors.userId,
        name: users.name,
        displayName: editors.displayName,
        title: editors.title,
        image: users.image,
        bio: editors.bio,
        niche: editors.niche,
        location: editors.location,
        completionRate: editors.completionRate,
        totalOrders: editors.totalOrders,
        avgResponseTime: editors.avgResponseTime,
        createdAt: editors.createdAt,
        isFeatured: featuredPlacementEnabled
          ? sql<boolean>`(${editors.isFeatured} = true AND ${editors.featuredUntil} > now())`
          : sql<boolean>`false`,
        minPrice: minPriceExpr,
        minDelivery: minDeliveryExpr,
        avgRating: avgRatingExpr,
        reviewCount: sql<number>`COUNT(DISTINCT ${reviews.id})::int`,
        thumbnailUrl: sql<string | null>`(SELECT thumbnail_url FROM portfolio_items WHERE editor_id = ${editors.id} AND thumbnail_url IS NOT NULL AND is_hidden = false LIMIT 1)`,
        videoUrl: sql<string | null>`(SELECT url FROM portfolio_items WHERE editor_id = ${editors.id} AND url IS NOT NULL AND is_hidden = false LIMIT 1)`,
        activeFrame: editors.activeFrame,
        hasHighlight: sql<boolean>`EXISTS (SELECT 1 FROM xp_boosts WHERE user_id = ${editors.userId} AND type = 'profile_highlight' AND (expires_at IS NULL OR expires_at > now()))`,
      })
      .from(editors)
      .innerJoin(users, eq(editors.userId, users.id))
      .leftJoin(packages, eq(packages.editorId, editors.id))
      .leftJoin(
        reviews,
        and(eq(reviews.revieweeId, editors.userId), eq(reviews.role, "client"))
      )
      .where(and(...conditions))
      .groupBy(editors.id, users.id, editors.displayName, editors.title, editors.niche, editors.location, editors.activeFrame)
      .$dynamic();

    // Apply delivery days HAVING filter
    const allHaving = [...havingClauses];
    if (deliveryDays !== null) {
      allHaving.push(sql`${minDeliveryExpr} <= ${deliveryDays}`);
    }

    if (allHaving.length > 0) {
      query = query.having(and(...allHaving));
    }

    // Count total (run count query before pagination)
    const countQuery = db
      .select({ count: sql<number>`COUNT(DISTINCT ${editors.id})::int` })
      .from(editors)
      .innerJoin(users, eq(editors.userId, users.id))
      .leftJoin(packages, eq(packages.editorId, editors.id))
      .leftJoin(
        reviews,
        and(eq(reviews.revieweeId, editors.userId), eq(reviews.role, "client"))
      )
      .where(and(...conditions))
      .$dynamic();

    const [editorRows, countResult] = await Promise.all([
      query.orderBy(featuredBoostExpr, orderByExpr).limit(limit).offset(offset),
      countQuery,
    ]);

    if (editorRows.length === 0) {
      return NextResponse.json({ editors: [], total: 0, page, totalPages: 0 });
    }

    const editorIds = editorRows.map((e) => e.id);
    const skillRows = await db
      .select({ editorId: skills.editorId, name: skills.name })
      .from(skills)
      .where(inArray(skills.editorId, editorIds));

    const skillsByEditor: Record<string, string[]> = {};
    for (const s of skillRows) {
      if (!skillsByEditor[s.editorId]) skillsByEditor[s.editorId] = [];
      skillsByEditor[s.editorId].push(s.name);
    }

    const [onTimeRates, verifiedCounts] = await Promise.all([
      getOnTimeRates(editorIds),
      getVerifiedPortfolioCounts(editorIds),
    ]);

    const total = countResult[0]?.count ?? 0;

    return NextResponse.json({
      editors: editorRows.map((e) => ({
        ...e,
        skills: skillsByEditor[e.id] ?? [],
        onTimeRate: onTimeRates[e.id] ?? null,
        verifiedPortfolioCount: verifiedCounts[e.id] ?? 0,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[GET /api/editors]", error);
    return NextResponse.json({ error: "Failed to fetch editors" }, { status: 500 });
  }
}
