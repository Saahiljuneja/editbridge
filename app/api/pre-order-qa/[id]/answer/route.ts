import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { preOrderQuestions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { notifyPreOrderQuestionAnswered } from "@/lib/notifications";
import { onEditorAnsweredQuestion } from "@/lib/rewards";

const answerSchema = z.object({
  answer: z.string().trim().min(1).max(1000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user?.role !== "editor" || !session.user.editorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const parsed = answerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const [question] = await db
    .select({ id: preOrderQuestions.id, editorId: preOrderQuestions.editorId, clientId: preOrderQuestions.clientId, question: preOrderQuestions.question })
    .from(preOrderQuestions)
    .where(eq(preOrderQuestions.id, id))
    .limit(1);

  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });
  if (question.editorId !== session.user.editorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [updated] = await db
    .update(preOrderQuestions)
    .set({ answer: parsed.data.answer, answeredAt: new Date() })
    .where(eq(preOrderQuestions.id, id))
    .returning();

  const [clientUser] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, question.clientId))
    .limit(1);

  onEditorAnsweredQuestion(session.user.userId!).catch(() => {});

  if (clientUser) {
    notifyPreOrderQuestionAnswered({
      clientEmail: clientUser.email,
      clientName: clientUser.name ?? "",
      editorName: session.user.name ?? "",
      editorId: session.user.editorId,
      question: question.question,
      answer: parsed.data.answer,
    });
  }

  return NextResponse.json(updated);
}
