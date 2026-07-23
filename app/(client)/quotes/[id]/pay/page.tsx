export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { quoteRequests, editors, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { formatCurrency, displayNameFromFull } from "@/lib/utils";
import { QuotePayForm } from "./quote-pay-form";
import { getPlatformSettings } from "@/lib/platform-settings";

export default async function QuotePayPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== "client") redirect("/login");

  const { id } = await params;

  const [quote] = await db.select({
    id: quoteRequests.id,
    videoType: quoteRequests.videoType,
    brief: quoteRequests.brief,
    offeredPrice: quoteRequests.offeredPrice,
    offerMessage: quoteRequests.offerMessage,
    status: quoteRequests.status,
    editorName: users.name,
    editorId: quoteRequests.editorId,
  })
    .from(quoteRequests)
    .innerJoin(editors, eq(editors.id, quoteRequests.editorId))
    .innerJoin(users, eq(users.id, editors.userId))
    .where(and(eq(quoteRequests.id, id), eq(quoteRequests.clientId, session.user.userId!)))
    .limit(1);

  if (!quote || quote.status !== "offered" || !quote.offeredPrice) notFound();

  const { processingFeePct } = await getPlatformSettings();
  const processingFee = Math.round(quote.offeredPrice * (processingFeePct / 100));

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-1">Accept Quote & Pay</h1>
      <p className="text-sm text-gray-400 mb-8">from {displayNameFromFull(quote.editorName)}</p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 space-y-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Project</p>
          <p className="font-medium capitalize">{quote.videoType} video</p>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{quote.brief}</p>
        </div>
        {quote.offerMessage && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Editor&apos;s note</p>
            <p className="text-sm text-gray-700">{quote.offerMessage}</p>
          </div>
        )}
        <div className="border-t border-gray-100 pt-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Editor&apos;s price</span>
            <span>{formatCurrency(quote.offeredPrice)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Processing fee ({processingFeePct}%)</span>
            <span>{formatCurrency(processingFee)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
            <span>Total</span>
            <span>{formatCurrency(quote.offeredPrice + processingFee)}</span>
          </div>
        </div>
      </div>

      <QuotePayForm
        quoteId={quote.id}
        totalAmount={quote.offeredPrice + processingFee}
        offeredPrice={quote.offeredPrice}
        processingFee={processingFee}
      />
    </div>
  );
}
