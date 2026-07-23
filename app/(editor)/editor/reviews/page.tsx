export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviews, users, orders, packages } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { displayNameFromFull } from "@/lib/utils";
import { Star } from "lucide-react";
import { ReviewsClient } from "./reviews-client";

export default async function EditorReviewsPage() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      text: reviews.text,
      replyText: reviews.replyText,
      createdAt: reviews.createdAt,
      reviewerName: users.name,
      reviewerImage: users.image,
      packageTitle: packages.title,
      orderId: orders.id,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.reviewerId, users.id))
    .innerJoin(orders, eq(reviews.orderId, orders.id))
    .leftJoin(packages, eq(orders.packageId, packages.id))
    .where(and(eq(reviews.revieweeId, session.user.userId!), eq(reviews.role, "client")))
    .orderBy(desc(reviews.createdAt));

  const avgRating = rows.length > 0
    ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / rows.length) * 10) / 10
    : null;

  const dist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: rows.filter(r => r.rating === star).length,
  }));

  const fiveStars = rows.filter(r => r.rating === 5).length;
  const pct5 = rows.length > 0 ? Math.round((fiveStars / rows.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Reviews</h1>
            <p className="text-sm text-gray-400 mt-0.5">What clients say about your work</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
              <Star className="w-7 h-7 text-amber-400" />
            </div>
            <p className="font-semibold text-gray-800">No reviews yet</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">Reviews appear here once clients complete and rate their orders.</p>
          </div>
        ) : (
          <>
            {/* Summary card */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                {/* Big score */}
                <div className="text-center shrink-0 sm:border-r sm:border-gray-100 sm:pr-8">
                  <p className="text-5xl font-bold text-gray-900 leading-none">{avgRating}</p>
                  <div className="flex items-center justify-center gap-0.5 mt-2.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < Math.round(avgRating ?? 0) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">{rows.length} review{rows.length !== 1 ? "s" : ""}</p>
                </div>

                {/* Distribution bars */}
                <div className="flex-1 w-full space-y-2">
                  {dist.map(({ star, count }) => (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-500 w-3 shrink-0 text-right">{star}</span>
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all"
                          style={{ width: `${rows.length > 0 ? (count / rows.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-5 text-right shrink-0">{count}</span>
                    </div>
                  ))}
                </div>

                {/* Quick stat */}
                <div className="shrink-0 text-center sm:border-l sm:border-gray-100 sm:pl-8">
                  <p className="text-3xl font-bold text-amber-500">{pct5}%</p>
                  <p className="text-xs text-gray-400 mt-1">5-star rate</p>
                </div>
              </div>
            </div>

            {/* Reviews list */}
            <ReviewsClient
              reviews={rows.map(r => ({
                id: r.id,
                rating: r.rating,
                text: r.text,
                replyText: r.replyText,
                createdAt: r.createdAt.toISOString(),
                reviewerName: displayNameFromFull(r.reviewerName ?? ""),
                reviewerImage: r.reviewerImage,
                packageTitle: r.packageTitle ?? "Custom order",
                orderId: r.orderId,
              }))}
            />
          </>
        )}
      </div>
    </div>
  );
}
