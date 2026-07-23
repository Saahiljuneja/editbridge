import { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { editors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CATEGORY_PAGES } from "@/lib/category-seo";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://editbridge.in";

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: BASE_URL,                   lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
  { url: `${BASE_URL}/browse`,       lastModified: new Date(), changeFrequency: "hourly",  priority: 0.9 },
  { url: `${BASE_URL}/how-it-works`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/pricing`,      lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/showcase`,     lastModified: new Date(), changeFrequency: "weekly",  priority: 0.7 },
  { url: `${BASE_URL}/about`,        lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE_URL}/contact`,      lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE_URL}/faq`,          lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE_URL}/terms`,        lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
  { url: `${BASE_URL}/privacy`,      lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
];

// SEO landing pages — one per category, defined in lib/category-seo.ts
const CATEGORY_SITEMAP: MetadataRoute.Sitemap = CATEGORY_PAGES.map((c) => ({
  url: `${BASE_URL}/editors/${c.slug}`,
  lastModified: new Date(),
  changeFrequency: "weekly" as const,
  priority: 0.85,
}));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all approved editor IDs for dynamic profile pages
  let editorPages: MetadataRoute.Sitemap = [];
  try {
    const approvedEditors = await db
      .select({ id: editors.id, updatedAt: editors.updatedAt })
      .from(editors)
      .where(eq(editors.kycStatus, "approved"));

    editorPages = approvedEditors.map((e) => ({
      url: `${BASE_URL}/editor/${e.id}`,
      lastModified: e.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // DB unavailable during build — skip dynamic pages
  }

  return [...STATIC_PAGES, ...CATEGORY_SITEMAP, ...editorPages];
}
