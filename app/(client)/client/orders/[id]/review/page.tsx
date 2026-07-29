import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, editors, users, reviews } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { displayNameFromFull } from "@/lib/utils";
import { Star } from "lucide-react";
import Link from "next/link";
import { ReviewClient } from "./review-client";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const userId = session.user.userId!;

  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      clientId: orders.clientId,
      packageTitle: packages.title,
      editorUserId: editors.userId,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .innerJoin(editors, eq(editors.id, orders.editorId))
    .where(and(eq(orders.id, id), eq(orders.clientId, userId)))
    .limit(1);

  if (!order) notFound();
  if (order.status !== "completed") redirect(`/orders/${id}`);

  const [editorUser, existingReview] = await Promise.all([
    db
      .select({ name: users.name, image: users.image })
      .from(users)
      .where(eq(users.id, order.editorUserId))
      .limit(1)
      .then((r) => r[0]),
    db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.orderId, id), eq(reviews.reviewerId, userId)))
      .limit(1)
      .then((r) => r[0] ?? null),
  ]);

  const editorName = displayNameFromFull(editorUser?.name);
  const editorInitials = editorName
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "E";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/orders/${id}`} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
              ← Order
            </Link>
            <span className="text-gray-200">/</span>
            <span className="text-sm text-gray-700 font-medium">Leave a Review</span>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            ))}
          </div>
        </div>
      </div>

      <ReviewClient
        orderId={id}
        editorName={editorName}
        editorInitials={editorInitials}
        editorImage={editorUser?.image ?? null}
        packageTitle={order.packageTitle ?? "Order"}
        alreadyReviewed={!!existingReview}
      />
    </div>
  );
}
