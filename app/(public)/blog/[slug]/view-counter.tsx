"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

interface ViewCounterProps {
  slug: string;
  initialViews: number;
}

export function ViewCounter({ slug, initialViews }: ViewCounterProps) {
  const [views, setViews] = useState(initialViews);

  useEffect(() => {
    // Fire-and-forget: increment on mount (one per session via sessionStorage)
    const seen = sessionStorage.getItem(`eb_view_${slug}`);
    if (seen) return;

    sessionStorage.setItem(`eb_view_${slug}`, "1");

    fetch(`/api/blog/${slug}/view`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.views === "number") setViews(data.views);
      })
      .catch(() => {/* silent */});
  }, [slug]);

  return (
    <span className="flex items-center gap-1.5 text-xs text-white/40">
      <Eye className="w-3.5 h-3.5" />
      <span className="tabular-nums">{views.toLocaleString()}</span> views
    </span>
  );
}
