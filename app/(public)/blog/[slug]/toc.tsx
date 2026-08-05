"use client";

import { useState, useEffect } from "react";
import { List } from "lucide-react";
import { cn } from "@/lib/utils";

import { type TocItem } from "./toc-utils";

interface TableOfContentsProps {
  items: TocItem[];
}

export function TableOfContents({ items }: TableOfContentsProps) {
  const [active, setActive] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!items.length) return;
    const ids = items.map((i) => i.id);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  if (!items.length) return null;

  return (
    <>
      {/* ── Desktop sticky sidebar ───────────────────────────────── */}
      <nav className="hidden xl:block sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <List className="w-3.5 h-3.5" /> Contents
        </p>
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={cn(
                  "block py-1 text-sm leading-snug transition-colors duration-150",
                  item.level === 3 ? "pl-3 text-[13px]" : "pl-0",
                  active === item.id
                    ? "text-[#8B7FE8] font-semibold"
                    : "text-gray-400 hover:text-gray-700"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(item.id);
                  if (el) {
                    window.scrollTo({ top: el.offsetTop - 90, behavior: "smooth" });
                    setActive(item.id);
                  }
                }}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Mobile collapsible ───────────────────────────────────── */}
      <div className="xl:hidden mb-6 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700"
        >
          <span className="flex items-center gap-2">
            <List className="w-4 h-4 text-gray-400" /> Contents
          </span>
          <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
        </button>
        {open && (
          <ul className="px-4 pb-3 space-y-1 border-t border-gray-200 pt-2">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block py-0.5 text-sm transition-colors",
                    item.level === 3 ? "pl-3 text-xs" : "",
                    "text-gray-600 hover:text-[#8B7FE8]"
                  )}
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

