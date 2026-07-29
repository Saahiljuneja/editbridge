"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const COLOR = "var(--brand-client)";

export function QuestionAnswerForm({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (answer.trim().length < 1) { toast.error("Please write a reply first"); return; }

    setLoading(true);
    try {
      const res = await fetch(`/api/pre-order-qa/${questionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answer.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send your reply");
      toast.success("Reply sent — it'll also show on your public profile.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-1">
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={3}
        placeholder="Write your reply — it'll be shown publicly on your profile once sent..."
        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2"
        style={{ "--tw-ring-color": COLOR } as React.CSSProperties}
        maxLength={1000}
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-60 transition-opacity"
        style={{ background: COLOR }}
      >
        {loading ? "Sending…" : "Send Reply"}
      </button>
    </form>
  );
}
