"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_PAGES } from "@/lib/category-seo";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ExperienceLevel = "entry" | "intermediate" | "expert" | "any";
type BudgetBand = "under_2000" | "2000_8000" | "8000_20000" | "20000_plus";
type DeadlineBand = "rush" | "week" | "two_weeks" | "no_rush";
type Priority = "quality" | "speed" | "price";

interface Answers {
  categorySlug: string | null;
  experienceLevel: ExperienceLevel | null;
  budgetBand: BudgetBand | null;
  deadlineBand: DeadlineBand | null;
  priority: Priority | null;
}

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; sub: string }[] = [
  { value: "entry", label: "New & affordable", sub: "Entry-level editors, budget-friendly" },
  { value: "intermediate", label: "Experienced", sub: "A solid track record of orders" },
  { value: "expert", label: "Expert / Premium", sub: "Top-tier, polished work" },
  { value: "any", label: "No preference", sub: "Show me the best match regardless" },
];

const BUDGET_OPTIONS: { value: BudgetBand; label: string }[] = [
  { value: "under_2000", label: "Under ₹2,000" },
  { value: "2000_8000", label: "₹2,000 – ₹8,000" },
  { value: "8000_20000", label: "₹8,000 – ₹20,000" },
  { value: "20000_plus", label: "₹20,000+" },
];

const DEADLINE_OPTIONS: { value: DeadlineBand; label: string; sub: string }[] = [
  { value: "rush", label: "Rush", sub: "Within 1–2 days" },
  { value: "week", label: "Soon", sub: "Within a week" },
  { value: "two_weeks", label: "Flexible", sub: "Within 2 weeks" },
  { value: "no_rush", label: "No rush", sub: "Whenever works" },
];

const PRIORITY_OPTIONS: { value: Priority; label: string; sub: string }[] = [
  { value: "quality", label: "Quality", sub: "Best ratings from clients" },
  { value: "speed", label: "Speed", sub: "Fast, reliable turnaround" },
  { value: "price", label: "Price", sub: "Best value for the budget" },
];

const TOTAL_STEPS = 5;

export function FindEditorQuizClient() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    categorySlug: null,
    experienceLevel: null,
    budgetBand: null,
    deadlineBand: null,
    priority: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAdvance =
    (step === 0 && !!answers.categorySlug) ||
    (step === 1 && !!answers.experienceLevel) ||
    (step === 2 && !!answers.budgetBand) ||
    (step === 3 && !!answers.deadlineBand) ||
    (step === 4 && !!answers.priority);

  async function handleNext() {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      if (!res.ok) {
        setError("Something went wrong finding your matches. Please try again.");
        return;
      }
      const data = await res.json();
      sessionStorage.setItem("find-editor-result", JSON.stringify(data));
      router.push("/find-editor/results");
    } catch {
      setError("Something went wrong finding your matches. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="px-8 py-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Find your editor in 60 seconds</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Answer a few quick questions and we'll match you with the best-fit editors.
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= step ? "bg-[#0EA5E9]" : "bg-gray-200"
              )}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 sm:p-8">
          {step === 0 && (
            <Question title="What type of content do you need edited?">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {CATEGORY_PAGES.map((c) => (
                  <OptionButton
                    key={c.slug}
                    selected={answers.categorySlug === c.slug}
                    onClick={() => setAnswers((a) => ({ ...a, categorySlug: c.slug }))}
                  >
                    <span className="text-lg mb-1 block">{c.icon}</span>
                    {c.name.replace(/ Editors?$/, "").replace(/ Artists$/, "").replace(/ Experts$/, "")}
                  </OptionButton>
                ))}
              </div>
            </Question>
          )}

          {step === 1 && (
            <Question title="What experience level do you want?">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {EXPERIENCE_OPTIONS.map((o) => (
                  <OptionButton
                    key={o.value}
                    selected={answers.experienceLevel === o.value}
                    onClick={() => setAnswers((a) => ({ ...a, experienceLevel: o.value }))}
                  >
                    <span className="block">{o.label}</span>
                    <span className="block text-xs font-normal text-muted-foreground mt-0.5">{o.sub}</span>
                  </OptionButton>
                ))}
              </div>
            </Question>
          )}

          {step === 2 && (
            <Question title="What is your budget per video?">
              <div className="grid grid-cols-2 gap-2.5">
                {BUDGET_OPTIONS.map((o) => (
                  <OptionButton
                    key={o.value}
                    selected={answers.budgetBand === o.value}
                    onClick={() => setAnswers((a) => ({ ...a, budgetBand: o.value }))}
                  >
                    {o.label}
                  </OptionButton>
                ))}
              </div>
            </Question>
          )}

          {step === 3 && (
            <Question title="How soon do you need it delivered?">
              <div className="grid grid-cols-2 gap-2.5">
                {DEADLINE_OPTIONS.map((o) => (
                  <OptionButton
                    key={o.value}
                    selected={answers.deadlineBand === o.value}
                    onClick={() => setAnswers((a) => ({ ...a, deadlineBand: o.value }))}
                  >
                    <span className="block">{o.label}</span>
                    <span className="block text-xs font-normal text-muted-foreground mt-0.5">{o.sub}</span>
                  </OptionButton>
                ))}
              </div>
            </Question>
          )}

          {step === 4 && (
            <Question title="What matters most to you?">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {PRIORITY_OPTIONS.map((o) => (
                  <OptionButton
                    key={o.value}
                    selected={answers.priority === o.value}
                    onClick={() => setAnswers((a) => ({ ...a, priority: o.value }))}
                  >
                    <span className="block">{o.label}</span>
                    <span className="block text-xs font-normal text-muted-foreground mt-0.5">{o.sub}</span>
                  </OptionButton>
                ))}
              </div>
            </Question>
          )}

          {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

          <div className="flex items-center justify-between mt-8">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || submitting}
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors",
                (step === 0 || submitting) && "opacity-0 pointer-events-none"
              )}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canAdvance || submitting}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all",
                canAdvance && !submitting ? "bg-[#0EA5E9] hover:opacity-90" : "bg-gray-200 cursor-not-allowed"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Finding matches…
                </>
              ) : step === TOTAL_STEPS - 1 ? (
                <>
                  See my matches <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Step {step + 1} of {TOTAL_STEPS}
        </p>
      </div>
    </div>
  );
}

function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-5">{title}</h2>
      {children}
    </div>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm font-semibold text-left transition-all",
        selected
          ? "border-[#0EA5E9] bg-[#0EA5E9]/8 text-[#0EA5E9]"
          : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
      )}
    >
      {children}
    </button>
  );
}