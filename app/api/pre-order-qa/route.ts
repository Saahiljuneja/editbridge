import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { preOrderQuestions, editors, users } from "@/lib/db/schema";
import { and, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { createInAppNotification, editorWantsNotif, notifyPreOrderQuestionAsked } from "@/lib/notifications";

const createSchema = z.object({
  editorId: z.string().uuid(),
  question: z.string().trim().min(10, "Please add a bit more detail").max(500),
});

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { editorId, question } = parsed.data;

  const [editor] = await db
    .select({ id: editors.id, userId: editors.userId })
    .from(editors)
    .where(eq(editors.id, editorId))
    .limit(1);
  if (!editor) return NextResponse.json({ error: "Editor not found" }, { status: 404 });

  // One question per client per editor per rolling 7-day window — prevents spam.
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
  const [existing] = await db
    .select({ id: preOrderQuestions.id })
    .from(preOrderQuestions)
    .where(
      and(
        eq(preOrderQuestions.clientId, session.user.userId!),
        eq(preOrderQuestions.editorId, editorId),
        gte(preOrderQuestions.askedAt, sevenDaysAgo)
      )
    )
    .limit(1);
  if (existing) {
    return NextResponse.json(
      { error: "You can only ask this editor one question every 7 days" },
      { status: 409 }
    );
  }

  const [row] = await db
    .insert(preOrderQuestions)
    .values({ clientId: session.user.userId!, editorId, question })
    .returning();

  const [clientUser] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, session.user.userId!))
    .limit(1);
  const [editorUser] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, editor.userId))
    .limit(1);

  if (editorUser && clientUser) {
    if (await editorWantsNotif(editor.id, "message")) {
      createInAppNotification({
        userId: editor.userId,
        type: "pre_order_question",
        title: "New question from a potential client",
        body: `${clientUser.name ?? "A client"} asked: "${question.slice(0, 100)}"`,
        link: "/editor/questions",
      });
    }
    notifyPreOrderQuestionAsked({
      editorId: editor.id,
      editorEmail: editorUser.email,
      editorName: editorUser.name ?? "",
      clientName: clientUser.name ?? "",
      question,
    });
  }

  return NextResponse.json(row, { status: 201 });
}
