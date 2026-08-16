export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { quoteRequests, editors, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { formatCurrency, displayNameFromFull } from "@/lib/utils";
import { QuotePayForm } from "./quote-pay-form";
import { getPlatformSettings } from "@/lib/platform-settings";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default async function QuotePayPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== "client") redirect("/login");

  const { id } = await params;

  const [quote] = await db
    .select({
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
  const total = quote.offeredPrice + processingFee;

  const editorDisplay = displayNameFromFull(quote.editorName);
  const editorInitials = (quote.editorName ?? "")
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center gap-3">
          <Link
            href="/client/quotes"
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-gray-900">Accept &amp; Pay</h1>
            <p className="text-xs text-gray-400">Quote from {editorDisplay}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8 space-y-4">
        {/* Editor + project card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Editor row */}
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1e40af]/10 flex items-center justify-center text-sm font-bold text-[#1e40af] uppercase select-none shrink-0">
              {editorInitials || "?"}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{editorDisplay}</p>
              <p className="text-xs text-gray-400 capitalize">{quote.videoType} video</p>
            </div>
          </div>

          {/* Brief */}
          <div className="px-5 py-4">
            <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{quote.brief}</p>
          </div>

          {/* Editor message */}
          {quote.offerMessage && (
            <div className="mx-5 mb-4 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3">
              <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider mb-1">
                Editor&apos;s note
              </p>
              <p className="text-sm text-violet-800 italic">&ldquo;{quote.offerMessage}&rdquo;</p>
            </div>
          )}
        </div>

        {/* Pricing breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Payment summary
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Editor&apos;s price</span>
              <span className="tabular-nums font-medium text-gray-900">
                {formatCurrency(quote.offeredPrice)}
              </span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Platform fee ({processingFeePct}%)</span>
              <span className="tabular-nums">{formatCurrency(processingFee)}</span>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
            <span className="text-sm font-bold text-gray-900">Total</span>
            <span className="text-xl font-bold text-[#1e40af] tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Pay button */}
        <QuotePayForm
          quoteId={quote.id}
          totalAmount={total}
          offeredPrice={quote.offeredPrice}
          processingFee={processingFee}
        />

        {/* Trust note */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Your payment is held securely until you approve the delivery</span>
        </div>
      </div>
    </div>
  );
}
