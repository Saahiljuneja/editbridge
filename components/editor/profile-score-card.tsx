"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileScoreItem } from "@/lib/profile-score";

interface ProfileScoreCardProps {
  score: number;
  maxScore: number;
  items: ProfileScoreItem[];
  variant?: "full" | "compact";
}

export function ProfileScoreCard({ score, maxScore, items, variant = "full" }: ProfileScoreCardProps) {
  const pct = Math.round((score / maxScore) * 100);
  const low = pct < 50;

  if (variant === "compact") {
    return (
      <Link
        href="/editor/profile"
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:border-[var(--brand-client)]/30 hover:text-[var(--brand-client)] transition-colors shadow-sm"
      >
        <Sparkles className="w-3.5 h-3.5 text-[var(--brand-client)]" />
        Profile score: {pct}%
      </Link>
    );
  }

  const incomplete = items.filter((i) => !i.completed);
  const complete = items.filter((i) => i.completed);

  const barColor = pct >= 70 ? "#10B981" : pct >= 40 ? "var(--brand-client)" : "#F59E0B";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-gray-50">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900">Profile completion</p>
          <span className="text-sm font-bold" style={{ color: barColor }}>{pct}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)` }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {pct < 50 ? "Complete your profile to get more orders" : pct < 80 ? "Looking good — a few more steps!" : "Great profile! Keep it updated."}
        </p>
      </div>

      <div className="p-4 space-y-1.5">
        {complete.map((item) => (
          <div key={item.key} className="flex items-center gap-2.5 py-1">
            <span className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <Check className="w-2.5 h-2.5 text-emerald-500" strokeWidth={3} />
            </span>
            <span className="text-xs text-gray-400 line-through">{item.label}</span>
          </div>
        ))}
        {incomplete.map((item) => (
          <Link
            key={item.key}
            href={item.actionHref}
            className="flex items-center gap-2.5 py-1 group"
          >
            <span className="w-4 h-4 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <X className="w-2.5 h-2.5 text-red-400" strokeWidth={3} />
            </span>
            <span className="flex-1 text-xs text-gray-700 font-medium group-hover:text-[var(--brand-client)] transition-colors">{item.label}</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full whitespace-nowrap">
              +{item.points}%
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
