"use client";

import { useEffect, useRef, useState } from "react";
import { StickyNote, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientNotesProps {
  clientId: string;
}

type SaveState = "idle" | "saving" | "saved";

export function ClientNotes({ clientId }: ClientNotesProps) {
  const [note, setNote] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originalRef = useRef("");

  useEffect(() => {
    fetch(`/api/editor/client-notes/${clientId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setNote(d.note ?? "");
          originalRef.current = d.note ?? "";
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [clientId]);

  function handleChange(val: string) {
    setNote(val);
    setSaveState("idle");

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (val === originalRef.current) return;
      setSaveState("saving");
      try {
        const res = await fetch(`/api/editor/client-notes/${clientId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: val }),
        });
        if (res.ok) {
          originalRef.current = val;
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 2000);
        }
      } catch {
        setSaveState("idle");
      }
    }, 1000);
  }

  if (!loaded) return null;

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-amber-600" />
          <p className="font-semibold text-sm text-amber-900">Private notes about this client</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-amber-600">
          {saveState === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>}
          {saveState === "saved" && <><Check className="w-3 h-3" /> Saved</>}
        </div>
      </div>
      <textarea
        value={note}
        onChange={e => handleChange(e.target.value)}
        placeholder="e.g. Prefers fast cuts · slow to respond · needs captions always"
        maxLength={2000}
        rows={3}
        className={cn(
          "w-full rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-sm resize-none",
          "placeholder:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/50",
          "text-amber-900"
        )}
        style={{ fontSize: "16px" }}
      />
      <p className="text-[11px] text-amber-500 mt-1.5">Only you can see these notes — never shared with the client.</p>
    </div>
  );
}
