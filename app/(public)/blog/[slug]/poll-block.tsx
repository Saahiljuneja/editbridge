"use client";

import { useState, useEffect } from "react";
import { Vote, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PollBlockProps {
  id: string;
  question: string;
  options: string[];
}

export function PollBlock({ id, question, options }: PollBlockProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  const [votes, setVotes] = useState<Record<string, number>>({});

  // Seed simulated votes based on choice hash
  useEffect(() => {
    const seedVotes: Record<string, number> = {};
    options.forEach((opt) => {
      // Create a deterministic mock count from the options
      let hash = 0;
      const combined = id + opt;
      for (let i = 0; i < combined.length; i++) {
        hash = combined.charCodeAt(i) + ((hash << 5) - hash);
      }
      seedVotes[opt] = Math.abs(hash % 150) + 15; // 15 to 165 mock votes
    });

    // Read user vote from localStorage
    try {
      const userVote = localStorage.getItem(`eb_poll_${id}`);
      if (userVote && options.includes(userVote)) {
        setSelected(userVote);
        setVoted(true);
        seedVotes[userVote] = (seedVotes[userVote] || 0) + 1;
      }
    } catch {}

    setVotes(seedVotes);
  }, [id, options]);

  const handleVote = (option: string) => {
    if (voted) return;

    try {
      localStorage.setItem(`eb_poll_${id}`, option);
    } catch {}

    setSelected(option);
    setVoted(true);
    setVotes((prev) => ({
      ...prev,
      [option]: (prev[option] || 0) + 1,
    }));
  };

  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);

  return (
    <div className="my-8 p-6 bg-gradient-to-br from-gray-50 to-white border border-gray-150 rounded-2xl shadow-sm max-w-xl mx-auto sm:mx-0">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#8B7FE8]/15 flex items-center justify-center">
          <Vote className="w-4 h-4 text-[#8B7FE8]" />
        </div>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Creator Poll</span>
      </div>

      <h4 className="font-extrabold text-gray-800 text-base leading-tight mb-4">{question}</h4>

      <div className="space-y-2.5">
        {options.map((opt) => {
          const count = votes[opt] || 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isSelected = selected === opt;

          return (
            <button
              key={opt}
              disabled={voted}
              onClick={() => handleVote(opt)}
              className={cn(
                "w-full text-left rounded-xl p-4 transition-all duration-300 relative overflow-hidden border",
                voted
                  ? isSelected
                    ? "border-[#8B7FE8] bg-[#8B7FE8]/5"
                    : "border-gray-100 bg-white"
                  : "border-gray-100 hover:border-[#8B7FE8]/40 hover:bg-gray-50 cursor-pointer"
              )}
            >
              {/* Sliding Percentage bar */}
              {voted && (
                <div
                  className="absolute left-0 top-0 bottom-0 bg-[#8B7FE8]/10 transition-all duration-700 ease-out"
                  style={{ width: `${pct}%` }}
                />
              )}

              <div className="relative z-10 flex items-center justify-between gap-4">
                <span className={cn("text-sm font-semibold", voted ? "text-gray-800" : "text-gray-600")}>
                  {opt}
                </span>

                {voted ? (
                  <div className="flex items-center gap-2">
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[#8B7FE8]" />}
                    <span className="text-xs font-bold text-gray-400">{pct}%</span>
                  </div>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-gray-200" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {voted && (
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-4 text-right">
          Total votes: {totalVotes.toLocaleString()}
        </p>
      )}
    </div>
  );
}
