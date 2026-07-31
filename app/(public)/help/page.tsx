import { db } from "@/lib/db";
import { helpCategories, helpArticles } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { HelpCenterClient } from "./help-center-client";

export const dynamic = "force-dynamic";

export default async function HelpCenterIndexPage() {
  // 1. Fetch categories
  const categoriesList = await db
    .select({
      id: helpCategories.id,
      name: helpCategories.name,
      slug: helpCategories.slug,
      description: helpCategories.description,
      icon: helpCategories.icon,
    })
    .from(helpCategories)
    .orderBy(helpCategories.sortOrder);

  // 2. Fetch top popular/trending articles
  const popularArticlesList = await db
    .select({
      id: helpArticles.id,
      title: helpArticles.title,
      slug: helpArticles.slug,
      excerpt: helpArticles.excerpt,
      readTime: helpArticles.readTime,
      categorySlug: helpCategories.slug,
    })
    .from(helpArticles)
    .innerJoin(helpCategories, eq(helpCategories.id, helpArticles.categoryId))
    .where(eq(helpArticles.isPublished, true))
    .orderBy(desc(helpArticles.viewCount))
    .limit(5);

  return (
    <HelpCenterClient
      categories={categoriesList}
      popularArticles={popularArticlesList}
    />
  );
}
