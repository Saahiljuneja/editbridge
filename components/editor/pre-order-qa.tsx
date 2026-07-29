"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { displayNameFromFull, formatDateTime } from "@/lib/utils";
import { HelpCircle, X, Clock } from "lucide-react";

interface PublicQA {
  id: string;
  question: string;
  answer: string;
  askedAt: string;
  answeredAt: string;
  clientName: string | null;
}

interface PendingQuestion {
  id: string;
  question: string;
  askedAt: string;
}

interface PreOrderQAProps {
  editorId: string;
  editorName: string;
  initialQuestions: PublicQA[];
  initialHasMore: boolean;
  myPendingQuestion: PendingQuestion | null;
  canAsk: boolean;
  isLoggedIn: boolean;
}

export function PreOrderQA({
  editorId,
  editorName,
  initialQuestions,
  initialHasMore,
  myPendingQuestion,
  canAsk,
  isLoggedIn,
}: PreOrderQAProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initialQuestions);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/pre-order-qa/${editorId}?offset=${questions.length}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions((prev) => [...prev, ...data.questions]);
        setHasMore(data.hasMore);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (draft.trim().length < 10) {
      toast.error("Please add a bit more detail to your question.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/pre-order-qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editorId, question: draft.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(typeof err.error === "string" ? err.error : "Failed to send your question.");
        return;
      }
      toast.success(`Question sent to ${editorName}. They usually reply within 24 hours.`);
      setOpen(false);
      setDraft("");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-gray-400" />
          Ask {editorName} a question
        </h2>
        {canAsk && !myPendingQuestion && (
          <button
            onClick={() => (isLoggedIn ? setOpen(true) : router.push("/login"))}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-[var(--brand-client)] hover:opacity-90 transition-opacity shrink-0"
          >
            Ask a question
          </button>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {myPendingQuestion && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5" /> Awaiting reply — usually within 24 hours
            </p>
            <p className="text-sm text-amber-900">{myPendingQuestion.question}</p>
          </div>
        )}

        {questions.length === 0 && !myPendingQuestion && (
          <p className="text-sm text-gray-400">
            No questions answered yet. Be the first to ask {editorName} something before you order.
          </p>
        )}

        {questions.map((q) => (
          <div key={q.id} className="space-y-2">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                {(q.clientName ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">
                  {displayNameFromFull(q.clientName)} asked · {formatDateTime(q.askedAt)}
                </p>
                <p className="text-sm text-gray-700">{q.question}</p>
              </div>
            </div>
            <div className="ml-10 bg-sky-50 border border-sky-100 rounded-xl px-3.5 py-3">
              <p className="text-xs font-bold text-sky-700 mb-1">{editorName} replied · {formatDateTime(q.answeredAt)}</p>
              <p className="text-sm text-sky-900 leading-relaxed">{q.answer}</p>
            </div>
          </div>
        ))}

        {hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="text-sm font-medium text-[var(--brand-client)] hover:underline disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Show more questions"}
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Ask {editorName} a question</h2>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                placeholder="e.g. Can you match the editing style from this reference video?"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/30"
                maxLength={500}
              />
              <p className="text-xs text-gray-400">{draft.length}/500</p>
              <p className="text-xs text-gray-400 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                Your question and their answer may be shown publicly on their profile to help other clients. You can ask this editor again in 7 days.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-60 transition-opacity bg-[var(--brand-client)]"
              >
                {submitting ? "Sending…" : "Send question"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
