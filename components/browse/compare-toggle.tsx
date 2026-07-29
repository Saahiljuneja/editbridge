"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function CompareToggle({ editorId }: { editorId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = (searchParams.get("compare") ?? "").split(",").filter(Boolean);
  const isSelected = current.includes(editorId);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const params = new URLSearchParams(searchParams.toString());
    let next: string[];
    if (isSelected) {
      next = current.filter((id) => id !== editorId);
    } else if (current.length >= 3) {
      // Replace oldest selection
      next = [...current.slice(1), editorId];
    } else {
      next = [...current, editorId];
    }
    if (next.length === 0) params.delete("compare");
    else params.set("compare", next.join(","));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <button
      onClick={toggle}
      title={isSelected ? "Remove from comparison" : "Add to compare"}
      className={cn(
        "flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full text-[11px] font-semibold border shadow-sm transition-all",
        isSelected
          ? "bg-[var(--brand-client)] border-[var(--brand-client)] text-white opacity-100"
          : "bg-white/95 border-gray-200 text-gray-500 opacity-0 group-hover:opacity-100 hover:border-[var(--brand-client)]/50 hover:text-[var(--brand-client)]"
      )}
    >
      <span
        className={cn(
          "w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 transition-colors",
          isSelected ? "bg-white border-white" : "border-gray-300"
        )}
      >
        {isSelected && <Check className="w-2.5 h-2.5 text-[var(--brand-client)]" strokeWidth={3} />}
      </span>
      Compare
    </button>
  );
}
