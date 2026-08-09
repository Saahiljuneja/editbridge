import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { messages, reviews, orders, packages, users, portfolioComments, portfolioItems } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import { RemoveReviewButton } from "./remove-review-button";
import { DismissFlagButton } from "./dismiss-flag-button";
import { DeleteCommentButton } from "./delete-comment-button";

export const dynamic = "force-dynamic";

const ALLOWED: UserRole[] = ["admin", "staff_moderation"];

export default async function AdminModerationPage() {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) redirect("/admin/dashboard");

  // Flagged portfolio comments
  const flaggedComments = await db
    .select({
      id: portfolioComments.id,
      text: portfolioComments.text,
      createdAt: portfolioComments.createdAt,
      authorName: users.name,
      authorId: users.id,
      itemTitle: portfolioItems.title,
      itemId: portfolioItems.id,
    })
    .from(portfolioComments)
    .innerJoin(users, eq(portfolioComments.userId, users.id))
    .innerJoin(portfolioItems, eq(portfolioComments.portfolioItemId, portfolioItems.id))
    .where(eq(portfolioComments.isFlagged, true))
    .orderBy(desc(portfolioComments.createdAt))
    .limit(50);

  const [blockedMsgCount, totalReviews, recentReviews] = await Promise.all([
    db.select({ value: count() }).from(messages).where(eq(messages.isBlocked, true)).then((r) => r[0].value),
    db.select({ value: count() }).from(reviews).then((r) => r[0].value),
    db.select({
      id: reviews.id,
      rating: reviews.rating,
      text: reviews.text,
      role: reviews.role,
      createdAt: reviews.createdAt,
      reviewerName: users.name,
      packageTitle: packages.title,
    })
      .from(reviews)
      .innerJoin(orders, eq(orders.id, reviews.orderId))
      .leftJoin(packages, eq(packages.id, orders.packageId))
      .innerJoin(users, eq(users.id, reviews.reviewerId))
      .orderBy(desc(reviews.createdAt))
      .limit(50),
  ]);

  const RATING_COLORS: Record<number, string> = {
    1: "bg-red-100 text-red-700",
    2: "bg-orange-100 text-orange-700",
    3: "bg-amber-100 text-amber-700",
    4: "bg-blue-100 text-blue-700",
    5: "bg-green-100 text-green-700",
  };

  return (
    <div className="px-8 py-6 ">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Moderation</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Content oversight and review management.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Blocked messages</p>
          <p className="text-3xl font-bold text-amber-600">{blockedMsgCount}</p>
          <Link href="/admin/chat" className="text-xs text-[var(--brand-client)] underline underline-offset-2 mt-1 block">
            View in Chat Oversight →
          </Link>
        </div>
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total reviews</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalReviews}</p>
        </div>
      </div>

      {/* Flagged portfolio comments */}
      <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Flagged portfolio comments</h2>
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm mb-10">
        {flaggedComments.length === 0 ? (
          <p className="px-5 py-10 text-center text-gray-400 dark:text-gray-500 text-sm">No flagged comments.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Author</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Comment</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Portfolio item</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {flaggedComments.map(row => (
                <tr key={row.id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{row.authorName ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-[200px] truncate">{row.text}</td>
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">{row.itemTitle ?? "Untitled"}</td>
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <DismissFlagButton commentId={row.id} />
                      <DeleteCommentButton commentId={row.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Recent reviews</h2>
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Order</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Reviewer</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Rating</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Review</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Action</th>
            </tr>
          </thead>
          <tbody>
            {recentReviews.map((row) => (
              <tr key={row.id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900 dark:text-white truncate max-w-[120px]">{row.packageTitle}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.reviewerName ?? "Unknown"}</td>
                <td className="px-4 py-3 text-center">
                  <Badge className={cn("text-xs border-0 font-semibold", RATING_COLORS[row.rating] ?? "bg-gray-100")}>
                    {"★".repeat(row.rating)}{"☆".repeat(5 - row.rating)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-[180px] truncate">
                  {row.text ?? <span className="italic text-gray-300 dark:text-gray-600">No text</span>}
                </td>
                <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">{formatDate(row.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <RemoveReviewButton reviewId={row.id} />
                </td>
              </tr>
            ))}
            {recentReviews.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-gray-400 dark:text-gray-500 text-sm">No reviews yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
