export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviews, orders, packages, editors, users } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { Star } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

export default async function ClientReviewsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      text: reviews.text,
      replyText: reviews.replyText,
      createdAt: reviews.createdAt,
      orderId: orders.id,
      packageTitle: packages.title,
      editorName: users.name,
    })
    .from(reviews)
    .innerJoin(orders, eq(orders.id, reviews.orderId))
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .innerJoin(editors, eq(editors.id, orders.editorId))
    .innerJoin(users, eq(users.id, editors.userId))
    .where(and(eq(reviews.reviewerId, session.user.userId!), eq(reviews.role, "client")))
    .orderBy(desc(reviews.createdAt));

  const avgRating = rows.length > 0
    ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / rows.length) * 10) / 10
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Reviews</h1>
            <p className="text-sm text-gray-400 mt-0.5">Reviews you&apos;ve left for editors</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <Star className="w-4 h-4 text-amber-500" />
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-5">
        {rows.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 text-center">
              <p className="text-2xl font-bold text-gray-900">{rows.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Reviews left</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 text-center">
              <div className="flex items-center justify-center gap-1">
                <p className="text-2xl font-bold text-amber-500">{avgRating ?? "-"}</p>
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Avg rating given</p>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
              <Star className="w-7 h-7 text-amber-400" />
            </div>
            <p className="font-semibold text-gray-800">No reviews yet</p>
            <p className="text-sm text-gray-400 mt-1">After completing an order you can leave a review for your editor.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((review) => (
              <div key={review.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{review.editorName ?? "Editor"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{review.packageTitle ?? "Custom order"}</p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("w-3.5 h-3.5", i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                    ))}
                  </div>
                </div>

                {review.text && (
                  <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl px-4 py-3">
                    &ldquo;{review.text}&rdquo;
                  </p>
                )}

                {review.replyText && (
                  <div className="mt-3 ml-4 border-l-2 border-[var(--brand-client)]/20 pl-4">
                    <p className="text-xs font-semibold text-[var(--brand-client)] mb-1">Editor replied</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{review.replyText}</p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
                  <Link href={`/client/orders/${review.orderId}`} className="text-xs font-medium text-[var(--brand-client)] hover:underline">
                    View order
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
