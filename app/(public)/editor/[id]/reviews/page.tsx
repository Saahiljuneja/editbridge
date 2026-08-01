import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { db } from "@/lib/db";
import { editors, users, reviews } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { displayNameFromFull } from "@/lib/utils";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getEditorReviewsData(id: string) {
  const session = await auth();
  const isOwnProfile = session?.user?.role === "editor" && session.user.editorId === id;

  const [editor] = await db
    .select({
      id: editors.id,
      userId: editors.userId,
      displayName: editors.displayName,
      name: users.name,
      image: users.image,
      kycStatus: editors.kycStatus,
    })
    .from(editors)
    .innerJoin(users, eq(editors.userId, users.id))
    .where(
      isOwnProfile
        ? eq(editors.id, id)
        : and(eq(editors.id, id), eq(editors.kycStatus, "approved"))
    )
    .limit(1);

  if (!editor) return null;

  const reviewRows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      text: reviews.text,
      replyText: reviews.replyText,
      createdAt: reviews.createdAt,
      reviewerName: users.name,
      reviewerImage: users.image,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.reviewerId, users.id))
    .where(and(eq(reviews.revieweeId, editor.userId), eq(reviews.role, "client")))
    .orderBy(reviews.createdAt);

  const avgRating =
    reviewRows.length > 0
      ? Math.round((reviewRows.reduce((sum, r) => sum + r.rating, 0) / reviewRows.length) * 10) / 10
      : null;

  return {
    editor,
    reviews: reviewRows.map(r => ({
      ...r,
      reviewerName: displayNameFromFull(r.reviewerName),
    })),
    avgRating,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getEditorReviewsData(id);
  if (!data) {
    return {
      title: "Reviews Not Found — EditBridge",
    };
  }
  const name = data.editor.displayName || displayNameFromFull(data.editor.name);
  return {
    title: `Client Reviews for ${name} | EditBridge`,
    description: `Read all client reviews and ratings for video editor ${name} on EditBridge.`,
  };
}

export default async function EditorReviewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getEditorReviewsData(id);

  if (!data) notFound();

  const name = data.editor.displayName || displayNameFromFull(data.editor.name);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="bg-white border-b border-gray-150 py-8">
        <div className="max-w-3xl mx-auto px-6">
          <Link
            href={`/editor/${id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-600 mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to profile
          </Link>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Client Reviews for {name}
          </h1>
          {data.avgRating && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${star <= Math.round(data.avgRating!) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-700 font-bold">
                {data.avgRating} <span className="text-gray-400 font-normal">({data.reviews.length} reviews)</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {data.reviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-150 p-12 text-center shadow-sm">
            <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">No reviews yet for this editor.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.reviews.map((review) => (
              <div key={review.id} className="bg-white border border-gray-150/70 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  {review.reviewerImage ? (
                    <img src={review.reviewerImage} alt={review.reviewerName} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
                      {review.reviewerName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{review.reviewerName}</p>
                    <p className="text-[11px] text-gray-400">{new Date(review.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                      />
                    ))}
                  </div>
                </div>
                {review.text && (
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">
                    {review.text}
                  </p>
                )}
                {review.replyText && (
                  <div className="bg-gray-50 rounded-xl p-3.5 text-xs text-gray-600 border-l-2 border-indigo-200">
                    <p className="font-bold text-gray-800 mb-0.5">Editor replied:</p>
                    {review.replyText}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}