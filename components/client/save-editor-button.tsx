"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Module-level cache shared by every button instance on the page — avoids
// firing one GET /api/saved-editors per card when a list renders many at once.
let cachedIds: Set<string> | null = null;
let inflight: Promise<Set<string>> | null = null;

async function getSavedIds(): Promise<Set<string>> {
  if (cachedIds) return cachedIds;
  if (inflight) return inflight;
  inflight = fetch("/api/saved-editors")
    .then((r) => (r.ok ? r.json() : { editors: [] }))
    .then((d) => {
      cachedIds = new Set((d.editors ?? []).map((e: { editorId: string }) => e.editorId));
      return cachedIds;
    })
    .catch(() => new Set<string>())
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

interface Props {
  editorId: string;
  // Accepted for backwards compatibility with existing call sites — unused now
  // that saved state lives server-side, but kept so props don't need updating.
  editorName?: string;
  editorImage?: string | null;
  editorTitle?: string | null;
  avgRating?: number | null;
  totalOrders?: number;
  variant?: "icon" | "button";
}

export function SaveEditorButton({ editorId, variant = "icon" }: Props) {
  const { data: session, status } = useSession();
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const isClient = session?.user?.role === "client";

  useEffect(() => {
    if (!isClient || !editorId) return;
    getSavedIds().then((ids) => {
      setSaved(ids.has(editorId));
      setReady(true);
    });
  }, [editorId, isClient]);

  // Hide entirely for editors and unauthenticated visitors
  if (status === "loading" || !isClient) return null;

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);

    const next = !saved;
    setSaved(next); // optimistic

    try {
      const res = await fetch("/api/saved-editors", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editorId }),
      });
      if (!res.ok) throw new Error("Request failed");

      if (cachedIds) {
        if (next) cachedIds.add(editorId);
        else cachedIds.delete(editorId);
      }
      toast.success(next ? "Editor saved!" : "Removed from saved editors.");
    } catch {
      setSaved(!next); // revert on failure
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (variant === "button") {
    return (
      <button
        onClick={toggle}
        disabled={!ready || busy}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors",
          saved
            ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            : "border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:text-red-500"
        )}
      >
        <Heart className={cn("w-4 h-4", saved ? "fill-red-500 text-red-500" : "")} />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={!ready || busy}
      title={saved ? "Remove from saved" : "Save editor"}
      className={cn(
        "w-7 h-7 flex items-center justify-center rounded-lg border transition-all",
        saved
          ? "border-red-200 bg-red-50 text-red-500"
          : "border-gray-200 bg-white/80 text-gray-400 hover:border-red-200 hover:text-red-400"
      )}
    >
      <Heart className={cn("w-3.5 h-3.5", saved ? "fill-red-500" : "")} />
    </button>
  );
}
