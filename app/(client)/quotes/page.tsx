export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { quoteRequests, editors, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatCurrency, formatDate, displayNameFromFull } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight, Clock, CheckCircle, XCircle, MessageSquare, Plus } from "lucide-react";
import { QuoteCountdown } from "@/components/quotes/quote-countdown";

const COLOR = "#0EA5E9";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:  { label: "Awaiting response", color: "#D97706", bg: "#FEF3C7", icon: Clock },
  offered:  { label: "Offer received",    color: "#7C3AED", bg: "#EDE9FE", icon: MessageSquare },
  accepted: { label: "Accepted",          color: "#059669", bg: "#D1FAE5", icon: CheckCircle },
  paid:     { label: "Paid â€” order active", color: "#059669", bg: "#D1FAE5", icon: CheckCircle },
  declined: { label: "Declined",          color: "#DC2626", bg: "#FEE2E2", icon: XCircle },
  expired:  { label: "Expired",           color: "#6B7280", bg: "#F3F4F6", icon: XCircle },
};

export default async function ClientQuotesPage() {
  const session = await auth();
  if (!session || session.user?.role !== "client") redirect("/login");

  const quotes = await db.select({
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
    editorId: quoteRequests.editorId,
    editorName: users.name,
  })
    .from(quoteRequests)
    .innerJoin(editors, eq(editors.id, quoteRequests.editorId))
    .innerJoin(users, eq(users.id, editors.userId))
    .where(eq(quoteRequests.clientId, session.user.userId!))
    .orderBy(desc(quoteRequests.createdAt));

  return (
    <div className="px-8 py-6 ">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Quote Requests</h1>
          <p className="text-sm text-gray-400 mt-1">Editors will respond within 48 hours.</p>
        </div>
        <Link href="/browse"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: COLOR }}>
          <Plus className="w-4 h-4" /> New request
        </Link>
      </div>

      {quotes.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-gray-200">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-500">No quote requests yet</p>
          <p className="text-sm text-gray-400 mt-1">Visit an editor&apos;s profile and click &quot;Request a Quote&quot;</p>
          <Link href="/browse"
            className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: COLOR }}>
            Browse editors
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.map(quote => {
            const cfg = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            const editorName = displayNameFromFull(quote.editorName);
            const isExpired = quote.status === "pending" && new Date() > new Date(quote.expiresAt);

            return (
              <div key={quote.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ color: isExpired ? "#6B7280" : cfg.color, background: isExpired ? "#F3F4F6" : cfg.bg }}>
                      <Icon className="w-3 h-3" />
                      {isExpired ? "Expired" : cfg.label}
                    </span>
                    <span className="text-sm font-medium text-gray-800">to {editorName}</span>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(quote.createdAt)}</span>
                </div>

                <div className="px-5 py-4 space-y-3">
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    <span className="bg-gray-100 rounded-lg px-2.5 py-1 font-medium capitalize">{quote.videoType}</span>
                    <span className="bg-gray-100 rounded-lg px-2.5 py-1">Budget: {formatCurrency(quote.budgetMin)} â€“ {formatCurrency(quote.budgetMax)}</span>
                    <span className="bg-gray-100 rounded-lg px-2.5 py-1">Deadline: {quote.deadlinePreference}</span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{quote.brief}</p>

                  {/* Offer received */}
                  {quote.status === "offered" && quote.offeredPrice && (
                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-violet-900">Editor&apos;s offer</p>
                          {quote.expiresAt && <QuoteCountdown expiresAt={quote.expiresAt} />}
                        </div>
                        <p className="text-lg font-bold text-violet-700">{formatCurrency(quote.offeredPrice)}</p>
                      </div>
                      {quote.offerMessage && <p className="text-sm text-violet-700">{quote.offerMessage}</p>}
                      <div className="flex gap-2 pt-1">
                        <Link href={`/quotes/${quote.id}/pay`}
                          className="flex-1 text-center py-2 rounded-xl text-sm font-semibold text-white"
                          style={{ background: COLOR }}>
                          Accept & Pay {formatCurrency(quote.offeredPrice + Math.round(quote.offeredPrice * 0.04))}
                        </Link>
                        <QuoteDeclineButton quoteId={quote.id} />
                      </div>
                    </div>
                  )}

                  {/* Order created */}
                  {quote.status === "paid" && quote.orderId && (
                    <Link href={`/orders/${quote.orderId}`}
                      className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 hover:bg-green-100 transition-colors">
                      View your order <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuoteDeclineButton({ quoteId }: { quoteId: string }) {
  return (
    <form action={`/api/quotes/${quoteId}/decline`} method="POST">
      <button type="submit"
        className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
        Decline
      </button>
    </form>
  );
}
