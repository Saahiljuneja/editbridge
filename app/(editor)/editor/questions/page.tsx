export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { preOrderQuestions, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatDateTime, displayNameFromFull } from "@/lib/utils";
import { QuestionAnswerForm } from "./question-answer-form";
import { Clock, CheckCircle, HelpCircle } from "lucide-react";

const COLOR = "var(--brand-client)";

export default async function EditorQuestionsPage() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  const editorId = session.user.editorId;
  if (!editorId) redirect("/editor/kyc");

  const questions = await db
    .select({
      id: preOrderQuestions.id,
      question: preOrderQuestions.question,
      answer: preOrderQuestions.answer,
      askedAt: preOrderQuestions.askedAt,
      answeredAt: preOrderQuestions.answeredAt,
      clientName: users.name,
    })
    .from(preOrderQuestions)
    .innerJoin(users, eq(users.id, preOrderQuestions.clientId))
    .where(eq(preOrderQuestions.editorId, editorId))
    .orderBy(desc(preOrderQuestions.askedAt));

  const pending = questions.filter((q) => !q.answer);

  return (
    <div className=”min-h-screen bg-gray-50”>
      <div className=”bg-white border-b border-gray-100”>
        <div className=”px-6 py-5 flex items-center justify-between”>
          <div>
            <h1 className=”text-xl font-bold text-gray-900”>Pre-order Q&amp;A</h1>
            <p className=”text-sm text-gray-400 mt-0.5”>
              Client questions from your profile. Reply within 24 hours — answers also show on your public profile.
            </p>
          </div>
          {pending.length > 0 && (
            <span className=”inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200”>
              <Clock className=”w-3.5 h-3.5” />
              {pending.length} awaiting reply
            </span>
          )}
        </div>
      </div>
      <div className=”px-6 py-6”>
      {questions.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-gray-200">
          <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-500">No questions yet</p>
          <p className="text-sm text-gray-400 mt-1">
            When clients ask you a question from your profile, they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={
                      q.answer
                        ? { color: "#059669", background: "#D1FAE5" }
                        : { color: "#D97706", background: "#FEF3C7" }
                    }
                  >
                    {q.answer ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {q.answer ? "Answered" : "Awaiting your reply"}
                  </span>
                  <span className="text-sm font-medium text-gray-800">from {displayNameFromFull(q.clientName)}</span>
                </div>
                <span className="text-xs text-gray-400">{formatDateTime(q.askedAt)}</span>
              </div>

              <div className="px-5 py-4 space-y-3">
                <p className="text-sm text-gray-700 leading-relaxed">{q.question}</p>

                {q.answer ? (
                  <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: `${COLOR}30`, background: `${COLOR}08` }}>
                    <p className="font-semibold mb-0.5" style={{ color: COLOR }}>
                      Your reply · {q.answeredAt ? formatDateTime(q.answeredAt) : ""}
                    </p>
                    <p className="text-gray-600">{q.answer}</p>
                  </div>
                ) : (
                  <QuestionAnswerForm questionId={q.id} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
