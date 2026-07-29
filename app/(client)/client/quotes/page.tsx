export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { quoteRequests, editors, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatCurrency, formatDate, displayNameFromFull } from "@/lib/utils";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Plus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { QuoteCountdown } from "@/components/quotes/quote-countdown";
import { QuoteDeclineButton } from "./quote-decline-button";

const STATUS_CONFIG: Record<
  string,
  { label: string; stripe: string; badge: string; icon: React.ElementType }
> = {
  pending:  { label: "Awaiting response", stripe: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border border-amber-200",     icon: Clock },
  offered:  { label: "Offer received",    stripe: "bg-violet-500",  badge: "bg-violet-50 text-violet-700 border border-violet-200",   icon: Sparkles },
  accepted: { label: "Accepted",          stripe: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",icon: CheckCircle2 },
  paid:     { label: "Order active",      stripe: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",icon: CheckCircle2 },
  declined: { label: "Declined",          stripe: "bg-red-400",     badge: "bg-red-50 text-red-600 border border-red-200",            icon: XCircle },
  expired:  { label: "Expired",           stripe: "bg-gray-300",    badge: "bg-gray-50 text-gray-500 border border-gray-200",         icon: XCircle },
};

export default async function ClientQuotesPage() {
  const session = await auth();
  if (!session || session.user?.role !== "client") redirect("/login");

  const quotes = await db
    .select({
      id: quoteRequests.id,
      videoType: quoteRequests.videoType,
      brief: quoteRequests.brief,
      budgetMin: quoteRequests.budgetMin,
      budgetMax: quoteRequests.budgetMax,
      deadlinePreference: quoteRequests.deadlinePreference,
      status: quoteRequests.status,
      offeredPrice: quoteRequests.offeredPrice,
      offerMessage: quoteRequests.offerMessage,
      orderId: quoteRequests.orderId,
      expiresAt: quoteRequests.expiresAt,
      createdAt: quoteRequests.createdAt,
      editorName: users.name,
    })
    .from(quoteRequests)
    .innerJoin(editors, eq(editors.id, quoteRequests.editorId))
    .innerJoin(users, eq(users.id, editors.userId))
    .where(eq(quoteRequests.clientId, session.user.userId!))
    .orderBy(desc(quoteRequests.createdAt));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Quote Requests</h1>
            <p className="text-sm text-gray-400 mt-0.5">Editors typically respond within 48 hours</p>
          </div>
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#0EA5E9] hover:bg-sky-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> New request
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        {quotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-[#0EA5E9]" />
            </div>
            <p className="font-semibold text-gray-800">No quote requests yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">
              Visit an editor&apos;s profile and click &quot;Request a Quote&quot;
            </p>
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0EA5E9] hover:bg-sky-600 transition-colors"
            >
              Browse editors
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {quotes.map((quote) => {
              const isExpired =
                quote.status === "pending" &&
                new Date() > new Date(quote.expiresAt);
              const effectiveStatus = isExpired ? "expired" : quote.status;
              const cfg = STATUS_CONFIG[effectiveStatus] ?? STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              const editorName = displayNameFromFull(quote.editorName);
              const editorInitials = (quote.editorName ?? "")
                .split(" ")
                .filter(Boolean)
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <div
                  key={quote.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex"
                >
                  {/* Left status stripe */}
                  <div className={cn("w-1 shrink-0", cfg.stripe)} />

                  <div className="flex-1 min-w-0">
                    {/* Card header */}
                    <div className="px-5 pt-4 pb-3 border-b border-gray-50 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Editor avatar */}
                        <div className="w-8 h-8 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center text-xs font-bold text-[#0EA5E9] shrink-0 uppercase select-none">
                          {editorInitials || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {editorName}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0",
                            cfg.badge
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatDate(quote.createdAt)}
                      </span>
                    </div>

                    {/* Card body */}
                    <div className="px-5 py-4 space-y-3">
                      {/* Metadata chips */}
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 capitalize">
                          {quote.videoType}
                        </span>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 tabular-nums">
                          {formatCurrency(quote.budgetMin)} – {formatCurrency(quote.budgetMax)}
                        </span>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600">
                          {quote.deadlinePreference}
                        </span>
                      </div>

                      {/* Brief preview */}
                      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                        {quote.brief}
                      </p>

                      {/* Offer received */}
                      {quote.status === "offered" && quote.offeredPrice && (
                        <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold text-violet-800 uppercase tracking-wider">
                                Editor&apos;s offer
                              </p>
                              {quote.expiresAt && (
                                <QuoteCountdown expiresAt={quote.expiresAt} />
                              )}
                            </div>
                            <p className="text-2xl font-bold text-violet-700 tabular-nums shrink-0">
                              {formatCurrency(quote.offeredPrice)}
                            </p>
                          </div>
                          {quote.offerMessage && (
                            <p className="text-sm text-violet-700 border-t border-violet-200/60 pt-2.5">
                              &ldquo;{quote.offerMessage}&rdquo;
                            </p>
                          )}
                          <div className="flex gap-2 pt-0.5">
                            <Link
                              href={`/client/quotes/${quote.id}/pay`}
                              className="flex-1 text-center py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0EA5E9] hover:bg-sky-600 transition-colors"
                            >
                              Accept &amp; Pay{" "}
                              {formatCurrency(
                                quote.offeredPrice +
                                  Math.round(quote.offeredPrice * 0.04)
                              )}
                            </Link>
                            <QuoteDeclineButton quoteId={quote.id} />
                          </div>
                        </div>
                      )}

                      {/* Order active */}
                      {quote.status === "paid" && quote.orderId && (
                        <Link
                          href={`/client/orders/${quote.orderId}`}
                          className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors group"
                        >
                          <span>View your order</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      )}

                      {/* Declined notice */}
                      {(quote.status === "declined" || isExpired) && (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-gray-400 shrink-0" />
                          {isExpired
                            ? "This quote request expired without a response."
                            : "You declined this offer."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
