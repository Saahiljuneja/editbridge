import { StarRating } from "@/components/common/star-rating";
import { ReviewCard, ReviewCardData } from "@/components/editor/review-card";

interface ReviewListProps {
  reviews: ReviewCardData[];
  avgRating: number | null;
  reviewCount: number;
}

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-4 text-right text-muted-foreground shrink-0">{star}</span>
      <span className="text-amber-400 shrink-0">★</span>
      <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-xs text-muted-foreground shrink-0">{count}</span>
    </div>
  );
}

export function ReviewList({ reviews, avgRating, reviewCount }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>No reviews yet.</p>
      </div>
    );
  }

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div>
      {/* Summary header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        {avgRating !== null && (
          <div className="text-center sm:text-left shrink-0">
            <p className="text-5xl font-bold leading-none">{avgRating}</p>
            <StarRating rating={avgRating} interactive={false} />
            <p className="text-sm text-muted-foreground mt-1">{reviewCount} review{reviewCount !== 1 ? "s" : ""}</p>
          </div>
        )}
        <div className="flex-1 space-y-1.5">
          {distribution.map(({ star, count }) => (
            <RatingBar key={star} star={star} count={count} total={reviewCount} />
          ))}
        </div>
      </div>

      {/* Individual reviews */}
      <div className="space-y-6">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}
