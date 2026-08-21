"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface SuspendEditorFormProps {
  editorId: string;
  isSuspended: boolean;
  suspensionReason: string | null;
}

export function SuspendEditorForm({ editorId, isSuspended, suspensionReason }: SuspendEditorFormProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function submit(action: "suspend" | "unsuspend") {
    if (action === "suspend" && !reason.trim()) {
      toast.error("A reason is required to suspend.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/editors/${editorId}/suspension`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(typeof err.error === "string" ? err.error : "Request failed.");
        return;
      }
      toast.success(action === "suspend" ? "Editor suspended." : "Suspension lifted.");
      setShowForm(false);
      setReason("");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (isSuspended) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-sm font-bold text-red-800">Account is suspended</p>
        </div>
        {suspensionReason && (
          <p className="text-xs text-red-700 leading-relaxed">Reason: {suspensionReason}</p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full border-red-200 text-red-700 hover:bg-red-100"
          onClick={() => submit("unsuspend")}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />}
          Lift suspension
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!showForm ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full border-red-200 text-red-600 hover:bg-red-50"
          onClick={() => setShowForm(true)}
        >
          <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
          Suspend editor
        </Button>
      ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
          <p className="text-xs font-bold text-red-800">Suspend this editor?</p>
          <Textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason visible to the editor…"
            rows={2}
            className="resize-none text-xs"
            maxLength={500}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => submit("suspend")}
              disabled={loading || !reason.trim()}
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Confirm suspend
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setShowForm(false); setReason(""); }}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
