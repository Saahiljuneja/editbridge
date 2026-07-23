import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { editors } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { getCategoryBySlug } from "@/lib/category-seo";
import { getCategoryEditors, type CategoryEditor } from "@/lib/category-editors";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { displayNameFromFull } from "@/lib/utils";
import { z } from "zod";

const matchSchema = z.object({
  categorySlug: z.string(),
  experienceLevel: z.enum(["entry", "intermediate", "expert", "any"]),
  budgetBand: z.enum(["under_2000", "2000_8000", "8000_20000", "20000_plus"]),
  deadlineBand: z.enum(["rush", "week", "two_weeks", "no_rush"]),
  priority: z.enum(["quality", "speed", "price"]),
});

// Prices in paise, matching packages.price's unit.
const BUDGET_RANGES: Record<string, [number, number]> = {
  under_2000: [0, 200_000],
  "2000_8000": [200_000, 800_000],
  "8000_20000": [800_000, 2_000_000],
  "20000_plus": [2_000_000, Infinity],
};
const BUDGET_ORDER = ["under_2000", "2000_8000", "8000_20000", "20000_plus"];

const DEADLINE_DAYS: Record<string, number> = {
  rush: 2,
  week: 7,
  two_weeks: 14,
  no_rush: 9999,
};

function priceScore(minPrice: number | null, budgetBand: string): number {
  if (minPrice === null) return 15; // unknown pricing — neutral, don't punish
  const selectedIdx = BUDGET_ORDER.indexOf(budgetBand);
  const actualIdx = BUDGET_ORDER.findIndex((band) => {
    const [lo, hi] = BUDGET_RANGES[band];
    return minPrice >= lo && minPrice < hi;
  });
  if (actualIdx === -1) return 0;
  const distance = Math.abs(actualIdx - selectedIdx);
  if (distance === 0) return 30;
  if (distance === 1) return 18;
  if (distance === 2) return 8;
  return 0;
}

function buildMatchReason(
  e: CategoryEditor,
  categoryName: string,
  priority: "quality" | "speed" | "price"
): string {
  const name = displayNameFromFull(e.displayName || e.name);
  const singularCategory = categoryName.replace(/s$/, "");
  const parts: string[] = [`${name} is a ${singularCategory}`];

  if (priority === "price" && e.minPrice !== null) {
    parts.push(`and fits your budget at ₹${(e.minPrice / 100).toLocaleString("en-IN")}`);
  } else if (priority === "quality" && e.avgRating !== null) {
    parts.push(`and has a ${e.avgRating}★ rating from clients`);
  } else if (priority === "speed" && e.onTimeRate != null) {
    parts.push(`and delivers on time ${e.onTimeRate}% of the time`);
  } else if (e.avgRating !== null) {
    parts.push(`and has a ${e.avgRating}★ rating from clients`);
  }

  if (e.minDelivery !== null) {
    parts.push(`with ${e.minDelivery}-day delivery`);
  }

  return parts.join(" ") + ".";
}

export async function POST(request: NextRequest) {
  if (!(await isFeatureEnabled("find_editor_quiz"))) {
    return NextResponse.json({ error: "This feature is currently unavailable" }, { status: 403 });
  }

  const parsed = matchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { categorySlug, experienceLevel, budgetBand, deadlineBand, priority } = parsed.data;

  const cat = getCategoryBySlug(categorySlug);
  if (!cat) return NextResponse.json({ error: "Unknown category" }, { status: 400 });

  const candidates = await getCategoryEditors(cat, 50);
  if (candidates.length === 0) {
    return NextResponse.json({ matches: [], categoryName: cat.name });
  }

  const experienceRows =
    experienceLevel === "any"
      ? []
      : await db
          .select({ id: editors.id, experienceLevel: editors.experienceLevel })
          .from(editors)
          .where(inArray(editors.id, candidates.map((c) => c.id)));
  const experienceById = new Map(experienceRows.map((r) => [r.id, r.experienceLevel]));

  let pool = candidates;

  // Experience level is a soft-preferred filter — fall back to the full pool
  // if applying it would leave nothing to show.
  if (experienceLevel !== "any") {
    const filtered = pool.filter((c) => experienceById.get(c.id) === experienceLevel);
    if (filtered.length > 0) pool = filtered;
  }

  // Delivery deadline is also applied with a fallback, so a tight deadline
  // in a thin category never produces a dead end.
  const deadlineDays = DEADLINE_DAYS[deadlineBand];
  const withinDeadline = pool.filter((c) => c.minDelivery !== null && c.minDelivery <= deadlineDays);
  if (withinDeadline.length > 0) pool = withinDeadline;

  const scored = pool.map((c) => {
    const categoryScore = 40; // already filtered to this category by getCategoryEditors
    const priceScoreValue = priceScore(c.minPrice, budgetBand);
    const onTimeScore = c.onTimeRate != null ? Math.round(15 * (c.onTimeRate / 100)) : 10;
    const ratingScore = c.avgRating !== null ? Math.round(15 * (c.avgRating / 5)) : 10;
    return {
      editor: c,
      score: categoryScore + priceScoreValue + onTimeScore + ratingScore,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);

  const matches = top.map(({ editor, score }) => ({
    ...editor,
    matchScore: score,
    matchReason: buildMatchReason(editor, cat.name, priority),
  }));

  // Pre-computed link params for "see all editors" — price/delivery apply
  // universally; niche is only accurate when this category's real match
  // field is editors.niche (packageCategory/skill categories use a
  // different underlying field the browse page can't filter by directly).
  const [budgetMin, budgetMax] = BUDGET_RANGES[budgetBand];
  const browseParams = new URLSearchParams();
  if (cat.matchField === "niche") browseParams.set("niche", cat.matchKeywords[0]);
  browseParams.set("min_price", String(Math.round(budgetMin / 100)));
  if (budgetMax !== Infinity) browseParams.set("max_price", String(Math.round(budgetMax / 100)));
  if (deadlineBand !== "no_rush") browseParams.set("delivery", String(deadlineDays));
  browseParams.set("sort", priority === "price" ? "price_asc" : priority === "quality" ? "rating" : "popular");

  return NextResponse.json({
    matches,
    categoryName: cat.name,
    categorySlug: cat.slug,
    browseQuery: browseParams.toString(),
  });
}
