"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

const sizeMap = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function StarRating({
  rating,
  interactive = false,
  onChange,
  size = "md",
  showValue = false,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || rating;
  const iconClass = sizeMap[size];

  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          className={cn(
            "transition-colors",
            interactive
              ? "cursor-pointer focus:outline-none"
              : "cursor-default pointer-events-none"
          )}
          aria-label={interactive ? `Rate ${star} out of 5` : undefined}
        >
          <Star
            className={cn(
              iconClass,
              display >= star
                ? "fill-amber-400 text-amber-400"
                : "fill-gray-200 text-gray-200"
            )}
          />
        </button>
      ))}
      {showValue && (
        <span className="ml-1 text-sm font-medium text-gray-700">
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  );
}
