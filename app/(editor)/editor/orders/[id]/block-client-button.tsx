"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MoreVertical, ShieldOff, ShieldCheck } from "lucide-react";

interface BlockClientButtonProps {
  clientId: string;
  clientName: string;
  initiallyBlocked: boolean;
}

export function BlockClientButton({ clientId, clientName, initiallyBlocked }: BlockClientButtonProps) {
  const router = useRouter();
  const [blocked, setBlocked] = useState(initiallyBlocked);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleBlock() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/editor/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(typeof err.error === "string" ? err.error : "Failed to block client.");
        return;
      }
      setBlocked(true);
      setDialogOpen(false);
      setReason("");
      toast.success(`${clientName} can no longer place new orders with you.`);
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnblock() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/editor/blocks/${clientId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(typeof err.error === "string" ? err.error : "Failed to unblock client.");
        return;
      }
      setBlocked(false);
      setDialogOpen(false);
      toast.success(`${clientName} can place new orders with you again.`);
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Order options" />
          }
        >
          <MoreVertical className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {blocked ? (
            <DropdownMenuItem onClick={() => setDialogOpen(true)}>
              <ShieldCheck className="w-3.5 h-3.5" />
              Unblock this client
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive" onClick={() => setDialogOpen(true)}>
              <ShieldOff className="w-3.5 h-3.5" />
              Block this client
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{blocked ? "Unblock this client?" : "Block this client?"}</DialogTitle>
            <DialogDescription>
              {blocked
                ? `${clientName} will be able to place new orders with you again.`
                : `${clientName} will no longer be able to place new orders with you. This won't affect any of your other orders or their account elsewhere on EditBridge.`}
            </DialogDescription>
          </DialogHeader>

          {!blocked && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Reason (optional, private — only you and EditBridge staff can see this)
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Abusive messages, refused to pay, unreasonable demands…"
                className="resize-none"
                rows={3}
                maxLength={500}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant={blocked ? "default" : "destructive"}
              onClick={blocked ? handleUnblock : handleBlock}
              disabled={submitting}
            >
              {submitting ? "Saving…" : blocked ? "Unblock" : "Block client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
