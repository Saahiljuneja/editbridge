"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function AnnouncementBanner({
  text,
  bg,
  textColor,
}: {
  text: string;
  bg: string;
  textColor: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="relative px-4 py-2.5 text-center" style={{ background: bg }}>
      <p className="text-xs sm:text-sm font-medium pr-8" style={{ color: textColor }}>
        {text}
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
        style={{ color: textColor }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
