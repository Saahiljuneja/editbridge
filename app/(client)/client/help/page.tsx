export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { helpCategories, helpArticles } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import {
  IndianRupee, ShoppingBag, AlertTriangle, UserCheck,
  Shield, HelpCircle, ArrowRight, ExternalLink, Search,
} from "lucide-react";
import { getPlatformSettings } from "@/lib/platform-settings";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  IndianRupee, ShoppingBag, AlertTriangle, UserCheck, Shield, HelpCircle,
};

export default async function ClientHelpPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { supportEmail } = await getPlatformSettings();

  const [categories, recentArticles] = await Promise.all([
    db
      .select({
        id: helpCategories.id,
        name: helpCategories.name,
        slug: helpCategories.slug,
        description: helpCategories.description,
        icon: helpCategories.icon,
      })
      .from(helpCategories)
      .orderBy(helpCategories.sortOrder),

    db
      .select({
        id: helpArticles.id,
        title: helpArticles.title,
        slug: helpArticles.slug,
        readTime: helpArticles.readTime,
        categorySlug: helpCategories.slug,
        categoryName: helpCategories.name,
      })
      .from(helpArticles)
      .innerJoin(helpCategories, eq(helpCategories.id, helpArticles.categoryId))
      .where(eq(helpArticles.isPublished, true))
      .orderBy(desc(helpArticles.viewCount))
      .limit(6),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Help Center</h1>
            <p className="text-sm text-gray-400 mt-0.5">Policies, guides, and platform documentation</p>
          </div>
          <Link
            href="/help"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-client)] border border-[var(--brand-client)]/20 rounded-xl px-4 py-2 hover:bg-[var(--brand-client)]/5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Full Help Center
          </Link>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Quick search redirect */}
        <Link
          href="/help"
          className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl p-4 hover:border-[var(--brand-client)]/30 hover:shadow-sm transition-all group"
        >
          <Search className="w-5 h-5 text-gray-400 group-hover:text-[var(--brand-client)] transition-colors" />
          <span className="text-sm text-gray-400 group-hover:text-gray-600 transition-colors">
            Search policies and articles...
          </span>
        </Link>

        {/* Categories */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Browse by Topic</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const IconComponent = cat.icon ? (ICON_MAP[cat.icon] ?? HelpCircle) : HelpCircle;
              return (
                <Link
                  key={cat.id}
                  href={`/help/${cat.slug}`}
                  target="_blank"
                  className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-[var(--brand-client)]/30 hover:shadow-md transition-all group flex flex-col gap-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-[var(--brand-client)]/8 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <IconComponent className="w-4.5 h-4.5 text-[var(--brand-client)]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 group-hover:text-[var(--brand-client)] transition-colors mb-0.5">
                      {cat.name}
                    </p>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{cat.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--brand-client)] mt-auto">
                    View articles <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Popular articles */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Popular Policies</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
            {recentArticles.map((art) => (
              <Link
                key={art.id}
                href={`/help/article/${art.slug}`}
                target="_blank"
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-[var(--brand-client)] transition-colors truncate">
                    {art.title}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{art.categoryName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-gray-400">{art.readTime}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[var(--brand-client)] transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-2xl border border-[var(--brand-client)]/15 bg-[var(--brand-client)]/5 p-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--brand-client)] mb-0.5">Still need help?</p>
            <p className="text-xs text-gray-600">
              Email our support team at{" "}
              <a href={`mailto:${supportEmail}`} className="underline font-medium">
                {supportEmail}
              </a>{" "}
              and we'll respond within 24 hours.
            </p>
          </div>
          <a
            href={`mailto:${supportEmail}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white px-4 py-2.5 rounded-xl transition-colors shrink-0"
            style={{ background: "var(--brand-client)" }}
          >
            Contact Support <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
