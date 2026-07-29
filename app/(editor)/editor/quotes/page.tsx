export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { quoteRequests, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatCurrency, formatDate, displayNameFromFull } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ExternalLink,
  ArrowRight,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { EditorQuoteActions } from "./quote-actions";
import type { LucideIcon } from "lucide-react";

const STATUS_CONFIG: Record<
  string,
  { label: string; stripe: string; badge: string; icon: LucideIcon }
> = {
  pending:  { label: "Awaiting your reply", stripe: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border border-amber-200",     icon: Clock },
  offered:  { label: "Offer sent",          stripe: "bg-[#0EA5E9]",   badge: "bg-sky-50 text-sky-700 border border-sky-200",           icon: Sparkles },
  accepted: { label: "Accepted",            stripe: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",icon: CheckCircle2 },
  paid:     { label: "Accepted & paid",     stripe: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",icon: CheckCircle2 },
  declined: { label: "Declined by client",  stripe: "bg-red-400",     badge: "bg-red-50 text-red-600 border border-red-200",            icon: XCircle },
  expired:  { label: "Expired",             stripe: "bg-gray-300",    badge: "bg-gray-50 text-gray-500 border border-gray-200",         icon: XCircle },
};

export default async function EditorQuotesPage() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  const editorId = session.user.editorId;
  if (!editorId) redirect("/editor/kyc");

  const quotes = await db
    .select({
      id: quoteRequests.id,
      videoType: quoteRequests.videoType,
      brief: quoteRequests.brief,
      budgetMin: quoteRequests.budgetMin,
      budgetMax: quoteRequests.budgetMax,
      deadlinePreference: quoteRequests.deadlinePreference,
      referenceUrl: quoteRequests.referenceUrl,
      status: quoteRequests.status,
      offeredPrice: quoteRequests.offeredPrice,
      offerMessage: quoteRequests.offerMessage,
      orderId: quoteRequests.orderId,
      expiresAt: quoteRequests.expiresAt,
      createdAt: quoteRequests.createdAt,
      clientName: users.name,
    })
    .from(quoteRequests)
    .innerJoin(users, eq(users.id, quoteRequests.clientId))
    .where(eq(quoteRequests.editorId, editorId))
    .orderBy(desc(quoteRequests.createdAt));

  const pendingCount = quotes.filter(
    (q) => q.status === "pending" && new Date() < new Date(q.expiresAt)
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Quote Requests</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Clients want a custom quote from you. Respond within 48 hours.
            </p>
          </div>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5" />
              {pendingCount} pending
            </span>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        {quotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-[#0EA5E9]" />
            </div>
            <p className="font-semibold text-gray-800">No quote requests yet</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
              When clients request a custom quote from your profile, they&apos;ll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {quotes.map((quote) => {
              const isExpired =
                quote.status === "pending" && new Date() > new Date(quote.expiresAt);
              const statusKey = isExpired ? "expired" : quote.status;
              const cfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              const hoursLeft = Math.max(
                0,
                Math.floor((new Date(quote.expiresAt).getTime() - Date.now()) / 3_600_000)
              );
              const clientName = displayNameFromFull(quote.clientName);
              const clientInitials = (quote.clientName ?? "")
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
                        {/* Client avatar */}
                        <div className="w-8 h-8 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center text-xs font-bold text-[#0EA5E9] shrink-0 uppercase select-none">
                          {clientInitials || "?"}
                        </div>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {clientName}
                        </p>
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
                      <div className="flex items-center gap-2.5 shrink-0">
                        {quote.status === "pending" && !isExpired && hoursLeft <= 24 && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full tabular-nums">
                            {hoursLeft}h left
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {formatDate(quote.createdAt)}
                        </span>
                      </div>
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
                        {quote.referenceUrl && (
                          <a
                            href={quote.referenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> Reference
                          </a>
                        )}
                      </div>

                      {/* Brief */}
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                        {quote.brief}
                      </p>

                      {/* Pending — offer form */}
                      {quote.status === "pending" && !isExpired && (
                        <EditorQuoteActions
                          quoteId={quote.id}
                          budgetMax={quote.budgetMax}
                        />
                      )}

                      {/* Offer sent */}
                      {quote.status === "offered" && quote.offeredPrice && (
                        <div className="rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider">
                              Your offer
                            </p>
                            <p className="text-lg font-bold text-sky-700 tabular-nums">
                              {formatCurrency(quote.offeredPrice)}
                            </p>
                          </div>
                          {quote.offerMessage && (
                            <p className="text-sm text-sky-800 border-t border-sky-100 pt-2">
                              &ldquo;{quote.offerMessage}&rdquo;
                            </p>
                          )}
                        </div>
                      )}

                      {/* Order created */}
                      {quote.status === "paid" && quote.orderId && (
                        <Link
                          href={`/editor/orders/${quote.orderId}`}
                          className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors group"
                        >
                          <span>View order</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      )}

                      {/* Declined / expired */}
                      {(quote.status === "declined" || isExpired) && (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-gray-400 shrink-0" />
                          {isExpired
                            ? "This request expired without a response."
                            : "The client declined your offer."}
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
