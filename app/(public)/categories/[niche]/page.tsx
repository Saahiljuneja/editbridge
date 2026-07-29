import { redirect } from "next/navigation";
import { CATEGORY_PAGES } from "@/lib/category-seo";

export default async function CategoriesRedirectPage({
  params,
}: {
  params: Promise<{ niche: string }>;
}) {
  const { niche } = await params;

  // If the niche corresponds to a standard category slug, redirect there.
  // Otherwise, redirect to the browse search page with niche filter.
  const hasCategory = CATEGORY_PAGES.some((c) => c.slug === niche);
  if (hasCategory) {
    redirect(`/editors/${niche}`);
  } else {
    redirect(`/browse?niche=${encodeURIComponent(niche)}`);
  }
}