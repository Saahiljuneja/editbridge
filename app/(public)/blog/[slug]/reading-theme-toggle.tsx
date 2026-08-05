"use client";

import { useState, useEffect } from "react";
import { Sun, BookOpen, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

type ReadingTheme = "light" | "sepia" | "dark";

export function ReadingThemeToggle() {
  const [theme, setTheme] = useState<ReadingTheme>("light");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("eb_reading_theme") as ReadingTheme;
      if (saved && ["light", "sepia", "dark"].includes(saved)) {
        setTheme(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const el = document.getElementById("article-content");
    if (!el) return;

    // Save choice
    try {
      localStorage.setItem("eb_reading_theme", theme);
    } catch {}

    // Apply classes
    if (theme === "sepia") {
      el.classList.remove("theme-dark");
      el.classList.add("theme-sepia");
    } else if (theme === "dark") {
      el.classList.remove("theme-sepia");
      el.classList.add("theme-dark");
    } else {
      el.classList.remove("theme-sepia", "theme-dark");
    }
  }, [theme]);

  return (
    <div className="flex items-center gap-1.5 p-1 bg-white border border-gray-150 rounded-xl shadow-sm mb-4">
      {/* Dynamic Style Overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        #article-content.theme-sepia {
          background-color: #fbf6ec !important;
          color: #433422 !important;
          border-color: #f3e5d0 !important;
        }
        #article-content.theme-sepia p {
          color: #5c4b37 !important;
        }
        #article-content.theme-sepia h1,
        #article-content.theme-sepia h2,
        #article-content.theme-sepia h3,
        #article-content.theme-sepia h4 {
          color: #2c1d11 !important;
        }
        #article-content.theme-sepia blockquote {
          background-color: #f5ebd6 !important;
          border-color: #d2b48c !important;
          color: #5c4b37 !important;
        }

        #article-content.theme-dark {
          background-color: #111827 !important;
          color: #e5e7eb !important;
          border-color: #1f2937 !important;
        }
        #article-content.theme-dark p {
          color: #d1d5db !important;
        }
        #article-content.theme-dark h1,
        #article-content.theme-dark h2,
        #article-content.theme-dark h3,
        #article-content.theme-dark h4 {
          color: #f9fafb !important;
        }
        #article-content.theme-dark blockquote {
          background-color: #1f2937 !important;
          border-color: #8B7FE8 !important;
          color: #d1d5db !important;
        }
      `}} />

      {/* Buttons */}
      <button
        onClick={() => setTheme("light")}
        className={cn(
          "p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all",
          theme === "light"
            ? "bg-gray-100 text-gray-800"
            : "text-gray-400 hover:text-gray-600"
        )}
        title="Default Light Mode"
      >
        <Sun className="w-3.5 h-3.5" />
        <span className="text-[10px] hidden sm:inline">Light</span>
      </button>

      <button
        onClick={() => setTheme("sepia")}
        className={cn(
          "p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all",
          theme === "sepia"
            ? "bg-amber-500/10 text-amber-700"
            : "text-gray-400 hover:text-gray-600"
        )}
        title="Warm Sepia Mode"
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span className="text-[10px] hidden sm:inline">Sepia</span>
      </button>

      <button
        onClick={() => setTheme("dark")}
        className={cn(
          "p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all",
          theme === "dark"
            ? "bg-gray-900 text-white"
            : "text-gray-400 hover:text-gray-600"
        )}
        title="Reading Dark Mode"
      >
        <Moon className="w-3.5 h-3.5" />
        <span className="text-[10px] hidden sm:inline">Dark</span>
      </button>
    </div>
  );
}
