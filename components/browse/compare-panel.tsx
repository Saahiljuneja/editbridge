"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { X, GitCompareArrows, ArrowRight } from "lucide-react";
import { displayNameFromFull } from "@/lib/utils";

type EditorSummary = {
  id: string;
  name: string | null;
  displayName?: string | null;
  image: string | null;
};

export function ComparePanel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const compareStr = searchParams.get("compare") ?? "";
  const compareIds = compareStr.split(",").filter(Boolean);

  const [editors, setEditors] = useState<EditorSummary[]>([]);

  useEffect(() => {
    if (compareIds.length === 0) { setEditors([]); return; }
    fetch(`/api/editors?ids=${compareIds.join(",")}`)
      .then((r) => r.json())
      .then((data) => {
        const map = new Map((data.editors as EditorSummary[]).map((e) => [e.id, e]));
        setEditors(compareIds.map((id) => map.get(id)).filter(Boolean) as EditorSummary[]);
      })
      .catch(() => {});
  }, [compareStr]);

  function removeEditor(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    const next = compareIds.filter((c) => c !== id);
    if (next.length === 0) params.delete("compare");
    else params.set("compare", next.join(","));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("compare");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  if (compareIds.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <GitCompareArrows className="w-4 h-4 text-[#0EA5E9]" />
          <span className="text-sm font-semibold text-gray-800">
            {compareIds.length} selected
          </span>
        </div>

        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          {editors.map((editor) => {
            const name = editor.displayName || displayNameFromFull(editor.name);
            return (
              <div key={editor.id} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full pl-1 pr-2 py-1 shrink-0">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-[#0EA5E9] to-violet-600 flex items-center justify-center shrink-0">
                  {editor.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={editor.image} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-[9px] font-bold">{name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-700 max-w-[100px] truncate">{name}</span>
                <button onClick={() => removeEditor(editor.id)} className="text-gray-300 hover:text-gray-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            Clear
          </button>
          <button
            onClick={() => router.push(`/compare?editors=${compareIds.join(",")}`)}
            disabled={compareIds.length < 2}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#0EA5E9] hover:bg-[#3d34a0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Compare now <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
