"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Film, Image as ImageIcon } from "lucide-react";

type PortfolioItem = {
  id: string;
  type: "video" | "image";
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  description: string | null;
  isHidden: boolean;
};

export function PortfolioModeratorList({
  items: initialItems,
}: {
  items: PortfolioItem[];
}) {
  const [items, setItems] = useState<PortfolioItem[]>(initialItems);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function toggleVisibility(id: string, currentlyHidden: boolean) {
    setLoadingId(id);
    try {
      const nextHidden = !currentlyHidden;
      const res = await fetch(`/api/admin/portfolio/${id}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: nextHidden }),
      });
      if (!res.ok) {
        toast.error("Failed to update visibility");
        return;
      }
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isHidden: nextHidden } : item))
      );
      toast.success(nextHidden ? "Portfolio item hidden from public feed." : "Portfolio item is now visible.");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoadingId(null);
    }
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5 mb-6">
      <p className="font-semibold text-sm mb-3">Portfolio Items & Showcase Moderation</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={`border rounded-xl p-3 bg-white space-y-2 flex flex-col justify-between ${
              item.isHidden ? "border-red-200 bg-red-50/10" : "border-gray-150"
            }`}
          >
            <div className="space-y-2">
              <div className="aspect-video relative rounded-lg bg-neutral-100 overflow-hidden flex items-center justify-center border border-gray-100">
                {item.type === "video" ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.thumbnailUrl || "/api/placeholder/400/225"} alt={item.title || "Video Showcase"} className="object-cover h-full w-full" />
                    <div className="absolute top-2 left-2 p-1 rounded-md bg-black/60 text-white">
                      <Film className="w-3.5 h-3.5" />
                    </div>
                  </>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.title || "Image Showcase"} className="object-cover h-full w-full" />
                    <div className="absolute top-2 left-2 p-1 rounded-md bg-black/60 text-white">
                      <ImageIcon className="w-3.5 h-3.5" />
                    </div>
                  </>
                )}
                {item.isHidden && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-red-650 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                      <EyeOff className="w-3 h-3" /> Hidden
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="font-bold text-xs text-gray-900 truncate">{item.title || "Untitled showcase"}</p>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.description || "No description provided."}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-medium capitalize">{item.type} Item</span>
              <button
                disabled={loadingId === item.id}
                onClick={() => toggleVisibility(item.id, item.isHidden)}
                className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-md border transition-colors cursor-pointer disabled:opacity-50 ${
                  item.isHidden
                    ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                    : "border-red-200 bg-red-50 text-red-750 hover:bg-red-100"
                }`}
              >
                {item.isHidden ? (
                  <>
                    <Eye className="w-3 h-3" /> Restore Visibility
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3" /> Hide from Public
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
