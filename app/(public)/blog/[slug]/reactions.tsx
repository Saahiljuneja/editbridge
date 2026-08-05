"use client";

import { useState, useEffect } from "react";

const REACTIONS = [
  { emoji: "❤️", key: "love",  label: "Love it" },
  { emoji: "🔥", key: "fire",  label: "Fire!"   },
  { emoji: "👏", key: "clap",  label: "Clap"    },
] as const;

type ReactionKey = (typeof REACTIONS)[number]["key"];

interface ReactionCounts { love: number; fire: number; clap: number }

interface ReactionsProps { slug: string }

function storageKey(slug: string) {
  return `eb_blog_reaction_${slug}`;
}

function loadReacted(slug: string): ReactionKey | null {
  try {
    return (localStorage.getItem(storageKey(slug)) as ReactionKey) ?? null;
  } catch { return null; }
}

function saveReacted(slug: string, key: ReactionKey | null) {
  try {
    if (key) localStorage.setItem(storageKey(slug), key);
    else localStorage.removeItem(storageKey(slug));
  } catch { /* ignore */ }
}


export function Reactions({ slug }: ReactionsProps) {
  const [reacted, setReacted] = useState<ReactionKey | null>(null);
  const [counts, setCounts] = useState<ReactionCounts>({ love: 0, fire: 0, clap: 0 });
  const [mounted, setMounted] = useState(false);
  const [justClicked, setJustClicked] = useState<ReactionKey | null>(null);

  useEffect(() => {
    setReacted(loadReacted(slug));
    const fetchCounts = async () => {
      try {
        const res = await fetch(`/api/blog/${slug}/react`);
        if (res.ok) {
          const data = await res.json();
          setCounts(data);
        }
      } catch (err) {
        console.error("Failed to load reactions", err);
      }
    };
    fetchCounts();
    setMounted(true);
  }, [slug]);

  async function handleReact(key: ReactionKey) {
    if (!mounted) return;

    const wasReacted = reacted === key;
    const oldReacted = reacted;
    const newCounts = { ...counts };

    const dbActions: { reaction: ReactionKey; action: "add" | "remove" }[] = [];

    if (oldReacted && oldReacted !== key) {
      newCounts[oldReacted] = Math.max(0, newCounts[oldReacted] - 1);
      newCounts[key] += 1;
      setReacted(key);
      saveReacted(slug, key);
      dbActions.push({ reaction: oldReacted, action: "remove" });
      dbActions.push({ reaction: key, action: "add" });
    } else if (wasReacted) {
      newCounts[key] = Math.max(0, newCounts[key] - 1);
      setReacted(null);
      saveReacted(slug, null);
      dbActions.push({ reaction: key, action: "remove" });
    } else {
      newCounts[key] += 1;
      setReacted(key);
      saveReacted(slug, key);
      dbActions.push({ reaction: key, action: "add" });
    }

    setCounts(newCounts);
    setJustClicked(key);
    setTimeout(() => setJustClicked(null), 500);

    try {
      for (const act of dbActions) {
        const res = await fetch(`/api/blog/${slug}/react`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(act),
        });
        if (res.ok) {
          const updatedCounts = await res.json();
          setCounts(updatedCounts);
        }
      }
    } catch (err) {
      console.error("Failed to sync reactions", err);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-gray-400 mr-1">React</span>
      {REACTIONS.map(({ emoji, key, label }) => {
        const isActive = reacted === key;
        const isAnimating = justClicked === key;
        return (
          <button
            key={key}
            onClick={() => handleReact(key)}
            title={label}
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200 select-none ${
              isActive
                ? "bg-[#8B7FE8]/10 border-[#8B7FE8]/40 text-[#8B7FE8] shadow-sm shadow-[#8B7FE8]/10"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span className={`text-base leading-none transition-transform duration-200 ${isAnimating ? "scale-150" : "group-hover:scale-125"}`}>
              {emoji}
            </span>
            {mounted && counts[key] > 0 && (
              <span className="text-xs tabular-nums">{counts[key]}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
