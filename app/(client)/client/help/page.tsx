export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { helpCategories, helpArticles } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import {
  IndianRupee, ShoppingBag, AlertTriangle, UserCheck,
  Shield, HelpCircle, ArrowRight, ExternalLink, Search, MessageSquare,
} from "lucide-react";
import { getPlatformSettings } from "@/lib/platform-settings";
import { TopoBackground } from "@/components/common/topo-background";
import { SupportContent } from "../support/support-content";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  IndianRupee, ShoppingBag, AlertTriangle, UserCheck, Shield, HelpCircle,
};

const PAGE_TABS = [
  { value: "faq",     label: "Help & FAQ",      icon: HelpCircle },
  { value: "support", label: "Support Tickets",  icon: MessageSquare },
];

export default async function ClientHelpPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const tab = (params.tab ?? "faq") as "faq" | "support";

  const { supportEmail } = await getPlatformSettings();

  let categories: { id: string; name: string; slug: string; description: string | null; icon: string | null }[] = [];
  let recentArticles: { id: string; title: string; slug: string; readTime: string | null; categorySlug: string; categoryName: string }[] = [];

  if (tab === "faq") {
    [categories, recentArticles] = await Promise.all([
      db.select({
        id: helpCategories.id,
        name: helpCategories.name,
        slug: helpCategories.slug,
        description: helpCategories.description,
        icon: helpCategories.icon,
      }).from(helpCategories).orderBy(helpCategories.sortOrder),

      db.select({
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
  }

  return (
    <div className="relative min-h-screen bg-slate-50/50 pb-12 overflow-hidden">
      <TopoBackground background="#f8fafc" strokeColor="#e2e8f0" opacity={0.4} />

      <div className="max-w-6xl mx-auto px-6 pt-6 space-y-6 relative z-10">
        {/* Header */}
        <div className="bg-white rounded-3xl border border-neutral-200/60 p-6 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Help & Support</h1>
            <p className="text-xs text-neutral-400 font-semibold mt-1">Policies, guides, and support tickets</p>
          </div>
          <Link href="/help" target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e40af] border border-[#1e40af]/20 rounded-xl px-4 py-2 hover:bg-[#1e40af]/5 transition-colors shrink-0">
            <ExternalLink className="w-3.5 h-3.5" /> Full Help Center
          </Link>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-2">
          {PAGE_TABS.map((t) => {
            const isActive = tab === t.value;
            const Icon = t.icon;
            return (
              <Link
                key={t.value}
                href={t.value === "faq" ? "/client/help" : `/client/help?tab=${t.value}`}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shadow-sm",
                  isActive
                    ? "bg-brand-primary border-brand-primary text-white"
                    : "bg-white border-neutral-200/60 text-neutral-600 hover:bg-neutral-50"
                )}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </Link>
            );
          })}
        </div>

        {/* ─── FAQ TAB ─── */}
        {tab === "faq" && (
          <div className="space-y-6">
            <Link href="/help"
              className="flex items-center gap-3 bg-white border border-neutral-200 rounded-2xl p-4 hover:border-[var(--brand-client)]/30 hover:shadow-sm transition-all group">
              <Search className="w-5 h-5 text-neutral-400 group-hover:text-[var(--brand-client)] transition-colors" />
              <span className="text-sm text-neutral-400 group-hover:text-neutral-600 transition-colors">Search policies and articles...</span>
            </Link>

            {categories.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Browse by Topic</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((cat) => {
                    const IconComponent = cat.icon ? (ICON_MAP[cat.icon] ?? HelpCircle) : HelpCircle;
                    return (
                      <Link key={cat.id} href={`/help/${cat.slug}`} target="_blank"
                        className="bg-white border border-neutral-100 rounded-2xl p-5 hover:border-[var(--brand-client)]/30 hover:shadow-md transition-all group flex flex-col gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[var(--brand-client)]/8 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <IconComponent className="w-4 h-4 text-[var(--brand-client)]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-900 group-hover:text-[var(--brand-client)] transition-colors mb-0.5">{cat.name}</p>
                          <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">{cat.description}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--brand-client)] mt-auto">
                          View articles <ArrowRight className="w-3 h-3" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {recentArticles.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Popular Policies</p>
                <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden divide-y divide-neutral-50">
                  {recentArticles.map((art) => (
                    <Link key={art.id} href={`/help/article/${art.slug}`} target="_blank"
                      className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 group-hover:text-[var(--brand-client)] transition-colors truncate">{art.title}</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">{art.categoryName}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-neutral-400">{art.readTime}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-[var(--brand-client)] transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-[var(--brand-client)]/15 bg-[var(--brand-client)]/5 p-5 flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--brand-client)] mb-0.5">Still need help?</p>
                <p className="text-xs text-neutral-600">
                  Email our support team at{" "}
                  <a href={`mailto:${supportEmail}`} className="underline font-medium">{supportEmail}</a>{" "}
                  and we&apos;ll respond within 24 hours, or{" "}
                  <Link href="/client/help?tab=support" className="underline font-medium text-brand-primary">open a support ticket</Link>.
                </p>
              </div>
              <a href={`mailto:${supportEmail}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white px-4 py-2.5 rounded-xl transition-colors shrink-0"
                style={{ background: "var(--brand-client)" }}>
                Contact Support <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* ─── SUPPORT TICKETS TAB ─── */}
        {tab === "support" && <SupportContent />}
      </div>
    </div>
  );
}
