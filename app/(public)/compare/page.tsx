export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { editors, users, packages, skills, reviews } from "@/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { displayNameFromFull, formatCurrency } from "@/lib/utils";
import { getOnTimeRates } from "@/lib/trust";
import { Star, Clock, Timer, TrendingUp, ArrowRight, Package, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparePageProps {
  searchParams: Promise<{ editors?: string }>;
}

function responseLabel(minutes: number | null): string {
  if (minutes == null) return "—";
  return minutes < 60 ? `${minutes}m` : `${Math.round(minutes / 60)}h`;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { editors: editorsParam } = await searchParams;
  const editorIds = (editorsParam ?? "").split(",").filter(Boolean).slice(0, 3);

  if (editorIds.length < 2) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <Package className="w-12 h-12 text-gray-200 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-1">Nothing to compare yet</h1>
        <p className="text-sm text-gray-400 mb-6 max-w-sm">
          Pick 2 or 3 editors from the browse page and hit &quot;Compare now&quot; to see them side by side.
        </p>
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "var(--brand-client)" }}
        >
          Browse editors <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const editorRows = await db
    .select({
      id: editors.id,
      userId: editors.userId,
      name: users.name,
      displayName: editors.displayName,
      title: editors.title,
      image: users.image,
      avgResponseTime: editors.avgResponseTime,
      totalOrders: editors.totalOrders,
      isAvailable: editors.isAvailable,
    })
    .from(editors)
    .innerJoin(users, eq(editors.userId, users.id))
    .where(inArray(editors.id, editorIds));

  const ordered = editorIds.map((id) => editorRows.find((e) => e.id === id)).filter((e): e is typeof editorRows[number] => !!e);
  if (ordered.length < 2) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <p className="text-sm text-gray-400">One or more of these editors couldn&apos;t be found.</p>
        <Link href="/browse" className="mt-4 text-sm text-[var(--brand-client)] hover:underline">← Back to browse</Link>
      </div>
    );
  }

  const userIds = ordered.map((e) => e.userId);

  const [onTimeRates, skillRows, reviewStats, packageRows] = await Promise.all([
    getOnTimeRates(editorIds),
    db.select({ editorId: skills.editorId, name: skills.name }).from(skills).where(inArray(skills.editorId, editorIds)),
    db
      .select({
        revieweeId: reviews.revieweeId,
        avgRating: sql<number>`ROUND(AVG(${reviews.rating})::numeric, 1)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(reviews)
      .where(and(inArray(reviews.revieweeId, userIds), eq(reviews.role, "client")))
      .groupBy(reviews.revieweeId),
    db.select().from(packages).where(and(inArray(packages.editorId, editorIds), eq(packages.isActive, true))),
  ]);

  const skillsByEditor = new Map<string, string[]>();
  for (const s of skillRows) {
    if (!skillsByEditor.has(s.editorId)) skillsByEditor.set(s.editorId, []);
    skillsByEditor.get(s.editorId)!.push(s.name);
  }

  const reviewByUser = new Map(reviewStats.map((r) => [r.revieweeId, { rating: Number(r.avgRating), count: r.count }]));

  const packagesByEditor = new Map<string, typeof packageRows>();
  for (const p of packageRows) {
    if (!packagesByEditor.has(p.editorId)) packagesByEditor.set(p.editorId, []);
    packagesByEditor.get(p.editorId)!.push(p);
  }

  const cols = ordered.map((e) => {
    const pkgs = (packagesByEditor.get(e.id) ?? []).slice().sort((a, b) => a.price - b.price);
    const cheapest = pkgs[0] ?? null;
    const fastest = pkgs.length ? Math.min(...pkgs.map((p) => p.deliveryDays)) : null;
    const review = reviewByUser.get(e.userId) ?? null;
    return {
      ...e,
      displayName: e.displayName || displayNameFromFull(e.name),
      skills: skillsByEditor.get(e.id) ?? [],
      onTimeRate: onTimeRates[e.id] ?? null,
      startingPrice: cheapest?.price ?? null,
      fastestDelivery: fastest,
      cheapestPackageId: cheapest?.id ?? null,
      rating: review?.rating ?? null,
      reviewCount: review?.count ?? 0,
    };
  });

  const bestPrice = Math.min(...cols.map((c) => c.startingPrice).filter((v): v is number => v != null));
  const bestDelivery = Math.min(...cols.map((c) => c.fastestDelivery).filter((v): v is number => v != null));
  const bestResponse = Math.min(...cols.map((c) => c.avgResponseTime).filter((v): v is number => v != null));
  const bestOnTime = Math.max(...cols.map((c) => c.onTimeRate).filter((v): v is number => v != null));

  const rows: { label: string; icon: React.ElementType; render: (c: (typeof cols)[number]) => React.ReactNode }[] = [
    {
      label: "Starting price",
      icon: TrendingUp,
      render: (c) =>
        c.startingPrice != null ? (
          <span className={cn("text-sm", c.startingPrice === bestPrice && "font-bold text-green-600")}>
            {formatCurrency(c.startingPrice)}
            {c.startingPrice === bestPrice && <span className="ml-1.5 text-[10px] font-bold text-green-500 uppercase">Best value</span>}
          </span>
        ) : (
          <span className="text-gray-300 text-sm">—</span>
        ),
    },
    {
      label: "Fastest delivery",
      icon: Clock,
      render: (c) =>
        c.fastestDelivery != null ? (
          <span className={cn("text-sm", c.fastestDelivery === bestDelivery && "font-bold text-green-600")}>
            {c.fastestDelivery} day{c.fastestDelivery !== 1 ? "s" : ""}
          </span>
        ) : (
          <span className="text-gray-300 text-sm">—</span>
        ),
    },
    {
      label: "Response time",
      icon: Timer,
      render: (c) => (
        <span className={cn("text-sm", c.avgResponseTime != null && c.avgResponseTime === bestResponse && "font-bold text-green-600")}>
          {responseLabel(c.avgResponseTime)}
        </span>
      ),
    },
    {
      label: "On-time rate",
      icon: TrendingUp,
      render: (c) =>
        c.onTimeRate != null ? (
          <span className={cn("text-sm", c.onTimeRate === bestOnTime && "font-bold text-green-600")}>{c.onTimeRate}%</span>
        ) : (
          <span className="text-gray-300 text-sm">—</span>
        ),
    },
    {
      label: "Rating",
      icon: Star,
      render: (c) =>
        c.rating != null ? (
          <span className="flex items-center gap-1 text-sm">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {c.rating} <span className="text-gray-400 text-xs">({c.reviewCount})</span>
          </span>
        ) : (
          <span className="text-gray-300 text-sm">No reviews</span>
        ),
    },
    {
      label: "Total orders",
      icon: Users,
      render: (c) => <span className="text-sm">{c.totalOrders}</span>,
    },
    {
      label: "Top skills",
      icon: Package,
      render: (c) =>
        c.skills.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {c.skills.slice(0, 3).map((s) => (
              <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--brand-client)]/8 text-[var(--brand-client)] border border-[var(--brand-client)]/15">
                {s}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-300 text-sm">—</span>
        ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Compare Editors</h1>
          <p className="text-sm text-gray-400">Side-by-side, so you can pick faster.</p>
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {/* Header row — identity */}
          <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: `160px repeat(${cols.length}, 1fr)` }}>
            <div />
            {cols.map((c) => (
              <div key={c.id} className="px-5 py-5 border-l border-gray-50 text-center">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-[var(--brand-client)] to-violet-600 flex items-center justify-center mx-auto mb-2">
                  {c.image ? (
                    <Image src={c.image} alt={c.displayName} width={56} height={56} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-white font-bold text-lg">{c.displayName.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <p className="font-bold text-gray-900 text-sm">{c.displayName}</p>
                {c.title && <p className="text-xs text-gray-400 mt-0.5">{c.title}</p>}
                {c.isAvailable && (
                  <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-green-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Available
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Stat rows */}
          {rows.map(({ label, icon: Icon, render }) => (
            <div
              key={label}
              className="grid border-b border-gray-50 last:border-0"
              style={{ gridTemplateColumns: `160px repeat(${cols.length}, 1fr)` }}
            >
              <div className="px-5 py-3.5 flex items-center gap-2 text-xs font-semibold text-gray-500">
                <Icon className="w-3.5 h-3.5 text-gray-300 shrink-0" /> {label}
              </div>
              {cols.map((c) => (
                <div key={c.id} className="px-5 py-3.5 flex items-center justify-center border-l border-gray-50 text-center">
                  {render(c)}
                </div>
              ))}
            </div>
          ))}

          {/* CTA row */}
          <div className="grid" style={{ gridTemplateColumns: `160px repeat(${cols.length}, 1fr)` }}>
            <div />
            {cols.map((c) => (
              <div key={c.id} className="px-5 py-5 border-l border-gray-50 flex flex-col gap-2">
                <Link
                  href={`/editor/${c.id}`}
                  className="flex items-center justify-center px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  View profile
                </Link>
                {c.cheapestPackageId ? (
                  <Link
                    href={`/checkout/${c.cheapestPackageId}`}
                    className="flex items-center justify-center px-3 py-2 rounded-xl text-xs font-bold text-white bg-[var(--brand-client)] hover:bg-[var(--brand-editor-hover)] transition-colors"
                  >
                    Book now
                  </Link>
                ) : (
                  <span className="flex items-center justify-center px-3 py-2 rounded-xl text-xs font-medium text-gray-300 border border-dashed border-gray-200">
                    No packages
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}