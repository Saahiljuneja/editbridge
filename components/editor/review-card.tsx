import { StarRating } from "@/components/common/star-rating";
import { formatDate } from "@/lib/utils";

export interface ReviewCardData {
  id: string;
  rating: number;
  text: string | null;
  replyText: string | null;
  createdAt: Date | string;
  reviewerName: string;
  reviewerImage: string | null;
}

interface ReviewCardProps {
  review: ReviewCardData;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const initials = review.reviewerName.slice(0, 2).toUpperCase();

  return (
    <div className="border-b border-border pb-6 last:border-0">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {review.reviewerImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={review.reviewerImage}
              alt={review.reviewerName}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[var(--brand-client)]/10 flex items-center justify-center text-xs font-semibold text-[var(--brand-client)] shrink-0">
              {initials}
            </div>
          )}
          <div>
            <p className="text-sm font-medium leading-tight">{review.reviewerName}</p>
            <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        <StarRating rating={review.rating} interactive={false} />
      </div>

      {review.text && (
        <p className="text-sm text-muted-foreground leading-relaxed">{review.text}</p>
      )}

      {review.replyText && (
        <div className="mt-3 ml-4 pl-3 border-l-2 border-[var(--brand-client)]/30 space-y-0.5">
          <p className="text-xs font-semibold text-[var(--brand-client)]">Editor&apos;s reply</p>
          <p className="text-sm text-muted-foreground">{review.replyText}</p>
        </div>
      )}
    </div>
  );
}
