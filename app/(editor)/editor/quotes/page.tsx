export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { quoteRequests, editors, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatCurrency, formatDate, displayNameFromFull } from "@/lib/utils";
import { EditorQuoteActions } from "./quote-actions";
import { Clock, CheckCircle, XCircle, MessageSquare, ExternalLink } from "lucide-react";

const COLOR = "#0EA5E9";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:  { label: "Awaiting your reply", color: "#D97706", bg: "#FEF3C7", icon: Clock },
  offered:  { label: "Offer sent",          color: "#0EA5E9", bg: "#EDE9FE", icon: MessageSquare },
  paid:     { label: "Accepted & paid",     color: "#059669", bg: "#D1FAE5", icon: CheckCircle },
  declined: { label: "Declined by client",  color: "#DC2626", bg: "#FEE2E2", icon: XCircle },
  expired:  { label: "Expired",             color: "#6B7280", bg: "#F3F4F6", icon: XCircle },
};

export default async function EditorQuotesPage() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  const editorId = session.user.editorId;
  if (!editorId) redirect("/editor/kyc");

  const quotes = await db.select({
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

  const pending = quotes.filter(q => q.status === "pending" && new Date() < new Date(q.expiresAt));

  return (
    <div className="px-8 py-6 ">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Quote Requests</h1>
        <p className="text-sm text-gray-400 mt-1">
          Clients want a custom quote from you. Respond within 48 hours.
        </p>
        {pending.length > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold"
            style={{ background: `${COLOR}12`, color: COLOR }}>
            {pending.length} pending — reply before they expire
          </div>
        )}
      </div>

      {quotes.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-gray-200">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-500">No quote requests yet</p>
          <p className="text-sm text-gray-400 mt-1">When clients request a custom quote from your profile, they&apos;ll appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.map(quote => {
            const isExpired = quote.status === "pending" && new Date() > new Date(quote.expiresAt);
            const statusKey = isExpired ? "expired" : quote.status;
            const cfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            const hoursLeft = Math.max(0, Math.floor((new Date(quote.expiresAt).getTime() - Date.now()) / 3600000));

            return (
              <div key={quote.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ color: cfg.color, background: cfg.bg }}>
                      <Icon className="w-3 h-3" />{cfg.label}
                    </span>
                    <span className="text-sm font-medium text-gray-800">from {displayNameFromFull(quote.clientName)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {quote.status === "pending" && !isExpired && (
                      <span className="text-xs text-amber-600 font-medium">{hoursLeft}h left</span>
                    )}
                    <span className="text-xs text-gray-400">{formatDate(quote.createdAt)}</span>
                  </div>
                </div>

                <div className="px-5 py-4 space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    <span className="bg-gray-100 rounded-lg px-2.5 py-1 font-medium capitalize">{quote.videoType}</span>
                    <span className="bg-gray-100 rounded-lg px-2.5 py-1">Budget: {formatCurrency(quote.budgetMin)} – {formatCurrency(quote.budgetMax)}</span>
                    <span className="bg-gray-100 rounded-lg px-2.5 py-1">Deadline: {quote.deadlinePreference}</span>
                    {quote.referenceUrl && (
                      <a href={quote.referenceUrl} target="_blank" rel="noopener noreferrer"
                        className="bg-sky-50 text-sky-600 rounded-lg px-2.5 py-1 flex items-center gap-1 hover:bg-sky-100">
                        <ExternalLink className="w-3 h-3" /> Reference
                      </a>
                    )}
                  </div>

                  <p className="text-sm text-gray-700 leading-relaxed">{quote.brief}</p>

                  {/* Pending — show offer form */}
                  {quote.status === "pending" && !isExpired && (
                    <EditorQuoteActions quoteId={quote.id} budgetMax={quote.budgetMax} />
                  )}

                  {/* Offer sent */}
                  {quote.status === "offered" && quote.offeredPrice && (
                    <div className="rounded-xl border px-4 py-3 text-sm"
                      style={{ borderColor: `${COLOR}30`, background: `${COLOR}08` }}>
                      <p className="font-semibold mb-0.5" style={{ color: COLOR }}>
                        Your offer: {formatCurrency(quote.offeredPrice)}
                      </p>
                      {quote.offerMessage && <p className="text-gray-600">{quote.offerMessage}</p>}
                    </div>
                  )}

                  {/* Order created */}
                  {quote.status === "paid" && quote.orderId && (
                    <a href={`/editor/orders/${quote.orderId}`}
                      className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 hover:bg-green-100 transition-colors">
                      View order <ExternalLink className="w-3.5 h-3.5" />
                    </a>
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
