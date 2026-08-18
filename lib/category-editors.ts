import { db } from "@/lib/db";
import { editors, users, packages, skills, reviews } from "@/lib/db/schema";
import { and, eq, or, ilike, exists, inArray, sql } from "drizzle-orm";
import { getOnTimeRates, getVerifiedPortfolioCounts } from "@/lib/trust";
import type { CategoryPage } from "@/lib/category-seo";

export interface CategoryEditor {
  id: string;
  name: string | null;
  displayName?: string | null;
  title?: string | null;
  image: string | null;
  bio: string | null;
  skills: string[];
  minPrice: number | null;
  minDelivery: number | null;
  avgRating: number | null;
  reviewCount: number;
  totalOrders: number;
  isAvailable?: boolean;
  onTimeRate?: number | null;
  verifiedPortfolioCount?: number;
}

// Builds the real match condition for a category — mirrors how editors
// actually tag themselves (niche field, skills table, or a package's
// video_category), rather than a generic "all editors" fallback.
function matchCondition(cat: CategoryPage) {
  if (cat.matchField === "niche") {
    return or(...cat.matchKeywords.map((k) => ilike(editors.niche, `%${k}%`)));
  }
  if (cat.matchField === "skill") {
    return exists(
      db
        .select({ id: skills.id })
        .from(skills)
        .where(
          and(
            eq(skills.editorId, editors.id),
            or(...cat.matchKeywords.map((k) => ilike(skills.name, `%${k}%`)))
          )
        )
    );
  }
  // packageCategory
  return exists(
    db
      .select({ id: packages.id })
      .from(packages)
      .where(
        and(
          eq(packages.editorId, editors.id),
          eq(packages.isActive, true),
          or(...cat.matchKeywords.map((k) => sql`${packages.videoCategory} = ${k} OR ${packages.videoCategory} LIKE ${k + ",%"} OR ${packages.videoCategory} LIKE ${"%" + "," + k} OR ${packages.videoCategory} LIKE ${"%" + "," + k + ",%" }`))
        )
      )
  );
}

export async function getCategoryEditors(cat: CategoryPage, limit: number = 12): Promise<CategoryEditor[]> {
  const minPriceExpr = sql<number | null>`MIN(CASE WHEN ${packages.isActive} = true THEN ${packages.price} END)`;
  const minDeliveryExpr = sql<number | null>`MIN(CASE WHEN ${packages.isActive} = true THEN ${packages.deliveryDays} END)`;
  const avgRatingExpr = sql<number | null>`ROUND(AVG(${reviews.rating})::numeric, 1)`;

  const rows = await db
    .select({
      id: editors.id,
      name: users.name,
      displayName: editors.displayName,
      title: editors.title,
      image: users.image,
      bio: editors.bio,
      totalOrders: editors.totalOrders,
      isAvailable: editors.isAvailable,
      minPrice: minPriceExpr,
      minDelivery: minDeliveryExpr,
      avgRating: avgRatingExpr,
      reviewCount: sql<number>`COUNT(DISTINCT ${reviews.id})::int`,
    })
    .from(editors)
    .innerJoin(users, eq(editors.userId, users.id))
    .leftJoin(packages, eq(packages.editorId, editors.id))
    .leftJoin(reviews, and(eq(reviews.revieweeId, editors.userId), eq(reviews.role, "client")))
    .where(and(eq(editors.kycStatus, "approved"), eq(editors.isAvailable, true), matchCondition(cat)))
    .groupBy(editors.id, users.id, editors.displayName, editors.title)
    .orderBy(sql`AVG(${reviews.rating}) DESC NULLS LAST`, sql`${editors.totalOrders} DESC`)
    .limit(limit);

  if (rows.length === 0) return [];

  const editorIds = rows.map((r) => r.id);
  const [skillRows, onTimeRates, verifiedCounts] = await Promise.all([
    db.select({ editorId: skills.editorId, name: skills.name }).from(skills).where(inArray(skills.editorId, editorIds)),
    getOnTimeRates(editorIds),
    getVerifiedPortfolioCounts(editorIds),
  ]);

  const skillsByEditor: Record<string, string[]> = {};
  for (const s of skillRows) {
    if (!skillsByEditor[s.editorId]) skillsByEditor[s.editorId] = [];
    skillsByEditor[s.editorId].push(s.name);
  }

  return rows.map((r) => ({
    ...r,
    skills: skillsByEditor[r.id] ?? [],
    onTimeRate: onTimeRates[r.id] ?? null,
    verifiedPortfolioCount: verifiedCounts[r.id] ?? 0,
  }));
}
