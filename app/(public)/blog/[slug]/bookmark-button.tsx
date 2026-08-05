"use client";

import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  slug: string;
}

export function BookmarkButton({ slug }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("eb_blog_bookmarks");
      if (saved) {
        const list = JSON.parse(saved) as string[];
        setBookmarked(list.includes(slug));
      }
    } catch {}
  }, [slug]);

  const handleToggle = () => {
    try {
      const saved = localStorage.getItem("eb_blog_bookmarks");
      let list: string[] = [];
      if (saved) {
        list = JSON.parse(saved) as string[];
      }

      let next: boolean;
      if (list.includes(slug)) {
        list = list.filter((s) => s !== slug);
        next = false;
      } else {
        list.push(slug);
        next = true;
      }

      localStorage.setItem("eb_blog_bookmarks", JSON.stringify(list));
      setBookmarked(next);
    } catch {}
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 shadow-sm",
        bookmarked
          ? "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20"
          : "bg-white text-gray-500 border-gray-100 hover:bg-gray-50 hover:text-gray-700"
      )}
    >
      <Bookmark className={cn("w-4 h-4", bookmarked ? "fill-amber-500 text-amber-500" : "text-gray-400")} />
      <span>{bookmarked ? "Saved to Bookmarks" : "Save for later"}</span>
    </button>
  );
}
