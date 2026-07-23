import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { preOrderQuestions, users } from "@/lib/db/schema";
import { and, eq, isNotNull, desc } from "drizzle-orm";

const PAGE_SIZE = 5;

// NOTE: "id" here is the editorId — named to match the sibling [id]/answer
// route, since Next.js requires the same dynamic-segment name at this path level.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: editorId } = await params;
  const offset = Math.max(0, Number(request.nextUrl.searchParams.get("offset") ?? "0"));

  const rows = await db
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
    .where(and(eq(preOrderQuestions.editorId, editorId), isNotNull(preOrderQuestions.answer)))
    .orderBy(desc(preOrderQuestions.answeredAt))
    .limit(PAGE_SIZE)
    .offset(offset);

  return NextResponse.json({ questions: rows, hasMore: rows.length === PAGE_SIZE });
}
